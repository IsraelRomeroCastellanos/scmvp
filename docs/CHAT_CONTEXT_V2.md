# SCMVP — Contexto operativo consolidado V2

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
