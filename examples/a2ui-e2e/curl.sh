#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:5001}"
API_KEY="${API_KEY:-fog_live_replace_me}"

curl -X POST "${API_URL}/fogui/compat/a2ui/inbound" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d @examples/a2ui-e2e/payload.json

