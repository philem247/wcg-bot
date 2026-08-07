import { default as makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } from 'baileys';
import pino from 'pino';
import { readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { SESSION_DIR, PHONE_NUMBER, WA_LOG_LEVEL, STALL_TIMEOUT_MS } from '../config.js';
import { parseCommand } from './commands.js';
import { toNumber } from './admin.js';

let sock;
let onMessageHandler;
let onConnectedHandler;
let logger;
let shuttingDown = false;
let connectedAt = 0; // ms of the last 'open'; 0 while disconnected
// ONE auth state for the process lifetime. Rebuilding it per connect() gives each
// socket its own store and its own debounce timer over the same file: an orphaned
// timer from the previous socket can fire after the new one has written, rolling
// Signal ratchet counters backwards. That surfaces as
// "MessageCounterError: Key used already or never filled" and, once written to
// disk, survives restarts. Reusing one state is also baileys' own documented pattern.
let authState = null;

// Purge corrupted Signal ratchet state from disk. Called on badSession (500)
// disconnect, which means the server has decided this device's Signal sessions
// are out of sync. Deletes per-contact session files (session-*.json) and
// group sender-key files (sender-key-*.json) so baileys negotiates fresh
// sessions via pre-key messages on reconnect. creds.json and pre-key files
// are preserved — the device identity and unused pre-keys are still valid.
async function purgeSignalSessions(sessionDir, log) {
  let files;
  try {
    files = await readdir(sessionDir);
  } catch (e) {
    log?.warn({ err: e }, 'purgeSignalSessions: cannot read session dir, skipping');
    return 0;
  }
  const stale = files.filter(f => f.startsWith('session-') || f.startsWith('sender-key-'));
  let purged = 0;
  for (const f of stale) {
    try {
      await unlink(join(sessionDir, f));
      purged++;
    } catch (e) {
      if (e.code !== 'ENOENT') log?.warn({ err: e, file: f }, 'purgeSignalSessions: failed to delete');
    }
  }
  return purged;
}
const RECONNECT_DELAY = 3000;
const GROUP_ADMIN_CACHE_MS = 60_000;

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

// Stall watchdog: baileys' keepalive only proves the websocket is alive, not
// that inbound messages are still being delivered over it. When delivery
// silently wedges mid-game, this forces a reconnect instead of waiting the
// minutes it otherwise takes baileys to notice on its own.
const WATCHDOG_INTERVAL_MS = 30_000;
let lastDispatchAt = 0;
let lastNotifyAt = 0; // ms of the last live ('notify'-type) messages.upsert, regardless of dispatch outcome
let watchdogTimer = null;
let trafficProbe = () => false;

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
  watchdogTimer = setInterval(() => {
    if (shuttingDown) return;
    const silentMs = Date.now() - lastDispatchAt;
    const notifyMs = Date.now() - lastNotifyAt;
    const trafficExpected = trafficProbe();
    if (!shouldForceReconnect({
      connected: isConnected(),
      trafficExpected,
      msSinceLastDispatch: silentMs,
      msSinceLastNotify: notifyMs,
      timeoutMs: STALL_TIMEOUT_MS,
    })) return;
    const upSec = connectedAt ? ((Date.now() - connectedAt) / 1000).toFixed(0) : '0';
    const cause = trafficExpected ? 'game traffic expected' : 'messages arriving but not dispatching';
    logger.warn(`Stall watchdog: no message dispatched in ${(silentMs / 1000).toFixed(0)}s (connected ${upSec}s, ${cause}) — forcing reconnect`);
    lastDispatchAt = Date.now(); // don't refire against the same stall while the new socket comes up
    sock?.end(undefined);
    armGraceFallbackForStalledEnd();
  }, WATCHDOG_INTERVAL_MS);
  watchdogTimer.unref?.();
}

function startSummaryTimer() {
  if (summaryTimer) return; // connect() re-runs on every reconnect; only one timer ever
  summaryTimer = setInterval(() => {
    if (inboundStats.total === 0) return; // idle bot: say nothing
    const byType = Object.entries(inboundStats.byType).map(([k, v]) => `${k}=${v}`).join(',') || 'none';
    const upSec = connectedAt ? ((Date.now() - connectedAt) / 1000).toFixed(0) : '0';
    logger.info(
      `inbound 5m: total=${inboundStats.total} byType=${byType} noPayload=${inboundStats.noPayload} ` +
      `echo=${inboundStats.echo} dispatched=${inboundStats.dispatched} connected=${isConnected()} upSec=${upSec}`
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

export async function connect(onMessage, appLogger, onConnected) {
  logger = appLogger;
  onMessageHandler = onMessage;
  onConnectedHandler = onConnected;
  startSummaryTimer();
  startWatchdogTimer();

  // baileys' own multi-file store. A previous hand-rolled single-file version
  // batched every Signal key write behind a 500ms debounce and rewrote the whole
  // store each time; ratchet advances lost inside that window showed up in
  // production as "MessageCounterError: Key used already or never filled" and
  // left the bot unable to decrypt, persistently, across restarts. Per-key
  // immediate writes are the entire point — do not "tidy" this back into one file.
  if (!authState) authState = await useMultiFileAuthState(SESSION_DIR);
  const { state, saveCreds } = authState;

  sock = makeWASocket({
    auth: state,
    browser: Browsers.ubuntu('Chrome'),
    logger: waLogger,
    // Phone-lag fix: markOnlineOnConnect defaults true, which makes this linked
    // device announce itself as the active client and pulls presence/notification
    // routing onto it, degrading the phone. syncFullHistory/shouldSyncHistoryMessage
    // stop it pulling the account's full history on connect.
    markOnlineOnConnect: false,
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
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
      logger.info(`Connected to WhatsApp as ${sock.user?.id ?? 'unknown'}`);
      if (onConnected) onConnected();
    } else if (connection === 'close') {
      cancelGraceFallback(); // a real close arrived - the fallback must not also fire
      const upSec = connectedAt ? ((Date.now() - connectedAt) / 1000).toFixed(0) : '0';
      connectedAt = 0;
      if (shuttingDown) return; // shutdown() closed this on purpose - do not reconnect
      const reason = lastDisconnect?.error?.output?.statusCode;
      const reasonName = disconnectReasonName(reason);
      if (reason === DisconnectReason.loggedOut) {
        logger.error(`Logged out (${reason} ${reasonName}). Session is dead: delete the session/ folder and re-pair from scratch, then restart the bot.`);
        process.exit(1);
      } else if (reason === DisconnectReason.restartRequired) {
        logger.info(`Pairing complete, restarting connection (this is normal) [${reason} ${reasonName}, up ${upSec}s]`);
        sock.ev.removeAllListeners();
        connect(onMessage, logger, onConnected);
      } else if (reason === DisconnectReason.badSession) {
        // badSession (500): the server decided our Signal ratchets are out of
        // sync. Purge the corrupted session files, rebuild authState from disk
        // so the in-memory store picks up the cleaned state, then reconnect.
        // Without this, every message after reconnect hits
        // "MessageCounterError: Key used already or never filled" and the bot
        // sits there unable to decrypt anything — exactly the mid-game hang.
        logger.warn(`Bad session (${reason} ${reasonName}) after ${upSec}s connected — purging Signal sessions and reconnecting...`);
        sock.ev.removeAllListeners();
        purgeSignalSessions(SESSION_DIR, logger).then(n => {
          logger.info(`Purged ${n} stale Signal session file(s) from ${SESSION_DIR}`);
          // Force authState to reload from disk on next connect() so it sees
          // the cleaned directory rather than serving stale in-memory sessions.
          authState = null;
          setTimeout(() => connect(onMessage, logger, onConnected), RECONNECT_DELAY);
        }).catch(e => {
          logger.error({ err: e }, 'Failed to purge signal sessions, reconnecting anyway');
          authState = null;
          setTimeout(() => connect(onMessage, logger, onConnected), RECONNECT_DELAY);
        });
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
      if (type === 'notify') lastNotifyAt = Date.now(); // live traffic, regardless of payload/dispatch outcome
      inboundStats.total += messages.length;
      inboundStats.byType[type] = (inboundStats.byType[type] ?? 0) + messages.length;
      for (const msg of messages) {
        logger.debug(
          `raw jid=${msg.key.remoteJid} fromMe=${msg.key.fromMe} id=${msg.key.id} ` +
          `keys=${Object.keys(msg.message ?? {}).join(',') || 'none'}`
        );
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
  const { text, mentions, quoted, react } = payload;
  try {
    let content;
    if (react) {
      content = { react };
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
    const metadata = await sock.groupMetadata(jid);
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
