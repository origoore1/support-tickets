module.exports = {
  apps: [
    {
      name: 'lindgren-x-v2',
      script: './lindgren-x-v2.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      listen_timeout: 3000,
      kill_timeout: 5000,
      wait_ready: false,
      exp_backoff_restart_delay: 100
    }
  ]
};
