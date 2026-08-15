BEGIN;
SET TRANSACTION READ ONLY;

SELECT current_database() AS current_database,
       current_schema() AS current_schema,
       current_user AS current_user,
       current_setting('server_version') AS server_version;

DO $$
DECLARE
  constraint_expression TEXT;
  predicate_expression TEXT;
  active_predicate TEXT;
  accepted BOOLEAN[];
  index_column TEXT;
BEGIN
  IF current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'VERIFY fallido: se esperaba el esquema public';
  END IF;

  IF pg_catalog.to_regclass('public.schema_migrations') IS NULL
     OR pg_catalog.to_regclass('public.matriz_empresa_version') IS NULL
     OR pg_catalog.to_regclass('public.matriz_auditoria_evento') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.schema_migrations
       WHERE migration_key = '20260815_008_descartar_borrador_matriz'
     ) THEN
    RAISE EXCEPTION 'VERIFY fallido: faltan tablas o migration key 008';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_attribute a
     WHERE a.attrelid = 'public.matriz_empresa_version'::pg_catalog.regclass
       AND a.attname = 'estado_editorial'
       AND a.atttypid = 'pg_catalog.varchar'::pg_catalog.regtype
       AND a.atttypmod = 24
       AND a.attnotnull AND a.attnum > 0 AND NOT a.attisdropped
  ) THEN
    RAISE EXCEPTION 'VERIFY fallido: estado_editorial no es varchar(20) NOT NULL';
  END IF;

  SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid)
    INTO constraint_expression
    FROM pg_catalog.pg_constraint c
   WHERE c.conrelid = 'public.matriz_empresa_version'::pg_catalog.regclass
     AND c.conname = 'ck_matriz_empresa_version_estado'
     AND c.contype = 'c' AND c.convalidated AND NOT c.condeferrable
     AND c.conkey = ARRAY[
       (SELECT a.attnum FROM pg_catalog.pg_attribute a
         WHERE a.attrelid = c.conrelid AND a.attname = 'estado_editorial'
           AND a.attnum > 0 AND NOT a.attisdropped)
     ]::SMALLINT[];
  IF constraint_expression IS NULL THEN
    RAISE EXCEPTION 'VERIFY fallido: CHECK editorial ausente o incompatible';
  END IF;
  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY orden) FROM (VALUES '
    '(1,''BORRADOR''::varchar(20)),(2,''VALIDADA''::varchar(20)),'
    '(3,''PUBLICADA''::varchar(20)),(4,''DESCARTADA''::varchar(20)),'
    '(5,''__INVALIDO_008__''::varchar(20))) '
    'AS matriz_empresa_version(orden,estado_editorial)', constraint_expression
  ) INTO accepted;
  IF accepted IS DISTINCT FROM ARRAY[true,true,true,true,false] THEN
    RAISE EXCEPTION 'VERIFY fallido: semantica del CHECK editorial incompatible';
  END IF;

  SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid)
    INTO constraint_expression
    FROM pg_catalog.pg_constraint c
   WHERE c.conrelid = 'public.matriz_auditoria_evento'::pg_catalog.regclass
     AND c.conname = 'ck_matriz_auditoria_evento_estados'
     AND c.contype = 'c' AND c.convalidated AND NOT c.condeferrable
     AND c.conkey @> ARRAY[
       (SELECT a.attnum FROM pg_catalog.pg_attribute a
         WHERE a.attrelid = c.conrelid AND a.attname = 'estado_anterior')
     ]::SMALLINT[]
     AND c.conkey @> ARRAY[
       (SELECT a.attnum FROM pg_catalog.pg_attribute a
         WHERE a.attrelid = c.conrelid AND a.attname = 'estado_nuevo')
     ]::SMALLINT[]
     AND pg_catalog.cardinality(c.conkey) = 2;
  IF constraint_expression IS NULL THEN
    RAISE EXCEPTION 'VERIFY fallido: CHECK de estados de auditoria ausente o incompatible';
  END IF;
  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY orden) FROM (VALUES '
    '(1,''BORRADOR''::varchar(20),''DESCARTADA''::varchar(20)),'
    '(2,''VALIDADA''::varchar(20),''PUBLICADA''::varchar(20)),'
    '(3,''PUBLICADA''::varchar(20),''BORRADOR''::varchar(20)),'
    '(4,''DESCARTADA''::varchar(20),''DESCARTADA''::varchar(20)),'
    '(5,NULL::varchar(20),NULL::varchar(20)),'
    '(6,''__INVALIDO_008__''::varchar(20),NULL::varchar(20)),'
    '(7,NULL::varchar(20),''__INVALIDO_008__''::varchar(20))) '
    'AS matriz_auditoria_evento(orden,estado_anterior,estado_nuevo)', constraint_expression
  ) INTO accepted;
  IF accepted IS DISTINCT FROM ARRAY[true,true,true,true,true,false,false] THEN
    RAISE EXCEPTION 'VERIFY fallido: semantica del CHECK de auditoria incompatible';
  END IF;

  SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid)
    INTO constraint_expression
    FROM pg_catalog.pg_constraint c
   WHERE c.conrelid = 'public.matriz_empresa_version'::pg_catalog.regclass
     AND c.conname = 'ck_matriz_empresa_version_activa_publicada'
     AND c.contype = 'c' AND c.convalidated;
  IF constraint_expression IS NULL THEN
    RAISE EXCEPTION 'VERIFY fallido: CHECK activa/publicada ausente';
  END IF;
  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY orden) FROM (VALUES '
    '(1,''DESCARTADA''::varchar(20),FALSE),(2,''DESCARTADA''::varchar(20),TRUE),'
    '(3,''PUBLICADA''::varchar(20),TRUE)) '
    'AS matriz_empresa_version(orden,estado_editorial,activa)', constraint_expression
  ) INTO accepted;
  IF accepted IS DISTINCT FROM ARRAY[true,false,true] THEN
    RAISE EXCEPTION 'VERIFY fallido: semantica activa/publicada incompatible';
  END IF;

  SELECT pg_catalog.pg_get_expr(i.indpred, i.indrelid), a.attname::TEXT
    INTO predicate_expression, index_column
    FROM pg_catalog.pg_index i
    JOIN pg_catalog.pg_class x ON x.oid = i.indexrelid
    JOIN pg_catalog.pg_attribute a
      ON a.attrelid = i.indrelid
     AND a.attnum = (i.indkey::SMALLINT[])[
       pg_catalog.array_lower(i.indkey::SMALLINT[], 1)
     ]
     AND a.attnum > 0
     AND NOT a.attisdropped
   WHERE x.oid = 'public.uq_matriz_empresa_version_pendiente_empresa'::pg_catalog.regclass
     AND i.indrelid = 'public.matriz_empresa_version'::pg_catalog.regclass
     AND i.indisunique AND i.indisvalid AND i.indisready
     AND i.indpred IS NOT NULL AND i.indnkeyatts = 1 AND i.indnatts = 1;
  IF predicate_expression IS NULL OR index_column IS DISTINCT FROM 'empresa_id' THEN
    RAISE EXCEPTION 'VERIFY fallido: indice de pendiente incompatible';
  END IF;
  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.array_agg((%s) IS TRUE ORDER BY orden) FROM (VALUES '
    '(1,''BORRADOR''::varchar(20)),(2,''VALIDADA''::varchar(20)),'
    '(3,''PUBLICADA''::varchar(20)),(4,''DESCARTADA''::varchar(20))) '
    'AS matriz_empresa_version(orden,estado_editorial)', predicate_expression
  ) INTO accepted;
  IF accepted IS DISTINCT FROM ARRAY[true,true,false,false] THEN
    RAISE EXCEPTION 'VERIFY fallido: predicado de pendiente incompatible';
  END IF;

  SELECT pg_catalog.pg_get_expr(i.indpred, i.indrelid), a.attname::TEXT
    INTO active_predicate, index_column
    FROM pg_catalog.pg_index i
    JOIN pg_catalog.pg_class x ON x.oid = i.indexrelid
    JOIN pg_catalog.pg_attribute a
      ON a.attrelid = i.indrelid
     AND a.attnum = (i.indkey::SMALLINT[])[
       pg_catalog.array_lower(i.indkey::SMALLINT[], 1)
     ]
     AND a.attnum > 0
     AND NOT a.attisdropped
   WHERE x.oid = 'public.uq_matriz_empresa_version_activa_empresa'::pg_catalog.regclass
     AND i.indrelid = 'public.matriz_empresa_version'::pg_catalog.regclass
     AND i.indisunique AND i.indisvalid AND i.indisready
     AND i.indpred IS NOT NULL AND i.indnkeyatts = 1 AND i.indnatts = 1;
  IF active_predicate IS NULL OR index_column IS DISTINCT FROM 'empresa_id' THEN
    RAISE EXCEPTION 'VERIFY fallido: unicidad de matriz activa ausente';
  END IF;
  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.array_agg((%s) IS TRUE ORDER BY orden) FROM (VALUES '
    '(1,TRUE),(2,FALSE),(3,NULL::boolean)) AS matriz_empresa_version(orden,activa)',
    active_predicate
  ) INTO accepted;
  IF accepted IS DISTINCT FROM ARRAY[true,false,false] THEN
    RAISE EXCEPTION 'VERIFY fallido: predicado de matriz activa incompatible';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger tr
     WHERE tr.tgrelid = 'public.matriz_auditoria_evento'::pg_catalog.regclass
       AND tr.tgname = 'trg_matriz_auditoria_append_only'
       AND NOT tr.tgisinternal AND tr.tgenabled = 'O' AND tr.tgtype = 58
       AND tr.tgnargs = 0
       AND tr.tgfoid = pg_catalog.to_regprocedure('public.fn_matriz_auditoria_append_only()')
  ) THEN
    RAISE EXCEPTION 'VERIFY fallido: trigger append-only ausente o deshabilitado';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.matriz_empresa_version
     WHERE estado_editorial = 'DESCARTADA' AND activa
  ) OR EXISTS (
    SELECT empresa_id FROM public.matriz_empresa_version
     WHERE estado_editorial IN ('BORRADOR','VALIDADA')
     GROUP BY empresa_id HAVING pg_catalog.count(*) > 1
  ) THEN
    RAISE EXCEPTION 'VERIFY fallido: datos editoriales incoherentes';
  END IF;
END
$$;

SELECT migration_key FROM public.schema_migrations
WHERE migration_key = '20260815_008_descartar_borrador_matriz';

COMMIT;
