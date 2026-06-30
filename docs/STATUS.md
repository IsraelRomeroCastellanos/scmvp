# SCMVP — Estado vigente

<!-- RELEASE-CHECKPOINT-01:START -->
## RELEASE-CHECKPOINT-01 — estado estable de autorización

**Fecha:** 2026-06-28
**Estado:** cerrado y aprobado
**Main estable de referencia:** `2d2d0f795a0991eec9773a75281e639ccd1317d0`

### Production vigente

- Frontend: https://scmvp.vercel.app
- Backend: https://scmvp-nxtj.onrender.com
- Marca visible: **Shield by Vission**

### Frentes integrados y cerrados

- AUTHZ-BE-WRITES-01 — PR #47.
- AUTHZ-FE-ROUTES-01 — PR #48.
- AUTHZ-UI-ACTIONS-01 — PR #49.
- LEGACY-ROUTES-01 — PR #50.
- AUTHZ-REGRESSION-FINAL-01 — auditoría read-only aprobada.

### Política vigente por rol

**Empresas**

- `admin`: consulta y acciones visibles para crear/editar.
- `consultor`: consulta únicamente; crear/editar ocultos.
- `cliente`: sin acceso administrativo.
- anónimo: sin acceso.

La autorización, navegación y visibilidad están cerradas. La implementación funcional end-to-end de crear y editar empresas permanece pendiente.

**Clientes**

- Registrar: permitido para `admin` y `cliente`; denegado para `consultor` y anónimo.
- Editar: permitido para `admin`, `consultor` y `cliente`, con alcance empresarial cuando corresponde.
- Listar: `cliente` limitado a su empresa.

### Rutas legacy

- `/clientes` redirige `307` a `/cliente/clientes`.
- `/registrar-cliente` redirige `307` a `/cliente/registrar-cliente`.

### Regresión final congelada

- Matriz frontend autenticada: 27/27.
- Acciones prohibidas: ausentes del DOM.
- Backend sin sesión: `401`.
- Backend con rol insuficiente: `403`.
- Escrituras de negocio durante QA: 0.
- Errores 5xx nuevos: 0.
- Defectos reproducibles: 0.
- Navbar, middleware y Shield by Vission: intactos.

### Siguiente frente

`GAP-MAP-01` — congelamiento detallado de brechas.

### Pendiente administrativo separado

Proyecto Vercel `scmvp-legacy-routes-preview-audit`: vacío, no vinculado al repositorio y sin impacto en Production. No eliminar sin autorización independiente.

### Artefactos protegidos

No tocar ni limpiar:

- respaldos `backend/src/routes/cliente.routes.ts.bak_*`;
- `backups-previous/`;
- `backups/`;
- `db/`;
- `docs/SCMVP_BOOTSTRAP_ACTUAL_2026-06-01.md`;
- stash histórico `On main: resguardo local no-clientes-v2 backend tracked`.

<!-- RELEASE-CHECKPOINT-01:END -->

Última consolidación documental: 2026-06-19
Frente documental: CONTROL-DOC-03
Main vigente: `3492522ec4bb1c9894c50b55983e2e56e8edee4c`

## Producción

- Frontend: https://scmvp.vercel.app
- Backend: https://scmvp-nxtj.onrender.com
- Marca visible: **Shield by Vission**
- Estado: frontend y backend operativos; Production validado después de PF-EDIT-GENERAL-01.

## Módulos vigentes

- Autenticación JWT y permisos por rol: operativos.
- Administración de empresas y usuarios: operativa.
- Clientes PF, PM y Fideicomiso: registrar, listar, consultar, editar e imprimir operativos según alcance vigente.
- Identidad visual UX-BRAND-01: integrada en login, dashboard, clientes y administración.

## Beneficiario Controlador — contrato vigente

Contrato canónico de escritura:

- `beneficiarios_controladores_aplica`
- `beneficiarios_controladores`

Reglas vigentes:

- Registrar PF: condicionado por manifestación.
- Registrar PM y FID: obligatorio.
- El Beneficiario Controlador siempre representa una Persona Física.
- Autocoincidencia de RFC o CURP con el cliente: bloqueada.
- Registrar y Editar escriben exclusivamente el contrato canónico.
- Editar mantiene lectura temporal de estructuras legacy para compatibilidad.
- Recursos de terceros y Observaciones están retirados del flujo vigente de Editar PF.
- Impresión presenta una sola sección de Beneficiario Controlador, sin duplicados legacy.

## Edición general de Persona Física

PF-EDIT-GENERAL-01 está integrado en main mediante PR #44.

Campos editables vigentes:

- nombres;
- apellidos;
- fecha de nacimiento;
- RFC;
- CURP;
- país de nacimiento;
- actividad económica principal;
- identificación vigente: tipo, autoridad, número, fecha de expedición y fecha de expiración.

Campos derogados y excluidos:

- estado civil;
- régimen matrimonial;
- ocupación;
- profesión / actividad profesional.

Estos campos no aparecen en UI, no se hidratan y no se emiten en PUT. Los valores históricos no se sobrescriben.

## Identidad visual

UX-BRAND-01 está integrado en main mediante PR #43.

- Marca visible: Shield by Vission.
- Logo institucional.
- Shell oscuro y contenido claro.
- Login, dashboard, clientes y administración actualizados.
- Responsive y accesibilidad básica conservados.
- Roles y permisos sin cambios funcionales.

## Incidencia protegida — cliente 67

- Se confirmó un PUT real durante QA el `2026-06-16T06:03:52.87196317Z`.
- Endpoint: `/api/cliente/clientes/67`.
- Alcance histórico: indeterminado.
- Estado posterior: estructuralmente válido.
- No se restauró ni se volvió a modificar.
- Evidencia preservada fuera del repositorio.
- SHA-256 de la evidencia: `1a520ca596c87724acd26eeb44200ac3e1a278338b4eb1776472a62b59e418f3`.

No documentar datos personales del registro.

## IDs protegidos para QA

- `67`: no volver a usar sin autorización expresa.
- `99`, `100`, `101`: registros accidentales/protegidos; no consultar, modificar ni eliminar.

## Estado Git operativo

- Rama activa esperada fuera de frentes: `main`.
- HEAD consolidado: `3492522`.
- Stash histórico: conservar intacto; no aplicar, eliminar ni modificar sin autorización.
- Untracked históricos conocidos:
  - seis respaldos de `backend/src/routes/cliente.routes.ts`;
  - `backups-previous/`;
  - `backups/`;
  - `db/`;
  - `docs/SCMVP_BOOTSTRAP_ACTUAL_2026-06-01.md`.

## Pendientes reales

- Revisar navegación del rol consultor: el acceso a Empresas existe, pero no aparece en el menú.
- Continuar mejoras visuales específicas por módulo cuando sean priorizadas.
- Evaluar consolidación física futura de estructuras legacy de Beneficiario Controlador.
- Evaluar eliminación futura de fallbacks legacy después de completar compatibilidad y migración.
- Priorizar futuros frentes funcionales mediante Control de Misión V2.

<!-- GAP-MAP-DOC-01:START -->
## GAP-MAP-DOC-01 — congelamiento documental del mapa de brechas

- Base auditada: `dedffc8dd32515262b100610b3ae4eb6104e25a9`.
- Tag de referencia: `stable-authz-20260628`.
- GAP-MAP-01: auditoría técnica y visual read-only completada.
- Escrituras de negocio: 0.
- Modificaciones durante la auditoría: 0.
- Frente activo: `GAP-MAP-DOC-01`.
- Documento canónico: `docs/GAP_MAP_01.md`.
- P0: `/test-css`, Dashboard simulado, CRUD de empresas, Carga Masiva e identidad/impresión por empresa.
- P1: Beneficiario Controlador PF, catálogo nacional de C.P., campos del cliente y página pública.
- P2: Grado de Riesgo, Perfil Transaccional e higiene del árbol.
- No se autoriza implementación funcional.
- Siguiente punto de control: commit documental local y autorización posterior de push/PR.
<!-- GAP-MAP-DOC-01:END -->
