module.exports = {
  apps: [
    {
      name: 'mia-backend',
      script: 'bin/server.ts',
      interpreter: 'bun',
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 13100,
      },
      env_development: {
        NODE_ENV: 'development',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/mia-backend-error.log',
      out_file: 'logs/mia-backend-out.log',
      merge_logs: true,
    },
  ],
}
