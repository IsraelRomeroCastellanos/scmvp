# RUNBOOK — SCMVP Debug

## Ejecutar Mission Check (WSL)

1. source scripts/.env.local
2. ./scripts/mission.sh
3. unset PASSWORD

## Token (WSL) — extracción robusta (evitar TOKEN\_LEN=0)

Recomendado: extraer con sed.

TOKEN=$(curl -s -X POST "$BASE/api/auth/login"   
-H "Content-Type: application/json"   
-d '{"email":"admin@cumplimiento.com","password":"***REDACTED***"}'   
| sed -n 's/.*"token"\[ ]*:\[ ]*"(\[^"]*)".\*/\\1/p')

echo "TOKEN\_LEN=${#TOKEN}"

## Golden checks (mínimos)

* POST /api/auth/login -> token
* GET /api/admin/\_\_debug:

  * sin Authorization -> 401
  * Authorization: Bearer basura -> 401

* GET /api/admin/empresas -> 200 {"empresas":\[...]}
* GET /api/cliente/clientes?empresa\_id=32 -> 200 {"clientes":\[...]}

  * Nota: para admin/consultor, si no se envía empresa\_id el BE puede responder 400: {"error":"empresa\_id inválido"}

## Golden checks — registrar cliente PF (post-cambio BE)

Se espera:

* sin persona.curp -> 400 "persona.curp es obligatorio"
* con curp pero fecha ISO (YYYY-MM-DD) -> 400 "persona.fecha\_nacimiento inválida (AAAAMMDD)"
* sin apellido materno -> 400 "persona.apellido\_materno es obligatorio"
* con curp + AAAAMMDD + apellido materno -> 201

## Golden checks — editar cliente

* PUT /api/cliente/clientes/:id con datos\_completos -> 200 ok:true
* Validar persistencia con GET posterior

## Incidentes comunes

* “Service Suspended” en Render:

  * Verifica BASE; el backend actual es https://scmvp-1jhq.onrender.com
  * El backend anterior https://scmvp.onrender.com está suspendido

## Variables (scripts/.env.local)

* BASE="https://scmvp-1jhq.onrender.com"
* EMAIL="admin@cumplimiento.com"
* EMPRESA\_ID\_FOR\_CHECK="32" (usado por mission.sh para /api/cliente/clientes)





🔁 Roundtrip contrato: validar POST registrar-cliente y GET clientes/:id con marcadores en datos\_completos.



📦 Body size limit: JSON >2MB debe responder HTTP 413 (confirmado).



🧪 Checks mínimos: POST con tipo\_cliente inválido / datos\_completos no objeto devuelve HTTP 400 (mensaje actual por contacto.pais).



🧭 Estrategia: validaciones profundas viven en FE; BE mantiene validaciones mínimas y protección de tamaño.



📝 Nota: mejora de mensajes específicos de validación queda fuera del bloqueo actual.

