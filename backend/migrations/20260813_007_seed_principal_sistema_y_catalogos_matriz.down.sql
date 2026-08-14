BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtext('20260813_007_seed_principal_sistema_y_catalogos_matriz')
);

LOCK TABLE
  public.usuarios,
  public.catalogo_criterio_pt,
  public.catalogo_criterio_pt_version,
  public.catalogo_criterio_gr,
  public.catalogo_criterio_gr_version,
  public.matriz_criterio,
  public.matriz_empresa_version,
  public.matriz_archivo_fuente,
  public.matriz_auditoria_evento,
  public.matriz_idempotencia
IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
  principal_id INTEGER;
  criterio RECORD;
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Rollback no aplicable: se esperaba el esquema public';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260813_007_seed_principal_sistema_y_catalogos_matriz'
  ) THEN
    RAISE EXCEPTION 'Rollback no aplicable: falta la migration key 007';
  END IF;

  SELECT id
    INTO STRICT principal_id
    FROM public.usuarios
   WHERE codigo_principal = 'PLD_SYSTEM'
     AND tipo_principal = 'SISTEMA'
     AND email = 'pld-system@internal.invalid'
     AND password_hash = '!SYSTEM_PRINCIPAL_NO_LOGIN!'
     AND nombre_completo = 'Principal técnico PLD VISSION'
     AND rol IS NULL
     AND empresa_id IS NULL
     AND activo IS FALSE;

  IF (SELECT pg_catalog.count(*) FROM public.usuarios
      WHERE codigo_principal = 'PLD_SYSTEM') <> 1 THEN
    RAISE EXCEPTION 'Rollback bloqueado: PLD_SYSTEM no conserva el contrato unico de 007';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger tr
    JOIN pg_catalog.pg_class t ON t.oid = tr.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_catalog.pg_proc p ON p.oid = tr.tgfoid
    JOIN pg_catalog.pg_namespace pn ON pn.oid = p.pronamespace
    WHERE n.nspname = 'public' AND t.relname = 'catalogo_criterio_pt_version'
      AND tr.tgname = 'trg_catalogo_criterio_pt_version_inmutable'
      AND NOT tr.tgisinternal AND tr.tgenabled = 'O'
      AND pn.nspname = 'public'
      AND p.proname = 'fn_catalogo_criterio_version_inmutable'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger tr
    JOIN pg_catalog.pg_class t ON t.oid = tr.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_catalog.pg_proc p ON p.oid = tr.tgfoid
    JOIN pg_catalog.pg_namespace pn ON pn.oid = p.pronamespace
    WHERE n.nspname = 'public' AND t.relname = 'catalogo_criterio_gr_version'
      AND tr.tgname = 'trg_catalogo_criterio_gr_version_inmutable'
      AND NOT tr.tgisinternal AND tr.tgenabled = 'O'
      AND pn.nspname = 'public'
      AND p.proname = 'fn_catalogo_criterio_version_inmutable'
  ) THEN
    RAISE EXCEPTION 'Rollback bloqueado: triggers de inmutabilidad de versiones incompatibles';
  END IF;

  FOR criterio IN
    SELECT * FROM (VALUES
      ('TIPO_PRODUCTO', 'Tipo de producto'),
      ('NATURALEZA_PRODUCTO', 'Naturaleza del producto/servicio'),
      ('FRECUENCIA_PRODUCTO', 'Frecuencia del producto/servicio'),
      ('DESTINO_RECURSOS_PT', 'Destino de los recursos')
    ) AS t(codigo, nombre)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.catalogo_criterio_pt c
      JOIN public.catalogo_criterio_pt_version v
        ON v.criterio_pt_id = c.id
      WHERE c.codigo_canonico = criterio.codigo
        AND c.nombre_visible_global = criterio.nombre
        AND c.descripcion IS NULL
        AND c.estado = 'ACTIVO'
        AND c.creado_por = principal_id
        AND c.retirado_por IS NULL
        AND c.retirado_en IS NULL
        AND c.version_vigente_id = v.id
        AND v.version_contrato = 1
        AND v.tipo_resolucion = 'CAPTURA_OPCIONES'
        AND v.tipo_parametrizacion = 'OPCIONES'
        AND v.unidad_canonica IS NULL
        AND v.creado_por = principal_id
    ) OR (
      SELECT pg_catalog.count(*)
      FROM public.catalogo_criterio_pt_version v
      JOIN public.catalogo_criterio_pt c ON c.id = v.criterio_pt_id
      WHERE c.codigo_canonico = criterio.codigo
    ) <> 1 THEN
      RAISE EXCEPTION 'Rollback bloqueado: criterio PT % fue modificado o versionado', criterio.codigo;
    END IF;
  END LOOP;

  FOR criterio IN
    SELECT * FROM (VALUES
      ('ACTIVIDAD_ECONOMICA', 'Actividad económica / giro mercantil',
       'CATALOGO_GLOBAL', 'ACTIVIDAD_ECONOMICA'),
      ('ZONA_GEOGRAFICA', 'Lugar de residencia / zona geográfica',
       'CATALOGO_GLOBAL', 'ZONA_GEOGRAFICA'),
      ('DESTINO_RECURSOS_GR', 'Destino de los recursos',
       'ESTRUCTURADO', 'DESTINO_RECURSOS_GR'),
      ('PERFIL_TRANSACCIONAL', 'Perfil transaccional',
       'DERIVADO', 'PERFIL_TRANSACCIONAL')
    ) AS t(codigo, nombre, tipo_resolucion, resolver_codigo)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.catalogo_criterio_gr c
      JOIN public.catalogo_criterio_gr_version v
        ON v.criterio_gr_id = c.id
      WHERE c.codigo_canonico = criterio.codigo
        AND c.nombre_visible_global = criterio.nombre
        AND c.descripcion IS NULL
        AND c.estado = 'ACTIVO'
        AND c.creado_por = principal_id
        AND c.retirado_por IS NULL
        AND c.retirado_en IS NULL
        AND c.version_vigente_id = v.id
        AND v.version_contrato = 1
        AND v.tipo_resolucion = criterio.tipo_resolucion
        AND v.resolver_codigo = criterio.resolver_codigo
        AND v.tipo_parametrizacion = 'NINGUNA'
        AND v.unidad_canonica IS NULL
        AND v.creado_por = principal_id
    ) OR (
      SELECT pg_catalog.count(*)
      FROM public.catalogo_criterio_gr_version v
      JOIN public.catalogo_criterio_gr c ON c.id = v.criterio_gr_id
      WHERE c.codigo_canonico = criterio.codigo
    ) <> 1 THEN
      RAISE EXCEPTION 'Rollback bloqueado: criterio GR % fue modificado o versionado', criterio.codigo;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM public.matriz_criterio mc
    JOIN public.catalogo_criterio_pt_version v
      ON v.id = mc.catalogo_criterio_pt_version_id
    JOIN public.catalogo_criterio_pt c ON c.id = v.criterio_pt_id
    WHERE c.codigo_canonico IN (
      'TIPO_PRODUCTO', 'NATURALEZA_PRODUCTO',
      'FRECUENCIA_PRODUCTO', 'DESTINO_RECURSOS_PT'
    )
  ) OR EXISTS (
    SELECT 1
    FROM public.matriz_criterio mc
    JOIN public.catalogo_criterio_gr_version v
      ON v.id = mc.catalogo_criterio_gr_version_id
    JOIN public.catalogo_criterio_gr c ON c.id = v.criterio_gr_id
    WHERE c.codigo_canonico IN (
      'ACTIVIDAD_ECONOMICA', 'ZONA_GEOGRAFICA',
      'DESTINO_RECURSOS_GR', 'PERFIL_TRANSACCIONAL'
    )
  ) THEN
    RAISE EXCEPTION 'Rollback bloqueado: un criterio de 007 ya es usado por matriz_criterio';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.matriz_empresa_version
    WHERE creada_por = principal_id OR validada_por = principal_id
       OR publicada_por = principal_id OR activada_por = principal_id
       OR desactivada_por = principal_id
  ) OR EXISTS (
    SELECT 1 FROM public.matriz_archivo_fuente WHERE cargado_por = principal_id
  ) OR EXISTS (
    SELECT 1 FROM public.matriz_auditoria_evento WHERE actor_usuario_id = principal_id
  ) OR EXISTS (
    SELECT 1 FROM public.matriz_idempotencia WHERE actor_usuario_id = principal_id
  ) OR EXISTS (
    SELECT 1 FROM public.catalogo_criterio_pt
    WHERE retirado_por = principal_id
       OR (creado_por = principal_id AND codigo_canonico NOT IN (
         'TIPO_PRODUCTO', 'NATURALEZA_PRODUCTO',
         'FRECUENCIA_PRODUCTO', 'DESTINO_RECURSOS_PT'
       ))
  ) OR EXISTS (
    SELECT 1
    FROM public.catalogo_criterio_pt_version v
    LEFT JOIN public.catalogo_criterio_pt c ON c.id = v.criterio_pt_id
    WHERE v.creado_por = principal_id
      AND (c.codigo_canonico IS NULL OR c.codigo_canonico NOT IN (
        'TIPO_PRODUCTO', 'NATURALEZA_PRODUCTO',
        'FRECUENCIA_PRODUCTO', 'DESTINO_RECURSOS_PT'
      ))
  ) OR EXISTS (
    SELECT 1 FROM public.catalogo_criterio_gr
    WHERE retirado_por = principal_id
       OR (creado_por = principal_id AND codigo_canonico NOT IN (
         'ACTIVIDAD_ECONOMICA', 'ZONA_GEOGRAFICA',
         'DESTINO_RECURSOS_GR', 'PERFIL_TRANSACCIONAL'
       ))
  ) OR EXISTS (
    SELECT 1
    FROM public.catalogo_criterio_gr_version v
    LEFT JOIN public.catalogo_criterio_gr c ON c.id = v.criterio_gr_id
    WHERE v.creado_por = principal_id
      AND (c.codigo_canonico IS NULL OR c.codigo_canonico NOT IN (
        'ACTIVIDAD_ECONOMICA', 'ZONA_GEOGRAFICA',
        'DESTINO_RECURSOS_GR', 'PERFIL_TRANSACCIONAL'
      ))
  ) THEN
    RAISE EXCEPTION 'Rollback bloqueado: PLD_SYSTEM ya fue usado fuera del seed 007';
  END IF;
END
$$;

UPDATE public.catalogo_criterio_pt
   SET version_vigente_id = NULL
 WHERE codigo_canonico IN (
   'TIPO_PRODUCTO',
   'NATURALEZA_PRODUCTO',
   'FRECUENCIA_PRODUCTO',
   'DESTINO_RECURSOS_PT'
 );

UPDATE public.catalogo_criterio_gr
   SET version_vigente_id = NULL
 WHERE codigo_canonico IN (
   'ACTIVIDAD_ECONOMICA',
   'ZONA_GEOGRAFICA',
   'DESTINO_RECURSOS_GR',
   'PERFIL_TRANSACCIONAL'
 );

ALTER TABLE public.catalogo_criterio_pt_version
  DISABLE TRIGGER trg_catalogo_criterio_pt_version_inmutable;
ALTER TABLE public.catalogo_criterio_gr_version
  DISABLE TRIGGER trg_catalogo_criterio_gr_version_inmutable;

DELETE FROM public.catalogo_criterio_pt_version v
USING public.catalogo_criterio_pt c
WHERE c.id = v.criterio_pt_id
  AND c.codigo_canonico IN (
    'TIPO_PRODUCTO',
    'NATURALEZA_PRODUCTO',
    'FRECUENCIA_PRODUCTO',
    'DESTINO_RECURSOS_PT'
  );

DELETE FROM public.catalogo_criterio_gr_version v
USING public.catalogo_criterio_gr c
WHERE c.id = v.criterio_gr_id
  AND c.codigo_canonico IN (
    'ACTIVIDAD_ECONOMICA',
    'ZONA_GEOGRAFICA',
    'DESTINO_RECURSOS_GR',
    'PERFIL_TRANSACCIONAL'
  );

ALTER TABLE public.catalogo_criterio_pt_version
  ENABLE TRIGGER trg_catalogo_criterio_pt_version_inmutable;
ALTER TABLE public.catalogo_criterio_gr_version
  ENABLE TRIGGER trg_catalogo_criterio_gr_version_inmutable;

DELETE FROM public.catalogo_criterio_pt
WHERE codigo_canonico IN (
  'TIPO_PRODUCTO',
  'NATURALEZA_PRODUCTO',
  'FRECUENCIA_PRODUCTO',
  'DESTINO_RECURSOS_PT'
);

DELETE FROM public.catalogo_criterio_gr
WHERE codigo_canonico IN (
  'ACTIVIDAD_ECONOMICA',
  'ZONA_GEOGRAFICA',
  'DESTINO_RECURSOS_GR',
  'PERFIL_TRANSACCIONAL'
);

DELETE FROM public.usuarios
WHERE codigo_principal = 'PLD_SYSTEM'
  AND tipo_principal = 'SISTEMA';

DELETE FROM public.schema_migrations
WHERE migration_key = '20260813_007_seed_principal_sistema_y_catalogos_matriz';

COMMIT;
