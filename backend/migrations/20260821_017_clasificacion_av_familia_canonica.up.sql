BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtext('20260821_017_clasificacion_av_familia_canonica')
);

DO $$
DECLARE
  required_table TEXT;
  required_key TEXT;
  master_table TEXT;
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Esquema invalido: se esperaba public';
  END IF;
  FOREACH required_table IN ARRAY ARRAY[
    'schema_migrations','cat_actividades_economicas','cat_giros_mercantiles',
    'cat_actividades_vulnerables_generales','cat_operaciones_vulnerables',
    'actividad_vulnerable_operaciones','empresa_actividades_vulnerables',
    'cliente_selecciones_pld','cliente_perfil_transaccional',
    'clasificacion_actividad_pld_version','clasificacion_actividad_pld_item'
  ] LOOP
    IF pg_catalog.to_regclass('public.' || required_table) IS NULL THEN
      RAISE EXCEPTION 'Preflight fallido: falta public.%', required_table;
    END IF;
  END LOOP;
  FOREACH required_key IN ARRAY ARRAY[
    '20260728_001_modelo_integral_actividades_vulnerables',
    '20260817_012_clasificacion_actividad_pld',
    '20260817_013_seed_clasificacion_actividad_pld',
    '20260820_016_cliente_pt_respuesta_numerica'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.schema_migrations WHERE migration_key=required_key
    ) THEN
      RAISE EXCEPTION 'Preflight fallido: falta migracion %', required_key;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid='public.cat_actividades_vulnerables_generales'::pg_catalog.regclass
      AND c.contype='p' AND c.convalidated
      AND c.conkey=ARRAY[(SELECT a.attnum FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.conrelid AND a.attname='id' AND a.attnum>0 AND NOT a.attisdropped)]::SMALLINT[]
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid='public.cat_actividades_vulnerables_generales'::pg_catalog.regclass
      AND c.contype='u' AND c.convalidated
      AND c.conkey=ARRAY[(SELECT a.attnum FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.conrelid AND a.attname='clave' AND a.attnum>0 AND NOT a.attisdropped)]::SMALLINT[]
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid='public.cat_operaciones_vulnerables'::pg_catalog.regclass
      AND c.contype='p' AND c.convalidated
      AND c.conkey=ARRAY[(SELECT a.attnum FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.conrelid AND a.attname='id' AND a.attnum>0 AND NOT a.attisdropped)]::SMALLINT[]
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid='public.cat_operaciones_vulnerables'::pg_catalog.regclass
      AND c.contype='u' AND c.convalidated
      AND c.conkey=ARRAY[(SELECT a.attnum FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.conrelid AND a.attname='clave' AND a.attnum>0 AND NOT a.attisdropped)]::SMALLINT[]
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid='public.actividad_vulnerable_operaciones'::pg_catalog.regclass
      AND c.contype='f' AND c.convalidated
      AND c.confrelid='public.cat_actividades_vulnerables_generales'::pg_catalog.regclass
      AND c.conkey=ARRAY[(SELECT a.attnum FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.conrelid AND a.attname='actividad_vulnerable_id' AND a.attnum>0 AND NOT a.attisdropped)]::SMALLINT[]
      AND c.confkey=ARRAY[(SELECT a.attnum FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.confrelid AND a.attname='id' AND a.attnum>0 AND NOT a.attisdropped)]::SMALLINT[]
      AND c.confupdtype='a' AND c.confdeltype='r' AND c.confmatchtype='s'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid='public.actividad_vulnerable_operaciones'::pg_catalog.regclass
      AND c.contype='f' AND c.convalidated
      AND c.confrelid='public.cat_operaciones_vulnerables'::pg_catalog.regclass
      AND c.conkey=ARRAY[(SELECT a.attnum FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.conrelid AND a.attname='operacion_vulnerable_id' AND a.attnum>0 AND NOT a.attisdropped)]::SMALLINT[]
      AND c.confkey=ARRAY[(SELECT a.attnum FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.confrelid AND a.attname='id' AND a.attnum>0 AND NOT a.attisdropped)]::SMALLINT[]
      AND c.confupdtype='a' AND c.confdeltype='r' AND c.confmatchtype='s'
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: contrato estructural de jerarquia AV incompatible';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key='20260821_017_clasificacion_av_familia_canonica'
  ) THEN
    RAISE EXCEPTION 'La migracion 017 ya esta registrada';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute
    WHERE attrelid='public.clasificacion_actividad_pld_item'::pg_catalog.regclass
      AND attname='familia_av_id' AND attnum>0 AND NOT attisdropped
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conname IN ('fk_clasificacion_actividad_pld_item_familia_av','ck_clasificacion_actividad_pld_item_familia_av')
  ) OR pg_catalog.to_regclass('public.idx_clasificacion_actividad_pld_item_resolucion_av') IS NOT NULL THEN
    RAISE EXCEPTION 'Preflight fallido: existen objetos parciales de 017';
  END IF;

  FOREACH master_table IN ARRAY ARRAY['cat_actividades_economicas','cat_giros_mercantiles'] LOOP
    IF (
      SELECT pg_catalog.count(*) FROM (VALUES
        ('id','pg_catalog.int8'::pg_catalog.regtype,-1,true),
        ('clave','pg_catalog.varchar'::pg_catalog.regtype,24,true),
        ('descripcion','pg_catalog.varchar'::pg_catalog.regtype,504,true),
        ('activo','pg_catalog.bool'::pg_catalog.regtype,-1,true),
        ('created_at','pg_catalog.timestamptz'::pg_catalog.regtype,-1,true),
        ('updated_at','pg_catalog.timestamptz'::pg_catalog.regtype,-1,true)
      ) expected(nombre,tipo,typmod,no_nula)
      JOIN pg_catalog.pg_attribute a
        ON a.attrelid=pg_catalog.to_regclass('public.' || master_table)
       AND a.attname=expected.nombre AND a.attnum>0 AND NOT a.attisdropped
       AND a.atttypid=expected.tipo AND a.atttypmod=expected.typmod
       AND a.attnotnull=expected.no_nula
    ) <> 6 OR NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid=pg_catalog.to_regclass('public.' || master_table)
        AND c.contype='p' AND c.convalidated
        AND c.conkey=ARRAY[(SELECT attnum FROM pg_catalog.pg_attribute
          WHERE attrelid=c.conrelid AND attname='id')]::SMALLINT[]
    ) OR NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid=pg_catalog.to_regclass('public.' || master_table)
        AND c.contype='u' AND c.convalidated
        AND c.conkey=ARRAY[(SELECT attnum FROM pg_catalog.pg_attribute
          WHERE attrelid=c.conrelid AND attname='clave')]::SMALLINT[]
    ) THEN
      RAISE EXCEPTION 'Preflight fallido: contrato maestro incompatible en %', master_table;
    END IF;
  END LOOP;

  IF (SELECT pg_catalog.count(*) FROM public.cat_actividades_vulnerables_generales) <> 14
     OR (SELECT pg_catalog.count(*) FROM public.cat_operaciones_vulnerables) <> 31
     OR (SELECT pg_catalog.count(*) FROM public.actividad_vulnerable_operaciones) <> 31 THEN
    RAISE EXCEPTION 'Preflight fallido: volumen de catalogos AV distinto del autorizado';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid='public.clasificacion_actividad_pld_item'::pg_catalog.regclass
      AND c.contype='u' AND c.convalidated
      AND c.conkey=ARRAY[
        (SELECT a.attnum FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.conrelid AND a.attname='version_id' AND a.attnum>0 AND NOT a.attisdropped),
        (SELECT a.attnum FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.conrelid AND a.attname='clave_catalogo' AND a.attnum>0 AND NOT a.attisdropped),
        (SELECT a.attnum FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.conrelid AND a.attname='marca_canonica' AND a.attnum>0 AND NOT a.attisdropped)
      ]::SMALLINT[]
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: UNIQUE historico de clasificacion incompatible';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.cliente_perfil_transaccional p
    WHERE p.seleccion_pld_cliente_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.cliente_selecciones_pld s WHERE s.id=p.seleccion_pld_cliente_id)
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: perfil PT con seleccion PLD huerfana';
  END IF;
  IF (SELECT pg_catalog.count(*) FROM public.clasificacion_actividad_pld_version) <> 2
     OR (SELECT pg_catalog.count(*) FROM public.clasificacion_actividad_pld_item) <> 99
     OR (SELECT pg_catalog.count(*) FROM public.clasificacion_actividad_pld_item WHERE marca_canonica='AV') <> 38
     OR (SELECT pg_catalog.count(*) FROM public.clasificacion_actividad_pld_item WHERE marca_canonica='HUACHICOL') <> 5
     OR (SELECT pg_catalog.count(*) FROM public.clasificacion_actividad_pld_item WHERE marca_canonica='DOBLE_USO') <> 33
     OR (SELECT pg_catalog.count(*) FROM public.clasificacion_actividad_pld_item WHERE marca_canonica='PEP') <> 16
     OR (SELECT pg_catalog.count(*) FROM public.clasificacion_actividad_pld_item WHERE marca_canonica='PEP_EXTRANJERO') <> 0
     OR (SELECT pg_catalog.count(*) FROM public.clasificacion_actividad_pld_item WHERE marca_canonica='OSFL') <> 7 THEN
    RAISE EXCEPTION 'Preflight fallido: clasificacion 013 fue alterada';
  END IF;
END
$$;

CREATE TEMP TABLE legacy_family_017(clave TEXT PRIMARY KEY,nombre TEXT NOT NULL) ON COMMIT DROP;
INSERT INTO legacy_family_017 VALUES
('AVG_JUEGOS_SORTEOS','Juegos, apuestas, concursos y sorteos'),
('AVG_INSTRUMENTOS_VALOR','Emisión o comercialización de instrumentos de valor'),
('AVG_PRESTAMOS_GARANTIAS','Mutuos, préstamos y garantías no financieros'),
('AVG_INMOBILIARIA','Actividad inmobiliaria'),
('AVG_METALES_JOYERIA','Metales, piedras preciosas, joyas y relojes'),
('AVG_OBRAS_ARTE','Obras de arte'),
('AVG_VEHICULOS','Comercialización de vehículos'),
('AVG_BLINDAJE','Servicios de blindaje'),
('AVG_TRASLADO_VALORES','Traslado o custodia de dinero y valores'),
('AVG_SERVICIOS_PROFESIONALES','Servicios profesionales vulnerables'),
('AVG_FE_PUBLICA','Actos de fe pública vulnerables'),
('AVG_DONATIVOS','Recepción de donativos'),
('AVG_COMERCIO_EXTERIOR','Servicios de comercio exterior vulnerables'),
('AVG_ACTIVOS_VIRTUALES','Intercambio de activos virtuales');

CREATE TEMP TABLE legacy_bridge_017(operation_key TEXT PRIMARY KEY,family_key TEXT NOT NULL) ON COMMIT DROP;
INSERT INTO legacy_bridge_017 VALUES
('AV_VENTA_DE_BOLETOS_O_FICHAS_PARA_APUESTAS','AVG_JUEGOS_SORTEOS'),('AV_CONCURSOS_O_SORTEOS','AVG_JUEGOS_SORTEOS'),
('AV_EMISION_O_COMERCIALIZACION_DE_TARJETAS_DE_CREDITO','AVG_INSTRUMENTOS_VALOR'),('AV_EMISION_O_COMERCIALIZACION_DE_TARJETAS_DE_PREPAGO','AVG_INSTRUMENTOS_VALOR'),
('AV_OTORGAMIENTO_DE_MUTUO_O_PRESTAMOS','AVG_PRESTAMOS_GARANTIAS'),('AV_OTORGAMIENTO_DE_GARANTIAS','AVG_PRESTAMOS_GARANTIAS'),
('AV_CONSTRUCCION_DE_INMUEBLES','AVG_INMOBILIARIA'),('AV_DESARROLLO_DE_BIENES_INMUEBLES','AVG_INMOBILIARIA'),
('AV_COMPRAVENTA_DE_INMUEBLES_A_NOMBRE_DEL_CLIENTE','AVG_INMOBILIARIA'),('AV_INTERMEDIACION_EN_TRANSMISION_DE_PROPIEDAD','AVG_INMOBILIARIA'),
('AV_ARRENDAMIENTO_DE_BIENES_INMUEBLES','AVG_INMOBILIARIA'),('AV_TRANSMISION_DE_DERECHOS_REALES_INMUEBLES','AVG_INMOBILIARIA'),
('AV_COMERCIALIZACION_DE_METALES_Y_PIEDRAS_PRECIOSAS','AVG_METALES_JOYERIA'),('AV_COMERCIALIZACION_DE_JOYAS_O_RELOJES','AVG_METALES_JOYERIA'),
('AV_COMERCIALIZACION_DE_OBRAS_DE_ARTE','AVG_OBRAS_ARTE'),('AV_SUBASTA_DE_OBRAS_DE_ARTE','AVG_OBRAS_ARTE'),
('AV_COMERCIALIZACION_DE_VEHICULOS_TERRESTRES','AVG_VEHICULOS'),('AV_COMERCIALIZACION_DE_VEHICULOS_AEREOS','AVG_VEHICULOS'),
('AV_COMERCIALIZACION_DE_VEHICULOS_MARITIMOS','AVG_VEHICULOS'),('AV_BLINDAJE_DE_VEHICULOS','AVG_BLINDAJE'),
('AV_BLINDAJE_DE_INMUEBLES','AVG_BLINDAJE'),('AV_TRASLADO_O_CUSTODIA_DE_DINERO_Y_VALORES','AVG_TRASLADO_VALORES'),
('AV_ADMINISTRACION_DE_RECURSOS_O_CUENTAS','AVG_SERVICIOS_PROFESIONALES'),('AV_ORGANIZACION_DE_APORTACIONES_DE_CAPITAL','AVG_SERVICIOS_PROFESIONALES'),
('AV_CONSTITUCION_Y_ADMINISTRACION_DE_SOCIEDADES','AVG_SERVICIOS_PROFESIONALES'),('AV_OTORGAMIENTO_DE_PODERES_PARA_ACTOS_DE_DOMINIO','AVG_FE_PUBLICA'),
('AV_CONSTITUCION_DE_PERSONAS_MORALES','AVG_FE_PUBLICA'),('AV_RECEPCION_DE_DONATIVOS','AVG_DONATIVOS'),
('AV_DESPACHO_ADUANERO_DE_VEHICULOS','AVG_COMERCIO_EXTERIOR'),('AV_DESPACHO_ADUANERO_DE_METALES_JOYAS_O_ARTE','AVG_COMERCIO_EXTERIOR'),
('AV_INTERCAMBIO_DE_ACTIVOS_VIRTUALES','AVG_ACTIVOS_VIRTUALES');

CREATE TEMP TABLE legacy_assignment_fixture_017(empresa_id INTEGER PRIMARY KEY,family_key TEXT NOT NULL) ON COMMIT DROP;
INSERT INTO legacy_assignment_fixture_017 VALUES
(38,'AVG_SERVICIOS_PROFESIONALES'),
(39,'AVG_SERVICIOS_PROFESIONALES'),
(40,'AVG_SERVICIOS_PROFESIONALES'),
(41,'AVG_INMOBILIARIA'),
(42,'AVG_SERVICIOS_PROFESIONALES');

CREATE TEMP TABLE legacy_selection_fixture_017(
  id INTEGER PRIMARY KEY,
  cliente_id INTEGER NOT NULL,
  empresa_id INTEGER NOT NULL,
  family_key TEXT NOT NULL,
  operation_key TEXT NOT NULL,
  origen_seleccion TEXT NOT NULL,
  activo BOOLEAN NOT NULL
) ON COMMIT DROP;
INSERT INTO legacy_selection_fixture_017 VALUES
(4,112,38,'AVG_SERVICIOS_PROFESIONALES','AV_ADMINISTRACION_DE_RECURSOS_O_CUENTAS','automatica',true),
(5,113,38,'AVG_SERVICIOS_PROFESIONALES','AV_ADMINISTRACION_DE_RECURSOS_O_CUENTAS','automatica',true),
(6,114,38,'AVG_SERVICIOS_PROFESIONALES','AV_ADMINISTRACION_DE_RECURSOS_O_CUENTAS','automatica',true);

DO $$
DECLARE
  legacy_fixture_state BOOLEAN;
  clean_fixture_state BOOLEAN;
BEGIN
  IF EXISTS (
    (SELECT clave,nombre FROM public.cat_actividades_vulnerables_generales WHERE fraccion IS NULL
     EXCEPT SELECT clave,nombre FROM legacy_family_017)
    UNION ALL
    (SELECT clave,nombre FROM legacy_family_017
     EXCEPT SELECT clave,nombre FROM public.cat_actividades_vulnerables_generales WHERE fraccion IS NULL)
  ) OR EXISTS (SELECT 1 FROM public.cat_actividades_vulnerables_generales WHERE fraccion IS NOT NULL) THEN
    RAISE EXCEPTION 'Preflight fallido: claves, nombres o fracciones de familias legacy incompatibles';
  END IF;
  IF EXISTS (
    SELECT 1 FROM legacy_bridge_017 e
    LEFT JOIN public.cat_operaciones_vulnerables o ON o.clave=e.operation_key
    LEFT JOIN public.actividad_vulnerable_operaciones r ON r.operacion_vulnerable_id=o.id
    LEFT JOIN public.cat_actividades_vulnerables_generales f ON f.id=r.actividad_vulnerable_id AND f.clave=e.family_key
    WHERE f.id IS NULL
  ) OR EXISTS (
    SELECT operacion_vulnerable_id FROM public.actividad_vulnerable_operaciones
    GROUP BY operacion_vulnerable_id HAVING pg_catalog.count(*)<>1
  ) OR EXISTS (
    SELECT 1 FROM public.cliente_selecciones_pld s
    JOIN public.empresa_actividades_vulnerables e ON e.id=s.empresa_actividad_vulnerable_id
    JOIN public.actividad_vulnerable_operaciones r ON r.id=s.actividad_operacion_id
    WHERE e.actividad_vulnerable_id<>r.actividad_vulnerable_id
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: puente legacy o selecciones de prueba incompatibles';
  END IF;

  legacy_fixture_state :=
    (SELECT pg_catalog.count(*) FROM public.empresa_actividades_vulnerables)=5
    AND (SELECT pg_catalog.count(*) FROM public.cliente_selecciones_pld)=3
    AND NOT EXISTS (
      (SELECT e.empresa_id,f.clave
       FROM public.empresa_actividades_vulnerables e
       JOIN public.cat_actividades_vulnerables_generales f ON f.id=e.actividad_vulnerable_id
       EXCEPT SELECT empresa_id,family_key FROM legacy_assignment_fixture_017)
      UNION ALL
      (SELECT empresa_id,family_key FROM legacy_assignment_fixture_017
       EXCEPT SELECT e.empresa_id,f.clave
       FROM public.empresa_actividades_vulnerables e
       JOIN public.cat_actividades_vulnerables_generales f ON f.id=e.actividad_vulnerable_id)
    )
    AND NOT EXISTS (
      (SELECT s.id,s.cliente_id,s.empresa_id,f.clave,o.clave,s.origen_seleccion,s.activo
       FROM public.cliente_selecciones_pld s
       JOIN public.empresa_actividades_vulnerables e ON e.id=s.empresa_actividad_vulnerable_id AND e.empresa_id=s.empresa_id
       JOIN public.cat_actividades_vulnerables_generales f ON f.id=e.actividad_vulnerable_id
       JOIN public.actividad_vulnerable_operaciones r ON r.id=s.actividad_operacion_id
       JOIN public.cat_operaciones_vulnerables o ON o.id=r.operacion_vulnerable_id
       EXCEPT SELECT id,cliente_id,empresa_id,family_key,operation_key,origen_seleccion,activo FROM legacy_selection_fixture_017)
      UNION ALL
      (SELECT id,cliente_id,empresa_id,family_key,operation_key,origen_seleccion,activo FROM legacy_selection_fixture_017
       EXCEPT SELECT s.id,s.cliente_id,s.empresa_id,f.clave,o.clave,s.origen_seleccion,s.activo
       FROM public.cliente_selecciones_pld s
       JOIN public.empresa_actividades_vulnerables e ON e.id=s.empresa_actividad_vulnerable_id AND e.empresa_id=s.empresa_id
       JOIN public.cat_actividades_vulnerables_generales f ON f.id=e.actividad_vulnerable_id
       JOIN public.actividad_vulnerable_operaciones r ON r.id=s.actividad_operacion_id
       JOIN public.cat_operaciones_vulnerables o ON o.id=r.operacion_vulnerable_id)
    );

  clean_fixture_state :=
    (SELECT pg_catalog.count(*) FROM public.empresa_actividades_vulnerables)=0
    AND (SELECT pg_catalog.count(*) FROM public.cliente_selecciones_pld)=0
    AND NOT EXISTS (
      SELECT 1 FROM public.cliente_perfil_transaccional WHERE seleccion_pld_cliente_id IS NOT NULL
    );

  IF NOT legacy_fixture_state AND NOT clean_fixture_state THEN
    RAISE EXCEPTION 'Preflight fallido: fixtures AV no corresponden al estado legacy exacto ni al estado limpio autorizado';
  END IF;
END
$$;

CREATE TEMP TABLE map_family_017(legacy_key TEXT PRIMARY KEY, canonical_key TEXT NOT NULL UNIQUE) ON COMMIT DROP;
INSERT INTO map_family_017 VALUES
('AVG_INSTRUMENTOS_VALOR','AVG_TARJETAS_NO_BANCARIAS'),
('AVG_PRESTAMOS_GARANTIAS','AVG_FINANCIAMIENTO_NO_BANCARIO'),
('AVG_INMOBILIARIA','AVG_SECTOR_INMOBILIARIO'),
('AVG_METALES_JOYERIA','AVG_JOYERIA_RELOJES_METALES'),
('AVG_OBRAS_ARTE','AVG_ARTE_ANTIGUEDADES'),
('AVG_TRASLADO_VALORES','AVG_SEGURIDAD_CUSTODIA'),
('AVG_COMERCIO_EXTERIOR','AVG_AGENTES_ADUANALES');

UPDATE public.cliente_perfil_transaccional
SET seleccion_pld_cliente_id=NULL
WHERE seleccion_pld_cliente_id IS NOT NULL;
DELETE FROM public.cliente_selecciones_pld;
DELETE FROM public.empresa_actividades_vulnerables;
DELETE FROM public.actividad_vulnerable_operaciones;

UPDATE public.cat_actividades_vulnerables_generales f
SET clave=m.canonical_key, actualizado_en=pg_catalog.now()
FROM map_family_017 m
WHERE f.clave=m.legacy_key;

INSERT INTO public.cat_actividades_vulnerables_generales(clave,nombre,fraccion,descripcion)
VALUES ('AVG_ARRENDAMIENTO','Arrendamiento','XV',NULL);

CREATE TEMP TABLE canonical_family_017(clave TEXT PRIMARY KEY,nombre TEXT NOT NULL,fraccion TEXT NOT NULL) ON COMMIT DROP;
INSERT INTO canonical_family_017 VALUES
('AVG_JUEGOS_SORTEOS','Juegos, Apuestas y Sorteos','I'),
('AVG_TARJETAS_NO_BANCARIAS','Tarjetas No Bancarias','II y III'),
('AVG_FINANCIAMIENTO_NO_BANCARIO','Financiamiento No Bancario','IV'),
('AVG_SECTOR_INMOBILIARIO','Sector Inmobiliario','V y V Bis'),
('AVG_JOYERIA_RELOJES_METALES','Joyería, Relojes y Metales','VI'),
('AVG_ARTE_ANTIGUEDADES','Arte y Antigüedades','VII'),
('AVG_VEHICULOS','Vehículos','VIII'),
('AVG_BLINDAJE','Blindaje','IX'),
('AVG_SEGURIDAD_CUSTODIA','Seguridad y Custodia','X'),
('AVG_SERVICIOS_PROFESIONALES','Servicios Profesionales','XI'),
('AVG_FE_PUBLICA','Fe Pública (Notarios/Corredores)','XII'),
('AVG_DONATIVOS','Donativos (ONGs)','XIII'),
('AVG_AGENTES_ADUANALES','Agentes Aduanales','XIV'),
('AVG_ARRENDAMIENTO','Arrendamiento','XV'),
('AVG_ACTIVOS_VIRTUALES','Activos Virtuales (Cripto)','XVI');

UPDATE public.cat_actividades_vulnerables_generales f
SET nombre=c.nombre,fraccion=c.fraccion,actualizado_en=pg_catalog.now()
FROM canonical_family_017 c WHERE f.clave=c.clave;

CREATE TEMP TABLE map_operation_017(operation_key TEXT PRIMARY KEY, family_key TEXT NOT NULL) ON COMMIT DROP;
INSERT INTO map_operation_017 VALUES
('AV_VENTA_DE_BOLETOS_O_FICHAS_PARA_APUESTAS','AVG_JUEGOS_SORTEOS'),
('AV_CONCURSOS_O_SORTEOS','AVG_JUEGOS_SORTEOS'),
('AV_EMISION_O_COMERCIALIZACION_DE_TARJETAS_DE_CREDITO','AVG_TARJETAS_NO_BANCARIAS'),
('AV_EMISION_O_COMERCIALIZACION_DE_TARJETAS_DE_PREPAGO','AVG_TARJETAS_NO_BANCARIAS'),
('AV_OTORGAMIENTO_DE_MUTUO_O_PRESTAMOS','AVG_FINANCIAMIENTO_NO_BANCARIO'),
('AV_OTORGAMIENTO_DE_GARANTIAS','AVG_FINANCIAMIENTO_NO_BANCARIO'),
('AV_CONSTRUCCION_DE_INMUEBLES','AVG_SECTOR_INMOBILIARIO'),
('AV_DESARROLLO_DE_BIENES_INMUEBLES','AVG_SECTOR_INMOBILIARIO'),
('AV_INTERMEDIACION_EN_TRANSMISION_DE_PROPIEDAD','AVG_SECTOR_INMOBILIARIO'),
('AV_COMPRAVENTA_DE_INMUEBLES_A_NOMBRE_DEL_CLIENTE','AVG_SERVICIOS_PROFESIONALES'),
('AV_ARRENDAMIENTO_DE_BIENES_INMUEBLES','AVG_ARRENDAMIENTO'),
('AV_TRANSMISION_DE_DERECHOS_REALES_INMUEBLES','AVG_FE_PUBLICA'),
('AV_COMERCIALIZACION_DE_METALES_Y_PIEDRAS_PRECIOSAS','AVG_JOYERIA_RELOJES_METALES'),
('AV_COMERCIALIZACION_DE_JOYAS_O_RELOJES','AVG_JOYERIA_RELOJES_METALES'),
('AV_COMERCIALIZACION_DE_OBRAS_DE_ARTE','AVG_ARTE_ANTIGUEDADES'),
('AV_SUBASTA_DE_OBRAS_DE_ARTE','AVG_ARTE_ANTIGUEDADES'),
('AV_COMERCIALIZACION_DE_VEHICULOS_TERRESTRES','AVG_VEHICULOS'),
('AV_COMERCIALIZACION_DE_VEHICULOS_AEREOS','AVG_VEHICULOS'),
('AV_COMERCIALIZACION_DE_VEHICULOS_MARITIMOS','AVG_VEHICULOS'),
('AV_BLINDAJE_DE_VEHICULOS','AVG_BLINDAJE'),
('AV_BLINDAJE_DE_INMUEBLES','AVG_BLINDAJE'),
('AV_TRASLADO_O_CUSTODIA_DE_DINERO_Y_VALORES','AVG_SEGURIDAD_CUSTODIA'),
('AV_ADMINISTRACION_DE_RECURSOS_O_CUENTAS','AVG_SERVICIOS_PROFESIONALES'),
('AV_ORGANIZACION_DE_APORTACIONES_DE_CAPITAL','AVG_SERVICIOS_PROFESIONALES'),
('AV_CONSTITUCION_Y_ADMINISTRACION_DE_SOCIEDADES','AVG_SERVICIOS_PROFESIONALES'),
('AV_OTORGAMIENTO_DE_PODERES_PARA_ACTOS_DE_DOMINIO','AVG_FE_PUBLICA'),
('AV_CONSTITUCION_DE_PERSONAS_MORALES','AVG_FE_PUBLICA'),
('AV_RECEPCION_DE_DONATIVOS','AVG_DONATIVOS'),
('AV_DESPACHO_ADUANERO_DE_VEHICULOS','AVG_AGENTES_ADUANALES'),
('AV_DESPACHO_ADUANERO_DE_METALES_JOYAS_O_ARTE','AVG_AGENTES_ADUANALES'),
('AV_INTERCAMBIO_DE_ACTIVOS_VIRTUALES','AVG_ACTIVOS_VIRTUALES');

DO $$ BEGIN
  IF (SELECT pg_catalog.count(*) FROM map_operation_017)<>31 OR EXISTS (
    (SELECT clave FROM public.cat_operaciones_vulnerables EXCEPT SELECT operation_key FROM map_operation_017)
    UNION ALL
    (SELECT operation_key FROM map_operation_017 EXCEPT SELECT clave FROM public.cat_operaciones_vulnerables)
  ) THEN RAISE EXCEPTION 'Operaciones Nivel 2 incompatibles'; END IF;
END $$;

INSERT INTO public.actividad_vulnerable_operaciones(actividad_vulnerable_id,operacion_vulnerable_id)
SELECT f.id,o.id FROM map_operation_017 m
JOIN public.cat_actividades_vulnerables_generales f ON f.clave=m.family_key
JOIN public.cat_operaciones_vulnerables o ON o.clave=m.operation_key;

ALTER TABLE public.clasificacion_actividad_pld_item ADD COLUMN familia_av_id INTEGER;
ALTER TABLE public.clasificacion_actividad_pld_item
  ADD CONSTRAINT fk_clasificacion_actividad_pld_item_familia_av
  FOREIGN KEY (familia_av_id) REFERENCES public.cat_actividades_vulnerables_generales(id)
  ON UPDATE NO ACTION ON DELETE RESTRICT;

CREATE TEMP TABLE map_classification_017(tipo_catalogo TEXT,clave_catalogo TEXT,family_key TEXT,PRIMARY KEY(tipo_catalogo,clave_catalogo)) ON COMMIT DROP;
INSERT INTO map_classification_017 VALUES
('ACTIVIDAD_ECONOMICA_PF','8240200','AVG_SERVICIOS_PROFESIONALES'),
('ACTIVIDAD_ECONOMICA_PF','8340100','AVG_SERVICIOS_PROFESIONALES'),
('ACTIVIDAD_ECONOMICA_PF','8340300','AVG_FE_PUBLICA'),
('ACTIVIDAD_ECONOMICA_PF','1135070','AVG_AGENTES_ADUANALES'),
('GIRO_MERCANTIL_PM','2300003','AVG_JOYERIA_RELOJES_METALES'),('GIRO_MERCANTIL_PM','2400002','AVG_JOYERIA_RELOJES_METALES'),
('GIRO_MERCANTIL_PM','2500002','AVG_JOYERIA_RELOJES_METALES'),('GIRO_MERCANTIL_PM','2710004','AVG_SECTOR_INMOBILIARIO'),
('GIRO_MERCANTIL_PM','2720004','AVG_SECTOR_INMOBILIARIO'),('GIRO_MERCANTIL_PM','2730004','AVG_SECTOR_INMOBILIARIO'),
('GIRO_MERCANTIL_PM','2740004','AVG_SECTOR_INMOBILIARIO'),('GIRO_MERCANTIL_PM','2754004','AVG_BLINDAJE'),
('GIRO_MERCANTIL_PM','3360005','AVG_VEHICULOS'),('GIRO_MERCANTIL_PM','3370005','AVG_VEHICULOS'),
('GIRO_MERCANTIL_PM','3380005','AVG_BLINDAJE'),('GIRO_MERCANTIL_PM','3440005','AVG_JOYERIA_RELOJES_METALES'),
('GIRO_MERCANTIL_PM','4660026','AVG_JOYERIA_RELOJES_METALES'),('GIRO_MERCANTIL_PM','4680006','AVG_ARTE_ANTIGUEDADES'),
('GIRO_MERCANTIL_PM','4720006','AVG_VEHICULOS'),('GIRO_MERCANTIL_PM','4730006','AVG_VEHICULOS'),
('GIRO_MERCANTIL_PM','4810007','AVG_VEHICULOS'),('GIRO_MERCANTIL_PM','4820007','AVG_VEHICULOS'),
('GIRO_MERCANTIL_PM','4830007','AVG_VEHICULOS'),('GIRO_MERCANTIL_PM','4850007','AVG_VEHICULOS'),
('GIRO_MERCANTIL_PM','4890007','AVG_AGENTES_ADUANALES'),('GIRO_MERCANTIL_PM','4840007','AVG_SEGURIDAD_CUSTODIA'),
('GIRO_MERCANTIL_PM','5340013','AVG_FINANCIAMIENTO_NO_BANCARIO'),('GIRO_MERCANTIL_PM','5510014','AVG_ARRENDAMIENTO'),
('GIRO_MERCANTIL_PM','5520014','AVG_SECTOR_INMOBILIARIO'),('GIRO_MERCANTIL_PM','5610015','AVG_SERVICIOS_PROFESIONALES'),
('GIRO_MERCANTIL_PM','5620015','AVG_FE_PUBLICA'),('GIRO_MERCANTIL_PM','5680015','AVG_SERVICIOS_PROFESIONALES'),
('GIRO_MERCANTIL_PM','5710016','AVG_SERVICIOS_PROFESIONALES'),('GIRO_MERCANTIL_PM','5720016','AVG_SERVICIOS_PROFESIONALES'),
('GIRO_MERCANTIL_PM','5730016','AVG_SEGURIDAD_CUSTODIA'),('GIRO_MERCANTIL_PM','7130019','AVG_JUEGOS_SORTEOS'),
('GIRO_MERCANTIL_PM','7140019','AVG_JUEGOS_SORTEOS'),('GIRO_MERCANTIL_PM','7150019','AVG_JUEGOS_SORTEOS');

DO $$ BEGIN
  IF (SELECT pg_catalog.count(*) FROM map_classification_017)<>38 OR EXISTS (
    SELECT 1 FROM map_classification_017 m LEFT JOIN public.cat_actividades_economicas c
      ON m.tipo_catalogo='ACTIVIDAD_ECONOMICA_PF' AND c.clave=m.clave_catalogo AND c.activo
    LEFT JOIN public.cat_giros_mercantiles g
      ON m.tipo_catalogo='GIRO_MERCANTIL_PM' AND g.clave=m.clave_catalogo AND g.activo
    WHERE (m.tipo_catalogo='ACTIVIDAD_ECONOMICA_PF' AND c.id IS NULL)
       OR (m.tipo_catalogo='GIRO_MERCANTIL_PM' AND g.id IS NULL)
  ) OR EXISTS (
    SELECT 1 FROM public.clasificacion_actividad_pld_item i
    WHERE i.marca_canonica='AV' AND NOT EXISTS (
      SELECT 1 FROM map_classification_017 m WHERE m.tipo_catalogo=i.tipo_catalogo AND m.clave_catalogo=i.clave_catalogo
    )
  ) THEN RAISE EXCEPTION 'Mapa de clasificacion AV incompatible'; END IF;
END $$;

UPDATE public.clasificacion_actividad_pld_item i
SET familia_av_id=f.id
FROM map_classification_017 m
JOIN public.cat_actividades_vulnerables_generales f ON f.clave=m.family_key
WHERE i.tipo_catalogo=m.tipo_catalogo AND i.clave_catalogo=m.clave_catalogo AND i.marca_canonica='AV';

ALTER TABLE public.clasificacion_actividad_pld_item
  ADD CONSTRAINT ck_clasificacion_actividad_pld_item_familia_av CHECK (
    (marca_canonica='AV' AND familia_av_id IS NOT NULL)
    OR (marca_canonica<>'AV' AND familia_av_id IS NULL)
  );
CREATE INDEX idx_clasificacion_actividad_pld_item_resolucion_av
  ON public.clasificacion_actividad_pld_item(version_id,tipo_catalogo,clave_catalogo,familia_av_id);

INSERT INTO public.schema_migrations(migration_key)
VALUES ('20260821_017_clasificacion_av_familia_canonica');
COMMIT;
