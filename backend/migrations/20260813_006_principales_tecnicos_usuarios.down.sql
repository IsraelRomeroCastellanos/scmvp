BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtext('20260813_006_principales_tecnicos_usuarios')
);

DO $$
DECLARE
  constraint_real RECORD;
  expresion TEXT;
  expresion_formato TEXT;
  definicion_normalizada TEXT;
  contrato_ok BOOLEAN;
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Rollback no aplicable: se esperaba el esquema public';
  END IF;

  IF pg_catalog.to_regclass('public.schema_migrations') IS NULL
     OR pg_catalog.to_regclass('public.usuarios') IS NULL THEN
    RAISE EXCEPTION 'Rollback no aplicable: faltan public.schema_migrations o public.usuarios';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260813_006_principales_tecnicos_usuarios'
  ) THEN
    RAISE EXCEPTION 'Rollback no aplicable: falta la migration key 006';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios'
      AND column_name = 'tipo_principal' AND data_type = 'character varying'
      AND character_maximum_length = 10 AND is_nullable = 'NO'
      AND pg_catalog.regexp_replace(
            column_default,
            '(::character varying|[[:space:]()])', '', 'g'
          ) = '''HUMANO'''
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios'
      AND column_name = 'codigo_principal' AND data_type = 'character varying'
      AND character_maximum_length = 100 AND is_nullable = 'YES'
      AND column_default IS NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios'
      AND column_name = 'rol' AND data_type = 'character varying'
      AND character_maximum_length = 20 AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'Rollback no aplicable: columnas de public.usuarios incompatibles';
  END IF;

  FOR constraint_real IN
    SELECT * FROM (VALUES
      ('ck_usuarios_tipo_principal', 'c'),
      ('ck_usuarios_codigo_principal_formato', 'c'),
      ('ck_usuarios_principal_contrato', 'c'),
      ('uq_usuarios_codigo_principal', 'u')
    ) AS x(nombre, tipo)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public' AND t.relname = 'usuarios'
        AND c.conname = constraint_real.nombre
        AND c.contype = constraint_real.tipo::"char"
        AND c.convalidated
    ) THEN
      RAISE EXCEPTION 'Rollback no aplicable: falta o es incompatible %', constraint_real.nombre;
    END IF;
  END LOOP;

  SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid, true)
    INTO expresion
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public' AND t.relname = 'usuarios'
     AND c.conname = 'ck_usuarios_tipo_principal' AND c.contype = 'c'
     AND c.convalidated
     AND ARRAY(
       SELECT a.attname::TEXT
       FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY k(attnum, ord)
       JOIN pg_catalog.pg_attribute a
         ON a.attrelid = c.conrelid AND a.attnum = k.attnum
       ORDER BY k.ord
     ) = ARRAY['tipo_principal']::TEXT[];

  IF expresion IS NULL THEN
    RAISE EXCEPTION 'Rollback no aplicable: ck_usuarios_tipo_principal es incompatible';
  END IF;
  definicion_normalizada := pg_catalog.regexp_replace(
    expresion,
    '(::character varying|::text\[\]|::text|[[:space:]()])', '', 'g'
  );
  IF definicion_normalizada IS DISTINCT FROM
     'tipo_principal=ANYARRAY[''HUMANO'',''SISTEMA'']' THEN
    RAISE EXCEPTION 'Rollback no aplicable: definicion completa de ck_usuarios_tipo_principal fue alterada';
  END IF;
  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.bool_and(((%s) IS NOT FALSE) = esperado) FROM (VALUES '
    || '(''HUMANO''::varchar(10),true),(''SISTEMA''::varchar(10),true),'
    || '(''humano''::varchar(10),false),(''OTRO''::varchar(10),false),'
    || '(NULL::varchar(10),true)) v(tipo_principal,esperado)',
    expresion
  ) INTO contrato_ok;
  IF contrato_ok IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Rollback no aplicable: ck_usuarios_tipo_principal fue alterado';
  END IF;

  SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid, true)
    INTO expresion_formato
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public' AND t.relname = 'usuarios'
     AND c.conname = 'ck_usuarios_codigo_principal_formato' AND c.contype = 'c'
     AND c.convalidated
     AND ARRAY(
       SELECT a.attname::TEXT
       FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY k(attnum, ord)
       JOIN pg_catalog.pg_attribute a
         ON a.attrelid = c.conrelid AND a.attnum = k.attnum
       ORDER BY k.ord
     ) = ARRAY['codigo_principal']::TEXT[];

  IF expresion_formato IS NULL THEN
    RAISE EXCEPTION 'Rollback no aplicable: ck_usuarios_codigo_principal_formato es incompatible';
  END IF;
  definicion_normalizada := pg_catalog.regexp_replace(
    expresion_formato,
    '(::character varying|::text\[\]|::text|[[:space:]()])', '', 'g'
  );
  IF definicion_normalizada IS DISTINCT FROM
     'codigo_principalISNULLORcodigo_principalCOLLATE"C"~''^[A-Z][A-Z0-9_]{0,99}$''' THEN
    RAISE EXCEPTION 'Rollback no aplicable: definicion completa de ck_usuarios_codigo_principal_formato fue alterada';
  END IF;
  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.bool_and(((%s) IS NOT FALSE) = esperado) FROM (VALUES '
    || '(NULL::text,true),(''A''::text,true),(''SYSTEM''::text,true),'
    || '(''A_1'',true),(pg_catalog.repeat(''A'',100),true),'
    || '(pg_catalog.repeat(''A'',101),false),(''1ABC'',false),'
    || '(''ABC DEF'',false),(''system'',false),'
    || '(''_SYSTEM''::varchar(100),false),(''A-B''::varchar(100),false),'
    || '(''''::varchar(100),false)) v(codigo_principal,esperado)',
    expresion_formato
  ) INTO contrato_ok;
  IF contrato_ok IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Rollback no aplicable: ck_usuarios_codigo_principal_formato fue alterado';
  END IF;

  SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid, true)
    INTO expresion
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public' AND t.relname = 'usuarios'
     AND c.conname = 'ck_usuarios_principal_contrato' AND c.contype = 'c'
     AND c.convalidated
     AND ARRAY(
       SELECT a.attname::TEXT
       FROM pg_catalog.unnest(c.conkey) k(attnum)
       JOIN pg_catalog.pg_attribute a
         ON a.attrelid = c.conrelid AND a.attnum = k.attnum
       ORDER BY a.attname
     ) = ARRAY['activo','codigo_principal','empresa_id','rol','tipo_principal']::TEXT[];

  IF expresion IS NULL THEN
    RAISE EXCEPTION 'Rollback no aplicable: ck_usuarios_principal_contrato es incompatible';
  END IF;
  definicion_normalizada := pg_catalog.regexp_replace(
    expresion,
    '(::character varying|::text\[\]|::text|[[:space:]()])', '', 'g'
  );
  IF definicion_normalizada IS DISTINCT FROM
     'tipo_principalISNOTNULLANDtipo_principal=''HUMANO''ANDcodigo_principalISNULLANDrolISNOTNULLANDrol=ANYARRAY[''admin'',''consultor'',''cliente'']ANDactivoISNOTNULLANDrol=''admin''ANDempresa_idISNULLORrol=ANYARRAY[''consultor'',''cliente'']ANDempresa_idISNOTNULLANDempresa_id>0ORtipo_principal=''SISTEMA''ANDcodigo_principalISNOTNULLANDrolISNULLANDempresa_idISNULLANDactivoISFALSE' THEN
    RAISE EXCEPTION 'Rollback no aplicable: definicion completa de ck_usuarios_principal_contrato fue alterada';
  END IF;
  EXECUTE pg_catalog.format($sql$
    SELECT pg_catalog.bool_and(
      (
        ((%1$s) IS NOT FALSE)
        AND ((%2$s) IS NOT FALSE)
      ) IS NOT DISTINCT FROM (
        tipo_principal IS NOT NULL
        AND (
          (
            tipo_principal = 'HUMANO'
            AND codigo_principal IS NULL
            AND rol IS NOT NULL
            AND rol IN ('admin','consultor','cliente')
            AND activo IS NOT NULL
            AND (
              (rol = 'admin' AND empresa_id IS NULL)
              OR (rol IN ('consultor','cliente')
                  AND empresa_id IS NOT NULL AND empresa_id > 0)
            )
          )
          OR (
            tipo_principal = 'SISTEMA'
            AND codigo_principal IS NOT NULL
            AND rol IS NULL
            AND empresa_id IS NULL
            AND activo IS FALSE
          )
        )
        AND (
          codigo_principal IS NULL
          OR codigo_principal COLLATE "C" ~ '^[A-Z][A-Z0-9_]{0,99}$'
        )
      )
    )
    FROM (VALUES ('HUMANO'::text),('SISTEMA'),('OTRO'),(NULL)) t(tipo_principal)
    CROSS JOIN (VALUES (NULL::text),('A'),('SYSTEM'),('1ABC'),
      ('ABC DEF'),('ABC-DEF'),('system'),(pg_catalog.repeat('A',100)),
      (pg_catalog.repeat('A',101))) c(codigo_principal)
    CROSS JOIN (VALUES ('admin'::text),('consultor'),('cliente'),
      ('auditor'),(NULL)) r(rol)
    CROSS JOIN (VALUES (NULL::int),(-1),(0),(1)) e(empresa_id)
    CROSS JOIN (VALUES (NULL::boolean),(TRUE),(FALSE)) a(activo)
  $sql$, expresion, expresion_formato) INTO contrato_ok;
  IF contrato_ok IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Rollback no aplicable: ck_usuarios_principal_contrato fue alterado';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_catalog.pg_index i ON i.indexrelid = c.conindid
    JOIN pg_catalog.pg_class indice ON indice.oid = i.indexrelid
    JOIN pg_catalog.pg_am am ON am.oid = indice.relam
    WHERE n.nspname = 'public' AND t.relname = 'usuarios'
      AND c.conname = 'uq_usuarios_codigo_principal' AND c.contype = 'u'
      AND c.convalidated
      AND ARRAY(
        SELECT a.attname::TEXT
        FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY k(attnum, ord)
        JOIN pg_catalog.pg_attribute a
          ON a.attrelid = c.conrelid AND a.attnum = k.attnum
        ORDER BY k.ord
      ) = ARRAY['codigo_principal']::TEXT[]
      AND am.amname = 'btree'
      AND i.indisunique AND i.indisvalid
      AND i.indnatts = 1 AND i.indnkeyatts = 1
      AND i.indexprs IS NULL AND i.indpred IS NULL
      AND NOT i.indnullsnotdistinct
  ) THEN
    RAISE EXCEPTION 'Rollback no aplicable: uq_usuarios_codigo_principal fue alterado';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'usuarios'
      AND c.conname = 'usuarios_rol_check'
  ) THEN
    RAISE EXCEPTION 'Rollback no aplicable: reaparecio parcialmente usuarios_rol_check';
  END IF;
END
$$;

LOCK TABLE public.usuarios IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE tipo_principal <> 'HUMANO'
       OR codigo_principal IS NOT NULL
       OR rol IS NULL
       OR rol NOT IN ('admin', 'consultor', 'cliente')
       OR activo IS NULL
       OR (rol = 'admin' AND empresa_id IS NOT NULL)
       OR (rol IN ('consultor', 'cliente')
           AND (empresa_id IS NULL OR empresa_id <= 0))
  ) THEN
    RAISE EXCEPTION 'Rollback bloqueado: existen principales o usuarios incompatibles con el esquema previo';
  END IF;
END
$$;

ALTER TABLE public.usuarios
  DROP CONSTRAINT uq_usuarios_codigo_principal,
  DROP CONSTRAINT ck_usuarios_principal_contrato,
  DROP CONSTRAINT ck_usuarios_codigo_principal_formato,
  DROP CONSTRAINT ck_usuarios_tipo_principal,
  ALTER COLUMN rol SET NOT NULL,
  ADD CONSTRAINT usuarios_rol_check
    CHECK (rol IN ('admin', 'consultor', 'cliente')),
  DROP COLUMN codigo_principal,
  DROP COLUMN tipo_principal;

DELETE FROM public.schema_migrations
WHERE migration_key = '20260813_006_principales_tecnicos_usuarios';

COMMIT;
