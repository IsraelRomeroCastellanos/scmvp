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

Dependencias obligatorias para implementar:

1. La migración 001 debe existir en el ambiente objetivo.
2. La migración 002 deberá aprobarse y desplegarse mediante un proceso separado;
   este documento no lo autoriza.
3. Debe diseñarse, revisarse y aprobarse una migración posterior que complete
   almacenamiento binario, auditoría append-only, idempotencia, control de
   concurrencia y la restricción de una sola versión pendiente.
4. Backend y frontend del flujo 2E solo podrán desplegarse cuando el esquema que
   consumen exista y haya sido verificado.

### Diferencias resueltas por este contrato

- La 002 contiene `referencia_contenido` y no almacena el binario. Para el MVP
  queda aprobado conservar el Excel completo en PostgreSQL; se requiere una
  migración adicional.
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
  `version_origen_id`, copia lógica del contenido y trazabilidad completa.
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

- Tipo permitido: `.xlsx` con tipo real y contenedor válidos; no basta extensión
  o MIME declarado por el navegador.
- Tamaño máximo: 5 MB, validado antes de parsear.
- Hojas estructurales requeridas: `PERFIL TRANSACCIONAL` y
  `GRADO DE RIESGO DE CLIENTE`, conforme al contrato de plantilla.
- Deben aplicarse límites defensivos de hojas, filas, columnas, celdas,
  descompresión y tiempo de parseo. Sus cifras exactas quedan pendientes.
- La importación es total: un error bloqueante impide validar y nunca deja
  criterios/opciones/rangos parcialmente reemplazados.

### 5.3 Fórmulas permitidas

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

### 5.4 Resultado de validación

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
  empresa, pone `activa=false` a la anterior si existe, activa la elegida y
  agrega auditoría. La anterior sigue PUBLICADA.
- Requiere `If-Match`, `Idempotency-Key` y confirmación explícita de la versión
  activa que será sustituida, si la hay.

### 6.9 Desactivar

- Solo sobre la PUBLICADA activa.
- Motivo no vacío obligatorio, con longitud máxima por definir.
- En una transacción cambia únicamente `activa=false` y audita actor, motivo y
  estado anterior/nuevo. Puede dejar a la empresa sin matriz activa.
- El backend debe bloquear desde ese commit el alta de nuevos clientes con el
  contrato `409` ya vigente. No elimina clientes ni altera históricos.

### 6.10 Crear nueva versión desde histórica

- Admite una versión PUBLICADA activa o inactiva de la misma empresa.
- Requiere motivo, `If-Match` sobre la fuente e `Idempotency-Key`.
- Rechaza si ya existe pendiente.
- En una transacción crea un BORRADOR con nuevo número,
  `version_origen_id=fuente.id`, copia lógica de archivo y definición, nueva
  auditoría y sin alterar la fuente.
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

Toda lectura de detalle/preview devuelve `ETag` fuerte basado en un token de
concurrencia persistido, no solo en timestamps. Toda mutación de una versión
existente exige `If-Match`. Ausencia produce `428 Precondition Required`; token
obsoleto produce `412 Precondition Failed`. La migración adicional debe aportar
el token/contador necesario.

### 8.2 `Idempotency-Key`

Es obligatorio para crear borrador, validar, publicar, activar, desactivar y
crear desde histórica; también se recomienda para la carga. La clave se acota a
actor + empresa + operación, se guarda con hash canónico de request, estado y
respuesta esencial, y posee unicidad en base. Repetir clave y mismo hash
devuelve el resultado original; repetir clave con otro hash devuelve `409`.
Retención y longitud quedan pendientes de fijar antes de implementar.

### 8.3 Transacciones y bloqueos

- Numerar versión, verificar pendiente y crear borrador ocurren en una misma
  transacción con bloqueo por empresa.
- Sustituir archivo y definición normalizada es atómico.
- Publicar verifica estado, revisión y huella con bloqueo de la fila.
- Activar/desactivar bloquea todas las cabeceras relevantes de la empresa en
  orden estable y confirma la activa esperada.
- Crear desde histórica bloquea fuente y conjunto de versiones de la empresa.
- Restricciones únicas de base son la última defensa; conflictos se traducen a
  errores de dominio y no a `500` genérico.

La futura implementación deberá coordinar estas transacciones con el bloqueo de
alta de clientes para cerrar el riesgo TOCTOU documentado. La estrategia exacta
de bloqueo compartido/advisory entre ambas operaciones está pendiente.

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
- clave de idempotencia referenciada y correlation/request ID;
- resumen controlado de resultado, sin binario, token, secretos ni contenido
  sensible innecesario.

Los campos `creada_por`, `validada_por`, `publicada_por` y `cargado_por` de la
002 se conservan como resumen de estado, pero no sustituyen el historial
append-only. Activar, sustituir activa y desactivar también requieren actor y
fecha, hoy ausentes en la 002.

## 10. Conservación del binario en PostgreSQL

Para el MVP se conserva una copia íntegra del `.xlsx` en PostgreSQL, asociada
uno a uno con `matriz_archivo_fuente`, junto con:

- nombre original saneado;
- MIME detectado por backend;
- tamaño en bytes, máximo 5 MB;
- SHA-256 hexadecimal calculado por backend;
- usuario y fecha de carga.

El tipo físico (`bytea` en la misma tabla o tabla uno-a-uno) se definirá en la
migración adicional. El acceso es exclusivo de admin, autenticado, auditado y
sin URL pública. La descarga debe enviar cabeceras seguras, impedir sniffing y
usar nombre saneado. No se registra el binario en logs ni respuestas JSON.

La retención mínima cubre toda la vida de la versión y sus referencias
históricas. Eliminación, archivado externo, cifrado adicional y retención final
posterior al MVP quedan pendientes; no autorizan borrar fuentes durante 2E.

## 11. Errores HTTP mínimos

| HTTP | Uso mínimo |
|---:|---|
| 400 | ID/body inválido, motivo vacío, archivo mal formado |
| 401 | Sin autenticación válida |
| 403 | Rol distinto de admin |
| 404 | Empresa/versión no encontrada dentro del contexto autorizado |
| 409 | Pendiente ya existente, transición inválida, activa esperada distinta, clave idempotente reutilizada con otro request o restricción de dominio |
| 412 | `If-Match` obsoleto |
| 413 | Archivo mayor de 5 MB |
| 415 | Tipo real distinto de `.xlsx` permitido |
| 422 | Estructura/contenido Excel no cumple; devuelve errores por celda |
| 428 | Falta `If-Match` obligatorio |
| 500 | Error interno no clasificado, sin filtrar SQL, rutas o secretos |

## 12. Alcance exacto de frontend

El frontend futuro se limita al área admin:

1. Agregar desde el listado/detalle de empresa una entrada “Gestionar matriz”.
2. Crear una vista por empresa con estado de matriz activa, versión pendiente e
   historial paginado.
3. Mostrar estados separados: BORRADOR, VALIDADA, PUBLICADA inactiva y ACTIVA.
4. Permitir crear borrador, seleccionar/cargar un `.xlsx` de hasta 5 MB, mostrar
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

## 13. Fuera de alcance

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

## 14. Secuencia de sublotes 2E-0 a 2E-8

Cada sublote debe corresponder a un ticket `COR-XXX`, revisar dependencias y
completar build, prueba del caso y regresión antes de avanzar.

| Sublote | Entregable acotado |
|---|---|
| 2E-0 | Cerrar diseño físico de migración adicional, modelo de auditoría/idempotencia/concurrencia, retención y límites; revisión de seguridad. Sin ejecutar migraciones. |
| 2E-1 | Migración adicional UP/VERIFY/DOWN y pruebas desechables autorizadas; despliegue productivo fuera de alcance hasta autorización separada. |
| 2E-2 | Backend de listar, detalle, preview y descarga admin con aislamiento y ETag. |
| 2E-3 | Backend de crear borrador y una sola pendiente, con transacción e idempotencia. |
| 2E-4 | Carga segura, almacenamiento binario, SHA-256, parser y normalización atómica. |
| 2E-5 | Validación estructural/contenido, allowlist de fórmulas, reportes por celda y transición a VALIDADA. |
| 2E-6 | Publicar, activar y desactivar con inmutabilidad, sustitución atómica, motivo y auditoría; coordinación con alta de clientes. |
| 2E-7 | Nueva versión desde histórica con `version_origen_id`, copia lógica e idempotencia. |
| 2E-8 | Frontend admin completo, pruebas por rol/concurrencia/archivo, builds y regresión integral del Lote 2. |

No deben programarse sublotes que dependan de decisiones pendientes del 2E-0
sin cerrarlas primero.

## 15. Criterios de aceptación

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
12. El archivo máximo de 5 MB y sus metadatos/SHA-256 se conservan completos en
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

## 16. Riesgos

- **Desfase de esquema:** desplegar código antes de 002 y la migración adicional
  causaría fallos. Mitigación: orden de despliegue y verificación explícitos.
- **TOCTOU con alta de clientes:** desactivar/activar puede competir con un alta.
  Mitigación: cerrar en 2E-0 el protocolo transaccional común.
- **Excel hostil/descompresión:** 5 MB comprimidos no limita expansión.
  Mitigación: topes internos, parseo defensivo y rechazo de contenido activo.
- **Parser incompleto:** librerías pueden no detectar todas las relaciones,
  macros u objetos. Mitigación: inspección del paquete OOXML y corpus adversarial.
- **Pérdida de auditoría:** campos resumen no capturan activaciones repetidas.
  Mitigación: eventos append-only dentro de la misma transacción.
- **Carreras de numeración/pendiente/activa:** mitigación con restricciones de
  base, locks por empresa, `If-Match` e idempotencia.
- **Crecimiento de PostgreSQL:** binarios y copias históricas incrementan
  almacenamiento. Mitigación MVP: 5 MB, métricas y política futura aprobada.
- **Filtración administrativa:** preview y archivo contienen lógica sensible.
  Mitigación: admin exclusivo, DTO separados, descarga autenticada y logs
  saneados.
- **Contenido empresarial ambiguo:** la referencia Caviace no convierte sus
  valores en universales. Mitigación: contrato estructural y reporte detallado,
  sin sustituciones silenciosas.

## 17. Decisiones aprobadas explícitas

1. Cada empresa carga su propio archivo PT/GR; Caviace y la plantilla son solo
   referencia estructural. Contenido y parámetros proceden de cada archivo.
2. Se aceptan las seis fórmulas contractuales en sus ubicaciones o la variante
   simple sin fórmulas de totales. El backend no ejecuta ni confía en cache;
   cualquier otra fórmula o contenido ejecutable bloquea.
3. Publicar y activar son operaciones separadas: BORRADOR → VALIDADA →
   PUBLICADA inactiva → ACTIVA.
4. El Excel completo se conserva en PostgreSQL para el MVP, máximo 5 MB, solo
   admin, con nombre, MIME, tamaño y SHA-256.
5. Se requiere migración adicional para auditoría append-only e idempotencia.
6. Solo existe una pendiente por empresa; BORRADOR y VALIDADA cuentan.
7. Admin puede desactivar la activa y dejar temporalmente cero activas; se
   bloquea alta de clientes y se exige motivo y auditoría.
8. Toda reversión crea nueva versión con `version_origen_id`; nunca reactiva la
   histórica.
9. No se exige consultor asignado para activar en Lote 2E.
10. Publicar cambia el estado de la misma fila; la nueva fila nace al abrir el
    borrador.
11. Una PUBLICADA es inmutable.
12. Al activar una nueva, la anterior sigue PUBLICADA y queda `activa=false`.
13. La migración 002 sigue NO ejecutada y NO autorizada en producción. Este
    documento no ejecuta ni autoriza migración alguna.

## 18. Puntos pendientes antes de implementar

No bloquean aprobar este contrato documental, pero pueden bloquear uno o más
sublotes de implementación:

1. Número exacto de ticket(s) `COR-XXX` y criterios de división por PR.
2. Diseño físico y nombres de tablas/columnas para binario, eventos append-only,
   idempotencia, token de concurrencia y actores/fechas de activación.
3. Si el binario se copia físicamente al crear desde histórica o se referencia
   de forma inmutable/deduplicada por SHA-256.
4. Retención de claves idempotentes, longitud/formato admitido y forma exacta de
   reproducir respuestas.
5. Algoritmo y representación exactos del ETag/token de revisión.
6. Protocolo transaccional común entre activar/desactivar y alta de clientes
   para eliminar TOCTOU sin degradar concurrencia.
7. Límites defensivos exactos de OOXML: hojas, filas, columnas, celdas, entradas
   ZIP, ratio/tamaño descomprimido y timeout.
8. Política exacta para hojas extra, ocultas, nombres definidos inocuos,
   objetos incrustados y variantes sintácticas de las seis fórmulas. Hasta
   aprobarla rige el criterio conservador de rechazo.
9. Contrato estructural definitivo para tablas auxiliares empresariales de
   edad, antigüedad, montos y marcas; existe evidencia de referencia, pero no
   una plantilla empresarial final versionada que cubra todas las variantes.
10. Códigos estables completos de validación y catálogo de advertencias frente
    a errores bloqueantes.
11. Paginación, filtros, forma definitiva del sobre `data`, DTO y política de
    capacidades del frontend.
12. Longitudes máximas de motivos, nombre original y metadatos; saneamiento y
    cabeceras exactas de descarga.
13. Retención definitiva del Excel, cifrado adicional, backups, métricas,
    cuotas por empresa y eventual migración a almacenamiento externo.
14. Herramienta o combinación de inspección OOXML que demuestre detección de
    macros, vínculos, fórmulas y contenido activo con pruebas adversariales.
15. Plan autorizado para probar y desplegar 002 y la migración adicional. La
    autorización no se presume ni forma parte de este documento.

Hasta cerrar estos puntos, ninguna propuesta HTTP o física aquí descrita debe
confundirse con una función disponible ni con autorización de despliegue.
