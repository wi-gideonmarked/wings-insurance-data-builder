export default {
  apps: [{
    name: 'structure-editor-react',
    script: './node_modules/.bin/serve',
    args: '-s dist -l 80',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
