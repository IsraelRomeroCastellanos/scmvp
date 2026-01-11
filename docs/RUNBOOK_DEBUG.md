\# RUNBOOK — SCMVP Debug



\## Ejecutar Mission Check (WSL)

1\) source scripts/.env.local

2\) ./scripts/mission.sh

3\) unset PASSWORD



\## Golden checks (mínimos)

\- POST /api/auth/login -> token

\- GET /api/admin/\_\_debug -> 200 {"ok":true,"router":"admin"}

\- GET /api/admin/empresas -> 200 {"empresas":\[...]}

\- GET /api/cliente/clientes?empresa\_id=<id> -> 200 {"clientes":\[...]}

&nbsp; - Nota: para admin/consultor, si no se envía empresa\_id el BE puede responder 400: {"error":"empresa\_id inválido"}

\- “/api/admin/__debug debe fallar sin Authorization.”
\- “GET /api/admin/__debug debe regresar 401 sin token (si regresa 200, es regresión de seguridad).”



\## Incidentes comunes

\- “Service Suspended” en Render:

  - Verifica BASE; el backend actual es https://scmvp-1jhq.onrender.com

  - El backend anterior https://scmvp.onrender.com está suspendido



\## Variables (scripts/.env.local)

\- BASE="https://scmvp-1jhq.onrender.com"

\- EMAIL="admin@cumplimiento.com"

\- EMPRESA\_ID\_FOR\_CHECK="32" (usado por mission.sh para /api/cliente/clientes)


\## Aviso 10-01-2026

\- “Si curl da Token inválido (firma/secret), regenerar token contra el mismo BASE y evitar copiar token manualmente.”
\- “Si /api/admin/__debug responde 200 sin Authorization, el endpoint no está protegido o el middleware permite Bearer vacío; validar con curls A/B.”
