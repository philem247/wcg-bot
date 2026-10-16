// Entry file for panels whose start command is fixed to `node ${STARTUP_FILE}`:
// set STARTUP_FILE to start-pm2.js and this runs index.js under pm2-runtime.
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const child = spawn(process.execPath,
  [join(root, 'node_modules/pm2/bin/pm2-runtime'), 'start', join(root, 'ecosystem.config.cjs')],
  { cwd: root, stdio: 'inherit' });
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => child.kill(s));
child.on('error', (e) => { console.error(`start-pm2: ${e.message}`); process.exit(1); });
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
