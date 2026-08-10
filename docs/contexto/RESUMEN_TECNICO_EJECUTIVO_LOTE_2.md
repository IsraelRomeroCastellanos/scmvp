# PLD VISSION / SCMVP

## Checkpoint de infraestructura operativa — 2026-08-09

- Backend vigente: https://scmvp-nxtj.onrender.com
- DB lógica vigente: `scmvp_q69o`.
- `scmvp-1jhq.onrender.com` y `scmvp_0plk` quedan clasificados como infraestructura histórica/anterior.
- Este cambio documental no acredita por sí mismo que las migraciones 002 o 003 hayan sido ejecutadas.
- La migración 002 continúa documentada como no autorizada y no ejecutada en producción, salvo evidencia posterior expresa.

## Resumen técnico ejecutivo — Lote 2: Gestión de matriz por empresa

### Situación actual

- Rama final: `main`.
- Base canónica: `e87ba26dc365903189e96247373e2b3ae3a791e4`; `main`,
  `origin/main` y `origin/HEAD` están alineados en ese commit.
- El Lote 2E-2 se implementó en `feat/lote-2e2-parser-matriz-excel`, commit
  previo al merge `f43a1a0`.
- El PR `#107`, fusionado mediante `23fa6f3`, se conserva como cierre funcional
  histórico del parser V1 de 2E-2; no representa el HEAD actual.
- PR más reciente: `#112`, crear borrador de matriz por empresa, implementado
  en `90850b5` y fusionado mediante el HEAD canónico actual. Agregó únicamente
  `backend/src/routes/admin.routes.ts` y
  `backend/src/services/matrices-empresa.service.ts`.
- El PR `#111`, fusionado mediante `059e472`, se conserva como cierre histórico
  documental previo.
- El Lote 2E-1 se implementó en `feat/lote-2e1-inspector-ooxml`, commit
  `17d0d25 feat: agregar inspector defensivo OOXML para matrices`.
- PR del Lote 2E-1: `#105`, fusionado correctamente; merge commit `de7dc9d`.
- La migración 001 está registrada en la base desplegada.
- Las migraciones 002 y 003 están versionadas, pero **no se han ejecutado ni
  aplicado en PostgreSQL o producción**.
- El backend ya gestiona empresas, configuración PLD y clientes con aislamiento
  por empresa.
- Los Lotes 2A, 2B, 2C y 2D están implementados y fusionados mediante los PR
  `#94`, `#95`, `#96` y `#97`, respectivamente.
- Existe consulta reutilizable, indicador en los DTO, bloqueo en backend y
  frontend, inspector defensivo OOXML y parser funcional V1 de matrices PT/GR
  por empresa. Crear borrador ya está implementado; no existe todavía gestión
  administrativa completa de matrices.

### Objetivo

El objetivo de los Lotes 2A–2D quedó cerrado: hacer exigible la condición de
matriz utilizable antes del alta de clientes. El Lote 2E-1 también quedó
completado, versionado y fusionado como frontera defensiva previa a ExcelJS. El
Lote 2E-2 quedó cerrado y aprobado con el parser `PT_GR_EMPRESA_V1`. El
siguiente sublote debe definirse sin declarar como existentes
el motor PT/GR, la evaluación histórica ni un despliegue productivo dependiente
de las migraciones 002 y 003. La migración 003 y crear borrador también están
cerrados.

### Regla aprobada

La empresa puede crearse sin matriz. No puede crear clientes hasta tener una
versión de su propia empresa con:

```text
estado_editorial = PUBLICADA
activa = TRUE
```

El bloqueo existe en backend y frontend. El backend es la autoridad y la
empresa autorizada no puede sustituirse mediante body, query o controles del
navegador.

### Infraestructura existente confirmada

- Migración 002 con seis tablas definidas:
  `matriz_empresa_version`, `matriz_criterio`, `matriz_opcion`,
  `matriz_rango`, `matriz_regla` y `matriz_archivo_fuente`.
- Estados editoriales: `BORRADOR`, `VALIDADA`, `PUBLICADA`.
- Máximo una matriz activa por empresa mediante índice único parcial.
- Rutas actuales de empresas:
  `GET /api/admin/empresas`, `GET /api/admin/empresas/:id`,
  `POST /api/admin/empresas`, `PUT /api/admin/empresas/:id`.
- Rutas de integración con clientes:
  `GET /api/cliente/mi-empresa` y
  `POST /api/cliente/registrar-cliente`.
- Servicios existentes: `actividades-vulnerables.service.ts` y
  `auth.service.ts`.
- Servicio reutilizable `backend/src/services/matrices-empresa.service.ts`,
  con `hasPublishedActiveCompanyMatrix` y consulta por empresa con
  `estado_editorial = 'PUBLICADA'` y `activa = TRUE`.
- Indicador `tiene_matriz_publicada_activa` expuesto en
  `GET /api/admin/empresas`, `GET /api/admin/empresas/:id` y
  `GET /api/cliente/mi-empresa`; el listado usa consulta agrupada para evitar
  N+1.
- `POST /api/cliente/registrar-cliente` valida la existencia de la empresa y,
  dentro de la transacción y antes de insertar, exige matriz publicada y activa.
- El frontend normaliza el indicador como `true`/`false`/`null`, bloquea el
  acceso desde el listado y el formulario, conserva `empresaSel = all` para
  admin y evita que los errores del indicador sustituyan el listado.
- `req.user` contiene `id`, `email`, `rol` y `empresa_id`, con contrato distinto
  para admin frente a consultor/cliente.
- `exceljs` y `express-fileupload` figuran como dependencias, pero esto no
  demuestra un flujo de carga de matrices implementado.
- `backend/src/services/matriz-ooxml-inspector.service.ts` expone
  `inspectMatrizXlsxOoxml(input: Buffer): Promise<MatrizOoxmlInspectionResult>`.
- `backend/src/services/matriz-excel-parser.service.ts` implementa el parser
  funcional `PT_GR_EMPRESA_V1`: ejecuta previamente el inspector OOXML y lee,
  valida y normaliza la configuración de la plantilla a una estructura tipada;
  no evalúa clientes ni constituye el motor final de evaluación.

### Lotes cerrados

- **2A — PR #94:** servicio y consulta reutilizable.
- **2B — PR #95:** indicador en los tres endpoints y consulta agrupada sin N+1.
- **2C — PR #96:** validación transaccional previa a la inserción y respuesta
  `409` con el mensaje: “No es posible registrar clientes para esta empresa
  porque aún no cuenta con una matriz PT/GR publicada y activa.”
- **2D — PR #97:** bloqueo defensivo de frontend en listado y formulario.
- **2E-1 — PR #105:** inspector defensivo OOXML, commit `17d0d25`, fusionado
  en `main` mediante `de7dc9d`.
- **2E-2 — PR #107:** parser funcional V1 de matrices PT/GR por empresa,
  implementado en `f43a1a0` y fusionado en `main` mediante `23fa6f3`.
  Estado definitivo: **CERRADO Y APROBADO**.
- **Sublote posterior — PR #109:** migración
  `20260805_003_gestion_matrices_empresa`, implementada en `59e141b` y
  fusionada en `main` mediante `763811b9f2be2e8f339802256457bfd0907126a9`.
  Revisión independiente estática final: `APROBABLE`. No hubo ejecución SQL
  ni prueba real contra PostgreSQL.
- **Crear borrador por empresa — PR #112:** endpoint
  `POST /api/admin/empresas/:empresaId/matrices`, implementado en `90850b5` y
  fusionado mediante `e87ba26dc365903189e96247373e2b3ae3a791e4`. Solo admin;
  crea BORRADOR vacío, inactivo, con revisión 1, siguiente número de versión,
  una sola pendiente, idempotencia, lock transaccional y auditoría.

### Cierre técnico de crear borrador por empresa

El endpoint toma `empresaId` del path y el actor de `req.user.id`. Exige
`Idempotency-Key` de 16 a 128 caracteres ASCII visibles y usa la operación
`CREAR_BORRADOR`, auditoría `BORRADOR_CREADO` y estados idempotentes
`EN_PROCESO -> COMPLETADA`, sin persistir `FALLIDA`. El request canónico es
`{"operacion":"CREAR_BORRADOR","empresa_id":<empresaId>,"actor_usuario_id":<actorId>}`.
El ámbito de la clave es empresa + actor + operación; igual clave y request
distinto en el mismo ámbito produce `409 MATRIZ_IDEMPOTENCIA_CONFLICTO`.

Bajo `pg_catalog.pg_advisory_xact_lock(2205, empresa_id)`, la transacción
comprueba empresa y pendiente, calcula `MAX(numero_version)+1`, crea la versión
y su auditoría, y exige exactamente una transición idempotente final. Una fila
idempotente expirada a los 7 días se elimina transaccionalmente y se trata como
nueva; la auditoría nunca se elimina. El replay reproduce la respuesta sin
segunda versión ni segunda auditoría. `revision` BIGINT se normaliza a número
seguro y `creada_en` a ISO.

Errores aprobados: `400 MATRIZ_IDEMPOTENCY_KEY_REQUERIDA`, `400
MATRIZ_IDEMPOTENCY_KEY_INVALIDA`, `404 MATRIZ_EMPRESA_NO_ENCONTRADA`, `409
MATRIZ_PENDIENTE_EXISTENTE`, `409 MATRIZ_IDEMPOTENCIA_CONFLICTO`, `409
MATRIZ_CONFLICTO_CONCURRENCIA` y `500 MATRIZ_CREAR_BORRADOR_ERROR`.

Build backend, `git diff --check`, pruebas con `PoolClient` simulado y regresión
fueron correctos; revisión independiente final `APROBABLE`. No hubo conexión ni
prueba real contra PostgreSQL ni despliegue productivo. Hallazgo residual bajo:
un `empresaId` mayor a 2147483647 puede responder `500` en vez de `404`.

### Cierre técnico del sublote de migración 003

La 003 complementa y no reemplaza la 002. Versiona el XLSX íntegro en
`matriz_archivo_fuente.contenido BYTEA`, endurece metadatos, exige `revision
BIGINT` positiva y confina `version_origen_id` a la misma empresa mediante
`version_origen_empresa_id`. Agrega actores y fechas de activación/desactivación,
una sola versión pendiente `BORRADOR`/`VALIDADA` por empresa, idempotencia y
auditoría append-only protegida mediante trigger contra `UPDATE`, `DELETE` y
`TRUNCATE`, preservando la única activa definida por la 002.

`correlation_id` y `request_id` son campos separados, opcionales y limitados a
128 caracteres ASCII visibles. UP tiene preflight estricto contra el contrato
físico de la 002 y aborta ante filas previas incompatibles en
`matriz_archivo_fuente`; VERIFY es read-only y comprueba BIGSERIAL, constraints,
índices, FKs y SHA-256 cuando `pgcrypto.digest` está disponible. Si hay archivos
y no puede acreditarse SHA-256, VERIFY falla. DOWN es conservador. Los
`GRANT`/`REVOKE` nominales no se cierran hasta identificar los roles efectivos
de PostgreSQL.

### Cierre técnico del Lote 2E-2

La versión lógica es `PT_GR_EMPRESA_V1`. Exige exactamente las hojas `PERFIL
TRANSACCIONAL` y `GRADO DE RIESGO DE CLIENTE`, resueltas dinámicamente por
nombre → `r:id` → relationship → worksheet part. No congela `sheetId`, orden
interno ni nombres físicos como `sheet1.xml` o `sheet2.xml`.

El contrato físico es exhaustivo: `A1:G19` en PT y `A1:H19` en GR, conjunto
exacto de merges V1, mapa completo de celdas permitidas y vacíos obligatorios.
`A1` y `A2` requieren texto empresarial no congelado; `B3`, `B7`, `B11` y
`B15` son `Descripción`. Las valoraciones literales son `C=3`, `D=2`, `E=1`:
cada fila contiene exactamente una valoración y cada bloque distribuye una vez
los valores `1`, `2` y `3`.

PT tiene cuatro bloques, tres respuestas por bloque y tres resultados. GR tiene
cuatro criterios, tres condiciones por criterio y tres resultados, además de
una indicación KYC funcional por criterio. Los rangos cubren exactamente los
enteros `4..12`, sin huecos ni solapes. `C19:E19` pueden estar vacías o contener
cualquier fórmula XLSX válida; estas fórmulas son visuales, ignoradas y no
autoritativas. Fuera de esas celdas las fórmulas están prohibidas. El contrato
V1 establece que el futuro motor de evaluación deberá calcular PT y GR
independientemente de esas fórmulas, sumar las cuatro valoraciones seleccionadas
y comparar el total contra los rangos configurados; el parser no selecciona
respuestas o condiciones, no realiza ese cálculo ni determina el resultado de
un cliente.

El inspector rechaza contenido OOXML independiente en secundarias de merges,
aunque permite una secundaria con solo estilo. Toda celda SpreadsheetML `<c>`
requiere referencia `r` explícita, única, sin namespace y A1 canónica; las
coordenadas implícitas se rechazan y los límites son `A:XFD` y `1:1048576`.
Se preservaron las protecciones de ZIP, CRC, ratios, paths, relationships,
content types, macros, VML y timeout del worker.

Archivos integrados: `backend/src/services/matriz-excel-parser.service.ts`,
`backend/src/services/matriz-ooxml-inspector.service.ts` y
`docs/contexto/CONTRATO_PLANTILLA_MATRIZ_PT_GR_V1.md`.

### Cierre técnico del Lote 2E-1

El inspector se ejecuta en `worker_threads.Worker`, con timeout total de 5
segundos y terminación real. Limita el archivo a 5 MiB comprimidos, 256
entradas, 10 MiB reales por entrada, 25 MiB reales acumulados y ratio máximo
20 por entrada y acumulado. Drena todas las entradas y valida CRC32 incremental.

Solo admite ZIP32 con Store/Deflate. Valida EOCD, directorio central, cabeceras
locales, descriptores de datos y correspondencia de nombres, flags, tamaños,
métodos, CRC y offsets. Rechaza ZIP64, multidisco, cifrado, flags o métodos no
permitidos, offsets duplicados, solapamientos, prefijos, huecos, regiones no
referenciadas y trailing data; exige cobertura continua desde 0 hasta
`centralOffset`.

Usa `saxes` 5.0.1 con namespaces y rechaza XML mal formado, NUL, UTF-8
inválido, DTD, declaraciones de entidades, instrucciones de procesamiento y CDATA. Valida
Content Types y relaciones raíz, de workbook y de hojas; rechaza relaciones
externas, duplicadas, desconocidas o huérfanas. Mediante SAX exige exactamente
`PERFIL TRANSACCIONAL` y `GRADO DE RIESGO DE CLIENTE`; la resolución física
dinámica incorporada en 2E-2 evita depender del orden o de `sheet1.xml` y
`sheet2.xml`. También rechaza hojas ocultas o `veryHidden`,
hojas físicas adicionales y partes no permitidas, con soporte controlado para
`sharedStrings`, `calcChain`, `theme`, `printerSettings` y `docProps` cuando
las relaciones son válidas. No usa ExcelJS, Express, disco, red ni base de
datos.

Archivos versionados: `backend/package.json`, `backend/package-lock.json`,
`backend/src/types/unzipper.d.ts` y
`backend/src/services/matriz-ooxml-inspector.service.ts`. `saxes` 5.0.1 es
dependencia directa, `unzipper` 0.10.14 permanece fijada y sus tipos locales
se ampliaron para los metadatos ZIP utilizados.

El backend conserva la autoridad final. El riesgo TOCTOU se acepta
temporalmente hasta que existan flujos coordinados de publicación y activación.

### Validaciones realizadas

- builds de frontend correctos;
- TypeScript sin errores;
- `git diff --check` limpio;
- revisiones independientes aprobadas;
- cambios limitados al alcance.
- Para el Lote 2E-1: `npm run build` correcto; las plantillas
  `PLANTILLA_SIMPLE_MATRIZ_PT_GR_EMPRESA.xlsx` y `docs/PT Y GR Caviace.xlsx`
  fueron aceptadas.
- Se rechazaron: entrada no ZIP, VBA, hoja oculta, hoja física adicional,
  relación externa, DTD en workbook o `sheet1`, XML mal formado en `sheet2`,
  relación duplicada, Content Type desconocido, trailing data, prefijo no
  referenciado, hueco entre entradas y bytes no referenciados antes del
  directorio central.
- Las revisiones independientes fueron `NO APROBABLE` mientras hubo defectos
  bloqueantes. Corregidos antes de staging, el veredicto final fue `APROBABLE`,
  sin hallazgos críticos, altos ni medios que bloquearan staging, commit o PR.
- Los archivos untracked protegidos permanecieron intactos y fuera del commit.
- Para el Lote 2E-2: `npm run build`, caso positivo V1 y regresión positiva
  final correctos; se obtuvieron cuatro bloques PT, cuatro criterios GR y tres
  resultados para cada matriz.
- Se rechazaron merge adicional, merge obligatorio faltante, celda no
  autorizada y fórmula fuera de `C19:E19`; una fórmula arbitraria en `C19` fue
  aceptada.
- El contenido OOXML independiente en una secundaria contractual se rechazó
  con `INDEPENDENT_MERGED_CELL_CONTENT`, y una celda `<c>` sin `r` con
  `INVALID_SHEETS`.
- `git diff --check` y checks de archivos nuevos fueron correctos. La revisión
  independiente definitiva fue `APROBABLE`.

### Pendientes

- ejecución/aplicación controlada de 002 y 003; ambas están versionadas, pero
  no ejecutadas ni aplicadas;
- identificación de roles efectivos de PostgreSQL y `GRANT`/`REVOKE` nominales;
- gestión administrativa restante para cargar/reemplazar XLSX, validar,
  publicar, activar/desactivar, listar, detalle/preview y sustituir versión;
- motor de evaluación final y evaluación histórica;
- endpoints de gestión restantes que todavía no existen;
- vinculación técnica definitiva de campos KYC y generación del Excel canónico
  final;
- migraciones no ejecutadas y frontend no implementado en el Lote 2E-2;
- pruebas automatizadas completas;
- pruebas controladas reales con empresa sin matriz y con matriz activa;
- pruebas por rol, manipulación de `empresa_id` y regresión integral de PF,
  PM, Fideicomiso y Recursos de Terceros.

### Fuera de alcance

- Ejecución o aplicación de las migraciones 002 y 003.
- Gestión, carga, vista previa y publicación completa de Excel.
- Frontend y flujo restante de carga, consulta, validación, publicación y
  activación. Crear borrador y el parser V1 sí existen; no constituyen el motor
  de evaluación final.
- Motor PT/GR, evaluaciones históricas y correo.
- Clasificaciones globales, GAFI y regímenes fiscales.
- Proveedor de almacenamiento o cifrado.
- Cambios a tablas operativas actuales, `usuarios.empresa_id`, PF, PM,
  Fideicomiso, Recursos de Terceros, `datos_completos` o `deepMerge`.

### Riesgos y controles

| Riesgo | Control requerido |
|---|---|
| Confiar en el frontend | Validación implementada y obligatoria en backend. |
| Usar empresa manipulada | Derivar tenant de `req.user` para consultor/cliente y validar selección admin. |
| Bloqueo después de insertar | Comprobar matriz dentro del flujo transaccional y antes de mutaciones. |
| Confundir SQL versionado con producción | Mantener explícito que las migraciones 002 y 003 no están aplicadas. |
| Romper capturas existentes | Regresión de PF, PM, Fideicomiso, terceros y contratos actuales. |
| Exponer auditoría manipulable | Tomar identificadores futuros de `req.user.id`, no del body. |
| Ampliar el lote | Mantener fuera el motor final, endpoints, persistencia, frontend y publicación. |
| Cambio concurrente de estado de matriz (TOCTOU) | Riesgo aceptado temporalmente hasta coordinar los flujos de publicación/activación. |
| Respuesta del Worker | Endurecimiento opcional de longitud exacta de `sheetNames` y limpieza defensiva adicional en `onError`. |
| Dependencia ZIP | Conservar fijado y vigilar el comportamiento de `unzipper` 0.10.14. |
| Alcance de validación | El parser valida el contrato V1; no implementa el motor de evaluación final ni el flujo de gestión/publicación. |

### Dependencias del Lote 2E

- Inspección de contratos existentes y aprobación previa de API, estados,
  permisos, auditoría y estrategia transaccional.
- Migración 001 aplicada, ya confirmada.
- Migraciones 002 y 003 probadas en restauración desechable y autorizadas antes
  de que un backend dependiente de sus objetos pueda desplegarse.
- Preservación del aislamiento multiempresa y de los contratos actuales.

### Próximo bloque de trabajo

El inspector 2E-1, el parser 2E-2, la migración 003 y crear borrador están
cerrados, versionados y fusionados. El siguiente sublote debe definirse desde
`main` en `e87ba26dc365903189e96247373e2b3ae3a791e4`, consultando primero este
resumen y la memoria técnica operativa como fuentes canónicas. La secuencia
futura objetivo
continúa siendo:

```text
cargar/reemplazar XLSX -> validar -> publicar -> activar/desactivar
```

Antes de programar deben aprobarse los contratos indicados en dependencias. No
se ejecutarán ni aplicarán las migraciones 002 o 003 sin autorización separada.
La 003 ya está implementada y versionada; ello no acredita ejecución real.
Se conservan las reglas permanentes: un paso por vez, cambios con Codex,
validación antes de avanzar, revisión independiente, pruebas antes de commit,
staging selectivo, PR obligatorio y protección de archivos untracked.

### Estado de producción

Las migraciones `20260801_002_matrices_pt_gr_empresa` y
`20260805_003_gestion_matrices_empresa` no están ejecutadas ni autorizadas en
producción. En consecuencia, el endpoint de crear borrador, la gestión de
matrices y el bloqueo dependiente de esas tablas tampoco deben declararse
desplegados. El
inspector OOXML y el parser V1 fusionados no prueban que el flujo completo de
gestión, carga, publicación o activación esté desplegado. No debe afirmarse que
funcionalidades dependientes de migraciones estén desplegadas.
