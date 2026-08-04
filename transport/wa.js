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
let authFlush = null; // set by connect(), called by shutdown()
const RECONNECT_DELAY = 3000;
const GROUP_ADMIN_CACHE_MS = 60_000;
const groupAdminCache = new Map(); // jid -> { admins, ts }

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
      logger.info(`Connected to WhatsApp as ${sock.user?.id ?? 'unknown'}`);
      if (onConnected) onConnected();
    } else if (connection === 'close') {
      if (shuttingDown) return; // shutdown() closed this on purpose - do not reconnect
      const reason = lastDisconnect?.error?.output?.statusCode;
      const reasonName = disconnectReasonName(reason);
      if (reason === DisconnectReason.loggedOut) {
        logger.error(`Logged out (${reason} ${reasonName}). Session is dead: delete the session/ folder and re-pair from scratch, then restart the bot.`);
        process.exit(1);
      } else if (reason === DisconnectReason.restartRequired) {
        logger.info(`Pairing complete, restarting connection (this is normal) [${reason} ${reasonName}]`);
        sock.ev.removeAllListeners();
        connect(onMessage, logger);
      } else {
        logger.info(`Disconnected (${reason} ${reasonName}), reconnecting in ${RECONNECT_DELAY}ms...`);
        sock.ev.removeAllListeners();
        setTimeout(() => connect(onMessage, logger), RECONNECT_DELAY);
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
        const senderPn = msg.key.participant ? msg.key.participantPn : sender;
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

export async function getGroupAdmins(jid) {
  const cached = groupAdminCache.get(jid);
  const now = Date.now();
  if (cached && now - cached.ts < GROUP_ADMIN_CACHE_MS) return cached.admins;

  if (!sock) return [];
  try {
    const metadata = await sock.groupMetadata(jid);
    const admins = (metadata.participants || [])
      .filter((p) => p.admin === 'admin' || p.admin === 'superadmin')
      .map((p) => p.id);
    groupAdminCache.set(jid, { admins, ts: now });
    return admins;
  } catch (e) {
    logger?.error({ err: e }, `Failed to fetch group admins for ${jid}`);
    return [];
  }
}

export { parseCommand };
