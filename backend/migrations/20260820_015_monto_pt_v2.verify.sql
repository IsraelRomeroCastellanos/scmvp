BEGIN;
SET TRANSACTION READ ONLY;

DO $$
DECLARE
  monto_id INTEGER;
  unidad_attnum SMALLINT;
  constraint_expr TEXT;
  constraint_tests BOOLEAN[];
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public'
     OR pg_catalog.to_regclass('public.schema_migrations') IS NULL
     OR pg_catalog.to_regclass('public.catalogo_criterio_pt') IS NULL
     OR pg_catalog.to_regclass('public.catalogo_criterio_pt_version') IS NULL
     OR pg_catalog.to_regclass('public.matriz_rango') IS NULL THEN
    RAISE EXCEPTION 'VERIFY fallido: estructura requerida ausente';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260820_015_monto_pt_v2'
  ) THEN
    RAISE EXCEPTION 'VERIFY fallido: falta migration key 015';
  END IF;

  SELECT id INTO STRICT monto_id
  FROM public.catalogo_criterio_pt
  WHERE codigo_canonico = 'MONTO' AND nombre_visible_global = 'Monto'
    AND estado = 'ACTIVO' AND retirado_en IS NULL;

  IF (
    SELECT pg_catalog.count(*)
    FROM public.catalogo_criterio_pt_version
    WHERE criterio_pt_id = monto_id
  ) <> 2 THEN
    RAISE EXCEPTION 'VERIFY fallido: MONTO no tiene exactamente V1 y V2';
  END IF;
  IF (
    SELECT pg_catalog.count(*)
    FROM public.catalogo_criterio_pt_version
    WHERE criterio_pt_id = monto_id AND version_contrato = 1
      AND tipo_resolucion = 'CAPTURA_OPCIONES'
      AND tipo_parametrizacion = 'OPCIONES' AND unidad_canonica IS NULL
  ) <> 1 THEN
    RAISE EXCEPTION 'VERIFY fallido: MONTO V1 fue reinterpretada';
  END IF;
  IF (
    SELECT pg_catalog.count(*)
    FROM public.catalogo_criterio_pt c
    JOIN public.catalogo_criterio_pt_version v
      ON v.id = c.version_vigente_id AND v.criterio_pt_id = c.id
    WHERE c.id = monto_id AND v.version_contrato = 2
      AND v.tipo_resolucion = 'CAPTURA_RANGO_NUMERICO'
      AND v.tipo_parametrizacion = 'RANGOS_NUMERICOS'
      AND v.unidad_canonica = 'MONTO'
  ) <> 1 THEN
    RAISE EXCEPTION 'VERIFY fallido: MONTO V2 no es la version vigente exacta';
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
    RAISE EXCEPTION 'VERIFY fallido: dominio de matriz_rango.unidad incompatible';
  END IF;
END
$$;

ROLLBACK;
