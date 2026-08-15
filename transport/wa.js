import { default as makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion, isJidBroadcast, isJidNewsletter } from 'baileys';
import pino from 'pino';
import { DatabaseSync } from 'node:sqlite';
import { SESSION_DIR, SESSION_ID, PHONE_NUMBER, WA_LOG_LEVEL, STALL_TIMEOUT_MS, SILENCE_TIMEOUT_MS, PURGE_SIGNAL_ON_BOOT, RESET_SESSION, MARK_ONLINE } from '../config.js';
import { useSqliteAuthState, encodeCreds } from '../store/auth.js';
import { parseCommand } from './commands.js';
import { toNumber } from './admin.js';
import { getDecryptFailCount } from './quiet.js';

let sock;
let onMessageHandler;
let onConnectedHandler;
let logger;
let shuttingDown = false;
let connectedAt = 0; // ms of the last 'open'; 0 while disconnected
// ONE auth state for the process lifetime. When SESSION_ID is set, this is a
// SQLite-backed store (store/auth.js) — all Signal keys live in wcg.db with
// atomic writes, no file races, no session folder to corrupt. When SESSION_ID
// is empty (first run or backward compat), falls back to baileys' own
// useMultiFileAuthState which writes one file per key.
let authState = null;
// Guards PURGE_SIGNAL_ON_BOOT to the process's first connect() only — never
// on the reconnect calls that re-enter connect() after that.
let bootPurgeDone = false;
// Guards RESET_SESSION the same way — first connect() only.
let resetDone = false;

// Wipes every wa_keys row, including creds. Must run BEFORE useSqliteAuthState()
// is called, since that function reads/creates creds on construction — wiping
// after it returns would leave the stale creds live in memory. Opens the DB
// directly (no auth state exists yet). try/catch: a missing table on a
// first-ever boot must not crash startup.
export function wipeAllForReset(db) {
  try {
    db.exec('DELETE FROM wa_keys');
  } catch (e) {
    logger?.warn?.({ err: e }, 'RESET_SESSION: wipe failed (likely no wa_keys table yet, harmless)');
  }
}
const RECONNECT_DELAY = 3000;

// status@broadcast and @newsletter jids: the bot holds no sender-key for either
// and never will (nothing to decrypt, nothing to act on). Baileys still tries
// to decrypt every one it receives, and every failed decrypt fires a retry
// request to WhatsApp — those accumulate until WhatsApp stops delivering to
// the device (seen in prod: decryptFails=1622 vs ~137 real messages/5min).
// shouldIgnoreJid short-circuits before decrypt (see baileys
// Socket/messages-recv.js handleMessage). Must stay false for groups
// (@g.us), users (@s.whatsapp.net) and LIDs (@lid) — those are real traffic.
export function shouldIgnoreJid(jid) {
  return Boolean(isJidBroadcast(jid) || isJidNewsletter(jid));
}
const GROUP_ADMIN_CACHE_MS = 60_000;
// sock.groupMetadata() has no built-in timeout (baileys blocks up to its own
// 60s query timeout - see the DM note below at resolveSender). Unbounded, a
// stalled IQ query here hangs handleMessage forever and silently swallows
// every group command with no log line. 8s is well under baileys' 60s and
// well above a normal round trip.
const GROUP_METADATA_TIMEOUT_MS = 8000;

// Races `promise` against a timeout; resolves to `fallback` (never rejects)
// if the timeout wins. Pure/testable in isolation from any socket.
export function withTimeout(promise, timeoutMs, fallback) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ timedOut: true }), timeoutMs);
  });
  return Promise.race([promise.then((value) => ({ timedOut: false, value })), timeout]).then(
    (result) => {
      clearTimeout(timer);
      return result.timedOut ? fallback : result.value;
    }
  );
}

// Inbound-path instrumentation only: no effect on parsing/dispatch/reconnect.
// The deployed bot runs without debug logging, so this is the only record of
// inbound traffic on the console — a run of noPayload is the signature of a
// Signal ratchet problem; byType separates live traffic (notify) from backfill
// (append).
const SUMMARY_INTERVAL_MS = 5 * 60 * 1000;
let inboundStats = { total: 0, byType: {}, noPayload: 0, echo: 0, dispatched: 0 };
let summaryTimer = null;

function resetInboundStats() {
  inboundStats = { total: 0, byType: {}, noPayload: 0, echo: 0, dispatched: 0 };
}

// Bounded message cache for getMessage (retry receipts)
const MESSAGE_CACHE_CAP = 1000;
const messageCache = new Map();

function cacheMessage(id, message) {
  if (!id || !message) return;
  messageCache.set(id, message);
  while (messageCache.size > MESSAGE_CACHE_CAP) {
    messageCache.delete(messageCache.keys().next().value);
  }
}

// Stall watchdog: baileys' keepalive only proves the websocket is alive, not
// that inbound messages are still being delivered over it. When delivery
// silently wedges mid-game, this forces a reconnect instead of waiting the
// minutes it otherwise takes baileys to notice on its own.
const WATCHDOG_INTERVAL_MS = 30_000;
let lastDispatchAt = 0;
let lastNotifyAt = 0; // ms of the last live ('notify'-type) messages.upsert, regardless of dispatch outcome
let watchdogTimer = null;
let trafficProbe = () => false;
// Guards shouldRepairPreKeys so the first trip repairs (non-destructive), and
// only a SECOND trip with still no traffic escalates to reconnect.
let preKeyRepairAttempted = false;
// ms of the last repair/escalate action taken by the deaf-socket watchdog.
// Used (not lastNotifyAt itself, which shouldForceReconnect also reads) to
// suppress re-firing immediately after an action, the same way lastDispatchAt
// = Date.now() suppresses the stall watchdog re-firing on the same stall.
let lastPreKeyActionAt = 0;

// Lets the app say "traffic is expected right now" (e.g. a game is running),
// so a quiet group at 3am never trips the watchdog.
export function setTrafficProbe(fn) {
  trafficProbe = fn;
}

// Pure decision logic, exported so it's testable without a socket. Two
// independent trip conditions, either one forces a reconnect:
//   - trafficExpected: a game is running and nothing dispatched (original signal)
//   - msSinceLastNotify < timeoutMs: messages are visibly ARRIVING but nothing is
//     being dispatched — catches an idle-bot hang with no game running, without
//     ever tripping against a genuinely quiet group (which has no notify traffic
//     either, so msSinceLastNotify stays >= timeoutMs there).
export function shouldForceReconnect({ connected, trafficExpected, msSinceLastDispatch, msSinceLastNotify, timeoutMs }) {
  if (!timeoutMs) return false; // 0 disables the watchdog
  if (!connected || msSinceLastDispatch <= timeoutMs) return false;
  return trafficExpected || msSinceLastNotify < timeoutMs;
}

// Deaf-socket detector: connected, silent for SILENCE_TIMEOUT_MS, AND libsignal
// has logged at least one genuine decrypt failure — the signature of a missing
// pre-key (see quiet.js getDecryptFailCount). Separate trip condition from
// shouldForceReconnect: that one catches a stalled/hung socket; this one catches
// a socket that's alive and receiving NACKs, which reconnecting alone can't fix
// because the bad state is persistent SQLite rows, not connection state.
export function shouldRepairPreKeys({ connected, msSinceLastNotify, decryptFails, timeoutMs }) {
  if (!connected || !timeoutMs) return false;
  return msSinceLastNotify > timeoutMs && decryptFails > 0;
}

// Bounded fallback for sock.end()'s close event, which the watchdog's whole
// recovery chain depends on but which is not guaranteed to fire: baileys'
// end() only emits connection.update('close') itself (see node_modules/baileys
// lib/Socket/socket.js) when its internal `closed` flag is still false at call
// time, and does so synchronously — so a zombied/already-half-closed socket
// can silently swallow the call, leaving the watchdog's own guard
// (lastDispatchAt reset) blind to the failure for another full
// STALL_TIMEOUT_MS. 10s is comfortably longer than a normal close takes
// (immediate, in-process) but far shorter than STALL_TIMEOUT_MS.
const GRACE_TIMEOUT_MS = 10_000;
let cancelGrace = null;

// Exported for testing: arms a timer that calls onForce() after delayMs
// unless the returned canceller runs first (or a later arm() call preempts
// it, which callers must do themselves - this just owns one timer).
export function armGraceFallback(delayMs, onForce) {
  const timer = setTimeout(onForce, delayMs);
  timer.unref?.();
  return () => clearTimeout(timer);
}

function cancelGraceFallback() {
  cancelGrace?.();
  cancelGrace = null;
}

// Call right after sock.end() where a close event is expected to drive
// reconnect. If no new connect() cycle has started by the time the grace
// timer elapses, baileys' own close event never arrived: force it by
// terminating the raw websocket (node's `ws` library exposes .terminate()
// for exactly this "don't wait for a clean handshake" case - baileys'
// sock.ws is its own WebSocketClient wrapper, sock.ws.socket is the
// underlying ws instance) and drive the reconnect directly instead of
// waiting on an event that may never come.
function armGraceFallbackForStalledEnd() {
  cancelGraceFallback(); // only one grace timer in-flight at a time
  const startedSock = sock;
  cancelGrace = armGraceFallback(GRACE_TIMEOUT_MS, () => {
    cancelGrace = null;
    if (sock !== startedSock) return; // a real close already started a new cycle
    logger.warn('Stall watchdog: no close event within grace window — forcing hard socket teardown and reconnect');
    try {
      startedSock?.ws?.socket?.terminate?.();
    } catch (e) {
      logger?.error({ err: e }, 'Failed to terminate stuck websocket');
    }
    startedSock?.ev?.removeAllListeners(); // defuse a late close from the old socket
    connect(onMessageHandler, logger, onConnectedHandler);
  });
}

function startWatchdogTimer() {
  if (watchdogTimer) return; // connect() re-runs on every reconnect; only one timer ever
  watchdogTimer = setInterval(async () => {
    if (shuttingDown) return;
    const silentMs = Date.now() - lastDispatchAt;
    const notifyMs = Date.now() - lastNotifyAt;
    const trafficExpected = trafficProbe();
    if (shouldForceReconnect({
      connected: isConnected(),
      trafficExpected,
      msSinceLastDispatch: silentMs,
      msSinceLastNotify: notifyMs,
      timeoutMs: STALL_TIMEOUT_MS,
    })) {
      const upSec = connectedAt ? ((Date.now() - connectedAt) / 1000).toFixed(0) : '0';
      const cause = trafficExpected ? 'game traffic expected' : 'messages arriving but not dispatching';
      logger.warn(`Stall watchdog: no message dispatched in ${(silentMs / 1000).toFixed(0)}s (connected ${upSec}s, ${cause}) — forcing reconnect`);
      lastDispatchAt = Date.now(); // don't refire against the same stall while the new socket comes up
      sock?.end(undefined);
      armGraceFallbackForStalledEnd();
      return;
    }

    // Guard against re-firing immediately after our own action: once an action
    // has been taken, treat "silence" as measured from that action, not from
    // the real (stale) lastNotifyAt, until a fresh SILENCE_TIMEOUT_MS elapses.
    const notifyMsForRepair = lastPreKeyActionAt ? Math.min(notifyMs, Date.now() - lastPreKeyActionAt) : notifyMs;
    if (shouldRepairPreKeys({
      connected: isConnected(),
      msSinceLastNotify: notifyMsForRepair,
      decryptFails: getDecryptFailCount(),
      timeoutMs: SILENCE_TIMEOUT_MS,
    })) {
      lastPreKeyActionAt = Date.now();
      if (!preKeyRepairAttempted) {
        preKeyRepairAttempted = true;
        logger.warn(`Deaf-socket watchdog: no notify traffic in ${(notifyMs / 1000).toFixed(0)}s with libsignal decrypt failures observed — a peer's pre-key is likely missing from our store; uploading a fresh pre-key batch (non-destructive, no session/key rows deleted)`);
        try {
          await sock?.uploadPreKeys();
          logger.info('Deaf-socket watchdog: uploadPreKeys() completed');
        } catch (e) {
          logger.error({ err: e }, 'Deaf-socket watchdog: uploadPreKeys() failed');
        }
      } else {
        logger.warn('Deaf-socket watchdog: pre-key repair already attempted and traffic still has not resumed — escalating to reconnect');
        preKeyRepairAttempted = false;
        sock?.end(undefined);
        armGraceFallbackForStalledEnd();
      }
    }
  }, WATCHDOG_INTERVAL_MS);
  watchdogTimer.unref?.();
}

function startSummaryTimer() {
  if (summaryTimer) return; // connect() re-runs on every reconnect; only one timer ever
  summaryTimer = setInterval(() => {
    const upSec = connectedAt ? ((Date.now() - connectedAt) / 1000).toFixed(0) : '0';
    if (inboundStats.total === 0) {
      // A quiet console used to mean "healthy"; it also means "deaf" (see the
      // watchdog above). Only stay fully silent when not connected at all —
      // when connected, silence is worth a line so an operator watching logs
      // can tell "nothing happening" apart from "nothing arriving".
      if (isConnected()) {
        logger.warn(`SILENT 5m: no inbound messages while connected (upSec=${upSec}, decryptFails=${getDecryptFailCount()})`);
      }
      return;
    }
    const byType = Object.entries(inboundStats.byType).map(([k, v]) => `${k}=${v}`).join(',') || 'none';
    logger.info(
      `inbound 5m: total=${inboundStats.total} byType=${byType} noPayload=${inboundStats.noPayload} ` +
      `echo=${inboundStats.echo} dispatched=${inboundStats.dispatched} connected=${isConnected()} upSec=${upSec} decryptFails=${getDecryptFailCount()}`
    );
    resetInboundStats();
  }, SUMMARY_INTERVAL_MS);
  summaryTimer.unref?.();
}
const groupAdminCache = new Map(); // jid -> { admins, ts }

// ponytail: bounded lid->phone map instead of a real LRU/persistent store — we only
// need enough recent groups' worth of participants to resolve @lid senders for admin
// checks. Cap at 5000 entries, evict oldest once past it.
const LID_MAP_CAP = 5000;
const lidToPhone = new Map(); // lid-form JID -> phone-form JID

function rememberLidPhone(lidJid, phoneJid) {
  if (!lidJid || !phoneJid) return;
  lidToPhone.set(lidJid, phoneJid);
  while (lidToPhone.size > LID_MAP_CAP) {
    lidToPhone.delete(lidToPhone.keys().next().value);
  }
}

// Resolves a lid-form JID to its phone-form JID, learned from group metadata
// (see getGroupAdmins). Returns undefined if never seen.
export function resolvePn(jid) {
  return lidToPhone.get(jid);
}

// ponytail: bounded id cache instead of a real LRU/expiry — we only need to recognize
// the immediate echo of our own sends, so keeping the most-recent 500 ids is plenty.
export const SENT_ID_CAP = 500;
const sentIds = new Set();

export function addSentId(set, id, cap = SENT_ID_CAP) {
  if (!id) return;
  set.add(id);
  while (set.size > cap) {
    set.delete(set.values().next().value);
  }
}

// This bot runs as a linked device on the owner's own account, so the owner's
// own typed messages arrive with key.fromMe === true too (not just our replies).
// We must process those, but must skip the echo of messages we sent ourselves
// (tracked via sentIds), or the bot reacts to its own output (e.g. "pong").
export function shouldSkip(key, sentIds) {
  return !!(key?.fromMe && key?.id && sentIds.has(key.id));
}

// Resolve the sending player's JID. For non-self messages this is just the
// existing participant/jid fallback. For genuine fromMe messages relayed from
// another linked device (e.g. the owner typing from their phone), baileys always
// populates key.participant for group messages (decodeMessageNode throws if it
// doesn't), in whatever namespace the group uses — so we keep using it as-is,
// which keeps the sender consistent with how every other participant's JID
// arrives. Only for a DM (no participant field at all) does fromMe need a
// fallback, since `jid` there is the *other* party, not us.
export function resolveSender(key, jid, ownJid) {
  return key.participant || (key.fromMe ? ownJid : jid);
}

// baileys' own logger is separate from the app logger: at INFO+ baileys dumps full
// protobufs, key material, and a "failed to decrypt" line per group on every fresh
// link (expected — resolves itself via retry receipts). Silent by default; set
// WA_LOG_LEVEL=debug to diagnose connection problems.
const waLogger = pino({ level: WA_LOG_LEVEL });

function disconnectReasonName(code) {
  return Object.keys(DisconnectReason).find((k) => DisconnectReason[k] === code) || 'unknown';
}

export async function connect(onMessage, appLogger, onConnected, existingDb) {
  logger = appLogger;
  onMessageHandler = onMessage;
  onConnectedHandler = onConnected;
  startSummaryTimer();
  startWatchdogTimer();

  if (RESET_SESSION && !resetDone) {
    resetDone = true;
    logger.warn('RESET_SESSION: wiping ALL credentials and Signal keys — this device\'s identity is destroyed, a fresh pairing code will follow. UNSET RESET_SESSION now or it re-pairs (and breaks the previous link) on every boot.');
    const db = existingDb ?? new DatabaseSync(process.env.DB_PATH ?? 'wcg.db');
    wipeAllForReset(db);
    if (!existingDb) db.close();
  }

  // Auth state: always use SQLite. No per-file races, no session folder to corrupt.
  if (!authState) {
    authState = useSqliteAuthState({ sessionId: SESSION_ID, existingDb });
    if (SESSION_ID) {
      logger.info('Auth: using SQLite-backed session (SESSION_ID set)');
    } else {
      logger.info('Auth: using SQLite-backed session (generating new credentials)');
    }
  }
  if (PURGE_SIGNAL_ON_BOOT && !bootPurgeDone) {
    bootPurgeDone = true;
    logger.warn('PURGE_SIGNAL_ON_BOOT: this deletes sender-key rows too — every group stays undecryptable until this device is re-paired. Nothing purges automatically (500 badSession is routine connection rotation and self-heals on reconnect); try scripts/purge-sessions.mjs without --all first.');
    const purged = authState.purgeAllSignalSessions();
    logger.warn(`PURGE_SIGNAL_ON_BOOT: purged ${purged} Signal ratchet row(s) (session + sender-key) on boot. UNSET PURGE_SIGNAL_ON_BOOT now so it does not purge again on every restart.`);
  }
  const { state, saveCreds } = authState;

  const { version, isLatest } = await fetchLatestBaileysVersion();
  logger.info(`Auth: fetched WhatsApp v${version.join('.')} (isLatest: ${isLatest})`);

  sock = makeWASocket({
    version,
    auth: state,
    browser: Browsers.macOS('Safari'),
    logger: waLogger,
    keepAliveIntervalMs: 15000,
    // Phone-lag fix: markOnlineOnConnect defaults true, which makes this linked
    // device announce itself as the active client and pulls presence/notification
    // routing onto it, degrading the phone. syncFullHistory/shouldSyncHistoryMessage
    // stop it pulling the account's full history on connect. Now env-controlled via
    // MARK_ONLINE; set true to diagnose if WhatsApp queues messages instead of streaming live.
    markOnlineOnConnect: MARK_ONLINE,
    shouldIgnoreJid,
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    getMessage: async (key) => messageCache.get(key.id),
  });

  sock.ev.on('creds.update', saveCreds);

  // Request pairing code if not registered (before open)
  let pairingCodeRequested = false;
  if (!state.creds.registered) {
    pairingCodeRequested = true;
    await new Promise(r => setTimeout(r, 3000));
    try {
      const code = await sock.requestPairingCode(PHONE_NUMBER);
      console.log(`\n✓ Pairing code (valid 15 min): ${code}\n`);
    } catch (e) {
      logger.error({ err: e }, 'Failed to request pairing code');
    }
  }

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'connecting') {
      logger.info('Connecting to WhatsApp...');
    } else if (connection === 'open') {
      connectedAt = Date.now();
      lastDispatchAt = Date.now();
      // Must be seeded too, not left at 0: the deaf-socket detector measures
      // Date.now() - lastNotifyAt, so an unseeded 0 reads as "silent since the
      // Unix epoch" and trips the detector 30s into every boot.
      lastNotifyAt = Date.now();
      // A fresh socket has not been given a chance to deliver anything yet.
      preKeyRepairAttempted = false;
      lastPreKeyActionAt = 0;
      logger.info(`Connected to WhatsApp as ${sock.user?.id ?? 'unknown'}`);

      // If the user hasn't set a SESSION_ID in their env yet, it means they just
      // paired or are still running on the legacy file-based auth. Print the base64
      // string so they can set it and transition to SQLite.
      if (!SESSION_ID) {
        const sid = encodeCreds(state.creds);
        console.log('\n' + '═'.repeat(60));
        console.log('  ✅ SESSION_ID (copy this entire string into your .env):');
        console.log('═'.repeat(60));
        console.log(sid);
        console.log('═'.repeat(60) + '\n');
        logger.info('SESSION_ID printed above — add it to your .env or hosting panel, then restart. The session/ folder is no longer needed.');
      }

      if (onConnected) onConnected();
    } else if (connection === 'close') {
      cancelGraceFallback(); // a real close arrived - the fallback must not also fire
      const upSec = connectedAt ? ((Date.now() - connectedAt) / 1000).toFixed(0) : '0';
      connectedAt = 0;
      if (shuttingDown) return; // shutdown() closed this on purpose - do not reconnect
      const reason = lastDisconnect?.error?.output?.statusCode;
      const reasonName = disconnectReasonName(reason);
      if (reason === DisconnectReason.loggedOut) {
        authState.wipeAll();
        logger.error(`Logged out (${reason} ${reasonName}). Session is dead and has been wiped from the database. Clear your SESSION_ID env var and restart the bot to re-pair.`);
        process.exit(1);
      } else if (reason === DisconnectReason.restartRequired) {
        logger.info(`Pairing complete, restarting connection (this is normal) [${reason} ${reasonName}, up ${upSec}s]`);
        sock.ev.removeAllListeners();
        connect(onMessage, logger, onConnected);

      } else {
        logger.info(`Disconnected (${reason} ${reasonName}) after ${upSec}s connected, reconnecting in ${RECONNECT_DELAY}ms...`);
        sock.ev.removeAllListeners();
        setTimeout(() => connect(onMessage, logger, onConnected), RECONNECT_DELAY);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    try {
      logger.debug(`upsert type=${type} count=${messages.length}`);
      if (type === 'notify') {
        lastNotifyAt = Date.now(); // live traffic, regardless of payload/dispatch outcome
        // Traffic is flowing again: clear the deaf-socket guards so a future
        // silence gets the cheap non-destructive repair first, not a reconnect.
        preKeyRepairAttempted = false;
        lastPreKeyActionAt = 0;
      }
      inboundStats.total += messages.length;
      inboundStats.byType[type] = (inboundStats.byType[type] ?? 0) + messages.length;
      for (const msg of messages) {
        logger.debug(
          `raw jid=${msg.key.remoteJid} fromMe=${msg.key.fromMe} id=${msg.key.id} ` +
          `keys=${Object.keys(msg.message ?? {}).join(',') || 'none'}`
        );
        if (msg.message) cacheMessage(msg.key.id, msg.message);
        if (shouldSkip(msg.key, sentIds)) { inboundStats.echo++; logger.debug('  skip: own echo'); continue; }

        let text;
        if (msg.message?.conversation) {
          text = msg.message.conversation;
        } else if (msg.message?.extendedTextMessage?.text) {
          text = msg.message.extendedTextMessage.text;
        } else {
          if (!msg.message) inboundStats.noPayload++;
          logger.debug('  skip: no text payload');
          continue;
        }

        const jid = msg.key.remoteJid;
        if (jid === 'status@broadcast' || jid.endsWith('@broadcast') || jid.endsWith('@newsletter')) continue;

        // Own phone-form JID, device suffix stripped (":87@s.whatsapp.net" -> bare
        // number re-joined with the standard domain) so it matches the plain
        // phone-form JID a DM partner would see for us.
        const ownJid = `${toNumber(sock.user?.id)}@s.whatsapp.net`;
        const sender = resolveSender(msg.key, jid, ownJid);
        // Phone-form JID alongside `sender`, which may be @lid under lid addressing.
        // No participant (DM) means sender is already phone-form; participantPn may
        // legitimately be undefined (non-lid groups, or older baileys behaviour).
        const senderPn = msg.key.fromMe
          ? ownJid
          : msg.key.participant ? msg.key.participantPn : sender;
        const isGroup = jid.endsWith('@g.us');

        inboundStats.dispatched++;
        lastDispatchAt = Date.now();
        onMessageHandler({ jid, sender, senderPn, text, isGroup, raw: msg });
      }
    } catch (e) {
      logger.error({ err: e }, 'Unhandled error in messages.upsert handler');
    }
  });

  return { sock, pairingCodeRequested };
}

// payload: { text, mentions, quoted, react }. `react` (when present) is
// { text: '<emoji>', key: <message key to react to> } and takes precedence
// over text/mentions/quoted - a queue entry is either a text message or a
// reaction, never both (see transport/router.js).
export async function send(jid, payload) {
  if (!sock) {
    logger?.error('Socket not connected');
    return;
  }
  const { text, mentions, quoted, react, imagePath } = payload;
  try {
    let content;
    if (react) {
      content = { react };
    } else if (imagePath) {
      const { readFileSync } = await import('node:fs');
      content = { image: readFileSync(imagePath), caption: text };
      if (Array.isArray(mentions) && mentions.length > 0) content.mentions = mentions;
    } else {
      content = Array.isArray(mentions) && mentions.length > 0 ? { text, mentions } : { text };
    }
    const result = await sock.sendMessage(jid, content, quoted ? { quoted } : {});
    addSentId(sentIds, result?.key?.id);
  } catch (e) {
    logger?.error({ err: e }, `Failed to send message to ${jid}`);
  }
}

// Clean disconnect for process shutdown: closes the websocket only, via
// baileys' own `end()` (same call it uses internally on stream/connection
// errors) - creds/session files on disk are untouched.
// Do NOT use sock.logout() here: that sends a "remove-companion-device" IQ
// to WhatsApp, which unlinks this device and permanently kills the session -
// exactly what we must not do on a routine restart.
export function shutdown() {
  shuttingDown = true;
  clearInterval(summaryTimer);
  summaryTimer = null;
  clearInterval(watchdogTimer);
  watchdogTimer = null;
  cancelGraceFallback();
  if (!sock) return;
  sock.end(undefined);
}

export function getSocket() {
  return sock;
}

// True only between a 'connection: open' and the following 'close'. The outbox
// uses this to hold messages instead of dispatching them into a socket that is
// being torn down and replaced — sends there fail and the message is lost.
export function isConnected() {
  return connectedAt !== 0;
}

export async function getGroupAdmins(jid) {
  const cached = groupAdminCache.get(jid);
  const now = Date.now();
  if (cached && now - cached.ts < GROUP_ADMIN_CACHE_MS) return cached.admins;

  if (!sock) return [];
  try {
    const metadata = await withTimeout(sock.groupMetadata(jid), GROUP_METADATA_TIMEOUT_MS, null);
    if (metadata === null) {
      logger?.warn(`Group admins query timed out for ${jid}`);
      return [];
    }
    const admins = [];
    for (const p of metadata.participants || []) {
      if (p.lid && p.jid) rememberLidPhone(p.lid, p.jid);
      if (p.admin === 'admin' || p.admin === 'superadmin') admins.push(p.id);
    }
    groupAdminCache.set(jid, { admins, ts: now });
    return admins;
  } catch (e) {
    logger?.error({ err: e }, `Failed to fetch group admins for ${jid}`);
    return [];
  }
}

export { parseCommand };
