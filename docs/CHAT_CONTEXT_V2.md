A) Estado global (10 bullets)
•	SCMVP está en operación con Frontend en Vercel y Backend en Render (compila y responde).
•	Backend PROD actual: https://scmvp-1jhq.onrender.com (el anterior https://scmvp.onrender.com está suspendido).
•	Se restauró BD nueva en Render desde un backup.sql (07-dic-2025); el proyecto volvió a funcionar tras ajustar restore por “role does not exist”.
•	Login + JWT ya estaban funcionando; tokens expiran (8h) y hay que regenerarlos con /api/auth/login.
•	Módulo Gestión de Clientes: listar, ver detalle, editar y registrar operan (PF/PM/Fideicomiso).
•	Fideicomiso ya se puede registrar en backend y se muestra detalle por secciones en frontend (confirmado en Vercel y con curl).
•	Catálogos locales JSON para país / actividad económica / giro mercantil ya cargan y se usan en UI.
•	UX de formulario: se implementó searchable dropdown (sin checkbox extra) para nacionalidad/país/actividad/giro.
•	Hubo un incidente de “desincronía” y un commit erróneo; se corrigió con git revert y quedó estable.
•	Pendiente fuerte: validaciones bloqueantes (onBlur + submit) por tipo de cliente (PF/PM/Fideicomiso) y consolidación de catálogos “oficiales vs internos”.
B) Arquitectura + URLs (FE/BE/DB/Auth/Deploy)
•	Frontend (Next.js / App Router): Vercel
o	URL FE: https://scmvp.vercel.app
o	Rutas clave FE:
	/login
	/cliente/registrar-cliente
	/cliente/clientes
	/cliente/clientes/[id]
	/cliente/editar-cliente/[id]
•	Backend (Node.js/Express + TypeScript): Render
o	URL BE PROD: https://scmvp-1jhq.onrender.com
o	URL BE anterior (suspendido): https://scmvp.onrender.com
•	DB: PostgreSQL en Render (nueva, restaurada con backup.sql del 07-dic-2025)
o	Tablas confirmadas en BD: usuarios, empresas, clientes, alertas, barridos_listas, matrices_riesgo, transacciones
•	Auth:
o	JWT HS256 (jsonwebtoken), expiresIn: '8h'
o	JWT_SECRET en variables de entorno de Render (se usó fingerprint en logs para debug)
•	Deploy:
o	FE: Vercel build (Next.js 14.x; hubo errores de types/imports que ya se corrigieron)
o	BE: Render tsc + node dist/server.js
•	Conexión BE→DB:
o	El backend usa process.env.DATABASE_URL (visto en backend/src/db.ts)
o	(pendiente) catálogo completo de variables env en Render/Vercel documentado formalmente
C) Módulos/épicas y estado ✅/⚠️/❌
•	Auth (login + token JWT): ✅
•	Admin / Empresas (listar empresas): ✅ (hubo error por columna entidad en restore viejo; ya corregido)
•	Clientes / Listado “Gestión de Clientes”: ✅
o	Selector por empresa apareció; decisión tomada: default = “Todas” (pendiente implementar/ajustar UI/estado) ⚠️
•	Clientes / Registrar PF: ✅
•	Clientes / Registrar PM: ✅
•	Clientes / Registrar Fideicomiso: ✅ (backend + FE + detalle por secciones)
•	Clientes / Ver detalle por secciones:
o	Fideicomiso: ✅
o	PF/PM: ⚠️ (hay tarjetas “Datos Generales” y “Contacto”; nivel final por secciones completo aún por cerrar)
•	Clientes / Editar: ✅ (guardando actividad_economica / giro_mercantil; validaciones todavía incompletas)
•	Catálogos (país/actividad/giro) en JSON + loader: ✅
o	Exactitud/fuente “SAT oficial” vs listas internas: ⚠️
•	Validaciones bloqueantes (onBlur + submit, FE+BE): ❌ (en curso; ya se acordó que sean bloqueantes y al vuelo)
D) Endpoints/contratos tocados recientemente
•	Auth
o	POST /api/auth/login → retorna { token, user }
	user incluye id, email, nombre_completo, rol, empresa_id
•	Admin
o	GET /api/admin/__debug (protegido) → {"ok":true,"router":"admin"}
o	GET /api/admin/empresas (protegido) → lista empresas
•	Clientes
o	GET /api/cliente/clientes (protegido) → lista (para “Gestión de Clientes”)
o	GET /api/cliente/mis-clientes (protegido) → lista filtrada (depende de empresa/rol; se estabilizó en distintos momentos)
o	GET /api/cliente/clientes/:id (protegido) → { cliente: {...} } con datos_completos por tipo
o	POST /api/cliente/registrar-cliente (protegido) → normalmente HTTP 201 y JSON tipo:
	{"ok":true,"cliente":{"id":...,"empresa_id":...,"nombre_entidad":...,"tipo_cliente":...}}
	Errores relevantes:
	409 “Cliente duplicado para esa empresa (empresa_id + nombre_entidad)”
	400 validaciones (ej. representante.nombre_completo es obligatorio en fideicomiso)
	500 “Error al registrar cliente” cuando revienta constraint/schema
o	PUT /api/cliente/clientes/:id (protegido) → {"ok":true,"cliente":{...}} (confirmado con 200 en pruebas)
E) Cambios recientes (últimos 10–20) con archivos y motivo
•	frontend/src/app/cliente/registrar-cliente/page.tsx
o	Integración de PF/PM/Fideicomiso en un solo flujo
o	UX: dropdown con búsqueda (searchable) para catálogos
o	Redirección post-registro a detalle /cliente/clientes/[id]
•	frontend/src/app/cliente/clientes/page.tsx
o	Listado y manejo de empresa seleccionada (apareció selector por empresa)
o	Manejo de errores de carga (400/401) y token
•	frontend/src/app/cliente/clientes/[id]/page.tsx
o	Vista de detalle (tarjetas y/o secciones); fideicomiso con sección específica
•	frontend/src/app/cliente/editar-cliente/[id]/page.tsx
o	Edición y persistencia de campos como actividad_economica/giro_mercantil
•	frontend/src/lib/catalogos.ts
o	Loader loadCatalogo(path) y normalización de URL /catalogos/...
o	Exportaciones auxiliares (loadPaises/loadActividades/loadGiro)
•	frontend/public/catalogos/sat/c_pais.json + frontend/public/catalogos/sat/c_actividad_economica.json + frontend/public/catalogos/sat/index.json
o	Catálogos JSON usados por UI
•	frontend/public/catalogos/internos/giro_mercantil.json + frontend/public/catalogos/internos/index.json
o	Catálogo interno para PM
•	backend/src/routes/cliente.routes.ts
o	Soporte de tipo_cliente incluyendo fideicomiso
o	Validaciones mínimas (en iteraciones) y manejo de errores 409/400/500
•	backend/src/routes/auth.routes.ts
o	Login, firma JWT con JWT_SECRET, expiración 8h, logs de debug (fingerprint)
•	backend/src/middleware/auth.middleware.ts
o	authenticate (export nombrado; hubo error por “no default export” y se corrigió)
o	Tipado de roles (se presentó error TS por union "admin" | "consultor" | "cliente")
•	docs/* (seguimiento interno)
o	Se agregaron runbooks/contextos (commit “checkpoint estable” previo)
•	GIT/Tags relevantes observados en la conversación:
o	stable-20251228-02 (commit a04398b... “checkpoint estable 20251228-02”)
o	stable-20260101-01 tag en commit 12d0763... (“detalle por secciones para fideicomiso”)
o	ccc4df4... “fix(frontend): export loadCatalogo”
o	4008b32... “fix(nav): registrar cliente points to /cliente/registrar-cliente”
o	Revert aplicado: 735c8fe... Revert “chore(debug): add cliente __debug” (sin force)
F) Bugs/pendientes actuales + hipótesis
•	Selector de empresa en Gestión de Clientes
o	Requerimiento: Default = Todas
o	Hipótesis: el selector se introdujo para resolver admin sin empresa_id; falta estado “todas” (sin filtrar o con fetch agregado por empresa) y persistencia UI
•	Validaciones bloqueantes FE+BE (PF/PM/Fideicomiso)
o	Estado: en curso; ya hay validaciones puntuales en fideicomiso (ej. representante obligatorio)
o	Hipótesis: se requiere “contrato único” (schema) para evitar 500 por inconsistencias DB/constraints
•	Catálogos (Actividad Económica / País / Giro)
o	Riesgo: datos no oficiales o estructura no final; puede provocar retrabajo en UI/validaciones
o	Hipótesis: definir fuente y formato final clave/descripcion por campo y congelarlo
•	Errores recurrentes de WSL/curl “TOKEN_LEN=0 / Token no proporcionado”
o	Causa frecuente: el JSON de login se pegó/ejecutó como comando, o el parseo python leyó vacío (BYTES=0)
o	Solución: usar script WSL-safe consistente (ver plan) y validar LOGIN_BYTES>0
•	Riesgo DB/schema vs código
o	Ya se vio: columnas faltantes (entidad) tras restore viejo; se corrigió.
o	Hipótesis: faltan migraciones versionadas; urge formalizar migración/seed.
G) Próximo plan (5–10 pasos)
1.	Estabilizar “Gestión de Clientes” con Default=Todas (admin) sin romper “mis-clientes” (rol cliente/consultor).
2.	Definir y documentar contrato de payload por tipo: PF/PM/Fideicomiso (campos mínimos + opcionales).
3.	Implementar validaciones bloqueantes FE (onBlur + submit) alineadas con BE (misma regla).
4.	En BE, convertir 500 genérico en errores claros: 400 con mensaje por campo cuando sea validación; 409 para duplicado.
5.	Añadir (o consolidar) “runbook” para tokens: script WSL-safe para login + pruebas endpoints.
6.	Congelar formato de catálogos ({clave, descripcion}) y decidir cuáles son SAT vs internos (Actividad Económica vs Giro).
7.	Formalizar migraciones (o SQL incremental) para DB nueva + seed mínimo (admin + 1 empresa + catálogos base).
8.	Checkpoint estable: tag nuevo (ej. stable-YYYYMMDD-01) y smoke tests (login, admin empresas, listar clientes, registrar PF/PM/Fideicomiso, detalle).
H) Bootstrap 10 líneas para iniciar chat nuevo en Proyectos
1.	Proyecto: SCMVP (FE Next.js en Vercel, BE Express+TS en Render, DB Postgres Render).
2.	FE URL: https://scmvp.vercel.app
3.	BE PROD actual: https://scmvp-1jhq.onrender.com (anterior scmvp.onrender.com suspendido).
4.	Auth JWT HS256 con JWT_SECRET, expira 8h; login POST /api/auth/login → {token,user}.
5.	Módulo Clientes: registrar PF/PM/Fideicomiso, listar, ver detalle, editar; fideicomiso ya opera end-to-end.
6.	Catálogos JSON en frontend/public/catalogos/{sat,internos}/*.json + loader loadCatalogo(path) en frontend/src/lib/catalogos.ts.
7.	UI: registrar-cliente usa searchable dropdown para nacionalidad/país/actividad/giro.
8.	Gestión de Clientes muestra selector de empresa; requerimiento: default “Todas”.
9.	Pendiente principal: validaciones bloqueantes FE+BE por tipo (onBlur + submit) y contrato de payload unificado.
10.	Regla: no inventar datos; secretos/tokens/passwords siempre REDACTED; entregar siempre archivos completos al proponer cambios.

