module.exports = {
  apps: [
    {
      name: 'reservamesa-backend',
      script: 'bun',
      args: '--env-file .env backend/server.ts',
      instances: 1,
      exec_mode: 'fork',
      cwd: '/var/www/reservamesa',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
    },
  ],
};
