# Changelog (Chat Sessions)


## 2025-12-21
- Hito: Estabilidad base en producción
- Incluye: Login OK; Admin (__debug, empresas) OK; Cliente (__debug, mis-clientes) OK usando Authorization: Bearer <token>
- Evidencia: docs/ops/mission/mission_20251221_233839.txt
- Tag: stable-20251221-01
- Próximo: completar/estabilizar Crear/Editar cliente + verificar permisos por rol end-to-end en UI


## 2026-01-09
- Cambio: migración de backend a Render service nuevo
- Backend actual: https://scmvp-1jhq.onrender.com
- Estado (en ese momento): Admin OK (200); Cliente endpoints 404 (no montados)
- Evidencia: docs/ops/mission/mission_20260109_181111.txt
- Próximo (en ese momento): restaurar montaje de clienteRoutes (/api/cliente) en backend nuevo y revalidar mission.sh


## 2026-01-11
- Hito: Contrato único de Cliente (PF/PM/FID) validado en PROD con evidencia
- Cambio BE (cliente):
  - PF: ahora requiere persona.curp (400 si falta)
  - PF: persona.fecha_nacimiento requiere AAAAMMDD (400 si ISO)
  - PF: persona.apellido_materno obligatorio (400 si falta)
  - FID: representante.fecha_nacimiento requiere AAAAMMDD
- Cambio FE (registrar cliente):
  - UI bloquea faltantes y alinea payload a datos_completos por tipo
  - PF: fecha se normaliza a AAAAMMDD antes de enviar
  - PF: apellido materno obligatorio (confirmado en Vercel)
- Editar cliente:
  - PUT /api/cliente/clientes/:id funciona (teléfono actualizado y persistido; evidencia GET/PUT/GET)
- Seguridad:
  - /api/admin/__debug protegido (401 sin token; 401 token basura)
- Evidencia:
  - Mission OK: docs/ops/mission/mission_20260110_182748.txt
  - Curls PF/FID/PUT ejecutados contra prod



## 2026-01-16
- FE: Botón “Generar / Imprimir” en detalle de cliente; impresión manual (se eliminó auto-print).
- FE: Fechas AAAAMMDD en PF y fechas de identificación.



## 2026-01-18
- Tag: stable-20260110-01
- Commit: 0559528
- Mission log: docs/ops/mission/mission_20260110_133004.txt
- gate: domicilio contacto obligatorio (400 sin contacto.domicilio.*)
- gate: RFC único por empresa (409 RFC repetido empresa_id=32)
- evidencia: 201 alta PF OK con domicilio + RFC nuevo (id=69, empresa_id=32)



## 2026-01-21

🆕 Validación de roundtrip: datos_completos persiste y retorna marcadores sin pérdida.

🆕 Protección de payload: límite JSON 2MB activo; oversize → HTTP 413.

⚠️ Validación mínima BE: casos inválidos retornan HTTP 400 con mensaje genérico por gate de contacto (pendiente de mejora).

🧭 Decisión confirmada: paradigma (1) — BE ligero, contrato fuerte en FE.

🔒 Sin cambios de secretos o credenciales.