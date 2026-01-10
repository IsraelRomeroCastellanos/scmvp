\# RUNBOOK — SCMVP Debug



\## Ejecutar Mission Check (WSL)

1\) source scripts/.env.local

2\) ./scripts/mission.sh

3\) unset PASSWORD



\## Golden checks (mínimos)

\- POST /api/auth/login -> token

\- GET /api/admin/\_\_debug -> 200 {"ok":true,"router":"admin"}

\- GET /api/admin/empresas -> 200 {"empresas":\[...]}

\- GET /api/cliente/mis-clientes -> esperado 200 {"clientes":\[...]} (ACTUALMENTE 404 en backend nuevo)



\## Incidentes comunes

\- “Service Suspended” en Render:

&nbsp; - Verifica BASE; el backend actual es https://scmvp-1jhq.onrender.com

&nbsp; - El backend anterior https://scmvp.onrender.com está suspendido



