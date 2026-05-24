# RUNBOOK — SCMVP Debug

## Ejecutar Mission Check (WSL)

1. source scripts/.env.local
2. ./scripts/mission.sh
3. unset PASSWORD

## Token (WSL) — extracción robusta (evitar TOKEN\_LEN=0)

Recomendado: extraer con sed.

TOKEN=$(curl -s -X POST "$BASE/api/auth/login"   
-H "Content-Type: application/json"   
-d '{"email":"admin@cumplimiento.com","password":"***REDACTED***"}'   
| sed -n 's/.*"token"\[ ]*:\[ ]*"(\[^"]*)".\*/\\1/p')

echo "TOKEN\_LEN=${#TOKEN}"

## Golden checks (mínimos)

* POST /api/auth/login -> token
* GET /api/admin/\_\_debug:

  * sin Authorization -> 401
  * Authorization: Bearer basura -> 401

* GET /api/admin/empresas -> 200 {"empresas":\[...]}
* GET /api/cliente/clientes?empresa\_id=32 -> 200 {"clientes":\[...]}

  * Nota: para admin/consultor, si no se envía empresa\_id el BE puede responder 400: {"error":"empresa\_id inválido"}

## Golden checks — registrar cliente PF (post-cambio BE)

Se espera:

* sin persona.curp -> 400 "persona.curp es obligatorio"
* con curp pero fecha ISO (YYYY-MM-DD) -> 400 "persona.fecha\_nacimiento inválida (AAAAMMDD)"
* sin apellido materno -> 400 "persona.apellido\_materno es obligatorio"
* con curp + AAAAMMDD + apellido materno -> 201

## Golden checks — editar cliente

* PUT /api/cliente/clientes/:id con datos\_completos -> 200 ok:true
* Validar persistencia con GET posterior

## Incidentes comunes

* “Service Suspended” en Render:

  * Verifica BASE; el backend actual es https://scmvp-1jhq.onrender.com
  * El backend anterior https://scmvp.onrender.com está suspendido

## Variables (scripts/.env.local)

* BASE="https://scmvp-1jhq.onrender.com"
* EMAIL="admin@cumplimiento.com"
* EMPRESA\_ID\_FOR\_CHECK="32" (usado por mission.sh para /api/cliente/clientes)





🔁 Roundtrip contrato: validar POST registrar-cliente y GET clientes/:id con marcadores en datos\_completos.



📦 Body size limit: JSON >2MB debe responder HTTP 413 (confirmado).



🧪 Checks mínimos: POST con tipo\_cliente inválido / datos\_completos no objeto devuelve HTTP 400 (mensaje actual por contacto.pais).



🧭 Estrategia: validaciones profundas viven en FE; BE mantiene validaciones mínimas y protección de tamaño.



📝 Nota: mejora de mensajes específicos de validación queda fuera del bloqueo actual.


### Runbook — migración PostgreSQL Render por expiración de trial

*Escenario*
- La instancia PostgreSQL anterior en Render expira por trial y se requiere continuidad operativa sin cambios de código.

*Pasos de alto nivel*
1. generar backup SQL de la DB anterior
2. preparar SQL para restore en nueva instancia
   - remover \restrict
   - remover \unrestrict
   - remover bloques ALTER DEFAULT PRIVILEGES si causan conflicto en restore
3. restaurar SQL en la nueva instancia
4. actualizar DATABASE_URL en el webservice Render
5. actualizar NEXT_PUBLIC_API_BASE_URL en Vercel si cambia el backend operativo consumido por frontend
6. verificar esquema/columnas de compatibilidad requeridas
7. validar backend:
   - login 200
   - endpoint protegido 401 sin token
   - endpoint protegido 200 con token
8. validar frontend/UI con carga de módulos principales

*Validación mínima esperada*
- POST /api/auth/login → HTTP 200
- GET /api/admin/empresas sin token → HTTP 401
- GET /api/admin/empresas con token → HTTP 200

*Pendientes recomendados*
- formalizar migración de esquema estable
- estandarizar parseo robusto de token en scripts
- evitar exposición de secrets en terminal/historial

### Nota operativa — migración 2026-05-10

- Backend operativo vigente después de la migración: https://scmvp-1jhq.onrender.com
- DB lógica vigente después de la migración: scmvp_xeu1
- En esta iteración también se actualizó NEXT_PUBLIC_API_BASE_URL en Vercel.
- La migración no requirió cambios de código.

### CONTROL-DOC-01 — checkpoint documental post-D2

Contexto estable:
- main post-D2: `3934929`
- D2 funcional: `6d9a074`
- D1 merge: `8398908`
- D1 funcional: `deccf4a`
- Backend vigente: `https://scmvp-1jhq.onrender.com`
- DB lógica vigente: `scmvp_xeu1`

Validación mínima post-D2 recomendada:
1. Login:
   - `POST /api/auth/login` → HTTP 200
2. PM impresión:
   - `GET /api/cliente/clientes/63` → HTTP 200
   - `/cliente/clientes/63/imprimir`
   - Confirmar razón social, país de constitución, domicilio, RFC empresa, giro mercantil, representante legal, sin JSON crudo y `window.print`.
3. PF regresión:
   - `/cliente/clientes/83/imprimir`
   - `/cliente/clientes/84/imprimir`
4. FID regresión visual:
   - `/cliente/clientes/73/imprimir`
   - `/cliente/clientes/74/imprimir`
5. Confirmar que no se abrió:
   - D3
   - C2C
   - C2D
   - PF/BC condicionado

Disciplina:
- Antes de abrir un frente funcional mayor posterior a D2, Control debe decidir documentación y tag estable.
- Propuesta de tag:
  - `stable-clientes-d2-20260523`
- No crear tag sin autorización expresa de Control.
