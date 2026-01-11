\# Changelog (Chat Sessions)



\## 2025-12-19

\- Goal:

\- Changes made:

  -

\- Tests run:

  -

\- Result:

\- Next step:



\## 2025-12-XX

\- ...



\## 2025-12-21

\- Hito: Estabilidad base en producción

\- Incluye: Login OK; Admin (\_\_debug, empresas) OK; Cliente (\_\_debug, mis-clientes) OK usando Authorization: Bearer <token>

\- Evidencia: docs/ops/mission/mission\_20251221\_233839.txt

\- Tag: stable-20251221-01

\- Próximo: completar/estabilizar Crear/Editar cliente + verificar permisos por rol end-to-end en UI

## 2025-12-21
- Hito: Estabilidad base en producción
- Evidencia: mission.sh OK para Auth + Admin + Clientes (Bearer)
- Tag: stable-20251221-01
- Referencia: docs/ops/mission/mission_20251221_233839.txt




## 2025-12-04
- Cambio: Backend base migrado en Render
- Antes: https://scmvp.onrender.com (servicio suspendido)
- Ahora: https://scmvp-1jhq.onrender.com
- Motivo: BD anterior vencida; se migró a nueva BD y nuevo servicio
- Evidencia: docs/ops/mission/mission_YYYYMMDD_HHMMSS.txt



## 2026-01-09
- Cambio: migración de backend a Render service nuevo
- Backend actual: https://scmvp-1jhq.onrender.com
- Estado: Admin OK (200); Cliente endpoints 404 (no montados)
- Evidencia: docs/ops/mission/mission_20260109_181111.txt
- Próximo: restaurar montaje de clienteRoutes (/api/cliente) en backend nuevo y revalidar mission.sh

## 2026-01-10
- TAG stable-20260110-01
- Hito: Revalidación mission en backend actual
- Evidencia: docs/ops/mission/mission_20260110_132940.txt
- Resultado: Auth + Admin + Clientes OK
- Próximo: continuar solo con evidencia previa (mission/curl) antes de cambios mayores
- “curl manual falló por token firma/secret; usar patrón mission.sh.”
- “Detectada inconsistencia: docs dicen /api/admin/__debug protegido, pero curl devolvió 200 con TOKEN_LEN=0; pendiente validar protección (sin auth / token basura) y corregir si aplica.”
- “2026-01-10: Evidencia de endpoint admin debug expuesto (sin token y token basura → 200). Próximo: proteger ruta y revalidar con curls + mission.”
- “2026-01-10: Evidencia de exposición de /api/admin/__debug (200 sin auth). Próximo: aplicar middleware y revalidar con curls + mission.”
