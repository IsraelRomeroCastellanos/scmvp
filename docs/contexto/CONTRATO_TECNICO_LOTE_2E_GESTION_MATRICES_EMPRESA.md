# PLD VISSION / SCMVP

## Contrato técnico canónico — Lote 2E: gestión de matrices PT/GR por empresa

### Control del documento

| Dato | Valor |
|---|---|
| Estado | APROBADO para diseño e implementación futura por sublotes |
| Fecha | 2026-08-05 |
| Alcance | Gestión administrativa mínima de versiones de matrices PT/GR por empresa |
| Naturaleza | Contrato funcional y técnico; no acredita implementación ni despliegue |
| Producción | La migración `20260801_002_matrices_pt_gr_empresa` sigue NO ejecutada y NO autorizada |
| Sublote 2E-0 | CERRADO; decisiones físicas APROBADAS para diseñar la migración 003 |

## 1. Objetivo y alcance

Este documento fija el contrato canónico del Lote 2E para que un administrador
gestione el ciclo de vida de la matriz PT/GR propia de cada empresa: listar
versiones, consultar detalle, previsualizar, crear un borrador, cargar y validar
su Excel, publicar, activar, desactivar y crear una versión nueva desde una
histórica.

El lote termina en la administración de definiciones normalizadas y su archivo
fuente. No implementa el motor de evaluación PT/GR ni modifica evaluaciones o
expedientes existentes. Las rutas, tablas adicionales y pantallas descritas
aquí son contratos propuestos: no deben presentarse como capacidades actuales.

Fuentes consolidadas:

- `docs/contexto/MEMORIA_TECNICA_OPERATIVA_PLD_VISSION.md`;
- `docs/contexto/RESUMEN_TECNICO_EJECUTIVO_LOTE_2.md`;
- `ESPECIFICACION_EXCEL_PT_GR_CAVIACE_MVP.md`;
- `ARQUITECTURA_MATRICES_CATALOGOS_Y_EVALUACIONES_MVP.md`;
- `INSPECCION_MATRIZ_PERFIL_TRANSACCIONAL_MVP.md`;
- migración 002, servicio, rutas, montaje y frontend señalados en el encargo.

## 2. Base comprobada y dependencias

Actualmente:

- no existen endpoints de gestión de matrices;
- `backend/src/services/matrices-empresa.service.ts` solo consulta si existe una
  versión `PUBLICADA` con `activa = TRUE`;
- `GET /api/admin/empresas` y `GET /api/admin/empresas/:id` exponen
  `tiene_matriz_publicada_activa`; el primero admite admin y consultor, y limita
  al consultor a su empresa;
- el router administrativo está montado en `/api/admin`;
- `frontend/src/app/admin/empresas/page.tsx` lista y muestra empresas, pero no
  administra matrices;
- `frontend/src/lib/api.ts` no contiene clientes HTTP de matrices;
- la migración 002 define las seis tablas de versiones, criterios, opciones,
  rangos, reglas y metadatos de archivo, pero no está desplegada en producción.
- `backend/src/config/database.ts` no existe. La fuente efectiva comprobada de
  conexión PostgreSQL es `backend/src/db.ts`, que exporta un `Pool` de `pg` y
  usa `DATABASE_URL`;
- `backend/package.json` ya declara `exceljs` 4.4.0, pero esa librería no será
  la primera barrera frente a archivos hostiles: antes debe inspeccionarse el
  paquete ZIP/OOXML;
- el alta de clientes en `backend/src/routes/cliente.routes.ts` abre una
  transacción y comprueba la matriz activa mediante
  `hasPublishedActiveCompanyMatrix`, pero aún no toma el advisory lock
  compartido aprobado en este contrato.

Dependencias obligatorias para implementar:

1. La migración 001 debe existir en el ambiente objetivo.
2. La migración 002 deberá aprobarse y desplegarse mediante un proceso separado;
   este documento no lo autoriza.
3. Debe diseñarse, revisarse y aprobarse la migración 003 que complete
   almacenamiento binario, auditoría append-only, idempotencia, control de
   concurrencia y la restricción de una sola versión pendiente.
4. Backend y frontend del flujo 2E solo podrán desplegarse cuando el esquema que
   consumen exista y haya sido verificado.

Orden técnico obligatorio: `001 -> 002 -> VERIFY 002 -> 003 -> VERIFY 003`.
La autorización para ejecutar en producción es un acto separado. La migración
002 permanece **NO ejecutada y NO autorizada en producción**; este cambio
documental no ejecuta ni autoriza la 002, la 003 ni ninguna otra migración.

### Diferencias resueltas por este contrato

- La 002 contiene `referencia_contenido` y no almacena el binario. Para el MVP
  queda aprobado conservar el Excel completo en PostgreSQL; se requiere una
  migración 003.
- Documentos anteriores proponían exigir consultor activo para publicar o
  activar. En Lote 2E no se exige consultor asignado para activar.
- La inspección general recomendaba rechazar todas las fórmulas. El contrato
  específico Caviace comprobó seis fórmulas de totales. Se admiten exactamente
  esas seis en sus ubicaciones o la variante simple sin fórmulas de totales.
- Una propuesta anterior describía publicar como creación de versión. Aquí,
  publicar cambia el estado de la misma fila; la fila nueva se crea al abrir el
  borrador.

## 3. Principios de aislamiento por empresa

1. Cada empresa carga su propio Excel. Caviace y la plantilla inspeccionada son
   referencias estructurales, no un catálogo universal de contenido.
2. El contrato estructural es común; preguntas, opciones, rangos, puntajes y
   reglas pertenecen a la versión y proceden exclusivamente del archivo de esa
   empresa.
3. Toda lectura o escritura debe incluir y verificar `empresa_id` además del ID
   de versión. Un ID de versión por sí solo nunca autoriza acceso.
4. `empresa_id`, usuario actor y datos de auditoría se derivan del path y de
   `req.user`; no se confía en valores equivalentes enviados en body, query,
   nombre del archivo o celdas.
5. Todas las operaciones de este lote son exclusivas del rol `admin`. Consultor
   y cliente reciben `403` sin datos de la matriz. Para IDs inexistentes o fuera
   del alcance autorizado puede utilizarse `404` para no filtrar existencia.
6. El archivo, su preview, errores por celda, criterios, puntajes, reglas y
   rangos son información administrativa; no se incluyen en DTO de cliente.
7. Una empresa puede existir sin matriz activa. Sin matriz `PUBLICADA` y activa,
   el bloqueo vigente de alta de nuevos clientes permanece como autoridad de
   backend.

## 4. Estados, invariantes y transiciones

`estado_editorial` conserva los valores de la migración 002 y `activa` modela
vigencia separadamente.

| Estado visible | Persistencia | Mutable | Uso para alta de clientes |
|---|---|---:|---:|
| BORRADOR | `BORRADOR`, `activa=false` | Sí | No |
| VALIDADA | `VALIDADA`, `activa=false` | Solo puede volver a BORRADOR por nueva carga/cambio | No |
| PUBLICADA inactiva | `PUBLICADA`, `activa=false` | No | No |
| ACTIVA | `PUBLICADA`, `activa=true` | No | Sí |

Flujo principal:

```text
BORRADOR -> VALIDADA -> PUBLICADA inactiva -> ACTIVA
```

Transiciones aprobadas:

| Operación | Desde | Hacia | Condiciones |
|---|---|---|---|
| Cargar/reemplazar archivo | BORRADOR o VALIDADA | BORRADOR | Reemplazo atómico; invalida validación previa |
| Validar | BORRADOR | VALIDADA | Cero errores bloqueantes; advertencias permitidas |
| Publicar | VALIDADA | PUBLICADA inactiva | Misma fila; versión queda inmutable |
| Activar | PUBLICADA inactiva | ACTIVA | No exige consultor asignado |
| Sustituir activa | PUBLICADA inactiva | ACTIVA | En una transacción, la anterior queda `PUBLICADA`, `activa=false` |
| Desactivar | ACTIVA | PUBLICADA inactiva | Motivo obligatorio; empresa puede quedar sin activa |
| Nueva desde histórica | PUBLICADA, activa o inactiva | nuevo BORRADOR | Nueva fila y nuevo número; `version_origen_id` y motivo |

Invariantes:

- Como máximo una versión activa por empresa.
- Como máximo una versión pendiente por empresa; `BORRADOR` y `VALIDADA`
  cuentan como pendiente.
- Una versión `PUBLICADA` es inmutable: no cambia archivo, contenido
  normalizado, reporte de validación, número, empresa ni origen. Solo puede
  cambiar `activa` mediante las operaciones explícitas de activar/desactivar.
- Activar una nueva no degrada el estado editorial de la anterior: continúa
  `PUBLICADA` con `activa=false`.
- Revertir nunca reactiva una histórica. Crea un BORRADOR nuevo con
  `version_origen_id`, copia física independiente del binario y de la definición
  normalizada, y trazabilidad completa.
- No se elimina una versión publicada ni su archivo fuente.

## 5. Contrato del archivo Excel

### 5.1 Propiedad del contenido

El importador valida una estructura común y persiste el contenido particular de
la empresa. No reemplaza criterios, textos, opciones, límites, puntajes o reglas
por valores de Caviace, por constantes del frontend o por contenido de otra
empresa. Las claves internas que falten en el Excel pueden generarse de forma
estable dentro de la versión a partir del ámbito y orden; no adquieren carácter
de catálogo jurídico universal.

### 5.2 Formatos y límites

- El usuario sube exclusivamente `.xlsx`; se exige tipo real y contenedor
  válidos, no basta extensión o MIME declarado por el navegador.
- Tamaño máximo comprimido: 5 MiB (`5 * 1024 * 1024` bytes), validado antes de
  parsear.
- Hojas estructurales requeridas: `PERFIL TRANSACCIONAL` y
  `GRADO DE RIESGO DE CLIENTE`, conforme al contrato de plantilla.
- Límites defensivos: máximo 8 hojas, 500 filas por hoja, 64 columnas por hoja,
  10,000 celdas no vacías en total, 256 entradas ZIP, 25 MiB descomprimidos en
  total, 10 MiB descomprimidos por entrada y ratio máximo
  descomprimido:comprimido de 20:1 tanto por entrada como global
  (`tamaño_descomprimido / tamaño_comprimido <= 20`).
- El timeout total de inspección y parseo es 5 segundos. Exceder cualquier
  límite produce rechazo bloqueante; los límites no se degradan a advertencia.
- La importación es total: un error bloqueante impide validar y nunca deja
  criterios/opciones/rangos parcialmente reemplazados.

### 5.3 Inspección ZIP/OOXML previa

Antes de entregar contenido a `exceljs`, el backend inspecciona centralmente el
ZIP y las relaciones OOXML. Rechaza hojas extra respecto de las admitidas por
la plantilla, hojas ocultas o `very hidden`, nombres definidos no reconocidos,
macros/VBA, OLE, objetos incrustados, vínculos externos, entradas cifradas,
rutas ZIP inseguras y cualquier parte OOXML fuera de una allowlist explícita.
También rechaza entradas duplicadas/ambiguas y violaciones de los límites de
5.2. `exceljs` nunca actúa como detector único de contenido activo.

### 5.4 Fórmulas permitidas

Se aceptan dos variantes:

1. Archivo empresarial con exactamente las fórmulas contractuales que estén
   presentes, y únicamente en estas celdas y con estas expresiones:

   - PT `C19=SUM(C6:C18)`;
   - PT `D19=SUM(D4:D18)`;
   - PT `E19=SUM(E4:E18)`;
   - GR `C19=SUM(C4:C18)`;
   - GR `D19=SUM(D4:D18)`;
   - GR `E19=SUM(E4:E18)`.

2. Variante simple sin fórmulas de totales.

No se permiten fórmulas parciales o distintas, aun si producen el mismo valor.
El backend jamás ejecuta fórmulas ni confía en valores cacheados; reconstruye y
valida los totales desde opciones y puntajes normalizados. Cualquier otra
fórmula, macro/VBA, vínculo externo, nombre definido con ejecución/referencia
externa, objeto incrustado ejecutable u otro contenido activo bloquea la carga.

### 5.5 Resultado de validación

Cada hallazgo incluye como mínimo `codigo`, `severidad`, `hoja`, `celda` o
`rango`, `fila`, `columna` y `mensaje`. El reporte diferencia errores
bloqueantes y advertencias. La preview se genera únicamente desde el contenido
parseado y recalculado por backend.

## 6. Contrato funcional

### 6.1 Listar versiones

- Entrada: empresa del path, paginación y filtros permitidos de estado/activa.
- Verifica que la empresa exista.
- Devuelve cabeceras ordenadas por `numero_version` descendente, estado, activa,
  origen, fechas, actores, metadatos de archivo y si existe una pendiente.
- No devuelve binario ni el contenido normalizado completo.

### 6.2 Consultar detalle

- Devuelve una versión que pertenezca a la empresa del path.
- Incluye cabecera, metadatos del archivo, reporte de validación, resumen de
  criterios/opciones/rangos/reglas, origen y capacidades permitidas según
  estado (`puede_validar`, `puede_publicar`, `puede_activar`, etc.).
- El binario se obtiene, si se implementa descarga, por una ruta separada,
  exclusiva de admin, con disposición `attachment` y sin URL pública.

### 6.3 Preview

- Disponible para BORRADOR, VALIDADA y PUBLICADA, siempre solo a admin.
- Muestra el contenido normalizado que se publicaría o fue publicado: ámbitos,
  criterios, opciones, puntajes, rangos, reglas, totales propios, advertencias,
  errores, huella y versión activa que podría sustituirse.
- No lee resultados cacheados de Excel y no muta estado.

### 6.4 Crear borrador

- Crea la nueva fila de versión, no la publicación.
- Rechaza si la empresa ya tiene BORRADOR o VALIDADA.
- Asigna de forma transaccional `MAX(numero_version)+1` bajo bloqueo por empresa.
- Para un borrador vacío, `version_origen_id` es nulo. Para nueva versión desde
  histórica se usa la operación específica.
- Registra actor y evento de auditoría.

### 6.5 Cargar archivo

- Solo sobre BORRADOR o VALIDADA; `If-Match` obligatorio.
- Valida límite, firma/tipo real y contenido activo antes de normalizar.
- Calcula SHA-256 en backend y guarda binario, nombre original saneado, MIME
  detectado y tamaño.
- Sustituye atómicamente archivo y estructura normalizada del borrador. Si venía
  de VALIDADA, vuelve a BORRADOR y limpia los datos de validación vigentes sin
  borrar el historial append-only.
- Un fallo conserva intacta la última carga válida.

### 6.6 Validar

- Solo desde BORRADOR con archivo completo; `If-Match` e `Idempotency-Key`
  obligatorios.
- Relee el binario persistido, aplica allowlist y contrato estructural, recalcula
  todo y compara el SHA-256 antes de cambiar estado.
- Con errores bloqueantes permanece BORRADOR y guarda reporte/registro de
  intento; con cero errores pasa a VALIDADA y registra actor/fecha.
- La respuesta contiene reporte determinista y nueva etiqueta de versión.

### 6.7 Publicar

- Solo desde VALIDADA; `If-Match` e `Idempotency-Key` obligatorios.
- Cambia a `PUBLICADA`, `activa=false` en la misma fila; no crea otra versión.
- Comprueba que archivo, SHA-256 y estructura coincidan con lo validado.
- A partir del commit, el contenido es inmutable.

### 6.8 Activar

- Solo una PUBLICADA inactiva puede activarse.
- No exige consultor asignado.
- En una sola transacción y bajo bloqueo por empresa: bloquea versiones de la
  empresa, pone `activa=false` a la anterior si existe y registra en ella
  `desactivada_por` y `desactivada_en`, activa la elegida y registra en ella
  `activada_por` y `activada_en`, y agrega la auditoría correspondiente. Actor,
  fecha, cambio de vigencia y auditoría se confirman en la misma transacción. La
  anterior sigue PUBLICADA.
- Requiere `If-Match`, `Idempotency-Key` y confirmación explícita de la versión
  activa que será sustituida, si la hay.

### 6.9 Desactivar

- Solo sobre la PUBLICADA activa.
- Motivo no vacío obligatorio, máximo 500 caracteres.
- En una transacción cambia `activa=false`, registra `desactivada_por` y
  `desactivada_en`, y audita actor, motivo y estado anterior/nuevo. Actor, fecha,
  cambio de vigencia y auditoría se confirman en la misma transacción. Puede
  dejar a la empresa sin matriz activa.
- El backend debe bloquear desde ese commit el alta de nuevos clientes con el
  contrato `409` ya vigente. No elimina clientes ni altera históricos.

### 6.10 Crear nueva versión desde histórica

- Admite una versión PUBLICADA activa o inactiva de la misma empresa.
- Requiere motivo, `If-Match` sobre la fuente e `Idempotency-Key`.
- Rechaza si ya existe pendiente.
- En una transacción crea un BORRADOR con nuevo número,
  `version_origen_id=fuente.id`, copia física independiente del binario y copia
  física de toda la definición normalizada, nueva auditoría y sin alterar la
  fuente. En el MVP no hay deduplicación física por SHA-256 ni referencias
  compartidas al contenido de la histórica.
- La copia puede editarse/cargarse mientras sea BORRADOR. Debe validarse y
  publicarse de nuevo antes de activar.

## 7. Contratos HTTP propuestos

Todos los endpoints requieren `authenticate` y `authorizeRoles('admin')`.
Ninguno está implementado por este documento.

| Método y ruta | Función | Éxito esperado |
|---|---|---:|
| `GET /api/admin/empresas/:empresaId/matrices` | Listar versiones | 200 |
| `GET /api/admin/empresas/:empresaId/matrices/:versionId` | Detalle | 200 |
| `GET /api/admin/empresas/:empresaId/matrices/:versionId/preview` | Preview | 200 |
| `GET /api/admin/empresas/:empresaId/matrices/:versionId/archivo` | Descargar fuente | 200 |
| `POST /api/admin/empresas/:empresaId/matrices` | Crear borrador vacío | 201 |
| `PUT /api/admin/empresas/:empresaId/matrices/:versionId/archivo` | Cargar/reemplazar `.xlsx` | 200 |
| `POST /api/admin/empresas/:empresaId/matrices/:versionId/validacion` | Validar | 200 |
| `POST /api/admin/empresas/:empresaId/matrices/:versionId/publicacion` | Publicar inactiva | 200 |
| `POST /api/admin/empresas/:empresaId/matrices/:versionId/activacion` | Activar/sustituir activa | 200 |
| `POST /api/admin/empresas/:empresaId/matrices/:versionId/desactivacion` | Desactivar con motivo | 200 |
| `POST /api/admin/empresas/:empresaId/matrices/:versionId/nueva-version` | Crear BORRADOR desde histórica | 201 |

Contrato de cuerpos mínimos:

- crear borrador: sin `empresa_id`; puede incluir `motivo_nueva_version` solo si
  una futura regla lo requiere;
- archivo: `multipart/form-data` con una sola parte `archivo`;
- validar/publicar: body vacío o metadatos no autoritativos;
- activar: `version_activa_esperada_id`, nullable cuando se espera ninguna;
- desactivar: `{ "motivo": "..." }`;
- nueva desde histórica: `{ "motivo": "..." }`.

Las respuestas usan un sobre estable con `data`; los errores, uno con `error`:

```json
{
  "error": {
    "codigo": "MATRIZ_TRANSICION_INVALIDA",
    "mensaje": "La versión no puede publicarse desde su estado actual",
    "detalles": []
  }
}
```

Los identificadores de actor, empresa, estado, puntaje, SHA-256 o resultado de
validación enviados por el cliente no son autoritativos.

## 8. Concurrencia, transacciones e idempotencia

### 8.1 Etiqueta de versión e `If-Match`

La 003 agrega `matriz_empresa_version.revision BIGINT NOT NULL DEFAULT 1`, con
`CHECK (revision > 0)`. Toda lectura de detalle/preview devuelve el ETag fuerte
exacto `"mve-<versionId>-r<revision>"`. Toda mutación de una versión existente
exige `If-Match`, compara la revisión dentro de la transacción e incrementa
`revision` exactamente una vez si produce un cambio. Ausencia produce `428
Precondition Required`; token mal formado u obsoleto produce `412 Precondition
Failed`.

### 8.2 `Idempotency-Key`

Es obligatorio para crear borrador, validar, publicar, activar, desactivar y
crear desde histórica; también se recomienda para la carga. `Idempotency-Key`
admite de 16 a 128 caracteres ASCII visibles (`0x21` a `0x7E`). La clave nunca
se persiste en claro: se guarda únicamente su SHA-256. El ámbito único es actor
+ empresa + operación + hash de clave; se guarda además hash canónico del
request, estado y respuesta reproducible. Repetir clave y mismo request devuelve
el resultado original; repetirla con otro request devuelve `409`.

La retención es 7 días desde creación. La respuesta persistida no supera 64
KiB. La limpieza es un proceso separado, observable, por lotes y sin cron dentro
de la migración; registra métricas/resultado y nunca consulta, modifica ni borra
auditoría.

### 8.3 Transacciones y bloqueos

- El namespace operativo fijo para matrices por empresa es
  `MATRICES_EMPRESA_LOCK_NAMESPACE = 2205`.
- Crear/numerar, activar, desactivar y crear desde histórica toman advisory lock
  transaccional **exclusivo** por empresa antes de leer estado relevante, con
  `pg_catalog.pg_advisory_xact_lock(2205, empresa_id)`, y lo conservan hasta
  commit/rollback.
- El alta de clientes toma el advisory lock transaccional **compartido** por la
  empresa antes de comprobar si hay matriz activa, con
  `pg_catalog.pg_advisory_xact_lock_shared(2205, empresa_id)`, y lo conserva
  hasta completar toda su transacción. Así, una desactivación no puede
  intercalarse entre la comprobación y el commit del alta.
- Numerar versión, verificar pendiente y crear borrador ocurren en una misma
  transacción bajo el lock exclusivo.
- Sustituir archivo y definición normalizada es atómico.
- Publicar verifica estado, revisión y huella con bloqueo de la fila.
- Activar/desactivar bloquea todas las cabeceras relevantes de la empresa en
  orden estable y confirma la activa esperada.
- Crear desde histórica bloquea fuente y conjunto de versiones de la empresa.
- Restricciones únicas de base son la última defensa; conflictos se traducen a
  errores de dominio y no a `500` genérico.

Los locks de fila se adquieren después del advisory lock y en orden estable de
ID. Las restricciones únicas siguen siendo la última defensa. No se permite
usar un lock de sesión: debe ser `pg_advisory_xact_lock` o su variante compartida
transaccional.

El lock textual propio de la migración 003 usa
`pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('20260805_003_gestion_matrices_empresa'))`.
Este lock de migración y el namespace operativo `2205` por `empresa_id` son
mecanismos distintos, con ámbitos y propósitos diferentes, y no deben mezclarse
ni derivarse uno del otro.

## 9. Auditoría append-only

Se requiere una tabla adicional de eventos que nunca se actualice ni elimine
por los flujos de aplicación. Como mínimo registra:

- ID de evento, fecha del servidor y actor derivado de `req.user.id`;
- empresa, versión y versión origen cuando aplique;
- acción (`BORRADOR_CREADO`, `ARCHIVO_CARGADO`, `VALIDACION_INTENTADA`,
  `VALIDADA`, `PUBLICADA`, `ACTIVADA`, `DESACTIVADA`,
  `NUEVA_DESDE_HISTORICA`);
- estado y activa antes/después;
- motivo obligatorio donde corresponda;
- nombre, MIME, tamaño y SHA-256 del archivo cuando aplique;
- hash SHA-256 de clave de idempotencia y correlation/request ID;
- resumen controlado de resultado, sin binario, token, secretos ni contenido
  sensible innecesario.

Los campos `creada_por`, `validada_por`, `publicada_por` y `cargado_por` de la
002 se conservan como resumen de estado, pero no sustituyen el historial
append-only. Activar, sustituir activa y desactivar también requieren actor y
fecha; están ausentes en la 002 y su diseño físico aprobado para la 003 se
especifica en las secciones 10 y 11.

La tabla de auditoría queda protegida por trigger `BEFORE UPDATE OR DELETE` que
siempre aborta la operación. El rol de aplicación recibe únicamente `SELECT` e
`INSERT` sobre ella: no recibe `UPDATE`, `DELETE` ni `TRUNCATE`. La separación
entre rol propietario de objetos y rol de aplicación es requisito previo a
producción; el propietario no se usa por la aplicación. El resumen controlado
de auditoría tiene máximo 16 KiB; `accion` tiene máximo 40 caracteres y
`correlation_id`/`request_id`, cuando se conserven por separado, máximo 128
caracteres ASCII visibles.

## 10. Diseño físico aprobado de la futura migración 003

La 003 complementa, no reemplaza, las seis tablas de la 002. Los nombres aquí
son el contrato propuesto para redactar SQL; cualquier cambio nominal durante
la revisión debe conservar las invariantes y documentarse antes de ejecutar.

### 10.1 Cambios sobre tablas de la 002

| Tabla | Columna/cambio aprobado |
|---|---|
| `matriz_archivo_fuente` | `contenido BYTEA NOT NULL`; binario `.xlsx` íntegro |
| `matriz_archivo_fuente` | `nombre_original VARCHAR(255)` y además máximo 1024 bytes UTF-8 |
| `matriz_archivo_fuente` | `mime_detectado VARCHAR(127)` |
| `matriz_archivo_fuente` | `referencia_contenido VARCHAR(512)` solo si se mantiene utilizable; no sustituye `contenido` |
| `matriz_empresa_version` | `revision BIGINT NOT NULL DEFAULT 1`, positiva |
| `matriz_empresa_version` | `version_origen_empresa_id INTEGER NULL` |
| `matriz_empresa_version` | `motivo_nueva_version` limitado a 500 caracteres |
| `matriz_empresa_version` | `activada_por INTEGER NULL` |
| `matriz_empresa_version` | `activada_en TIMESTAMPTZ NULL` |
| `matriz_empresa_version` | `desactivada_por INTEGER NULL` |
| `matriz_empresa_version` | `desactivada_en TIMESTAMPTZ NULL` |

La migración 003 aborta antes de alterar el esquema si existe cualquier fila
previa de `matriz_archivo_fuente` para la cual no pueda obtenerse un binario
confiable e íntegro, verificable contra `tamano_bytes` y `sha256`. No inventa
contenido, no deja `contenido` nulo y no convierte una referencia no verificable
en prueba de integridad.

### 10.2 Tablas nuevas propuestas

`matriz_auditoria_evento` contiene como mínimo: `id BIGSERIAL`, `empresa_id`,
`matriz_version_id`, `version_origen_id`, `actor_usuario_id`, `accion
VARCHAR(40)`, `operacion VARCHAR(40)`, estados/activa antes y después, `motivo`
limitado a 500 caracteres, metadatos y SHA-256 del archivo, hash de clave
idempotente, `correlation_id VARCHAR(128)`, `request_id VARCHAR(128)`, `resumen
JSONB` limitado a 16 KiB y `creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()`.

`matriz_idempotencia` contiene como mínimo: `id BIGSERIAL`, `empresa_id`,
`actor_usuario_id`, `operacion VARCHAR(40)`, `clave_sha256 CHAR(64)`,
`request_sha256 CHAR(64)`, estado de ejecución, código HTTP, `respuesta JSONB`
limitada a 64 KiB, referencias de resultado, `creado_en`, `completado_en` y
`expira_en` fijado a creación + 7 días. No contiene la clave original.

### 10.3 Constraints e índices de la 003

- agregar `UNIQUE (id, empresa_id)` a `matriz_empresa_version`;
- poblar `version_origen_empresa_id=empresa_id` cuando exista origen, exigir
  `CHECK (version_origen_empresa_id IS NULL OR version_origen_empresa_id =
  empresa_id)` y FK compuesta `(version_origen_id,
  version_origen_empresa_id) -> matriz_empresa_version(id, empresa_id)`; ambos
  campos de origen son nulos o ambos no nulos;
- conservar unicidad de una activa y agregar índice único parcial por
  `empresa_id` para una sola pendiente donde `estado_editorial IN
  ('BORRADOR','VALIDADA')`;
- agregar FK `activada_por -> usuarios(id) ON DELETE RESTRICT` y FK
  `desactivada_por -> usuarios(id) ON DELETE RESTRICT`;
- exigir `CHECK ((activada_por IS NULL) = (activada_en IS NULL))` y `CHECK
  ((desactivada_por IS NULL) = (desactivada_en IS NULL))`, de modo que cada par
  actor/fecha sea completamente nulo o completamente no nulo;
- dejar los índices individuales por `activada_por` y `desactivada_por` como
  decisión pendiente de revisión técnica basada en consultas reales,
  selectividad y costo de escritura;
- checks de SHA-256 hexadecimal minúsculo, tamaños y longitudes/bytes aprobados;
- unicidad idempotente en `(empresa_id, actor_usuario_id, operacion,
  clave_sha256)` e índice de limpieza por `expira_en`;
- índices de auditoría por `(empresa_id, creado_en)`, `(matriz_version_id,
  creado_en)` y actor/fecha según VERIFY; ninguno habilita borrado;
- FKs a empresa, usuario y versión con política restrictiva para auditoría e
  idempotencia, evitando cascadas que destruyan trazabilidad.

### 10.4 Conservación y copia física

Para el MVP se conserva una copia íntegra del `.xlsx` directamente en
`matriz_archivo_fuente.contenido`, asociada uno a uno con la versión, junto con:

- nombre original saneado;
- MIME detectado por backend;
- tamaño en bytes, máximo 5 MiB;
- SHA-256 hexadecimal calculado por backend;
- usuario y fecha de carga.

No se aplica deduplicación física en el MVP. Crear desde histórica inserta un
nuevo binario y nuevas filas para toda la definición normalizada. El acceso es
exclusivo de admin, autenticado, auditado y
sin URL pública. La descarga debe enviar cabeceras seguras, impedir sniffing y
usar nombre saneado. No se registra el binario en logs ni respuestas JSON.

La retención mínima cubre toda la vida de la versión y sus referencias
históricas. Eliminación, archivado externo, cifrado adicional y retención final
posterior al MVP quedan pendientes; no autorizan borrar fuentes durante 2E.

## 11. Estrategia UP, VERIFY y DOWN de la 003

El nombre/key definitivo de la migración 003 es
`20260805_003_gestion_matrices_empresa`. Sus archivos previstos son:

- `backend/migrations/20260805_003_gestion_matrices_empresa.up.sql`;
- `backend/migrations/20260805_003_gestion_matrices_empresa.verify.sql`;
- `backend/migrations/20260805_003_gestion_matrices_empresa.down.sql`.

### UP

1. Adquiere el lock propio de migración
   `pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('20260805_003_gestion_matrices_empresa'))`
   y comprueba esquema, 001, 002 verificada y ausencia de estado parcial.
2. Aborta si una fila previa de archivo carece de binario confiable.
3. Agrega columnas, backfill verificable, constraints, índices, tablas, función
   y trigger append-only, y privilegios; valida antes de registrar la 003.
4. No instala cron ni ejecuta limpieza de idempotencia.

### VERIFY

Es read-only y falla ante diferencias de columnas, defaults, nulabilidad,
constraints, FKs compuestas, índices/predicados, trigger, privilegios, registro
de migración o datos incoherentes. Verifica `octet_length(contenido) =
tamano_bytes`, SHA-256 cuando la capacidad segura esté disponible, coherencia de
origen, una sola pendiente/activa, revisión positiva y ausencia de permisos de
mutación/TRUNCATE de auditoría para el rol de aplicación. Para `activada_por`,
`activada_en`, `desactivada_por` y `desactivada_en` comprueba expresamente tipos,
nulabilidad, ambas FKs a `usuarios(id)`, su `ON DELETE RESTRICT`, ambos CHECK,
la inexistencia de pares actor/fecha incoherentes y, solo si finalmente se
incluyen en el diseño SQL aprobado, los índices correspondientes.

### DOWN

Es conservador: preflight estricto y aborto si existen datos creados o afectados
por la 003. Después del primer uso real no revierte. Nunca elimina auditoría ni
binarios para forzar un rollback y no deja un esquema híbrido. La recuperación
productiva se realiza mediante una migración correctiva autorizada, no mediante
un DOWN destructivo. Las cuatro columnas de activación/desactivación, sus FKs,
CHECK e índices solo se eliminan cuando ese preflight conservador confirma que
la reversión es segura; en caso contrario, el DOWN aborta sin eliminar ninguno
de esos objetos.

## 12. Errores HTTP mínimos

| HTTP | Uso mínimo |
|---:|---|
| 400 | ID/body inválido, motivo vacío, archivo mal formado |
| 401 | Sin autenticación válida |
| 403 | Rol distinto de admin |
| 404 | Empresa/versión no encontrada dentro del contexto autorizado |
| 409 | Pendiente ya existente, transición inválida, activa esperada distinta, clave idempotente reutilizada con otro request o restricción de dominio |
| 412 | `If-Match` obsoleto |
| 413 | Archivo mayor de 5 MiB |
| 415 | Tipo real distinto de `.xlsx` permitido |
| 422 | Estructura/contenido Excel no cumple; devuelve errores por celda |
| 428 | Falta `If-Match` obligatorio |
| 500 | Error interno no clasificado, sin filtrar SQL, rutas o secretos |

## 13. Alcance exacto de frontend

El frontend futuro se limita al área admin:

1. Agregar desde el listado/detalle de empresa una entrada “Gestionar matriz”.
2. Crear una vista por empresa con estado de matriz activa, versión pendiente e
   historial paginado.
3. Mostrar estados separados: BORRADOR, VALIDADA, PUBLICADA inactiva y ACTIVA.
4. Permitir crear borrador, seleccionar/cargar un `.xlsx` de hasta 5 MiB, mostrar
   progreso y errores devueltos por backend.
5. Renderizar preview administrativa de criterios, opciones, puntajes, rangos,
   reglas, totales, huella, advertencias y errores por hoja/celda.
6. Habilitar acciones solo según capacidades del DTO: validar, publicar,
   activar, desactivar y crear nueva desde histórica.
7. Pedir confirmación al activar/sustituir; pedir motivo obligatorio al
   desactivar y al crear desde histórica; advertir que desactivar bloqueará el
   alta de clientes.
8. Conservar `ETag`, enviar `If-Match`, generar/reutilizar correctamente
   `Idempotency-Key` por intento lógico y manejar 409/412/428 sin ocultarlos.
9. No parsear el Excel como autoridad, no calcular puntajes, no confiar en
   controles ocultos y no incluir interfaz de matrices para consultor/cliente.
10. Extender `frontend/src/lib/api.ts` con funciones y tipos específicos; no
    mezclar contratos de matriz con los DTO de clientes.

No forma parte del lote rediseñar el CRUD general de empresas ni el formulario
de clientes, salvo reflejar el indicador vigente y mensaje de bloqueo ya
existentes cuando se desactive una matriz.

## 14. Fuera de alcance

- Ejecutar o autorizar migraciones, incluida la 002.
- Programar los endpoints o pantallas dentro de este contrato documental.
- Motor PT/GR, captura, cálculo, evaluación, snapshots y recálculo histórico.
- Catálogos globales PF/PM, overlays de actividad/giro y marcas faltantes.
- Modificar `matrices_riesgo`, `cliente_perfil_transaccional`,
  `datos_completos`, `deepMerge` o contratos PF/PM/Fideicomiso/Recursos de
  Terceros.
- Obligar consultor por empresa para activar.
- Acceso de consultor o cliente al archivo, preview o administración.
- Macros, `.xls`, Google Sheets, vínculos externos, hojas ejecutables o
  importación parcial.
- Correo, notificaciones, supervisor y outbox.
- Borrado de versiones publicadas, reactivación directa de históricas o edición
  de una PUBLICADA.
- Almacenamiento externo del Excel, antivirus como servicio y cifrado con llave
  de aplicación, sin perjuicio de controles de plataforma existentes.

## 15. Secuencia de sublotes 2E-0 a 2E-8

Cada sublote debe corresponder a un ticket `COR-XXX`, revisar dependencias y
completar build, prueba del caso y regresión antes de avanzar.

| Sublote | Entregable acotado |
|---|---|
| 2E-0 | CERRADO: diseño físico y decisiones de seguridad aprobados en este contrato. Sin ejecutar migraciones. |
| 2E-1 | Migración 003 UP/VERIFY/DOWN y pruebas desechables autorizadas; despliegue productivo fuera de alcance hasta autorización separada. |
| 2E-2 | Backend de listar, detalle, preview y descarga admin con aislamiento y ETag. |
| 2E-3 | Backend de crear borrador y una sola pendiente, con transacción e idempotencia. |
| 2E-4 | Carga segura, almacenamiento binario, SHA-256, parser y normalización atómica. |
| 2E-5 | Validación estructural/contenido, allowlist de fórmulas, reportes por celda y transición a VALIDADA. |
| 2E-6 | Publicar, activar y desactivar con inmutabilidad, sustitución atómica, motivo y auditoría; coordinación con alta de clientes. |
| 2E-7 | Nueva versión desde histórica con `version_origen_id`, copia física e idempotencia. |
| 2E-8 | Frontend admin completo, pruebas por rol/concurrencia/archivo, builds y regresión integral del Lote 2. |

La redacción de SQL de 2E-1 comienza únicamente después de cerrar los pendientes
residuales de la sección 19 que afecten nombres, preflight o privilegios.

## 16. Criterios de aceptación

1. Solo admin puede leer o mutar matrices y descargar el archivo.
2. Ningún ID permite cruzar información entre empresas.
3. Una empresa puede tener cero activas, como máximo una activa y como máximo
   una pendiente contando BORRADOR + VALIDADA.
4. El flujo comprobable es BORRADOR → VALIDADA → PUBLICADA inactiva → ACTIVA.
5. Publicar actualiza la misma fila y vuelve inmutable su contenido.
6. Activar una nueva desactiva atómicamente la anterior sin sacarla de
   PUBLICADA.
7. Desactivar exige motivo, audita y bloquea altas nuevas desde el commit.
8. Reversión crea una versión nueva con `version_origen_id`; la histórica no se
   reactiva ni modifica.
9. Activar funciona sin consultor asignado.
10. Se aceptan el archivo con las seis fórmulas exactas en posiciones esperadas
    y la variante simple sin totales; cualquier otro contenido ejecutable se
    rechaza.
11. El backend recalcula y jamás usa el cache de fórmulas.
12. El archivo máximo de 5 MiB y sus metadatos/SHA-256 se conservan completos en
    PostgreSQL; descarga solo admin.
13. Mutaciones concurrentes respetan `If-Match`; reintentos respetan
    `Idempotency-Key` y no duplican efectos.
14. Cada intento y transición material deja evento append-only con actor,
    empresa, versión, antes/después y motivo aplicable.
15. Un fallo a mitad de carga, publicación, activación o copia no deja estado
    parcial.
16. Frontend no calcula ni autoriza; representa capacidades y errores del
    backend.
17. Regresión: alta de cliente sin activa responde el `409` vigente; con activa
    continúa; CRUD de empresa y flujos PF/PM/Fideicomiso/terceros no cambian.

## 17. Riesgos

- **Desfase de esquema:** desplegar código antes de 002 y la migración 003
  causaría fallos. Mitigación: orden de despliegue y verificación explícitos.
- **TOCTOU con alta de clientes:** desactivar/activar puede competir con un alta.
  Mitigación aprobada: advisory lock exclusivo para vigencia y compartido para
  el alta durante toda su transacción.
- **Excel hostil/descompresión:** 5 MiB comprimidos no limita expansión.
  Mitigación: topes internos, parseo defensivo y rechazo de contenido activo.
- **Parser incompleto:** librerías pueden no detectar todas las relaciones,
  macros u objetos. Mitigación: inspección del paquete OOXML y corpus adversarial.
- **Pérdida de auditoría:** campos resumen no capturan activaciones repetidas.
  Mitigación: eventos append-only dentro de la misma transacción.
- **Carreras de numeración/pendiente/activa:** mitigación con restricciones de
  base, locks por empresa, `If-Match` e idempotencia.
- **Crecimiento de PostgreSQL:** binarios y copias históricas incrementan
  almacenamiento. Mitigación MVP: 5 MiB, métricas y política futura aprobada.
- **Filtración administrativa:** preview y archivo contienen lógica sensible.
  Mitigación: admin exclusivo, DTO separados, descarga autenticada y logs
  saneados.
- **Contenido empresarial ambiguo:** la referencia Caviace no convierte sus
  valores en universales. Mitigación: contrato estructural y reporte detallado,
  sin sustituciones silenciosas.

## 18. Decisiones aprobadas del Sublote 2E-0

1. El binario se guarda directamente en
   `matriz_archivo_fuente.contenido BYTEA NOT NULL`.
2. Crear desde histórica copia físicamente el archivo y toda la definición
   normalizada; no se aplica deduplicación física en el MVP.
3. La 003 aborta si existen filas previas de `matriz_archivo_fuente` sin binario
   confiable verificable.
4. `Idempotency-Key` admite 16 a 128 ASCII visibles, se guarda solo como SHA-256
   y expira a los 7 días; respuesta persistida máxima 64 KiB.
5. El ETag fuerte es `"mve-<versionId>-r<revision>"` y `revision` es `BIGINT NOT
   NULL DEFAULT 1`.
6. Los advisory locks transaccionales por empresa son exclusivos para
   crear/numerar, activar, desactivar y crear desde histórica, y compartidos en
   alta de clientes desde antes de comprobar la activa hasta finalizar la
   transacción.
7. Los límites OOXML aprobados son 5 MiB comprimidos, 8 hojas, 500 filas por
   hoja, 64 columnas por hoja, 10,000 celdas no vacías, 256 entradas ZIP, 25 MiB
   totales descomprimidos, 10 MiB por entrada, ratio máximo
   descomprimido:comprimido de 20:1 por entrada y global
   (`tamaño_descomprimido / tamaño_comprimido <= 20`), y timeout total de 5
   segundos.
8. El usuario sube solo `.xlsx`; el backend inspecciona ZIP/OOXML antes de usar
   `exceljs` y rechaza hojas extra, ocultas/very hidden, nombres definidos no
   reconocidos, macros, OLE, objetos incrustados, vínculos externos, entradas
   cifradas, rutas inseguras y partes fuera de allowlist.
9. Auditoría es append-only mediante trigger `BEFORE UPDATE OR DELETE`; el rol
   de aplicación tiene solo `SELECT` e `INSERT`, nunca `TRUNCATE`, y la
   separación del rol propietario es requisito previo a producción.
10. El origen queda confinado a la empresa mediante `UNIQUE (id, empresa_id)`,
    `version_origen_empresa_id`, FK compuesta y CHECK de coincidencia.
11. Longitudes: motivo 500 caracteres; nombre original 255 caracteres y 1024
    bytes UTF-8; MIME 127; correlation/request ID 128 ASCII; acción/operación
    40; resumen de auditoría 16 KiB; respuesta idempotente 64 KiB; y
    `referencia_contenido` máximo 512 si se conserva utilizable.
12. El DOWN es conservador, aborta si hay datos y no revierte después del primer
    uso real.
13. La limpieza de idempotencia es separada, observable y sin cron en la
    migración; nunca borra auditoría.
14. El namespace operativo fijo para matrices por empresa es
    `MATRICES_EMPRESA_LOCK_NAMESPACE = 2205`; el lock exclusivo es
    `pg_catalog.pg_advisory_xact_lock(2205, empresa_id)` y el compartido para el
    alta de clientes es
    `pg_catalog.pg_advisory_xact_lock_shared(2205, empresa_id)`.
15. El orden obligatorio es `001 -> 002 -> VERIFY 002 -> 003 -> VERIFY 003`;
    producción requiere autorización separada.
16. Se mantienen las decisiones funcionales previas: una sola pendiente, una
    sola activa, PUBLICADA inmutable, publicar y activar separados, reversión
    mediante nueva versión, y activar sin exigir consultor.
17. La migración 002 sigue **NO ejecutada y NO autorizada en producción**. Este
    cambio documental no ejecuta ni autoriza migración alguna.
18. `matriz_empresa_version` incorpora en la 003 `activada_por INTEGER NULL`,
    `activada_en TIMESTAMPTZ NULL`, `desactivada_por INTEGER NULL` y
    `desactivada_en TIMESTAMPTZ NULL`, con FKs restrictivas a `usuarios(id)`,
    CHECK de coherencia para cada par actor/fecha.
    Activar y desactivar persisten estos datos en la misma transacción que la
    vigencia y la auditoría, sin alterar las decisiones funcionales previas.
19. El nombre/key definitivo de la migración 003 es
    `20260805_003_gestion_matrices_empresa`, con archivos previstos `.up.sql`,
    `.verify.sql` y `.down.sql` bajo `backend/migrations/` y con ese mismo
    nombre base.
20. El lock textual propio de la migración es
    `pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('20260805_003_gestion_matrices_empresa'))`.
    Es distinto del namespace operativo `2205` por empresa; ambos mecanismos
    tienen propósitos diferentes y no deben mezclarse.

## 19. Pendientes residuales antes de escribir SQL

El 2E-0 queda aprobado. Solo permanecen estos cierres operativos o nominales:

1. Asignar el ticket `COR-###` de la migración 003. Continúa pendiente porque
   el repositorio no contiene una numeración real; este documento no inventa un
   ticket.
2. Identificar los nombres efectivos de rol propietario y rol de aplicación en
   cada ambiente, y aprobar la matriz exacta de grants/revokes previa a
   producción.
3. Definir el mecanismo autorizado para recuperar/verificar binarios si al
   preflight existieran filas de la 002; si no puede probarse integridad, la 003
   debe abortar como ya quedó aprobado.
4. Cerrar el contrato estructural de tablas auxiliares empresariales (edad,
   antigüedad, montos y marcas), el catálogo estable de códigos de validación y
   la allowlist OOXML concreta que implementará el inspector.
5. Elegir y validar la herramienta de inspección ZIP/OOXML, incluida la forma de
   imponer timeout y ratios antes de `exceljs`, mediante corpus adversarial.
6. Precisar nombres finales de columnas de auditoría/idempotencia y si
   `correlation_id` y `request_id` serán uno o dos campos, sin alterar límites ni
   semántica aprobados.
7. Aprobar por separado el plan de prueba/despliegue de 002 y 003. Ninguna
   autorización se presume en este documento.
8. Determinar, antes del SQL definitivo y según las consultas reales de
   auditoría, si se requieren índices individuales por `activada_por` y
   `desactivada_por` o un índice compuesto más útil.

Estos pendientes deben cerrarse antes de escribir SQL cuando afecten el diseño
físico. Ningún contrato propuesto equivale a capacidad disponible o permiso de
ejecución.
