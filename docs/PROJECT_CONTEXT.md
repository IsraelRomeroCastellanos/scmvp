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
- POST /api/auth/login
- GET /api/admin/__debug
- GET /api/admin/empresas
- GET /api/cliente/mis-clientes (pendiente en backend actual: 404)
- GET /api/cliente/__debug (pendiente en backend actual: 404)

## Roles / permisos (alto nivel)
- Roles: admin / consultor / cliente
- Cliente: opera sobre su empresa (empresa_id)
- Admin/consultor: pueden ver global (según reglas definidas)
