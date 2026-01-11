# RUNBOOK — SCMVP Debug

## Ejecutar Mission Check (WSL)
1) source scripts/.env.local
2) ./scripts/mission.sh
3) unset PASSWORD

## Token (WSL) — extracción robusta (evitar TOKEN_LEN=0)
Recomendado: extraer con sed.

TOKEN=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cumplimiento.com","password":"***REDACTED***"}' \
  | sed -n 's/.*"token"[ ]*:[ ]*"\([^"]*\)".*/\1/p')

echo "TOKEN_LEN=${#TOKEN}"

## Golden checks (mínimos)
- POST /api/auth/login -> token
- GET /api/admin/__debug:
  - sin Authorization -> 401
  - Authorization: Bearer basura -> 401
- GET /api/admin/empresas -> 200 {"empresas":[...]}
- GET /api/cliente/clientes?empresa_id=32 -> 200 {"clientes":[...]}
  - Nota: para admin/consultor, si no se envía empresa_id el BE puede responder 400: {"error":"empresa_id inválido"}

## Golden checks — registrar cliente PF (post-cambio BE)
Se espera:
- sin persona.curp -> 400 "persona.curp es obligatorio"
- con curp pero fecha ISO (YYYY-MM-DD) -> 400 "persona.fecha_nacimiento inválida (AAAAMMDD)"
- sin apellido materno -> 400 "persona.apellido_materno es obligatorio"
- con curp + AAAAMMDD + apellido materno -> 201

## Golden checks — editar cliente
- PUT /api/cliente/clientes/:id con datos_completos -> 200 ok:true
- Validar persistencia con GET posterior

## Incidentes comunes
- “Service Suspended” en Render:
  - Verifica BASE; el backend actual es https://scmvp-1jhq.onrender.com
  - El backend anterior https://scmvp.onrender.com está suspendido

## Variables (scripts/.env.local)
- BASE="https://scmvp-1jhq.onrender.com"
- EMAIL="admin@cumplimiento.com"
- EMPRESA_ID_FOR_CHECK="32" (usado por mission.sh para /api/cliente/clientes)
