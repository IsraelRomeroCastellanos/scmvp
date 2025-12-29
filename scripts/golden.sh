#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-https://scmvp.onrender.com}"
EMAIL="${EMAIL:-admin@cumplimiento.com}"

# Password por env o prompt silencioso
if [[ -z "${PASSWORD:-}" ]]; then
  read -r -s -p "Password for ${EMAIL}: " PASSWORD
  echo
fi

# Parser de JSON token: jq si existe, si no python
extract_token() {
  if command -v jq >/dev/null 2>&1; then
    jq -r '.token // empty'
  else
    python3 - <<'PY'
import sys, json
try:
    data=json.load(sys.stdin)
    print(data.get("token",""))
except Exception:
    print("")
PY
  fi
}

echo "== SCMVP Golden Checks =="
echo "BASE: $BASE"
echo "EMAIL: $EMAIL"
echo

echo "-- 1) Login (get token) --"
LOGIN_JSON="$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")"

TOKEN="$(printf "%s" "$LOGIN_JSON" | extract_token)"TOKEN="$(printf "%s" "$LOGIN_JSON" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"

if [[ -z "$TOKEN" ]]; then
  echo "❌ Could not extract token. Raw response:"
  echo "$LOGIN_JSON"
  exit 1
fi

echo "✅ Token obtained. Length: ${#TOKEN}"
echo

req() {
  local name="$1"; shift
  local url="$1"; shift
  echo "-- $name --"
  # imprime status + primer pedazo del body
  local out body code
  out="$(curl -s -o /tmp/_scmvp_body.txt -w "%{http_code}" "$url" "$@")" || true
  code="$out"
  body="$(head -c 300 /tmp/_scmvp_body.txt | tr '\n' ' ')"
  echo "HTTP:$code  URL:$url"
  echo "BODY:${body}"
  echo
}

H_AUTH=(-H "Authorization: Bearer $TOKEN")

req "2) Admin __debug"   "$BASE/api/admin/__debug"   "${H_AUTH[@]}"
req "3) Admin empresas"  "$BASE/api/admin/empresas"  "${H_AUTH[@]}"

# Clientes: probamos varias rutas comunes en 1 corrida
req "4a) Cliente mis-clientes" "$BASE/api/cliente/mis-clientes" "${H_AUTH[@]}"
req "4b) Cliente __debug"      "$BASE/api/cliente/__debug"      "${H_AUTH[@]}"
req "4c) Cliente root"         "$BASE/api/cliente"              "${H_AUTH[@]}"

echo "== Done =="
