## 2026-01-17

- FE: Cliente Detalle incluye CTA “🖨️ Generar / Imprimir” y pantalla /cliente/clientes/[id]/imprimir con impresión manual (sin auto-print).
- Fechas: estandarizadas a AAAAMMDD para PF (fecha_nacimiento) e identificación (PF + representante PM).


## 2026-01-11

- Checkpoint: Contrato único de Cliente estabilizado (PF/PM/FID) + evidencia en PROD
- BE (prod): https://scmvp-1jhq.onrender.com
- FE (prod): (pendiente: URL de Vercel)
- Nota: Para admin, endpoints de clientes requieren empresa_id explícito (ej. 32)

### Evidencia (curls)
- PF:
  - 400: persona.curp es obligatorio
  - 400: persona.fecha_nacimiento inválida (AAAAMMDD)
  - 400: persona.apellido_materno es obligatorio
  - 201: PF OK (ej. cliente id=61)
- Fideicomiso:
  - representante.fecha_nacimiento requiere formato AAAAMMDD (confirmado)
  - 201: FID OK (ej. cliente id=58)
- Seguridad:
  - GET /api/admin/__debug -> 401 sin token; 401 token basura

### Mission
- Última corrida mission: 2026-01-10 (Overall: OK)
- Log: docs/ops/mission/mission_20260110_182748.txt

---

## Semáforo

- Auth/Login: ✅
- Admin/Empresas: ✅
- Seguridad /api/admin/__debug: ✅ (protegido)
- Clientes (listado): ✅ (GET /api/cliente/clientes?empresa_id=32)
- Clientes (crear): ✅ (POST /api/cliente/registrar-cliente)
- Clientes (editar): ✅ (PUT /api/cliente/clientes/:id)
- Contrato único de cliente (docs/contratos): ✅
- Producción estable (Vercel/Render): ✅

---

## URLs

- Backend prod actual: https://scmvp-1jhq.onrender.com
- Backend viejo: https://scmvp.onrender.com (suspendido intencionalmente)





## Checkpoint — Estabilidad Clientes (Contrato Único)

- Tag: stable-20260110-01
- Estado: Backend + Frontend estables para módulo Clientes.
- Alcance:
  - Contrato único implementado y validado (PF / PM / Fideicomiso).
  - POST / PUT / GET clientes operativos.
  - PUT parcial endurecido con deepMerge.
  - UI de registro, detalle, edición y listado validada en Vercel.

### Evidencia / Referencias
- Tag: stable-20260110-01
- Mission log: docs/ops/mission/mission_20260110_182748.txt
- Contrato único (def.): payload normalizado por tipo_cliente con campos obligatorios y opcionales; validación equivalente en FE y BE.
- Admin sin empresa_id: 400 (decisión vigente). FE maneja “Todas” mediante llamadas por empresa, no con empresa_id vacío.
- Roles smoke:
  - Admin: lista por empresa / todas ✅
  - Consultor: lista por empresa / todas ✅
  - Cliente: acceso a sus clientes / su empresa ✅
- PUT parcial: FE no envía vacíos; BE rechaza null/"" en campos obligatorios; deepMerge preserva valores existentes.



### Gate RFC único por empresa (Clientes)
- DB: columna `clientes.rfc_principal` + índice único parcial `idx_clientes_empresa_rfc_principal` (empresa_id, rfc_principal).
- BE: al registrar/editar, extrae RFC según tipo_cliente (PF persona.rfc / PM empresa.rfc) y bloquea duplicados.
- Evidencia (2026-01-16): POST RFC nuevo → 201; POST RFC duplicado (misma empresa) → 409 "RFC ya existe en el registro".




## Checkpoints

### 2026-01-18
- Tag: stable-20260110-01
- Commit: 0559528
- Mission log: docs/ops/mission/mission_20260110_133004.txt
- Contrato único (def.): payload normalizado por tipo_cliente con obligatorios/optativos; FE+BE validan igual
- Admin sin empresa_id: 400 requerido; FE siempre envía empresa o maneja “Todas” internamente
- Roles smoke: admin ✅ / consultor ✅ / cliente ✅
- PUT parcial: FE no manda vacíos; BE rechaza null/"" en obligatorios; deepMerge preserva
- Notas:
  - gate: domicilio contacto obligatorio (400 sin contacto.domicilio.*)
  - gate: RFC único por empresa (409 RFC repetido empresa_id=32)
  - evidencia: 201 alta PF OK con domicilio + RFC nuevo (id=69, empresa_id=32)
