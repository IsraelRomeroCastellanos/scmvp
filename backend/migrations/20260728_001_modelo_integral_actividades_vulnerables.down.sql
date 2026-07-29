BEGIN;

DO $$
BEGIN
  IF to_regclass('public.schema_migrations') IS NULL THEN
    RAISE EXCEPTION
      'Rollback no aplicable: falta public.schema_migrations';
  END IF;

  IF to_regclass('public.cat_actividades_vulnerables_generales') IS NULL THEN
    RAISE EXCEPTION
      'Rollback no aplicable: falta public.cat_actividades_vulnerables_generales';
  END IF;

  IF to_regclass('public.cat_operaciones_vulnerables') IS NULL THEN
    RAISE EXCEPTION
      'Rollback no aplicable: falta public.cat_operaciones_vulnerables';
  END IF;

  IF to_regclass('public.actividad_vulnerable_operaciones') IS NULL THEN
    RAISE EXCEPTION
      'Rollback no aplicable: falta public.actividad_vulnerable_operaciones';
  END IF;

  IF to_regclass('public.empresa_actividades_vulnerables') IS NULL THEN
    RAISE EXCEPTION
      'Rollback no aplicable: falta public.empresa_actividades_vulnerables';
  END IF;

  IF to_regclass('public.cliente_selecciones_pld') IS NULL THEN
    RAISE EXCEPTION
      'Rollback no aplicable: falta public.cliente_selecciones_pld';
  END IF;

  IF to_regclass('public.cliente_perfil_transaccional') IS NULL THEN
    RAISE EXCEPTION
      'Rollback no aplicable: falta public.cliente_perfil_transaccional';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = to_regclass('public.cliente_perfil_transaccional')
      AND attname = 'seleccion_pld_cliente_id'
      AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION
      'Rollback no aplicable: falta public.cliente_perfil_transaccional.seleccion_pld_cliente_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint constraint_info
    JOIN pg_attribute source_column
      ON source_column.attrelid = constraint_info.conrelid
     AND source_column.attname = 'seleccion_pld_cliente_id'
     AND NOT source_column.attisdropped
    JOIN pg_attribute referenced_column
      ON referenced_column.attrelid = constraint_info.confrelid
     AND referenced_column.attname = 'id'
     AND NOT referenced_column.attisdropped
    WHERE constraint_info.conname = 'fk_cliente_perfil_tx_seleccion_pld'
      AND constraint_info.contype = 'f'
      AND constraint_info.conrelid =
        to_regclass('public.cliente_perfil_transaccional')
      AND constraint_info.confrelid =
        to_regclass('public.cliente_selecciones_pld')
      AND constraint_info.conkey = ARRAY[source_column.attnum]
      AND constraint_info.confkey = ARRAY[referenced_column.attnum]
  ) THEN
    RAISE EXCEPTION
      'Rollback no aplicable: falta fk_cliente_perfil_tx_seleccion_pld';
  END IF;

  IF to_regclass(
    'public.idx_cliente_perfil_transaccional_seleccion_pld'
  ) IS NULL THEN
    RAISE EXCEPTION
      'Rollback no aplicable: falta idx_cliente_perfil_transaccional_seleccion_pld';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.schema_migrations
    WHERE migration_key = '20260728_001_modelo_integral_actividades_vulnerables'
  ) THEN
    RAISE EXCEPTION
      'No está registrada la migración 20260728_001_modelo_integral_actividades_vulnerables';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.empresa_actividades_vulnerables
    LIMIT 1
  ) THEN
    RAISE EXCEPTION
      'Rollback bloqueado: empresa_actividades_vulnerables contiene datos';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.cliente_selecciones_pld
    LIMIT 1
  ) THEN
    RAISE EXCEPTION
      'Rollback bloqueado: cliente_selecciones_pld contiene datos';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.cliente_perfil_transaccional
    WHERE seleccion_pld_cliente_id IS NOT NULL
    LIMIT 1
  ) THEN
    RAISE EXCEPTION
      'Rollback bloqueado: existen perfiles vinculados a selecciones PLD';
  END IF;
END
$$;

ALTER TABLE public.cliente_perfil_transaccional
  DROP CONSTRAINT fk_cliente_perfil_tx_seleccion_pld;

DROP INDEX public.idx_cliente_perfil_transaccional_seleccion_pld;

ALTER TABLE public.cliente_perfil_transaccional
  DROP COLUMN seleccion_pld_cliente_id;

DROP TABLE public.cliente_selecciones_pld;
DROP TABLE public.empresa_actividades_vulnerables;
DROP TABLE public.actividad_vulnerable_operaciones;
DROP TABLE public.cat_operaciones_vulnerables;
DROP TABLE public.cat_actividades_vulnerables_generales;

DELETE FROM public.schema_migrations
WHERE migration_key = '20260728_001_modelo_integral_actividades_vulnerables';

COMMIT;
