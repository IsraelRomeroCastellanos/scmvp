BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtext('20260812_005_catalogos_canonicos_matriz')
);

DO $$
DECLARE
  objeto TEXT;
  columna TEXT;
  esperado RECORD;
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Esquema invalido: se esperaba public y se obtuvo %', pg_catalog.current_schema();
  END IF;

  FOREACH objeto IN ARRAY ARRAY[
    'public.schema_migrations',
    'public.usuarios',
    'public.matriz_empresa_version',
    'public.matriz_criterio',
    'public.matriz_opcion',
    'public.matriz_rango',
    'public.matriz_archivo_fuente',
    'public.matriz_auditoria_evento',
    'public.matriz_idempotencia',
    'public.matriz_resultado'
  ] LOOP
    IF pg_catalog.to_regclass(objeto) IS NULL THEN
      RAISE EXCEPTION 'Preflight fallido: falta %', objeto;
    END IF;
  END LOOP;

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
    WHERE migration_key = '20260801_002_matrices_pt_gr_empresa'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260805_003_gestion_matrices_empresa'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260810_004_resultados_globales_matriz'
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: se requieren las migraciones 002, 003 y 004 registradas';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260812_005_catalogos_canonicos_matriz'
  ) THEN
    RAISE EXCEPTION 'La migracion 20260812_005_catalogos_canonicos_matriz ya esta registrada';
  END IF;

  FOREACH objeto IN ARRAY ARRAY[
    'public.catalogo_criterio_pt',
    'public.catalogo_criterio_pt_version',
    'public.catalogo_criterio_gr',
    'public.catalogo_criterio_gr_version',
    'public.fn_catalogo_criterio_codigo_inmutable',
    'public.fn_catalogo_criterio_version_inmutable',
    'public.fn_catalogo_criterio_vigencia_diferida'
  ] LOOP
    IF pg_catalog.to_regclass(objeto) IS NOT NULL
       OR pg_catalog.to_regprocedure(objeto || '()') IS NOT NULL THEN
      RAISE EXCEPTION 'Estado parcial o incompatible: ya existe %', objeto;
    END IF;
  END LOOP;

  FOR esperado IN
    SELECT * FROM (VALUES
      ('catalogo_criterio_pt','trg_catalogo_criterio_pt_vigencia_diferida'),
      ('catalogo_criterio_gr','trg_catalogo_criterio_gr_vigencia_diferida')
    ) AS t(tabla, nombre)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_trigger tr
      JOIN pg_catalog.pg_class t ON t.oid=tr.tgrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public' AND t.relname=esperado.tabla
        AND tr.tgname=esperado.nombre AND NOT tr.tgisinternal
    ) THEN
      RAISE EXCEPTION 'Estado parcial: ya existe trigger public.%.%',
        esperado.tabla, esperado.nombre;
    END IF;
  END LOOP;

  FOREACH columna IN ARRAY ARRAY[
    'procedencia'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class t ON t.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public' AND t.relname = 'matriz_empresa_version'
        AND a.attname = columna AND a.attnum > 0 AND NOT a.attisdropped
    ) THEN
      RAISE EXCEPTION 'Estado parcial: ya existe public.matriz_empresa_version.%', columna;
    END IF;
  END LOOP;

  FOREACH columna IN ARRAY ARRAY[
    'catalogo_criterio_pt_version_id',
    'catalogo_criterio_gr_version_id'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class t ON t.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public' AND t.relname = 'matriz_criterio'
        AND a.attname = columna AND a.attnum > 0 AND NOT a.attisdropped
    ) THEN
      RAISE EXCEPTION 'Estado parcial: ya existe public.matriz_criterio.%', columna;
    END IF;
  END LOOP;

  FOR esperado IN
    SELECT * FROM (VALUES
      ('matriz_empresa_version','ck_matriz_empresa_version_procedencia'),
      ('matriz_criterio','fk_matriz_criterio_catalogo_pt_version'),
      ('matriz_criterio','fk_matriz_criterio_catalogo_gr_version'),
      ('matriz_criterio','ck_matriz_criterio_catalogo_ambito'),
      ('matriz_opcion','ck_matriz_opcion_puntaje_mvp'),
      ('matriz_rango','ck_matriz_rango_puntaje_mvp'),
      ('matriz_resultado','ck_matriz_resultado_minimo_positivo'),
      ('matriz_resultado','ck_matriz_resultado_maximo_positivo')
    ) AS c(tabla, nombre)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public' AND t.relname=esperado.tabla
        AND c.conname=esperado.nombre
    ) THEN
      RAISE EXCEPTION 'Estado parcial: ya existe constraint public.%.%',
        esperado.tabla, esperado.nombre;
    END IF;
  END LOOP;

  FOR esperado IN
    SELECT * FROM (VALUES
      ('ck_matriz_resultado_minimo','checkminimo>=4andminimo<=12'),
      ('ck_matriz_resultado_maximo','checkmaximo>=4andmaximo<=12')
    ) AS c(nombre, definicion_normalizada)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public' AND t.relname='matriz_resultado'
        AND c.conname=esperado.nombre AND c.contype='c' AND c.convalidated
        AND pg_catalog.regexp_replace(
              pg_catalog.lower(pg_catalog.pg_get_constraintdef(c.oid, true)),
              '(::integer|[[:space:]()])', '', 'g'
            ) = esperado.definicion_normalizada
    ) THEN
      RAISE EXCEPTION 'Preflight fallido: CHECK public.matriz_resultado.% no corresponde a 004',
        esperado.nombre;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'matriz_empresa_version'
      AND column_name = 'revision' AND data_type = 'bigint' AND is_nullable = 'NO'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'matriz_archivo_fuente'
      AND column_name = 'contenido' AND data_type = 'bytea' AND is_nullable = 'NO'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'matriz_criterio'
      AND column_name = 'ambito' AND data_type = 'character varying'
      AND character_maximum_length = 2 AND is_nullable = 'NO'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'matriz_opcion'
      AND column_name = 'puntaje' AND data_type = 'numeric' AND is_nullable = 'YES'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'matriz_rango'
      AND column_name = 'puntaje' AND data_type = 'numeric' AND is_nullable = 'YES'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'matriz_resultado'
      AND column_name = 'minimo' AND data_type = 'integer' AND is_nullable = 'NO'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'matriz_resultado'
      AND column_name = 'maximo' AND data_type = 'integer' AND is_nullable = 'NO'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'matriz_resultado'
      AND column_name = 'referencia_nombre_origen' AND data_type = 'text' AND is_nullable = 'NO'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'matriz_resultado'
      AND column_name = 'referencia_rango_origen' AND data_type = 'text' AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: columnas objetivo de 002/004 incompatibles';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.matriz_opcion
    WHERE puntaje IS NULL OR puntaje NOT IN (1, 2, 3)
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: matriz_opcion contiene puntajes NULL o fuera de 1..3';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.matriz_rango
    WHERE puntaje IS NULL OR puntaje NOT IN (1, 2, 3)
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: matriz_rango contiene puntajes NULL o fuera de 1..3';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.matriz_resultado
    WHERE minimo <= 0 OR maximo <= 0
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: matriz_resultado contiene limites no positivos';
  END IF;
END
$$;

CREATE TABLE public.catalogo_criterio_pt (
  id SERIAL,
  codigo_canonico VARCHAR(100) NOT NULL,
  nombre_visible_global VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  estado VARCHAR(10) NOT NULL DEFAULT 'ACTIVO',
  creado_por INTEGER NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  retirado_por INTEGER NULL,
  retirado_en TIMESTAMPTZ NULL,
  version_vigente_id INTEGER NULL,
  CONSTRAINT pk_catalogo_criterio_pt PRIMARY KEY (id),
  CONSTRAINT uq_catalogo_criterio_pt_codigo UNIQUE (codigo_canonico),
  CONSTRAINT fk_catalogo_criterio_pt_creado_por
    FOREIGN KEY (creado_por) REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  CONSTRAINT fk_catalogo_criterio_pt_retirado_por
    FOREIGN KEY (retirado_por) REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  CONSTRAINT ck_catalogo_criterio_pt_codigo
    CHECK (codigo_canonico COLLATE "C" ~ '^[A-Z][A-Z0-9_]{0,99}$'),
  CONSTRAINT ck_catalogo_criterio_pt_nombre
    CHECK (pg_catalog.length(nombre_visible_global) BETWEEN 1 AND 150),
  CONSTRAINT ck_catalogo_criterio_pt_estado
    CHECK (estado IN ('ACTIVO', 'RETIRADO')),
  CONSTRAINT ck_catalogo_criterio_pt_retiro
    CHECK (
      (estado = 'ACTIVO' AND retirado_por IS NULL AND retirado_en IS NULL)
      OR (estado = 'RETIRADO' AND retirado_por IS NOT NULL
          AND retirado_en IS NOT NULL AND version_vigente_id IS NULL)
    )
);

CREATE TABLE public.catalogo_criterio_pt_version (
  id SERIAL,
  criterio_pt_id INTEGER NOT NULL,
  version_contrato INTEGER NOT NULL,
  tipo_resolucion VARCHAR(30) NOT NULL,
  tipo_parametrizacion VARCHAR(30) NOT NULL,
  unidad_canonica VARCHAR(100) NULL,
  creado_por INTEGER NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT pk_catalogo_criterio_pt_version PRIMARY KEY (id),
  CONSTRAINT uq_catalogo_criterio_pt_version_id_criterio UNIQUE (id, criterio_pt_id),
  CONSTRAINT uq_catalogo_criterio_pt_version UNIQUE (criterio_pt_id, version_contrato),
  CONSTRAINT fk_catalogo_criterio_pt_version_criterio
    FOREIGN KEY (criterio_pt_id) REFERENCES public.catalogo_criterio_pt(id) ON DELETE RESTRICT,
  CONSTRAINT fk_catalogo_criterio_pt_version_creado_por
    FOREIGN KEY (creado_por) REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  CONSTRAINT ck_catalogo_criterio_pt_version_numero CHECK (version_contrato > 0),
  CONSTRAINT ck_catalogo_criterio_pt_version_resolucion
    CHECK (tipo_resolucion IN ('CAPTURA_OPCIONES', 'CAPTURA_RANGO_NUMERICO')),
  CONSTRAINT ck_catalogo_criterio_pt_version_parametrizacion
    CHECK (
      (tipo_resolucion = 'CAPTURA_OPCIONES'
       AND tipo_parametrizacion = 'OPCIONES' AND unidad_canonica IS NULL)
      OR
      (tipo_resolucion = 'CAPTURA_RANGO_NUMERICO'
       AND tipo_parametrizacion = 'RANGOS_NUMERICOS'
       AND unidad_canonica IS NOT NULL
       AND unidad_canonica COLLATE "C" ~ '^[A-Z][A-Z0-9_]{0,99}$')
    )
);

ALTER TABLE public.catalogo_criterio_pt
  ADD CONSTRAINT fk_catalogo_criterio_pt_version_vigente
    FOREIGN KEY (version_vigente_id, id)
    REFERENCES public.catalogo_criterio_pt_version(id, criterio_pt_id)
    ON DELETE RESTRICT;

CREATE INDEX idx_catalogo_criterio_pt_estado
  ON public.catalogo_criterio_pt (estado);

CREATE INDEX idx_catalogo_criterio_pt_version_vigente
  ON public.catalogo_criterio_pt (version_vigente_id);

CREATE INDEX idx_catalogo_criterio_pt_version_creado_por
  ON public.catalogo_criterio_pt_version (creado_por);

CREATE TABLE public.catalogo_criterio_gr (
  id SERIAL,
  codigo_canonico VARCHAR(100) NOT NULL,
  nombre_visible_global VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  estado VARCHAR(10) NOT NULL DEFAULT 'ACTIVO',
  creado_por INTEGER NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  retirado_por INTEGER NULL,
  retirado_en TIMESTAMPTZ NULL,
  version_vigente_id INTEGER NULL,
  CONSTRAINT pk_catalogo_criterio_gr PRIMARY KEY (id),
  CONSTRAINT uq_catalogo_criterio_gr_codigo UNIQUE (codigo_canonico),
  CONSTRAINT fk_catalogo_criterio_gr_creado_por
    FOREIGN KEY (creado_por) REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  CONSTRAINT fk_catalogo_criterio_gr_retirado_por
    FOREIGN KEY (retirado_por) REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  CONSTRAINT ck_catalogo_criterio_gr_codigo
    CHECK (codigo_canonico COLLATE "C" ~ '^[A-Z][A-Z0-9_]{0,99}$'),
  CONSTRAINT ck_catalogo_criterio_gr_nombre
    CHECK (pg_catalog.length(nombre_visible_global) BETWEEN 1 AND 150),
  CONSTRAINT ck_catalogo_criterio_gr_estado
    CHECK (estado IN ('ACTIVO', 'RETIRADO')),
  CONSTRAINT ck_catalogo_criterio_gr_retiro
    CHECK (
      (estado = 'ACTIVO' AND retirado_por IS NULL AND retirado_en IS NULL)
      OR (estado = 'RETIRADO' AND retirado_por IS NOT NULL
          AND retirado_en IS NOT NULL AND version_vigente_id IS NULL)
    )
);

CREATE TABLE public.catalogo_criterio_gr_version (
  id SERIAL,
  criterio_gr_id INTEGER NOT NULL,
  version_contrato INTEGER NOT NULL,
  tipo_resolucion VARCHAR(30) NOT NULL,
  resolver_codigo VARCHAR(100) NOT NULL,
  tipo_parametrizacion VARCHAR(30) NOT NULL,
  unidad_canonica VARCHAR(100) NULL,
  creado_por INTEGER NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT pk_catalogo_criterio_gr_version PRIMARY KEY (id),
  CONSTRAINT uq_catalogo_criterio_gr_version_id_criterio UNIQUE (id, criterio_gr_id),
  CONSTRAINT uq_catalogo_criterio_gr_version UNIQUE (criterio_gr_id, version_contrato),
  CONSTRAINT fk_catalogo_criterio_gr_version_criterio
    FOREIGN KEY (criterio_gr_id) REFERENCES public.catalogo_criterio_gr(id) ON DELETE RESTRICT,
  CONSTRAINT fk_catalogo_criterio_gr_version_creado_por
    FOREIGN KEY (creado_por) REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  CONSTRAINT ck_catalogo_criterio_gr_version_numero CHECK (version_contrato > 0),
  CONSTRAINT ck_catalogo_criterio_gr_version_resolucion
    CHECK (tipo_resolucion IN ('KYC_RANGO', 'CATALOGO_GLOBAL', 'DERIVADO', 'ESTRUCTURADO')),
  CONSTRAINT ck_catalogo_criterio_gr_version_resolver
    CHECK (resolver_codigo COLLATE "C" ~ '^[A-Z][A-Z0-9_]{0,99}$'),
  CONSTRAINT ck_catalogo_criterio_gr_version_parametrizacion
    CHECK (
      (tipo_resolucion = 'KYC_RANGO'
       AND tipo_parametrizacion = 'RANGOS_NUMERICOS'
       AND unidad_canonica IS NOT NULL
       AND unidad_canonica COLLATE "C" ~ '^[A-Z][A-Z0-9_]{0,99}$')
      OR
      (tipo_resolucion IN ('CATALOGO_GLOBAL', 'DERIVADO', 'ESTRUCTURADO')
       AND tipo_parametrizacion = 'NINGUNA' AND unidad_canonica IS NULL)
    )
);

ALTER TABLE public.catalogo_criterio_gr
  ADD CONSTRAINT fk_catalogo_criterio_gr_version_vigente
    FOREIGN KEY (version_vigente_id, id)
    REFERENCES public.catalogo_criterio_gr_version(id, criterio_gr_id)
    ON DELETE RESTRICT;

CREATE INDEX idx_catalogo_criterio_gr_estado
  ON public.catalogo_criterio_gr (estado);

CREATE INDEX idx_catalogo_criterio_gr_version_vigente
  ON public.catalogo_criterio_gr (version_vigente_id);

CREATE INDEX idx_catalogo_criterio_gr_version_creado_por
  ON public.catalogo_criterio_gr_version (creado_por);

CREATE FUNCTION public.fn_catalogo_criterio_codigo_inmutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.codigo_canonico IS DISTINCT FROM OLD.codigo_canonico THEN
    RAISE EXCEPTION 'El codigo canonico es inmutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_catalogo_criterio_pt_codigo_inmutable
BEFORE UPDATE ON public.catalogo_criterio_pt
FOR EACH ROW
EXECUTE FUNCTION public.fn_catalogo_criterio_codigo_inmutable();

CREATE TRIGGER trg_catalogo_criterio_gr_codigo_inmutable
BEFORE UPDATE ON public.catalogo_criterio_gr
FOR EACH ROW
EXECUTE FUNCTION public.fn_catalogo_criterio_codigo_inmutable();

CREATE FUNCTION public.fn_catalogo_criterio_version_inmutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'Las versiones contractuales son inmutables';
END;
$$;

CREATE FUNCTION public.fn_catalogo_criterio_vigencia_diferida()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
  estado_actual TEXT;
  version_actual INTEGER;
BEGIN
  IF TG_TABLE_SCHEMA = 'public' AND TG_TABLE_NAME = 'catalogo_criterio_pt' THEN
    SELECT estado, version_vigente_id
      INTO estado_actual, version_actual
      FROM public.catalogo_criterio_pt
      WHERE id = NEW.id;
  ELSIF TG_TABLE_SCHEMA = 'public' AND TG_TABLE_NAME = 'catalogo_criterio_gr' THEN
    SELECT estado, version_vigente_id
      INTO estado_actual, version_actual
      FROM public.catalogo_criterio_gr
      WHERE id = NEW.id;
  ELSE
    RAISE EXCEPTION 'Tabla no soportada para validar vigencia canonica';
  END IF;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF (estado_actual = 'ACTIVO' AND version_actual IS NULL)
     OR (estado_actual = 'RETIRADO' AND version_actual IS NOT NULL) THEN
    RAISE EXCEPTION 'Estado y version vigente del criterio canonico son incompatibles';
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_catalogo_criterio_pt_vigencia_diferida
AFTER INSERT OR UPDATE ON public.catalogo_criterio_pt
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.fn_catalogo_criterio_vigencia_diferida();

CREATE CONSTRAINT TRIGGER trg_catalogo_criterio_gr_vigencia_diferida
AFTER INSERT OR UPDATE ON public.catalogo_criterio_gr
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.fn_catalogo_criterio_vigencia_diferida();

CREATE TRIGGER trg_catalogo_criterio_pt_version_inmutable
BEFORE UPDATE OR DELETE ON public.catalogo_criterio_pt_version
FOR EACH ROW
EXECUTE FUNCTION public.fn_catalogo_criterio_version_inmutable();

CREATE TRIGGER trg_catalogo_criterio_gr_version_inmutable
BEFORE UPDATE OR DELETE ON public.catalogo_criterio_gr_version
FOR EACH ROW
EXECUTE FUNCTION public.fn_catalogo_criterio_version_inmutable();

ALTER TABLE public.matriz_empresa_version
  ADD COLUMN procedencia VARCHAR(20) NULL,
  ADD CONSTRAINT ck_matriz_empresa_version_procedencia
    CHECK (procedencia IN ('CREADA_EN_SISTEMA', 'IMPORTADA_XLSX'));

ALTER TABLE public.matriz_criterio
  ADD COLUMN catalogo_criterio_pt_version_id INTEGER NULL,
  ADD COLUMN catalogo_criterio_gr_version_id INTEGER NULL,
  ADD CONSTRAINT fk_matriz_criterio_catalogo_pt_version
    FOREIGN KEY (catalogo_criterio_pt_version_id)
    REFERENCES public.catalogo_criterio_pt_version(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_matriz_criterio_catalogo_gr_version
    FOREIGN KEY (catalogo_criterio_gr_version_id)
    REFERENCES public.catalogo_criterio_gr_version(id) ON DELETE RESTRICT,
  ADD CONSTRAINT ck_matriz_criterio_catalogo_ambito CHECK (
    (catalogo_criterio_pt_version_id IS NULL OR ambito = 'PT')
    AND (catalogo_criterio_gr_version_id IS NULL OR ambito = 'GR')
    AND NOT (
      catalogo_criterio_pt_version_id IS NOT NULL
      AND catalogo_criterio_gr_version_id IS NOT NULL
    )
  );

CREATE INDEX idx_matriz_criterio_catalogo_pt_version
  ON public.matriz_criterio (catalogo_criterio_pt_version_id);

CREATE INDEX idx_matriz_criterio_catalogo_gr_version
  ON public.matriz_criterio (catalogo_criterio_gr_version_id);

ALTER TABLE public.matriz_opcion
  ALTER COLUMN puntaje SET NOT NULL,
  ADD CONSTRAINT ck_matriz_opcion_puntaje_mvp CHECK (puntaje IN (1, 2, 3));

ALTER TABLE public.matriz_rango
  ALTER COLUMN puntaje SET NOT NULL,
  ADD CONSTRAINT ck_matriz_rango_puntaje_mvp CHECK (puntaje IN (1, 2, 3));

ALTER TABLE public.matriz_resultado
  DROP CONSTRAINT ck_matriz_resultado_minimo,
  DROP CONSTRAINT ck_matriz_resultado_maximo,
  ALTER COLUMN referencia_nombre_origen DROP NOT NULL,
  ALTER COLUMN referencia_rango_origen DROP NOT NULL,
  ADD CONSTRAINT ck_matriz_resultado_minimo_positivo CHECK (minimo > 0),
  ADD CONSTRAINT ck_matriz_resultado_maximo_positivo CHECK (maximo > 0);

INSERT INTO public.schema_migrations (migration_key)
VALUES ('20260812_005_catalogos_canonicos_matriz');

COMMIT;
