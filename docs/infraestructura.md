## Checkpoint de infraestructura operativa — 2026-08-06

- Backend vigente: https://scmvp-nxtj.onrender.com
- DB lógica vigente: `scmvp_q69o`.
- `scmvp-1jhq.onrender.com` y `scmvp_0plk` quedan clasificados como infraestructura histórica/anterior.
- Este cambio documental no acredita por sí mismo que las migraciones 002 o 003 hayan sido ejecutadas.
- La migración 002 continúa documentada como no autorizada y no ejecutada en producción, salvo evidencia posterior expresa.

### 2026-05-10 — Migración de PostgreSQL (Render)

*Motivo*
- Expiración del periodo de prueba de la instancia PostgreSQL previa en Render.

*Origen / destino*
- Origen: Render PostgreSQL (instancia trial previa)
- Destino: Render PostgreSQL (nueva instancia en otra cuenta)

*DB lógica*
- Nueva DB lógica activa: scmvp_xeu1

*Backend activo vigente después de la migración*
- https://scmvp-1jhq.onrender.com

*Cambios aplicados*
- backup SQL desde entorno anterior
- restore SQL en nueva DB
- actualización de DATABASE_URL en el webservice Render
- actualización de NEXT_PUBLIC_API_BASE_URL en Vercel
- validación de autenticación y endpoints protegidos
- sin ajustes de esquema requeridos en esta iteración

*Cambios de código*
- No hubo cambios de código para esta migración

*Validación mínima*
- GET /api/admin/empresas sin token → HTTP 401
- POST /api/auth/login → HTTP 200
- GET /api/admin/empresas con token → HTTP 200
- UI en Vercel validada con carga de módulos Usuarios / Empresas / Clientes

*Riesgos / pendientes*
- No se observó drift de esquema en esta iteración
- Pendiente mantener runbook repetible para futuras expiraciones de trial
- Recomendable rotación de credenciales si hubo exposición accidental


### 2026-04-10 — Migración de PostgreSQL (Render)

*Motivo*
- Expiración del periodo de prueba de la instancia PostgreSQL previa en Render.

*Origen / destino*
- Origen: Render PostgreSQL (instancia previa en trial)
- Destino: Render PostgreSQL (nueva instancia en otra cuenta)

*DB lógica*
- Nueva DB lógica activa: scmvp

*Backend activo*
- https://scmvp-nxtj.onrender.com

*Cambios aplicados*
- backup SQL desde entorno anterior
- restore SQL en nueva DB
- actualización de DATABASE_URL en el webservice
- verificación/aseguramiento de columnas de compatibilidad en esquema
- filtrado previo del SQL para remover \restrict, \unrestrict y bloques de ALTER DEFAULT PRIVILEGES antes del restore

*Cambios de código*
- No hubo cambios de código para esta migración

*Validación mínima*
- POST /api/auth/login → HTTP 200
- GET /api/admin/empresas con token → HTTP 200
- GET /api/admin/empresas sin token → HTTP 401

*Riesgos / pendientes*
- Persistencia de drift de esquema mitigada parcialmente con columnas de compatibilidad
- Pendiente formalizar migraciones/alineación estable de esquema
- Recomendable rotación de credenciales si hubo exposición accidental

## Migración DB 2026-06-08 (Render PostgreSQL)

- **Motivo:** vencimiento inminente del periodo trial de PostgreSQL en Render.
- **Origen:** Render.com PostgreSQL (trial)
  - **DB lógica anterior:** `scmvp_xeu1`
- **Destino:** Render.com PostgreSQL (nueva instancia en otra cuenta)
  - **DB lógica destino:** **PENDIENTE** (nombre lógico pendiente de recuperar)
- **Backend vigente actual (validado):** https://scmvp-nxtj.onrender.com
- **Backend anterior/histórico (salvo evidencia posterior):** https://scmvp-1jhq.onrender.com

### Cambios ejecutados (infra)
- Backup SQL: **sí**
  - Archivo generado: `scmvp_20260608_003123.sql`
- Restore SQL: **sí**
  - Desde `*.render_ready.sql`
  - Se removieron antes del restore:
    - `\restrict`
    - `\unrestrict`
    - `ALTER DEFAULT PRIVILEGES`
- Render Webservice:
  - `DATABASE_URL` actualizado
  - Redeploy ejecutado
- Frontend/Vercel:
  - env vars actualizadas; redeploy; UI conectada correctamente (reportado)
- External Database URL:
  - usado para restauración desde WSL/local
- Internal Database URL:
  - no aplica fuera de Render

### Validaciones mínimas
- `GET /api/admin/empresas` sin token → **401**
- `POST /api/auth/login` → **200** con token
- `GET /api/admin/empresas` con token → **200**
- UI Vercel → conectada correctamente (reportado)

### Cambios NO ejecutados
- Sin cambios de código.
- Sin ajustes de esquema adicionales.

## Estado vigente validado — 2026-06-10

Backend vigente:
- https://scmvp-nxtj.onrender.com

Frontend Production:
- https://scmvp.vercel.app

Backend histórico:
- https://scmvp-1jhq.onrender.com

Último checkpoint funcional integrado:
- U1E-FE1
- commit funcional: `a67ea53`
- merge main: `583ec5d`

<!-- DOCS-DB-RENDER-MIGRATION-20260707:start -->
## Migración DB Render 2026-07-07

### Estado vigente

- Fecha operativa: 2026-07-07.
- Zona horaria de referencia: America/Mexico_City.
- Resultado: migración cerrada funcionalmente.
- Frontend Production vigente: https://scmvp.vercel.app.
- Backend vigente: https://scmvp-1jhq.onrender.com.
- DB vigente en Render PostgreSQL: scmvp_0plk.
- Variable pública frontend esperada: NEXT_PUBLIC_API_BASE_URL=https://scmvp-1jhq.onrender.com.

### Motivo

La migración se ejecutó por vencimiento de periodo/prueba en Render y por la necesidad de conservar continuidad operativa del sistema SCMVP con una nueva base PostgreSQL vigente.

### Origen y destino

- DB origen:
  - Render PostgreSQL.
  - Nombre lógico documentado: scmvp_db.
  - External Database URL validada desde WSL.
- DB destino vigente:
  - Render PostgreSQL.
  - Nombre lógico: scmvp_0plk.
  - Conexión validada con current_database() y now().

### Backups generados

- scmvp_20260707_134630.sql.
- scmvp_20260707_134641.dump.
- scmvp_20260707_134630.render_ready.sql.

### Conteos validados

Baseline previo:

- empresas: 17.
- usuarios: 24.
- clientes: 95.

Post-restore:

- empresas: 17.
- usuarios: 24.
- clientes: 95.

### Restore

- Restore sin errores bloqueantes.
- COPY 95 clientes.
- COPY 17 empresas.
- COPY 24 usuarios.
- Cambios de esquema adicionales: no.
- Cambios de código: no.

### Validaciones operativas

- GET /api/admin/empresas sin token devuelve 401 Token no proporcionado.
- Login admin válido emite token.
- GET /api/admin/empresas con token devuelve HTTP 200.
- Validación UI/API:
  - GET https://scmvp-1jhq.onrender.com/api/cliente/clientes?empresa_id=5.
  - Resultado: 200 OK.

### Seguridad

- No documentar DATABASE_URL.
- No documentar passwords.
- No documentar tokens.
- No documentar cadenas de conexión completas.
- Si alguna credencial fue pegada en terminal o historial, rotar credenciales.
<!-- DOCS-DB-RENDER-MIGRATION-20260707:end -->
