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
- DB lógica actual: scmvp_xeu1
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




## 2026-01-17

- FE: Cliente Detalle incluye CTA “🖨️ Generar / Imprimir” y pantalla /cliente/clientes/[id]/imprimir con impresión manual (sin auto-print).
- Fechas: estandarizadas a AAAAMMDD para PF (fecha_nacimiento) e identificación (PF + representante PM).




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




## 2026-01-21

✅ Roundtrip datos_completos confirmado: POST registrar-cliente → GET clientes/:id conserva marcadores distribuidos por secciones.

✅ Persistencia estable de datos_completos (objetos anidados y claves no tipadas regresan intactas).

✅ Límite JSON activo (2MB): payload >2MB responde HTTP 413 (Payload Too Large).

⚠️ Validación mínima: tipo_cliente inválido / datos_completos no objeto → HTTP 400; mensaje cae en gate contacto.pais (mejora futura, no bloqueante).

🧭 Paradigma vigente: BE ligero + contrato fuerte en FE.




## Clientes v2
- Clientes v2 en cierre avanzado; Contrato Cliente v2 implementado en frontend con payload real y validación FE por tipo.
- PF: completado bloque de terceros / recursos de terceros con payload real y validación sin placeholders.
- PM: completados bloques de beneficiario controlador y accionista tercero / representante es accionista.
- Fideicomiso: completado payload `datos_completos.fideicomiso` + `datos_completos.representante`, validación FE y cierre de captura UI para campos obligatorios.
- Alineación UI vs contrato completada para `fideicomiso_nombre` y representante (`nombre_completo`, `rfc`, `curp`, `fecha_nacimiento`).
- Incidente DB de fideicomiso identificado y resuelto; inserción correcta confirmada en validación final.

### 2026-04-10 — Migración de base de datos / continuidad operativa

- Se realizó migración de PostgreSQL en Render por vencimiento del periodo de prueba de la instancia previa.
- Nueva DB lógica activa: scmvp.
- Backend/Webservice activo se mantiene en: https://scmvp-nxtj.onrender.com.
- La migración se resolvió sin cambios de código; se aplicó por backup/restore y actualización de infraestructura.
- Acciones realizadas:
  - backup SQL
  - restore SQL en nueva instancia
  - actualización de DATABASE_URL en Render
  - verificación/aseguramiento de columnas de compatibilidad en esquema
- Evidencia mínima validada:
  - POST /api/auth/login → HTTP 200
  - GET /api/admin/empresas con token → HTTP 200
  - GET /api/admin/empresas sin token → HTTP 401 {"error":"Token no proporcionado"}
- Verificación funcional adicional reportada por usuario:
  - frontend/UI carga módulos Usuarios / Empresas / Clientes
- Riesgos pendientes:
  - formalizar alineación estable de esquema para evitar drift
  - documentar procedimiento repetible
  - revisar rotación de credenciales si hubo exposición accidental

### 2026-05-10 — Migración de base de datos / continuidad operativa

- Se realizó nueva migración de PostgreSQL en Render por expiración del periodo trial de la instancia previa.
- Nueva DB lógica activa: scmvp_xeu1.
- Backend/Webservice activo vigente después de la migración: https://scmvp-1jhq.onrender.com.
- La migración se resolvió sin cambios de código; se aplicó por backup/restore y actualización de infraestructura.
- Acciones realizadas:
  - backup SQL
  - restore SQL en nueva instancia
  - actualización de DATABASE_URL en Render
  - actualización de NEXT_PUBLIC_API_BASE_URL en Vercel
  - validación de autenticación y endpoints protegidos
- Evidencia mínima validada:
  - GET /api/admin/empresas sin token → HTTP 401 {"error":"Token no proporcionado"}
  - POST /api/auth/login → HTTP 200
  - GET /api/admin/empresas con token → HTTP 200
- Verificación funcional adicional reportada por usuario:
  - frontend/UI carga módulos Usuarios / Empresas / Clientes
- Riesgos pendientes:
  - mantener actualizado el procedimiento repetible para futuras expiraciones de trial
  - revisar rotación de credenciales si hubo exposición accidental

### 2026-05-23 — CONTROL-DOC-01 / Estado estable post-D2

- Frente documental abierto para consolidar el estado estable del módulo Clientes posterior a D2.
- Main estable documentado:
  - merge D2: `3934929`
  - commit funcional D2: `6d9a074 fix(clientes): completar impresion pm base`
  - merge D1: `8398908`
  - commit funcional D1: `deccf4a fix(clientes): completar impresion pf base`
- Producción validada:
  - Frontend: Vercel Production Ready
  - Backend vigente: `https://scmvp-1jhq.onrender.com`
  - DB lógica vigente: `scmvp_xeu1`

Cierres recientes consolidados:
- B1/B2/B3 — Domicilio inteligente cerrado.
- C1 — Actividad económica / giro mercantil principales PF/PM cerrado.
- C2A — Recursos de terceros en editar cerrado.
- UX/TEXTO-01 — País de nacimiento / constitución en registrar cerrado.
- C2B-2A + F1 — relatedRecursos PF/PM en registrar cerrado.
- D1 + D1-F1 — Impresión PF base completa cerrada.
- D2 + D2-F1 — Impresión PM base completa cerrada.

Impresión:
- D1 imprime PF base completa con domicilio, actividad económica, recursos de terceros y sin JSON crudo.
- D2 imprime PM base completa con razón social, país de constitución, domicilio, representante legal, recursos de terceros y sin JSON crudo.
- D1-F1 y D2-F1 son solo visuales/imprimibles: casillas `[ ] Sí / [ ] No`, sin persistencia, sin backend y sin cambio de contrato.

Reglas funcionales vigentes:
- Tipo de Nacionalidad controla Nacionalidad.
- Nacionalidad gobierna CP / domicilio inteligente.
- País de nacimiento / constitución se selecciona manualmente y no gobierna CP.
- No existe campo “País del domicilio” separado.

Salvedades / diferidos:
- C2C accionista tercero PM diferido.
- C2D dueños/beneficiarios / relatedDuenos diferido.
- D3 FID no abierto.
- PF/BC condicionado no abierto.
- Domicilio inteligente en dueños/beneficiarios queda como criterio futuro, no abierto.
- Usuarios, empresas, carga masiva, perfil transaccional y grado de riesgo quedan para roadmap posterior.

Disciplina de Control:
- No depender solo de conversación, PRs o memoria.
- Después de hitos relevantes deben actualizarse documentos formales y decidir tag estable antes de abrir frentes mayores nuevos.
- Siguiente acción propuesta: tag estable post-D2, sin crearlo hasta autorización expresa de Control.

Propuesta de tag estable:
- Recomendado: `stable-clientes-d2-20260523`
- Alternativa: `stable-clientes-impresion-pf-pm-20260523`
## CONTROL-DOC-02 — Mini checkpoint QA post-D2 — 2026-05-25

Estado actual de `main`:
- `07c9e5f` — Merge pull request #12 / UX-TEXTO-02A.
- `c68816c` — `fix(clientes): alinear pais domicilio en registrar`.
- `b4fdcd2` — Merge pull request #11 / QA-REG-01-F1A.
- `5737584` — `fix(clientes): hidratar representante pm en editar`.
- Base documental previa:
  - `631ab98` — CONTROL-DOC-01.
  - Tag estable previo: `stable-clientes-d2-20260523`.

### QA-REG-01-F1A — Representante PM en editar
- Cerrado funcionalmente.
- PM cliente 63 validado:
  - representante legal hidrata correctamente;
  - nombre, apellidos, RFC, CURP y fecha de nacimiento visibles;
  - giro mercantil y razón social se conservan visibles.
- Regresión mínima validada:
  - PF cliente 67 conserva actividad económica;
  - cliente 66 conserva recursos SERVICIOS / COMERCIAL y `actividad_giro` string.
- No se guardaron ni modificaron datos.

### UX-TEXTO-02A — País en Domicilio (contacto)
- Cerrado funcionalmente.
- En registrar ya no aparece el label editable `País (domicilio)`.
- En Domicilio (contacto) se muestra `País` como campo solo lectura, derivado de Nacionalidad.
- Para Nacionalidad México muestra `México`.
- `contacto.pais` sigue correspondiendo a País de nacimiento / constitución.
- `contacto.domicilio.pais` se mantiene internamente derivado de Nacionalidad.
- Nacionalidad sigue gobernando CP / domicilio inteligente.
- País de nacimiento / constitución no gobierna CP.
- No se guardaron ni modificaron datos.

### Estado previo a U1
- U1 aún no abierto.
- D3 FID completo diferido.
- C2C accionista tercero PM diferido.
- C2D dueños/beneficiarios / relatedDuenos diferido.
- PF/BC condicionado no abierto.
- Usuarios, empresas, carga masiva y riesgo siguen fuera de este checkpoint.

Tag propuesto para estabilización posterior:
- `stable-clientes-qa-post-d2-20260525`

## Infraestructura vigente (actual)

- **Backend activo vigente:** https://scmvp-nxtj.onrender.com
- **Backend histórico/anterior (salvo evidencia posterior):** https://scmvp-1jhq.onrender.com
- **Base de datos vigente:** nueva instancia PostgreSQL en Render migrada el **2026-06-08**
  - **DB lógica destino:** **PENDIENTE** (nombre lógico pendiente de recuperar)
  - **DB lógica anterior:** `scmvp_xeu1`

### Variables tocadas (solo nombres)
- Backend (Render Webservice): `DATABASE_URL`
- Frontend (Vercel): `NEXT_PUBLIC_API_BASE_URL`

### Validación mínima
- `/api/admin/empresas` → 401 sin token, 200 con token.
- UI Vercel conectada correctamente (reportado).
