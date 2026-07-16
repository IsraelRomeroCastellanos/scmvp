# MAP-001 — Mapa técnico del sistema SHIELD by Vission

> Auditoría estática local, 2026-07-16. Estados de evidencia: **CONFIRMADO**, **INFERIDO**, **NO LOCALIZADO**, **REQUIERE VALIDACIÓN**. No se consultó Production ni archivos de secretos.

## 1. Resumen del sistema actual

Monorepositorio práctico con frontend Next.js, API Express y PostgreSQL. Autenticación JWT Bearer, sesión duplicada en cookie/localStorage y autorización por `admin`, `consultor` y `cliente`. El núcleo de clientes (listar, consultar, registrar, editar e imprimir) está conectado; empresas y carga masiva están incompletos; Riesgo y Perfil Transaccional son demos locales.

Contradicciones: la documentación declara Next.js 14 (`docs/PROJECT_CONTEXT.md`), pero el manifiesto fija Next.js 15.5.20 (`frontend/package.json`). La documentación menciona `db/`, backups y `docs/SCMVP_BOOTSTRAP_ACTUAL_2026-06-01.md`, pero no están localizados en el árbol visible actual. `docs/GAP_MAP_01.md` acredita `/test-css` pública en la auditoría 2026-06-29; su archivo ya no está localizado en `frontend/src/app/`.

## 2. Estructura real del repositorio

```text
/
├── backend/src/{middleware,routes,services,types,utils}
├── frontend/public/{brand,catalogos}
├── frontend/src/{app,components,demo-evaluaciones,lib}
├── docs/{contratos,ops,sat,mvp-map}
├── scripts/
├── crear_tablas.sql
└── package.json + frontend/package.json + backend/package.json
```

Evidencia: `backend/src/app.ts`, `frontend/src/app/`, `frontend/public/catalogos/`, `docs/`, `scripts/`. **NO LOCALIZADO:** directorio `db/` citado por documentación.

## 3. Stack confirmado

| Capa | Hallazgo | Estado | Evidencia |
|---|---|---|---|
| Frontend | Next.js 15.5.20, React 19.2.7, App Router, TypeScript, Tailwind 3 | CONFIRMADO | `frontend/package.json`; `frontend/src/app/`; `frontend/tailwind.config.ts` |
| Backend | Node.js, Express 4.22.1, TypeScript | CONFIRMADO | `backend/package.json`; `backend/src/app.ts` |
| Persistencia | PostgreSQL vía `pg` Pool | CONFIRMADO | `backend/src/db.ts` |
| Auth | JWT Bearer + bcryptjs | CONFIRMADO | `backend/src/routes/auth.routes.ts`; `backend/src/middleware/auth.middleware.ts` |
| Despliegue | Vercel frontend; Render backend/DB | CONFIRMADO documental / REQUIERE VALIDACIÓN operativa | `docs/STATUS.md`; `docs/infraestructura.md` |

## 4. Mapa general del flujo

`frontend/src/app/**/page.tsx` → `fetch` o `frontend/src/lib/api.ts` → `NEXT_PUBLIC_API_BASE_URL` / rewrite → `backend/src/app.ts` → router `auth|admin|cliente` → middleware JWT/rol/empresa → consultas `pg` → PostgreSQL.

## 5. Mapa por módulo

## MAP-01 — Autenticación y sesión

Estado: **IMPLEMENTADO**.

| Elemento | Ruta o hallazgo | Estado | Evidencia |
|---|---|---|---|
| Pantalla/componente | `/login`; página cliente | CONFIRMADO | `frontend/src/app/login/page.tsx` |
| HTTP/endpoint | `POST /api/auth/login` | CONFIRMADO | `frontend/src/app/login/page.tsx:38`; `backend/src/routes/auth.routes.ts:15` |
| Servicio/validación | bcrypt, firma JWT 8h; email/password obligatorios; usuario activo | CONFIRMADO | `backend/src/routes/auth.routes.ts` |
| Persistencia | SELECT `usuarios`; lectura | CONFIRMADO | `backend/src/routes/auth.routes.ts:25` |
| Sesión/roles | token y user en localStorage/cookies; roles admin/consultor/cliente | CONFIRMADO | `frontend/src/lib/auth.ts`; `frontend/src/middleware.ts` |
| Variables | `JWT_SECRET`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_BACKEND_URL` | CONFIRMADO | archivos anteriores |

Cadena técnica: `/login` → `LoginPage` → `fetch` → `POST /api/auth/login` → `auth.routes.ts` → bcrypt/JWT + SELECT → `usuarios`.

Dependencias:

| Depende de | Impacta a | Riesgo |
|---|---|---|
| JWT_SECRET, DB, cookies/localStorage | Todos los módulos protegidos | Alto: sesión distribuida y URLs fallback distintas |

Corrección:

| Qué falta | Primer archivo a revisar | Prueba mínima necesaria |
|---|---|---|
| Unificar estrategia de sesión solo si entra al ticket; no hay brecha MVP explícita | `frontend/src/app/login/page.tsx` | login válido/inválido/inactivo; expiración; 401 |

## MAP-02 — Dashboard

Estado: **INCONSISTENTE**.

| Elemento | Ruta o hallazgo | Estado | Evidencia |
|---|---|---|---|
| Pantalla | `/dashboard`; métricas, actividad y servicios simulados | CONFIRMADO | `frontend/src/app/dashboard/page.tsx:48` |
| HTTP/backend/DB | No realiza llamada; endpoint y tablas operativas no localizados | NO LOCALIZADO | `frontend/src/app/dashboard/page.tsx`; `backend/src/routes/` |
| Roles | middleware permite cualquier rol, página redirige consultor/cliente | INCONSISTENTE | `frontend/src/middleware.ts:8`; `frontend/src/app/dashboard/page.tsx:35` |
| Brecha/prueba | GAP-07 P0; contención visual | CONFIRMADO | `docs/GAP_MAP_01.md:142` |

Cadena técnica: `/dashboard` → `Dashboard` → **NO LOCALIZADO** → **NO LOCALIZADO** → **NO LOCALIZADO** → objeto `mockData` en memoria.

Dependencias:

| Depende de | Impacta a | Riesgo |
|---|---|---|
| Decisión contención vs. página institucional | Inicio autenticado y página pública | Alto: información engañosa |

Corrección:

| Qué falta | Primer archivo a revisar | Prueba mínima necesaria |
|---|---|---|
| Retirar/rotular datos simulados | `frontend/src/app/dashboard/page.tsx` | roles, ausencia de cifras/estados falsos, responsive |

## MAP-03 — Usuarios

Estado: **IMPLEMENTADO**.

| Elemento | Ruta o hallazgo | Estado | Evidencia |
|---|---|---|---|
| Pantallas | listado, crear, detalle y editar bajo `/admin/usuarios` | CONFIRMADO | `frontend/src/app/admin/usuarios/` |
| Endpoints | GET/POST `/usuarios`; PATCH `/usuarios/:id`; PATCH `/usuarios/:id/activo` | CONFIRMADO | `backend/src/routes/admin.routes.ts` |
| Validaciones | email, password ≥8, rol, empresa cliente, autorrestricciones | CONFIRMADO | `backend/src/routes/admin.routes.ts:54` |
| DB/roles | SELECT/INSERT/UPDATE `usuarios`; consulta `empresas`; solo admin | CONFIRMADO | `backend/src/routes/admin.routes.ts` |
| Pruebas | suite automatizada no localizada; regresión documental 27/27 | PARCIAL | `docs/STATUS.md` |

Cadena técnica: `/admin/usuarios*` → páginas de usuarios → `fetch` → `/api/admin/usuarios*` → `admin.routes.ts` → bcrypt/consultas → `usuarios`, `empresas`.

Dependencias:

| Depende de | Impacta a | Riesgo |
|---|---|---|
| Auth, empresas | Accesos de todo el sistema | Alto: rol o empresa incorrectos |

Corrección:

| Qué falta | Primer archivo a revisar | Prueba mínima necesaria |
|---|---|---|
| Sin brecha MVP específica; conservar regresión | `backend/src/routes/admin.routes.ts` | CRUD mínimo, 401/403, auto-desactivación bloqueada |

## MAP-04 — Empresas

Estado: **PARCIAL**.

| Elemento | Ruta o hallazgo | Estado | Evidencia |
|---|---|---|---|
| Pantallas | listar/crear/editar | CONFIRMADO | `frontend/src/app/admin/{empresas,crear-empresa,editar-empresa}` |
| HTTP esperado | GET/POST `/api/admin/empresas`; GET/PUT individual | PARCIAL | páginas anteriores |
| Backend real | solo `GET /api/admin/empresas` | CONFIRMADO | `backend/src/routes/admin.routes.ts:348` |
| DB/roles | SELECT `empresas`; admin+consultor lectura; escrituras no localizadas | PARCIAL | `backend/src/routes/admin.routes.ts` |
| Brecha | GAP-03 P0; bloquea identidad/impresión | CONFIRMADO | `docs/GAP_MAP_01.md` |

Cadena técnica: `/admin/empresas` → `EmpresasPage` → fetch → `GET /api/admin/empresas` → `admin.routes.ts` → SELECT → `empresas`. Alta/edición → fetch → endpoints → **NO LOCALIZADO** → **NO LOCALIZADO** → `empresas` inferida.

Dependencias:

| Depende de | Impacta a | Riesgo |
|---|---|---|
| Contrato/modelo empresas y auth | Usuarios, clientes, impresión | Alto: `empresa_id` transversal |

Corrección:

| Qué falta | Primer archivo a revisar | Prueba mínima necesaria |
|---|---|---|
| POST, GET individual, PUT/PATCH y validaciones | `backend/src/routes/admin.routes.ts` | alta/edición/listado; RFC duplicado; 401/403 |

## MAP-05 — Clientes: listado y consulta

Estado: **IMPLEMENTADO**.

| Elemento | Ruta o hallazgo | Estado | Evidencia |
|---|---|---|---|
| Pantallas | `/cliente/clientes`, detalle `[id]`; legacy `/clientes` redirige | CONFIRMADO | `frontend/src/app/cliente/clientes/`; `frontend/src/app/clientes/page.tsx` |
| Endpoints | GET `/api/cliente/clientes?empresa_id=` y GET `/:id` | CONFIRMADO | `backend/src/routes/cliente.routes.ts:1273` |
| DB | SELECT `clientes`; materializa relacionados/BC desde tablas hijas | CONFIRMADO | `backend/src/routes/cliente.routes.ts:1079,1273` |
| Roles/alcance | admin/consultor; cliente limitado por empresa | CONFIRMADO | `frontend/src/app/cliente/clientes/page.tsx`; `cliente.routes.ts:30` |
| Brecha | detalle conserva campos obsoletos/técnicos | CONFIRMADO | `docs/GAP_MAP_01.md` GAP-05 |

Cadena técnica: `/cliente/clientes*` → páginas listado/detalle → `apiGet`/fetch → GET `/api/cliente/clientes*` → `cliente.routes.ts` → SELECT/materialización → `clientes`, `cliente_relacionados`, tablas hijas legacy.

Dependencias:

| Depende de | Impacta a | Riesgo |
|---|---|---|
| Auth/empresa, contrato JSONB | edición, impresión, evaluaciones | Alto: fuga entre empresas |

Corrección:

| Qué falta | Primer archivo a revisar | Prueba mínima necesaria |
|---|---|---|
| Depurar campos sin borrar históricos | `frontend/src/app/cliente/clientes/[id]/page.tsx` | alcance por rol/empresa y PF/PM/FID |

## MAP-06 — Registro de clientes PF

Estado: **IMPLEMENTADO** con brechas UX/datos.

| Elemento | Ruta o hallazgo | Estado | Evidencia |
|---|---|---|---|
| Pantalla/componentes | `/cliente/registrar-cliente`; `ClientPage` | CONFIRMADO | `frontend/src/app/cliente/registrar-cliente/` |
| Validación | formulario + BC; archivo `validate.ts` contiene scaffolding no operativo y validación BC real | INCONSISTENTE | `validate.ts:20`; `ClientPage.tsx` |
| Endpoint/DB | POST `/registrar-cliente`; INSERT `clientes` y tablas relacionadas | CONFIRMADO | `cliente.routes.ts:1335` |
| Roles | admin, cliente; empresa validada | CONFIRMADO | `cliente.routes.ts:1335`; `frontend/src/middleware.ts` |
| Brechas | BC PF responsive, CP nacional y campos | CONFIRMADO | GAP-01/02/05 |

Cadena técnica: `/cliente/registrar-cliente` → `ClientPage` → fetch → POST `/api/cliente/registrar-cliente` → `cliente.routes.ts` → validación/transacción → `clientes`, `cliente_relacionados`, `cliente_recursos_terceros`.

Dependencias:

| Depende de | Impacta a | Riesgo |
|---|---|---|
| catálogos, BC, auth/empresa | listado, edición, impresión, carga | Alto: contrato JSONB grande |

Corrección:

| Qué falta | Primer archivo a revisar | Prueba mínima necesaria |
|---|---|---|
| UX BC y CP; preservar payload | `frontend/src/app/cliente/registrar-cliente/ClientPage.tsx` | alta PF válida/inválida, duplicado RFC, BC sí/no |

## MAP-07 — Registro de clientes PM

Estado: **IMPLEMENTADO**.

| Elemento | Ruta o hallazgo | Estado | Evidencia |
|---|---|---|---|
| Pantalla | formulario condicional PM en ClientPage | CONFIRMADO | `ClientPage.tsx` |
| Validación | empresa, representante, BC obligatorio y autoconsistencia | CONFIRMADO | `validate.ts`; `cliente.routes.ts:1219` |
| Endpoint/DB | mismo POST; `clientes` + dueños/relacionados | CONFIRMADO | `cliente.routes.ts:1335`; `:937` |
| Roles/pruebas | admin/cliente; automáticas no localizadas | PARCIAL | middleware/ruta; package scripts |

Cadena técnica: registrar → `ClientPage` PM → fetch → POST registrar → `cliente.routes.ts` → validaciones/replace children → `clientes`, `cliente_duenos_beneficiarios`, `cliente_relacionados`.

Dependencias:

| Depende de | Impacta a | Riesgo |
|---|---|---|
| BC, catálogos, empresa | edición/impresión | Alto: coexistencia canónica/legacy |

Corrección:

| Qué falta | Primer archivo a revisar | Prueba mínima necesaria |
|---|---|---|
| Sin brecha aislada; regresión al tocar contrato | `backend/src/routes/cliente.routes.ts` | alta PM y BC obligatorio |

## MAP-08 — Registro de fideicomiso

Estado: **IMPLEMENTADO**.

| Elemento | Ruta o hallazgo | Estado | Evidencia |
|---|---|---|---|
| Pantalla/validación | variante `fideicomiso`; identificador, fiduciario, RFC, representante | CONFIRMADO | `ClientPage.tsx`; `cliente.routes.ts:1239` |
| Endpoint/DB | POST común; `clientes` JSONB + relacionados BC | CONFIRMADO | `cliente.routes.ts:1335` |
| Roles/pruebas | admin/cliente; suite automática no localizada | PARCIAL | ruta; package scripts |

Cadena técnica: registrar → `ClientPage` FID → fetch → POST registrar → `cliente.routes.ts` → validación FID/BC → `clientes`, `cliente_duenos_beneficiarios`, `cliente_relacionados`.

Dependencias:

| Depende de | Impacta a | Riesgo |
|---|---|---|
| BC, empresa, contrato JSONB | edición/impresión | Alto: menor cobertura comprobable |

Corrección:

| Qué falta | Primer archivo a revisar | Prueba mínima necesaria |
|---|---|---|
| Regresión específica FID | `frontend/src/app/cliente/registrar-cliente/ClientPage.tsx` | alta FID, RFC fiduciario y BC |

## MAP-09 — Edición de clientes

Estado: **IMPLEMENTADO** con compatibilidad legacy.

| Elemento | Ruta o hallazgo | Estado | Evidencia |
|---|---|---|---|
| Pantalla | `/cliente/editar-cliente/[id]` | CONFIRMADO | `frontend/src/app/cliente/editar-cliente/[id]/page.tsx` |
| HTTP | GET cliente + PUT cliente | CONFIRMADO | misma página `:1321,1830` |
| Backend/DB | deepMerge, UPDATE `clientes`, reemplazo de hijos en transacción | CONFIRMADO | `cliente.routes.ts:1411` |
| Roles | admin/consultor/cliente con alcance empresarial | CONFIRMADO | ruta y middleware |
| Riesgo | fallbacks y tablas duplicadas legacy | CONFIRMADO | `cliente.routes.ts:1022-1152` |

Cadena técnica: editar → página `[id]` → fetch → GET/PUT `/api/cliente/clientes/:id` → `cliente.routes.ts` → deepMerge/validación/transacción → `clientes` y tablas hijas.

Dependencias:

| Depende de | Impacta a | Riesgo |
|---|---|---|
| contrato por tipo y materialización legacy | detalle/impresión | Muy alto: pérdida silenciosa de JSONB/hijos |

Corrección:

| Qué falta | Primer archivo a revisar | Prueba mínima necesaria |
|---|---|---|
| Depurar campos conservando datos históricos | `frontend/src/app/cliente/editar-cliente/[id]/page.tsx` | round-trip PF/PM/FID y cambios parciales |

## MAP-10 — Beneficiario Controlador

Estado: **IMPLEMENTADO** con brecha UX y legado.

| Elemento | Ruta o hallazgo | Estado | Evidencia |
|---|---|---|---|
| Contrato | `beneficiarios_controladores_aplica/lista`; PF condicional, PM/FID obligatorio | CONFIRMADO | `validate.ts:149`; `cliente.routes.ts:394` |
| Persistencia | embebido JSONB y materialización a tablas relacionadas/legacy | INCONSISTENTE | `cliente.routes.ts:894-1152` |
| Validaciones | BC solo PF; RFC/CURP no autocoinciden | CONFIRMADO | `validate.ts`; `cliente.routes.ts:213,465` |
| Brecha | layout PF; compatibilidad legacy | CONFIRMADO | GAP-01; `docs/STATUS.md` |

Cadena técnica: registrar/editar → controles BC → payload canónico → POST/PUT cliente → normalización/validación → `clientes.datos_completos`, `cliente_relacionados`, `cliente_duenos_beneficiarios`.

Dependencias:

| Depende de | Impacta a | Riesgo |
|---|---|---|
| PF/PM/FID, RFC/CURP, impresión | alta/edición/expediente | Muy alto: duplicación o pérdida de BC |

Corrección:

| Qué falta | Primer archivo a revisar | Prueba mínima necesaria |
|---|---|---|
| Ajuste visual PF sin cambiar contrato | `frontend/src/app/cliente/registrar-cliente/ClientPage.tsx` | snapshot/payload antes-después; responsive |

## MAP-11 — Impresión de expediente

Estado: **PARCIAL**.

| Elemento | Ruta o hallazgo | Estado | Evidencia |
|---|---|---|---|
| Pantalla | `/cliente/clientes/[id]/imprimir` | CONFIRMADO | `frontend/src/app/cliente/clientes/[id]/imprimir/page.tsx` |
| HTTP/DB | GET cliente; sin endpoint de identidad empresarial | PARCIAL | página imprimir; routers backend |
| Salida | impresión cliente PF/PM/FID; identidad legal por empresa ausente | PARCIAL | página; GAP-04 |
| Roles | ruta bajo matcher general; GET backend autenticado | CONFIRMADO | `frontend/src/middleware.ts`; `cliente.routes.ts` |

Cadena técnica: imprimir → `ImprimirClientePage` → fetch → GET cliente/:id → `cliente.routes.ts` → SELECT/materializa → `clientes` y relacionadas; identidad empresa → **NO LOCALIZADO**.

Dependencias:

| Depende de | Impacta a | Riesgo |
|---|---|---|
| CRUD/modelo empresas, contenido legal, almacenamiento logo | expediente formal | Alto legal/reputacional |

Corrección:

| Qué falta | Primer archivo a revisar | Prueba mínima necesaria |
|---|---|---|
| identidad, aviso, normalización y retiro de placeholders/IDs | `frontend/src/app/cliente/clientes/[id]/imprimir/page.tsx` | impresión PF/PM/FID por dos empresas |

## MAP-12 — Carga Masiva

Estado: **PARCIAL**.

| Elemento | Ruta o hallazgo | Estado | Evidencia |
|---|---|---|---|
| Pantalla | `/cliente/carga-masiva`; plantilla/CSV/vista local | CONFIRMADO | `frontend/src/app/cliente/carga-masiva/page.tsx` |
| HTTP | POST `/api/cliente/carga-masiva` con `csvContent` | CONFIRMADO frontend | misma página `:152` |
| Backend/DB | endpoint y procesamiento no localizados | NO LOCALIZADO | `backend/src/routes/cliente.routes.ts` |
| Roles | admin/cliente en frontend; backend inexistente | PARCIAL | `frontend/src/middleware.ts` |
| Script | `probar-carga-masiva.sh` apunta a endpoint legacy `/api/carga-directa` y modifica archivo temporal si se ejecuta | INCONSISTENTE / NO EJECUTADO | script raíz |

Cadena técnica: carga → `CargaMasivaPage` → axios → POST `/api/cliente/carga-masiva` → **NO LOCALIZADO** → **NO LOCALIZADO** → `clientes` inferida.

Dependencias:

| Depende de | Impacta a | Riesgo |
|---|---|---|
| contrato/validación de registro, política transaccional | clientes y duplicados | Muy alto: escrituras masivas |

Corrección:

| Qué falta | Primer archivo a revisar | Prueba mínima necesaria |
|---|---|---|
| contrato, parser, endpoint, permisos, resumen por fila | `frontend/src/app/cliente/carga-masiva/page.tsx` | CSV válido/inválido/duplicado; atomicidad; 401/403 |

## MAP-13 — Catálogos y códigos postales

Estado: **PARCIAL**.

| Elemento | Ruta o hallazgo | Estado | Evidencia |
|---|---|---|---|
| Catálogos | JSON SAT e internos servidos desde `public` | CONFIRMADO | `frontend/public/catalogos/`; `frontend/src/lib/catalogos.ts` |
| CP | loader/cache/búsqueda; solo 2 registros locales | CONFIRMADO | `codigosPostalesMx.ts`; `codigos_postales_mx.json` |
| Backend/DB | no intervienen actualmente | NO LOCALIZADO | routers backend |
| Script | actualización SAT `.mjs`; prueba automática no localizada | PARCIAL | `scripts/update_sat_catalogs.mjs` |

Cadena técnica: formulario → loader catálogo → fetch estático `/catalogos/*.json` → **sin endpoint** → **sin backend** → archivos JSON.

Dependencias:

| Depende de | Impacta a | Riesgo |
|---|---|---|
| fuente/licencia/versionado | registrar/editar domicilios | Medio: cobertura y tamaño |

Corrección:

| Qué falta | Primer archivo a revisar | Prueba mínima necesaria |
|---|---|---|
| catálogo nacional reproducible y fallback | `frontend/public/catalogos/internos/codigos_postales_mx.json` | muestras multiestado, colonias, rendimiento |

## MAP-14 — Roles, permisos y middleware

Estado: **IMPLEMENTADO** con inconsistencias menores.

| Elemento | Ruta o hallazgo | Estado | Evidencia |
|---|---|---|---|
| Frontend | matcher y matriz de rutas; Navbar por rol; AuthGuard | CONFIRMADO | `frontend/src/middleware.ts`; `Navbar.tsx`; `AuthGuard.tsx` |
| Backend | authenticate JWT, authorizeRoles y guardas de empresa | CONFIRMADO | `backend/src/middleware/`; `cliente.routes.ts:30` |
| Inconsistencia | middleware permite dashboard a todos, página redirige; normalización de aliases difiere | CONFIRMADO | `frontend/src/middleware.ts`; `frontend/src/lib/auth.ts` |
| Pruebas | regresión documental, sin suite en package.json | PARCIAL | `docs/STATUS.md`; manifiestos |

Cadena técnica: ruta/acción → middleware/visibilidad → Bearer → authenticate → authorizeRoles/empresa → recurso/tabla.

Dependencias:

| Depende de | Impacta a | Riesgo |
|---|---|---|
| MAP-01 y `empresa_id` | Todo el sistema | Crítico: autorización |

Corrección:

| Qué falta | Primer archivo a revisar | Prueba mínima necesaria |
|---|---|---|
| Mantener matriz al añadir endpoints | `backend/src/middleware/auth.middleware.ts` | matriz anónimo/admin/consultor/cliente; 401 antes de 403 |

## MAP-15 — Bitácora o auditoría

Estado: **AUSENTE**.

| Elemento | Ruta o hallazgo | Estado | Evidencia |
|---|---|---|---|
| UI/API/servicio | no localizados | NO LOCALIZADO | `frontend/src`; `backend/src` |
| DB | `logs_auditoria` solo aparece comentada como futura | NO LOCALIZADO | `scripts/migracion_final_mvp.sql` |
| Logging | console técnico, no bitácora de negocio | CONFIRMADO | rutas backend |

Cadena técnica: **NO LOCALIZADO → NO LOCALIZADO → NO LOCALIZADO → NO LOCALIZADO → NO LOCALIZADO → NO LOCALIZADO**.

Dependencias:

| Depende de | Impacta a | Riesgo |
|---|---|---|
| definición regulatoria y modelo | usuarios, clientes, riesgo | Alto, pero fuera del cierre definido salvo trazabilidad de carga |

Corrección:

| Qué falta | Primer archivo a revisar | Prueba mínima necesaria |
|---|---|---|
| Definición completa; no abrir refactor general | `scripts/migracion_final_mvp.sql` | REQUIERE VALIDACIÓN de alcance |

## MAP-16 — Grado de Riesgo

Estado: **DEMO**.

| Elemento | Ruta o hallazgo | Estado | Evidencia |
|---|---|---|---|
| Pantalla | `/demo/evaluaciones/grado-riesgo/[clienteId]` | CONFIRMADO | ruta frontend |
| Habilitación | `NEXT_PUBLIC_MOCK_RIESGO === "1"` | CONFIRMADO | `demo-evaluaciones/isEnabled.ts` |
| Cálculo/persistencia | config + cálculo cliente; `localStorage` | DEMO | `config/gradoRiesgo.ts`; `score/calc.ts`; `storage/local.ts` |
| Backend/DB | no integrados; SQL antiguo declara `matrices_riesgo` pero no prueba esquema actual | REQUIERE VALIDACIÓN | `crear_tablas.sql`; routers backend |

Cadena técnica: ruta demo → `EvaluationForm` → sin HTTP → sin endpoint → cálculo cliente → localStorage; tabla productiva **NO LOCALIZADA/REQUIERE VALIDACIÓN**.

Dependencias:

| Depende de | Impacta a | Riesgo |
|---|---|---|
| definición metodológica/versionado/auditoría | cliente y cumplimiento | Alto regulatorio; fuera MVP inmediato |

Corrección:

| Qué falta | Primer archivo a revisar | Prueba mínima necesaria |
|---|---|---|
| épica productiva completa | `frontend/src/demo-evaluaciones/config/gradoRiesgo.ts` | no promover demo; definición aprobada primero |

## MAP-17 — Perfil Transaccional

Estado: **DEMO**.

| Elemento | Ruta o hallazgo | Estado | Evidencia |
|---|---|---|---|
| Pantalla | `/demo/evaluaciones/perfil-transaccional/[clienteId]` | CONFIRMADO | ruta frontend |
| Cálculo/persistencia | config/cálculo/localStorage; misma bandera demo | DEMO | `demo-evaluaciones/` |
| Backend/DB | no integrados; SQL antiguo declara `transacciones`/`alertas` | REQUIERE VALIDACIÓN | `crear_tablas.sql`; routers backend |

Cadena técnica: ruta demo → `EvaluationForm` → sin HTTP → sin endpoint → cálculo cliente → localStorage; estructuras productivas **NO LOCALIZADAS/REQUIEREN VALIDACIÓN**.

Dependencias:

| Depende de | Impacta a | Riesgo |
|---|---|---|
| definición, transacciones, riesgo, auditoría | monitoreo futuro | Alto; fuera MVP inmediato |

Corrección:

| Qué falta | Primer archivo a revisar | Prueba mínima necesaria |
|---|---|---|
| épica productiva completa | `frontend/src/demo-evaluaciones/config/perfilTransaccional.ts` | no promover demo; definición aprobada primero |

## MAP-18 — Infraestructura y despliegue

Estado: **PARCIAL / REQUIERE VALIDACIÓN**.

| Elemento | Ruta o hallazgo | Estado | Evidencia |
|---|---|---|---|
| Frontend | Vercel documentado; Node 22 | CONFIRMADO documental | `docs/infraestructura.md`; `frontend/package.json` |
| Backend/DB | Render y PostgreSQL documentados | CONFIRMADO documental | `docs/STATUS.md`; `docs/infraestructura.md` |
| Config | `DATABASE_URL`, `JWT_SECRET`, `PORT`, `NODE_ENV`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_MOCK_RIESGO` | CONFIRMADO nombres | código fuente |
| Docker/CI/IaC | no localizados | NO LOCALIZADO | árbol real |
| URLs | documentación histórica contradictoria; fallback frontend también difiere | INCONSISTENTE | `docs/infraestructura.md`; `next.config.js`; páginas cliente |

Cadena técnica: Vercel → Next.js/rewrite o URL pública → Render Express → `backend/src/app.ts` → `pg` Pool → Render PostgreSQL.

Dependencias:

| Depende de | Impacta a | Riesgo |
|---|---|---|
| variables coordinadas, migración DB y despliegues | sistema completo | Crítico: drift de URL/esquema |

Corrección:

| Qué falta | Primer archivo a revisar | Prueba mínima necesaria |
|---|---|---|
| confirmar configuración vigente sin exponer valores | `docs/infraestructura.md` | build, health funcional, 401 protegido, conexión UI/API |

## 6. Rutas frontend

| Ruta | Módulo | Estado |
|---|---|---|
| `/` | presentación pública | PARCIAL |
| `/login`, `/dashboard` | auth/dashboard | IMPLEMENTADO / INCONSISTENTE |
| `/admin/usuarios*` | usuarios | IMPLEMENTADO |
| `/admin/empresas`, `/admin/crear-empresa`, `/admin/editar-empresa/[id]` | empresas | PARCIAL |
| `/cliente/clientes*`, `/cliente/registrar-cliente`, `/cliente/editar-cliente/[id]` | clientes | IMPLEMENTADO |
| `/cliente/carga-masiva` | carga | PARCIAL |
| `/demo/evaluaciones/{grado-riesgo,perfil-transaccional}/[clienteId]` | evaluaciones | DEMO |
| `/clientes`, `/registrar-cliente` | redirects legacy | IMPLEMENTADO |
| `/test-css` | residual documentada | NO LOCALIZADO en código / REQUIERE VALIDACIÓN en Production |

## 7. Endpoints backend

| Método y endpoint | Roles | Tabla principal | Estado |
|---|---|---|---|
| POST `/api/auth/login` | público | usuarios (R) | CONFIRMADO |
| GET/POST `/api/admin/usuarios` | admin | usuarios (R/W), empresas (R) | CONFIRMADO |
| PATCH `/api/admin/usuarios/:id` | admin | usuarios (R/W), empresas (R) | CONFIRMADO |
| PATCH `/api/admin/usuarios/:id/activo` | admin | usuarios (W) | CONFIRMADO |
| GET `/api/admin/empresas` | admin, consultor | empresas (R) | CONFIRMADO |
| POST/GET-id/PUT empresa | esperado por frontend | empresas | NO LOCALIZADO |
| GET `/api/cliente/clientes` | autenticado + alcance | clientes (R) | CONFIRMADO |
| GET `/api/cliente/clientes/:id` | autenticado + alcance | clientes/relacionadas (R) | CONFIRMADO |
| POST `/api/cliente/registrar-cliente` | admin, cliente | clientes/relacionadas (W) | CONFIRMADO |
| PUT `/api/cliente/clientes/:id` | admin, consultor, cliente + alcance | clientes/relacionadas (R/W) | CONFIRMADO |
| POST `/api/cliente/carga-masiva` | esperado por frontend | clientes | NO LOCALIZADO |

## 8. Tablas y persistencia

**Confirmadas por consultas activas:** `usuarios`, `empresas`, `clientes`, `cliente_relacionados`, `cliente_recursos_terceros`, `cliente_duenos_beneficiarios`. `clientes.datos_completos` se usa como JSONB/estructura dinámica.

**Solo declaradas en SQL histórico; esquema vigente requiere validación:** `transacciones`, `barridos_listas`, `matrices_riesgo`, `alertas`. `logs_auditoria` está únicamente comentada. Evidencia: `crear_tablas.sql`, `scripts/migracion_final_mvp.sql`.

## 9. Roles y permisos

| Acción | admin | consultor | cliente |
|---|---|---|---|
| Usuarios | CRUD | no | no |
| Empresas | lectura + UI crear/editar incompleta | lectura | no |
| Clientes listar/consultar | sí | sí | propia empresa |
| Registrar cliente/carga | sí | no | propia empresa |
| Editar cliente | sí | sí | propia empresa |

Evidencia: `frontend/src/middleware.ts`, `frontend/src/components/Navbar.tsx`, `backend/src/routes/*.ts`.

## 10. Integraciones y despliegue

No se localizaron integraciones externas de negocio, Docker, CI o IaC. Se confirma consumo de JSON estático local. Vercel/Render son confirmación documental y requieren verificación operativa; no se consultó Production. Las URLs vigentes cambian entre documentos y fallbacks del código.

## 11. Puntos de entrada para correcciones

1. `/test-css`: `frontend/src/app/` (archivo ausente) + configuración/despliegue Vercel.
2. Dashboard: `frontend/src/app/dashboard/page.tsx`.
3. Empresas: `backend/src/routes/admin.routes.ts`.
4. Carga: `frontend/src/app/cliente/carga-masiva/page.tsx`, después contrato backend.
5. Impresión: `frontend/src/app/cliente/clientes/[id]/imprimir/page.tsx`.
6. BC/CP: `frontend/src/app/cliente/registrar-cliente/ClientPage.tsx`.

## 12. Información no localizada

- Código actual de `/test-css`; confirmar artefacto/despliegue de Production.
- `db/` y `docs/SCMVP_BOOTSTRAP_ACTUAL_2026-06-01.md` citados por documentación.
- Endpoints CRUD de empresa salvo listado.
- Endpoint/procesador de carga masiva.
- Backend y persistencia productiva de Dashboard, Riesgo y Perfil Transaccional.
- Bitácora/auditoría de negocio.
- Suite automatizada de pruebas y configuración CI.
- Docker/IaC.
- Esquema real vigente de Production y restricciones efectivas.
