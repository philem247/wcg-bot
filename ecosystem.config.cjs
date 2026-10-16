// pm2 supervision for wcg-bot. Started via start-pm2.js on panels whose start
// command is fixed to `node ${STARTUP_FILE}`, or directly with
// `npx pm2-runtime start ecosystem.config.cjs`.
module.exports = {
  apps: [{
    name: 'wcg-bot',
    script: 'index.js',
    exec_mode: 'fork',
    instances: 1,            // never more than 1 on one WhatsApp session
    watch: false,
    autorestart: true,
    min_uptime: '60s',
    max_restarts: 50,
    exp_backoff_restart_delay: 2000,
    max_memory_restart: process.env.PM2_MAX_MEMORY || '700M',
    kill_timeout: 10000,     // time for the SIGINT/SIGTERM shutdown handler
    time: true,
  }],
};
