module.exports = {
  apps: [
    {
      name: 'email-microservice',
      script: 'index.js',
      instances: 1, // Run single instance, let index.js handle clustering
      exec_mode: 'fork', // Use fork mode since index.js handles cluster mode
      env: {
        NODE_ENV: 'development',
        PORT: 3100,
        ENABLE_CLUSTER: 'false' // Disable clustering in dev for easier debugging
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3100,
        ENABLE_CLUSTER: 'true' // Enable clustering in production
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_file: 'logs/pm2-combined.log',
      time: true,
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['logs', 'node_modules', 'tests'],
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 10000, // Match SHUTDOWN_TIMEOUT_MS
      wait_ready: true, // Wait for process.send('ready') for zero-downtime
      listen_timeout: 10000
    }
  ]
};
