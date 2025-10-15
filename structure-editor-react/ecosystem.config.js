export default {
  apps: [{
    name: 'structure-editor-react',
    script: './node_modules/.bin/serve',
    args: '-s dist -l 80',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    env: {
      NODE_ENV: 'production',
      PORT: 80
    }
  }, {
    name: 'structure-editor-probe',
    script: './scripts/probe.mjs',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS',
    error_file: './logs/probe-error.log',
    out_file: './logs/probe-out.log',
    time: true,
    env: {
      TARGET_URL: 'http://127.0.0.1:80',
      INTERVAL_MS: '15000',
      LOG_FILE: './logs/probe.log'
    }
  }]
};
