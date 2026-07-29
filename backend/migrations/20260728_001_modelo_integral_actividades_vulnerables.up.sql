BEGIN;

SELECT pg_advisory_xact_lock(
  hashtext('20260728_001_modelo_integral_actividades_vulnerables')
);

CREATE TABLE IF NOT EXISTS public.schema_migrations (
  id SERIAL,
  migration_key VARCHAR(150) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_schema_migrations PRIMARY KEY (id),
  CONSTRAINT uq_schema_migrations_migration_key UNIQUE (migration_key)
);

DO $$
BEGIN
  IF NOT (
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'schema_migrations'
        AND column_name = 'id'
        AND data_type = 'integer'
        AND is_nullable = 'NO'
    )
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'schema_migrations'
        AND column_name = 'migration_key'
        AND data_type = 'character varying'
        AND is_nullable = 'NO'
    )
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'schema_migrations'
        AND column_name = 'applied_at'
        AND data_type = 'timestamp with time zone'
        AND is_nullable = 'NO'
    )
    AND EXISTS (
      SELECT 1
      FROM pg_constraint constraint_info
      JOIN pg_attribute column_info
        ON column_info.attrelid = constraint_info.conrelid
       AND column_info.attname = 'id'
       AND NOT column_info.attisdropped
      WHERE constraint_info.conrelid = 'public.schema_migrations'::regclass
        AND constraint_info.contype = 'p'
        AND constraint_info.conkey = ARRAY[column_info.attnum]
    )
    AND EXISTS (
      SELECT 1
      FROM pg_constraint constraint_info
      JOIN pg_attribute column_info
        ON column_info.attrelid = constraint_info.conrelid
       AND column_info.attname = 'migration_key'
       AND NOT column_info.attisdropped
      WHERE constraint_info.conrelid = 'public.schema_migrations'::regclass
        AND constraint_info.contype = 'u'
        AND constraint_info.conkey = ARRAY[column_info.attnum]
    )
  ) THEN
    RAISE EXCEPTION
      'schema_migrations existe con estructura incompatible';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.schema_migrations
    WHERE migration_key = '20260728_001_modelo_integral_actividades_vulnerables'
  ) THEN
    RAISE EXCEPTION
      'La migración 20260728_001_modelo_integral_actividades_vulnerables ya está registrada';
  END IF;
END
$$;

CREATE TABLE public.cat_actividades_vulnerables_generales (
  id SERIAL,
  clave VARCHAR(64) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  fraccion VARCHAR(30) NULL,
  descripcion TEXT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_cat_actividades_vulnerables_generales PRIMARY KEY (id),
  CONSTRAINT uq_cat_actividades_vul_generales_clave UNIQUE (clave),
  CONSTRAINT ck_cat_actividades_vul_generales_clave
    CHECK (clave ~ '^AVG_[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$')
);

CREATE TABLE public.cat_operaciones_vulnerables (
  id SERIAL,
  clave VARCHAR(64) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_cat_operaciones_vulnerables PRIMARY KEY (id),
  CONSTRAINT uq_cat_operaciones_vulnerables_clave UNIQUE (clave),
  CONSTRAINT ck_cat_operaciones_vulnerables_clave
    CHECK (clave ~ '^AV_[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$')
);

CREATE TABLE public.actividad_vulnerable_operaciones (
  id SERIAL,
  actividad_vulnerable_id INTEGER NOT NULL,
  operacion_vulnerable_id INTEGER NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_actividad_vulnerable_operaciones PRIMARY KEY (id),
  CONSTRAINT fk_actividad_vul_ops_actividad
    FOREIGN KEY (actividad_vulnerable_id)
    REFERENCES public.cat_actividades_vulnerables_generales(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_actividad_vul_ops_operacion
    FOREIGN KEY (operacion_vulnerable_id)
    REFERENCES public.cat_operaciones_vulnerables(id)
    ON DELETE RESTRICT,
  CONSTRAINT uq_actividad_vul_ops_actividad_operacion
    UNIQUE (actividad_vulnerable_id, operacion_vulnerable_id)
);

CREATE TABLE public.empresa_actividades_vulnerables (
  id SERIAL,
  empresa_id INTEGER NOT NULL,
  actividad_vulnerable_id INTEGER NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_empresa_actividades_vulnerables PRIMARY KEY (id),
  CONSTRAINT fk_empresa_actividades_vul_empresa
    FOREIGN KEY (empresa_id)
    REFERENCES public.empresas(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_empresa_actividades_vul_actividad
    FOREIGN KEY (actividad_vulnerable_id)
    REFERENCES public.cat_actividades_vulnerables_generales(id)
    ON DELETE RESTRICT,
  CONSTRAINT uq_empresa_actividades_vul_empresa_actividad
    UNIQUE (empresa_id, actividad_vulnerable_id)
);

CREATE TABLE public.cliente_selecciones_pld (
  id SERIAL,
  cliente_id INTEGER NOT NULL,
  empresa_id INTEGER NOT NULL,
  empresa_actividad_vulnerable_id INTEGER NOT NULL,
  actividad_operacion_id INTEGER NOT NULL,
  origen_seleccion VARCHAR(30) NOT NULL,
  vigente_desde TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  vigente_hasta TIMESTAMPTZ NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_cliente_selecciones_pld PRIMARY KEY (id),
  CONSTRAINT fk_cliente_selecciones_pld_cliente
    FOREIGN KEY (cliente_id)
    REFERENCES public.clientes(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cliente_selecciones_pld_empresa
    FOREIGN KEY (empresa_id)
    REFERENCES public.empresas(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cliente_selecciones_pld_empresa_actividad
    FOREIGN KEY (empresa_actividad_vulnerable_id)
    REFERENCES public.empresa_actividades_vulnerables(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_cliente_selecciones_pld_actividad_operacion
    FOREIGN KEY (actividad_operacion_id)
    REFERENCES public.actividad_vulnerable_operaciones(id)
    ON DELETE RESTRICT,
  CONSTRAINT ck_cliente_selecciones_pld_vigencia
    CHECK (vigente_hasta IS NULL OR vigente_hasta >= vigente_desde),
  CONSTRAINT ck_cliente_selecciones_pld_origen
    CHECK (origen_seleccion IN ('automatica', 'manual', 'regularizacion'))
);

ALTER TABLE public.cliente_perfil_transaccional
  ADD COLUMN seleccion_pld_cliente_id INTEGER NULL;

ALTER TABLE public.cliente_perfil_transaccional
  ADD CONSTRAINT fk_cliente_perfil_tx_seleccion_pld
  FOREIGN KEY (seleccion_pld_cliente_id)
  REFERENCES public.cliente_selecciones_pld(id)
  ON DELETE RESTRICT;

CREATE INDEX idx_cat_actividades_vulnerables_generales_activo
  ON public.cat_actividades_vulnerables_generales (activo);

CREATE INDEX idx_cat_operaciones_vulnerables_activo
  ON public.cat_operaciones_vulnerables (activo);

CREATE INDEX idx_actividad_vulnerable_operaciones_actividad
  ON public.actividad_vulnerable_operaciones (actividad_vulnerable_id);

CREATE INDEX idx_actividad_vulnerable_operaciones_operacion
  ON public.actividad_vulnerable_operaciones (operacion_vulnerable_id);

CREATE INDEX idx_empresa_actividades_vulnerables_empresa
  ON public.empresa_actividades_vulnerables (empresa_id);

CREATE INDEX idx_empresa_actividades_vulnerables_actividad
  ON public.empresa_actividades_vulnerables (actividad_vulnerable_id);

CREATE INDEX idx_cliente_selecciones_pld_cliente
  ON public.cliente_selecciones_pld (cliente_id);

CREATE INDEX idx_cliente_selecciones_pld_empresa
  ON public.cliente_selecciones_pld (empresa_id);

CREATE INDEX idx_cliente_selecciones_pld_empresa_actividad
  ON public.cliente_selecciones_pld (empresa_actividad_vulnerable_id);

CREATE INDEX idx_cliente_selecciones_pld_actividad_operacion
  ON public.cliente_selecciones_pld (actividad_operacion_id);

CREATE UNIQUE INDEX idx_cliente_selecciones_pld_cliente_vigente
  ON public.cliente_selecciones_pld (cliente_id)
  WHERE activo = TRUE AND vigente_hasta IS NULL;

CREATE INDEX idx_cliente_perfil_transaccional_seleccion_pld
  ON public.cliente_perfil_transaccional (seleccion_pld_cliente_id);

INSERT INTO public.cat_actividades_vulnerables_generales (
  clave,
  nombre,
  fraccion,
  descripcion
)
VALUES
  ('AVG_JUEGOS_SORTEOS', 'Juegos, apuestas, concursos y sorteos', NULL, NULL),
  ('AVG_INSTRUMENTOS_VALOR', 'Emisión o comercialización de instrumentos de valor', NULL, NULL),
  ('AVG_PRESTAMOS_GARANTIAS', 'Mutuos, préstamos y garantías no financieros', NULL, NULL),
  ('AVG_INMOBILIARIA', 'Actividad inmobiliaria', NULL, NULL),
  ('AVG_METALES_JOYERIA', 'Metales, piedras preciosas, joyas y relojes', NULL, NULL),
  ('AVG_OBRAS_ARTE', 'Obras de arte', NULL, NULL),
  ('AVG_VEHICULOS', 'Comercialización de vehículos', NULL, NULL),
  ('AVG_BLINDAJE', 'Servicios de blindaje', NULL, NULL),
  ('AVG_TRASLADO_VALORES', 'Traslado o custodia de dinero y valores', NULL, NULL),
  ('AVG_SERVICIOS_PROFESIONALES', 'Servicios profesionales vulnerables', NULL, NULL),
  ('AVG_FE_PUBLICA', 'Actos de fe pública vulnerables', NULL, NULL),
  ('AVG_DONATIVOS', 'Recepción de donativos', NULL, NULL),
  ('AVG_COMERCIO_EXTERIOR', 'Servicios de comercio exterior vulnerables', NULL, NULL),
  ('AVG_ACTIVOS_VIRTUALES', 'Intercambio de activos virtuales', NULL, NULL);

INSERT INTO public.cat_operaciones_vulnerables (
  clave,
  nombre,
  descripcion
)
VALUES
  ('AV_VENTA_DE_BOLETOS_O_FICHAS_PARA_APUESTAS', 'Venta de boletos o fichas para apuestas', NULL),
  ('AV_CONCURSOS_O_SORTEOS', 'Concursos o sorteos', NULL),
  ('AV_EMISION_O_COMERCIALIZACION_DE_TARJETAS_DE_CREDITO', 'Emisión o comercialización de tarjetas de crédito', NULL),
  ('AV_EMISION_O_COMERCIALIZACION_DE_TARJETAS_DE_PREPAGO', 'Emisión o comercialización de tarjetas de prepago', NULL),
  ('AV_OTORGAMIENTO_DE_MUTUO_O_PRESTAMOS', 'Otorgamiento de mutuo o préstamos', NULL),
  ('AV_OTORGAMIENTO_DE_GARANTIAS', 'Otorgamiento de garantías', NULL),
  ('AV_CONSTRUCCION_DE_INMUEBLES', 'Construcción de inmuebles', NULL),
  ('AV_DESARROLLO_DE_BIENES_INMUEBLES', 'Desarrollo de bienes inmuebles', NULL),
  ('AV_COMPRAVENTA_DE_INMUEBLES_A_NOMBRE_DEL_CLIENTE', 'Compraventa de inmuebles a nombre del cliente', NULL),
  ('AV_INTERMEDIACION_EN_TRANSMISION_DE_PROPIEDAD', 'Intermediación en transmisión de propiedad', NULL),
  ('AV_ARRENDAMIENTO_DE_BIENES_INMUEBLES', 'Arrendamiento de bienes inmuebles', NULL),
  ('AV_TRANSMISION_DE_DERECHOS_REALES_INMUEBLES', 'Transmisión de derechos reales sobre inmuebles', NULL),
  ('AV_COMERCIALIZACION_DE_METALES_Y_PIEDRAS_PRECIOSAS', 'Comercialización de metales y piedras preciosas', NULL),
  ('AV_COMERCIALIZACION_DE_JOYAS_O_RELOJES', 'Comercialización de joyas o relojes', NULL),
  ('AV_COMERCIALIZACION_DE_OBRAS_DE_ARTE', 'Comercialización de obras de arte', NULL),
  ('AV_SUBASTA_DE_OBRAS_DE_ARTE', 'Subasta de obras de arte', NULL),
  ('AV_COMERCIALIZACION_DE_VEHICULOS_TERRESTRES', 'Comercialización de vehículos terrestres', NULL),
  ('AV_COMERCIALIZACION_DE_VEHICULOS_AEREOS', 'Comercialización de vehículos aéreos', NULL),
  ('AV_COMERCIALIZACION_DE_VEHICULOS_MARITIMOS', 'Comercialización de vehículos marítimos', NULL),
  ('AV_BLINDAJE_DE_VEHICULOS', 'Blindaje de vehículos', NULL),
  ('AV_BLINDAJE_DE_INMUEBLES', 'Blindaje de inmuebles', NULL),
  ('AV_TRASLADO_O_CUSTODIA_DE_DINERO_Y_VALORES', 'Traslado o custodia de dinero y valores', NULL),
  ('AV_ADMINISTRACION_DE_RECURSOS_O_CUENTAS', 'Administración y manejo de recursos o cuentas', NULL),
  ('AV_ORGANIZACION_DE_APORTACIONES_DE_CAPITAL', 'Organización de aportaciones de capital', NULL),
  ('AV_CONSTITUCION_Y_ADMINISTRACION_DE_SOCIEDADES', 'Constitución y administración de sociedades', NULL),
  ('AV_OTORGAMIENTO_DE_PODERES_PARA_ACTOS_DE_DOMINIO', 'Otorgamiento de poderes para actos de dominio', NULL),
  ('AV_CONSTITUCION_DE_PERSONAS_MORALES', 'Constitución de personas morales', NULL),
  ('AV_RECEPCION_DE_DONATIVOS', 'Recepción de donativos', NULL),
  ('AV_DESPACHO_ADUANERO_DE_VEHICULOS', 'Despacho aduanero de vehículos', NULL),
  ('AV_DESPACHO_ADUANERO_DE_METALES_JOYAS_O_ARTE', 'Despacho aduanero de metales, joyas o arte', NULL),
  ('AV_INTERCAMBIO_DE_ACTIVOS_VIRTUALES', 'Intercambio de activos virtuales', NULL);

WITH mapa (actividad_clave, operacion_clave) AS (
  VALUES
    ('AVG_JUEGOS_SORTEOS', 'AV_VENTA_DE_BOLETOS_O_FICHAS_PARA_APUESTAS'),
    ('AVG_JUEGOS_SORTEOS', 'AV_CONCURSOS_O_SORTEOS'),
    ('AVG_INSTRUMENTOS_VALOR', 'AV_EMISION_O_COMERCIALIZACION_DE_TARJETAS_DE_CREDITO'),
    ('AVG_INSTRUMENTOS_VALOR', 'AV_EMISION_O_COMERCIALIZACION_DE_TARJETAS_DE_PREPAGO'),
    ('AVG_PRESTAMOS_GARANTIAS', 'AV_OTORGAMIENTO_DE_MUTUO_O_PRESTAMOS'),
    ('AVG_PRESTAMOS_GARANTIAS', 'AV_OTORGAMIENTO_DE_GARANTIAS'),
    ('AVG_INMOBILIARIA', 'AV_CONSTRUCCION_DE_INMUEBLES'),
    ('AVG_INMOBILIARIA', 'AV_DESARROLLO_DE_BIENES_INMUEBLES'),
    ('AVG_INMOBILIARIA', 'AV_COMPRAVENTA_DE_INMUEBLES_A_NOMBRE_DEL_CLIENTE'),
    ('AVG_INMOBILIARIA', 'AV_INTERMEDIACION_EN_TRANSMISION_DE_PROPIEDAD'),
    ('AVG_INMOBILIARIA', 'AV_ARRENDAMIENTO_DE_BIENES_INMUEBLES'),
    ('AVG_INMOBILIARIA', 'AV_TRANSMISION_DE_DERECHOS_REALES_INMUEBLES'),
    ('AVG_METALES_JOYERIA', 'AV_COMERCIALIZACION_DE_METALES_Y_PIEDRAS_PRECIOSAS'),
    ('AVG_METALES_JOYERIA', 'AV_COMERCIALIZACION_DE_JOYAS_O_RELOJES'),
    ('AVG_OBRAS_ARTE', 'AV_COMERCIALIZACION_DE_OBRAS_DE_ARTE'),
    ('AVG_OBRAS_ARTE', 'AV_SUBASTA_DE_OBRAS_DE_ARTE'),
    ('AVG_VEHICULOS', 'AV_COMERCIALIZACION_DE_VEHICULOS_TERRESTRES'),
    ('AVG_VEHICULOS', 'AV_COMERCIALIZACION_DE_VEHICULOS_AEREOS'),
    ('AVG_VEHICULOS', 'AV_COMERCIALIZACION_DE_VEHICULOS_MARITIMOS'),
    ('AVG_BLINDAJE', 'AV_BLINDAJE_DE_VEHICULOS'),
    ('AVG_BLINDAJE', 'AV_BLINDAJE_DE_INMUEBLES'),
    ('AVG_TRASLADO_VALORES', 'AV_TRASLADO_O_CUSTODIA_DE_DINERO_Y_VALORES'),
    ('AVG_SERVICIOS_PROFESIONALES', 'AV_ADMINISTRACION_DE_RECURSOS_O_CUENTAS'),
    ('AVG_SERVICIOS_PROFESIONALES', 'AV_ORGANIZACION_DE_APORTACIONES_DE_CAPITAL'),
    ('AVG_SERVICIOS_PROFESIONALES', 'AV_CONSTITUCION_Y_ADMINISTRACION_DE_SOCIEDADES'),
    ('AVG_FE_PUBLICA', 'AV_OTORGAMIENTO_DE_PODERES_PARA_ACTOS_DE_DOMINIO'),
    ('AVG_FE_PUBLICA', 'AV_CONSTITUCION_DE_PERSONAS_MORALES'),
    ('AVG_DONATIVOS', 'AV_RECEPCION_DE_DONATIVOS'),
    ('AVG_COMERCIO_EXTERIOR', 'AV_DESPACHO_ADUANERO_DE_VEHICULOS'),
    ('AVG_COMERCIO_EXTERIOR', 'AV_DESPACHO_ADUANERO_DE_METALES_JOYAS_O_ARTE'),
    ('AVG_ACTIVOS_VIRTUALES', 'AV_INTERCAMBIO_DE_ACTIVOS_VIRTUALES')
)
INSERT INTO public.actividad_vulnerable_operaciones (
  actividad_vulnerable_id,
  operacion_vulnerable_id
)
SELECT
  actividad.id,
  operacion.id
FROM mapa
JOIN public.cat_actividades_vulnerables_generales actividad
  ON actividad.clave = mapa.actividad_clave
JOIN public.cat_operaciones_vulnerables operacion
  ON operacion.clave = mapa.operacion_clave;

DO $$
DECLARE
  actividades_count INTEGER;
  operaciones_count INTEGER;
  relaciones_count INTEGER;
  operaciones_huerfanas_count INTEGER;
  actividades_huerfanas_count INTEGER;
  empresas_asignadas_count INTEGER;
  selecciones_count INTEGER;
  perfiles_vinculados_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO actividades_count
  FROM public.cat_actividades_vulnerables_generales;

  SELECT COUNT(*) INTO operaciones_count
  FROM public.cat_operaciones_vulnerables;

  SELECT COUNT(*) INTO relaciones_count
  FROM public.actividad_vulnerable_operaciones;

  SELECT COUNT(*) INTO operaciones_huerfanas_count
  FROM public.cat_operaciones_vulnerables operacion
  LEFT JOIN public.actividad_vulnerable_operaciones relacion
    ON relacion.operacion_vulnerable_id = operacion.id
  WHERE relacion.id IS NULL;

  SELECT COUNT(*) INTO actividades_huerfanas_count
  FROM public.cat_actividades_vulnerables_generales actividad
  LEFT JOIN public.actividad_vulnerable_operaciones relacion
    ON relacion.actividad_vulnerable_id = actividad.id
  WHERE relacion.id IS NULL;

  SELECT COUNT(*) INTO empresas_asignadas_count
  FROM public.empresa_actividades_vulnerables;

  SELECT COUNT(*) INTO selecciones_count
  FROM public.cliente_selecciones_pld;

  SELECT COUNT(*) INTO perfiles_vinculados_count
  FROM public.cliente_perfil_transaccional
  WHERE seleccion_pld_cliente_id IS NOT NULL;

  IF actividades_count <> 14 THEN
    RAISE EXCEPTION
      'Seed inválido: se esperaban 14 actividades y se obtuvieron %',
      actividades_count;
  END IF;

  IF operaciones_count <> 31 THEN
    RAISE EXCEPTION
      'Seed inválido: se esperaban 31 operaciones y se obtuvieron %',
      operaciones_count;
  END IF;

  IF relaciones_count <> 31 THEN
    RAISE EXCEPTION
      'Mapa inválido: se esperaban 31 relaciones y se obtuvieron %',
      relaciones_count;
  END IF;

  IF operaciones_huerfanas_count <> 0 THEN
    RAISE EXCEPTION
      'Mapa inválido: existen % operaciones sin actividad',
      operaciones_huerfanas_count;
  END IF;

  IF actividades_huerfanas_count <> 0 THEN
    RAISE EXCEPTION
      'Mapa inválido: existen % actividades sin operaciones',
      actividades_huerfanas_count;
  END IF;

  IF empresas_asignadas_count <> 0 THEN
    RAISE EXCEPTION
      'Migración inválida: se asignaron % empresas',
      empresas_asignadas_count;
  END IF;

  IF selecciones_count <> 0 THEN
    RAISE EXCEPTION
      'Migración inválida: se crearon % selecciones PLD',
      selecciones_count;
  END IF;

  IF perfiles_vinculados_count <> 0 THEN
    RAISE EXCEPTION
      'Migración inválida: se modificaron % perfiles históricos',
      perfiles_vinculados_count;
  END IF;
END
$$;

INSERT INTO public.schema_migrations (migration_key)
VALUES ('20260728_001_modelo_integral_actividades_vulnerables');

COMMIT;
