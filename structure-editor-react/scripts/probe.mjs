import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import { URL } from 'node:url';

const targetUrl = process.env.TARGET_URL || 'http://127.0.0.1:80';
const intervalMs = Number(process.env.INTERVAL_MS || '15000');
const logFilePath = process.env.LOG_FILE || './logs/probe.log';

function append(line) {
  const ts = new Date().toISOString();
  const full = `[${ts}] ${line}\n`;
  try {
    fs.appendFileSync(logFilePath, full, { encoding: 'utf8' });
    // also print to stdout for pm2 logs
    process.stdout.write(full);
  } catch (err) {
    process.stderr.write(`Failed to write probe log: ${err?.message || err}\n`);
  }
}

function probeOnce() {
  let url;
  try {
    url = new URL(targetUrl);
  } catch (e) {
    append(`Invalid TARGET_URL: ${targetUrl}: ${e.message}`);
    return;
  }

  const mod = url.protocol === 'https:' ? https : http;

  const start = Date.now();
  const req = mod.request({
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + (url.search || ''),
    method: 'GET',
    timeout: 8000,
    headers: { 'User-Agent': 'pm2-probe/1.0' }
  }, (res) => {
    const ms = Date.now() - start;
    append(`HTTP ${res.statusCode} in ${ms}ms`);
    // drain
    res.resume();
  });

  req.on('timeout', () => {
    append('Request timeout');
    req.destroy();
  });

  req.on('error', (err) => {
    append(`Error: ${err.code || ''} ${err.message}`);
  });

  req.end();
}

append(`Starting probe for ${targetUrl} every ${intervalMs}ms; logging to ${logFilePath}`);
probeOnce();
setInterval(probeOnce, intervalMs);


