#!/usr/bin/env bash
set -euo pipefail

# ========== Config por ENV ==========
BASE="${BASE:-https://scmvp.onrender.com}"
EMAIL="${EMAIL:-admin@cumplimiento.com}"

# Requerido por env (no prompt)
: "${PASSWORD:?Set PASSWORD env var. Example: export PASSWORD='...'}"

# Opcional: guardar log a archivo (1 = sí)
SAVE_LOG="${SAVE_LOG:-1}"

# timeouts / retries para Render frío
CURL_COMMON=(--connect-timeout 10 -m 25 --retry 2 --retry-delay 2 -s)

# ========== Utilidades ==========
ts() { date +"%Y-%m-%d %H:%M:%S"; }

extract_token() {
  # lee JSON por stdin y saca token sin depender de jq
  # (sed funciona con el formato actual {"token":"...","user":{...}})
  sed -n 's/.*"token":"\([^"]*\)".*/\1/p'
}

http_req() {
  # imprime: CODE|BODY(first 300)
  local url="$1"; shift
  local tmp="/tmp/_scmvp_body.$$"
  local code
  code="$(curl "${CURL_COMMON[@]}" -o "$tmp" -w "%{http_code}" "$url" "$@" || true)"
  local body
  body="$(head -c 300 "$tmp" | tr '\n' ' ' | tr -d '\r')"
  rm -f "$tmp" || true
  printf "%s|%s" "$code" "$body"
}

status_word() {
  local code="$1"
  if [[ "$code" == "200" || "$code" == "201" ]]; then echo "OK"
  elif [[ "$code" == "401" || "$code" == "403" ]]; then echo "FAIL"
  elif [[ "$code" == "404" ]]; then echo "WARN"
  else echo "WARN"
  fi
}

# ========== Inicio ==========
RUN_AT="$(ts)"
OUT="SCMVP Mission Check — $RUN_AT
BASE: $BASE
EMAIL: $EMAIL
"

# Login
LOGIN_JSON="$(curl "${CURL_COMMON[@]}" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" || true)"

TOKEN="$(printf "%s" "$LOGIN_JSON" | extract_token)"

if [[ -z "$TOKEN" ]]; then
  OUT+="
Auth/Login: FAIL (no token extracted)
Raw login response (first 300):
$(printf "%s" "$LOGIN_JSON" | head -c 300 | tr '\n' ' ')
Overall: FAIL
"
  echo "$OUT"
  exit 2
fi

OUT+="
Auth/Login: OK (token length ${#TOKEN})
"

H_BEARER=(-H "Authorization: Bearer $TOKEN")
H_RAW=(-H "Authorization: $TOKEN")

# Checks (ajusta lista si cambias rutas)
declare -A CHECKS
CHECKS["Admin __debug"]="$BASE/api/admin/__debug"
CHECKS["Admin empresas"]="$BASE/api/admin/empresas"
CHECKS["Cliente __debug"]="$BASE/api/cliente/__debug"
CHECKS["Cliente mis-clientes (Bearer)"]="$BASE/api/cliente/mis-clientes"
#CHECKS["Cliente mis-clientes (Raw)"]="$BASE/api/cliente/mis-clientes"

# Ejecutar checks
OVERALL="OK"
OUT+="
-- Checks --
"

for name in "${!CHECKS[@]}"; do
  url="${CHECKS[$name]}"

  if [[ "$name" == *"(Raw)"* ]]; then
    resp="$(http_req "$url" "${H_RAW[@]}")"
  else
    resp="$(http_req "$url" "${H_BEARER[@]}")"
  fi

  code="${resp%%|*}"
  body="${resp#*|}"
  st="$(status_word "$code")"

  # lógica de severidad
  # - 401/403: FAIL
  # - 404 en admin: WARN (puede ser montaje diferente)
  if [[ "$st" == "FAIL" ]]; then
    OVERALL="FAIL"
  elif [[ "$st" == "WARN" && "$OVERALL" != "FAIL" ]]; then
    OVERALL="WARN"
  fi

  OUT+="$name: $st (HTTP:$code) — ${body}
"
done

# Diagnóstico extra: si Bearer falla y Raw OK => bug middleware
bearer_code="$(http_req "$BASE/api/cliente/mis-clientes" "${H_BEARER[@]}")"
bearer_code="${bearer_code%%|*}"
raw_code="$(http_req "$BASE/api/cliente/mis-clientes" "${H_RAW[@]}")"
raw_code="${raw_code%%|*}"

if [[ "$bearer_code" != "200" && "$raw_code" == "200" ]]; then
  if [[ "$OVERALL" != "FAIL" ]]; then OVERALL="WARN"; fi
  OUT+="
NOTE: Cliente mis-clientes funciona con Authorization: <token> pero falla con Bearer. Esto sugiere middleware que no parsea 'Bearer ' correctamente.
"
fi

OUT+="
Overall: $OVERALL
"

# Guardar log
if [[ "$SAVE_LOG" == "1" ]]; then
  mkdir -p docs/ops/mission
  fname="docs/ops/mission/mission_$(date +%Y%m%d_%H%M%S).txt"
  printf "%s" "$OUT" > "$fname"
  OUT+="Saved log: $fname
"
fi

echo "$OUT"

# código de salida útil para CI/manual
if [[ "$OVERALL" == "FAIL" ]]; then exit 2
elif [[ "$OVERALL" == "WARN" ]]; then exit 1
else exit 0
fi
