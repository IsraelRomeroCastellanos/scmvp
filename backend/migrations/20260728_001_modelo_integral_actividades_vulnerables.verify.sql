BEGIN;
SET TRANSACTION READ ONLY;

-- Identidad saneada de la conexión. No imprime host, puerto ni credenciales.
SELECT
  current_database() AS current_database,
  current_user AS current_user,
  current_schema() AS current_schema,
  current_setting('server_version') AS server_version;

-- Existencia de objetos esperados.
SELECT
  objeto,
  to_regclass(objeto) IS NOT NULL AS existe
FROM (
  VALUES
    ('public.schema_migrations'),
    ('public.cat_actividades_vulnerables_generales'),
    ('public.cat_operaciones_vulnerables'),
    ('public.actividad_vulnerable_operaciones'),
    ('public.empresa_actividades_vulnerables'),
    ('public.cliente_selecciones_pld'),
    ('public.cliente_perfil_transaccional')
) AS objetos(objeto)
ORDER BY objeto;

-- Registro de la migración.
SELECT
  migration_key,
  applied_at
FROM public.schema_migrations
WHERE migration_key = '20260728_001_modelo_integral_actividades_vulnerables';

-- Conteos exactos del seed y del mapa.
SELECT COUNT(*) AS actividades_generales
FROM public.cat_actividades_vulnerables_generales;

SELECT COUNT(*) AS operaciones_vulnerables
FROM public.cat_operaciones_vulnerables;

SELECT COUNT(*) AS relaciones_actividad_operacion
FROM public.actividad_vulnerable_operaciones;

-- Mapa completo para cotejo contra las 31 relaciones aprobadas.
SELECT
  actividad.clave AS actividad_clave,
  operacion.clave AS operacion_clave
FROM public.actividad_vulnerable_operaciones relacion
JOIN public.cat_actividades_vulnerables_generales actividad
  ON actividad.id = relacion.actividad_vulnerable_id
JOIN public.cat_operaciones_vulnerables operacion
  ON operacion.id = relacion.operacion_vulnerable_id
ORDER BY actividad.clave, operacion.clave;

-- Debe devolver cero filas mientras las fracciones sigan pendientes.
SELECT
  clave,
  fraccion
FROM public.cat_actividades_vulnerables_generales
WHERE fraccion IS NOT NULL
ORDER BY clave;

-- El despliegue inicial no asigna empresas ni crea selecciones.
SELECT COUNT(*) AS empresas_asignadas
FROM public.empresa_actividades_vulnerables;

SELECT COUNT(*) AS selecciones_pld
FROM public.cliente_selecciones_pld;

-- Evidencia saneada del perfil histórico confirmado.
SELECT
  id,
  cliente_id,
  empresa_id,
  tipo_servicio,
  actividad_esperada,
  monto_mensual_estimado,
  frecuencia_operacion,
  version,
  estado,
  seleccion_pld_cliente_id
FROM public.cliente_perfil_transaccional
WHERE id = 1;

-- Después del UP inicial, todos los perfiles preexistentes conservan FK NULL.
SELECT
  COUNT(*) AS perfiles_totales,
  COUNT(*) FILTER (WHERE seleccion_pld_cliente_id IS NULL) AS perfiles_sin_contexto_pld,
  COUNT(*) FILTER (WHERE seleccion_pld_cliente_id IS NOT NULL) AS perfiles_con_contexto_pld
FROM public.cliente_perfil_transaccional;

-- Constraints creadas por la migración.
SELECT
  conrelid::regclass AS tabla,
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid IN (
  'public.schema_migrations'::regclass,
  'public.cat_actividades_vulnerables_generales'::regclass,
  'public.cat_operaciones_vulnerables'::regclass,
  'public.actividad_vulnerable_operaciones'::regclass,
  'public.empresa_actividades_vulnerables'::regclass,
  'public.cliente_selecciones_pld'::regclass,
  'public.cliente_perfil_transaccional'::regclass
)
  AND (
    conrelid <> 'public.cliente_perfil_transaccional'::regclass
    OR conname = 'fk_cliente_perfil_tx_seleccion_pld'
  )
ORDER BY conrelid::regclass::text, conname;

-- Índices creados o asociados a las tablas nuevas.
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    tablename IN (
      'cat_actividades_vulnerables_generales',
      'cat_operaciones_vulnerables',
      'actividad_vulnerable_operaciones',
      'empresa_actividades_vulnerables',
      'cliente_selecciones_pld'
    )
    OR indexname = 'idx_cliente_perfil_transaccional_seleccion_pld'
  )
ORDER BY tablename, indexname;

-- Debe devolver cero operaciones huérfanas.
SELECT
  operacion.clave,
  operacion.nombre
FROM public.cat_operaciones_vulnerables operacion
LEFT JOIN public.actividad_vulnerable_operaciones relacion
  ON relacion.operacion_vulnerable_id = operacion.id
WHERE relacion.id IS NULL
ORDER BY operacion.clave;

-- Debe devolver cero actividades sin operaciones.
SELECT
  actividad.clave,
  actividad.nombre
FROM public.cat_actividades_vulnerables_generales actividad
LEFT JOIN public.actividad_vulnerable_operaciones relacion
  ON relacion.actividad_vulnerable_id = actividad.id
WHERE relacion.id IS NULL
ORDER BY actividad.clave;

-- Debe devolver cero operaciones relacionadas más de una vez.
SELECT
  operacion.clave,
  COUNT(*) AS relaciones
FROM public.cat_operaciones_vulnerables operacion
JOIN public.actividad_vulnerable_operaciones relacion
  ON relacion.operacion_vulnerable_id = operacion.id
GROUP BY operacion.id, operacion.clave
HAVING COUNT(*) <> 1
ORDER BY operacion.clave;

-- Debe devolver cero inconsistencias entre cliente, empresa, actividad y operación.
SELECT
  seleccion.id AS seleccion_id,
  seleccion.cliente_id,
  seleccion.empresa_id,
  cliente.empresa_id AS cliente_empresa_id,
  empresa_actividad.empresa_id AS actividad_empresa_id,
  empresa_actividad.actividad_vulnerable_id AS empresa_actividad_id,
  actividad_operacion.actividad_vulnerable_id AS operacion_actividad_id
FROM public.cliente_selecciones_pld seleccion
JOIN public.clientes cliente
  ON cliente.id = seleccion.cliente_id
JOIN public.empresa_actividades_vulnerables empresa_actividad
  ON empresa_actividad.id = seleccion.empresa_actividad_vulnerable_id
JOIN public.actividad_vulnerable_operaciones actividad_operacion
  ON actividad_operacion.id = seleccion.actividad_operacion_id
WHERE cliente.empresa_id <> seleccion.empresa_id
   OR empresa_actividad.empresa_id <> seleccion.empresa_id
   OR empresa_actividad.actividad_vulnerable_id
      <> actividad_operacion.actividad_vulnerable_id
ORDER BY seleccion.id;

-- Debe devolver cero selecciones activas duplicadas por cliente.
SELECT
  cliente_id,
  COUNT(*) AS selecciones_vigentes
FROM public.cliente_selecciones_pld
WHERE activo = TRUE
  AND vigente_hasta IS NULL
GROUP BY cliente_id
HAVING COUNT(*) > 1
ORDER BY cliente_id;

-- Debe devolver cero perfiles cuyo vínculo no corresponda al mismo cliente y empresa.
SELECT
  perfil.id AS perfil_id,
  perfil.cliente_id AS perfil_cliente_id,
  perfil.empresa_id AS perfil_empresa_id,
  seleccion.cliente_id AS seleccion_cliente_id,
  seleccion.empresa_id AS seleccion_empresa_id
FROM public.cliente_perfil_transaccional perfil
JOIN public.cliente_selecciones_pld seleccion
  ON seleccion.id = perfil.seleccion_pld_cliente_id
WHERE perfil.cliente_id <> seleccion.cliente_id
   OR perfil.empresa_id <> seleccion.empresa_id
ORDER BY perfil.id;

COMMIT;
