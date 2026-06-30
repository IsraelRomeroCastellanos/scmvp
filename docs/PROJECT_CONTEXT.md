# SCMVP — Project Context

<!-- RELEASE-CHECKPOINT-01:START -->
## RELEASE-CHECKPOINT-01 — contexto vigente del proyecto

**Fecha:** 2026-06-28
**Main estable:** `2d2d0f795a0991eec9773a75281e639ccd1317d0`

### Production vigente

- Frontend: https://scmvp.vercel.app
- Backend: https://scmvp-nxtj.onrender.com
- Marca visible: **Shield by Vission**.

### Stack

- Frontend: Next.js 14, App Router, TypeScript y Tailwind.
- Backend: Node.js, Express y TypeScript.
- Base de datos: PostgreSQL en Render.
- Middleware frontend: `frontend/src/middleware.ts`.

### Roles vigentes

- `admin`
- `consultor`
- `cliente`

### Módulos vigentes

- autenticación;
- dashboard;
- gestión de usuarios;
- gestión de empresas;
- listado, registro, consulta, edición e impresión de clientes;
- autorización frontend y backend;
- navegación y acciones por rol.

### Política de autorización — empresas

- `admin`: consulta y acceso autorizado a las rutas y acciones de crear/editar.
- `consultor`: consulta únicamente; crear y editar ocultos y denegados.
- `cliente`: sin acceso administrativo.
- anónimo: sin acceso.

La protección de rutas, la autorización y la visibilidad están cerradas. La implementación funcional end-to-end de crear y editar empresas continúa pendiente.

### Política de autorización — clientes

- Registrar:
  - permitido para `admin` y `cliente`;
  - denegado para `consultor` y anónimo.
- Editar:
  - permitido para `admin` y `consultor`;
  - permitido para `cliente` conforme a su empresa;
  - denegado para anónimo.
- Listar:
  - `admin` y `consultor` conforme al alcance autorizado;
  - `cliente` limitado a su empresa.

### Endpoints principales

- `POST /api/auth/login`
- `GET /api/admin/usuarios`
- `GET /api/admin/empresas`
- `PATCH /api/admin/usuarios/:id/activo`
- `GET /api/cliente/clientes`
- `GET /api/cliente/clientes/:id`
- `POST /api/cliente/registrar-cliente`
- `PUT /api/cliente/clientes/:id`

### Rutas frontend principales

- `/login`
- `/dashboard`
- `/admin/usuarios`
- `/admin/empresas`
- `/admin/crear-empresa`
- `/admin/editar-empresa/[id]`
- `/cliente/clientes`
- `/cliente/registrar-cliente`
- `/cliente/editar-cliente/[id]`
- `/cliente/clientes/[id]/imprimir`

### Rutas legacy

- `/clientes` redirige `307` a `/cliente/clientes`.
- `/registrar-cliente` redirige `307` a `/cliente/registrar-cliente`.

### Cierre integral de autorización

- AUTHZ-BE-WRITES-01 — PR #47.
- AUTHZ-FE-ROUTES-01 — PR #48.
- AUTHZ-UI-ACTIONS-01 — PR #49.
- LEGACY-ROUTES-01 — PR #50.
- AUTHZ-REGRESSION-FINAL-01 — auditoría read-only aprobada.

Resultado congelado:

- matriz frontend autenticada: 27/27;
- acciones prohibidas ausentes del DOM;
- backend sin token: `401`;
- backend con rol insuficiente: `403`;
- escrituras de negocio durante QA: 0;
- errores 5xx nuevos: 0;
- defectos funcionales reproducibles: 0.

### Backlog inmediato

1. `GAP-MAP-01` — congelamiento detallado de brechas.
2. Acomodo UX de Beneficiario Controlador en Registrar PF.
3. Catálogo nacional completo de códigos postales.
4. Crear y editar empresas funcionalmente de extremo a extremo.
5. Logo y aviso de privacidad personalizados por empresa.
6. Impresión personalizada por empresa.
7. Depuración del detalle de clientes y campos por confirmar.
8. Carga Masiva: plantilla, validación y procesamiento end-to-end.
9. Página de presentación autenticada.
10. Actualización de la bienvenida pública a Shield by Vission.
11. Otros detalles y hallazgos emergentes.
12. Grado de Riesgo — épica separada en definición.
13. Perfil Transaccional — épica separada en definición.

### Pendiente administrativo separado

Proyecto Vercel `scmvp-legacy-routes-preview-audit`:

- vacío;
- no vinculado al repositorio;
- sin despliegue funcional;
- sin impacto en Production;
- no eliminar sin autorización independiente.

### Artefactos históricos protegidos

- `backend/src/routes/cliente.routes.ts.bak_*`;
- `backups-previous/`;
- `backups/`;
- `db/`;
- `docs/SCMVP_BOOTSTRAP_ACTUAL_2026-06-01.md`;
- stash `On main: resguardo local no-clientes-v2 backend tracked`.

No limpiar, restaurar, aplicar, eliminar ni incorporar estos artefactos.

### Siguiente frente

`GAP-MAP-01`.

Las secciones históricas posteriores no sustituyen este estado vigente.

<!-- RELEASE-CHECKPOINT-01:END -->

Última actualización: 2026-06-19
Main vigente: `3492522ec4bb1c9894c50b55983e2e56e8edee4c`

## Producción

- Frontend: https://scmvp.vercel.app
- Backend: https://scmvp-nxtj.onrender.com
- Marca visible: Shield by Vission

## Stack

- Frontend: Next.js 14, App Router, TypeScript y TailwindCSS.
- Backend: Node.js, Express y TypeScript.
- DB: PostgreSQL en Render.
- Auth: JWT Bearer.
- Roles: admin, consultor y cliente.

## Endpoints clave

### Auth

- `POST /api/auth/login`

### Administración

- `GET /api/admin/empresas`
- `GET /api/admin/usuarios`
- `PATCH /api/admin/usuarios/:id/activo`

### Clientes

- `GET /api/cliente/clientes`
- `GET /api/cliente/clientes/:id`
- `POST /api/cliente/registrar-cliente`
- `PUT /api/cliente/clientes/:id`

## Tipos de cliente

- `persona_fisica`
- `persona_moral`
- `fideicomiso`

## Beneficiario Controlador

Contrato canónico de escritura:

- `beneficiarios_controladores_aplica`
- `beneficiarios_controladores`

Reglas:

- PF condicionado por manifestación.
- PM y FID obligatorios.
- BC siempre Persona Física.
- Autocoincidencia RFC/CURP bloqueada.
- Registrar y Editar escriben exclusivamente contrato canónico.
- Editar conserva lectura legacy temporal.
- Impresión muestra una sola sección BC.

## Edición PF vigente

Campos editables:

- nombres y apellidos;
- fecha de nacimiento;
- RFC y CURP;
- país de nacimiento;
- actividad económica principal;
- identificación vigente.

Campos derogados excluidos:

- estado civil;
- régimen matrimonial;
- ocupación;
- profesión / actividad profesional.

## Identidad visual

- Shield by Vission.
- Logo institucional.
- Shell oscuro y contenido claro.
- Login, dashboard, clientes y administración actualizados.
- Responsive y accesibilidad básica.

## Seguridad de QA

- Bloquear escrituras reales durante smoke no destructivo.
- IDs protegidos: `67`, `99`, `100`, `101`.
- No documentar secretos, tokens ni datos personales.
- Incidencia del cliente 67 documentada únicamente con fecha, endpoint, estado y hash de evidencia.

## Estado Git operativo

- Main: `3492522`.
- Stash histórico: intacto; no aplicar, eliminar ni modificar sin autorización.
- Untracked históricos conocidos: respaldos backend, `backups-previous/`, `backups/`, `db/` y `docs/SCMVP_BOOTSTRAP_ACTUAL_2026-06-01.md`.

## Pendientes

- Mostrar Empresas en navegación del rol consultor.
- Mejoras visuales específicas por módulo.
- Consolidación física futura de estructuras legacy BC.
- Eliminación futura de fallbacks legacy.
- Nuevos frentes funcionales por priorizar.

<!-- GAP-MAP-DOC-01:START -->
## Estado de producto posterior a GAP-MAP-01

SCMVP mantiene como base estable `dedffc8dd32515262b100610b3ae4eb6104e25a9`, con autenticación, autorización y gestión principal de clientes estabilizadas.

Estado estructural:

- Gestión de clientes: base funcional, con brechas UX y de depuración.
- Empresas: listado operativo; alta y edición incompletas end-to-end.
- Carga Masiva: interfaz parcial sin endpoint backend.
- Impresión: borrador funcional, pendiente de identidad y contenido legal por empresa.
- Dashboard: información simulada presentada sin advertencia.
- Códigos postales: infraestructura presente, cobertura nacional ausente.
- Página pública: alineación parcial con Shield.
- Grado de Riesgo y Perfil Transaccional: épicas separadas, aún no productivas.
- Deuda técnica: auxiliares del árbol y pendiente administrativo de Vercel.

La matriz, criterios de aceptación, estimaciones min/prob/max, Pronósticos A/B/C y secuencia recomendada se mantienen en `docs/GAP_MAP_01.md`.

No se autoriza implementación funcional como parte de GAP-MAP-DOC-01.
<!-- GAP-MAP-DOC-01:END -->
