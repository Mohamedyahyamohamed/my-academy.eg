#!/usr/bin/env bash
set -euo pipefail
URL="${1:-https://my-academy-eg.vercel.app/api/health}"
for i in $(seq 1 10); do
  curl -sS -o "/tmp/myacademy-health-${i}.json" -w "run=${i} status=%{http_code} total_s=%{time_total} connect_s=%{time_connect} starttransfer_s=%{time_starttransfer}\n" "$URL"
done
