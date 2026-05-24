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
## Estado operativo post-D2 — 2026-05-23

- Estado estable de Clientes posterior a D2:
  - main: `3934929`
  - D2 funcional: `6d9a074`
  - D1 funcional: `deccf4a`
- Producción:
  - Frontend Vercel: `https://scmvp.vercel.app`
  - Backend Render vigente: `https://scmvp-1jhq.onrender.com`
  - DB lógica vigente: `scmvp_xeu1`

### Clientes — frentes cerrados recientes
- PAQUETE B — Domicilio inteligente cerrado.
- C1 — Actividad económica / giro mercantil principales PF/PM cerrado.
- C2A — Recursos de terceros en editar cerrado.
- UX/TEXTO-01 — País de nacimiento / constitución en registrar cerrado.
- C2B-2A + F1 — relatedRecursos PF/PM en registrar cerrado.
- D1 + D1-F1 — Impresión PF base completa cerrada.
- D2 + D2-F1 — Impresión PM base completa cerrada.

### Reglas vigentes de captura
- Tipo de Nacionalidad controla Nacionalidad.
- Nacionalidad gobierna CP / domicilio inteligente.
- País de nacimiento / constitución se selecciona manualmente y no gobierna CP.
- No existe campo separado “País del domicilio”.

### Impresión
- PF: impresión base completa con recursos de terceros y sin JSON crudo.
- PM: impresión base completa con razón social, país de constitución, domicilio, representante legal, recursos de terceros y sin JSON crudo.
- Acuerdos PF/PM: casillas `[ ] Sí / [ ] No` solo visuales/imprimibles, sin persistencia.

### Salvedades
- D3 FID no abierto.
- C2C accionista tercero PM diferido.
- C2D dueños/beneficiarios / relatedDuenos diferido.
- PF/BC condicionado no abierto.
