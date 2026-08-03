# PLD VISSION / SCMVP

## Memoria técnica operativa canónica

### Control del documento

| Dato | Valor confirmado |
|---|---|
| Última actualización | 2026-08-03 |
| Rama activa | `feat/fase-2-gestion-matriz-empresa` |
| Commit base | `dcceca0` |
| PR más reciente | `#92`, fusionado |
| Lote actual | Lote 2 — Gestión de matriz por empresa |
| Producción | La migración 002 no ha sido ejecutada |
| Próximo paso exacto | Aprobar el contrato técnico del Lote 2 y, después, implementar primero la consulta reutilizable de matriz `PUBLICADA` y activa por `empresa_id`, sin crear todavía endpoints de importación o publicación. |

## 1. Propósito y mantenimiento

Este documento es la fuente canónica para retomar el trabajo técnico y
operativo de PLD VISSION sin reconstruir el contexto mediante búsquedas
repetidas. Consolida solamente hechos comprobados en Git y en el código,
decisiones expresamente aprobadas, propuestas identificadas como tales y
pendientes reales.

Debe actualizarse cuando cambie cualquiera de estos elementos: rama, commit
base, PR, estado productivo, migraciones, rutas, contratos, reglas de negocio,
alcance, pruebas, riesgos o archivos protegidos. Cada actualización debe:

1. indicar fecha y estado Git comprobado;
2. contrastar documentación con código antes de afirmar capacidades;
3. distinguir `Confirmado`, `Propuesto` y `Pendiente de decisión`;
4. no presentar SQL versionado como esquema desplegado;
5. conservar las decisiones históricas que sigan vigentes;
6. no incluir secretos, cadenas de conexión, datos personales ni respaldos;
7. registrar cualquier diferencia entre documentación, código y producción.

## 2. Contrato permanente de trabajo

1. Trabajar un ticket `COR-XXX` o un lote expresamente autorizado a la vez.
2. No modificar código, datos o documentación fuera del alcance autorizado.
3. Identificar dependencias antes de cambiar código.
4. Confirmar rama y árbol de trabajo antes de modificar archivos.
5. No trabajar directamente en `main`; usar rama y PR.
6. No cambiar de rama, hacer commit o push sin autorización expresa.
7. No usar `git add .`; cualquier staging posterior debe ser selectivo.
8. No limpiar, agregar ni modificar archivos untracked ajenos al ticket.
9. No inventar reglas, tablas, endpoints, contratos ni estados productivos.
10. Si documentación y código difieren, reportarlo y resolverlo solo dentro del
    alcance autorizado.
11. No ejecutar migraciones ni SQL productivo sin autorización, respaldo
    restaurable, prueba desechable, VERIFY revisado y `ON_ERROR_STOP=1`.
12. No imprimir ni versionar credenciales, tokens, `DATABASE_URL` o secretos.
13. Después de cambios de código: revisar diff, ejecutar `git diff --check`,
    build, prueba del caso y regresión proporcional al riesgo.
14. Para este lote, validar backend y frontend y probar tanto empresa sin
    matriz activa como empresa con matriz activa.
15. No alterar contratos PF, PM, Fideicomiso, Recursos de Terceros,
    `datos_completos` ni `deepMerge` como efecto lateral.
16. Solicitar revisión independiente antes de cerrar, hacer commit o abrir PR.

## 3. Estado Git confirmado

- Rama activa: `feat/fase-2-gestion-matriz-empresa`.
- `HEAD` y commit base: `dcceca0`.
- `main` y `origin/main`: `dcceca0`, según el inventario operativo.
- PR más reciente: `#92`, fusionado.
- Commit funcional del Lote 1: `4e2a0a4`.
- Los dos documentos de `docs/contexto/` fueron colocados deliberadamente
  como untracked para esta actualización.
- Existen otros archivos untracked protegidos; no forman parte del lote y no
  deben limpiarse, modificarse ni agregarse.

## 4. Regla de negocio aprobada

- Una empresa puede crearse sin matriz PT/GR.
- Una empresa no puede crear clientes mientras no tenga una versión de matriz
  que cumpla simultáneamente:

```text
matriz_empresa_version.empresa_id = empresa autorizada
estado_editorial = PUBLICADA
activa = TRUE
```

- El bloqueo es obligatorio en backend y frontend.
- El backend es la autoridad: el frontend no sustituye la validación de
  `empresa_id` ni puede habilitar el alta por sí mismo.
- La validación debe aplicarse a la empresa efectiva derivada del contrato de
  autorización vigente: para consultor y cliente, la empresa autenticada; para
  admin, la empresa válida seleccionada conforme al endpoint actual.
- Mensaje funcional recomendado, todavía sujeto al contrato definitivo de
  errores: “No es posible registrar clientes para esta empresa porque aún no
  cuenta con una matriz PT/GR publicada y activa.”

## 5. Migraciones 001 y 002

### Confirmado

- `20260728_001_modelo_integral_actividades_vulnerables` está registrada en la
  base desplegada, conforme a la evidencia operativa documentada.
- `20260801_002_matrices_pt_gr_empresa` depende explícitamente de la 001.
- La 002 contiene UP, VERIFY y DOWN transaccionales y usa advisory lock.
- La 002 está versionada en el repositorio, pero **no está ejecutada en
  producción** y no tiene autorización productiva.
- La 002 no modifica `matrices_riesgo` ni
  `cliente_perfil_transaccional` y no incluye carga Excel, APIs, motor,
  evaluaciones históricas o frontend.

### Condición previa a cualquier despliegue

Probar UP → VERIFY → DOWN sobre una restauración desechable, revisar la
identidad de base/esquema y la evidencia, y obtener autorización explícita. El
DOWN solo admite rollback cuando las seis tablas están vacías.

## 6. Modelo definido por la migración 002

La siguiente estructura está confirmada en el archivo UP; no debe confundirse
con una estructura ya desplegada:

| Tabla | Responsabilidad definida |
|---|---|
| `matriz_empresa_version` | Cabecera de la versión por empresa, estado editorial, vigencia, auditoría y origen de nueva versión. |
| `matriz_criterio` | Criterios PT o GR de una versión. |
| `matriz_opcion` | Opciones y puntajes pertenecientes a un criterio. |
| `matriz_rango` | Rangos parametrizados y sus límites/resultados. |
| `matriz_regla` | Reglas por versión, marca o condición, prioridad y alto automático. |
| `matriz_archivo_fuente` | Metadatos y referencia del archivo original; no guarda el binario en PostgreSQL. |

Estados editoriales permitidos: `BORRADOR`, `VALIDADA`, `PUBLICADA`.

La vigencia es independiente mediante `activa`. El esquema exige que una
versión activa sea `PUBLICADA` y el índice único parcial permite como máximo
una activa por empresa. La inmutabilidad de una versión publicada deberá
aplicarse en runtime; la migración no crea triggers.

## 7. Rutas backend existentes y relevantes

Montajes confirmados en `backend/src/app.ts`:

- `/api/auth` → `auth.routes`.
- `/api/admin` → `admin.routes`.
- `/api/cliente` → `cliente.routes`.
- `/api/dashboard` → `dashboard.routes`.
- `/api/catalogos` → `catalogos.routes`.

Rutas existentes que forman puntos de integración del lote:

| Ruta actual | Roles/función confirmada | Brecha del Lote 2 |
|---|---|---|
| `GET /api/admin/empresas` | Admin global; consultor limitado a su empresa. | No informa todavía disponibilidad de matriz. |
| `GET /api/admin/empresas/:id` | Admin o consultor autorizado; devuelve empresa y configuración PLD actual. | No informa matriz activa. |
| `POST /api/admin/empresas` | Admin; crea empresa y actividades vulnerables en transacción. | Debe seguir permitiendo empresa sin matriz. |
| `PUT /api/admin/empresas/:id` | Admin; edita empresa y configuración autorizada. | No administra matriz actualmente. |
| `GET /api/cliente/mi-empresa` | Obtiene la empresa de `req.user.empresa_id`. | No informa matriz activa. |
| `GET /api/cliente/clientes` | Lista con aislamiento por rol/empresa. | No es punto de creación; no requiere cambio para aplicar el bloqueo. |
| `GET /api/cliente/clientes/:id` | Consulta detalle bajo aislamiento vigente. | Fuera del cambio mínimo de creación. |
| `POST /api/cliente/registrar-cliente` | Admin, consultor o cliente; determina la empresa conforme al rol y registra en transacción. | Falta rechazar antes de insertar cuando no exista matriz publicada y activa. |
| `PUT /api/cliente/clientes/:id` | Edita bajo controles vigentes. | El bloqueo de edición no está aprobado; no debe asumirse. |

No existen endpoints de matrices. Cualquier ruta para cargar, validar,
previsualizar, publicar, activar o consultar versiones es una propuesta futura,
no una capacidad actual.

## 8. Servicios

### Existentes confirmados

- `backend/src/services/actividades-vulnerables.service.ts`: catálogo,
  asignación por empresa, selecciones PLD y validaciones relacionadas.
- `backend/src/services/auth.service.ts`: generación y verificación de JWT.

### Propuesta del Lote 2

- `backend/src/services/matrices-empresa.service.ts`: nombre propuesto, no
  existente. Su primera responsabilidad mínima sería consultar, mediante
  parámetros, si una empresa tiene una versión `PUBLICADA` y activa y exponer
  una función reutilizable para rutas de empresa y alta de cliente.

Crear el servicio, sus firmas, DTO y errores requiere aprobación del contrato
técnico. No debe incorporar todavía importación Excel, publicación, motor de
cálculo ni almacenamiento.

## 9. Contrato autenticado y auditoría

`Express.AuthenticatedUser` está confirmado como unión discriminada:

- admin: `id: number`, `email: string`, `rol: 'admin'`, `empresa_id: null`;
- consultor o cliente: `id: number`, `email: string`,
  `rol: 'consultor' | 'cliente'`, `empresa_id: number`.

`req.user` es opcional en el tipo Express y queda poblado por
`authenticate`. El middleware valida rol y exige `empresa_id` numérico,
entero y positivo para consultor/cliente; admin requiere `empresa_id = null`.

La migración 002 define `creada_por`, `validada_por`, `publicada_por` y
`cargado_por` como FKs a `usuarios`. **Propuesta:** las operaciones futuras
deben tomar esos identificadores exclusivamente de `req.user.id`, nunca del
body o query. Actualmente no hay rutas que escriban esos campos, por lo que el
flujo de auditoría funcional sigue pendiente.

## 10. Inventario frontend relevante

### Confirmado

- `frontend/src/app/admin/crear-empresa/page.tsx`
- `frontend/src/app/admin/editar-empresa/[id]/page.tsx`
- `frontend/src/app/admin/empresas/page.tsx`
- `frontend/src/app/cliente/clientes/page.tsx`
- `frontend/src/app/cliente/registrar-cliente/ClientPage.tsx`
- `frontend/src/app/cliente/registrar-cliente/RegistrarClienteClientOnly.tsx`
- `frontend/src/app/cliente/registrar-cliente/page.tsx`
- `frontend/src/app/cliente/registrar-cliente/validate.ts`
- `frontend/src/lib/api.ts`

`frontend/src/lib/api.ts` ya encapsula las llamadas existentes para listar,
consultar, crear y editar empresas, obtener la empresa de sesión y registrar
clientes. No contiene funciones de matrices.

El formulario de cliente resuelve la empresa según el rol y consume la
configuración PLD existente. Todavía no recibe ni aplica un indicador de matriz
PT/GR activa.

### Propuesto

Incorporar en los DTO existentes un indicador mínimo y no sensible de
disponibilidad, y deshabilitar el acceso/envío del alta cuando sea falso,
manteniendo al backend como control definitivo. El nombre exacto del campo y
la UX requieren aprobación.

## 11. Pruebas y validación

### Existente confirmado

- No se detectaron archivos `test`/`spec` ni framework de pruebas configurado.
- Backend: `npm run build` ejecuta `tsc`; `npm start` ejecuta el compilado.
- Frontend: `npm run build`, `npm run lint`, `npm run dev` y `npm start`.

### Pruebas faltantes

- servicio: empresa sin versión utilizable y empresa con versión utilizable;
- backend: rechazo del alta sin matriz antes de cualquier inserción;
- backend: alta permitida con matriz `PUBLICADA` y activa;
- aislamiento: la empresa del token no puede sustituirse desde body/query;
- admin: selección válida de empresa y alcance global preservado;
- frontend: botón/flujo bloqueado y mensaje correcto;
- regresión: creación de empresa sin matriz continúa permitida;
- regresión de contratos PF, PM, Fideicomiso, Recursos de Terceros,
  `datos_completos` y `deepMerge`.

### Validación mínima del lote

1. `git status --short`, revisión completa de `git diff` y
   `git diff --check`.
2. `npm run build` en backend.
3. `npm run build` y `npm run lint` en frontend.
4. Prueba controlada con empresa sin matriz activa: rechazo sin insertar.
5. Prueba controlada con empresa con matriz activa: alta conservada.
6. Pruebas por rol y manipulación de `empresa_id`.
7. Regresión de creación/edición de empresa y captura vigente.
8. Revisión independiente antes de commit/PR.

## 12. Alcance del Lote 2

### Confirmado

- Regla: empresa sin matriz puede existir, pero no puede crear clientes.
- Condición utilizable: misma empresa, `PUBLICADA` y `activa = TRUE`.
- Bloqueo obligatorio en backend y frontend.
- La migración 002 no se ejecuta en este lote sin autorización separada.

### Propuesto

- Crear una consulta reutilizable de matriz utilizable por `empresa_id`.
- Exponer un indicador mínimo en los DTO actuales de empresa.
- Aplicar el bloqueo en `POST /api/cliente/registrar-cliente` dentro del flujo
  transaccional y antes de insertar datos.
- Reflejar el bloqueo en listado/selección de empresa y formulario de alta.
- Mantener sin cambios la creación de empresas.

### Pendiente de decisión

- nombre y forma exactos del indicador en los DTO;
- código HTTP, código de error y texto definitivo del bloqueo;
- si el indicador incluye solo booleano o también metadatos mínimos de versión;
- alcance exacto de una primera API administrativa de matrices;
- contrato de carga, validación, vista previa, publicación y activación;
- estrategia de pruebas automatizadas sin infraestructura existente;
- momento autorizado para probar y aplicar la migración 002.

## 13. Fuera de alcance

- Motor PT/GR y evaluaciones históricas.
- Clasificaciones globales y marcas pendientes.
- Catálogos GAFI o regímenes fiscales preferentes.
- Correo y notificaciones.
- Proveedor de almacenamiento y cifrado del Excel.
- Reglas nuevas de Fideicomiso.
- Cambios a `matrices_riesgo` o `cliente_perfil_transaccional`.
- Cambios a `usuarios.empresa_id` o consultor obligatorio por empresa.
- Alteraciones a PF, PM, Fideicomiso, Recursos de Terceros,
  `datos_completos` o `deepMerge`.
- Ejecución productiva de la migración 002.

## 14. Archivos protegidos y reglas Git

No tocar, limpiar ni agregar:

- `cat_actividades_economicas.csv`
- `cat_codigos_postales.csv`
- `cat_giros_mercantiles.csv`
- `cat_paises.csv`
- cualquier otro `cat_*.csv`
- cualquier archivo Excel, incluidas plantillas y matrices de referencia
- `docs/auditorias/`
- los demás documentos Markdown untracked
- backups, volcados o archivos con secretos
- `datos_completos`, `deepMerge` y contratos PF/PM/Fideicomiso/Recursos de
  Terceros fuera de un alcance posterior explícito

Reglas Git: no usar `git add .`, no agregar untracked ajenos, no limpiar el
árbol, no cambiar de rama, no hacer commit ni push sin autorización y revisar
siempre el conjunto exacto de archivos antes de staging selectivo.

## 15. Próximo punto de trabajo

Obtener aprobación de las decisiones pendientes del contrato mínimo. Con esa
aprobación, el primer cambio debe limitarse a una consulta backend reutilizable
que determine si `empresa_id` tiene matriz `PUBLICADA` y activa. Después se
integrará, en cambios pequeños y verificables, al DTO de empresa y al bloqueo
de `POST /api/cliente/registrar-cliente`; el frontend se ajustará al contrato
resultante. No crear endpoints de publicación ni ejecutar la migración 002 en
ese primer paso.
