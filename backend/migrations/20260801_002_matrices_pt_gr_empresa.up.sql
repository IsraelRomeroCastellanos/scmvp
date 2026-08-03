BEGIN;

SELECT pg_advisory_xact_lock(
  hashtext('20260801_002_matrices_pt_gr_empresa')
);

DO $$
DECLARE
  objeto TEXT;
BEGIN
  IF current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Esquema inválido: se esperaba public y se obtuvo %', current_schema();
  END IF;

  FOREACH objeto IN ARRAY ARRAY[
    'public.schema_migrations',
    'public.empresas',
    'public.usuarios'
  ] LOOP
    IF to_regclass(objeto) IS NULL THEN
      RAISE EXCEPTION 'Preflight fallido: falta %', objeto;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'schema_migrations'
      AND column_name = 'migration_key'
      AND data_type = 'character varying'
      AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'schema_migrations tiene estructura incompatible';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.schema_migrations
    WHERE migration_key = '20260728_001_modelo_integral_actividades_vulnerables'
  ) THEN
    RAISE EXCEPTION
      'Dependencia faltante: 20260728_001_modelo_integral_actividades_vulnerables';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.schema_migrations
    WHERE migration_key = '20260801_002_matrices_pt_gr_empresa'
  ) THEN
    RAISE EXCEPTION 'La migración 20260801_002_matrices_pt_gr_empresa ya está registrada';
  END IF;

  FOREACH objeto IN ARRAY ARRAY[
    'public.matriz_empresa_version',
    'public.matriz_criterio',
    'public.matriz_opcion',
    'public.matriz_rango',
    'public.matriz_regla',
    'public.matriz_archivo_fuente'
  ] LOOP
    IF to_regclass(objeto) IS NOT NULL THEN
      RAISE EXCEPTION 'Estado parcial o incompatible: ya existe %', objeto;
    END IF;
  END LOOP;
END
$$;

CREATE TABLE public.matriz_empresa_version (
  id SERIAL,
  empresa_id INTEGER NOT NULL,
  numero_version INTEGER NOT NULL,
  estado_editorial VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
  activa BOOLEAN NOT NULL DEFAULT FALSE,
  creada_por INTEGER NOT NULL,
  validada_por INTEGER NULL,
  publicada_por INTEGER NULL,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validada_en TIMESTAMPTZ NULL,
  publicada_en TIMESTAMPTZ NULL,
  reporte_validacion JSONB NULL,
  version_origen_id INTEGER NULL,
  motivo_nueva_version TEXT NULL,
  CONSTRAINT pk_matriz_empresa_version PRIMARY KEY (id),
  CONSTRAINT fk_matriz_empresa_version_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT,
  CONSTRAINT fk_matriz_empresa_version_creada_por
    FOREIGN KEY (creada_por) REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  CONSTRAINT fk_matriz_empresa_version_validada_por
    FOREIGN KEY (validada_por) REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  CONSTRAINT fk_matriz_empresa_version_publicada_por
    FOREIGN KEY (publicada_por) REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  CONSTRAINT fk_matriz_empresa_version_origen
    FOREIGN KEY (version_origen_id)
    REFERENCES public.matriz_empresa_version(id) ON DELETE RESTRICT,
  CONSTRAINT uq_matriz_empresa_version_empresa_numero
    UNIQUE (empresa_id, numero_version),
  CONSTRAINT ck_matriz_empresa_version_numero
    CHECK (numero_version > 0),
  CONSTRAINT ck_matriz_empresa_version_estado
    CHECK (estado_editorial IN ('BORRADOR', 'VALIDADA', 'PUBLICADA')),
  CONSTRAINT ck_matriz_empresa_version_activa_publicada
    CHECK (NOT activa OR estado_editorial = 'PUBLICADA'),
  CONSTRAINT ck_matriz_empresa_version_origen_distinto
    CHECK (version_origen_id IS NULL OR version_origen_id <> id)
);

CREATE UNIQUE INDEX uq_matriz_empresa_version_activa_empresa
  ON public.matriz_empresa_version (empresa_id)
  WHERE activa = TRUE;

CREATE INDEX idx_matriz_empresa_version_estado
  ON public.matriz_empresa_version (empresa_id, estado_editorial);

CREATE INDEX idx_matriz_empresa_version_origen
  ON public.matriz_empresa_version (version_origen_id);

CREATE INDEX idx_matriz_empresa_version_creada_por
  ON public.matriz_empresa_version (creada_por);

CREATE INDEX idx_matriz_empresa_version_validada_por
  ON public.matriz_empresa_version (validada_por);

CREATE INDEX idx_matriz_empresa_version_publicada_por
  ON public.matriz_empresa_version (publicada_por);

CREATE TABLE public.matriz_criterio (
  id SERIAL,
  matriz_version_id INTEGER NOT NULL,
  codigo VARCHAR(100) NOT NULL,
  ambito VARCHAR(2) NOT NULL,
  texto TEXT NOT NULL,
  orden INTEGER NOT NULL,
  fuente_dato VARCHAR(100) NULL,
  suma_perfil BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_matriz_criterio PRIMARY KEY (id),
  CONSTRAINT fk_matriz_criterio_version
    FOREIGN KEY (matriz_version_id)
    REFERENCES public.matriz_empresa_version(id) ON DELETE CASCADE,
  CONSTRAINT uq_matriz_criterio_version_codigo
    UNIQUE (matriz_version_id, codigo),
  CONSTRAINT uq_matriz_criterio_version_ambito_orden
    UNIQUE (matriz_version_id, ambito, orden),
  CONSTRAINT uq_matriz_criterio_id_version
    UNIQUE (id, matriz_version_id),
  CONSTRAINT ck_matriz_criterio_ambito CHECK (ambito IN ('PT', 'GR')),
  CONSTRAINT ck_matriz_criterio_orden CHECK (orden > 0)
);

CREATE INDEX idx_matriz_criterio_version
  ON public.matriz_criterio (matriz_version_id);

CREATE TABLE public.matriz_opcion (
  id SERIAL,
  criterio_id INTEGER NOT NULL,
  codigo VARCHAR(100) NOT NULL,
  etiqueta TEXT NOT NULL,
  puntaje NUMERIC NULL,
  orden INTEGER NOT NULL,
  referencia_origen TEXT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_matriz_opcion PRIMARY KEY (id),
  CONSTRAINT fk_matriz_opcion_criterio
    FOREIGN KEY (criterio_id)
    REFERENCES public.matriz_criterio(id) ON DELETE CASCADE,
  CONSTRAINT uq_matriz_opcion_criterio_codigo UNIQUE (criterio_id, codigo),
  CONSTRAINT uq_matriz_opcion_criterio_orden UNIQUE (criterio_id, orden),
  CONSTRAINT ck_matriz_opcion_orden CHECK (orden > 0)
);

CREATE INDEX idx_matriz_opcion_criterio
  ON public.matriz_opcion (criterio_id);

CREATE TABLE public.matriz_rango (
  id SERIAL,
  criterio_id INTEGER NOT NULL,
  codigo VARCHAR(100) NOT NULL,
  unidad VARCHAR(30) NOT NULL,
  minimo NUMERIC NULL,
  maximo NUMERIC NULL,
  minimo_incluido BOOLEAN NOT NULL DEFAULT TRUE,
  maximo_incluido BOOLEAN NOT NULL DEFAULT TRUE,
  puntaje NUMERIC NULL,
  resultado_codigo VARCHAR(100) NULL,
  orden INTEGER NOT NULL,
  referencia_origen TEXT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_matriz_rango PRIMARY KEY (id),
  CONSTRAINT fk_matriz_rango_criterio
    FOREIGN KEY (criterio_id)
    REFERENCES public.matriz_criterio(id) ON DELETE CASCADE,
  CONSTRAINT uq_matriz_rango_criterio_codigo UNIQUE (criterio_id, codigo),
  CONSTRAINT uq_matriz_rango_criterio_orden UNIQUE (criterio_id, orden),
  CONSTRAINT ck_matriz_rango_unidad CHECK (
    unidad IN ('EDAD_ANIOS', 'ANTIGUEDAD_MESES', 'MONTO', 'PUNTAJE', 'OTRA')
  ),
  CONSTRAINT ck_matriz_rango_limites
    CHECK (minimo IS NULL OR maximo IS NULL OR minimo <= maximo),
  CONSTRAINT ck_matriz_rango_orden CHECK (orden > 0)
);

CREATE INDEX idx_matriz_rango_criterio
  ON public.matriz_rango (criterio_id);

CREATE TABLE public.matriz_regla (
  id SERIAL,
  matriz_version_id INTEGER NOT NULL,
  criterio_id INTEGER NULL,
  codigo VARCHAR(100) NOT NULL,
  marca_canonica VARCHAR(100) NULL,
  condicion_controlada VARCHAR(100) NULL,
  puntaje NUMERIC NULL,
  prioridad INTEGER NOT NULL DEFAULT 0,
  alto_automatico BOOLEAN NOT NULL DEFAULT FALSE,
  causa_codigo VARCHAR(100) NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_matriz_regla PRIMARY KEY (id),
  CONSTRAINT fk_matriz_regla_version
    FOREIGN KEY (matriz_version_id)
    REFERENCES public.matriz_empresa_version(id) ON DELETE CASCADE,
  CONSTRAINT fk_matriz_regla_criterio_version
    FOREIGN KEY (criterio_id, matriz_version_id)
    REFERENCES public.matriz_criterio(id, matriz_version_id) ON DELETE CASCADE,
  CONSTRAINT uq_matriz_regla_version_codigo UNIQUE (matriz_version_id, codigo),
  CONSTRAINT ck_matriz_regla_condicion
    CHECK (marca_canonica IS NOT NULL OR condicion_controlada IS NOT NULL),
  CONSTRAINT ck_matriz_regla_prioridad CHECK (prioridad >= 0)
);

CREATE INDEX idx_matriz_regla_version
  ON public.matriz_regla (matriz_version_id);

CREATE INDEX idx_matriz_regla_criterio
  ON public.matriz_regla (criterio_id);

CREATE TABLE public.matriz_archivo_fuente (
  id SERIAL,
  matriz_version_id INTEGER NOT NULL,
  nombre_original TEXT NOT NULL,
  mime_detectado VARCHAR(255) NOT NULL,
  tamano_bytes BIGINT NOT NULL,
  sha256 CHAR(64) NOT NULL,
  referencia_contenido TEXT NULL,
  cargado_por INTEGER NOT NULL,
  cargado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_matriz_archivo_fuente PRIMARY KEY (id),
  CONSTRAINT fk_matriz_archivo_fuente_version
    FOREIGN KEY (matriz_version_id)
    REFERENCES public.matriz_empresa_version(id) ON DELETE RESTRICT,
  CONSTRAINT fk_matriz_archivo_fuente_cargado_por
    FOREIGN KEY (cargado_por) REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  CONSTRAINT uq_matriz_archivo_fuente_version UNIQUE (matriz_version_id),
  CONSTRAINT ck_matriz_archivo_fuente_tamano CHECK (tamano_bytes > 0),
  CONSTRAINT ck_matriz_archivo_fuente_sha256
    CHECK (sha256 ~ '^[0-9a-f]{64}$')
);

CREATE INDEX idx_matriz_archivo_fuente_cargado_por
  ON public.matriz_archivo_fuente (cargado_por);

INSERT INTO public.schema_migrations (migration_key)
VALUES ('20260801_002_matrices_pt_gr_empresa');

COMMIT;
