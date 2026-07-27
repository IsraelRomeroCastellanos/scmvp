BEGIN;

CREATE TABLE IF NOT EXISTS public.schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_key VARCHAR(150) UNIQUE NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.schema_migrations
        WHERE migration_key = '20260727_001_empresa_actividades_vulnerables'
    ) THEN
        RAISE EXCEPTION
            'La migración 20260727_001_empresa_actividades_vulnerables ya fue aplicada';
    END IF;
END
$$;

CREATE TABLE public.cat_actividades_vulnerables (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(64) NOT NULL UNIQUE,
    fraccion VARCHAR(20) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE public.empresa_actividades_vulnerables (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL,
    actividad_vulnerable_id INTEGER NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT empresa_actividades_vulnerables_empresa_id_fkey
        FOREIGN KEY (empresa_id)
        REFERENCES public.empresas(id)
        ON DELETE CASCADE,
    CONSTRAINT empresa_actividades_vulnerables_actividad_vulnerable_id_fkey
        FOREIGN KEY (actividad_vulnerable_id)
        REFERENCES public.cat_actividades_vulnerables(id),
    CONSTRAINT empresa_actividades_vulnerables_empresa_actividad_key
        UNIQUE (empresa_id, actividad_vulnerable_id)
);

CREATE INDEX idx_empresa_actividades_vulnerables_empresa
    ON public.empresa_actividades_vulnerables (empresa_id);

CREATE INDEX idx_empresa_actividades_vulnerables_actividad
    ON public.empresa_actividades_vulnerables (actividad_vulnerable_id);

CREATE INDEX idx_cat_actividades_vulnerables_activo
    ON public.cat_actividades_vulnerables (activo);

INSERT INTO public.cat_actividades_vulnerables (
    fraccion,
    clave,
    nombre
)
VALUES
    ('I', 'AV_VENTA_DE_BOLETOS_O_FICHAS_PARA_APUESTAS', 'Venta de boletos o fichas para apuestas'),
    ('I', 'AV_CONCURSOS_O_SORTEOS', 'Concursos o sorteos'),
    ('II', 'AV_EMISION_O_COMERCIALIZACION_DE_TARJETAS_DE_CREDITO', 'Emisión o comercialización de tarjetas de crédito'),
    ('III', 'AV_EMISION_O_COMERCIALIZACION_DE_TARJETAS_DE_PREPAGO', 'Emisión o comercialización de tarjetas de prepago'),
    ('IV', 'AV_OTORGAMIENTO_DE_MUTUO_O_PRESTAMOS', 'Otorgamiento de mutuo o préstamos'),
    ('IV', 'AV_OTORGAMIENTO_DE_GARANTIAS', 'Otorgamiento de garantías'),
    ('V', 'AV_CONSTRUCCION_DE_INMUEBLES', 'Construcción de inmuebles'),
    ('V Bis', 'AV_DESARROLLO_DE_BIENES_INMUEBLES', 'Desarrollo de bienes inmuebles'),
    ('V', 'AV_INTERMEDIACION_EN_TRANSMISION_DE_PROPIEDAD', 'Intermediación en transmisión de propiedad'),
    ('VI', 'AV_COMERCIALIZACION_DE_METALES_Y_PIEDRAS_PRECIOSAS', 'Comercialización de metales y piedras preciosas'),
    ('VI', 'AV_COMERCIALIZACION_DE_JOYAS_O_RELOJES', 'Comercialización de joyas o relojes'),
    ('VII', 'AV_COMERCIALIZACION_DE_OBRAS_DE_ARTE', 'Comercialización de obras de arte'),
    ('VII', 'AV_SUBASTA_DE_OBRAS_DE_ARTE', 'Subasta de obras de arte'),
    ('VIII', 'AV_COMERCIALIZACION_DE_VEHICULOS_TERRESTRES', 'Comercialización de vehículos terrestres'),
    ('VIII', 'AV_COMERCIALIZACION_DE_VEHICULOS_AEREOS', 'Comercialización de vehículos aéreos'),
    ('VIII', 'AV_COMERCIALIZACION_DE_VEHICULOS_MARITIMOS', 'Comercialización de vehículos marítimos'),
    ('IX', 'AV_BLINDAJE_DE_VEHICULOS', 'Blindaje de vehículos'),
    ('IX', 'AV_BLINDAJE_DE_INMUEBLES', 'Blindaje de inmuebles'),
    ('X', 'AV_TRASLADO_O_CUSTODIA_DE_DINERO_Y_VALORES', 'Traslado o custodia de dinero y valores'),
    ('XI', 'AV_COMPRAVENTA_DE_INMUEBLES_A_NOMBRE_DEL_CLIENTE', 'Compraventa de inmuebles a nombre del cliente'),
    ('XI', 'AV_ADMINISTRACION_DE_RECURSOS_O_CUENTAS', 'Administración de recursos o cuentas'),
    ('XI', 'AV_ORGANIZACION_DE_APORTACIONES_DE_CAPITAL', 'Organización de aportaciones de capital'),
    ('XI', 'AV_CONSTITUCION_Y_ADMINISTRACION_DE_SOCIEDADES', 'Constitución y administración de sociedades'),
    ('XII', 'AV_TRANSMISION_DE_DERECHOS_REALES_INMUEBLES', 'Transmisión de derechos reales sobre inmuebles'),
    ('XII', 'AV_OTORGAMIENTO_DE_PODERES_PARA_ACTOS_DE_DOMINIO', 'Otorgamiento de poderes para actos de dominio'),
    ('XII', 'AV_CONSTITUCION_DE_PERSONAS_MORALES', 'Constitución de personas morales'),
    ('XIII', 'AV_RECEPCION_DE_DONATIVOS', 'Recepción de donativos'),
    ('XIV', 'AV_DESPACHO_ADUANERO_DE_VEHICULOS', 'Despacho aduanero de vehículos'),
    ('XIV', 'AV_DESPACHO_ADUANERO_DE_METALES_JOYAS_O_ARTE', 'Despacho aduanero de metales, joyas o arte'),
    ('XV', 'AV_ARRENDAMIENTO_DE_BIENES_INMUEBLES', 'Arrendamiento de bienes inmuebles'),
    ('XVI', 'AV_INTERCAMBIO_DE_ACTIVOS_VIRTUALES', 'Intercambio de activos virtuales');

INSERT INTO public.schema_migrations (migration_key)
VALUES ('20260727_001_empresa_actividades_vulnerables');

COMMIT;
