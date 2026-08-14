BEGIN;
SET TRANSACTION READ ONLY;

DO $$
DECLARE
  principal_id INTEGER;
  criterio RECORD;
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'VERIFY fallido: se esperaba el esquema public';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260812_005_catalogos_canonicos_matriz'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260813_006_principales_tecnicos_usuarios'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260813_007_seed_principal_sistema_y_catalogos_matriz'
  ) THEN
    RAISE EXCEPTION 'VERIFY fallido: faltan las migration keys 005, 006 o 007';
  END IF;

  SELECT id
    INTO STRICT principal_id
    FROM public.usuarios
   WHERE codigo_principal = 'PLD_SYSTEM'
     AND tipo_principal = 'SISTEMA'
     AND email = 'pld-system@internal.invalid'
     AND password_hash = '!SYSTEM_PRINCIPAL_NO_LOGIN!'
     AND nombre_completo = 'Principal técnico PLD VISSION'
     AND rol IS NULL
     AND empresa_id IS NULL
     AND activo IS FALSE;

  IF (SELECT pg_catalog.count(*) FROM public.usuarios
      WHERE codigo_principal = 'PLD_SYSTEM') <> 1 THEN
    RAISE EXCEPTION 'VERIFY fallido: PLD_SYSTEM no es unico';
  END IF;

  IF (
    SELECT pg_catalog.count(*)
    FROM public.catalogo_criterio_pt
    WHERE codigo_canonico IN (
      'TIPO_PRODUCTO',
      'NATURALEZA_PRODUCTO',
      'FRECUENCIA_PRODUCTO',
      'DESTINO_RECURSOS_PT'
    )
  ) <> 4 THEN
    RAISE EXCEPTION 'VERIFY fallido: no existen exactamente los cuatro criterios PT de 007';
  END IF;

  FOR criterio IN
    SELECT * FROM (VALUES
      ('TIPO_PRODUCTO', 'Tipo de producto'),
      ('NATURALEZA_PRODUCTO', 'Naturaleza del producto/servicio'),
      ('FRECUENCIA_PRODUCTO', 'Frecuencia del producto/servicio'),
      ('DESTINO_RECURSOS_PT', 'Destino de los recursos')
    ) AS t(codigo, nombre)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.catalogo_criterio_pt c
      JOIN public.catalogo_criterio_pt_version v
        ON v.criterio_pt_id = c.id
      WHERE c.codigo_canonico = criterio.codigo
        AND c.nombre_visible_global = criterio.nombre
        AND c.descripcion IS NULL
        AND c.estado = 'ACTIVO'
        AND c.creado_por = principal_id
        AND c.retirado_por IS NULL
        AND c.retirado_en IS NULL
        AND c.version_vigente_id = v.id
        AND v.version_contrato = 1
        AND v.tipo_resolucion = 'CAPTURA_OPCIONES'
        AND v.tipo_parametrizacion = 'OPCIONES'
        AND v.unidad_canonica IS NULL
        AND v.creado_por = principal_id
    ) OR (
      SELECT pg_catalog.count(*)
      FROM public.catalogo_criterio_pt_version v
      JOIN public.catalogo_criterio_pt c ON c.id = v.criterio_pt_id
      WHERE c.codigo_canonico = criterio.codigo
    ) <> 1 THEN
      RAISE EXCEPTION 'VERIFY fallido: criterio PT % no conserva el contrato de 007', criterio.codigo;
    END IF;
  END LOOP;

  IF (
    SELECT pg_catalog.count(*)
    FROM public.catalogo_criterio_gr
    WHERE codigo_canonico IN (
      'ACTIVIDAD_ECONOMICA',
      'ZONA_GEOGRAFICA',
      'DESTINO_RECURSOS_GR',
      'PERFIL_TRANSACCIONAL'
    )
  ) <> 4 THEN
    RAISE EXCEPTION 'VERIFY fallido: no existen exactamente los cuatro criterios GR de 007';
  END IF;

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
    IF NOT EXISTS (
      SELECT 1
      FROM public.catalogo_criterio_gr c
      JOIN public.catalogo_criterio_gr_version v
        ON v.criterio_gr_id = c.id
      WHERE c.codigo_canonico = criterio.codigo
        AND c.nombre_visible_global = criterio.nombre
        AND c.descripcion IS NULL
        AND c.estado = 'ACTIVO'
        AND c.creado_por = principal_id
        AND c.retirado_por IS NULL
        AND c.retirado_en IS NULL
        AND c.version_vigente_id = v.id
        AND v.version_contrato = 1
        AND v.tipo_resolucion = criterio.tipo_resolucion
        AND v.resolver_codigo = criterio.resolver_codigo
        AND v.tipo_parametrizacion = 'NINGUNA'
        AND v.unidad_canonica IS NULL
        AND v.creado_por = principal_id
    ) OR (
      SELECT pg_catalog.count(*)
      FROM public.catalogo_criterio_gr_version v
      JOIN public.catalogo_criterio_gr c ON c.id = v.criterio_gr_id
      WHERE c.codigo_canonico = criterio.codigo
    ) <> 1 THEN
      RAISE EXCEPTION 'VERIFY fallido: criterio GR % no conserva el contrato de 007', criterio.codigo;
    END IF;
  END LOOP;
END
$$;

SELECT migration_key
FROM public.schema_migrations
WHERE migration_key IN (
  '20260812_005_catalogos_canonicos_matriz',
  '20260813_006_principales_tecnicos_usuarios',
  '20260813_007_seed_principal_sistema_y_catalogos_matriz'
)
ORDER BY migration_key;

COMMIT;
