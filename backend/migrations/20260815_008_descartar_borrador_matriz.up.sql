BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtext('20260815_008_descartar_borrador_matriz')
);

DO $$
DECLARE
  required_key TEXT;
  constraint_expression TEXT;
  accepted BOOLEAN[];
  pending_predicate TEXT;
  active_predicate TEXT;
BEGIN
  IF current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Esquema invalido: se esperaba public y se obtuvo %', current_schema();
  END IF;

  IF pg_catalog.to_regclass('public.schema_migrations') IS NULL
     OR pg_catalog.to_regclass('public.matriz_empresa_version') IS NULL
     OR pg_catalog.to_regclass('public.matriz_auditoria_evento') IS NULL THEN
    RAISE EXCEPTION 'Preflight fallido: faltan tablas requeridas';
  END IF;

  FOREACH required_key IN ARRAY ARRAY[
    '20260728_001_modelo_integral_actividades_vulnerables',
    '20260801_002_matrices_pt_gr_empresa',
    '20260805_003_gestion_matrices_empresa',
    '20260810_004_resultados_globales_matriz',
    '20260812_005_catalogos_canonicos_matriz',
    '20260813_006_principales_tecnicos_usuarios',
    '20260813_007_seed_principal_sistema_y_catalogos_matriz'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.schema_migrations sm WHERE sm.migration_key = required_key
    ) THEN
      RAISE EXCEPTION 'Dependencia faltante: %', required_key;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260815_008_descartar_borrador_matriz'
  ) THEN
    RAISE EXCEPTION 'La migracion 20260815_008_descartar_borrador_matriz ya esta registrada';
  END IF;

  SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid)
    INTO constraint_expression
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public'
     AND t.relname = 'matriz_empresa_version'
     AND c.conname = 'ck_matriz_empresa_version_estado'
     AND c.contype = 'c'
     AND c.convalidated
     AND NOT c.condeferrable
     AND c.conkey = ARRAY[
       (SELECT a.attnum FROM pg_catalog.pg_attribute a
         WHERE a.attrelid = c.conrelid AND a.attname = 'estado_editorial'
           AND a.attnum > 0 AND NOT a.attisdropped)
     ]::SMALLINT[];
  IF constraint_expression IS NULL THEN
    RAISE EXCEPTION 'Preflight fallido: ck_matriz_empresa_version_estado incompatible';
  END IF;
  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY orden) '
    'FROM (VALUES (1,''BORRADOR''::varchar(20)),(2,''VALIDADA''::varchar(20)),'
    '(3,''PUBLICADA''::varchar(20)),(4,''DESCARTADA''::varchar(20)),'
    '(5,''__INVALIDO_008__''::varchar(20))) AS matriz_empresa_version(orden,estado_editorial)',
    constraint_expression
  ) INTO accepted;
  IF accepted IS DISTINCT FROM ARRAY[true,true,true,false,false] THEN
    RAISE EXCEPTION 'Preflight fallido: semantica historica de ck_matriz_empresa_version_estado incompatible';
  END IF;

  SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid)
    INTO constraint_expression
    FROM pg_catalog.pg_constraint c
   WHERE c.conrelid = 'public.matriz_empresa_version'::pg_catalog.regclass
     AND c.conname = 'ck_matriz_empresa_version_activa_publicada'
     AND c.contype = 'c' AND c.convalidated AND NOT c.condeferrable;
  IF constraint_expression IS NULL THEN
    RAISE EXCEPTION 'Preflight fallido: ck_matriz_empresa_version_activa_publicada incompatible';
  END IF;
  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY orden) FROM (VALUES '
    '(1,''BORRADOR''::varchar(20),FALSE),(2,''VALIDADA''::varchar(20),FALSE),'
    '(3,''PUBLICADA''::varchar(20),TRUE),(4,''BORRADOR''::varchar(20),TRUE)) '
    'AS matriz_empresa_version(orden,estado_editorial,activa)', constraint_expression
  ) INTO accepted;
  IF accepted IS DISTINCT FROM ARRAY[true,true,true,false] THEN
    RAISE EXCEPTION 'Preflight fallido: semantica activa/publicada incompatible';
  END IF;

  SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid)
    INTO constraint_expression
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public'
     AND t.relname = 'matriz_auditoria_evento'
     AND c.conname = 'ck_matriz_auditoria_evento_estados'
     AND c.contype = 'c'
     AND c.convalidated
     AND NOT c.condeferrable
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
    RAISE EXCEPTION 'Preflight fallido: ck_matriz_auditoria_evento_estados incompatible';
  END IF;
  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY orden) FROM (VALUES '
    '(1,''BORRADOR''::varchar(20),''VALIDADA''::varchar(20)),'
    '(2,''VALIDADA''::varchar(20),''PUBLICADA''::varchar(20)),'
    '(3,NULL::varchar(20),NULL::varchar(20)),'
    '(4,''DESCARTADA''::varchar(20),NULL::varchar(20)),'
    '(5,NULL::varchar(20),''DESCARTADA''::varchar(20)),'
    '(6,''__INVALIDO_008__''::varchar(20),NULL::varchar(20)),'
    '(7,NULL::varchar(20),''__INVALIDO_008__''::varchar(20))) '
    'AS matriz_auditoria_evento(orden,estado_anterior,estado_nuevo)',
    constraint_expression
  ) INTO accepted;
  IF accepted IS DISTINCT FROM ARRAY[true,true,true,false,false,false,false] THEN
    RAISE EXCEPTION 'Preflight fallido: semantica historica de ck_matriz_auditoria_evento_estados incompatible';
  END IF;

  SELECT pg_catalog.pg_get_expr(i.indpred, i.indrelid)
    INTO pending_predicate
    FROM pg_catalog.pg_index i
    JOIN pg_catalog.pg_class x ON x.oid = i.indexrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = x.relnamespace
    JOIN pg_catalog.pg_attribute a
      ON a.attrelid = i.indrelid
     AND a.attnum = (i.indkey::SMALLINT[])[
       pg_catalog.array_lower(i.indkey::SMALLINT[], 1)
     ]
     AND a.attnum > 0
     AND NOT a.attisdropped
   WHERE n.nspname = 'public'
     AND x.relname = 'uq_matriz_empresa_version_pendiente_empresa'
     AND i.indrelid = 'public.matriz_empresa_version'::pg_catalog.regclass
     AND i.indisunique AND i.indisvalid AND i.indisready
     AND i.indpred IS NOT NULL AND i.indnkeyatts = 1 AND i.indnatts = 1
     AND a.attname = 'empresa_id';
  IF pending_predicate IS NULL THEN
    RAISE EXCEPTION 'Preflight fallido: indice unico de pendiente incompatible';
  END IF;
  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.array_agg((%s) IS TRUE ORDER BY orden) FROM (VALUES '
    '(1,''BORRADOR''::varchar(20)),(2,''VALIDADA''::varchar(20)),'
    '(3,''PUBLICADA''::varchar(20)),(4,''DESCARTADA''::varchar(20))) '
    'AS matriz_empresa_version(orden,estado_editorial)', pending_predicate
  ) INTO accepted;
  IF accepted IS DISTINCT FROM ARRAY[true,true,false,false] THEN
    RAISE EXCEPTION 'Preflight fallido: semantica del indice de pendiente incompatible';
  END IF;

  SELECT pg_catalog.pg_get_expr(i.indpred, i.indrelid)
    INTO active_predicate
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
     AND i.indpred IS NOT NULL AND i.indnkeyatts = 1 AND i.indnatts = 1
     AND a.attname = 'empresa_id';
  IF active_predicate IS NULL THEN
    RAISE EXCEPTION 'Preflight fallido: indice unico de activa incompatible';
  END IF;
  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.array_agg((%s) IS TRUE ORDER BY orden) FROM (VALUES '
    '(1,TRUE),(2,FALSE),(3,NULL::boolean)) AS matriz_empresa_version(orden,activa)',
    active_predicate
  ) INTO accepted;
  IF accepted IS DISTINCT FROM ARRAY[true,false,false] THEN
    RAISE EXCEPTION 'Preflight fallido: predicado del indice de activa incompatible';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger tr
     WHERE tr.tgrelid = 'public.matriz_auditoria_evento'::pg_catalog.regclass
       AND tr.tgname = 'trg_matriz_auditoria_append_only'
       AND NOT tr.tgisinternal AND tr.tgenabled = 'O' AND tr.tgtype = 58
       AND tr.tgnargs = 0
       AND tr.tgfoid = pg_catalog.to_regprocedure('public.fn_matriz_auditoria_append_only()')
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: trigger append-only ausente o incompatible';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.matriz_empresa_version
     WHERE estado_editorial NOT IN ('BORRADOR','VALIDADA','PUBLICADA')
        OR (estado_editorial <> 'PUBLICADA' AND activa)
  ) OR EXISTS (
    SELECT empresa_id FROM public.matriz_empresa_version
     WHERE estado_editorial IN ('BORRADOR','VALIDADA')
     GROUP BY empresa_id HAVING pg_catalog.count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: datos editoriales incompatibles';
  END IF;
END
$$;

ALTER TABLE public.matriz_empresa_version
  DROP CONSTRAINT ck_matriz_empresa_version_estado,
  ADD CONSTRAINT ck_matriz_empresa_version_estado
    CHECK (estado_editorial IN ('BORRADOR', 'VALIDADA', 'PUBLICADA', 'DESCARTADA'));

ALTER TABLE public.matriz_auditoria_evento
  DROP CONSTRAINT ck_matriz_auditoria_evento_estados,
  ADD CONSTRAINT ck_matriz_auditoria_evento_estados CHECK (
    (estado_anterior IS NULL OR estado_anterior IN ('BORRADOR', 'VALIDADA', 'PUBLICADA', 'DESCARTADA'))
    AND (estado_nuevo IS NULL OR estado_nuevo IN ('BORRADOR', 'VALIDADA', 'PUBLICADA', 'DESCARTADA'))
  );

INSERT INTO public.schema_migrations (migration_key)
VALUES ('20260815_008_descartar_borrador_matriz');

COMMIT;
