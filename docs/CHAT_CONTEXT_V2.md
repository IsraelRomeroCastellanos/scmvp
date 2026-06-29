# SCMVP — Contexto operativo consolidado V2

<!-- RELEASE-CHECKPOINT-01:START -->
## RELEASE-CHECKPOINT-01 — contexto operativo vigente

**Fecha:** 2026-06-28
**Repositorio:** `IsraelRomeroCastellanos/scmvp`
**Main estable:** `2d2d0f795a0991eec9773a75281e639ccd1317d0`

### Arquitectura y Production

- Frontend: Next.js 14, App Router, TypeScript y Tailwind.
- Frontend Production: https://scmvp.vercel.app
- Backend: Node.js, Express y TypeScript.
- Backend vigente: https://scmvp-nxtj.onrender.com
- Base de datos: PostgreSQL en Render.
- Middleware frontend: `frontend/src/middleware.ts`.
- Marca visible: **Shield by Vission**.

### Rutas frontend canónicas

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

### Política vigente por rol

#### Administrador

- Gestión de usuarios.
- Consulta de empresas.
- Acciones visibles para crear y editar empresas.
- Listado, registro y edición de clientes.

#### Consultor

- Consulta de empresas.
- Sin crear ni editar empresas.
- Listado y edición de clientes.
- Sin registrar clientes.
- Sin gestión de usuarios.

#### Cliente

- Sin administración de usuarios o empresas.
- Listado de clientes limitado a su empresa.
- Registro y edición de clientes conforme a su empresa.

#### Anónimo

- Sin acceso a rutas protegidas.

### Política backend congelada

- Sin token válido: `401` antes de validaciones funcionales.
- Token válido con rol insuficiente: `403`.
- Registrar cliente:
  - permitido para `admin` y `cliente`;
  - denegado para `consultor` y anónimo.
- Editar cliente:
  - permitido para `admin` y `consultor`;
  - permitido para `cliente` conforme a su empresa;
  - denegado para anónimo.

### Rutas legacy

- `/clientes` redirige `307` a `/cliente/clientes`.
- `/registrar-cliente` redirige `307` a `/cliente/registrar-cliente`.

### Frentes cerrados

- AUTHZ-BE-WRITES-01 — PR #47.
- AUTHZ-FE-ROUTES-01 — PR #48.
- AUTHZ-UI-ACTIONS-01 — PR #49.
- LEGACY-ROUTES-01 — PR #50.
- AUTHZ-REGRESSION-FINAL-01 — auditoría read-only aprobada.

### Regresión final congelada

- Matriz frontend autenticada: 27/27.
- Acciones prohibidas ausentes del DOM.
- Escrituras de negocio durante QA: 0.
- Errores 5xx nuevos: 0.
- Defectos funcionales reproducibles: 0.
- Navbar, middleware y Shield by Vission intactos.

### Gestión de empresas

La autorización, las rutas y la visibilidad por rol están cerradas. La implementación funcional end-to-end de crear y editar empresas continúa pendiente.

### IDs protegidos

- 67;
- 99;
- 100;
- 101.

No utilizarlos para pruebas de escritura.

### Artefactos históricos protegidos

- `backend/src/routes/cliente.routes.ts.bak_*`;
- `backups-previous/`;
- `backups/`;
- `db/`;
- `docs/SCMVP_BOOTSTRAP_ACTUAL_2026-06-01.md`;
- stash `On main: resguardo local no-clientes-v2 backend tracked`.

No limpiar, restaurar, aplicar, eliminar ni incorporar estos artefactos.

### Pendiente administrativo separado

Proyecto Vercel `scmvp-legacy-routes-preview-audit`:

- vacío;
- no vinculado al repositorio;
- sin despliegue funcional;
- sin impacto en Production;
- no eliminar sin autorización independiente.

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

### Siguiente frente

`GAP-MAP-01`.

Las secciones históricas posteriores permanecen como antecedente y no sustituyen este estado vigente.

<!-- RELEASE-CHECKPOINT-01:END -->

Última actualización: 2026-06-19
Main: `3492522ec4bb1c9894c50b55983e2e56e8edee4c`

## 1. Estado global

- SCMVP opera con frontend en Vercel y backend en Render.
- Frontend Production: https://scmvp.vercel.app
- Backend Production: https://scmvp-nxtj.onrender.com
- Marca visible: Shield by Vission.
- Stack: Next.js 14, TypeScript, TailwindCSS, Node.js/Express y PostgreSQL.
- Auth: JWT Bearer.
- Roles: admin, consultor y cliente.
- Clientes PF, PM y Fideicomiso tienen flujos vigentes de registrar, listar, consultar, editar e imprimir según alcance implementado.

## 2. Rutas frontend principales

- `/login`
- `/dashboard`
- `/admin/usuarios`
- `/admin/empresas`
- `/cliente/clientes`
- `/cliente/registrar-cliente`
- `/cliente/editar-cliente/[id]`
- `/cliente/clientes/[id]`
- `/cliente/clientes/[id]/imprimir`

## 3. Endpoints backend principales

- `POST /api/auth/login`
- `GET /api/admin/empresas`
- `GET /api/admin/usuarios`
- `PATCH /api/admin/usuarios/:id/activo`
- `GET /api/cliente/clientes`
- `GET /api/cliente/clientes/:id`
- `POST /api/cliente/registrar-cliente`
- `PUT /api/cliente/clientes/:id`

El backend usa mezcla profunda para preservar campos no modificados en actualizaciones parciales.

## 4. Contrato de Cliente

Tipos:

- `persona_fisica`
- `persona_moral`
- `fideicomiso`

Datos comunes relevantes:

- `nombre_entidad`
- `nacionalidad`
- `datos_completos.contacto`
- `datos_completos.contacto.domicilio` o variante normalizada vigente

Validaciones vigentes destacadas:

- fechas `AAAAMMDD`;
- RFC y CURP;
- email;
- código postal mexicano o extranjero según país;
- payload máximo backend de 2 MB.

## 5. Beneficiario Controlador

Contrato canónico:

- `beneficiarios_controladores_aplica`
- `beneficiarios_controladores`

### Registrar

- PF: condicionado por manifestación.
- PM: obligatorio.
- FID: obligatorio.
- BC siempre representa una Persona Física.
- Autocoincidencia RFC/CURP con el cliente: bloqueada.
- Escritura exclusivamente canónica.

### Editar

- Mantiene las mismas reglas PF/PM/FID.
- Puede leer temporalmente estructuras legacy.
- Escribe exclusivamente contrato canónico.
- Recursos de terceros retirado de Editar PF.
- Observaciones retirado.

### Impresión

- Una sola sección Beneficiario Controlador.
- PF muestra Aplica Sí/No.
- PM y FID imprimen filas BC.
- Sin Recursos de terceros.
- Sin sección duplicada Dueños / Beneficiarios.
- Sin Observaciones visibles.

## 6. Edición general PF

PF-EDIT-GENERAL-01 quedó integrado mediante PR #44 y merge commit `3492522`.

Campos editables:

- nombres;
- apellido paterno;
- apellido materno;
- fecha de nacimiento;
- RFC;
- CURP;
- país de nacimiento;
- actividad económica principal;
- identificación vigente:
  - tipo;
  - autoridad;
  - número;
  - fecha de expedición;
  - fecha de expiración.

Campos derogados excluidos:

- estado civil;
- régimen matrimonial;
- ocupación;
- profesión / actividad profesional.

No se muestran, no se hidratan y no se emiten en PUT. Los datos históricos no se sobrescriben.

## 7. Identidad visual

UX-BRAND-01 quedó integrado mediante PR #43.

- Marca: Shield by Vission.
- Logo institucional.
- Shell oscuro.
- Contenido claro.
- Login, dashboard, clientes y administración actualizados.
- Responsive y accesibilidad básica.
- Roles conservados.

## 8. Incidencia y registros protegidos

### Cliente 67

- PUT real confirmado durante QA.
- Fecha: `2026-06-16T06:03:52.87196317Z`.
- Endpoint: `/api/cliente/clientes/67`.
- Alcance histórico indeterminado.
- Estado posterior estructuralmente válido.
- No restaurado ni modificado nuevamente.
- Evidencia fuera del repositorio.
- SHA-256: `1a520ca596c87724acd26eeb44200ac3e1a278338b4eb1776472a62b59e418f3`.

No registrar información personal del cliente.

### IDs protegidos

- `67`: no usar en QA salvo autorización expresa.
- `99`, `100`, `101`: no consultar, modificar ni eliminar.

## 9. Reglas de QA

- Bloquear `POST`, `PUT`, `PATCH` y `DELETE` durante smoke no destructivo.
- Permitir `GET`.
- Reinstalar el interceptor tras login, navegación, recarga o cambio de cliente.
- Verificar ruta actual y contador de escrituras reales antes de guardar.
- No usar credenciales o tokens en reportes.
- Detener ante cualquier escritura real o divergencia de contrato.

## 10. Estado Git

- Main vigente: `3492522`.
- Stash histórico: intacto; no aplicar, eliminar ni modificar sin autorización.
- Untracked históricos conocidos:
  - seis respaldos de `backend/src/routes/cliente.routes.ts`;
  - `backups-previous/`;
  - `backups/`;
  - `db/`;
  - `docs/SCMVP_BOOTSTRAP_ACTUAL_2026-06-01.md`.

## 11. Pendientes reales

- Revisar navegación del rol consultor: acceso a Empresas disponible, pero ausente del menú.
- Mejoras visuales específicas por módulo.
- Eventual consolidación física de estructuras legacy BC.
- Eventual eliminación de fallbacks legacy.
- Nuevos frentes funcionales sujetos a priorización de Control de Misión V2.

## 12. Bootstrap para un nuevo Taller

1. Proyecto: SCMVP.
2. Frontend: https://scmvp.vercel.app
3. Backend: https://scmvp-nxtj.onrender.com
4. Marca: Shield by Vission.
5. Main: `3492522`.
6. BC escribe exclusivamente `beneficiarios_controladores_aplica` y `beneficiarios_controladores`.
7. Editar PF incluye identidad, actividad económica e identificación vigente.
8. Estado civil, régimen matrimonial, ocupación y profesión están derogados.
9. IDs `67`, `99`, `100`, `101` están protegidos.
10. Stash y untracked históricos no deben tocarse sin autorización.
