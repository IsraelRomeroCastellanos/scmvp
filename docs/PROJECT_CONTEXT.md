# SCMVP — Project Context

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
