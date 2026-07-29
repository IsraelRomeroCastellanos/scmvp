# ESP-AV-001 — Modelo integral de actividades vulnerables

## 1. Control documental

| Campo | Valor |
|---|---|
| Código | ESP-AV-001 |
| Versión | 0.3-PREFLIGHT-TECNICO-CERRADO |
| Fecha | 2026-07-28 |
| Estado | Diseño funcional y preflight técnico cerrados; pendiente de validación jurídica y migración |
| Propietario funcional | Decisiones funcionales aprobadas; responsable nominal pendiente |
| Aprobación jurídica/Oficial de Cumplimiento | Pendiente |
| Aprobación técnica | Pendiente |
| Aprobación de seguridad y operación | Pendiente |

### Historial de cambios

| Versión | Fecha | Autor | Cambio |
|---|---|---|---|
| 0.1-BORRADOR | 2026-07-28 | Equipo técnico | Primera especificación integral basada en inspección del repositorio y contexto confirmado. |
| 0.2-PROPUESTA FUNCIONAL CERRADA | 2026-07-28 | Equipo funcional y técnico | Cierre de decisiones de empresa, expediente, operación, permisos e historial; consolidación de 14 actividades generales y mapeo funcional de 31 operaciones. |
| 0.3-PREFLIGHT-TECNICO-CERRADO | 2026-07-28 | Equipo funcional y técnico | Incorporación de evidencia real saneada de base y Perfil Transaccional; cierre del modelo físico conceptual, compatibilidad histórica y vínculo nullable de perfiles. |

### Convención de evidencia

- **Confirmado:** existe evidencia directa en el código o en el contexto operativo proporcionado.
- **Documentado:** consta en documentación versionada, pero puede requerir verificación contra el despliegue actual.
- **Inferido:** conclusión técnica razonable que debe comprobarse.
- **Propuesto:** diseño de esta especificación; todavía no existe.
- **Pendiente:** requiere evidencia o aprobación humana.

Las referencias de línea son aproximadas y corresponden al estado de `main` en `ad9c56e` o posterior, inspeccionado el 2026-07-28.

## 2. Objetivo

Definir una fuente de verdad única para conectar:

> empresa → actividad vulnerable general → cliente/expediente → operación específica → Perfil Transaccional

El modelo resuelve la ambigüedad actual entre el giro o actividad económica de una empresa, la actividad vulnerable aplicable y la operación concreta realizada con un cliente. Evita:

- que el usuario seleccione actividades ajenas a su empresa;
- usar giros mercantiles o actividades económicas como equivalentes jurídicos;
- mezclar una actividad general con sus modalidades u operaciones;
- guardar decisiones regulatorias únicamente en JSONB sin integridad referencial;
- imponer actividades por defecto a empresas o expedientes históricos;
- reducir o reescribir `datos_completos`;
- promover la demo de Perfil Transaccional como si fuera un módulo productivo;
- desplegar código que dependa de tablas todavía inexistentes.

## 3. Alcance y exclusiones

### 3.1 MVP

El MVP incluye únicamente:

- catálogo validado de actividades vulnerables generales;
- catálogo validado de operaciones o modalidades específicas;
- relación de una empresa con una o varias actividades generales;
- relación de cada actividad general con sus operaciones autorizadas;
- selección controlada en el expediente del cliente;
- vínculo auditable entre esa selección y el Perfil Transaccional;
- ampliaciones aditivas de contratos existentes;
- compatibilidad con empresas, clientes y estructuras históricas;
- permisos actuales e aislamiento por `empresa_id`;
- trazabilidad técnica mínima: claves, vigencia, timestamps e historial de selección;
- migración, rollback, despliegue y pruebas.

### 3.2 Fuera del MVP — versión 2.0

Se documentan como evolución futura, sin diseñar tablas ni implementación en este ticket:

- cuestionarios personalizados por empresa;
- diseñador visual de formularios;
- campos dinámicos ilimitados;
- motores de reglas configurables;
- modelos de perfilamiento personalizados;
- versiones particulares por empresa;
- flujos especiales por organización.

El MVP debe usar claves públicas estables y separar catálogo, asignación y evaluación para no impedir esa evolución, pero no incorporará su complejidad.

### 3.3 Exclusiones adicionales

- motor de Grado de Riesgo;
- monitoreo de operaciones, alertas, UMA o carga masiva;
- homologación automática desde giro mercantil o actividad económica;
- migración automática de datos históricos;
- cambios funcionales a Persona Moral, Fideicomiso o Recursos de Terceros;
- afirmaciones jurídicas sin aprobación del Oficial de Cumplimiento.

## 4. Estado actual confirmado

### 4.1 Empresas

| Elemento | Estado | Evidencia |
|---|---|---|
| Listado | Confirmado | `backend/src/routes/admin.routes.ts:348-374`, `GET /api/admin/empresas`, roles `admin` y `consultor`. |
| Detalle | Confirmado | `backend/src/routes/admin.routes.ts:471-498`, `GET /api/admin/empresas/:id`. |
| Alta | Confirmado | `backend/src/routes/admin.routes.ts:503-564`, `POST /api/admin/empresas`, solo `admin`. |
| Edición | Confirmado | `backend/src/routes/admin.routes.ts:569-660`, `PUT /api/admin/empresas/:id`, solo `admin`. |
| Campos | Confirmado por consulta activa | `id`, `nombre_legal`, `rfc`, `tipo_entidad`, domicilio y `estado`; selección completa en `admin.routes.ts:376-392`. |
| Transacción en alta/edición | No localizada | POST y PUT usan `pool.query` independientes; no hay `BEGIN/COMMIT`. |
| Actividades vulnerables | No existen en contratos actuales | Normalización y SELECT de `admin.routes.ts:397-448` no incluyen esa propiedad. |
| UI de alta/edición/listado | Confirmado | `frontend/src/app/admin/crear-empresa/page.tsx:20-94`, `editar-empresa/[id]/page.tsx:70-196`, `empresas/page.tsx:79-302`. |

La administración de empresas conserva contratos simples `{ empresa }` y `{ empresas }`. La ampliación debe ser aditiva. El alta/edición de relaciones deberá ser transaccional junto con la empresa.

### 4.2 Clientes y expediente

| Elemento | Estado | Evidencia |
|---|---|---|
| Empresa de sesión | Confirmado | JWT contiene `empresa_id` (`auth.routes.ts:69-88`); `GET /api/cliente/mi-empresa` deriva exclusivamente `req.user.empresa_id` (`cliente.routes.ts:1444-1473`). |
| Listado | Confirmado | `GET /api/cliente/clientes?empresa_id=...`, `cliente.routes.ts:1480-1512`. El rol `cliente` queda limitado a su tenant. |
| Detalle | Confirmado | `GET /api/cliente/clientes/:id`, `cliente.routes.ts:1519-1586`. |
| Alta | Confirmado | `POST /api/cliente/registrar-cliente`, `cliente.routes.ts:1593-1658`; inserción y colecciones relacionadas dentro de transacción. |
| Edición | Confirmado | `PUT /api/cliente/clientes/:id`, `cliente.routes.ts:1669-1765`; transacción y mezcla compatible. |
| Preservación JSONB | Confirmado | `deepMerge` evita perder campos en PUT (`cliente.routes.ts:144-162`); preparación canónica y materialización de hijos en `cliente.routes.ts:540-1219`. |
| Tipos de cliente | Confirmado | Ramas existentes para `persona_fisica`, `persona_moral` y `fideicomiso` en frontend y backend. |
| Frontend de alta | Confirmado | `ClientPage.tsx:3309-3655`; construye `datos_completos`, publica y navega al detalle real. |
| Frontend de edición | Confirmado | `editar-cliente/[id]/page.tsx:1321-1845`; hidrata y envía expediente. |

`datos_completos` y las colecciones relacionadas incluyen estructuras históricas y canónicas. La actividad general y la operación seleccionadas no deben existir solo dentro de ese JSONB: necesitan integridad, consulta e historial normalizados. Puede conservarse un snapshot de claves/nombres en el resultado del perfil, pero no como fuente de autorización.

### 4.3 Perfil Transaccional y Grado de Riesgo

| Hallazgo | Clasificación | Evidencia |
|---|---|---|
| Ruta demo de Perfil Transaccional | Demo | `/demo/evaluaciones/perfil-transaccional/[clienteId]`; `frontend/src/app/demo/evaluaciones/perfil-transaccional/[clienteId]/page.tsx`. |
| Habilitación | Demo | Requiere `NEXT_PUBLIC_MOCK_RIESGO === "1"` (`frontend/src/demo-evaluaciones/isEnabled.ts:1-3`). |
| Cuestionario actual | Demo | Cuatro criterios y bandas estáticas (`frontend/src/demo-evaluaciones/config/perfilTransaccional.ts:3-69`). |
| Persistencia de demo | No productiva | `localStorage`, clave por cliente, sin HTTP (`frontend/src/demo-evaluaciones/storage/local.ts:12-72`). |
| Lectura en detalle productivo | Confirmada | Backend consulta `cliente_perfil_transaccional` y `matrices_riesgo` (`cliente.routes.ts:1555-1575`) y frontend los renderiza (`clientes/[id]/page.tsx:399-432`). |
| Endpoint productivo de guardado | No localizado | No existe POST/PUT localizado para Perfil Transaccional. |
| Tabla `cliente_perfil_transaccional` | Confirmada por preflight | Existe en `public`, con 1 registro y estructura detallada abajo. |
| Tabla `matrices_riesgo` | Confirmada por preflight | Existe en `public`; este ticket no modifica su contrato. |

La documentación que califica todo el Perfil Transaccional como demo está parcialmente desactualizada: la captura localizada sigue siendo demo y no existe endpoint productivo de escritura, pero la tabla y la lectura productiva sí existen.

#### 4.3.1 Preflight real de base

- Base enlazada mediante la configuración real del backend: `scmvp_0plk`.
- Usuario de base observado: `scmvp_user`.
- Esquema: `public`.
- Motor: PostgreSQL 17.10.
- Conteos de baseline: 19 empresas, 98 clientes y 1 Perfil Transaccional.
- Tablas confirmadas: `public.empresas`, `public.clientes`, `public.cliente_perfil_transaccional` y `public.matrices_riesgo`.
- Tablas inexistentes: `public.schema_migrations`, `public.cat_actividades_vulnerables` y `public.empresa_actividades_vulnerables`.
- No se registran host, puerto, credenciales ni cadena de conexión.

#### 4.3.2 Esquema confirmado de `cliente_perfil_transaccional`

| Campo | Tipo y nulabilidad | Default/clave |
|---|---|---|
| `id` | `INTEGER NOT NULL` | PK, generado por secuencia (`SERIAL`) |
| `cliente_id` | `INTEGER NOT NULL` | FK a `clientes(id)` con `ON DELETE CASCADE` |
| `empresa_id` | `INTEGER NOT NULL` | FK a `empresas(id)` con `ON DELETE CASCADE` |
| `tipo_servicio` | `VARCHAR NULL` | Sin default confirmado |
| `actividad_esperada` | `VARCHAR NULL` | Sin default confirmado |
| `monto_mensual_estimado` | `NUMERIC NULL` | Sin default confirmado |
| `frecuencia_operacion` | `VARCHAR NULL` | Sin default confirmado |
| `origen_recursos` | `VARCHAR NULL` | Sin default confirmado |
| `destino_recursos` | `VARCHAR NULL` | Sin default confirmado |
| `instrumentos_pago` | `JSONB NULL` | Sin default confirmado |
| `version` | `INTEGER` | Default `1` |
| `estado` | `VARCHAR` | Default `activo` |
| `creado_en` | `TIMESTAMPTZ` | Default `NOW()` |
| `actualizado_en` | `TIMESTAMPTZ` | Default `NOW()` |

No existe FK a actividad vulnerable u operación, no existe restricción única por cliente y no se confirmaron índices adicionales. Las FK actuales de cliente y empresa se conservan sin cambios en esta migración.

### 4.4 Catálogos, aplicación y autenticación

- Catálogos autenticados existentes: países, actividades económicas, giros mercantiles y códigos postales (`backend/src/routes/catalogos.routes.ts:7-96`).
- El router ya está montado bajo `/api/catalogos` (`backend/src/app.ts:38-39`).
- Los catálogos actuales exponen `id`, `clave` y `descripcion`; para este modelo se propone aceptar y devolver claves públicas, sin depender de IDs internos en el frontend.
- Axios usa `NEXT_PUBLIC_API_BASE_URL` o mismo origen y agrega Bearer desde la sesión local (`frontend/src/lib/api.ts:4-18`).
- Roles válidos: `admin`, `consultor`, `cliente`; el middleware valida JWT y materializa `empresa_id` (`backend/src/middleware/auth.middleware.ts:6-55`).

### 4.5 Persistencia, migraciones y despliegue

- PostgreSQL se configura mediante `DATABASE_URL`; SSL se habilita en producción (`backend/src/db.ts:4-13`).
- Backend solo define `build` y `start`; no existe script de migraciones ni ORM (`backend/package.json:4-30`).
- `crear_tablas.sql` usa `SERIAL`, FK enteras, timestamps con zona, JSONB e índices `idx_`, pero es evidencia histórica y contiene al menos un error tipográfico (`crear_tablas.sql:67`).
- `scripts/migracion_final_mvp.sql` es un script aditivo histórico; no hay tabla de control ni ejecutor vigente confirmados.
- La infraestructura documenta migraciones previas por backup/restore y cambio manual de configuración; contiene referencias históricas que no sustituyen el preflight (`docs/infraestructura.md:1-201`).
- El preflight confirmó que la configuración real del backend inspeccionado enlaza `scmvp_0plk`; la evidencia operativa no reproduce endpoints, host, puerto ni secretos.
- No se localizaron Docker, CI/IaC ni ejecución automática de migraciones (`MAP-001_mapa_tecnico.md:472-496`).

### 4.6 Vacíos y riesgos actuales

1. El catálogo de 14 actividades generales está cerrado funcionalmente, pero pendiente de validación jurídica.
2. El mapa funcional de 31 operaciones está cerrado, pero pendiente de aprobación jurídica, fracciones y fundamento.
3. No hay mecanismo formal vigente de migraciones.
4. El cuestionario demo está orientado a servicios profesionales y no constituye matriz multisector.
5. No existe vínculo normalizado entre el perfil actual y una selección PLD.
6. Los documentos técnicos anteriores tienen hallazgos desactualizados: por ejemplo, `MAP-001_mapa_tecnico.md:520-525` no localizaba rutas de empresa que sí existen en el código actual.

## 5. Glosario

| Término | Definición |
|---|---|
| Actividad vulnerable general | Dominio regulatorio habilitado para una empresa. Agrupa operaciones relacionadas y tiene clave pública estable. No equivale automáticamente a giro mercantil ni actividad económica. |
| Operación específica | Acto, servicio o transacción concreta dentro de una actividad general. Es la unidad que determina el formulario o configuración aplicable del Perfil Transaccional. |
| Modalidad | Variante operacional aprobada. En el MVP es sinónimo funcional de operación específica; no es texto libre. |
| Expediente | Registro del cliente y sus datos KYC, relaciones e información complementaria, asociado a una empresa. |
| Perfil Transaccional | Registro versionado de expectativas operativas, respuestas y resultado para un cliente, bajo una actividad y operación determinadas. La demo actual no constituye este registro productivo. |
| Empresa histórica | Empresa creada antes del despliegue del modelo, que legítimamente puede tener cero actividades asignadas. |
| Configuración PLD pendiente | Estado derivado cuando falta una asignación requerida de empresa, actividad del expediente, operación o perfil. No debe inferirse como una actividad por defecto. |
| Clave pública | Identificador ASCII, inmutable y estable usado por API/configuración. |
| ID interno | PK numérica usada por PostgreSQL y nunca elegida arbitrariamente por el cliente. |

## 6. Modelo funcional completo

Las reglas de esta sección son decisiones funcionales cerradas para el MVP. No son recomendaciones pendientes.

### 6.1 Flujo

1. Solo un administrador asigna a la empresa una o varias actividades generales activas.
2. Una empresa nueva debe tener al menos una actividad general. Una empresa histórica puede permanecer temporalmente sin asignación y muestra “Configuración PLD pendiente”.
3. Al crear o completar un expediente, el backend resuelve las actividades activas de la empresa autorizada.
4. Con una sola actividad, el backend la autoselecciona y el frontend la muestra sin permitir una alternativa.
5. Con varias, el usuario elige exclusivamente una de las asignadas a la empresa.
6. Se presentan únicamente operaciones activas relacionadas con la actividad elegida.
7. La operación se selecciona al registrar o editar el cliente, o como paso inmediatamente previo al Perfil Transaccional.
8. Actividad y operación quedan obligatoriamente definidas antes de guardar el Perfil Transaccional.
9. La selección se persiste fuera de `datos_completos` en estructura normalizada. `datos_completos` se conserva íntegro.
10. El perfil referencia la selección vigente y conserva un snapshot auditable de claves y versión.

### 6.2 Reglas de estado

| Caso | Regla MVP |
|---|---|
| Empresa con una actividad | Autoselección validada por backend; el cliente no envía una alternativa. |
| Empresa con varias | Selección obligatoria restringida al conjunto activo de la empresa. |
| Empresa histórica sin actividad | Acceso general permitido; alta/edición no deben inventar default. Perfil bloqueado con “Configuración PLD pendiente”. |
| Empresa nueva | Debe guardar una o varias actividades generales en la misma transacción que el alta. |
| PUT de empresa sin `actividades_vulnerables` | Conserva las relaciones sin reconciliarlas. |
| PUT de empresa con arreglo no vacío | Reconcilia el conjunto completo. |
| PUT de empresa con `[]` | Se rechaza con 400 en el MVP. |
| Actividad inactiva | No disponible para nuevas selecciones. Referencias históricas se conservan y se muestran como inactivas. |
| Operación inactiva | Igual: no seleccionable para nuevos perfiles; historial legible. |
| Cliente existente sin selección | Continúa legible/editable; queda pendiente hasta completar configuración explícita. |
| Edición sin propiedades PLD | Conserva selección actual. Ausencia no equivale a borrado. |
| Cambio de actividad | Crea nueva vigencia, requiere operación compatible y no reescribe perfiles anteriores. |
| Cambio de operación | Crea nueva vigencia y no muta resultados previos. |
| Cambio de asignaciones de empresa | No invalida ni borra historial. Impide nuevas evaluaciones bajo relaciones desactivadas hasta regularización. |
| Perfil existente | Conserva actividad, operación, versión, respuestas y resultado usados al crearse. |

La selección vigente debe tener una sola fila activa por cliente. Todo cambio cierra vigencia anterior y crea una nueva fila; no se sobreescribe el contexto histórico.

### 6.3 Permisos cerrados

- `admin`: asigna y reconcilia actividades de empresa.
- `consultor`: solo lectura de configuración PLD y Perfil Transaccional.
- `cliente`: opera únicamente sobre expedientes de su empresa; `empresa_id` del navegador nunca es autoridad.
- Ningún rol puede seleccionar para un expediente una actividad no asignada a su empresa ni una operación ajena a la actividad.

## 7. Catálogo funcional propuesto

La taxonomía funcional queda cerrada en **14 actividades generales**. Las 31 filas trabajadas anteriormente dejan de considerarse actividades generales y pasan a ser **operaciones específicas propuestas**. El mapa actividad–operación está funcionalmente aprobado, pero catálogo, denominaciones, fracciones y correspondencia jurídica permanecen pendientes de validación por el Oficial de Cumplimiento.

### 7.1 Actividades generales

| Clave general | Nombre general | Fundamento/fracción | Origen | Estado funcional | Estado jurídico |
|---|---|---|---|---|---|
| `AVG_JUEGOS_SORTEOS` | Juegos, apuestas, concursos y sorteos | Pendiente | Agrupación funcional aprobada | Cerrado | Pendiente |
| `AVG_INSTRUMENTOS_VALOR` | Emisión o comercialización de instrumentos de valor | Pendiente | Agrupación funcional aprobada | Cerrado | Pendiente |
| `AVG_PRESTAMOS_GARANTIAS` | Mutuos, préstamos y garantías no financieros | Pendiente | Agrupación funcional aprobada | Cerrado | Pendiente |
| `AVG_INMOBILIARIA` | Actividad inmobiliaria | Pendiente | Ejemplo funcional inmobiliario aprobado | Cerrado | Pendiente |
| `AVG_METALES_JOYERIA` | Metales, piedras preciosas, joyas y relojes | Pendiente | Agrupación funcional aprobada | Cerrado | Pendiente |
| `AVG_OBRAS_ARTE` | Obras de arte | Pendiente | Agrupación funcional aprobada | Cerrado | Pendiente |
| `AVG_VEHICULOS` | Comercialización de vehículos | Pendiente | Agrupación funcional aprobada | Cerrado | Pendiente |
| `AVG_BLINDAJE` | Servicios de blindaje | Pendiente | Agrupación funcional aprobada | Cerrado | Pendiente |
| `AVG_TRASLADO_VALORES` | Traslado o custodia de dinero y valores | Pendiente | Agrupación funcional aprobada | Cerrado | Pendiente |
| `AVG_SERVICIOS_PROFESIONALES` | Servicios profesionales vulnerables | Pendiente | Agrupación funcional aprobada | Cerrado | Pendiente |
| `AVG_FE_PUBLICA` | Actos de fe pública vulnerables | Pendiente | Agrupación funcional aprobada | Cerrado | Pendiente |
| `AVG_DONATIVOS` | Recepción de donativos | Pendiente | Agrupación funcional aprobada | Cerrado | Pendiente |
| `AVG_COMERCIO_EXTERIOR` | Servicios de comercio exterior vulnerables | Pendiente | Agrupación funcional aprobada | Cerrado | Pendiente |
| `AVG_ACTIVOS_VIRTUALES` | Intercambio de activos virtuales | Pendiente | Agrupación funcional aprobada | Cerrado | Pendiente |

### 7.2 Matriz completa actividad general → operación específica

Las claves `AV_...` se conservan sin cambios y su clasificación técnica queda explícitamente definida como “operación específica”. No deben interpretarse nuevamente como claves de actividad general.

| Actividad general | Clave de operación propuesta | Operación específica | Fuente | Estado funcional | Estado jurídico/fracción |
|---|---|---|---|---|---|
| `AVG_JUEGOS_SORTEOS` | `AV_VENTA_DE_BOLETOS_O_FICHAS_PARA_APUESTAS` | Venta de boletos o fichas para apuestas | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_JUEGOS_SORTEOS` | `AV_CONCURSOS_O_SORTEOS` | Concursos o sorteos | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_INSTRUMENTOS_VALOR` | `AV_EMISION_O_COMERCIALIZACION_DE_TARJETAS_DE_CREDITO` | Emisión o comercialización de tarjetas de crédito | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_INSTRUMENTOS_VALOR` | `AV_EMISION_O_COMERCIALIZACION_DE_TARJETAS_DE_PREPAGO` | Emisión o comercialización de tarjetas de prepago | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_PRESTAMOS_GARANTIAS` | `AV_OTORGAMIENTO_DE_MUTUO_O_PRESTAMOS` | Otorgamiento de mutuo o préstamos | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_PRESTAMOS_GARANTIAS` | `AV_OTORGAMIENTO_DE_GARANTIAS` | Otorgamiento de garantías | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_INMOBILIARIA` | `AV_CONSTRUCCION_DE_INMUEBLES` | Construcción de inmuebles | Ejemplo inmobiliario aprobado | Aprobado | Pendiente |
| `AVG_INMOBILIARIA` | `AV_DESARROLLO_DE_BIENES_INMUEBLES` | Desarrollo de bienes inmuebles | Ejemplo inmobiliario aprobado | Aprobado | Pendiente |
| `AVG_INMOBILIARIA` | `AV_COMPRAVENTA_DE_INMUEBLES_A_NOMBRE_DEL_CLIENTE` | Compraventa de inmuebles a nombre del cliente | Ejemplo inmobiliario aprobado | Aprobado | Pendiente |
| `AVG_INMOBILIARIA` | `AV_INTERMEDIACION_EN_TRANSMISION_DE_PROPIEDAD` | Intermediación en transmisión de propiedad | Ejemplo inmobiliario aprobado | Aprobado | Pendiente |
| `AVG_INMOBILIARIA` | `AV_ARRENDAMIENTO_DE_BIENES_INMUEBLES` | Arrendamiento de bienes inmuebles | Ejemplo inmobiliario aprobado | Aprobado | Pendiente |
| `AVG_INMOBILIARIA` | `AV_TRANSMISION_DE_DERECHOS_REALES_INMUEBLES` | Transmisión de derechos reales sobre inmuebles | Ejemplo inmobiliario aprobado | Aprobado | Pendiente |
| `AVG_METALES_JOYERIA` | `AV_COMERCIALIZACION_DE_METALES_Y_PIEDRAS_PRECIOSAS` | Comercialización de metales y piedras preciosas | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_METALES_JOYERIA` | `AV_COMERCIALIZACION_DE_JOYAS_O_RELOJES` | Comercialización de joyas o relojes | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_OBRAS_ARTE` | `AV_COMERCIALIZACION_DE_OBRAS_DE_ARTE` | Comercialización de obras de arte | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_OBRAS_ARTE` | `AV_SUBASTA_DE_OBRAS_DE_ARTE` | Subasta de obras de arte | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_VEHICULOS` | `AV_COMERCIALIZACION_DE_VEHICULOS_TERRESTRES` | Comercialización de vehículos terrestres | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_VEHICULOS` | `AV_COMERCIALIZACION_DE_VEHICULOS_AEREOS` | Comercialización de vehículos aéreos | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_VEHICULOS` | `AV_COMERCIALIZACION_DE_VEHICULOS_MARITIMOS` | Comercialización de vehículos marítimos | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_BLINDAJE` | `AV_BLINDAJE_DE_VEHICULOS` | Blindaje de vehículos | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_BLINDAJE` | `AV_BLINDAJE_DE_INMUEBLES` | Blindaje de inmuebles | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_TRASLADO_VALORES` | `AV_TRASLADO_O_CUSTODIA_DE_DINERO_Y_VALORES` | Traslado o custodia de dinero y valores | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_SERVICIOS_PROFESIONALES` | `AV_ADMINISTRACION_DE_RECURSOS_O_CUENTAS` | Administración y manejo de recursos o cuentas | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_SERVICIOS_PROFESIONALES` | `AV_ORGANIZACION_DE_APORTACIONES_DE_CAPITAL` | Organización de aportaciones de capital | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_SERVICIOS_PROFESIONALES` | `AV_CONSTITUCION_Y_ADMINISTRACION_DE_SOCIEDADES` | Constitución y administración de sociedades | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_FE_PUBLICA` | `AV_OTORGAMIENTO_DE_PODERES_PARA_ACTOS_DE_DOMINIO` | Otorgamiento de poderes para actos de dominio | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_FE_PUBLICA` | `AV_CONSTITUCION_DE_PERSONAS_MORALES` | Constitución de personas morales | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_DONATIVOS` | `AV_RECEPCION_DE_DONATIVOS` | Recepción de donativos | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_COMERCIO_EXTERIOR` | `AV_DESPACHO_ADUANERO_DE_VEHICULOS` | Despacho aduanero de vehículos | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_COMERCIO_EXTERIOR` | `AV_DESPACHO_ADUANERO_DE_METALES_JOYAS_O_ARTE` | Despacho aduanero de metales, joyas o arte | Matriz funcional previa | Aprobado | Pendiente |
| `AVG_ACTIVOS_VIRTUALES` | `AV_INTERCAMBIO_DE_ACTIVOS_VIRTUALES` | Intercambio de activos virtuales | Matriz funcional previa | Aprobado | Pendiente |

El mapa contiene exactamente 31 operaciones, cada una con una asignación general primaria. Ninguna coincidencia con `cat_giros_mercantiles` o `cat_actividades_economicas` autoriza una asignación. Antes del seed siguen siendo obligatorias la validación jurídica de nombres, fracciones, alcance y mapa.

## 8. Modelo de datos propuesto

El modelo conceptual y sus tipos base quedan técnicamente cerrados con `SERIAL`/`INTEGER` y `TIMESTAMPTZ`, alineados con el esquema observado. La redacción del DDL determinará nombres exactos de constraints e índices sin reabrir las relaciones funcionales.

### 8.1 Tablas mínimas

| Tabla lógica cerrada | Campos funcionales mínimos | Restricciones y propósito |
|---|---|---|
| Control de migraciones (`schema_migrations`) | `id SERIAL`; `migration_key`; `applied_at TIMESTAMPTZ` | PK interna, clave de migración única y evidencia de aplicación. |
| Catálogo de actividades generales (`cat_actividades_vulnerables_generales`) | `id SERIAL`; clave pública `AVG_...`; nombre; fracción nullable hasta aprobación legal; descripción; activo; timestamps | Clave única e inmutable; 14 registros funcionales. No se borra si fue referenciada. |
| Catálogo de operaciones (`cat_operaciones_vulnerables`) | `id SERIAL`; clave pública `AV_...`; nombre; descripción; activo; timestamps | Clave única e inmutable; 31 registros funcionales. No se borra si fue referenciada. |
| Actividad–operación (`actividad_vulnerable_operaciones`) | `id SERIAL`; `actividad_vulnerable_general_id INTEGER`; `operacion_vulnerable_id INTEGER`; activo; timestamps | Única por par; materializa el mapa aprobado y permite desactivación lógica. |
| Empresa–actividad (`empresa_actividades_vulnerables`) | `id SERIAL`; `empresa_id INTEGER`; `actividad_vulnerable_general_id INTEGER`; activo; timestamps | Única por par; una empresa tiene una o varias actividades; una histórica puede tener cero. |
| Selección PLD del cliente (`cliente_selecciones_pld`) | Estructura exacta en 8.2 | Una sola selección activa por cliente; historial por vigencias; actividad autorizada y operación relacionada. |
| Referencia desde Perfil Transaccional | Nueva columna nullable `seleccion_pld_cliente_id INTEGER` | FK a `cliente_selecciones_pld(id)` con `ON DELETE RESTRICT` e índice. Sin backfill histórico. |

### 8.2 Estructura cerrada de `cliente_selecciones_pld`

| Campo | Definición conceptual cerrada |
|---|---|
| `id` | `SERIAL PRIMARY KEY` |
| `cliente_id` | `INTEGER NOT NULL`, FK a `clientes(id)` |
| `empresa_id` | `INTEGER NOT NULL`, FK a `empresas(id)` |
| `empresa_actividad_vulnerable_id` | `INTEGER NOT NULL`, FK a `empresa_actividades_vulnerables(id)` |
| `actividad_operacion_id` | `INTEGER NOT NULL`, FK a `actividad_vulnerable_operaciones(id)` |
| `origen_seleccion` | `VARCHAR NOT NULL` |
| `vigente_desde` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` |
| `vigente_hasta` | `TIMESTAMPTZ NULL` |
| `activo` | `BOOLEAN NOT NULL DEFAULT TRUE` |
| `creado_en` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` |
| `actualizado_en` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` |

### 8.3 Relaciones e integridad

- PK y FK internas usan `SERIAL`/`INTEGER`, alineados con las tablas inspeccionadas; el contrato público nunca depende de ellas.
- Claves públicas: ASCII, mayúsculas y guion bajo, únicas e inmutables.
- `empresa_id`: FK a la empresa real; nunca se toma de un ID arbitrario para rol cliente.
- El expediente conserva su `empresa_id` actual.
- La selección referencia la relación empresa–actividad, no solo la actividad, para reforzar autorización.
- La operación pertenece a la actividad mediante la relación actividad–operación. La integridad se asegura con FK/clave compuesta compatible y se revalida en servicio.
- Relaciones y catálogos se desactivan; no se borran si tienen historial.
- Un índice único parcial impide más de una fila con `activo = true` por `cliente_id`.
- El backend valida que cliente y selección correspondan a la misma empresa, que la actividad esté asignada a ella y que la operación pertenezca a la actividad.
- Catálogos referenciados usan borrado restringido y desactivación lógica.
- Índices mínimos: claves públicas, FKs, relaciones activas por empresa/cliente y unicidad de selección vigente.
- Todo cambio de actividad u operación actualiza únicamente `vigente_hasta`, `activo` y timestamps de la selección saliente, y crea una nueva; nunca sobrescribe su actividad u operación histórica.
- `cliente_perfil_transaccional.seleccion_pld_cliente_id` es nullable, tiene índice y FK `ON DELETE RESTRICT`.
- La nueva referencia es obligatoria por validación de backend para perfiles nuevos. Su nulabilidad preserva perfiles históricos.
- Las FK actuales de `cliente_perfil_transaccional.cliente_id` y `empresa_id` se mantienen sin cambios.
- No se impone todavía append-only mediante constraints destructivos sobre `cliente_perfil_transaccional`.
- No se borran físicamente selecciones referenciadas por perfiles.

### 8.4 Normalizado frente a JSONB

Debe normalizarse:

- catálogo y claves;
- asignación empresa–actividad;
- mapa actividad–operación;
- selección/vigencia por cliente;
- referencia de cada perfil a su selección;
- estado, fechas y auditoría mínima.

Puede almacenarse en JSONB:

- respuestas del cuestionario;
- resultado calculado y factores;
- snapshot legible de etiquetas/configuración;
- datos adicionales variables ya permitidos.

JSONB no debe usarse para decidir autorización, pertenencia al tenant o validez de una clave. `datos_completos` no se reduce ni reescribe.

## 9. Compatibilidad histórica

1. Empresas existentes pueden conservar cero actividades después de migrar.
2. No se asigna actividad por nombre, giro, RFC, actividad económica o texto.
3. Una empresa pendiente puede usar el sistema general, pero no crear un nuevo Perfil Transaccional hasta configurarse.
4. Clientes existentes permanecen visibles y editables sin selección PLD.
5. `datos_completos` se preserva íntegro, incluidas estructuras legacy y colecciones materializadas.
6. No se trasladan automáticamente valores de JSONB a las tablas nuevas.
7. El perfil histórico confirmado no se modifica, reinterpreta ni completa automáticamente. Su `seleccion_pld_cliente_id` permanece `NULL`.
8. Las claves/nombres históricos se muestran aun si su catálogo queda inactivo.
9. PUT sin propiedades nuevas conserva las relaciones. `undefined`, `null`, cadena vacía y arreglo vacío no deben colapsarse al mismo significado.
10. Persona Moral, Fideicomiso y Recursos de Terceros conservan sus contratos. La configuración PLD se agrega al expediente común sin modificar sus subestructuras.

### 9.1 Perfil histórico confirmado

Existe exactamente un registro histórico, documentado de forma saneada:

| Campo | Valor confirmado |
|---|---|
| `id` | 1 |
| `cliente_id` | 2 |
| `empresa_id` | 4 |
| `tipo_servicio` | Servicios profesionales |
| `actividad_esperada` | Consultoría empresarial |
| `monto_mensual_estimado` | 500000.00 |
| `frecuencia_operacion` | mensual |
| `version` | 1 |
| `estado` | activo |

Esos textos no autorizan inferir `AVG_SERVICIOS_PROFESIONALES` ni operación alguna. El perfil se conserva legible con “contexto PLD no determinado”, sin backfill ni modificación histórica. La demo de `localStorage` permanece separada y no se migra.

## 10. Contratos API

Los contratos funcionales de actividades, empresa, empresa de sesión, expediente y operaciones quedan cerrados como ampliaciones aditivas. Los IDs internos no forman parte del contrato público. El vínculo técnico de Perfil Transaccional queda cerrado; la ruta y payload de escritura se ajustarán al endpoint productivo que se implemente.

### 10.1 Catálogo de actividades generales

**Ruta nueva necesaria:** `GET /api/catalogos/actividades-vulnerables`.

- Roles: cualquier usuario autenticado; resultados activos.
- Request: sin `empresa_id`.
- Response 200:

```json
{
  "actividades_vulnerables": [
    {
      "clave": "AVG_INMOBILIARIA",
      "fraccion": null,
      "nombre": "Actividad inmobiliaria",
      "descripcion": null
    }
  ]
}
```

- Errores: 401 sin sesión; 500 inesperado.
- Compatibilidad: aditivo; sigue patrón de `catalogos.routes.ts`.

### 10.2 Operaciones por actividad

**Ruta nueva necesaria:** `GET /api/catalogos/operaciones-vulnerables?actividad_clave=AVG_INMOBILIARIA`.

- Roles: autenticado.
- Request: clave pública obligatoria.
- Response 200:

```json
{
  "actividad_clave": "AVG_INMOBILIARIA",
  "operaciones": [
    {
      "clave": "AV_CONSTRUCCION_DE_INMUEBLES",
      "nombre": "Construcción de inmuebles",
      "descripcion": null
    }
  ]
}
```

- Errores: 400 formato/ausencia; 401; 404 actividad inexistente o inactiva; 500.
- No devuelve operaciones inactivas para nuevas selecciones.

### 10.3 Empresas

Se amplían las rutas existentes:

- `GET /api/admin/empresas`: `admin`, `consultor`.
- `GET /api/admin/empresas/:id`: `admin`, `consultor`.
- `POST /api/admin/empresas`: `admin`.
- `PUT /api/admin/empresas/:id`: `admin`.

Propiedad pública:

```json
{
  "actividades_vulnerables": [
    {
      "clave": "AVG_INMOBILIARIA",
      "fraccion": null,
      "nombre": "Actividad inmobiliaria",
      "descripcion": null
    }
  ],
  "configuracion_pld_pendiente": false
}
```

Escritura:

```json
{
  "nombre_legal": "Empresa ejemplo",
  "tipo_entidad": "persona_moral",
  "actividades_vulnerables": ["AVG_INMOBILIARIA"]
}
```

Reglas:

- POST nuevo: propiedad presente, arreglo no vacío de claves únicas, activas y válidas.
- PUT con propiedad ausente: no modifica relaciones.
- PUT con arreglo no vacío: reconcilia el conjunto completo en la misma transacción.
- PUT con `[]`: 400 en el MVP.
- `null`, escalar, elemento no string, vacío, duplicado o clave no activa: 400.
- Nombre/RFC duplicado: 409 según contrato actual.
- Otros errores: 401, 403, 404 y 500.
- Una empresa histórica se lee con `[]` y `configuracion_pld_pendiente: true`.

### 10.4 Empresa de la sesión

Se amplía `GET /api/cliente/mi-empresa`:

```json
{
  "empresa": {
    "id": 5,
    "nombre_legal": "Empresa ejemplo",
    "actividades_vulnerables": [],
    "configuracion_pld_pendiente": true
  }
}
```

- `empresa_id` se obtiene solo del JWT.
- No acepta query/body para cambiar tenant.
- Mantiene 401, 403, 404 y 500 actuales.
- Devuelve únicamente asignaciones y catálogos activos; `[]` es válido para histórica.

### 10.5 Alta y edición de cliente

Se amplían `POST /api/cliente/registrar-cliente` y `PUT /api/cliente/clientes/:id`.

Propiedades propuestas al nivel del expediente, fuera de `datos_completos`:

```json
{
  "actividad_vulnerable_clave": "AVG_INMOBILIARIA",
  "operacion_vulnerable_clave": "AV_CONSTRUCCION_DE_INMUEBLES"
}
```

Reglas:

- El backend resuelve `empresa_id` y valida pertenencia.
- Empresa con una actividad: el backend la autoselecciona cuando el expediente todavía no tiene selección.
- Empresa con varias: actividad obligatoria para expediente nuevo.
- Empresa sin actividad: el cliente sigue visible y editable, queda pendiente y no puede guardar Perfil Transaccional.
- La operación se exige antes de guardar el Perfil Transaccional. Si la UX la captura en alta, se valida de inmediato.
- Actividad no asignada u operación no relacionada: 400; nunca fallback.
- PUT con ambas propiedades ausentes: conserva selección.
- Cambio explícito: crea nueva vigencia; requiere operación compatible.
- Vacío o `null`: 400; no significa borrar.
- 409 cuando existe conflicto de transición o concurrencia que no pueda reconciliarse.
- Respuesta de cliente agrega:

```json
{
  "configuracion_pld": {
    "estado": "completa",
    "actividad": { "clave": "AVG_INMOBILIARIA", "nombre": "Actividad inmobiliaria" },
    "operacion": { "clave": "AV_CONSTRUCCION_DE_INMUEBLES", "nombre": "Construcción de inmuebles" },
    "origen_seleccion": "automatica"
  }
}
```

La operación se captura durante alta/edición o en el paso inmediatamente anterior al perfil. Los contratos existentes de `tipo_cliente`, `nacionalidad` y `datos_completos` permanecen.

### 10.6 Lectura y guardado de Perfil Transaccional

El `GET /api/cliente/clientes/:id` existente seguirá devolviendo `perfil_transaccional` como último perfil y agregará el contexto PLD de forma aditiva.

Para el perfil histórico con `seleccion_pld_cliente_id IS NULL`:

```json
{
  "perfil_transaccional": {
    "id": 1,
    "contexto_pld": null,
    "contexto_pld_pendiente": true
  }
}
```

La respuesta real conserva además sus campos históricos existentes; el ejemplo omite deliberadamente datos que no son necesarios para evidenciar el contrato.

Para perfiles nuevos:

```json
{
  "perfil_transaccional": {
    "seleccion_pld_cliente_id": 123,
    "contexto_pld": {
      "actividad": { "clave": "AVG_INMOBILIARIA", "nombre": "Actividad inmobiliaria" },
      "operacion": { "clave": "AV_CONSTRUCCION_DE_INMUEBLES", "nombre": "Construcción de inmuebles" }
    },
    "contexto_pld_pendiente": false
  }
}
```

No se localizó endpoint productivo de escritura. Se propone `POST /api/cliente/clientes/:id/perfil-transaccional`, sujeto a revisión del patrón de rutas al implementar.

Request conceptual:

```json
{
  "actividad_vulnerable_clave": "AVG_INMOBILIARIA",
  "operacion_vulnerable_clave": "AV_CONSTRUCCION_DE_INMUEBLES",
  "version_cuestionario": "PT-MVP-1",
  "respuestas": {},
  "resultado": {}
}
```

Response 201: perfil con identificador, cliente, claves públicas, versión, estado, timestamps y resultado.

Reglas:

- Roles y alcance iguales al acceso autorizado del cliente; todo acceso revalida tenant.
- El servidor carga la selección vigente, comprueba `cliente_id` y `empresa_id`, y rechaza una selección enviada que no corresponda al expediente y tenant.
- Todo perfil nuevo se guarda con `seleccion_pld_cliente_id` no nulo por regla de backend.
- Empresa/actividad/operación pendientes: 409, porque el recurso existe pero no está listo para evaluación.
- Cuestionario/respuestas inválidos: 400.
- Cliente inexistente: 404.
- 401, 403 y 500 aplican.
- Guardado append-only/versionado; nunca sobrescribe un perfil histórico.
- No se agrega todavía una constraint destructiva para convertir toda la tabla en append-only.
- El demo `localStorage` no se migra automáticamente.
- Perfiles con FK nula conservan `contexto_pld: null` y `contexto_pld_pendiente: true`; no se infiere contexto por texto.

## 11. Reglas de frontend

### 11.1 Empresa

- Alta: `fieldset`/selector de una o varias actividades generales; al menos una para empresas nuevas.
- Edición: hidratar asignaciones activas; no enviar la propiedad hasta que el usuario la cambie.
- Empresa histórica sin asignación: mostrar “Configuración PLD pendiente”; permitir editar otros campos.
- Listado: máximo dos nombres y contador; pendiente visible cuando `[]`.
- Detalle: lista completa con nombre, fracción y descripción.
- No ofrecer giros o actividades económicas como sustitutos.

### 11.2 Cliente

- Consultar empresa de sesión para rol cliente; admin/consultor usan la empresa elegida dentro de sus permisos.
- Una actividad: mostrarla preseleccionada y bloqueada, pero confiar en validación backend.
- Varias: selector solo con asignaciones activas.
- Cero: aviso bloqueante únicamente para el paso PLD; no default.
- Operación: cargar después de resolver actividad y mostrar solo relacionadas.
- La actividad/operación puede completarse en alta o en un paso posterior según la decisión de UX, pero debe estar lista antes del perfil.
- Edición sin tocar el bloque PLD no modifica la selección.
- Cambio confirmado crea vigencia nueva; debe advertir que perfiles previos permanecen.
- No insertar estos valores dentro de las ramas PF/PM/FID de `datos_completos`.

### 11.3 Perfil

- La pantalla productiva usa actividad y operación vigentes del expediente; no permite elegir libremente.
- El cuestionario actual puede reutilizarse solo si el Oficial de Cumplimiento aprueba su aplicabilidad y versión.
- No habilitar configurador dinámico.
- Datos incompletos: mostrar qué configuración falta y enlace autorizado para completarla.
- Resultado existente: conservarlo y mostrar su actividad, operación y versión cuando tenga vínculo; con FK nula mostrar contexto PLD pendiente sin inferencia.
- No mezclar datos demo de `localStorage` con persistencia real.

## 12. Seguridad y permisos

| Acción | Admin | Consultor | Cliente |
|---|---|---|---|
| Ver catálogo | Sí | Sí | Sí autenticado |
| Asignar actividades a empresa | Sí | No | No |
| Ver empresas | Sí | Sí | Solo su empresa mediante `mi-empresa` |
| Elegir actividad/operación de expediente | Sí, dentro del alcance autorizado | Solo lectura | Solo expedientes de su empresa |
| Crear/ver Perfil Transaccional | Crear y consultar dentro del alcance autorizado | Solo lectura | Crear y consultar solo dentro de su empresa |

Controles obligatorios:

- derivar `empresa_id` del JWT para usuario cliente;
- al operar por `cliente_id`, cargar cliente y comparar tenant antes de consultar o mutar PLD;
- no aceptar `empresa_id` del body/query como autoridad;
- resolver claves públicas a IDs dentro de la transacción;
- no exponer IDs internos salvo necesidad técnica aprobada;
- evitar enumeración cruzada mediante 403/404 consistente;
- reutilizar `authenticate` y `authorizeRoles`;
- registrar actor, acción, entidad, claves anteriores/nuevas y timestamp sin almacenar tokens;
- no registrar respuestas sensibles completas en logs.

La autorización actual limita automáticamente por tenant solo al rol `cliente` en varias rutas. La implementación debe conservar ese aislamiento y aplicar al consultor la decisión cerrada de solo lectura.

## 13. Migración y rollback

### 13.1 Preflight técnico cumplido

1. Se identificó la base enlazada por la configuración real del backend: `scmvp_0plk`, esquema `public`, PostgreSQL 17.10.
2. Se confirmaron `empresas`, `clientes`, `cliente_perfil_transaccional` y `matrices_riesgo`.
3. Se inventariaron columnas, tipos, PK, FK e índices confirmados de `cliente_perfil_transaccional`.
4. Se alineó el modelo nuevo con PK `SERIAL`, FK `INTEGER` y timestamps `TIMESTAMPTZ`.
5. Se confirmó la inexistencia de `schema_migrations` y de las tablas previas de actividades vulnerables.
6. Se definió el tratamiento sin backfill del único perfil histórico.

La evidencia no incluye host, puerto, credenciales ni cadena de conexión. Inmediatamente antes de ejecutar una migración deberá repetirse una verificación de identidad y tomarse un respaldo restaurable en base desechable.

### 13.2 Aplicación

1. Crear una migración versionada y una tabla mínima de control si no existe.
2. Ejecutar todo el esquema/seed posible dentro de una transacción.
3. Crear catálogos, relaciones, selección histórica e índices según el diseño aprobado.
4. Insertar seed por claves, sin IDs fijos y con conteos esperados aprobados.
5. No asignar actividades a empresas existentes.
6. Registrar la migración al final.
7. Probar segunda ejecución: debe abortar explícitamente o no alterar datos según política aprobada.

### 13.3 Verificación

- conteos y claves exactas;
- FKs e índices;
- cero asignaciones automáticas;
- empresas/clientes históricos intactos;
- transacción y control de migración;
- backend build y smoke tests contra base desechable;
- prueba de aislamiento.

### 13.4 Rollback

- ejecutar primero en base desechable;
- abortar rollback destructivo si existen relaciones, selecciones o perfiles nuevos;
- eliminar en orden inverso solo objetos de esta migración;
- conservar tabla de control y evidencia;
- restaurar respaldo solo mediante runbook aprobado;
- jamás editar dumps/backups como sustituto de migración.

### 13.5 Orden de despliegue

> Base correcta → backend compatible → frontend.

No arrancar backend dependiente de tablas antes de migrar. Backend y frontend deben tolerar empresas históricas con `[]`. Verificar health, autenticación, catálogos, empresa de sesión, alta/edición y detalle. La identidad de la base debe revalidarse inmediatamente antes de aplicar, sin reabrir el preflight ya cerrado.

## 14. Plan único de implementación

| Etapa | Entregable | Archivos probables, no exhaustivos |
|---|---|---|
| 1. Diseño aprobado | Esta especificación, catálogo y decisiones firmadas | `docs/especificaciones/ESP-AV-001_modelo_integral_actividades_vulnerables.md` |
| 2. Migración | Up/down/runbook, seed aprobado, control de migración | Nueva carpeta/archivos de migración bajo `backend/`; ubicación exacta por aprobar |
| 3. Backend | Catálogos, relaciones de empresa, selección de expediente y perfil | `backend/src/routes/admin.routes.ts`, `catalogos.routes.ts`, `cliente.routes.ts`; helpers/tipos/pruebas mínimos |
| 4. Frontend empresa | Alta, edición, listado y detalle | `frontend/src/app/admin/crear-empresa/page.tsx`, `editar-empresa/[id]/page.tsx`, `empresas/page.tsx` |
| 5. Frontend cliente/perfil | Selección controlada, operación, pantalla productiva | `ClientPage.tsx`, edición/detalle/listado de cliente y ruta de Perfil Transaccional por aprobar |
| 6. Builds | Backend y frontend sin errores | scripts existentes |
| 7. Pruebas | Matriz completa en base desechable y Preview | pruebas automatizadas y evidencia manual |
| 8. PR | Revisión técnica, funcional y jurídica | una rama integral posterior; sin despliegue DB aún |
| 9. Migración | Aplicar a la base exacta confirmada | runbook y evidencia de control |
| 10. Merge/despliegue | Backend y luego frontend | pipeline/manual vigente |
| 11. Producción | Smoke, regresión, aislamiento y monitoreo | evidencia sin secretos |

Cada etapa tiene criterio de salida. No se programa la siguiente si persiste un bloqueo de validación legal, base real, esquema de Perfil Transaccional o migración.

## 15. Matriz completa de pruebas

| ID | Precondición | Pasos | Resultado esperado | Evidencia | Severidad |
|---|---|---|---|---|---|
| AV-T01 | Backup restaurable | Restaurar en base desechable | Restore íntegro y conteos baseline | Log y conteos | Crítica |
| AV-T02 | Conexión candidata | Consultar identidad sin secretos | Coincide con servicio objetivo | Captura saneada | Crítica |
| AV-T03 | Base baseline | Aplicar migración | Transacción completa, control registrado | Log psql saneado | Crítica |
| AV-T04 | Migración aplicada | Ejecutarla de nuevo | No duplica seed ni objetos; comportamiento esperado | Error/control documentado | Alta |
| AV-T05 | Catálogo aprobado | Comparar claves/conteos | Coincidencia exacta | Query de verificación | Crítica |
| AV-T06 | Catálogos cargados | Consultar como usuario autenticado | Solo activos, claves públicas | HTTP 200 | Alta |
| AV-T07 | Sin token | Consultar catálogos | 401 | Respuesta HTTP | Alta |
| AV-T08 | Consultor | Intentar asignar empresa | 403 | Respuesta HTTP | Crítica |
| AV-T09 | Admin | Crear empresa con una actividad | Empresa y relación atómicas | HTTP 201 + DB | Crítica |
| AV-T10 | Admin | Crear empresa con varias | Todas se relacionan una vez | HTTP 201 + DB | Alta |
| AV-T11 | Admin | Crear sin actividad | 400 según contrato nuevo | Respuesta y sin empresa parcial | Alta |
| AV-T12 | Empresa histórica | Listar/detallar | `[]` y pendiente; sin error | UI + API | Alta |
| AV-T13 | Empresa configurada | PUT sin propiedad | Relaciones sin cambios | Antes/después | Crítica |
| AV-T14 | Empresa configurada | PUT con conjunto nuevo | Desactiva/reactiva sin borrar historial | API + DB | Crítica |
| AV-T15 | Empresa configurada | PUT con `[]` | 400 según contrato MVP cerrado | Respuesta HTTP | Alta |
| AV-T16 | Clave inválida/inactiva | POST/PUT | 400; no hay escritura parcial | API + DB | Crítica |
| AV-T17 | Empresa con una actividad | Alta de cliente | Autoselección backend | Respuesta + selección | Crítica |
| AV-T18 | Empresa con varias | Abrir alta | Solo opciones autorizadas | Evidencia UI/API | Crítica |
| AV-T19 | Empresa con varias | Enviar clave ajena | 400/403; sin selección | API + DB | Crítica |
| AV-T20 | Empresa sin actividad | Abrir cliente/perfil | Acceso general; perfil bloqueado como pendiente | UI + API | Alta |
| AV-T21 | Cliente existente | Leer/editar sin campos PLD | No pierde datos ni se autoconfigura | Diff JSON/DB | Crítica |
| AV-T22 | Actividad seleccionada | Consultar operaciones | Solo activas y relacionadas | HTTP 200 | Alta |
| AV-T23 | Operación ajena | Guardar selección/perfil | Rechazo sin persistencia | HTTP + DB | Crítica |
| AV-T24 | Selección vigente | Cambiar actividad | Cierra vigencia, exige operación compatible | Historial DB | Crítica |
| AV-T25 | Selección vigente | Cambiar operación | Nuevo historial; perfil previo intacto | Historial DB/UI | Alta |
| AV-T26 | Perfil histórico id 1 | Consultar detalle | Sin modificación; `contexto_pld: null` y pendiente `true` | UI/API/DB | Crítica |
| AV-T27 | Perfil configurado | Guardar cuestionario válido | Perfil ligado a `seleccion_pld_cliente_id` vigente y revalidado | API + DB | Crítica |
| AV-T28 | Perfil incompleto | Guardar | 400/409 claro, sin registro parcial | HTTP + DB | Alta |
| AV-T29 | Perfil existente | Crear nueva evaluación | Perfil anterior sin backfill; nueva fila vinculada a selección vigente | DB/UI | Crítica |
| AV-T30 | Demo local previa | Abrir módulo productivo | No importa ni mezcla `localStorage` | DevTools + DB | Media |
| AV-T31 | Cliente tenant A | Solicitar cliente/perfil tenant B | 403/404 consistente; cero fuga | HTTP/log saneado | Crítica |
| AV-T32 | Admin/consultor | Probar alcance aprobado | Solo acciones permitidas | Matriz de roles | Crítica |
| AV-T33 | Concurrencia | Dos PUT de asignaciones | Sin duplicados; resultado consistente | DB/log | Alta |
| AV-T34 | Error inducido | Fallar relación tras alta empresa | Rollback total | DB antes/después | Crítica |
| AV-T35 | Datos con acentos | Catálogo/respuestas JSON | Unicode íntegro | Request/response/DB | Alta |
| AV-T36 | PF completa existente | Alta, edición, detalle | Sin regresión de validación/payload | Evidencia funcional | Crítica |
| AV-T37 | Persona Moral | Alta/edición existente | Sin cambio de subcontrato | Evidencia funcional | Crítica |
| AV-T38 | Fideicomiso | Alta/edición existente | Sin cambio de subcontrato | Evidencia funcional | Crítica |
| AV-T39 | Recursos de Terceros | Captura/persistencia | Sin pérdida ni defaults nuevos | Evidencia funcional | Crítica |
| AV-T40 | Migración con datos nuevos | Intentar rollback | Aborta para evitar pérdida | Log saneado | Crítica |
| AV-T41 | Base desechable sin uso | Ejecutar rollback | Objetos propios eliminados en orden | Esquema antes/después | Alta |
| AV-T42 | Preview desplegado | DB → backend → frontend | No hay ventana con dependencias rotas | Timestamps/health | Crítica |
| AV-T43 | Producción | Smoke de auth/empresa/cliente/perfil | 200/401/403 esperados y UI funcional | Evidencia operativa | Crítica |

## 16. Riesgos y decisiones pendientes

Las decisiones funcionales de empresa, expediente, operación, permisos, historial y semántica de PUT están cerradas en las secciones 6 y 10. Solo permanecen los siguientes bloqueos previos a migración:

| Bloqueo pendiente | Alcance requerido | Resultado de salida | Responsable |
|---|---|---|---|
| Validación jurídica de actividades generales | Validar las 14 actividades y sus nombres/alcance | Catálogo firmado por Oficial de Cumplimiento | Jurídico/Oficial de Cumplimiento |
| Validación jurídica de operaciones | Validar las 31 operaciones y sus denominaciones | Catálogo de operaciones firmado | Jurídico/Oficial de Cumplimiento |
| Fracciones y fundamento normativo | Confirmar fuente, fracción y alcance aplicable | Fundamento documentado sin afirmaciones provisionales | Jurídico/Oficial de Cumplimiento |
| Aprobación final del mapa actividad–operación | Ratificar o corregir jurídicamente el mapa funcional | Matriz definitiva firmada antes del seed | Jurídico/Oficial de Cumplimiento |
| SQL de migración y rollback | Revisar transacción, constraints, índices, seed, doble ejecución, guardas y rollback en base desechable | Aprobación técnica previa a toda ejecución | DBA/Backend/DevOps |

### Riesgos principales

- confiar en SQL histórico como esquema vigente;
- arrancar backend antes de crear tablas;
- seed jurídicamente incorrecto;
- pérdida de historial por reconciliación destructiva;
- autorización por ID enviado por el navegador;
- convertir una demo local en resultado regulatorio;
- despliegue parcial entre DB, backend y frontend;
- extender inadvertidamente validaciones internas de PF a PM/Fideicomiso.

## 17. Criterios de aprobación

El diseño funcional y el preflight técnico están cumplidos en esta versión. Para autorizar la implementación y posterior ejecución de migración deben satisfacerse:

1. **Diseño funcional aprobado — cumplido:** versión `0.3-PREFLIGHT-TECNICO-CERRADO`, con 14 actividades generales, 31 operaciones y contratos funcionales.
2. **Preflight de base — cumplido:** identidad saneada, esquema, objetos, tipos y baseline confirmados.
3. **Preflight de Perfil Transaccional — cumplido:** tabla, columnas, constraints, ausencia de índice adicional y perfil histórico inventariados; tratamiento nullable sin backfill definido.
4. **Validación jurídica — pendiente:** catálogo, fracciones, fundamento y mapa actividad–operación firmados por el Oficial de Cumplimiento.
5. **Aprobación técnica de migración — pendiente:** SQL up/down, control de doble ejecución, respaldo, prueba en base desechable, rollback y orden DB → backend → frontend revisados.

Hasta completar los puntos pendientes, este documento permanece en estado **0.3-PREFLIGHT-TECNICO-CERRADO** y no autoriza ejecutar SQL, migraciones ni despliegues.
