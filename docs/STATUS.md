\## 2026-01-10

\- Checkpoint: mission OK en backend nuevo (Render)

\- BE: https://scmvp-1jhq.onrender.com

\- Nota: /api/cliente/clientes requiere empresa\_id para admin; mission usa EMPRESA\_ID\_FOR\_CHECK=32

\- Evidencia: docs/ops/mission/mission\_YYYYMMDD\_HHMMSS.txt

\- stable-20260110-01

-“⚠️ Seguridad: /api/admin/\_\_debug responde 200 sin auth (confirmado por curl). Pendiente proteger con middleware.” 

-“⚠️ Seguridad: /api/admin/\_\_debug está público (200 sin token); /api/admin/empresas sí requiere token (401). Pendiente proteger \_\_debug.







\## Semáforo (2025-12-21)

\- Auth/Login: ✅

\- Admin/Empresas: ✅

\- Clientes (listado): ✅

\- Clientes (crear): (pendiente)

\- Clientes (editar): (pendiente)

\- Permisos por rol: ✅ (según estado actual en prod)

\- Producción estable (Vercel/Render): ✅



\## Evidencia rápida

\- Última corrida mission: 2025-12-21 23:38:36

\- Log: docs/ops/mission/mission\_20251221\_233839.txt

\- Tag estable actual: stable-20251221-01





\## URLS

-Backend prod actual: https://scmvp-1jhq.onrender.com

-Backend viejo: https://scmvp.onrender.com (suspendido intencionalmente)

