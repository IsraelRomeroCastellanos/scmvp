# SCMVP — Project Context

## Producción
- Frontend (Vercel): https://scmvp.vercel.app
- Backend (Render, actual): https://scmvp-1jhq.onrender.com
- Backend (Render, anterior): https://scmvp.onrender.com (suspendido)

## Stack
- Frontend: Next.js (App Router) + TypeScript + TailwindCSS
- Backend: Node.js + Express + TypeScript
- DB: PostgreSQL (Render)
- Auth: JWT Bearer (Authorization: Bearer <token>)

## Endpoints clave (BE)
### Auth
- POST /api/auth/login  -> { token, user }

### Admin (protegidos)
- GET /api/admin/__debug
- GET /api/admin/empresas

### Clientes (protegidos)
- GET /api/cliente/clientes
  - Nota: para admin/consultor, actualmente puede requerir query `?empresa_id=<id>` (ej. `?empresa_id=32`)
  - Si no se envía `empresa_id`, el BE puede responder 400: {"error":"empresa_id inválido"}
- POST /api/cliente/registrar-cliente
- GET /api/cliente/clientes/:id
- PUT /api/cliente/clientes/:id

## Reglas de negocio / permisos (alto nivel)
- Roles: admin / consultor / cliente
- Cliente: opera sobre su empresa (empresa_id)
- Admin/consultor: visión global o por empresa (según filtro/selector de empresa)
- Nota operativa: “Gestión de Clientes” en FE usa listado y filtro por empresa (default esperado: “Todas”)