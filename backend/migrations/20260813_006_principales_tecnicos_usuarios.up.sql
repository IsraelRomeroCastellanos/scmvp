BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtext('20260813_006_principales_tecnicos_usuarios')
);

DO $$
DECLARE
  columna RECORD;
  constraint_real RECORD;
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Esquema invalido: se esperaba public y se obtuvo %', pg_catalog.current_schema();
  END IF;

  IF pg_catalog.to_regclass('public.schema_migrations') IS NULL
     OR pg_catalog.to_regclass('public.usuarios') IS NULL THEN
    RAISE EXCEPTION 'Preflight fallido: faltan public.schema_migrations o public.usuarios';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class t ON t.oid = a.attrelid AND t.relkind IN ('r', 'p')
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'schema_migrations'
      AND a.attname = 'migration_key' AND a.attnum > 0 AND NOT a.attisdropped
      AND pg_catalog.format_type(a.atttypid, a.atttypmod) = 'character varying'
      AND a.attnotnull
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: public.schema_migrations es incompatible';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260812_005_catalogos_canonicos_matriz'
  ) THEN
    RAISE EXCEPTION 'Dependencia faltante: 20260812_005_catalogos_canonicos_matriz';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260813_006_principales_tecnicos_usuarios'
  ) THEN
    RAISE EXCEPTION 'La migracion 20260813_006_principales_tecnicos_usuarios ya esta registrada';
  END IF;

  FOR columna IN
    SELECT * FROM (VALUES
      ('email', 'character varying(255)', true, NULL::TEXT),
      ('password_hash', 'text', true, NULL::TEXT),
      ('nombre_completo', 'character varying(255)', true, NULL::TEXT),
      ('rol', 'character varying(20)', true, NULL::TEXT),
      ('empresa_id', 'integer', false, NULL::TEXT),
      ('activo', 'boolean', false, 'true')
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
                 '(::boolean|[[:space:]()])', '', 'g'
               ) = columna.defecto
        END
    ) THEN
      RAISE EXCEPTION 'Preflight fallido: public.usuarios.% es incompatible', columna.nombre;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class t
      ON t.oid = a.attrelid AND t.relkind IN ('r', 'p')
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_catalog.pg_attrdef d
      ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    JOIN pg_catalog.pg_depend default_dep
      ON default_dep.classid = 'pg_catalog.pg_attrdef'::pg_catalog.regclass
     AND default_dep.objid = d.oid
     AND default_dep.refclassid = 'pg_catalog.pg_class'::pg_catalog.regclass
     AND default_dep.deptype = 'n'
    JOIN pg_catalog.pg_class secuencia
      ON secuencia.oid = default_dep.refobjid AND secuencia.relkind = 'S'
    JOIN pg_catalog.pg_sequence secuencia_fisica
      ON secuencia_fisica.seqrelid = secuencia.oid
    JOIN pg_catalog.pg_namespace secuencia_ns ON secuencia_ns.oid = secuencia.relnamespace
    JOIN pg_catalog.pg_depend owned_dep
      ON owned_dep.classid = 'pg_catalog.pg_class'::pg_catalog.regclass
     AND owned_dep.objid = secuencia.oid
     AND owned_dep.objsubid = 0
     AND owned_dep.refclassid = 'pg_catalog.pg_class'::pg_catalog.regclass
     AND owned_dep.refobjid = t.oid
     AND owned_dep.refobjsubid = a.attnum
     AND owned_dep.deptype = 'a'
    WHERE n.nspname = 'public' AND t.relname = 'usuarios'
      AND a.attname = 'id' AND a.attnum > 0 AND NOT a.attisdropped
      AND pg_catalog.format_type(a.atttypid, a.atttypmod) = 'integer'
      AND a.attnotnull
      AND pg_catalog.pg_get_serial_sequence('public.usuarios', 'id')::pg_catalog.regclass
          = secuencia.oid
      AND pg_catalog.regexp_replace(
            pg_catalog.pg_get_expr(d.adbin, d.adrelid, true),
            '[[:space:]]', '', 'g'
          ) IN (
            pg_catalog.format(
              'nextval(%L::regclass)', secuencia.oid::pg_catalog.regclass::TEXT
            ),
            pg_catalog.format(
              'pg_catalog.nextval(%L::regclass)', secuencia.oid::pg_catalog.regclass::TEXT
            )
          )
      AND pg_catalog.to_regclass(
            pg_catalog.format('%I.%I', secuencia_ns.nspname, secuencia.relname)
          ) = secuencia.oid
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: public.usuarios.id no conserva su secuencia SERIAL y dependencia OWNED BY';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class t ON t.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'usuarios'
      AND a.attname IN ('tipo_principal', 'codigo_principal')
      AND a.attnum > 0 AND NOT a.attisdropped
  ) THEN
    RAISE EXCEPTION 'Estado parcial: ya existe una columna de principal tecnico en public.usuarios';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'usuarios'
      AND c.conname IN (
        'ck_usuarios_tipo_principal',
        'ck_usuarios_codigo_principal_formato',
        'ck_usuarios_principal_contrato',
        'uq_usuarios_codigo_principal'
      )
  ) THEN
    RAISE EXCEPTION 'Estado parcial: ya existe un constraint introducido por 006';
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
    RAISE EXCEPTION 'Preflight fallido: public.usuarios.usuarios_pkey es incompatible';
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
    RAISE EXCEPTION 'Preflight fallido: public.usuarios.usuarios_email_key es incompatible';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'usuarios'
      AND c.conname = 'usuarios_rol_check' AND c.contype = 'c' AND c.convalidated
      AND ARRAY(
        SELECT a.attname::TEXT
        FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY k(attnum, ord)
        JOIN pg_catalog.pg_attribute a
          ON a.attrelid = c.conrelid AND a.attnum = k.attnum
        ORDER BY k.ord
      ) = ARRAY['rol']::TEXT[]
      AND pg_catalog.regexp_replace(
            pg_catalog.pg_get_constraintdef(c.oid, true),
            '(::text|::character varying|[[:space:]()])', '', 'g'
          ) IN (
            'CHECKrol=ANYARRAY[''admin'',''consultor'',''cliente'']',
            'CHECKrol=ANYARRAY[''admin'',''consultor'',''cliente''][]',
            'CHECKrolIN''admin'',''consultor'',''cliente'''
          )
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: public.usuarios.usuarios_rol_check es incompatible';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE rol IS NULL
       OR rol NOT IN ('admin', 'consultor', 'cliente')
       OR activo IS NULL
       OR (rol = 'admin' AND empresa_id IS NOT NULL)
       OR (rol IN ('consultor', 'cliente')
           AND (empresa_id IS NULL OR empresa_id <= 0))
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: existen usuarios historicos incompatibles con el contrato HUMANO';
  END IF;
END
$$;

LOCK TABLE public.usuarios IN ACCESS EXCLUSIVE MODE;

-- Revalidar bajo lock para cerrar la carrera entre el preflight y el ALTER.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE rol IS NULL
       OR rol NOT IN ('admin', 'consultor', 'cliente')
       OR activo IS NULL
       OR (rol = 'admin' AND empresa_id IS NOT NULL)
       OR (rol IN ('consultor', 'cliente')
           AND (empresa_id IS NULL OR empresa_id <= 0))
  ) THEN
    RAISE EXCEPTION 'Preflight bajo lock fallido: existen usuarios historicos incompatibles';
  END IF;
END
$$;

ALTER TABLE public.usuarios
  ADD COLUMN tipo_principal VARCHAR(10) NOT NULL DEFAULT 'HUMANO',
  ADD COLUMN codigo_principal VARCHAR(100) NULL,
  ALTER COLUMN rol DROP NOT NULL,
  DROP CONSTRAINT usuarios_rol_check,
  ADD CONSTRAINT ck_usuarios_tipo_principal
    CHECK (tipo_principal IN ('HUMANO', 'SISTEMA')),
  ADD CONSTRAINT ck_usuarios_codigo_principal_formato
    CHECK (
      codigo_principal IS NULL
      OR codigo_principal COLLATE "C" ~ '^[A-Z][A-Z0-9_]{0,99}$'
    ),
  ADD CONSTRAINT ck_usuarios_principal_contrato
    CHECK (
      tipo_principal IS NOT NULL
      AND (
        (
          tipo_principal = 'HUMANO'
          AND codigo_principal IS NULL
          AND rol IS NOT NULL
          AND rol IN ('admin', 'consultor', 'cliente')
          AND activo IS NOT NULL
          AND (
            (rol = 'admin' AND empresa_id IS NULL)
            OR (rol IN ('consultor', 'cliente')
                AND empresa_id IS NOT NULL AND empresa_id > 0)
          )
        )
        OR
        (
          tipo_principal = 'SISTEMA'
          AND codigo_principal IS NOT NULL
          AND rol IS NULL
          AND empresa_id IS NULL
          AND activo IS FALSE
        )
      )
    ),
  ADD CONSTRAINT uq_usuarios_codigo_principal UNIQUE (codigo_principal);

INSERT INTO public.schema_migrations (migration_key)
VALUES ('20260813_006_principales_tecnicos_usuarios');

COMMIT;
