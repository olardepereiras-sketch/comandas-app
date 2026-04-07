module.exports = {
  apps: [{
    name: 'comandas-backend',
    script: 'src/index.ts',
    interpreter: 'tsx',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    watch: false,
    instances: 1,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 3000,
  }]
};
