BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtext('20260820_015_monto_pt_v2')
);

DO $$
DECLARE
  principal_id INTEGER;
  monto_id INTEGER;
  monto_v1_id INTEGER;
  monto_v2_id INTEGER;
  unidad_attnum SMALLINT;
  constraint_expr TEXT;
  constraint_tests BOOLEAN[];
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Esquema invalido: se esperaba public';
  END IF;
  IF pg_catalog.to_regclass('public.schema_migrations') IS NULL
     OR pg_catalog.to_regclass('public.usuarios') IS NULL
     OR pg_catalog.to_regclass('public.catalogo_criterio_pt') IS NULL
     OR pg_catalog.to_regclass('public.catalogo_criterio_pt_version') IS NULL
     OR pg_catalog.to_regclass('public.matriz_rango') IS NULL THEN
    RAISE EXCEPTION 'Preflight fallido: faltan tablas requeridas por 015';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260820_014_catalogo_pt_v1'
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: se requiere la migracion 014';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260820_015_monto_pt_v2'
  ) THEN
    RAISE EXCEPTION 'La migracion 015 ya esta registrada';
  END IF;

  SELECT id INTO STRICT principal_id
  FROM public.usuarios
  WHERE codigo_principal = 'PLD_SYSTEM' AND tipo_principal = 'SISTEMA';

  SELECT c.id, v.id INTO STRICT monto_id, monto_v1_id
  FROM public.catalogo_criterio_pt c
  JOIN public.catalogo_criterio_pt_version v
    ON v.id = c.version_vigente_id AND v.criterio_pt_id = c.id
  WHERE c.codigo_canonico = 'MONTO'
    AND c.nombre_visible_global = 'Monto'
    AND c.estado = 'ACTIVO' AND c.retirado_en IS NULL
    AND v.version_contrato = 1
    AND v.tipo_resolucion = 'CAPTURA_OPCIONES'
    AND v.tipo_parametrizacion = 'OPCIONES'
    AND v.unidad_canonica IS NULL;

  IF EXISTS (
    SELECT 1 FROM public.catalogo_criterio_pt_version
    WHERE criterio_pt_id = monto_id AND version_contrato = 2
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: MONTO V2 ya existe';
  END IF;

  SELECT attnum INTO STRICT unidad_attnum
  FROM pg_catalog.pg_attribute
  WHERE attrelid = 'public.matriz_rango'::pg_catalog.regclass
    AND attname = 'unidad' AND NOT attisdropped;
  SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid)
  INTO STRICT constraint_expr
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.matriz_rango'::pg_catalog.regclass
    AND c.conname = 'ck_matriz_rango_unidad' AND c.contype = 'c'
    AND c.convalidated AND c.conkey = ARRAY[unidad_attnum]::SMALLINT[];
  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY orden) '
    'FROM (VALUES (1,''EDAD_ANIOS''::varchar),(2,''ANTIGUEDAD_MESES''::varchar),'
    '(3,''MONTO''::varchar),(4,''PUNTAJE''::varchar),(5,''OTRA''::varchar),'
    '(6,''UMA''::varchar),(7,''PESOS''::varchar),(8,''INVALIDA''::varchar)) '
    'AS matriz_rango(orden,unidad)',
    constraint_expr
  ) INTO constraint_tests;
  IF constraint_tests IS DISTINCT FROM
     ARRAY[TRUE,TRUE,TRUE,TRUE,TRUE,FALSE,FALSE,FALSE]::BOOLEAN[] THEN
    RAISE EXCEPTION 'Preflight fallido: dominio anterior de matriz_rango.unidad inesperado';
  END IF;

  ALTER TABLE public.matriz_rango DROP CONSTRAINT ck_matriz_rango_unidad;
  ALTER TABLE public.matriz_rango ADD CONSTRAINT ck_matriz_rango_unidad CHECK (
    unidad IN (
      'EDAD_ANIOS', 'ANTIGUEDAD_MESES', 'MONTO', 'PUNTAJE', 'OTRA', 'UMA', 'PESOS'
    )
  );

  INSERT INTO public.catalogo_criterio_pt_version (
    criterio_pt_id, version_contrato, tipo_resolucion,
    tipo_parametrizacion, unidad_canonica, creado_por
  ) VALUES (
    monto_id, 2, 'CAPTURA_RANGO_NUMERICO',
    'RANGOS_NUMERICOS', 'MONTO', principal_id
  ) RETURNING id INTO monto_v2_id;

  UPDATE public.catalogo_criterio_pt
  SET version_vigente_id = monto_v2_id
  WHERE id = monto_id AND version_vigente_id = monto_v1_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No fue posible activar MONTO V2';
  END IF;

  INSERT INTO public.schema_migrations (migration_key)
  VALUES ('20260820_015_monto_pt_v2');
END
$$;

COMMIT;
