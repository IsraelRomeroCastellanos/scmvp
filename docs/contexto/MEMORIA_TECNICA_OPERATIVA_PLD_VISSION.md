# PLD VISSION / SCMVP

## Checkpoint de infraestructura operativa — 2026-08-06

- Backend vigente: https://scmvp-nxtj.onrender.com
- DB lógica vigente: `scmvp_q69o`.
- `scmvp-1jhq.onrender.com` y `scmvp_0plk` quedan clasificados como infraestructura histórica/anterior.
- Este cambio documental no acredita por sí mismo que las migraciones 002 o 003 hayan sido ejecutadas.
- La migración 002 continúa documentada como no autorizada y no ejecutada en producción, salvo evidencia posterior expresa.

## Memoria técnica operativa canónica

### Control del documento

| Dato | Valor confirmado |
|---|---|
| Última actualización | 2026-08-06 |
| Rama activa | `docs/actualizar-contexto-lote-2e1` |
| Commit base canónico | `de7dc9d` en `main`, `origin/main` y `origin/HEAD` |
| PR más reciente | `#105`, fusionado |
| Lote actual | Lotes 2A–2D y Lote 2E-1 completados, versionados y fusionados |
| Producción | La migración 002 no ha sido ejecutada |
| Próximo paso exacto | Definir el siguiente sublote desde `main` en `de7dc9d`, consultando primero estas fuentes canónicas y sin ejecutar las migraciones pendientes. |

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

- Rama documental actual: `docs/actualizar-contexto-lote-2e1`.
- Base canónica para el siguiente sublote: `de7dc9d`.
- `main`, `origin/main` y `origin/HEAD` quedaron alineados en `de7dc9d`.
- Rama de implementación del Lote 2E-1:
  `feat/lote-2e1-inspector-ooxml`.
- Commit de implementación: `17d0d25 feat: agregar inspector defensivo OOXML
  para matrices`.
- PR del Lote 2E-1: `#105`, fusionado correctamente.
- Merge commit en `main`: `de7dc9d`.
- PR del Lote 2A: `#94`, fusionado.
- PR del Lote 2B: `#95`, fusionado.
- PR del Lote 2C: `#96`, fusionado.
- PR del Lote 2D: `#97`, fusionado.
- Commit funcional del Lote 1: `4e2a0a4`.
- Los dos documentos canónicos de `docs/contexto/` están versionados y son el
  único alcance de esta actualización.
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
- El rechazo de alta usa HTTP `409` con el mensaje: “No es posible registrar
  clientes para esta empresa porque aún no cuenta con una matriz PT/GR
  publicada y activa.”

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

| Ruta actual | Roles/función confirmada | Estado del Lote 2 |
|---|---|---|
| `GET /api/admin/empresas` | Admin global; consultor limitado a su empresa. | Expone `tiene_matriz_publicada_activa`; el listado usa consulta agrupada y evita N+1. |
| `GET /api/admin/empresas/:id` | Admin o consultor autorizado; devuelve empresa y configuración PLD actual. | Expone `tiene_matriz_publicada_activa`. |
| `POST /api/admin/empresas` | Admin; crea empresa y actividades vulnerables en transacción. | Debe seguir permitiendo empresa sin matriz. |
| `PUT /api/admin/empresas/:id` | Admin; edita empresa y configuración autorizada. | No administra matriz actualmente. |
| `GET /api/cliente/mi-empresa` | Obtiene la empresa de `req.user.empresa_id`. | Expone `tiene_matriz_publicada_activa`. |
| `GET /api/cliente/clientes` | Lista con aislamiento por rol/empresa. | No es punto de creación; no requiere cambio para aplicar el bloqueo. |
| `GET /api/cliente/clientes/:id` | Consulta detalle bajo aislamiento vigente. | Fuera del cambio mínimo de creación. |
| `POST /api/cliente/registrar-cliente` | Admin, consultor o cliente; determina la empresa conforme al rol, valida su existencia y registra en transacción. | Valida dentro de la transacción y antes de insertar que exista matriz publicada y activa; rechaza con `409` cuando no existe. |
| `PUT /api/cliente/clientes/:id` | Edita bajo controles vigentes. | El bloqueo de edición no está aprobado; no debe asumirse. |

No existen endpoints de matrices. Cualquier ruta para cargar, validar,
previsualizar, publicar, activar o consultar versiones es una propuesta futura,
no una capacidad actual.

## 8. Servicios

### Existentes confirmados

- `backend/src/services/actividades-vulnerables.service.ts`: catálogo,
  asignación por empresa, selecciones PLD y validaciones relacionadas.
- `backend/src/services/auth.service.ts`: generación y verificación de JWT.
- `backend/src/services/matrices-empresa.service.ts`: servicio reutilizable
  incorporado en el Lote 2A; expone `hasPublishedActiveCompanyMatrix` y
  consulta por empresa con `estado_editorial = 'PUBLICADA'` y `activa = TRUE`.
- `backend/src/services/matriz-ooxml-inspector.service.ts`: frontera defensiva
  OOXML incorporada en el Lote 2E-1; expone
  `inspectMatrizXlsxOoxml(input: Buffer): Promise<MatrizOoxmlInspectionResult>`.

El inspector no procesa ni interpreta funcionalmente la matriz y no incorpora
rutas, controladores, frontend, persistencia, gestión editorial, motor de
cálculo ni almacenamiento. Esas capacidades siguen pendientes.

### Inspector defensivo OOXML del Lote 2E-1

- Se ejecuta dentro de `worker_threads.Worker`, con timeout total de 5 segundos
  y terminación real del Worker.
- Aplica límites de 5 MiB comprimidos, 256 entradas, 10 MiB reales por entrada,
  25 MiB reales acumulados y ratio máximo de compresión 20 tanto por entrada
  como acumulado.
- Drena realmente todas las entradas, calcula CRC32 incremental y lo compara
  contra los metadatos ZIP.
- Solo admite ZIP32 y métodos Store/Deflate. Rechaza ZIP64, multidisco,
  cifrado, flags no permitidos y métodos desconocidos.
- Valida EOCD, directorio central, cabeceras locales y descriptores de datos,
  además de la correspondencia central/local de nombres, flags, tamaños,
  método, CRC y offsets.
- Rechaza offsets duplicados, solapamientos, prefijos, huecos, regiones físicas
  no referenciadas y trailing data. Exige cobertura física continua desde el
  offset 0 hasta `centralOffset`.
- Usa `saxes` 5.0.1 con namespaces. Rechaza XML mal formado, NUL, UTF-8
  inválido, DTD, declaraciones de entidades, instrucciones de procesamiento y
  CDATA.
- Valida Content Types, relaciones raíz, relaciones del workbook y relaciones
  de hojas. Rechaza relaciones externas, duplicadas, desconocidas o huérfanas.
- Valida `sheet1.xml` y `sheet2.xml` mediante SAX y exige exactamente, en ese
  orden, `PERFIL TRANSACCIONAL` y `GRADO DE RIESGO DE CLIENTE`.
- Rechaza hojas ocultas o `veryHidden`, hojas físicas adicionales y partes no
  permitidas. Conserva soporte controlado para `sharedStrings`, `calcChain`,
  `theme`, `printerSettings` y `docProps` cuando sus relaciones son válidas.
- No usa ExcelJS, Express, disco, red ni base de datos.

Archivos versionados en el Lote 2E-1:

- `backend/package.json`
- `backend/package-lock.json`
- `backend/src/types/unzipper.d.ts`
- `backend/src/services/matriz-ooxml-inspector.service.ts`

`saxes` 5.0.1 quedó declarada como dependencia directa; `unzipper` 0.10.14
permanece fijada y sus tipos locales se ampliaron para los metadatos ZIP
utilizados.

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

El frontend consume y normaliza `tiene_matriz_publicada_activa` como
`true`/`false`/`null`. El listado de clientes bloquea `+ Registrar cliente`
cuando corresponde, conserva el acceso del admin con `empresaSel = all` y no
reemplaza el listado si falla la obtención del indicador. El formulario aplica
el bloqueo visualmente y también en `onSubmit`; el backend conserva la autoridad
final.

## 11. Pruebas y validación

### Existente confirmado

- No se detectaron archivos `test`/`spec` ni framework de pruebas configurado.
- Backend: `npm run build` ejecuta `tsc`; `npm start` ejecuta el compilado.
- Frontend: `npm run build`, `npm run lint`, `npm run dev` y `npm start`.

### Validaciones realizadas en los Lotes 2A–2D

- builds de frontend correctos;
- TypeScript sin errores;
- `git diff --check` limpio;
- revisiones independientes aprobadas;
- cambios limitados al alcance autorizado.

### Validaciones realizadas en el Lote 2E-1

- `git diff --check` correcto y `npm run build` de backend correcto.
- `PLANTILLA_SIMPLE_MATRIZ_PT_GR_EMPRESA.xlsx` y
  `docs/PT Y GR Caviace.xlsx` fueron aceptadas.
- Se rechazaron correctamente los casos negativos de entrada no ZIP, VBA,
  hoja oculta, hoja física adicional, relación externa, DTD en workbook, DTD
  en `sheet1`, XML mal formado en `sheet2`, relación duplicada, Content Type
  desconocido, trailing data, prefijo no referenciado, hueco entre entradas y
  bytes no referenciados antes del directorio central.
- Hubo revisiones independientes sucesivas con veredicto `NO APROBABLE`
  mientras existieron defectos bloqueantes; estos se corrigieron antes de
  staging. El veredicto independiente final fue `APROBABLE`, sin hallazgos
  críticos, altos ni medios que bloquearan staging, commit o PR.

Riesgos residuales bajos: endurecimiento opcional de la longitud exacta de
`sheetNames` en la respuesta del Worker; limpieza defensiva adicional en
`onError`; dependencia del comportamiento fijado de `unzipper` 0.10.14; y
validación estructural de hojas, no validación completa del esquema ni del
contenido funcional.

### Pruebas todavía pendientes

- pruebas controladas reales con empresa sin matriz y empresa con matriz
  `PUBLICADA` y activa;
- aislamiento: la empresa del token no puede sustituirse desde body/query;
- admin: selección válida de empresa y alcance global preservado;
- pruebas completas por rol y manipulación de `empresa_id`;
- regresión integral de PF, PM, Fideicomiso, Recursos de Terceros,
  `datos_completos` y `deepMerge`.
- pruebas automatizadas completas, cuya infraestructura sigue pendiente.

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

## 12. Estado de cierre del Lote 2

### Lotes cerrados

- **Lote 2A (`#94`):** servicio reutilizable y consulta por empresa de matriz
  `PUBLICADA` y activa.
- **Lote 2B (`#95`):** indicador `tiene_matriz_publicada_activa` en los tres
  endpoints de empresa; consulta agrupada para listados, sin N+1.
- **Lote 2C (`#96`):** validación de empresa y matriz dentro de la transacción,
  antes de insertar; respuesta `409`; backend como autoridad final.
- **Lote 2D (`#97`):** consumo y normalización del indicador, bloqueo en listado
  y formulario, preservación de `empresaSel = all` para admin y aislamiento de
  errores del indicador respecto del listado.
- **Lote 2E-1 (`#105`):** inspector defensivo OOXML previo a ExcelJS,
  versionado en `17d0d25` y fusionado en `main` mediante `de7dc9d`.

En el Lote 2E-1 no se ejecutaron SQL ni migraciones y no hubo conexión a
PostgreSQL. Los archivos untracked protegidos permanecieron intactos y fuera
del commit.

### Riesgo aceptado temporalmente

La comprobación del Lote 2C conserva un riesgo TOCTOU entre la validación y
los cambios concurrentes de estado de la matriz. Se acepta temporalmente hasta
que existan flujos coordinados de publicación y activación.

### Pendientes reales

- ejecución productiva de la migración 002, solo con autorización separada;
- migración `20260805_003_gestion_matrices_empresa`, planificada pero no
  implementada;
- gestión administrativa para crear borrador, cargar estructura, validar,
  publicar, activar/desactivar y sustituir versión;
- motor PT/GR y evaluación histórica;
- pruebas automatizadas completas;
- pruebas controladas reales con empresa sin matriz y con matriz activa;
- pruebas por rol, manipulación de `empresa_id` y regresión integral de PF,
  PM, Fideicomiso y Recursos de Terceros.

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
- Implementación o ejecución de la migración 003.
- Rutas, controladores, frontend, persistencia y procesamiento o interpretación
  funcional de la matriz.

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

El Lote 2E-1 está **COMPLETADO, versionado y fusionado**. El siguiente sublote
debe definirse desde `main` en `de7dc9d` y consultar primero esta memoria y el
resumen técnico ejecutivo como fuentes canónicas. La secuencia futura objetivo
continúa siendo:

```text
crear borrador -> cargar estructura -> validar -> publicar -> activar
```

Antes de programar deben inspeccionarse los contratos existentes y aprobarse
la API, los estados, los permisos, la auditoría y la estrategia transaccional.
La gestión de activar/desactivar y sustituir versiones debe quedar contemplada
en el contrato. No ejecutar la migración 002 ni declarar implementada la 003
sin autorización y evidencia separadas. Se mantienen las reglas permanentes:
un paso por vez, cambios con Codex, validación antes de avanzar, revisión
independiente, pruebas antes de commit, staging selectivo, PR obligatorio y
protección de archivos untracked.
