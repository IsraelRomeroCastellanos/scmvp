BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtext('20260813_007_seed_principal_sistema_y_catalogos_matriz')
);

DO $$
DECLARE
  principal_id INTEGER;
  criterio_id INTEGER;
  version_id INTEGER;
  criterio RECORD;
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Esquema invalido: se esperaba public y se obtuvo %', pg_catalog.current_schema();
  END IF;

  IF pg_catalog.to_regclass('public.schema_migrations') IS NULL
     OR pg_catalog.to_regclass('public.usuarios') IS NULL
     OR pg_catalog.to_regclass('public.catalogo_criterio_pt') IS NULL
     OR pg_catalog.to_regclass('public.catalogo_criterio_pt_version') IS NULL
     OR pg_catalog.to_regclass('public.catalogo_criterio_gr') IS NULL
     OR pg_catalog.to_regclass('public.catalogo_criterio_gr_version') IS NULL THEN
    RAISE EXCEPTION 'Preflight fallido: faltan tablas requeridas por la migracion 007';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260812_005_catalogos_canonicos_matriz'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260813_006_principales_tecnicos_usuarios'
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: se requieren las migraciones 005 y 006';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260813_007_seed_principal_sistema_y_catalogos_matriz'
  ) THEN
    RAISE EXCEPTION 'La migracion 20260813_007_seed_principal_sistema_y_catalogos_matriz ya esta registrada';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class t ON t.oid = a.attrelid AND t.relkind IN ('r', 'p')
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'usuarios'
      AND a.attname = 'password_hash' AND a.attnum > 0 AND NOT a.attisdropped
      AND pg_catalog.format_type(a.atttypid, a.atttypmod) = 'text'
      AND a.attnotnull
  ) OR EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_catalog.pg_attribute a
      ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE n.nspname = 'public' AND t.relname = 'usuarios'
      AND c.contype = 'c' AND a.attname = 'password_hash'
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: password_hash no corresponde al contrato TEXT NOT NULL sin CHECK';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE codigo_principal = 'PLD_SYSTEM'
       OR email = 'pld-system@internal.invalid'
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: codigo o email reservado de PLD_SYSTEM ya existe';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.catalogo_criterio_pt
    WHERE codigo_canonico IN (
      'TIPO_PRODUCTO',
      'NATURALEZA_PRODUCTO',
      'FRECUENCIA_PRODUCTO',
      'DESTINO_RECURSOS_PT'
    )
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: ya existe un codigo PT reservado por la migracion 007';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.catalogo_criterio_gr
    WHERE codigo_canonico IN (
      'ACTIVIDAD_ECONOMICA',
      'ZONA_GEOGRAFICA',
      'DESTINO_RECURSOS_GR',
      'PERFIL_TRANSACCIONAL'
    )
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: ya existe un codigo GR reservado por la migracion 007';
  END IF;

  INSERT INTO public.usuarios (
    email,
    password_hash,
    nombre_completo,
    rol,
    empresa_id,
    activo,
    tipo_principal,
    codigo_principal
  ) VALUES (
    'pld-system@internal.invalid',
    '!SYSTEM_PRINCIPAL_NO_LOGIN!',
    'Principal técnico PLD VISSION',
    NULL,
    NULL,
    FALSE,
    'SISTEMA',
    'PLD_SYSTEM'
  );

  SELECT id
    INTO STRICT principal_id
    FROM public.usuarios
   WHERE codigo_principal = 'PLD_SYSTEM'
     AND tipo_principal = 'SISTEMA';

  FOR criterio IN
    SELECT * FROM (VALUES
      ('TIPO_PRODUCTO', 'Tipo de producto'),
      ('NATURALEZA_PRODUCTO', 'Naturaleza del producto/servicio'),
      ('FRECUENCIA_PRODUCTO', 'Frecuencia del producto/servicio'),
      ('DESTINO_RECURSOS_PT', 'Destino de los recursos')
    ) AS t(codigo, nombre)
  LOOP
    INSERT INTO public.catalogo_criterio_pt (
      codigo_canonico,
      nombre_visible_global,
      descripcion,
      estado,
      creado_por
    ) VALUES (
      criterio.codigo,
      criterio.nombre,
      NULL,
      'ACTIVO',
      principal_id
    )
    RETURNING id INTO criterio_id;

    INSERT INTO public.catalogo_criterio_pt_version (
      criterio_pt_id,
      version_contrato,
      tipo_resolucion,
      tipo_parametrizacion,
      unidad_canonica,
      creado_por
    ) VALUES (
      criterio_id,
      1,
      'CAPTURA_OPCIONES',
      'OPCIONES',
      NULL,
      principal_id
    )
    RETURNING id INTO version_id;

    UPDATE public.catalogo_criterio_pt
       SET version_vigente_id = version_id
     WHERE id = criterio_id;
  END LOOP;

  FOR criterio IN
    SELECT * FROM (VALUES
      ('ACTIVIDAD_ECONOMICA', 'Actividad económica / giro mercantil',
       'CATALOGO_GLOBAL', 'ACTIVIDAD_ECONOMICA'),
      ('ZONA_GEOGRAFICA', 'Lugar de residencia / zona geográfica',
       'CATALOGO_GLOBAL', 'ZONA_GEOGRAFICA'),
      ('DESTINO_RECURSOS_GR', 'Destino de los recursos',
       'ESTRUCTURADO', 'DESTINO_RECURSOS_GR'),
      ('PERFIL_TRANSACCIONAL', 'Perfil transaccional',
       'DERIVADO', 'PERFIL_TRANSACCIONAL')
    ) AS t(codigo, nombre, tipo_resolucion, resolver_codigo)
  LOOP
    INSERT INTO public.catalogo_criterio_gr (
      codigo_canonico,
      nombre_visible_global,
      descripcion,
      estado,
      creado_por
    ) VALUES (
      criterio.codigo,
      criterio.nombre,
      NULL,
      'ACTIVO',
      principal_id
    )
    RETURNING id INTO criterio_id;

    INSERT INTO public.catalogo_criterio_gr_version (
      criterio_gr_id,
      version_contrato,
      tipo_resolucion,
      resolver_codigo,
      tipo_parametrizacion,
      unidad_canonica,
      creado_por
    ) VALUES (
      criterio_id,
      1,
      criterio.tipo_resolucion,
      criterio.resolver_codigo,
      'NINGUNA',
      NULL,
      principal_id
    )
    RETURNING id INTO version_id;

    UPDATE public.catalogo_criterio_gr
       SET version_vigente_id = version_id
     WHERE id = criterio_id;
  END LOOP;

  INSERT INTO public.schema_migrations (migration_key)
  VALUES ('20260813_007_seed_principal_sistema_y_catalogos_matriz');
END
$$;

COMMIT;
