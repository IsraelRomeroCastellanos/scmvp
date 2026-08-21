BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtext('20260820_014_catalogo_pt_v1')
);

DO $$
DECLARE
  principal_id INTEGER;
  criterio_id INTEGER;
  version_id INTEGER;
  criterio RECORD;
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Esquema invalido: se esperaba public';
  END IF;
  IF pg_catalog.to_regclass('public.schema_migrations') IS NULL
     OR pg_catalog.to_regclass('public.usuarios') IS NULL
     OR pg_catalog.to_regclass('public.catalogo_criterio_pt') IS NULL
     OR pg_catalog.to_regclass('public.catalogo_criterio_pt_version') IS NULL THEN
    RAISE EXCEPTION 'Preflight fallido: faltan tablas requeridas por 014';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260813_007_seed_principal_sistema_y_catalogos_matriz'
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: se requiere la migracion 007';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260820_014_catalogo_pt_v1'
  ) THEN
    RAISE EXCEPTION 'La migracion 014 ya esta registrada';
  END IF;

  SELECT id INTO STRICT principal_id
  FROM public.usuarios
  WHERE codigo_principal = 'PLD_SYSTEM' AND tipo_principal = 'SISTEMA';
  IF (SELECT pg_catalog.count(*) FROM public.usuarios
      WHERE codigo_principal = 'PLD_SYSTEM' AND tipo_principal = 'SISTEMA') <> 1 THEN
    RAISE EXCEPTION 'Preflight fallido: PLD_SYSTEM no es unico';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.catalogo_criterio_pt
    WHERE codigo_canonico IN ('MONTO', 'ZONA_GEOGRAFICA_PT')
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: los codigos PT nuevos ya existen';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('TIPO_PRODUCTO', 'Tipo de producto'),
      ('NATURALEZA_PRODUCTO', 'Naturaleza del producto/servicio'),
      ('FRECUENCIA_PRODUCTO', 'Frecuencia del producto/servicio'),
      ('DESTINO_RECURSOS_PT', 'Destino de los recursos')
    ) AS esperado(codigo, nombre_anterior)
    LEFT JOIN public.catalogo_criterio_pt c
      ON c.codigo_canonico = esperado.codigo
    LEFT JOIN public.catalogo_criterio_pt_version v
      ON v.id = c.version_vigente_id AND v.criterio_pt_id = c.id
    WHERE c.id IS NULL OR c.nombre_visible_global <> esperado.nombre_anterior
      OR c.estado <> 'ACTIVO' OR c.retirado_en IS NOT NULL
      OR v.id IS NULL OR v.tipo_resolucion <> 'CAPTURA_OPCIONES'
      OR v.tipo_parametrizacion <> 'OPCIONES' OR v.unidad_canonica IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: el catalogo PT de 007 no conserva su contrato';
  END IF;

  UPDATE public.catalogo_criterio_pt AS c
  SET nombre_visible_global = nombres.nombre_nuevo
  FROM (VALUES
    ('TIPO_PRODUCTO', 'Número y Tipo de Producto'),
    ('NATURALEZA_PRODUCTO', 'Naturaleza del Producto'),
    ('FRECUENCIA_PRODUCTO', 'Frecuencia'),
    ('DESTINO_RECURSOS_PT', 'Origen y Destino de los recursos')
  ) AS nombres(codigo, nombre_nuevo)
  WHERE c.codigo_canonico = nombres.codigo;

  FOR criterio IN
    SELECT * FROM (VALUES
      ('MONTO', 'Monto'),
      ('ZONA_GEOGRAFICA_PT', 'Zona geográfica')
    ) AS nuevos(codigo, nombre)
  LOOP
    INSERT INTO public.catalogo_criterio_pt (
      codigo_canonico, nombre_visible_global, descripcion, estado, creado_por
    ) VALUES (
      criterio.codigo, criterio.nombre, NULL, 'ACTIVO', principal_id
    ) RETURNING id INTO criterio_id;

    INSERT INTO public.catalogo_criterio_pt_version (
      criterio_pt_id, version_contrato, tipo_resolucion,
      tipo_parametrizacion, unidad_canonica, creado_por
    ) VALUES (
      criterio_id, 1, 'CAPTURA_OPCIONES', 'OPCIONES', NULL, principal_id
    ) RETURNING id INTO version_id;

    UPDATE public.catalogo_criterio_pt
    SET version_vigente_id = version_id
    WHERE id = criterio_id;
  END LOOP;

  INSERT INTO public.schema_migrations (migration_key)
  VALUES ('20260820_014_catalogo_pt_v1');
END
$$;

COMMIT;
