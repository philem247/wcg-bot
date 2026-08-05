import { default as makeWASocket, DisconnectReason, Browsers } from 'baileys';
import pino from 'pino';
import { SESSION_FILE, PHONE_NUMBER, WA_LOG_LEVEL } from '../config.js';
import { useSingleFileAuthState } from './auth.js';
import { parseCommand } from './commands.js';
import { toNumber } from './admin.js';

let sock;
let onMessageHandler;
let logger;
let shuttingDown = false;
let connectedAt = 0; // ms of the last 'open'; 0 while disconnected
let authFlush = null; // set by connect(), called by shutdown()
const RECONNECT_DELAY = 3000;
const GROUP_ADMIN_CACHE_MS = 60_000;
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

  // Re-read per connect. Caching this across reconnects is the canonical baileys
  // pattern and looked safe (baileys mutates creds in place), but it coincided
  // with a hard 401 loggedOut loop on a fresh pair — reverted until that is
  // understood. See the debounce race noted in transport/auth.js.
  const { state, saveCreds, flush } = useSingleFileAuthState(SESSION_FILE);
  authFlush = flush;

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
      logger.info(`Connected to WhatsApp as ${sock.user?.id ?? 'unknown'}`);
      if (onConnected) onConnected();
    } else if (connection === 'close') {
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
      for (const msg of messages) {
        logger.debug(
          `raw jid=${msg.key.remoteJid} fromMe=${msg.key.fromMe} id=${msg.key.id} ` +
          `keys=${Object.keys(msg.message ?? {}).join(',') || 'none'}`
        );
        if (shouldSkip(msg.key, sentIds)) { logger.debug('  skip: own echo'); continue; }

        let text;
        if (msg.message?.conversation) {
          text = msg.message.conversation;
        } else if (msg.message?.extendedTextMessage?.text) {
          text = msg.message.extendedTextMessage.text;
        } else {
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
  if (authFlush) authFlush();
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
