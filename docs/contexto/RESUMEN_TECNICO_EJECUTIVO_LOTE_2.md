# PLD VISSION / SCMVP

## Checkpoint de infraestructura operativa — 2026-08-14

- Backend vigente: https://scmvp-nxtj.onrender.com
- DB lógica vigente: `scmvp_q69o`.
- Servidor de referencia: PostgreSQL 17.10.
- `scmvp-1jhq.onrender.com` y `scmvp_0plk` quedan clasificados como infraestructura histórica/anterior.
- Este es el supuesto de producción, entorno equivalente de prueba y base de
  referencia operativa porque no existe un ambiente de pruebas separado; no es
  producción real.
- Las migraciones 001–007 están aplicadas; 002–007 terminaron con VERIFY OK.

## Resumen técnico ejecutivo — Lote 2: Gestión de matriz por empresa

### Situación actual

- Rama documental actual: `docs/cierre-migraciones-002-007`.
- `main` confirmado en el merge commit `065187a`.
- PR de cierre más reciente: `#131`.
- El Lote 2E-2 se implementó en `feat/lote-2e2-parser-matriz-excel`, commit
  previo al merge `f43a1a0`.
- El PR `#107`, fusionado mediante `23fa6f3`, se conserva como cierre funcional
  histórico del parser V1 de 2E-2; no representa el HEAD actual.
- PR histórico de crear borrador: `#112`, con commit funcional `90850b5` y
  merge histórico `e87ba26dc365903189e96247373e2b3ae3a791e4`. El HEAD/base
  actual posterior es `62db132`. Agregó únicamente
  `backend/src/routes/admin.routes.ts` y
  `backend/src/services/matrices-empresa.service.ts`.
- El PR `#111`, fusionado mediante `059e472`, se conserva como cierre histórico
  documental previo.
- El Lote 2E-1 se implementó en `feat/lote-2e1-inspector-ooxml`, commit
  `17d0d25 feat: agregar inspector defensivo OOXML para matrices`.
- PR del Lote 2E-1: `#105`, fusionado correctamente; merge commit `de7dc9d`.
- La migración 001 estaba aplicada previamente. Las migraciones 002, 003, 004,
  005, 006 y 007 están aplicadas y con VERIFY OK en `scmvp_q69o`.
- El backend ya gestiona empresas, configuración PLD y clientes con aislamiento
  por empresa.
- Los Lotes 2A, 2B, 2C y 2D están implementados y fusionados mediante los PR
  `#94`, `#95`, `#96` y `#97`, respectivamente.
- Existe consulta reutilizable, indicador en los DTO, bloqueo en backend y
  frontend, inspector defensivo OOXML y parser funcional V1 de matrices PT/GR
  por empresa. Crear borrador ya está implementado; no existe todavía gestión
  administrativa de matrices mediante 2G-1, 2G-2 y 2G-3. La infraestructura
  está cerrada; falta el recorrido funcional integral de backend y frontend.

### Objetivo

El objetivo de los Lotes 2A–2D quedó cerrado: hacer exigible la condición de
matriz utilizable antes del alta de clientes. El Lote 2E-1 también quedó
completado, versionado y fusionado como frontera defensiva previa a ExcelJS. El
Lote 2E-2 quedó cerrado y aprobado con el parser `PT_GR_EMPRESA_V1`. Las
migraciones 002–007 y los bloques 2G-1/2/3 están cerrados. La siguiente etapa
es probar el flujo funcional real; el motor PT/GR, la evaluación histórica y
los resolvers GR no deben declararse implementados por este cierre.

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
- La migración 005 agrega catálogos separados `catalogo_criterio_pt` /
  `catalogo_criterio_pt_version` y `catalogo_criterio_gr` /
  `catalogo_criterio_gr_version`.
- Las identidades usan código canónico inmutable, estados `ACTIVO`/`RETIRADO`
  y versión vigente explícita del mismo criterio. La coherencia final se exige
  mediante constraint triggers diferibles.
- PT soporta `CAPTURA_OPCIONES` y `CAPTURA_RANGO_NUMERICO`; GR soporta
  `KYC_RANGO`, `CATALOGO_GLOBAL`, `DERIVADO` y `ESTRUCTURADO`, con
  `resolver_codigo` técnico. No existe JSON genérico.
- `matriz_criterio` puede referenciar una versión PT o GR según su ámbito, sin
  backfill histórico. `procedencia` distingue `CREADA_EN_SISTEMA` e
  `IMPORTADA_XLSX` y permanece nullable para históricos.
- Una matriz creada en sistema no requiere archivo. Si existe fila de archivo,
  `matriz_archivo_fuente.contenido` conserva `BYTEA NOT NULL`.
- Opciones y rangos exigen puntajes 1/2/3. Los resultados usan límites enteros
  positivos y referencias XLSX nullable; la cobertura N..3N queda para runtime.
- La migración 006 agrega `usuarios.tipo_principal` y
  `usuarios.codigo_principal`, con soporte diferenciado para principales
  `HUMANO` y `SISTEMA`.
- La migración 007 deja el principal técnico determinístico `PLD_SYSTEM`; la
  migración 014 completa PT V1 con `TIPO_PRODUCTO`, `NATURALEZA_PRODUCTO`,
  `MONTO`, `FRECUENCIA_PRODUCTO`, `DESTINO_RECURSOS_PT` y
  `ZONA_GEOGRAFICA_PT`. GR conserva `ACTIVIDAD_ECONOMICA`,
  `ZONA_GEOGRAFICA`, `DESTINO_RECURSOS_GR`, `PERFIL_TRANSACCIONAL`.
- El principal técnico es `SISTEMA`, correo
  `pld-system@internal.invalid`, password hash
  `!SYSTEM_PRINCIPAL_NO_LOGIN!`, nombre `Principal técnico PLD VISSION`, sin
  rol ni empresa y con `activo = false`. Siempre se resuelve por
  `codigo_principal = 'PLD_SYSTEM'`, nunca por ID fijo.
- Rutas administrativas implementadas:
  `GET /api/admin/catalogos-criterios-matriz?ambito=PT|GR`,
  `GET /api/admin/empresas/:empresaId/matrices/borrador`,
  `PUT /api/admin/empresas/:empresaId/matrices/:matrizId/criterios`,
  `PUT /api/admin/empresas/:empresaId/matrices/:matrizId/criterios/:criterioId/parametrizacion`,
  `PUT /api/admin/empresas/:empresaId/matrices/:matrizId/resultados/:ambito`,
  `POST /api/admin/empresas/:empresaId/matrices/:matrizId/validar`,
  `POST /api/admin/empresas/:empresaId/matrices/:matrizId/reabrir`,
  `POST /api/admin/empresas/:empresaId/matrices/:matrizId/publicar` y
  `POST /api/admin/empresas/:empresaId/matrices/:matrizId/activar`. El GET de
  borrador puede devolver una pendiente `BORRADOR` o `VALIDADA`, nunca
  `PUBLICADA`.

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
  Revisión independiente estática final: `APROBABLE`. Posteriormente quedó
  aplicada y con VERIFY OK en el entorno equivalente.
- **Crear borrador por empresa — PR #112:** endpoint
  `POST /api/admin/empresas/:empresaId/matrices`, implementado en `90850b5` y
  fusionado mediante `e87ba26dc365903189e96247373e2b3ae3a791e4`. Solo admin;
  crea BORRADOR vacío, inactivo, con revisión 1, siguiente número de versión,
  una sola pendiente, idempotencia, lock transaccional y auditoría.
- **Migración 005 — PR #115:** implementada en `ce1fa7e` y fusionada mediante
  `62db132`. UP, VERIFY read-only y DOWN conservador definen el modelo canónico
  PT/GR. Segunda revisión independiente: **APROBABLE**. Posteriormente quedó
  aplicada y con VERIFY OK.
- **2G-1:** composición/configuración de matriz por empresa, **MERGEADO**.
- **2G-2:** parametrización, **MERGEADO**.
- **2G-3:** validación, publicación y activación, **MERGEADO**.
- **Cierre 002–007:** todas las migraciones están aplicadas y verificadas en el
  entorno equivalente PostgreSQL 17.10. El VERIFY final de 007 confirmó las
  claves `20260812_005_catalogos_canonicos_matriz`,
  `20260813_006_principales_tecnicos_usuarios` y
  `20260813_007_seed_principal_sistema_y_catalogos_matriz`, y terminó en
  COMMIT. Las correcciones relevantes quedaron fusionadas mediante los PR
  #121, #122, #123, #124, #126, #127, #128, #129, #130 y #131; `main` quedó
  confirmado en `065187a`.

### Cierre técnico de la migración 005

XLSX deja de ser el flujo primario y queda como legado/importación futura. Las
versiones contractuales son append-only, usan `version_contrato > 0` y una
`version_vigente_id` explícita; no se usa `MAX()`. La FK compuesta acredita que
la versión pertenece al mismo criterio. Un criterio `ACTIVO` termina con
vigente y uno `RETIRADO` sin ella, permitiendo en una sola transacción identidad
→ primera versión → puntero → commit.

`matriz_opcion.puntaje` y `matriz_rango.puntaje` quedan `NOT NULL` y limitados
a 1, 2 o 3, sin autocorrección. `matriz_resultado` deja 4..12, admite positivos
y conserva tres posiciones y extremos inclusivos. No hay seeds, backfill,
motor, runtime, frontend, endpoints, resolvers ni overrides aprobados.

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

### Lección operativa PostgreSQL 17

Los incidentes al aplicar o verificar 003–006 estuvieron principalmente en
preflights y verificadores demasiado dependientes de representaciones internas,
no en el modelo de negocio ni en las tablas creadas. Se encontraron:

- comparación literal de `schema_migrations.migration_key` contra
  `character varying` cuando el contrato físico es `VARCHAR(150)`;
- diferencias legítimas de paréntesis, casts, `ANY/ARRAY`, `COLLATE` e
  intervalos en `pg_get_constraintdef` y `pg_get_expr`;
- comparación textual frágil de predicados de índices parciales;
- el alias problemático `collation` en `WITH ORDINALITY`;
- una llamada inexistente en PG17 a
  `unnest(int2vector, oidvector, oidvector, int2vector)`, sustituida por
  expansión paralela válida con `ROWS FROM`;
- el uso inválido de `pg_catalog.position('texto' IN expresion)`, porque
  `POSITION(substring IN string)` es sintaxis SQL especial;
- SQL dinámico de VERIFY 006 que dejó `bool_and(` sin cerrar antes de `FROM`.

Regla permanente: toda migración que toque estructura, catálogos o
`pg_catalog` exige revisión integral de UP + VERIFY + DOWN; validación
estructural o semántica en vez de serialización textual frágil; comprobación de
sintaxis y tipos reales de PostgreSQL 17; reconstrucción conceptual de todo SQL
dinámico; y barrido del mismo patrón en migraciones subsecuentes. Un bloque no
se considera cerrado hasta ejecutar UP y VERIFY en el entorno equivalente, ni
se avanza a frontend con infraestructura parcial. Estos hallazgos no fueron un
incidente de producción real.

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

- identificación de roles efectivos de PostgreSQL y `GRANT`/`REVOKE` nominales;
- smoke funcional integral del flujo editorial y del bloqueo de clientes;
- pruebas del frontend administrativo de matrices;
- publicación con 3 a 6 criterios PT y al menos un criterio GR, y con
  fronteras empresariales `PT1/PT2/PT3` y tres resultados GR que cubran N..3N
  sin huecos ni traslapes; PT se confirma expresamente después de una vista
  previa con criterios, descripciones, valores internos, dominio y fronteras;
- `MONTO` V1 se conserva histórica con opciones; en V2 `MONTO` es la dimensión
  canónica, la empresa elige `UMA` o `PESOS` y captura dos cortes decimales. El
  sistema deriva tres tramos continuos puntuados 1/2/3. El PT inicial persiste
  el monto esperado/declarado, unidad, rango y puntaje con su matriz y resultado;
  no se reemplaza por clasificación manual ni convierte unidades;
- los criterios descriptivos conservan tres respuestas Bajo/Medio/Alto y una
  selección por evaluación; MONTO V2 captura el monto declarado y resuelve el
  tramo automáticamente. Ambos aportan un valor 1/2/3 y el dominio sigue `N..3N`;
- las operaciones futuras resolverán el monto observado contra la matriz
  aplicable y lo compararán con el rango esperado sin reescribir el PT histórico;
  captura individual/masiva y alertas permanecen fuera de este sublote;
- patrón reutilizable documentado, no implementado en GR: dimensión/fuente →
  unidad empresarial → dos límites → tres tramos → valoración;
- clonado futuro sin alterar históricos: criterios activos toman su versión
  vigente; retirados requieren sustitución/remoción antes de publicar;
- contrato futuro `NO_EVALUABLE` para GR sin dato fuente, sin puntaje ni
  resultado final mientras subsista el dato faltante;
- motor de evaluación final y evaluación histórica;
- vinculación técnica definitiva de campos KYC;
- pruebas automatizadas completas;
- pruebas controladas reales con empresa sin matriz y con matriz activa;
- pruebas por rol, manipulación de `empresa_id` y regresión integral de PF,
  PM, Fideicomiso y Recursos de Terceros.

### Fuera de alcance

- Motor de evaluación de clientes, evaluación histórica e implementación de
  los resolvers GR. Los seeds 007 y endpoints 2G sí existen.
- Importación XLSX operativa. Inspector y parser se conservan como legado.
- Overrides específicos; `matriz_regla` se conserva para futuro.
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
| Confundir entorno equivalente con producción real | Nombrar `scmvp_q69o` como supuesto de producción/base de referencia, no como producción real. |
| Romper capturas existentes | Regresión de PF, PM, Fideicomiso, terceros y contratos actuales. |
| Exponer auditoría manipulable | Tomar identificadores futuros de `req.user.id`, no del body. |
| Ampliar el lote | Mantener fuera el motor final, resolvers GR y evaluación histórica. |
| Cambio concurrente de estado de matriz (TOCTOU) | Probar que las transiciones 2G-3 no habiliten altas sin matriz publicada y activa. |
| Respuesta del Worker | Endurecimiento opcional de longitud exacta de `sheetNames` y limpieza defensiva adicional en `onError`. |
| Dependencia ZIP | Conservar fijado y vigilar el comportamiento de `unzipper` 0.10.14. |
| Alcance de validación | El parser valida el contrato V1; no implementa el motor de evaluación final ni el flujo de gestión/publicación. |

### Dependencias del Lote 2E

- Inspección de contratos existentes y aprobación previa de API, estados,
  permisos, auditoría y estrategia transaccional.
- Migraciones 001–007 aplicadas; VERIFY OK para 002–007 en el entorno
  equivalente.
- Preservación del aislamiento multiempresa y de los contratos actuales.

### Próximo bloque de trabajo

El bloque 002–007 está cerrado. La próxima etapa es:

1. smoke funcional backend del flujo editorial real;
2. confirmar el principal técnico y los ocho catálogos;
3. crear u obtener una empresa;
4. crear borrador;
5. seleccionar PT/GR;
6. parametrizar criterios;
7. definir fronteras PT y resultados GR;
8. validar;
9. reabrir y volver a validar si corresponde;
10. publicar;
11. activar;
12. confirmar bloqueo o permiso de creación de clientes;
13. probar el frontend administrativo de matrices;
14. registrar bugs funcionales reales;
15. sólo después definir el siguiente lote.

Una empresa puede crearse sin matriz, pero no crear clientes sin una matriz
`PUBLICADA` y activa. `PUBLICADA` nunca se reabre; `VALIDADA` puede reabrirse
explícitamente. Activar es separado de publicar y una activa existente produce
`409 MATRIZ_ACTIVA_EXISTENTE`, sin reemplazo silencioso. La composición PT es
de 3 a 6 criterios; para N criterios el score es N..3N, con fronteras
`PT1/PT2/PT3` y tres resultados GR, cobertura total sin huecos ni traslapes. La
composición publicada queda congelada y los cambios exigen nueva versión. GR
nunca es captura manual. XLSX permanece como legado/importación futura.

### Estado del entorno equivalente

En `scmvp_q69o`, PostgreSQL 17.10, la 001 estaba aplicada y 002–007 están
aplicadas con VERIFY OK. El VERIFY 007 confirmó las claves 005, 006 y 007 y
terminó en COMMIT. Este entorno es la base de referencia operativa ante la
ausencia de un ambiente de pruebas separado; no debe describirse como
producción real. El cierre estructural no acredita todavía el motor de
evaluación, los resolvers GR ni el recorrido funcional integral.
