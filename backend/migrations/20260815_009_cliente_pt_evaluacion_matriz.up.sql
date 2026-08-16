BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtext('20260815_009_cliente_pt_evaluacion_matriz')
);

DO $$
DECLARE
  required_key TEXT;
  required_table TEXT;
  expected RECORD;
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Esquema invalido: se esperaba public y se obtuvo %', pg_catalog.current_schema();
  END IF;

  FOREACH required_table IN ARRAY ARRAY[
    'public.schema_migrations',
    'public.clientes',
    'public.empresas',
    'public.usuarios',
    'public.matriz_empresa_version',
    'public.matriz_criterio',
    'public.matriz_opcion',
    'public.matriz_resultado'
  ] LOOP
    IF pg_catalog.to_regclass(required_table) IS NULL THEN
      RAISE EXCEPTION 'Preflight fallido: falta %', required_table;
    END IF;
  END LOOP;

  FOREACH required_key IN ARRAY ARRAY[
    '20260728_001_modelo_integral_actividades_vulnerables',
    '20260801_002_matrices_pt_gr_empresa',
    '20260805_003_gestion_matrices_empresa',
    '20260810_004_resultados_globales_matriz',
    '20260812_005_catalogos_canonicos_matriz',
    '20260813_006_principales_tecnicos_usuarios',
    '20260813_007_seed_principal_sistema_y_catalogos_matriz',
    '20260815_008_descartar_borrador_matriz'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.schema_migrations sm
       WHERE sm.migration_key = required_key
    ) THEN
      RAISE EXCEPTION 'Dependencia faltante: %', required_key;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
     WHERE a.attrelid='public.schema_migrations'::pg_catalog.regclass
       AND a.attname='migration_key' AND a.attnum>0 AND NOT a.attisdropped
       AND a.atttypid='pg_catalog.varchar'::pg_catalog.regtype
       AND a.atttypmod=154 AND a.attnotnull
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: schema_migrations.migration_key es incompatible';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.schema_migrations
     WHERE migration_key = '20260815_009_cliente_pt_evaluacion_matriz'
  ) THEN
    RAISE EXCEPTION 'La migracion 20260815_009_cliente_pt_evaluacion_matriz ya esta registrada';
  END IF;

  IF pg_catalog.to_regclass('public.cliente_pt_evaluacion') IS NOT NULL
     OR pg_catalog.to_regclass('public.cliente_pt_respuesta') IS NOT NULL
     OR pg_catalog.to_regclass('public.cliente_pt_evaluacion_id_seq') IS NOT NULL
     OR pg_catalog.to_regclass('public.cliente_pt_respuesta_id_seq') IS NOT NULL THEN
    RAISE EXCEPTION 'Estado parcial: ya existe una tabla o secuencia introducida por 009';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_constraint c
     WHERE c.conname IN (
       'uq_clientes_id_empresa_pt',
       'uq_matriz_criterio_id_version_ambito_orden_pt',
       'uq_matriz_opcion_id_criterio_puntaje_pt',
       'uq_matriz_resultado_id_version_ambito_pt'
     )
  ) THEN
    RAISE EXCEPTION 'Estado parcial: ya existe un constraint auxiliar introducido por 009';
  END IF;

  FOR expected IN
    SELECT * FROM (VALUES
      ('clientes', 'id', 'pg_catalog.int4'::pg_catalog.regtype, true),
      ('clientes', 'empresa_id', 'pg_catalog.int4'::pg_catalog.regtype, true),
      ('empresas', 'id', 'pg_catalog.int4'::pg_catalog.regtype, true),
      ('usuarios', 'id', 'pg_catalog.int4'::pg_catalog.regtype, true),
      ('matriz_empresa_version', 'id', 'pg_catalog.int4'::pg_catalog.regtype, true),
      ('matriz_empresa_version', 'empresa_id', 'pg_catalog.int4'::pg_catalog.regtype, true),
      ('matriz_criterio', 'id', 'pg_catalog.int4'::pg_catalog.regtype, true),
      ('matriz_criterio', 'matriz_version_id', 'pg_catalog.int4'::pg_catalog.regtype, true),
      ('matriz_criterio', 'ambito', 'pg_catalog.varchar'::pg_catalog.regtype, true),
      ('matriz_opcion', 'id', 'pg_catalog.int4'::pg_catalog.regtype, true),
      ('matriz_opcion', 'criterio_id', 'pg_catalog.int4'::pg_catalog.regtype, true),
      ('matriz_opcion', 'puntaje', 'pg_catalog.numeric'::pg_catalog.regtype, true),
      ('matriz_resultado', 'id', 'pg_catalog.int4'::pg_catalog.regtype, true),
      ('matriz_resultado', 'matriz_version_id', 'pg_catalog.int4'::pg_catalog.regtype, true),
      ('matriz_resultado', 'ambito', 'pg_catalog.varchar'::pg_catalog.regtype, true)
    ) AS x(tabla, columna, tipo_oid, no_nula)
  LOOP
    IF NOT EXISTS (
      SELECT 1
        FROM pg_catalog.pg_attribute a
       WHERE a.attrelid = pg_catalog.to_regclass('public.' || expected.tabla)
         AND a.attname = expected.columna
         AND a.attnum > 0 AND NOT a.attisdropped
         AND a.atttypid = expected.tipo_oid
         AND a.attnotnull = expected.no_nula
    ) THEN
      RAISE EXCEPTION 'Preflight fallido: %.% es incompatible', expected.tabla, expected.columna;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
     WHERE c.conrelid = 'public.clientes'::pg_catalog.regclass
       AND c.contype = 'p' AND c.convalidated
       AND c.conkey = ARRAY[
         (SELECT a.attnum FROM pg_catalog.pg_attribute a
           WHERE a.attrelid = c.conrelid AND a.attname = 'id'
             AND a.attnum > 0 AND NOT a.attisdropped)
       ]::SMALLINT[]
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
     WHERE c.conrelid = 'public.empresas'::pg_catalog.regclass
       AND c.contype = 'p' AND c.convalidated
       AND c.conkey = ARRAY[
         (SELECT a.attnum FROM pg_catalog.pg_attribute a
           WHERE a.attrelid = c.conrelid AND a.attname = 'id'
             AND a.attnum > 0 AND NOT a.attisdropped)
       ]::SMALLINT[]
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
     WHERE c.conrelid = 'public.usuarios'::pg_catalog.regclass
       AND c.contype = 'p' AND c.convalidated
       AND c.conkey = ARRAY[
         (SELECT a.attnum FROM pg_catalog.pg_attribute a
           WHERE a.attrelid = c.conrelid AND a.attname = 'id'
             AND a.attnum > 0 AND NOT a.attisdropped)
       ]::SMALLINT[]
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: PK de clientes, empresas o usuarios incompatible';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
     WHERE c.conrelid = 'public.matriz_empresa_version'::pg_catalog.regclass
       AND c.contype = 'u' AND c.convalidated
       AND c.conkey = ARRAY[
         (SELECT a.attnum FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.conrelid AND a.attname='id'),
         (SELECT a.attnum FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.conrelid AND a.attname='empresa_id')
       ]::SMALLINT[]
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: falta UNIQUE matriz_empresa_version(id, empresa_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.matriz_opcion
     WHERE puntaje NOT IN (1, 2, 3)
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: matriz_opcion contiene puntajes fuera de 1,2,3';
  END IF;
END
$$;

ALTER TABLE public.clientes
  ADD CONSTRAINT uq_clientes_id_empresa_pt UNIQUE (id, empresa_id);

ALTER TABLE public.matriz_criterio
  ADD CONSTRAINT uq_matriz_criterio_id_version_ambito_orden_pt
    UNIQUE (id, matriz_version_id, ambito, orden);

ALTER TABLE public.matriz_opcion
  ADD CONSTRAINT uq_matriz_opcion_id_criterio_puntaje_pt
    UNIQUE (id, criterio_id, puntaje);

ALTER TABLE public.matriz_resultado
  ADD CONSTRAINT uq_matriz_resultado_id_version_ambito_pt
    UNIQUE (id, matriz_version_id, ambito);

CREATE TABLE public.cliente_pt_evaluacion (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY,
  cliente_id INTEGER NOT NULL,
  empresa_id INTEGER NOT NULL,
  matriz_version_id INTEGER NOT NULL,
  ambito VARCHAR(2) NOT NULL DEFAULT 'PT',
  numero_version INTEGER NOT NULL,
  puntaje_total INTEGER NOT NULL,
  matriz_resultado_id INTEGER NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'COMPLETADA',
  creada_por INTEGER NOT NULL,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT pk_cliente_pt_evaluacion PRIMARY KEY (id),
  CONSTRAINT uq_cliente_pt_evaluacion_cliente_version
    UNIQUE (cliente_id, numero_version),
  CONSTRAINT uq_cliente_pt_evaluacion_id_matriz_ambito
    UNIQUE (id, matriz_version_id, ambito),
  CONSTRAINT fk_cliente_pt_evaluacion_cliente_empresa
    FOREIGN KEY (cliente_id, empresa_id)
    REFERENCES public.clientes (id, empresa_id) ON DELETE RESTRICT,
  CONSTRAINT fk_cliente_pt_evaluacion_empresa
    FOREIGN KEY (empresa_id)
    REFERENCES public.empresas (id) ON DELETE RESTRICT,
  CONSTRAINT fk_cliente_pt_evaluacion_matriz_empresa
    FOREIGN KEY (matriz_version_id, empresa_id)
    REFERENCES public.matriz_empresa_version (id, empresa_id) ON DELETE RESTRICT,
  CONSTRAINT fk_cliente_pt_evaluacion_resultado_matriz_ambito
    FOREIGN KEY (matriz_resultado_id, matriz_version_id, ambito)
    REFERENCES public.matriz_resultado (id, matriz_version_id, ambito) ON DELETE RESTRICT,
  CONSTRAINT fk_cliente_pt_evaluacion_creada_por
    FOREIGN KEY (creada_por)
    REFERENCES public.usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT ck_cliente_pt_evaluacion_ambito CHECK (ambito = 'PT'),
  CONSTRAINT ck_cliente_pt_evaluacion_numero_version CHECK (numero_version > 0),
  CONSTRAINT ck_cliente_pt_evaluacion_puntaje_total CHECK (puntaje_total > 0),
  CONSTRAINT ck_cliente_pt_evaluacion_estado CHECK (estado = 'COMPLETADA')
);

CREATE INDEX idx_cliente_pt_evaluacion_empresa
  ON public.cliente_pt_evaluacion (empresa_id);

CREATE INDEX idx_cliente_pt_evaluacion_matriz
  ON public.cliente_pt_evaluacion (matriz_version_id);

CREATE INDEX idx_cliente_pt_evaluacion_resultado
  ON public.cliente_pt_evaluacion (matriz_resultado_id);

CREATE INDEX idx_cliente_pt_evaluacion_creada_por
  ON public.cliente_pt_evaluacion (creada_por);

CREATE TABLE public.cliente_pt_respuesta (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY,
  evaluacion_id BIGINT NOT NULL,
  matriz_version_id INTEGER NOT NULL,
  ambito VARCHAR(2) NOT NULL DEFAULT 'PT',
  matriz_criterio_id INTEGER NOT NULL,
  matriz_opcion_id INTEGER NOT NULL,
  puntaje NUMERIC NOT NULL,
  orden INTEGER NOT NULL,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT pk_cliente_pt_respuesta PRIMARY KEY (id),
  CONSTRAINT uq_cliente_pt_respuesta_evaluacion_criterio
    UNIQUE (evaluacion_id, matriz_criterio_id),
  CONSTRAINT fk_cliente_pt_respuesta_evaluacion_matriz_ambito
    FOREIGN KEY (evaluacion_id, matriz_version_id, ambito)
    REFERENCES public.cliente_pt_evaluacion (id, matriz_version_id, ambito)
    ON DELETE RESTRICT,
  CONSTRAINT fk_cliente_pt_respuesta_criterio_matriz_ambito
    FOREIGN KEY (matriz_criterio_id, matriz_version_id, ambito, orden)
    REFERENCES public.matriz_criterio (id, matriz_version_id, ambito, orden)
    ON DELETE RESTRICT,
  CONSTRAINT fk_cliente_pt_respuesta_opcion_criterio_puntaje
    FOREIGN KEY (matriz_opcion_id, matriz_criterio_id, puntaje)
    REFERENCES public.matriz_opcion (id, criterio_id, puntaje)
    ON DELETE RESTRICT,
  CONSTRAINT ck_cliente_pt_respuesta_ambito CHECK (ambito = 'PT'),
  CONSTRAINT ck_cliente_pt_respuesta_puntaje CHECK (puntaje IN (1, 2, 3)),
  CONSTRAINT ck_cliente_pt_respuesta_orden CHECK (orden > 0)
);

CREATE INDEX idx_cliente_pt_respuesta_criterio
  ON public.cliente_pt_respuesta (matriz_criterio_id);

CREATE INDEX idx_cliente_pt_respuesta_opcion
  ON public.cliente_pt_respuesta (matriz_opcion_id);

INSERT INTO public.schema_migrations (migration_key)
VALUES ('20260815_009_cliente_pt_evaluacion_matriz');

COMMIT;
