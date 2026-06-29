# RUNBOOK — SCMVP Debug y QA segura

<!-- RELEASE-CHECKPOINT-01:START -->
## RELEASE-CHECKPOINT-01 — runbook estable de autorización

**Fecha:** 2026-06-28
**Frontend Production:** https://scmvp.vercel.app
**Backend vigente:** https://scmvp-nxtj.onrender.com
**Main estable de referencia:** `2d2d0f795a0991eec9773a75281e639ccd1317d0`

### Entorno obligatorio para QA web

Toda prueba de navegador de este checkpoint debe realizarse en Production:

- Inicio de sesión: https://scmvp.vercel.app/login
- Frontend base: https://scmvp.vercel.app

No usar Preview, localhost, `127.0.0.1` ni la URL directa de Render para pruebas de interfaz.

### Limpieza segura de sesión

Ejecutar en DevTools → Console estando dentro de `https://scmvp.vercel.app`:

```javascript
(() => {
  for (const key of ['token', 'authToken', 'accessToken', 'user']) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }

  for (const name of ['token', 'user']) {
    document.cookie =
      `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }

  location.replace('/login');
})();
```

Confirmar después que la dirección exacta sea:

`https://scmvp.vercel.app/login`

No documentar, copiar ni conservar contraseñas, tokens o secretos.

### Smoke mínimo por rol

#### Administrador

- https://scmvp.vercel.app/admin/empresas
  - consulta permitida;
  - Crear Empresa visible;
  - Editar visible;
  - Administración de usuarios visible.
- https://scmvp.vercel.app/cliente/clientes
  - Registrar Cliente visible;
  - Editar visible.

#### Consultor

- https://scmvp.vercel.app/admin/empresas
  - consulta permitida;
  - Crear Empresa oculto;
  - Editar Empresa oculto;
  - Administración de usuarios oculta.
- https://scmvp.vercel.app/cliente/clientes
  - consulta permitida;
  - Registrar Cliente oculto;
  - Editar Cliente visible.
- https://scmvp.vercel.app/cliente/registrar-cliente
  - redirección esperada a `/cliente/clientes`.

#### Cliente

- https://scmvp.vercel.app/cliente/clientes
  - listado limitado a su empresa;
  - Registrar Cliente visible;
  - Editar Cliente visible;
  - administración de empresas y usuarios oculta.

### Precedencia de autorización backend

1. Sin sesión o sin token válido: `401`.
2. Sesión válida con rol no autorizado: `403`.
3. Solo después de autenticar y autorizar deben ejecutarse validaciones del recurso o del cuerpo.

Comprobaciones negativas read-only:

- `GET /api/admin/empresas`
  - anónimo: `401`;
  - admin: `200`;
  - consultor: `200`;
  - cliente: `403`.
- `POST /api/cliente/registrar-cliente`
  - anónimo: `401`;
  - consultor: `403`.
- `PUT /api/cliente/clientes/999999999`
  - anónimo: `401`.

### Rutas legacy

- https://scmvp.vercel.app/clientes
  - `307` a `/cliente/clientes`.
- https://scmvp.vercel.app/registrar-cliente
  - `307` a `/cliente/registrar-cliente`.

### Contención obligatoria

Durante auditorías read-only:

- POST de negocio: 0.
- PUT: 0.
- PATCH: 0.
- DELETE: 0.
- Respuestas 2xx de escritura: 0.
- No pulsar Crear, Editar, Guardar, Registrar, Activar o Desactivar.
- Login y logout están permitidos.
- Ante cualquier escritura exitosa, detener la prueba.

### IDs protegidos

No utilizar para pruebas de escritura:

- 67;
- 99;
- 100;
- 101.

### QA basada en riesgo

Cuando local ya validó exhaustivamente el mismo commit y Preview o Production no cambian middleware, autorización, páginas canónicas ni UI responsive:

- comprobar SHA y deployment;
- automatizar HTTP y rutas;
- verificar ausencia de contenido legacy;
- ejecutar smoke visual mínimo;
- no repetir matrices redundantes ni pruebas tablet/móvil sin una causa de riesgo.

### Artefactos históricos protegidos

No limpiar, restaurar, aplicar ni eliminar:

- `backend/src/routes/cliente.routes.ts.bak_*`;
- `backups-previous/`;
- `backups/`;
- `db/`;
- `docs/SCMVP_BOOTSTRAP_ACTUAL_2026-06-01.md`;
- stash `On main: resguardo local no-clientes-v2 backend tracked`.

<!-- RELEASE-CHECKPOINT-01:END -->

Última consolidación: 2026-06-19
Main de referencia: `3492522ec4bb1c9894c50b55983e2e56e8edee4c`

## URLs vigentes

- Frontend Production: https://scmvp.vercel.app
- Backend Production: https://scmvp-nxtj.onrender.com
- Marca visible: Shield by Vission

## Comprobaciones mínimas

- `POST /api/auth/login` devuelve token y usuario.
- `GET /api/admin/empresas` responde para roles autorizados.
- `GET /api/cliente/clientes` lista clientes conforme al rol y filtro vigente.
- `GET /api/cliente/clientes/:id` devuelve el cliente y `datos_completos`.
- `POST /api/cliente/registrar-cliente` registra PF, PM o FID bajo el contrato vigente.
- `PUT /api/cliente/clientes/:id` actualiza mediante mezcla profunda de datos.

No guardar tokens, contraseñas ni secretos en documentación, evidencia o commits.

## Contrato canónico de Beneficiario Controlador

Escritura vigente:

- `beneficiarios_controladores_aplica`
- `beneficiarios_controladores`

Reglas de QA:

- PF: puede aplicar o no según manifestación.
- PM y FID: BC obligatorio.
- Cada BC es Persona Física.
- RFC/CURP del BC no puede autocoincidir con el cliente.
- Registrar y Editar no deben emitir contratos BC legacy.
- Editar puede leer temporalmente estructuras legacy, pero siempre escribe el contrato canónico.
- Impresión debe mostrar una sola sección BC.

Claves legacy o retiradas que no deben reaparecer en payloads vigentes:

- `duenos_beneficiarios`
- `BeneficiarioControlador`
- `recursos_terceros`
- `recursos_terceros_aplica`
- `terceros`
- `terceros_info`

## Edición PF vigente

Campos editables:

- nombres y apellidos;
- fecha de nacimiento;
- RFC y CURP;
- país de nacimiento;
- actividad económica principal;
- identificación vigente.

Campos derogados que no deben aparecer ni emitirse:

- `estado_civil`
- `regimen_matrimonial`
- `ocupacion`
- `profesion`
- `actividad_profesional`

## Protocolo de QA sin escrituras

1. Usar un interceptor que bloquee `POST`, `PUT`, `PATCH` y `DELETE`.
2. Permitir únicamente `GET`.
3. Reinstalar el interceptor después de cada login, navegación, recarga o cambio de cliente.
4. Ejecutar un precheck que confirme:
   - interceptor instalado;
   - ruta actual correcta;
   - contador de escrituras reales igual a cero.
5. Validar el payload interceptado antes de continuar.
6. Detener inmediatamente si se detecta una escritura real.

Conteos esperados en QA segura:

- POST reales: 0.
- PUT reales: 0.
- PATCH reales: 0.
- DELETE reales: 0.
- Clientes creados, modificados o eliminados: 0.

## IDs protegidos

- `67`: no usar para QA sin autorización expresa.
- `99`, `100`, `101`: no consultar, modificar ni eliminar.

Usar otros registros controlados y autorizados. En el cierre PF-EDIT-GENERAL-01 se utilizaron `104` y `98` con escrituras interceptadas.

## Incidencia cliente 67

- PUT real confirmado: `2026-06-16T06:03:52.87196317Z`.
- Endpoint: `/api/cliente/clientes/67`.
- Alcance histórico indeterminado.
- Estado posterior estructuralmente válido.
- No restaurado ni modificado nuevamente.
- Evidencia fuera del repositorio.
- SHA-256: `1a520ca596c87724acd26eeb44200ac3e1a278338b4eb1776472a62b59e418f3`.

No incorporar datos personales del cliente en reportes.

## Flujo Git seguro

Antes de un frente:

```bash
cd ~/scmvp
git switch main
git fetch --prune origin
git pull --ff-only origin main
git status --short
```

Reglas:

- No usar `reset`, `clean` ni checkout destructivo sobre archivos sin autorización.
- No aplicar, eliminar ni modificar el stash histórico.
- No incorporar untracked históricos a commits funcionales o documentales.
- Agregar explícitamente solo los archivos autorizados.
- Ejecutar `git diff --check` antes del commit.

## Estado Git conocido

Main consolidado: `3492522`.

Untracked históricos conocidos:

- seis respaldos de `backend/src/routes/cliente.routes.ts`;
- `backups-previous/`;
- `backups/`;
- `db/`;
- `docs/SCMVP_BOOTSTRAP_ACTUAL_2026-06-01.md`.

Stash histórico: conservar intacto.

## Incidentes comunes

### Token ausente o inválido

- Limpiar únicamente `token`, `authToken` y `accessToken` de `localStorage` y `sessionStorage`.
- Volver a iniciar sesión.
- No pegar tokens en chats, documentos o commits.

### Production no corresponde al commit esperado

- Confirmar el SHA del deployment en Vercel.
- No ejecutar smoke sobre un Preview o Production anterior.
- No realizar deploy manual salvo autorización expresa.

### Interceptor equivocado

- Confirmar el nombre y las funciones expuestas por el interceptor antes de guardar.
- Recargar la ruta para retirar interceptores de una sesión anterior.
- Reinstalar el interceptor autorizado y ejecutar el precheck.
