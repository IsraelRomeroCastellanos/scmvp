# PLD VISSION / SCMVP

## Checkpoint de infraestructura operativa — 2026-08-14

- Backend vigente: https://scmvp-nxtj.onrender.com
- DB lógica vigente: `scmvp_q69o`.
- `scmvp-1jhq.onrender.com` y `scmvp_0plk` quedan clasificados como infraestructura histórica/anterior.
- Este entorno no es producción real: es el supuesto de producción, entorno
  equivalente de prueba y base de referencia operativa porque no existe un
  ambiente de pruebas separado.
- En `scmvp_q69o`, PostgreSQL 17.10, las migraciones 001–007 están aplicadas;
  002–007 terminaron con VERIFY correcto.

## Memoria técnica operativa canónica

### Control del documento

| Dato | Valor confirmado |
|---|---|
| Última actualización | 2026-08-14 |
| Rama documental actual | `docs/cierre-migraciones-002-007` |
| Commit base canónico | `065187a`, merge de PR `#131` en `main` |
| PR más reciente | `#131`, reparación del SQL de verificación semántica de 006, fusionado |
| Lote actual | Cierre técnico y operativo de migraciones 002–007 |
| Entorno de referencia | `scmvp_q69o`, PostgreSQL 17.10; entorno equivalente, no producción real |
| Próximo paso exacto | Pruebas funcionales integrales de backend y frontend sobre el flujo editorial implementado |

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

- Rama de esta actualización: `docs/cierre-migraciones-002-007`.
- `main` fue confirmado en `065187a`, merge del PR `#131`.
- PRs de compatibilidad y cierre: `#121`, `#122`, `#123`, `#124`, `#126`,
  `#127`, `#128`, `#129`, `#130` y `#131`.
- Las migraciones 002–007 quedaron versionadas, aplicadas y verificadas en el
  entorno equivalente de referencia.
- PR histórico de crear borrador: `#112`, fusionado; su commit funcional previo al merge fue
  `90850b5` y agregó únicamente `backend/src/routes/admin.routes.ts` y
  `backend/src/services/matrices-empresa.service.ts` (368 inserciones y una
  eliminación).
- El PR `#111`, fusionado mediante `059e472`, se conserva como cierre histórico
  documental previo; no representa el HEAD actual.
- Rama de implementación del Lote 2E-2:
  `feat/lote-2e2-parser-matriz-excel`.
- Commit de implementación previo al merge: `f43a1a0`.
- PR del Lote 2E-2: `#107`, `feat: agregar parser de matriz PT GR por
  empresa`, fusionado correctamente.
- Merge commit en `main`: `23fa6f3`. Este dato se conserva como cierre
  funcional histórico de 2E-2; ya no es el HEAD actual.
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
- Los tres documentos canónicos autorizados de `docs/contexto/` son el único
  alcance de esta actualización.
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

## 5. Migraciones 001–007

### Confirmado

- `20260728_001_modelo_integral_actividades_vulnerables`: aplicada previamente.
- `20260801_002_matrices_pt_gr_empresa`: aplicada; VERIFY OK.
- `20260805_003_gestion_matrices_empresa`: aplicada; VERIFY OK.
- `20260810_004_resultados_globales_matriz`: aplicada; VERIFY OK.
- `20260812_005_catalogos_canonicos_matriz`: aplicada; VERIFY OK.
- `20260813_006_principales_tecnicos_usuarios`: aplicada; VERIFY OK.
- `20260813_007_seed_principal_sistema_y_catalogos_matriz`: aplicada; VERIFY
  OK. Su VERIFY confirmó las keys 005, 006 y 007 y terminó en COMMIT.
- La 002 no modifica `matrices_riesgo` ni
  `cliente_perfil_transaccional` y no incluye carga Excel, APIs, motor,
  evaluaciones históricas o frontend.
- La 003 aporta gestión editorial, auditoría, idempotencia, revisión,
  activación y soporte de archivo fuente. La 004 aporta `matriz_resultado`.
- La 005 aporta catálogos canónicos PT/GR versionados, adaptación de
  `matriz_criterio`, procedencia, puntajes y triggers de coherencia.
- La 006 agrega `usuarios.tipo_principal` y `usuarios.codigo_principal` para
  distinguir principales `HUMANO` y `SISTEMA`.
- La 007 crea el principal técnico determinístico `PLD_SYSTEM` y ocho criterios
  canónicos. Siempre debe resolverse por `codigo_principal`, nunca por ID fijo.

### Regla para futuras migraciones

Revisar integralmente UP, VERIFY y DOWN, validar PostgreSQL 17 y ejecutar UP y
VERIFY en el entorno equivalente antes de declarar cerrado un bloque
estructural. Los DOWN permanecen conservadores y no deben usarse sobre datos
sin comprobar previamente sus condiciones de reversibilidad.

### Modelo canónico aprobado por la migración 005

- XLSX deja de ser el flujo primario. El inspector y parser se conservan como
  legado/importación futura.
- Los catálogos globales están completamente separados:
  `catalogo_criterio_pt`, `catalogo_criterio_pt_version`,
  `catalogo_criterio_gr` y `catalogo_criterio_gr_version`.
- `codigo_canonico` cumple `^[A-Z][A-Z0-9_]{0,99}$` y es inmutable. Los únicos
  estados son `ACTIVO` y `RETIRADO`.
- Las versiones contractuales son append-only, usan `version_contrato > 0` y
  una referencia explícita `version_vigente_id`; nunca se infiere vigencia con
  `MAX(version_contrato)`.
- La FK compuesta garantiza que la versión vigente pertenece a la misma
  identidad. Un `CONSTRAINT TRIGGER DEFERRABLE INITIALLY DEFERRED` exige al
  cierre transaccional: `ACTIVO` con versión vigente y `RETIRADO` sin ella.
  Esto permite identidad → primera versión → puntero vigente → commit.
- PT admite `CAPTURA_OPCIONES` con parametrización `OPCIONES` y unidad nula, o
  `CAPTURA_RANGO_NUMERICO` con `RANGOS_NUMERICOS` y unidad canónica obligatoria.
- GR admite `KYC_RANGO`, `CATALOGO_GLOBAL`, `DERIVADO` y `ESTRUCTURADO`.
  `resolver_codigo` es técnico y controlado por backend. Sólo `KYC_RANGO` usa
  rangos y unidad obligatoria; los otros tipos usan `NINGUNA` y unidad nula.
  La 005 no introduce JSON genérico.
- `matriz_criterio` incorpora referencias PT/GR nullable, sin backfill. Ambas
  pueden ser nulas por compatibilidad, nunca ambas no nulas; PT exige ámbito PT
  y GR exige ámbito GR.
- `matriz_empresa_version.procedencia` es nullable para históricos y admite
  `CREADA_EN_SISTEMA` o `IMPORTADA_XLSX`. El runtime futuro deberá asignarla.
- Una matriz creada en sistema puede no tener fila en
  `matriz_archivo_fuente`; si existe, `contenido` permanece `BYTEA NOT NULL`.
- `matriz_opcion.puntaje` y `matriz_rango.puntaje` quedan obligatorios y
  limitados a 1, 2 o 3. No hay autocorrección: el UP aborta ante datos previos
  incompatibles.
- `matriz_resultado` conserva tres posiciones por ámbito y extremos inclusivos;
  sustituye 4..12 por enteros positivos y permite referencias XLSX nulas.
  La validación/publicación exige cobertura N..3N sin huecos ni traslapes.

### Principal técnico y seeds confirmados por 006–007

`PLD_SYSTEM` quedó creado con `tipo_principal=SISTEMA`,
`codigo_principal=PLD_SYSTEM`, email `pld-system@internal.invalid`, password
hash `!SYSTEM_PRINCIPAL_NO_LOGIN!`, nombre `Principal técnico PLD VISSION`,
`rol=NULL`, `empresa_id=NULL` y `activo=false`. Siempre debe resolverse por
`codigo_principal`, nunca por ID fijo.

Seeds PT, todos `CAPTURA_OPCIONES`:

- `TIPO_PRODUCTO`: Tipo de producto;
- `NATURALEZA_PRODUCTO`: Naturaleza del producto/servicio;
- `FRECUENCIA_PRODUCTO`: Frecuencia del producto/servicio;
- `DESTINO_RECURSOS_PT`: Destino de los recursos.

Seeds GR:

- `ACTIVIDAD_ECONOMICA`: `CATALOGO_GLOBAL`, resolver `ACTIVIDAD_ECONOMICA`;
- `ZONA_GEOGRAFICA`: `CATALOGO_GLOBAL`, resolver `ZONA_GEOGRAFICA`;
- `DESTINO_RECURSOS_GR`: `ESTRUCTURADO`, resolver `DESTINO_RECURSOS_GR`;
- `PERFIL_TRANSACCIONAL`: `DERIVADO`, resolver `PERFIL_TRANSACCIONAL`.

No hay otros criterios sembrados. Esto no acredita que los resolvers GR estén
implementados funcionalmente.

### Lección operativa PostgreSQL 17

Los incidentes de 003–006 fueron principalmente defectos de preflights y
verificadores, no del modelo de negocio ni de las tablas creadas:

1. `migration_key` era `VARCHAR(150)`, pero algunos preflights exigían
   literalmente `character varying`.
2. `pg_get_constraintdef` y `pg_get_expr` serializan paréntesis, casts,
   `ANY/ARRAY`, `COLLATE` e intervalos de formas distintas a strings manuales.
3. Los predicados parciales se comparaban textualmente; se sustituyeron por
   validación estructural y semántica.
4. El alias `collation` en `WITH ORDINALITY` causó error de sintaxis.
5. `unnest(int2vector, oidvector, oidvector, int2vector)` no existe; la
   expansión paralela válida usa `ROWS FROM`.
6. `pg_catalog.position('texto' IN expresion)` es inválido: `POSITION` usa
   sintaxis SQL especial.
7. El SQL dinámico de VERIFY 006 dejó `bool_and(` abierto antes de `FROM`.

Regla permanente: revisar juntos UP, VERIFY y DOWN; preferir catálogo y
semántica sobre texto serializado; comprobar tipos físicos y sintaxis PG17;
reconstruir SQL dinámico; barrer el mismo patrón en migraciones subsecuentes;
y no avanzar a frontend con infraestructura parcial.

## 6. Modelo definido por la migración 002

La siguiente estructura está aplicada y verificada en el entorno equivalente
de referencia:

| Tabla | Responsabilidad definida |
|---|---|
| `matriz_empresa_version` | Cabecera de la versión por empresa, estado editorial, vigencia, auditoría y origen de nueva versión. |
| `matriz_criterio` | Criterios PT o GR de una versión. |
| `matriz_opcion` | Opciones y puntajes pertenecientes a un criterio. |
| `matriz_rango` | Rangos parametrizados y sus límites/resultados. |
| `matriz_regla` | Reglas por versión, marca o condición, prioridad y alto automático. |
| `matriz_archivo_fuente` | En la 002: metadatos y referencia. La 003 versionada la complementa con el XLSX íntegro en `contenido BYTEA NOT NULL` y endurece sus metadatos. |

Estados editoriales permitidos: `BORRADOR`, `VALIDADA`, `PUBLICADA`.

La vigencia es independiente mediante `activa`. El esquema exige que una
versión activa sea `PUBLICADA` y el índice único parcial permite como máximo
una activa por empresa. La 003 preserva esa garantía, agrega una sola pendiente
`BORRADOR`/`VALIDADA` por empresa, revisión positiva, confinamiento del origen
a la misma empresa, actores/fechas de activación y desactivación, idempotencia y
auditoría append-only protegida contra `UPDATE`, `DELETE` y `TRUNCATE`.
Este contrato quedó acreditado por los VERIFY ejecutados en el entorno de
referencia.

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
| `PUT /api/admin/empresas/:id` | Admin; edita empresa y configuración autorizada. | No administra matriz. |
| `POST /api/admin/empresas/:empresaId/matrices` | Solo admin; deriva empresa del path y actor de `req.user.id`. | Crea un BORRADOR vacío con idempotencia, transacción, auditoría y una sola pendiente. Depende del esquema 002+003. |
| `GET /api/admin/catalogos-criterios-matriz?ambito=PT\|GR` | Catálogo canónico por ámbito. | Implementada. |
| `GET /api/admin/empresas/:empresaId/matrices/borrador` | Obtiene la versión pendiente. | Devuelve `BORRADOR` o `VALIDADA`, nunca `PUBLICADA`. |
| `PUT /api/admin/empresas/:empresaId/matrices/:matrizId/criterios` | Configura composición PT/GR. | Implementada en 2G-1. |
| `PUT /api/admin/empresas/:empresaId/matrices/:matrizId/criterios/:criterioId/parametrizacion` | Parametriza un criterio. | Implementada en 2G-2. |
| `PUT /api/admin/empresas/:empresaId/matrices/:matrizId/resultados/:ambito` | Configura tres bandas del ámbito. | Implementada en 2G-2. |
| `POST /api/admin/empresas/:empresaId/matrices/:matrizId/validar` | Valida composición, parametrización y bandas. | Implementada en 2G-3. |
| `POST /api/admin/empresas/:empresaId/matrices/:matrizId/reabrir` | Regresa explícitamente `VALIDADA` a `BORRADOR`. | Implementada en 2G-3. |
| `POST /api/admin/empresas/:empresaId/matrices/:matrizId/publicar` | Publica y congela la versión. | Implementada en 2G-3. |
| `POST /api/admin/empresas/:empresaId/matrices/:matrizId/activar` | Activa separadamente una versión publicada. | Implementada en 2G-3; no reemplaza silenciosamente otra activa. |
| `GET /api/cliente/mi-empresa` | Obtiene la empresa de `req.user.empresa_id`. | Expone `tiene_matriz_publicada_activa`. |
| `GET /api/cliente/clientes` | Lista con aislamiento por rol/empresa. | No es punto de creación; no requiere cambio para aplicar el bloqueo. |
| `GET /api/cliente/clientes/:id` | Consulta detalle bajo aislamiento vigente. | Fuera del cambio mínimo de creación. |
| `POST /api/cliente/registrar-cliente` | Admin, consultor o cliente; determina la empresa conforme al rol, valida su existencia y registra en transacción. | Valida dentro de la transacción y antes de insertar que exista matriz publicada y activa; rechaza con `409` cuando no existe. |
| `PUT /api/cliente/clientes/:id` | Edita bajo controles vigentes. | El bloqueo de edición no está aprobado; no debe asumirse. |

Estado 2G: **2G-1 composición/configuración MERGEADO; 2G-2 parametrización
MERGEADO; 2G-3 validación/publicación/activación MERGEADO**. No deben
inferirse rutas adicionales a las enumeradas.

## 8. Servicios

### Existentes confirmados

- `backend/src/services/actividades-vulnerables.service.ts`: catálogo,
  asignación por empresa, selecciones PLD y validaciones relacionadas.
- `backend/src/services/auth.service.ts`: generación y verificación de JWT.
- `backend/src/services/matrices-empresa.service.ts`: servicio reutilizable
  incorporado en el Lote 2A; conserva `hasPublishedActiveCompanyMatrix` y
  además implementa la creación transaccional e idempotente de un BORRADOR
  vacío por empresa.
- `backend/src/services/matriz-ooxml-inspector.service.ts`: frontera defensiva
  OOXML incorporada en el Lote 2E-1; expone
  `inspectMatrizXlsxOoxml(input: Buffer): Promise<MatrizOoxmlInspectionResult>`.
- `backend/src/services/matriz-excel-parser.service.ts`: parser funcional V1
  de matrices PT/GR por empresa, con versión lógica `PT_GR_EMPRESA_V1`; ejecuta
  previamente el inspector OOXML y lee, valida y normaliza la configuración de
  la plantilla a una estructura tipada.

El parser valida el contrato físico y funcional V1 —encabezados, merges,
posiciones, valoraciones, KYC, rangos y celdas permitidas—, pero no evalúa a un
cliente, no selecciona sus respuestas o condiciones, no suma las cuatro
valoraciones de una evaluación real ni determina su resultado PT o GR. No
incorpora motor de evaluación final, rutas, controladores, frontend,
persistencia, gestión editorial, publicación ni almacenamiento. Esas
capacidades siguen pendientes.

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
- Exige exactamente las hojas contractuales `PERFIL TRANSACCIONAL` y `GRADO DE
  RIESGO DE CLIENTE`. Resuelve cada una dinámicamente por nombre → `r:id` →
  relationship → worksheet part; no congela `sheetId`, orden interno ni
  `sheet1.xml`/`sheet2.xml`.
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

### Parser funcional V1 del Lote 2E-2

- Contrato físico exhaustivo `A1:G19` para PT y `A1:H19` para GR, con conjunto
  exacto de merges V1, mapa exhaustivo de celdas permitidas y vacíos
  obligatorios.
- `A1` y `A2` exigen texto empresarial, sin congelar su contenido; `B3`, `B7`,
  `B11` y `B15` contienen `Descripción`.
- Las valoraciones literales son `C=3`, `D=2` y `E=1`. Cada fila tiene
  exactamente una valoración y cada bloque distribuye una vez `1`, `2` y `3`.
- PT contiene cuatro bloques, tres respuestas por bloque y tres resultados. GR
  contiene cuatro criterios, tres condiciones por criterio y tres resultados,
  con una indicación KYC funcional por criterio.
- `C19:E19` pueden estar vacías o contener cualquier fórmula XLSX válida. Son
  fórmulas visuales, ignoradas y no autoritativas; cualquier fórmula fuera de
  esas celdas está prohibida. El contrato V1 establece que el futuro motor de
  evaluación deberá calcular PT y GR independientemente de esas fórmulas,
  sumando las cuatro valoraciones seleccionadas y comparando el total contra
  los rangos configurados; este cálculo no está implementado por el parser.
- Los rangos deben cubrir exactamente los enteros `4..12`, sin huecos ni
  solapes.
- El inspector impide contenido OOXML independiente en celdas secundarias de
  merges; una secundaria que solo contiene estilo sigue permitida.
- Toda celda SpreadsheetML `<c>` exige una referencia `r` explícita, única,
  sin namespace y en formato A1 canónico. Se rechazan coordenadas implícitas;
  los límites son columnas `A:XFD` y filas `1:1048576`.
- Se preservan las protecciones de ZIP, CRC, ratios, paths, relationships,
  content types, macros, VML y timeout del worker.

Archivos integrados en el Lote 2E-2:

- `backend/src/services/matriz-excel-parser.service.ts`
- `backend/src/services/matriz-ooxml-inspector.service.ts`
- `docs/contexto/CONTRATO_PLANTILLA_MATRIZ_PT_GR_V1.md`

## 9. Contrato autenticado y auditoría

`Express.AuthenticatedUser` está confirmado como unión discriminada:

- admin: `id: number`, `email: string`, `rol: 'admin'`, `empresa_id: null`;
- consultor o cliente: `id: number`, `email: string`,
  `rol: 'consultor' | 'cliente'`, `empresa_id: number`.

`req.user` es opcional en el tipo Express y queda poblado por
`authenticate`. El middleware valida rol y exige `empresa_id` numérico,
entero y positivo para consultor/cliente; admin requiere `empresa_id = null`.

La migración 002 define `creada_por`, `validada_por`, `publicada_por` y
`cargado_por` como FKs a `usuarios`. Las operaciones implementadas deben tomar
esos identificadores exclusivamente de `req.user.id`, nunca del body o query.

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

### Validaciones confirmadas del Lote 2E-2

- `npm run build`: correcto; caso positivo V1 y regresión positiva final:
  correctos.
- Estructura obtenida: cuatro bloques PT, cuatro criterios GR, tres resultados
  PT y tres resultados GR.
- Merge adicional, merge obligatorio faltante, contenido en celda no
  autorizada y fórmula fuera de `C19:E19`: rechazados.
- Fórmula arbitraria en `C19`: aceptada.
- Contenido OOXML independiente en una secundaria contractual: rechazado con
  `INDEPENDENT_MERGED_CELL_CONTENT`.
- Celda `<c>` sin atributo `r`: rechazada con `INVALID_SHEETS`.
- `git diff --check` y checks de archivos nuevos: correctos.
- Revisión independiente definitiva: `APROBABLE`.

### Validación operativa confirmada de migraciones 002–007

- 001 estaba aplicada previamente.
- 002, 003, 004, 005, 006 y 007 fueron aplicadas en orden y cada VERIFY terminó
  correctamente en el entorno equivalente PostgreSQL 17.10.
- El cierre de 007 confirmó las migration keys 005, 006 y 007 y terminó en
  COMMIT.
- Los PRs `#121`, `#122`, `#123`, `#124`, `#126`, `#127`, `#128`, `#129`,
  `#130` y `#131` corrigieron compatibilidad PG17 y cerraron los verificadores.
- Esta evidencia pertenece al entorno equivalente `scmvp_q69o`; no debe
  describirse como incidente o despliegue de producción real.

### Validación confirmada de crear borrador por empresa

- El PR `#112` cerró `POST /api/admin/empresas/:empresaId/matrices`; el commit
  funcional previo al merge fue `90850b5` y el merge canónico es
  `e87ba26dc365903189e96247373e2b3ae3a791e4`.
- `npm run build` del backend, `git diff --check`, las pruebas con `PoolClient`
  simulado y la regresión proporcional fueron correctos.
- La revisión independiente final fue `APROBABLE`.
- El endpoint depende de 002+003, actualmente aplicadas y verificadas en el
  entorno equivalente. Falta su smoke funcional integral, no su infraestructura
  de tablas.
- Hallazgo residual bajo no bloqueante: un `empresaId` mayor a 2147483647 puede
  terminar en `500` en vez de `404`; queda como endurecimiento técnico.

### Cierre histórico de la revisión estática de migración 005

- PR `#115`, fusionado en `main` mediante `62db132`; commit funcional
  `ce1fa7e`.
- UP, VERIFY y DOWN quedaron versionados con preflights defensivos, advisory
  lock en UP/DOWN, VERIFY estrictamente read-only y rollback conservador.
- La revisión independiente final verificó catálogos separados, versiones
  inmutables, FK compuesta, vigencia diferible, puntajes 1/2/3, procedencia,
  resultados positivos, secuencias/defaults, índices y reversibilidad a 004.
- Segunda revisión independiente: **APROBABLE**.
- Esta revisión fue el antecedente estático; posteriormente 005 fue aplicada y
  verificada correctamente en el entorno equivalente.

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
- **Lote 2E-2 (`#107`):** parser funcional V1 de matrices PT/GR por empresa,
  versión lógica `PT_GR_EMPRESA_V1`, implementado en `f43a1a0` y fusionado en
  `main` mediante `23fa6f3`. Cierre definitivo: **APROBADO**.
- **Sublote posterior — migración 003 (`#109`):** UP, VERIFY y DOWN de
  `20260805_003_gestion_matrices_empresa`, implementados en `59e141b` y
  fusionados en `main` mediante `763811b9f2be2e8f339802256457bfd0907126a9`.
  Revisión estática final: **APROBABLE**. Posteriormente quedó aplicada y con
  VERIFY OK en el entorno equivalente.
- **Crear borrador por empresa (`#112`):** endpoint
  `POST /api/admin/empresas/:empresaId/matrices`, implementado en `90850b5` y
  fusionado mediante `e87ba26dc365903189e96247373e2b3ae3a791e4`. Crea un
  BORRADOR vacío, inactivo, revisión inicial 1 y siguiente número de versión;
  exige admin, actor autenticado, `Idempotency-Key`, lock transaccional por
  empresa, una sola pendiente y auditoría `BORRADOR_CREADO`.
- **Migración 005 (`#115`):** catálogos canónicos PT/GR separados y
  versionados, referencias exactas desde `matriz_criterio`, procedencia de
  matriz, puntajes 1/2/3 y resultados dinámicos positivos. Implementada en
  `ce1fa7e` y fusionada mediante `62db132`. Segunda revisión independiente:
  **APROBABLE**. Posteriormente quedó aplicada y con VERIFY OK.
- **2G-1:** composición/configuración de matriz por empresa, **MERGEADO**.
- **2G-2:** parametrización de criterios y resultados, **MERGEADO**.
- **2G-3:** validación, reapertura, publicación y activación, **MERGEADO**.
- **Cierre estructural 002–007:** todas aplicadas y verificadas en
  `scmvp_q69o` PostgreSQL 17.10; cierre canónico de correcciones en `065187a`.

En el Lote 2E-1 no se ejecutaron SQL ni migraciones y no hubo conexión a
PostgreSQL. Los archivos untracked protegidos permanecieron intactos y fuera
del commit.

### Riesgo residual a probar

Los flujos coordinados de publicación y activación ya existen en 2G-3. El
smoke funcional debe comprobar que una transición concurrente de la matriz no
permita crear clientes sin una versión `PUBLICADA` y activa.

### Pendientes reales

- identificación de los roles efectivos de PostgreSQL y definición nominal de
  `GRANT`/`REVOKE`;
- smoke funcional integral del flujo editorial real y del bloqueo de clientes;
- publicación futura: mínimo 1 criterio PT y 1 GR, cantidad variable sin
  máximo fijo, tres bandas y cobertura N..3N sin huecos ni solapes;
- futuro motor GR: un dato fuente faltante produce `NO_EVALUABLE`, sin puntaje
  ni resultado final mientras exista un criterio requerido no evaluable;
- clonado futuro: toma la versión vigente de criterios `ACTIVO`; un criterio
  `RETIRADO` exige sustitución o remoción antes de publicar, sin alterar
  matrices históricas;
- motor de evaluación final y evaluación histórica;
- frontend administrativo de matrices y corrección de bugs funcionales que
  revele el recorrido real;
- vinculación técnica definitiva de campos KYC;
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
- Motor, implementación de resolvers GR, evaluación de clientes, importación
  XLSX operativa y runtime adicional. Los seeds 007 y endpoints 2G existen,
  pero no debe declararse terminado lo que aún no tiene prueba funcional.
- Reglas específicas de override: ninguna está aprobada todavía;
  `matriz_regla` se conserva para trabajo futuro.

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

El bloque estructural 002–007 está aplicado y verificado. La etapa siguiente ya
no consiste en aplicar migraciones, sino en probar el recorrido funcional de
backend y frontend:

1. smoke funcional backend del flujo editorial real;
2. confirmar el principal técnico y los ocho catálogos;
3. crear u obtener una empresa;
4. crear borrador;
5. seleccionar criterios PT/GR;
6. parametrizar criterios;
7. configurar bandas PT/GR;
8. validar;
9. reabrir y volver a validar cuando corresponda;
10. publicar;
11. activar;
12. confirmar el bloqueo o permiso de creación de clientes;
13. probar el frontend administrativo de matrices;
14. registrar bugs funcionales reales;
15. sólo después definir el siguiente lote.

El contrato permanece: una empresa puede existir sin matriz, pero no crear
clientes hasta tener una matriz `PUBLICADA` y activa. `PUBLICADA` nunca se
reabre; `VALIDADA` puede reabrirse explícitamente a `BORRADOR`; publicación y
activación son operaciones separadas. Si ya existe otra activa, corresponde
`409 MATRIZ_ACTIVA_EXISTENTE`, sin reemplazo silencioso.

La composición mínima es 1 PT + 1 GR, sin máximo fijo aprobado. Para N
criterios, el score va de N a 3N; se exigen exactamente tres bandas PT y tres
GR, con cobertura completa sin huecos ni traslapes. La composición publicada
queda congelada y cualquier cambio exige nueva versión. GR nunca es captura
manual. El motor de evaluación de clientes y los resolvers GR no deben
declararse terminados mientras no estén implementados y probados.
