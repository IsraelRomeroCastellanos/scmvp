BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtext('20260820_014_catalogo_pt_v1')
);

DO $$
DECLARE
  principal_id INTEGER;
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'DOWN no aplicable: se esperaba public';
  END IF;
  IF pg_catalog.to_regclass('public.schema_migrations') IS NULL
     OR pg_catalog.to_regclass('public.usuarios') IS NULL
     OR pg_catalog.to_regclass('public.catalogo_criterio_pt') IS NULL
     OR pg_catalog.to_regclass('public.catalogo_criterio_pt_version') IS NULL
     OR pg_catalog.to_regclass('public.matriz_criterio') IS NULL THEN
    RAISE EXCEPTION 'DOWN no aplicable: faltan tablas requeridas por 014';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260820_014_catalogo_pt_v1'
  ) THEN
    RAISE EXCEPTION 'DOWN no aplicable: falta la migration key 014';
  END IF;

  SELECT id INTO STRICT principal_id
  FROM public.usuarios
  WHERE codigo_principal = 'PLD_SYSTEM' AND tipo_principal = 'SISTEMA';

  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('TIPO_PRODUCTO', 'Número y Tipo de Producto'),
      ('NATURALEZA_PRODUCTO', 'Naturaleza del Producto'),
      ('FRECUENCIA_PRODUCTO', 'Frecuencia'),
      ('DESTINO_RECURSOS_PT', 'Origen y Destino de los recursos')
    ) AS esperado(codigo, nombre)
    LEFT JOIN public.catalogo_criterio_pt c ON c.codigo_canonico = esperado.codigo
    WHERE c.id IS NULL OR c.nombre_visible_global <> esperado.nombre
  ) THEN
    RAISE EXCEPTION 'DOWN bloqueado: los nombres PT administrados por 014 fueron modificados';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.matriz_criterio mc
    JOIN public.catalogo_criterio_pt_version v
      ON v.id = mc.catalogo_criterio_pt_version_id
    JOIN public.catalogo_criterio_pt c ON c.id = v.criterio_pt_id
    WHERE c.codigo_canonico IN ('MONTO', 'ZONA_GEOGRAFICA_PT')
  ) THEN
    RAISE EXCEPTION 'DOWN bloqueado: los criterios PT de 014 ya son usados por matrices';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.catalogo_criterio_pt c
    JOIN public.catalogo_criterio_pt_version v ON v.criterio_pt_id = c.id
    WHERE c.codigo_canonico IN ('MONTO', 'ZONA_GEOGRAFICA_PT')
      AND (
        c.creado_por <> principal_id OR c.nombre_visible_global NOT IN ('Monto', 'Zona geográfica')
        OR c.estado <> 'ACTIVO' OR c.retirado_en IS NOT NULL
        OR v.version_contrato <> 1 OR v.tipo_resolucion <> 'CAPTURA_OPCIONES'
        OR v.tipo_parametrizacion <> 'OPCIONES' OR v.unidad_canonica IS NOT NULL
      )
  ) THEN
    RAISE EXCEPTION 'DOWN bloqueado: los criterios PT de 014 fueron modificados';
  END IF;
  IF (
    SELECT pg_catalog.count(*)
    FROM public.catalogo_criterio_pt_version v
    JOIN public.catalogo_criterio_pt c ON c.id = v.criterio_pt_id
    WHERE c.codigo_canonico IN ('MONTO', 'ZONA_GEOGRAFICA_PT')
  ) <> 2 THEN
    RAISE EXCEPTION 'DOWN bloqueado: las versiones PT de 014 no son exactamente dos';
  END IF;

  UPDATE public.catalogo_criterio_pt AS c
  SET nombre_visible_global = nombres.nombre_anterior
  FROM (VALUES
    ('TIPO_PRODUCTO', 'Tipo de producto'),
    ('NATURALEZA_PRODUCTO', 'Naturaleza del producto/servicio'),
    ('FRECUENCIA_PRODUCTO', 'Frecuencia del producto/servicio'),
    ('DESTINO_RECURSOS_PT', 'Destino de los recursos')
  ) AS nombres(codigo, nombre_anterior)
  WHERE c.codigo_canonico = nombres.codigo;

  UPDATE public.catalogo_criterio_pt
  SET version_vigente_id = NULL
  WHERE codigo_canonico IN ('MONTO', 'ZONA_GEOGRAFICA_PT');

  ALTER TABLE public.catalogo_criterio_pt_version
    DISABLE TRIGGER trg_catalogo_criterio_pt_version_inmutable;
  DELETE FROM public.catalogo_criterio_pt_version v
  USING public.catalogo_criterio_pt c
  WHERE v.criterio_pt_id = c.id
    AND c.codigo_canonico IN ('MONTO', 'ZONA_GEOGRAFICA_PT');
  ALTER TABLE public.catalogo_criterio_pt_version
    ENABLE TRIGGER trg_catalogo_criterio_pt_version_inmutable;

  DELETE FROM public.catalogo_criterio_pt
  WHERE codigo_canonico IN ('MONTO', 'ZONA_GEOGRAFICA_PT');

  DELETE FROM public.schema_migrations
  WHERE migration_key = '20260820_014_catalogo_pt_v1';
END
$$;

COMMIT;
