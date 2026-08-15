BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtext('20260815_008_descartar_borrador_matriz')
);

DO $$
DECLARE
  constraint_expression TEXT;
  accepted BOOLEAN[];
BEGIN
  IF current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Rollback no aplicable: se esperaba el esquema public';
  END IF;
  IF pg_catalog.to_regclass('public.schema_migrations') IS NULL
     OR pg_catalog.to_regclass('public.matriz_empresa_version') IS NULL
     OR pg_catalog.to_regclass('public.matriz_auditoria_evento') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.schema_migrations
       WHERE migration_key = '20260815_008_descartar_borrador_matriz'
     ) THEN
    RAISE EXCEPTION 'Rollback no aplicable: faltan tablas o migration key 008';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.matriz_empresa_version WHERE estado_editorial = 'DESCARTADA'
  ) OR EXISTS (
    SELECT 1 FROM public.matriz_auditoria_evento
     WHERE estado_anterior = 'DESCARTADA' OR estado_nuevo = 'DESCARTADA'
  ) THEN
    RAISE EXCEPTION 'Rollback bloqueado: existe historia DESCARTADA';
  END IF;

  SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid)
    INTO constraint_expression
    FROM pg_catalog.pg_constraint c
   WHERE c.conrelid = 'public.matriz_empresa_version'::pg_catalog.regclass
     AND c.conname = 'ck_matriz_empresa_version_estado'
     AND c.contype = 'c' AND c.convalidated AND NOT c.condeferrable;
  IF constraint_expression IS NULL THEN
    RAISE EXCEPTION 'Rollback no aplicable: CHECK editorial ausente';
  END IF;
  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY orden) FROM (VALUES '
    '(1,''BORRADOR''::varchar(20)),(2,''VALIDADA''::varchar(20)),'
    '(3,''PUBLICADA''::varchar(20)),(4,''DESCARTADA''::varchar(20)),'
    '(5,''__INVALIDO_008__''::varchar(20))) '
    'AS matriz_empresa_version(orden,estado_editorial)', constraint_expression
  ) INTO accepted;
  IF accepted IS DISTINCT FROM ARRAY[true,true,true,true,false] THEN
    RAISE EXCEPTION 'Rollback no aplicable: semantica del CHECK editorial incompatible';
  END IF;

  SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid)
    INTO constraint_expression
    FROM pg_catalog.pg_constraint c
   WHERE c.conrelid = 'public.matriz_auditoria_evento'::pg_catalog.regclass
     AND c.conname = 'ck_matriz_auditoria_evento_estados'
     AND c.contype = 'c' AND c.convalidated AND NOT c.condeferrable;
  IF constraint_expression IS NULL THEN
    RAISE EXCEPTION 'Rollback no aplicable: CHECK de auditoria ausente';
  END IF;
  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY orden) FROM (VALUES '
    '(1,''BORRADOR''::varchar(20),''DESCARTADA''::varchar(20)),'
    '(2,''DESCARTADA''::varchar(20),NULL::varchar(20)),'
    '(3,NULL::varchar(20),NULL::varchar(20)),'
    '(4,''__INVALIDO_008__''::varchar(20),NULL::varchar(20)),'
    '(5,NULL::varchar(20),''__INVALIDO_008__''::varchar(20))) '
    'AS matriz_auditoria_evento(orden,estado_anterior,estado_nuevo)', constraint_expression
  ) INTO accepted;
  IF accepted IS DISTINCT FROM ARRAY[true,true,true,false,false] THEN
    RAISE EXCEPTION 'Rollback no aplicable: semantica del CHECK de auditoria incompatible';
  END IF;
END
$$;

ALTER TABLE public.matriz_empresa_version
  DROP CONSTRAINT ck_matriz_empresa_version_estado,
  ADD CONSTRAINT ck_matriz_empresa_version_estado
    CHECK (estado_editorial IN ('BORRADOR', 'VALIDADA', 'PUBLICADA'));

ALTER TABLE public.matriz_auditoria_evento
  DROP CONSTRAINT ck_matriz_auditoria_evento_estados,
  ADD CONSTRAINT ck_matriz_auditoria_evento_estados CHECK (
    (estado_anterior IS NULL OR estado_anterior IN ('BORRADOR', 'VALIDADA', 'PUBLICADA'))
    AND (estado_nuevo IS NULL OR estado_nuevo IN ('BORRADOR', 'VALIDADA', 'PUBLICADA'))
  );

DO $$
DECLARE
  constraint_expression TEXT;
  accepted BOOLEAN[];
BEGIN
  SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid)
    INTO constraint_expression
    FROM pg_catalog.pg_constraint c
   WHERE c.conrelid = 'public.matriz_empresa_version'::pg_catalog.regclass
     AND c.conname = 'ck_matriz_empresa_version_estado'
     AND c.contype = 'c' AND c.convalidated;
  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY orden) FROM (VALUES '
    '(1,''BORRADOR''::varchar(20)),(2,''VALIDADA''::varchar(20)),'
    '(3,''PUBLICADA''::varchar(20)),(4,''DESCARTADA''::varchar(20))) '
    'AS matriz_empresa_version(orden,estado_editorial)', constraint_expression
  ) INTO accepted;
  IF accepted IS DISTINCT FROM ARRAY[true,true,true,false] THEN
    RAISE EXCEPTION 'Rollback fallido: no se restauro el CHECK editorial historico';
  END IF;

  SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid)
    INTO constraint_expression
    FROM pg_catalog.pg_constraint c
   WHERE c.conrelid = 'public.matriz_auditoria_evento'::pg_catalog.regclass
     AND c.conname = 'ck_matriz_auditoria_evento_estados'
     AND c.contype = 'c' AND c.convalidated;
  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY orden) FROM (VALUES '
    '(1,''BORRADOR''::varchar(20),''PUBLICADA''::varchar(20)),'
    '(2,NULL::varchar(20),NULL::varchar(20)),'
    '(3,''DESCARTADA''::varchar(20),NULL::varchar(20))) '
    'AS matriz_auditoria_evento(orden,estado_anterior,estado_nuevo)', constraint_expression
  ) INTO accepted;
  IF accepted IS DISTINCT FROM ARRAY[true,true,false] THEN
    RAISE EXCEPTION 'Rollback fallido: no se restauro el CHECK historico de auditoria';
  END IF;
END
$$;

DELETE FROM public.schema_migrations
WHERE migration_key = '20260815_008_descartar_borrador_matriz';

COMMIT;
