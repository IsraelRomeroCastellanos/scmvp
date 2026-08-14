BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtext('20260810_004_resultados_globales_matriz')
);

DO $$
DECLARE
  real RECORD;
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Esquema invalido: se esperaba public y se obtuvo %', pg_catalog.current_schema();
  END IF;

  IF pg_catalog.to_regclass('public.schema_migrations') IS NULL
     OR pg_catalog.to_regclass('public.matriz_empresa_version') IS NULL THEN
    RAISE EXCEPTION 'Preflight fallido: faltan public.schema_migrations o public.matriz_empresa_version';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class t ON t.oid=a.attrelid AND t.relkind IN ('r','p')
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      JOIN pg_catalog.pg_type tipo ON tipo.oid=a.atttypid
      JOIN pg_catalog.pg_namespace tipo_n ON tipo_n.oid=tipo.typnamespace
     WHERE n.nspname='public' AND t.relname='schema_migrations'
       AND a.attname='migration_key' AND a.attnum>0 AND NOT a.attisdropped
       AND tipo_n.nspname='pg_catalog' AND tipo.typname='varchar'
       AND a.atttypmod=150+4
       AND a.attnotnull
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: public.schema_migrations es incompatible';
  END IF;

  IF NOT EXISTS (
       SELECT 1 FROM public.schema_migrations
        WHERE migration_key='20260728_001_modelo_integral_actividades_vulnerables'
     ) OR NOT EXISTS (
       SELECT 1 FROM public.schema_migrations
        WHERE migration_key='20260801_002_matrices_pt_gr_empresa'
     ) OR NOT EXISTS (
       SELECT 1 FROM public.schema_migrations
        WHERE migration_key='20260805_003_gestion_matrices_empresa'
     ) THEN
    RAISE EXCEPTION 'Preflight fallido: se requieren las migraciones 001, 002 y 003 registradas';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.schema_migrations
     WHERE migration_key='20260810_004_resultados_globales_matriz'
  ) THEN
    RAISE EXCEPTION 'La migracion 20260810_004_resultados_globales_matriz ya esta registrada';
  END IF;

  IF pg_catalog.to_regclass('public.matriz_resultado') IS NOT NULL
     OR pg_catalog.to_regclass('public.matriz_resultado_id_seq') IS NOT NULL THEN
    RAISE EXCEPTION 'Estado parcial o incompatible: ya existe matriz_resultado o su secuencia';
  END IF;

  SELECT c.contype AS tipo,
         ARRAY(
           SELECT a.attname::TEXT
             FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY k(attnum,ord)
             JOIN pg_catalog.pg_attribute a
               ON a.attrelid=c.conrelid AND a.attnum=k.attnum
            ORDER BY k.ord
         ) AS columnas,
         c.convalidated AS validada
    INTO real
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
   WHERE n.nspname='public' AND t.relname='matriz_empresa_version'
     AND c.conname='pk_matriz_empresa_version';

  IF NOT FOUND OR real.tipo IS DISTINCT FROM 'p'::"char"
     OR real.columnas IS DISTINCT FROM ARRAY['id']::TEXT[] OR NOT real.validada
     OR NOT EXISTS (
       SELECT 1
         FROM pg_catalog.pg_attribute a
         JOIN pg_catalog.pg_class t ON t.oid=a.attrelid AND t.relkind IN ('r','p')
         JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
        WHERE n.nspname='public' AND t.relname='matriz_empresa_version'
          AND a.attname='id' AND a.attnum>0 AND NOT a.attisdropped
          AND a.atttypid='pg_catalog.int4'::pg_catalog.regtype AND a.attnotnull
     ) THEN
    RAISE EXCEPTION 'Preflight fallido: public.matriz_empresa_version(id) es incompatible';
  END IF;
END
$$;

CREATE TABLE public.matriz_resultado (
  id SERIAL,
  matriz_version_id INTEGER NOT NULL,
  codigo VARCHAR(100) NOT NULL,
  ambito VARCHAR(2) NOT NULL,
  orden INTEGER NOT NULL,
  nombre_empresarial VARCHAR(150) NOT NULL,
  minimo INTEGER NOT NULL,
  maximo INTEGER NOT NULL,
  minimo_incluido BOOLEAN NOT NULL DEFAULT TRUE,
  maximo_incluido BOOLEAN NOT NULL DEFAULT TRUE,
  referencia_nombre_origen TEXT NOT NULL,
  referencia_rango_origen TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT pk_matriz_resultado PRIMARY KEY (id),
  CONSTRAINT fk_matriz_resultado_version
    FOREIGN KEY (matriz_version_id)
    REFERENCES public.matriz_empresa_version(id) ON DELETE CASCADE,
  CONSTRAINT uq_matriz_resultado_version_codigo
    UNIQUE (matriz_version_id, codigo),
  CONSTRAINT uq_matriz_resultado_version_ambito_orden
    UNIQUE (matriz_version_id, ambito, orden),
  CONSTRAINT ck_matriz_resultado_ambito CHECK (ambito IN ('PT','GR')),
  CONSTRAINT ck_matriz_resultado_orden CHECK (orden BETWEEN 1 AND 3),
  CONSTRAINT ck_matriz_resultado_minimo CHECK (minimo BETWEEN 4 AND 12),
  CONSTRAINT ck_matriz_resultado_maximo CHECK (maximo BETWEEN 4 AND 12),
  CONSTRAINT ck_matriz_resultado_limites CHECK (minimo <= maximo),
  CONSTRAINT ck_matriz_resultado_minimo_incluido CHECK (minimo_incluido = TRUE),
  CONSTRAINT ck_matriz_resultado_maximo_incluido CHECK (maximo_incluido = TRUE),
  CONSTRAINT ck_matriz_resultado_nombre
    CHECK (pg_catalog.length(nombre_empresarial) BETWEEN 1 AND 150),
  CONSTRAINT ck_matriz_resultado_codigo
    CHECK (pg_catalog.length(codigo) BETWEEN 1 AND 100),
  CONSTRAINT ck_matriz_resultado_referencia_nombre
    CHECK (pg_catalog.length(referencia_nombre_origen) >= 1),
  CONSTRAINT ck_matriz_resultado_referencia_rango
    CHECK (pg_catalog.length(referencia_rango_origen) >= 1)
);

INSERT INTO public.schema_migrations (migration_key)
VALUES ('20260810_004_resultados_globales_matriz');

COMMIT;
