BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtext('20260812_005_catalogos_canonicos_matriz')
);

DO $$
DECLARE
  objeto TEXT;
  esperado RECORD;
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Rollback no aplicable: se esperaba el esquema public';
  END IF;

  FOREACH objeto IN ARRAY ARRAY[
    'public.schema_migrations',
    'public.catalogo_criterio_pt',
    'public.catalogo_criterio_pt_version',
    'public.catalogo_criterio_gr',
    'public.catalogo_criterio_gr_version',
    'public.matriz_empresa_version',
    'public.matriz_criterio',
    'public.matriz_opcion',
    'public.matriz_rango',
    'public.matriz_archivo_fuente',
    'public.matriz_resultado'
  ] LOOP
    IF pg_catalog.to_regclass(objeto) IS NULL THEN
      RAISE EXCEPTION 'Rollback no aplicable: falta %', objeto;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class t ON t.oid=a.attrelid AND t.relkind IN ('r','p')
    JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
    JOIN pg_catalog.pg_type tipo ON tipo.oid=a.atttypid
    JOIN pg_catalog.pg_namespace tipo_n ON tipo_n.oid=tipo.typnamespace
    WHERE n.nspname='public' AND t.relname='schema_migrations'
      AND a.attname='migration_key' AND a.attnum>0 AND NOT a.attisdropped
      AND tipo_n.nspname='pg_catalog' AND tipo.typname='varchar'
      AND a.atttypmod=150+4 AND a.attnotnull
  ) THEN
    RAISE EXCEPTION 'Rollback no aplicable: public.schema_migrations es incompatible';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260812_005_catalogos_canonicos_matriz'
  ) THEN
    RAISE EXCEPTION 'Rollback no aplicable: falta la migration key 005';
  END IF;

  IF pg_catalog.to_regprocedure('public.fn_catalogo_criterio_codigo_inmutable()') IS NULL
     OR pg_catalog.to_regprocedure('public.fn_catalogo_criterio_version_inmutable()') IS NULL
     OR pg_catalog.to_regprocedure('public.fn_catalogo_criterio_vigencia_diferida()') IS NULL THEN
    RAISE EXCEPTION 'Rollback no aplicable: faltan funciones de inmutabilidad';
  END IF;

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
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public' AND t.relname=esperado.tabla
        AND c.conname=esperado.nombre AND c.convalidated
    ) THEN
      RAISE EXCEPTION 'Rollback no aplicable: falta constraint public.%.%',
        esperado.tabla, esperado.nombre;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND t.relname='matriz_resultado'
      AND c.conname IN ('ck_matriz_resultado_minimo','ck_matriz_resultado_maximo')
  ) THEN
    RAISE EXCEPTION 'Rollback no aplicable: reaparecieron parcialmente los CHECK de 004';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='matriz_empresa_version'
      AND column_name='procedencia' AND data_type='character varying'
      AND character_maximum_length=20 AND is_nullable='YES'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='matriz_criterio'
      AND column_name='catalogo_criterio_pt_version_id'
      AND data_type='integer' AND is_nullable='YES'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='matriz_criterio'
      AND column_name='catalogo_criterio_gr_version_id'
      AND data_type='integer' AND is_nullable='YES'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='matriz_opcion'
      AND column_name='puntaje' AND data_type='numeric' AND is_nullable='NO'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='matriz_rango'
      AND column_name='puntaje' AND data_type='numeric' AND is_nullable='NO'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='matriz_resultado'
      AND column_name='referencia_nombre_origen' AND data_type='text' AND is_nullable='YES'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='matriz_resultado'
      AND column_name='referencia_rango_origen' AND data_type='text' AND is_nullable='YES'
  ) THEN
    RAISE EXCEPTION 'Rollback no aplicable: estructura 005 incompatible';
  END IF;
END
$$;

LOCK TABLE
  public.catalogo_criterio_pt,
  public.catalogo_criterio_pt_version,
  public.catalogo_criterio_gr,
  public.catalogo_criterio_gr_version,
  public.matriz_empresa_version,
  public.matriz_criterio,
  public.matriz_opcion,
  public.matriz_rango,
  public.matriz_resultado
IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.catalogo_criterio_pt)
     OR EXISTS (SELECT 1 FROM public.catalogo_criterio_pt_version)
     OR EXISTS (SELECT 1 FROM public.catalogo_criterio_gr)
     OR EXISTS (SELECT 1 FROM public.catalogo_criterio_gr_version) THEN
    RAISE EXCEPTION 'Rollback bloqueado: los catalogos canonicos contienen datos';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.matriz_criterio
    WHERE catalogo_criterio_pt_version_id IS NOT NULL
       OR catalogo_criterio_gr_version_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Rollback bloqueado: matriz_criterio referencia versiones canonicas';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.matriz_empresa_version WHERE procedencia IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Rollback bloqueado: existen matrices con procedencia 005';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.matriz_resultado
    WHERE minimo NOT BETWEEN 4 AND 12
       OR maximo NOT BETWEEN 4 AND 12
       OR referencia_nombre_origen IS NULL
       OR referencia_rango_origen IS NULL
  ) THEN
    RAISE EXCEPTION 'Rollback bloqueado: matriz_resultado no es compatible con el contrato 004';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.matriz_opcion WHERE puntaje NOT IN (1,2,3)
  ) OR EXISTS (
    SELECT 1 FROM public.matriz_rango WHERE puntaje NOT IN (1,2,3)
  ) THEN
    RAISE EXCEPTION 'Rollback bloqueado: existen puntajes incompatibles';
  END IF;
END
$$;

ALTER TABLE public.matriz_resultado
  DROP CONSTRAINT ck_matriz_resultado_minimo_positivo,
  DROP CONSTRAINT ck_matriz_resultado_maximo_positivo,
  ALTER COLUMN referencia_nombre_origen SET NOT NULL,
  ALTER COLUMN referencia_rango_origen SET NOT NULL,
  ADD CONSTRAINT ck_matriz_resultado_minimo CHECK (minimo BETWEEN 4 AND 12),
  ADD CONSTRAINT ck_matriz_resultado_maximo CHECK (maximo BETWEEN 4 AND 12);

ALTER TABLE public.matriz_opcion
  DROP CONSTRAINT ck_matriz_opcion_puntaje_mvp,
  ALTER COLUMN puntaje DROP NOT NULL;

ALTER TABLE public.matriz_rango
  DROP CONSTRAINT ck_matriz_rango_puntaje_mvp,
  ALTER COLUMN puntaje DROP NOT NULL;

DROP INDEX public.idx_matriz_criterio_catalogo_pt_version;
DROP INDEX public.idx_matriz_criterio_catalogo_gr_version;

ALTER TABLE public.matriz_criterio
  DROP CONSTRAINT ck_matriz_criterio_catalogo_ambito,
  DROP CONSTRAINT fk_matriz_criterio_catalogo_pt_version,
  DROP CONSTRAINT fk_matriz_criterio_catalogo_gr_version,
  DROP COLUMN catalogo_criterio_pt_version_id,
  DROP COLUMN catalogo_criterio_gr_version_id;

ALTER TABLE public.matriz_empresa_version
  DROP CONSTRAINT ck_matriz_empresa_version_procedencia,
  DROP COLUMN procedencia;

DROP TRIGGER trg_catalogo_criterio_pt_codigo_inmutable
  ON public.catalogo_criterio_pt;
DROP TRIGGER trg_catalogo_criterio_gr_codigo_inmutable
  ON public.catalogo_criterio_gr;
DROP TRIGGER trg_catalogo_criterio_pt_version_inmutable
  ON public.catalogo_criterio_pt_version;
DROP TRIGGER trg_catalogo_criterio_gr_version_inmutable
  ON public.catalogo_criterio_gr_version;
DROP TRIGGER trg_catalogo_criterio_pt_vigencia_diferida
  ON public.catalogo_criterio_pt;
DROP TRIGGER trg_catalogo_criterio_gr_vigencia_diferida
  ON public.catalogo_criterio_gr;

ALTER TABLE public.catalogo_criterio_pt
  DROP CONSTRAINT fk_catalogo_criterio_pt_version_vigente;
ALTER TABLE public.catalogo_criterio_gr
  DROP CONSTRAINT fk_catalogo_criterio_gr_version_vigente;

DROP TABLE public.catalogo_criterio_pt_version;
DROP TABLE public.catalogo_criterio_pt;
DROP TABLE public.catalogo_criterio_gr_version;
DROP TABLE public.catalogo_criterio_gr;

DROP FUNCTION public.fn_catalogo_criterio_codigo_inmutable();
DROP FUNCTION public.fn_catalogo_criterio_version_inmutable();
DROP FUNCTION public.fn_catalogo_criterio_vigencia_diferida();

DELETE FROM public.schema_migrations
WHERE migration_key = '20260812_005_catalogos_canonicos_matriz';

COMMIT;
