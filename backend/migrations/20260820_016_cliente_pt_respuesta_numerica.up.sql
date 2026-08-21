BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtext('20260820_016_cliente_pt_respuesta_numerica')
);

DO $$
DECLARE
  required_table TEXT;
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Esquema invalido: se esperaba public';
  END IF;
  FOREACH required_table IN ARRAY ARRAY[
    'public.schema_migrations', 'public.cliente_pt_respuesta',
    'public.matriz_opcion', 'public.matriz_rango'
  ] LOOP
    IF pg_catalog.to_regclass(required_table) IS NULL THEN
      RAISE EXCEPTION 'Preflight fallido: falta %', required_table;
    END IF;
  END LOOP;
  IF NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260820_015_monto_pt_v2'
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: se requiere la migracion 015';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260820_016_cliente_pt_respuesta_numerica'
  ) THEN
    RAISE EXCEPTION 'La migracion 016 ya esta registrada';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.cliente_pt_respuesta'::pg_catalog.regclass
      AND attname IN ('matriz_rango_id', 'valor_numerico', 'unidad')
      AND attnum > 0 AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: existen columnas parciales de respuesta numerica';
  END IF;
  IF (
    SELECT pg_catalog.count(*)
    FROM (VALUES
      ('matriz_opcion_id','pg_catalog.int4'::pg_catalog.regtype,true),
      ('matriz_criterio_id','pg_catalog.int4'::pg_catalog.regtype,true),
      ('puntaje','pg_catalog.numeric'::pg_catalog.regtype,true)
    ) expected(nombre,tipo,no_nula)
    JOIN pg_catalog.pg_attribute a
      ON a.attrelid='public.cliente_pt_respuesta'::pg_catalog.regclass
     AND a.attname=expected.nombre AND a.attnum>0 AND NOT a.attisdropped
     AND a.atttypid=expected.tipo AND a.attnotnull=expected.no_nula
  ) <> 3 OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.cliente_pt_respuesta'::pg_catalog.regclass
      AND c.conname = 'fk_cliente_pt_respuesta_opcion_criterio_puntaje'
      AND c.confrelid = 'public.matriz_opcion'::pg_catalog.regclass
      AND c.contype = 'f' AND c.convalidated
      AND c.confupdtype = 'a' AND c.confdeltype = 'r' AND c.confmatchtype = 's'
      AND c.conkey = ARRAY[
        (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=c.conrelid AND attname='matriz_opcion_id'),
        (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=c.conrelid AND attname='matriz_criterio_id'),
        (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=c.conrelid AND attname='puntaje')
      ]::SMALLINT[]
      AND c.confkey = ARRAY[
        (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=c.confrelid AND attname='id'),
        (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=c.confrelid AND attname='criterio_id'),
        (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=c.confrelid AND attname='puntaje')
      ]::SMALLINT[]
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: contrato historico de respuestas por opcion incompatible';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.cliente_pt_respuesta WHERE matriz_opcion_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: existe una respuesta historica sin opcion';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conname IN (
      'uq_matriz_rango_id_criterio_puntaje_unidad_pt',
      'fk_cliente_pt_respuesta_rango_criterio_puntaje_unidad',
      'ck_cliente_pt_respuesta_tipo'
    )
  ) OR pg_catalog.to_regprocedure(
    'public.validar_cliente_pt_respuesta_rango()'
  ) IS NOT NULL THEN
    RAISE EXCEPTION 'Preflight fallido: existen objetos parciales de 016';
  END IF;
END
$$;

ALTER TABLE public.matriz_rango
  ADD CONSTRAINT uq_matriz_rango_id_criterio_puntaje_unidad_pt
  UNIQUE (id, criterio_id, puntaje, unidad);

ALTER TABLE public.cliente_pt_respuesta
  ADD COLUMN matriz_rango_id INTEGER,
  ADD COLUMN valor_numerico NUMERIC,
  ADD COLUMN unidad VARCHAR(30),
  ADD CONSTRAINT fk_cliente_pt_respuesta_rango_criterio_puntaje_unidad
    FOREIGN KEY (matriz_rango_id, matriz_criterio_id, puntaje, unidad)
    REFERENCES public.matriz_rango (id, criterio_id, puntaje, unidad)
    ON DELETE RESTRICT,
  ADD CONSTRAINT ck_cliente_pt_respuesta_tipo CHECK (
    (
      matriz_opcion_id IS NOT NULL AND matriz_rango_id IS NULL
      AND valor_numerico IS NULL AND unidad IS NULL
    ) OR (
      matriz_opcion_id IS NULL AND matriz_rango_id IS NOT NULL
      AND valor_numerico IS NOT NULL
      AND valor_numerico > '-Infinity'::numeric
      AND valor_numerico < 'Infinity'::numeric
      AND unidad IN ('UMA', 'PESOS')
    )
  );

CREATE INDEX idx_cliente_pt_respuesta_rango
  ON public.cliente_pt_respuesta (matriz_rango_id);

CREATE FUNCTION public.validar_cliente_pt_respuesta_rango()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  rango public.matriz_rango%ROWTYPE;
BEGIN
  IF NEW.matriz_rango_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT * INTO STRICT rango
  FROM public.matriz_rango
  WHERE id = NEW.matriz_rango_id
    AND criterio_id = NEW.matriz_criterio_id
    AND puntaje = NEW.puntaje
    AND unidad = NEW.unidad;
  IF NOT (
    (rango.minimo IS NULL OR
      CASE WHEN rango.minimo_incluido
        THEN NEW.valor_numerico >= rango.minimo
        ELSE NEW.valor_numerico > rango.minimo END)
    AND
    (rango.maximo IS NULL OR
      CASE WHEN rango.maximo_incluido
        THEN NEW.valor_numerico <= rango.maximo
        ELSE NEW.valor_numerico < rango.maximo END)
  ) THEN
    RAISE EXCEPTION 'El valor numerico PT no pertenece al rango persistido'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE EXCEPTION 'El rango PT no coincide con criterio, puntaje y unidad'
      USING ERRCODE = '23503';
END
$$;

CREATE TRIGGER trg_cliente_pt_respuesta_rango
BEFORE INSERT OR UPDATE OF matriz_rango_id, matriz_criterio_id, puntaje, unidad, valor_numerico
ON public.cliente_pt_respuesta
FOR EACH ROW
EXECUTE FUNCTION public.validar_cliente_pt_respuesta_rango();

ALTER TABLE public.cliente_pt_respuesta
  ALTER COLUMN matriz_opcion_id DROP NOT NULL;

INSERT INTO public.schema_migrations (migration_key)
VALUES ('20260820_016_cliente_pt_respuesta_numerica');

COMMIT;
