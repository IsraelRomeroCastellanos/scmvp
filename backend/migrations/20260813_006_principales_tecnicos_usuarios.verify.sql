BEGIN;
SET TRANSACTION READ ONLY;

DO $$
DECLARE
  columna RECORD;
  constraint_real RECORD;
  fk_esperada RECORD;
  expresion TEXT;
  expresion_formato TEXT;
  definicion_normalizada TEXT;
  contrato_ok BOOLEAN;
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'VERIFY fallido: se esperaba el esquema public';
  END IF;

  IF pg_catalog.to_regclass('public.schema_migrations') IS NULL
     OR pg_catalog.to_regclass('public.usuarios') IS NULL THEN
    RAISE EXCEPTION 'VERIFY fallido: faltan public.schema_migrations o public.usuarios';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260812_005_catalogos_canonicos_matriz'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260813_006_principales_tecnicos_usuarios'
  ) THEN
    RAISE EXCEPTION 'VERIFY fallido: faltan las migration keys 005 o 006';
  END IF;

  FOR columna IN
    SELECT * FROM (VALUES
      ('tipo_principal', 'character varying(10)', true, '''HUMANO''::character varying'),
      ('codigo_principal', 'character varying(100)', false, NULL::TEXT),
      ('rol', 'character varying(20)', false, NULL::TEXT)
    ) AS x(nombre, tipo, no_nula, defecto)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class t ON t.oid = a.attrelid AND t.relkind IN ('r', 'p')
      JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
      LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE n.nspname = 'public' AND t.relname = 'usuarios'
        AND a.attname = columna.nombre AND a.attnum > 0 AND NOT a.attisdropped
        AND pg_catalog.format_type(a.atttypid, a.atttypmod) = columna.tipo
        AND a.attnotnull = columna.no_nula
        AND CASE
          WHEN columna.defecto IS NULL THEN d.oid IS NULL
          ELSE pg_catalog.regexp_replace(
                 pg_catalog.pg_get_expr(d.adbin, d.adrelid, true),
                 '(::character varying|[[:space:]()])', '', 'g'
               ) = pg_catalog.regexp_replace(
                 columna.defecto,
                 '(::character varying|[[:space:]()])', '', 'g'
               )
        END
    ) THEN
      RAISE EXCEPTION 'VERIFY fallido: public.usuarios.% es incompatible', columna.nombre;
    END IF;
  END LOOP;

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
      RAISE EXCEPTION 'VERIFY fallido: falta o es incompatible %', constraint_real.nombre;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'usuarios'
      AND c.conname = 'usuarios_rol_check'
  ) THEN
    RAISE EXCEPTION 'VERIFY fallido: persiste el CHECK historico de rol';
  END IF;

  SELECT c.contype AS tipo,
         ARRAY(
           SELECT a.attname::TEXT
           FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY k(attnum, ord)
           JOIN pg_catalog.pg_attribute a
             ON a.attrelid = c.conrelid AND a.attnum = k.attnum
           ORDER BY k.ord
         ) AS columnas,
         c.convalidated AS validada
    INTO constraint_real
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public' AND t.relname = 'usuarios'
     AND c.conname = 'usuarios_pkey';

  IF NOT FOUND OR constraint_real.tipo IS DISTINCT FROM 'p'::"char"
     OR constraint_real.columnas IS DISTINCT FROM ARRAY['id']::TEXT[]
     OR NOT constraint_real.validada THEN
    RAISE EXCEPTION 'VERIFY fallido: usuarios_pkey fue alterada';
  END IF;

  SELECT c.contype AS tipo,
         ARRAY(
           SELECT a.attname::TEXT
           FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY k(attnum, ord)
           JOIN pg_catalog.pg_attribute a
             ON a.attrelid = c.conrelid AND a.attnum = k.attnum
           ORDER BY k.ord
         ) AS columnas,
         c.convalidated AS validada
    INTO constraint_real
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public' AND t.relname = 'usuarios'
     AND c.conname = 'usuarios_email_key';

  IF NOT FOUND OR constraint_real.tipo IS DISTINCT FROM 'u'::"char"
     OR constraint_real.columnas IS DISTINCT FROM ARRAY['email']::TEXT[]
     OR NOT constraint_real.validada THEN
    RAISE EXCEPTION 'VERIFY fallido: usuarios_email_key fue alterada';
  END IF;

  SELECT c.contype AS tipo,
         ARRAY(
           SELECT a.attname::TEXT
           FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY k(attnum, ord)
           JOIN pg_catalog.pg_attribute a
             ON a.attrelid = c.conrelid AND a.attnum = k.attnum
           ORDER BY k.ord
         ) AS columnas,
         c.convalidated AS validada
    INTO constraint_real
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public' AND t.relname = 'usuarios'
     AND c.conname = 'uq_usuarios_codigo_principal';

  IF NOT FOUND OR constraint_real.tipo IS DISTINCT FROM 'u'::"char"
     OR constraint_real.columnas IS DISTINCT FROM ARRAY['codigo_principal']::TEXT[]
     OR NOT constraint_real.validada
     OR NOT EXISTS (
       SELECT 1
       FROM pg_catalog.pg_constraint c
       JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
       JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
       JOIN pg_catalog.pg_index i ON i.indexrelid = c.conindid
       JOIN pg_catalog.pg_class indice ON indice.oid = i.indexrelid
       JOIN pg_catalog.pg_am am ON am.oid = indice.relam
       WHERE n.nspname = 'public' AND t.relname = 'usuarios'
         AND c.conname = 'uq_usuarios_codigo_principal' AND c.contype = 'u'
         AND am.amname = 'btree'
         AND i.indisunique AND i.indisvalid
         AND i.indnatts = 1 AND i.indnkeyatts = 1
         AND i.indexprs IS NULL AND i.indpred IS NULL
         AND NOT i.indnullsnotdistinct
     ) THEN
    RAISE EXCEPTION 'VERIFY fallido: uq_usuarios_codigo_principal es incompatible';
  END IF;

  SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid, true)
    INTO expresion
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public' AND t.relname = 'usuarios'
     AND c.conname = 'ck_usuarios_tipo_principal' AND c.contype = 'c';

  IF expresion IS NULL THEN
    RAISE EXCEPTION 'VERIFY fallido: no puede inspeccionarse ck_usuarios_tipo_principal';
  END IF;
  definicion_normalizada := pg_catalog.regexp_replace(
    expresion,
    '(::character varying|::text\[\]|::text|[[:space:]()])', '', 'g'
  );
  IF definicion_normalizada IS DISTINCT FROM
     'tipo_principal=ANYARRAY[''HUMANO'',''SISTEMA'']' THEN
    RAISE EXCEPTION 'VERIFY fallido: definicion completa de ck_usuarios_tipo_principal incompatible';
  END IF;
  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.bool_and(((%s) IS NOT FALSE) = esperado) FROM (VALUES '
    || '(''HUMANO''::varchar(10), true),'
    || '(''SISTEMA''::varchar(10), true),'
    || '(''humano''::varchar(10), false),'
    || '(''OTRO''::varchar(10), false),'
    || '(NULL::varchar(10), true)) v(tipo_principal, esperado)',
    expresion
  ) INTO contrato_ok;
  IF contrato_ok IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'VERIFY fallido: ck_usuarios_tipo_principal no implementa el contrato exacto';
  END IF;

  SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid, true)
    INTO expresion
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public' AND t.relname = 'usuarios'
     AND c.conname = 'ck_usuarios_codigo_principal_formato' AND c.contype = 'c';

  IF expresion IS NULL THEN
    RAISE EXCEPTION 'VERIFY fallido: regex canonica de codigo_principal incompatible';
  END IF;
  definicion_normalizada := pg_catalog.regexp_replace(
    expresion,
    '(::character varying|::text\[\]|::text|[[:space:]()])', '', 'g'
  );
  IF definicion_normalizada IS DISTINCT FROM
     'codigo_principalISNULLORcodigo_principalCOLLATE"C"~''^[A-Z][A-Z0-9_]{0,99}$''' THEN
    RAISE EXCEPTION 'VERIFY fallido: definicion completa de ck_usuarios_codigo_principal_formato incompatible';
  END IF;
  expresion_formato := expresion;
  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.bool_and(((%s) IS NOT FALSE) = esperado) FROM (VALUES '
    || '(NULL::text, true),'
    || '(''A''::text, true),'
    || '(''SYSTEM''::text, true),'
    || '(''A_1''::varchar(100), true),'
    || '(pg_catalog.repeat(''A'', 100), true),'
    || '(pg_catalog.repeat(''A'', 101), false),'
    || '(''1ABC'', false),'
    || '(''ABC DEF'', false),'
    || '(''system''::varchar(100), false),'
    || '(''_SYSTEM''::varchar(100), false),'
    || '(''A-B''::varchar(100), false),'
    || '(''''::varchar(100), false)) v(codigo_principal, esperado)',
    expresion
  ) INTO contrato_ok;
  IF contrato_ok IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'VERIFY fallido: ck_usuarios_codigo_principal_formato no implementa el contrato';
  END IF;

  SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid, true)
    INTO expresion
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public' AND t.relname = 'usuarios'
     AND c.conname = 'ck_usuarios_principal_contrato' AND c.contype = 'c';

  IF expresion IS NULL THEN
    RAISE EXCEPTION 'VERIFY fallido: no puede inspeccionarse ck_usuarios_principal_contrato';
  END IF;
  definicion_normalizada := pg_catalog.regexp_replace(
    expresion,
    '(::character varying|::text\[\]|::text|[[:space:]()])', '', 'g'
  );
  IF definicion_normalizada IS DISTINCT FROM
     'tipo_principalISNOTNULLANDtipo_principal=''HUMANO''ANDcodigo_principalISNULLANDrolISNOTNULLANDrol=ANYARRAY[''admin'',''consultor'',''cliente'']ANDactivoISNOTNULLANDrol=''admin''ANDempresa_idISNULLORrol=ANYARRAY[''consultor'',''cliente'']ANDempresa_idISNOTNULLANDempresa_id>0ORtipo_principal=''SISTEMA''ANDcodigo_principalISNOTNULLANDrolISNULLANDempresa_idISNULLANDactivoISFALSE' THEN
    RAISE EXCEPTION 'VERIFY fallido: definicion completa de ck_usuarios_principal_contrato incompatible';
  END IF;
  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.bool_and('
    || '(((%s) IS NOT FALSE) AND ((%s) IS NOT FALSE)) = '
    || '((tipo_principal IS NOT NULL AND ('
    || '(tipo_principal = ''HUMANO'' AND codigo_principal IS NULL '
    || 'AND rol IS NOT NULL AND rol IN (''admin'',''consultor'',''cliente'') '
    || 'AND activo IS NOT NULL AND ((rol = ''admin'' AND empresa_id IS NULL) '
    || 'OR (rol IN (''consultor'',''cliente'') AND empresa_id IS NOT NULL AND empresa_id > 0))) '
    || 'OR (tipo_principal = ''SISTEMA'' AND codigo_principal IS NOT NULL '
    || 'AND rol IS NULL AND empresa_id IS NULL AND activo IS FALSE))) '
    || 'AND (codigo_principal IS NULL OR codigo_principal COLLATE "C" '
    || '~ ''^[A-Z][A-Z0-9_]{0,99}$'')) '
    || 'FROM (VALUES (''HUMANO''::text),(''SISTEMA''),(''OTRO''),(NULL)) t(tipo_principal) '
    || 'CROSS JOIN (VALUES (NULL::text),(''A''),(''SYSTEM''),(''1ABC''),'
    || '(''ABC DEF''),(''ABC-DEF''),(''system''),(pg_catalog.repeat(''A'',100)),'
    || '(pg_catalog.repeat(''A'',101))) c(codigo_principal) '
    || 'CROSS JOIN (VALUES (''admin''::text),(''consultor''),(''cliente''),'
    || '(''auditor''),(NULL)) r(rol) '
    || 'CROSS JOIN (VALUES (NULL::int),(-1),(0),(1)) e(empresa_id) '
    || 'CROSS JOIN (VALUES (NULL::boolean),(TRUE),(FALSE)) a(activo)',
    expresion,
    expresion_formato
  ) INTO contrato_ok;
  IF contrato_ok IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'VERIFY fallido: ck_usuarios_principal_contrato no implementa el contrato';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE tipo_principal IS NULL
       OR tipo_principal NOT IN ('HUMANO', 'SISTEMA')
       OR activo IS NULL
       OR (tipo_principal = 'HUMANO' AND (
         codigo_principal IS NOT NULL
         OR rol IS NULL OR rol NOT IN ('admin', 'consultor', 'cliente')
         OR (rol = 'admin' AND empresa_id IS NOT NULL)
         OR (rol IN ('consultor', 'cliente')
             AND (empresa_id IS NULL OR empresa_id <= 0))
       ))
       OR (tipo_principal = 'SISTEMA' AND (
         codigo_principal IS NULL
         OR codigo_principal COLLATE "C" !~ '^[A-Z][A-Z0-9_]{0,99}$'
         OR rol IS NOT NULL OR empresa_id IS NOT NULL OR activo IS DISTINCT FROM FALSE
       ))
  ) THEN
    RAISE EXCEPTION 'VERIFY fallido: existen principales incompatibles';
  END IF;

  IF EXISTS (
    SELECT codigo_principal
    FROM public.usuarios
    WHERE codigo_principal IS NOT NULL
    GROUP BY codigo_principal
    HAVING pg_catalog.count(*) > 1
  ) THEN
    RAISE EXCEPTION 'VERIFY fallido: existen codigo_principal duplicados';
  END IF;

  FOR fk_esperada IN
    SELECT * FROM (VALUES
      ('matriz_empresa_version','fk_matriz_empresa_version_creada_por',ARRAY['creada_por']),
      ('matriz_empresa_version','fk_matriz_empresa_version_validada_por',ARRAY['validada_por']),
      ('matriz_empresa_version','fk_matriz_empresa_version_publicada_por',ARRAY['publicada_por']),
      ('matriz_archivo_fuente','fk_matriz_archivo_fuente_cargado_por',ARRAY['cargado_por']),
      ('matriz_empresa_version','fk_matriz_empresa_version_activada_por',ARRAY['activada_por']),
      ('matriz_empresa_version','fk_matriz_empresa_version_desactivada_por',ARRAY['desactivada_por']),
      ('matriz_auditoria_evento','fk_matriz_auditoria_evento_actor',ARRAY['actor_usuario_id']),
      ('matriz_idempotencia','fk_matriz_idempotencia_actor',ARRAY['actor_usuario_id']),
      ('catalogo_criterio_pt','fk_catalogo_criterio_pt_creado_por',ARRAY['creado_por']),
      ('catalogo_criterio_pt','fk_catalogo_criterio_pt_retirado_por',ARRAY['retirado_por']),
      ('catalogo_criterio_pt_version','fk_catalogo_criterio_pt_version_creado_por',ARRAY['creado_por']),
      ('catalogo_criterio_gr','fk_catalogo_criterio_gr_creado_por',ARRAY['creado_por']),
      ('catalogo_criterio_gr','fk_catalogo_criterio_gr_retirado_por',ARRAY['retirado_por']),
      ('catalogo_criterio_gr_version','fk_catalogo_criterio_gr_version_creado_por',ARRAY['creado_por'])
    ) AS x(tabla, nombre, columnas)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_catalog.pg_class rt ON rt.oid = c.confrelid
      JOIN pg_catalog.pg_namespace rn ON rn.oid = rt.relnamespace
      WHERE n.nspname = 'public' AND t.relname = fk_esperada.tabla
        AND c.conname = fk_esperada.nombre AND c.contype = 'f' AND c.convalidated
        AND ARRAY(
          SELECT a.attname::TEXT
          FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY k(attnum, ord)
          JOIN pg_catalog.pg_attribute a
            ON a.attrelid = c.conrelid AND a.attnum = k.attnum
          ORDER BY k.ord
        ) = fk_esperada.columnas
        AND rn.nspname = 'public' AND rt.relname = 'usuarios'
        AND ARRAY(
          SELECT a.attname::TEXT
          FROM pg_catalog.unnest(c.confkey) WITH ORDINALITY k(attnum, ord)
          JOIN pg_catalog.pg_attribute a
            ON a.attrelid = c.confrelid AND a.attnum = k.attnum
          ORDER BY k.ord
        ) = ARRAY['id']::TEXT[]
        AND c.confdeltype = 'r' AND c.confupdtype = 'a'
        AND c.confmatchtype = 's'
    ) THEN
      RAISE EXCEPTION 'VERIFY fallido: FK public.%.% fue alterada',
        fk_esperada.tabla, fk_esperada.nombre;
    END IF;
  END LOOP;
END
$$;

SELECT migration_key
FROM public.schema_migrations
WHERE migration_key IN (
  '20260812_005_catalogos_canonicos_matriz',
  '20260813_006_principales_tecnicos_usuarios'
)
ORDER BY migration_key;

COMMIT;
