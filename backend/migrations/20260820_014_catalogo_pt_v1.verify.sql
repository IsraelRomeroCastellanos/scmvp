BEGIN;
SET TRANSACTION READ ONLY;

DO $$
DECLARE
  criterio RECORD;
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'VERIFY fallido: se esperaba public';
  END IF;
  IF pg_catalog.to_regclass('public.schema_migrations') IS NULL
     OR pg_catalog.to_regclass('public.catalogo_criterio_pt') IS NULL
     OR pg_catalog.to_regclass('public.catalogo_criterio_pt_version') IS NULL
     OR pg_catalog.to_regclass('public.catalogo_criterio_gr') IS NULL THEN
    RAISE EXCEPTION 'VERIFY fallido: faltan tablas requeridas por 014';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260820_014_catalogo_pt_v1'
  ) THEN
    RAISE EXCEPTION 'VERIFY fallido: falta la migration key 014';
  END IF;
  IF (
    SELECT pg_catalog.count(*) FROM public.catalogo_criterio_pt
    WHERE estado = 'ACTIVO' AND version_vigente_id IS NOT NULL
  ) <> 6 THEN
    RAISE EXCEPTION 'VERIFY fallido: el catalogo PT activo no contiene exactamente seis criterios';
  END IF;

  FOR criterio IN
    SELECT * FROM (VALUES
      ('TIPO_PRODUCTO', 'Número y Tipo de Producto'),
      ('NATURALEZA_PRODUCTO', 'Naturaleza del Producto'),
      ('MONTO', 'Monto'),
      ('FRECUENCIA_PRODUCTO', 'Frecuencia'),
      ('DESTINO_RECURSOS_PT', 'Origen y Destino de los recursos'),
      ('ZONA_GEOGRAFICA_PT', 'Zona geográfica')
    ) AS esperado(codigo, nombre)
  LOOP
    IF (
      SELECT pg_catalog.count(*)
      FROM public.catalogo_criterio_pt c
      JOIN public.catalogo_criterio_pt_version v
        ON v.id = c.version_vigente_id AND v.criterio_pt_id = c.id
      WHERE c.codigo_canonico = criterio.codigo
        AND c.nombre_visible_global = criterio.nombre
        AND c.estado = 'ACTIVO' AND c.retirado_en IS NULL
        AND v.tipo_resolucion = 'CAPTURA_OPCIONES'
        AND v.tipo_parametrizacion = 'OPCIONES'
        AND v.unidad_canonica IS NULL
    ) <> 1 THEN
      RAISE EXCEPTION 'VERIFY fallido: criterio PT % incompatible', criterio.codigo;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM public.catalogo_criterio_gr
    WHERE codigo_canonico = 'ZONA_GEOGRAFICA_PT'
  ) THEN
    RAISE EXCEPTION 'VERIFY fallido: ZONA_GEOGRAFICA_PT colisiona con GR';
  END IF;
END
$$;

ROLLBACK;
