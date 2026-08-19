#!/usr/bin/env bash
set -u
BASE="https://my-academy-eg.vercel.app"
OUT="/home/ubuntu/my-academy-recovered-alt/docs/runtime-checks-2026-08-19/api-http.tsv"
printf 'timestamp\tmethod\tpath\tstatus\ttime_s\tcontent_type\n' > "$OUT"
check_get() {
  local path="$1"
  local headers body status time ct
  headers=$(mktemp)
  body=$(mktemp)
  read -r status time < <(curl -sS -L --max-time 20 -D "$headers" -o "$body" -w '%{http_code} %{time_total}' "$BASE$path" || printf '000 0')
  ct=$(awk -F': ' 'tolower($1)=="content-type" {print $2}' "$headers" | tr -d '\r' | tail -1)
  printf '%s\tGET\t%s\t%s\t%s\t%s\n' "$(date -u +%FT%TZ)" "$path" "$status" "$time" "$ct" >> "$OUT"
  rm -f "$headers" "$body"
}
for p in \
  /api/health \
  /api/search?q=runtime-smoke-nonexistent-20260819 \
  /api/push/subscribe \
  /api/push/send \
  /api/whatsapp/test \
  /api/billing/stripe/webhook \
  /api/billing/paymob/webhook \
  /api/auth/session \
  /api/auth/me; do
  check_get "$p"
done
cat "$OUT"
