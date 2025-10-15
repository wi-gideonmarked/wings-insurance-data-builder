#!/usr/bin/env bash
set -euo pipefail

echo "== PM2 status =="
npx pm2 status || true

echo
echo "== Listeners on :80 =="
ss -ltnp | grep ":80" || true

echo
echo "== Curl localhost =="
curl -s -o /dev/null -w "HTTP %{http_code} in %{time_total}s\n" http://127.0.0.1/ || true

echo
echo "== Disk + dist presence =="
df -h | sed -n '1,5p'
ls -la dist || true

echo
echo "== Probe last 50 lines =="
tail -n 50 ./logs/probe.log || true

echo
echo "== App logs last 50 lines =="
npx pm2 logs structure-editor-react --lines 50 || true


