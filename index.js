import { resolve } from 'node:path';
import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { connect, send, getGroupAdmins, resolvePn, isConnected, shutdown as waShutdown } from './transport/wa.js';
import { createRouter, sendEvents } from './transport/router.js';
import { createOutbox } from './transport/outbox.js';
import { acquireLock, releaseLock } from './transport/lock.js';
import { installQuietSignalNoise } from './transport/quiet.js';
import { openDb } from './store/db.js';
import { loadDictionary } from './engine/dictionary.js';
import { loadBank } from './engine/bank.js';
import { createScheduler } from './engine/tick.js';
import { PHONE_NUMBER, OWNER, LOG_LEVEL, SESSION_DIR, QUIET_SIGNAL_NOISE } from './config.js';

const bootStart = Date.now();

const logger = pino(
  { level: LOG_LEVEL },
  pinoPretty({ colorize: true, translateTime: true, ignore: 'pid,hostname' })
);

// Before anything touches the socket: libsignal's decrypt-noise console spam can
// start as soon as messages.upsert fires. See transport/quiet.js.
installQuietSignalNoise(logger, { enabled: QUIET_SIGNAL_NOISE });

logger.info(`Starting WCG bot. Phone: ${PHONE_NUMBER}, Owner: ${OWNER}`);

// Must happen before anything touches the network or session/: two live
// instances advancing the same Signal ratchets corrupt each other's session.
try {
  acquireLock(SESSION_DIR, logger);
} catch (e) {
  logger.error(e.message);
  process.exit(1);
}
process.on('exit', releaseLock); // belt-and-braces; exit handlers are sync-only

const db = openDb();

const dictStart = Date.now();
const dict = loadDictionary();
logger.info(`Dictionary loaded: ${dict.size} words in ${Date.now() - dictStart}ms`);

let customWordCount = 0;
for (const w of db.customWords()) {
  dict.add(w);
  customWordCount++;
}
logger.info(`Merged ${customWordCount} approved custom word(s) from the store (db: ${resolve(process.env.DB_PATH ?? 'wcg.db')})`)

let bank = null;
try {
  bank = loadBank();
  const counts = bank.categories().map((c) => `${c} ${bank.size(c)}`).join(', ');
  logger.info(`Trivia bank loaded: ${counts || 'empty'}`);
} catch (e) {
  logger.warn(`Trivia bank unavailable (${e.message}); /trivia will be disabled`);
}

// Crash handlers — log and attempt graceful shutdown instead of silently dying.
// Without these, an unhandled rejection in baileys or a stray TypeError in the
// message handler kills the event loop with no visible output.
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — shutting down');
  shutdown('uncaughtException');
});

const games = new Map(); // jid -> game

// send() is direct network I/O; the outbox paces/queues everything in front of it
// so no single game's sends can blow past WhatsApp's rate limit or starve another
// chat. See transport/outbox.js.
const outbox = createOutbox({ sendFn: send, logger, isReady: isConnected });
outbox.start();

const router = createRouter({ dict, games, enqueue: outbox.enqueue, logger, getGroupAdmins, db, bank, resolvePn });

// pump() (engine/tick.js) walks all games synchronously and does not await onEvents.
// That's fine now: sendEvents just enqueues (synchronous), so it can never block
// another game's clock regardless.
function onEvents(jid, events) {
  try {
    sendEvents(outbox.enqueue, jid, events, undefined, Date.now(), db);
  } catch (e) {
    logger.error({ err: e }, `Failed sending events for ${jid}`);
  }
}

const scheduler = createScheduler({ games, onEvents });
scheduler.start();

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return; // second Ctrl+C: ignore, first pass is already exiting
  shuttingDown = true;
  logger.info(`Received ${signal}, shutting down...`);

  const forceExit = setTimeout(() => process.exit(0), 3000);
  forceExit.unref?.();

  try {
    scheduler.stop();
    outbox.stop();
    waShutdown(); // also calls authFlush() internally
  } catch (e) {
    logger.error({ err: e }, 'Error during shutdown');
  }

  db.close();
  releaseLock();
  clearTimeout(forceExit);
  process.exit(0);
}

// Registered before connect() so Ctrl+C during pairing/connect is graceful too.
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function handleMessage(msg) {
  const { text, sender, senderPn, isGroup, jid, raw } = msg;
  logger.debug(`${isGroup ? `[Group ${jid}]` : '[DM]'} ${sender}: ${text}`);
  await router.handleMessage({ jid, sender, senderPn, text, isGroup, raw }, Date.now());
}

// Welcome message — sent to the OWNER once, on the first successful connect only.
// Not re-sent on reconnects: the generic reconnect branch in transport/wa.js retries
// every 3s, so a flapping connection would DM the owner in a loop. Reconnects are
// already recorded in the log; the DM added nothing.
let freshPair = false;
const WELCOME_DELAY_MS = 10_000;
let welcomeSent = false;
function onConnected() {
  if (!OWNER || welcomeSent) return;
  welcomeSent = true;

  // A device that just paired must not send anything yet: WhatsApp kills it with
  // 401 loggedOut, and the message arrives undecryptable ("waiting for this
  // message"). Skip the boot DM entirely on the run that paired — the operator is
  // watching the console at that point anyway.
  if (freshPair) {
    logger.info('Freshly paired — skipping the boot DM this run. Send /help in a chat to verify the bot.');
    return;
  }

  const bootSec = ((Date.now() - bootStart) / 1000).toFixed(1);
  const dictSize = dict.size.toLocaleString();
  const questionCount = bank
    ? bank.categories().reduce((n, c) => n + bank.size(c), 0)
    : 0;
  const triviaLine = bank
    ? `🧠 *${questionCount.toLocaleString()}* trivia questions · *${bank.categories().length}* categories`
    : `🧠 Trivia unavailable — no question bank`;

  const msg = [
    `🎮 *W·C·G  B·O·T* 🎮`,
    `━━━━━━━━━━━━━━━━━━━`,
    ``,
    `⚡ *Online* and locked in.`,
    ``,
    `📚 *${dictSize}* words loaded`,
    triviaLine,
    `🕐 Booted in *${bootSec}s*`,
    ``,
    `_"First they ignore your vocabulary._`,
    `_Then they time out."_`,
    ``,
    `▸ */help* — all commands`,
    `▸ */wcg start* — word chain`,
    `▸ */trivia* — quiz race`,
    ``,
    `🔗 Chain. Survive. Win.`,
  ].join('\n');

  // Even on an established device, sending the instant the socket opens races
  // session setup. A short settle beats a message the phone cannot decrypt.
  const t = setTimeout(() => {
    if (!isConnected()) return; // dropped while we waited — not worth chasing
    send(`${OWNER}@s.whatsapp.net`, { text: msg, mentions: [] });
  }, WELCOME_DELAY_MS);
  t.unref?.();
}

try {
  const { pairingCodeRequested } = await connect(handleMessage, logger, onConnected);
  // Safe ordering: on a fresh pair connect() resolves right after it prints the
  // pairing code, long before the user finishes pairing and 'open' fires.
  freshPair = pairingCodeRequested;
  logger.info('WhatsApp socket connected');
  if (pairingCodeRequested) {
    logger.info('A pairing code was logged above - enter it in WhatsApp > Linked Devices > Link with phone number.');
  }
} catch (e) {
  logger.fatal(`Failed to connect: ${e.message}`);
  process.exit(1);
}
