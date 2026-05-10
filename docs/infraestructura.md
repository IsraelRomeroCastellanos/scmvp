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
