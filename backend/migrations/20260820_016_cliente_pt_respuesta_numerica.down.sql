BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtext('20260820_016_cliente_pt_respuesta_numerica')
);

DO $$
DECLARE
  tipo_expr TEXT;
  tipo_tests BOOLEAN[];
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public'
     OR pg_catalog.to_regclass('public.cliente_pt_respuesta') IS NULL
     OR pg_catalog.to_regclass('public.matriz_rango') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.schema_migrations
       WHERE migration_key='20260820_016_cliente_pt_respuesta_numerica'
     ) THEN
    RAISE EXCEPTION 'DOWN no aplicable: estructura o migration key ausente';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.cliente_pt_respuesta
    WHERE matriz_rango_id IS NOT NULL OR valor_numerico IS NOT NULL OR unidad IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'DOWN bloqueado: existen respuestas numericas PT';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.cliente_pt_respuesta WHERE matriz_opcion_id IS NULL
  ) THEN
    RAISE EXCEPTION 'DOWN bloqueado: existen respuestas sin opcion historica';
  END IF;

  IF (
    SELECT pg_catalog.count(*)
    FROM (VALUES
      ('matriz_opcion_id','pg_catalog.int4'::pg_catalog.regtype,-1,false),
      ('matriz_rango_id','pg_catalog.int4'::pg_catalog.regtype,-1,false),
      ('valor_numerico','pg_catalog.numeric'::pg_catalog.regtype,-1,false),
      ('unidad','pg_catalog.varchar'::pg_catalog.regtype,34,false)
    ) expected(nombre,tipo,typmod,no_nula)
    JOIN pg_catalog.pg_attribute a
      ON a.attrelid='public.cliente_pt_respuesta'::pg_catalog.regclass
     AND a.attname=expected.nombre AND a.attnum>0 AND NOT a.attisdropped
     AND a.atttypid=expected.tipo AND a.atttypmod=expected.typmod
     AND a.attnotnull=expected.no_nula
  ) <> 4 THEN
    RAISE EXCEPTION 'DOWN bloqueado: columnas de 016 alteradas';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid='public.matriz_rango'::pg_catalog.regclass
      AND c.conname='uq_matriz_rango_id_criterio_puntaje_unidad_pt'
      AND c.contype='u' AND c.convalidated
      AND c.conkey=ARRAY[
        (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=c.conrelid AND attname='id'),
        (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=c.conrelid AND attname='criterio_id'),
        (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=c.conrelid AND attname='puntaje'),
        (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=c.conrelid AND attname='unidad')
      ]::SMALLINT[]
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid='public.cliente_pt_respuesta'::pg_catalog.regclass
      AND c.conname='fk_cliente_pt_respuesta_rango_criterio_puntaje_unidad'
      AND c.contype='f' AND c.confrelid='public.matriz_rango'::pg_catalog.regclass
      AND c.convalidated AND c.confupdtype='a' AND c.confdeltype='r' AND c.confmatchtype='s'
      AND c.conkey=ARRAY[
        (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=c.conrelid AND attname='matriz_rango_id'),
        (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=c.conrelid AND attname='matriz_criterio_id'),
        (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=c.conrelid AND attname='puntaje'),
        (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=c.conrelid AND attname='unidad')
      ]::SMALLINT[]
      AND c.confkey=ARRAY[
        (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=c.confrelid AND attname='id'),
        (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=c.confrelid AND attname='criterio_id'),
        (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=c.confrelid AND attname='puntaje'),
        (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=c.confrelid AND attname='unidad')
      ]::SMALLINT[]
  ) THEN
    RAISE EXCEPTION 'DOWN bloqueado: UNIQUE o FK de 016 alterados';
  END IF;

  SELECT pg_catalog.pg_get_expr(c.conbin,c.conrelid) INTO STRICT tipo_expr
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid='public.cliente_pt_respuesta'::pg_catalog.regclass
    AND c.conname='ck_cliente_pt_respuesta_tipo' AND c.contype='c' AND c.convalidated;
  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY prueba) FROM (VALUES '
    '(1,1::int,NULL::int,NULL::numeric,NULL::varchar),'
    '(2,NULL::int,1::int,10.5::numeric,''UMA''::varchar),'
    '(3,NULL::int,1::int,10.5::numeric,''PESOS''::varchar),'
    '(4,1::int,1::int,10.5::numeric,''UMA''::varchar),'
    '(5,NULL::int,NULL::int,NULL::numeric,NULL::varchar),'
    '(6,NULL::int,1::int,''NaN''::numeric,''UMA''::varchar),'
    '(7,NULL::int,1::int,''Infinity''::numeric,''UMA''::varchar),'
    '(8,NULL::int,1::int,''-Infinity''::numeric,''UMA''::varchar)) '
    'AS cliente_pt_respuesta(prueba,matriz_opcion_id,matriz_rango_id,valor_numerico,unidad)',
    tipo_expr
  ) INTO tipo_tests;
  IF tipo_tests IS DISTINCT FROM
     ARRAY[TRUE,TRUE,TRUE,FALSE,FALSE,FALSE,FALSE,FALSE]::BOOLEAN[] THEN
    RAISE EXCEPTION 'DOWN bloqueado: CHECK de exclusividad alterado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_index i
    JOIN pg_catalog.pg_class x ON x.oid=i.indexrelid
    WHERE i.indrelid='public.cliente_pt_respuesta'::pg_catalog.regclass
      AND x.relnamespace='public'::pg_catalog.regnamespace
      AND x.relname='idx_cliente_pt_respuesta_rango'
      AND i.indisvalid AND i.indisready AND NOT i.indisunique AND NOT i.indisprimary
      AND i.indnkeyatts=1 AND i.indnatts=1
      AND i.indpred IS NULL AND i.indexprs IS NULL
      AND (i.indkey::SMALLINT[])[0]=(SELECT attnum FROM pg_catalog.pg_attribute
        WHERE attrelid=i.indrelid AND attname='matriz_rango_id')
  ) OR pg_catalog.to_regprocedure('public.validar_cliente_pt_respuesta_rango()') IS NULL
     OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    WHERE p.oid=pg_catalog.to_regprocedure('public.validar_cliente_pt_respuesta_rango()')
      AND p.pronamespace='public'::pg_catalog.regnamespace
      AND p.pronargs=0 AND p.prorettype='pg_catalog.trigger'::pg_catalog.regtype
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger t
    WHERE t.tgrelid='public.cliente_pt_respuesta'::pg_catalog.regclass
      AND t.tgname='trg_cliente_pt_respuesta_rango' AND NOT t.tgisinternal
      AND t.tgenabled='O' AND t.tgtype=23
      AND t.tgfoid=pg_catalog.to_regprocedure('public.validar_cliente_pt_respuesta_rango()')
      AND t.tgattr::SMALLINT[]=ARRAY[
        (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=t.tgrelid AND attname='matriz_rango_id'),
        (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=t.tgrelid AND attname='matriz_criterio_id'),
        (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=t.tgrelid AND attname='puntaje'),
        (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=t.tgrelid AND attname='unidad'),
        (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=t.tgrelid AND attname='valor_numerico')
      ]::SMALLINT[]
  ) THEN
    RAISE EXCEPTION 'DOWN bloqueado: indice, funcion o trigger de 016 alterados';
  END IF;
END
$$;

DROP TRIGGER trg_cliente_pt_respuesta_rango ON public.cliente_pt_respuesta;
DROP FUNCTION public.validar_cliente_pt_respuesta_rango();
DROP INDEX public.idx_cliente_pt_respuesta_rango;

ALTER TABLE public.cliente_pt_respuesta
  DROP CONSTRAINT fk_cliente_pt_respuesta_rango_criterio_puntaje_unidad,
  DROP CONSTRAINT ck_cliente_pt_respuesta_tipo,
  ALTER COLUMN matriz_opcion_id SET NOT NULL,
  DROP COLUMN matriz_rango_id,
  DROP COLUMN valor_numerico,
  DROP COLUMN unidad;

ALTER TABLE public.matriz_rango
  DROP CONSTRAINT uq_matriz_rango_id_criterio_puntaje_unidad_pt;

DELETE FROM public.schema_migrations
WHERE migration_key='20260820_016_cliente_pt_respuesta_numerica';

COMMIT;
