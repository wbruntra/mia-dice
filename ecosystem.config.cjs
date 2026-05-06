module.exports = {
  apps: [
    {
      name: 'mia-backend',
      script: 'bun',
      args: 'run bin/server.ts',
      cwd: __dirname,
      interpreter: 'none',
      watch: false,
      env: {
        NODE_ENV: 'production',
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
