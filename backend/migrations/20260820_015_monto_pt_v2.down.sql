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
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public'
     OR pg_catalog.to_regclass('public.schema_migrations') IS NULL
     OR pg_catalog.to_regclass('public.usuarios') IS NULL
     OR pg_catalog.to_regclass('public.catalogo_criterio_pt') IS NULL
     OR pg_catalog.to_regclass('public.catalogo_criterio_pt_version') IS NULL
     OR pg_catalog.to_regclass('public.matriz_criterio') IS NULL
     OR pg_catalog.to_regclass('public.matriz_rango') IS NULL THEN
    RAISE EXCEPTION 'DOWN no aplicable: estructura requerida ausente';
  END IF;

  SELECT id INTO STRICT principal_id
  FROM public.usuarios
  WHERE codigo_principal = 'PLD_SYSTEM' AND tipo_principal = 'SISTEMA';
  IF NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260820_015_monto_pt_v2'
  ) THEN
    RAISE EXCEPTION 'DOWN no aplicable: falta migration key 015';
  END IF;

  SELECT id INTO STRICT monto_id
  FROM public.catalogo_criterio_pt
  WHERE codigo_canonico = 'MONTO' AND nombre_visible_global = 'Monto'
    AND estado = 'ACTIVO' AND retirado_en IS NULL;
  SELECT id INTO STRICT monto_v1_id
  FROM public.catalogo_criterio_pt_version
  WHERE criterio_pt_id = monto_id AND version_contrato = 1
    AND tipo_resolucion = 'CAPTURA_OPCIONES'
    AND tipo_parametrizacion = 'OPCIONES' AND unidad_canonica IS NULL;
  SELECT id INTO STRICT monto_v2_id
  FROM public.catalogo_criterio_pt_version
  WHERE criterio_pt_id = monto_id AND version_contrato = 2
    AND tipo_resolucion = 'CAPTURA_RANGO_NUMERICO'
    AND tipo_parametrizacion = 'RANGOS_NUMERICOS'
    AND unidad_canonica = 'MONTO' AND creado_por = principal_id;

  IF (
    SELECT pg_catalog.count(*) FROM public.catalogo_criterio_pt_version
    WHERE criterio_pt_id = monto_id
  ) <> 2 THEN
    RAISE EXCEPTION 'DOWN bloqueado: el historial de versiones MONTO fue alterado';
  END IF;

  IF (SELECT version_vigente_id FROM public.catalogo_criterio_pt WHERE id = monto_id)
     IS DISTINCT FROM monto_v2_id THEN
    RAISE EXCEPTION 'DOWN bloqueado: MONTO V2 ya no es la version vigente';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.matriz_criterio
    WHERE catalogo_criterio_pt_version_id = monto_v2_id
  ) THEN
    RAISE EXCEPTION 'DOWN bloqueado: MONTO V2 ya es usada por matrices';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.matriz_rango WHERE unidad IN ('UMA', 'PESOS')
  ) THEN
    RAISE EXCEPTION 'DOWN bloqueado: existen rangos con unidad UMA o PESOS';
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
     ARRAY[TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,FALSE]::BOOLEAN[] THEN
    RAISE EXCEPTION 'DOWN bloqueado: dominio de matriz_rango.unidad alterado';
  END IF;

  UPDATE public.catalogo_criterio_pt
  SET version_vigente_id = monto_v1_id
  WHERE id = monto_id;

  ALTER TABLE public.catalogo_criterio_pt_version
    DISABLE TRIGGER trg_catalogo_criterio_pt_version_inmutable;
  DELETE FROM public.catalogo_criterio_pt_version WHERE id = monto_v2_id;
  ALTER TABLE public.catalogo_criterio_pt_version
    ENABLE TRIGGER trg_catalogo_criterio_pt_version_inmutable;

  ALTER TABLE public.matriz_rango DROP CONSTRAINT ck_matriz_rango_unidad;
  ALTER TABLE public.matriz_rango ADD CONSTRAINT ck_matriz_rango_unidad CHECK (
    unidad IN ('EDAD_ANIOS', 'ANTIGUEDAD_MESES', 'MONTO', 'PUNTAJE', 'OTRA')
  );

  DELETE FROM public.schema_migrations
  WHERE migration_key = '20260820_015_monto_pt_v2';
END
$$;

COMMIT;
