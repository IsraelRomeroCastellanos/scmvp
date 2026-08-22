BEGIN;

DO $$
DECLARE
  family_attnum SMALLINT;
  mark_attnum SMALLINT;
  family_id INTEGER;
  version_id BIGINT;
  rejected BOOLEAN;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE migration_key='20260821_017_clasificacion_av_familia_canonica') THEN
    RAISE EXCEPTION 'VERIFY fallido: falta migration key 017';
  END IF;
  SELECT attnum INTO STRICT family_attnum FROM pg_catalog.pg_attribute
  WHERE attrelid='public.clasificacion_actividad_pld_item'::pg_catalog.regclass
    AND attname='familia_av_id' AND attnum>0 AND NOT attisdropped
    AND atttypid='pg_catalog.int4'::pg_catalog.regtype AND NOT attnotnull;
  SELECT attnum INTO STRICT mark_attnum FROM pg_catalog.pg_attribute
  WHERE attrelid='public.clasificacion_actividad_pld_item'::pg_catalog.regclass
    AND attname='marca_canonica' AND attnum>0 AND NOT attisdropped;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid='public.clasificacion_actividad_pld_item'::pg_catalog.regclass
      AND c.conname='fk_clasificacion_actividad_pld_item_familia_av'
      AND c.contype='f' AND c.convalidated
      AND c.confrelid='public.cat_actividades_vulnerables_generales'::pg_catalog.regclass
      AND c.conkey=ARRAY[family_attnum]::SMALLINT[]
      AND c.confkey=ARRAY[(SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid=c.confrelid AND attname='id')]::SMALLINT[]
      AND c.confupdtype='a' AND c.confdeltype='r' AND c.confmatchtype='s'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid='public.clasificacion_actividad_pld_item'::pg_catalog.regclass
      AND c.conname='ck_clasificacion_actividad_pld_item_familia_av'
      AND c.contype='c' AND c.convalidated
      AND NOT EXISTS (
        SELECT 1 FROM pg_catalog.unnest(c.conkey) k(attnum)
        WHERE k.attnum NOT IN (mark_attnum,family_attnum)
      )
      AND (SELECT pg_catalog.count(*) FROM pg_catalog.unnest(c.conkey))=2
  ) THEN RAISE EXCEPTION 'VERIFY fallido: FK o CHECK incompatible'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid='public.clasificacion_actividad_pld_item'::pg_catalog.regclass
      AND c.contype='u' AND c.convalidated
      AND c.conkey=ARRAY[
        (SELECT a.attnum FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.conrelid AND a.attname='version_id' AND a.attnum>0 AND NOT a.attisdropped),
        (SELECT a.attnum FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.conrelid AND a.attname='clave_catalogo' AND a.attnum>0 AND NOT a.attisdropped),
        (SELECT a.attnum FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.conrelid AND a.attname='marca_canonica' AND a.attnum>0 AND NOT a.attisdropped)
      ]::SMALLINT[]
  ) THEN RAISE EXCEPTION 'VERIFY fallido: UNIQUE historico incompatible'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class x ON x.oid=i.indexrelid
    WHERE i.indrelid='public.clasificacion_actividad_pld_item'::pg_catalog.regclass
      AND x.relnamespace='public'::pg_catalog.regnamespace
      AND x.relname='idx_clasificacion_actividad_pld_item_resolucion_av'
      AND i.indisvalid AND i.indisready AND NOT i.indisunique AND NOT i.indisprimary
      AND i.indnkeyatts=4 AND i.indnatts=4 AND i.indpred IS NULL AND i.indexprs IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM pg_catalog.unnest(i.indkey) WITH ORDINALITY k(attnum,ord)
        LEFT JOIN (VALUES (1,'version_id'),(2,'tipo_catalogo'),(3,'clave_catalogo'),(4,'familia_av_id')) expected(ord,nombre)
          ON expected.ord=k.ord
        LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum
        WHERE expected.nombre IS NULL OR a.attname IS DISTINCT FROM expected.nombre
      )
  ) THEN RAISE EXCEPTION 'VERIFY fallido: indice AV incompatible'; END IF;

  SELECT id INTO STRICT family_id FROM public.cat_actividades_vulnerables_generales WHERE clave='AVG_SERVICIOS_PROFESIONALES';
  SELECT id INTO STRICT version_id FROM public.clasificacion_actividad_pld_version WHERE tipo_catalogo='ACTIVIDAD_ECONOMICA_PF' AND activa;
  INSERT INTO public.clasificacion_actividad_pld_item(id,version_id,tipo_catalogo,clave_catalogo,descripcion_fuente,marca_canonica,familia_av_id)
  VALUES (-17001,version_id,'ACTIVIDAD_ECONOMICA_PF','VERIFY_017_OK','Prueba valida','AV',family_id);
  DELETE FROM public.clasificacion_actividad_pld_item WHERE id=-17001;
  rejected:=false;
  BEGIN
    INSERT INTO public.clasificacion_actividad_pld_item(id,version_id,tipo_catalogo,clave_catalogo,descripcion_fuente,marca_canonica,familia_av_id)
    VALUES (-17002,version_id,'ACTIVIDAD_ECONOMICA_PF','VERIFY_017_BAD_AV','Prueba invalida','AV',NULL);
  EXCEPTION WHEN check_violation THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'VERIFY fallido: CHECK acepta AV sin familia'; END IF;
  rejected:=false;
  BEGIN
    INSERT INTO public.clasificacion_actividad_pld_item(id,version_id,tipo_catalogo,clave_catalogo,descripcion_fuente,marca_canonica,familia_av_id)
    VALUES (-17003,version_id,'ACTIVIDAD_ECONOMICA_PF','VERIFY_017_BAD_OTHER','Prueba invalida','PEP',family_id);
  EXCEPTION WHEN check_violation THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'VERIFY fallido: CHECK acepta marca no AV con familia'; END IF;
END
$$;

CREATE TEMP TABLE expected_families_017(clave TEXT PRIMARY KEY,nombre TEXT NOT NULL,fraccion TEXT NOT NULL) ON COMMIT DROP;
INSERT INTO expected_families_017 VALUES
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

CREATE TEMP TABLE expected_operations_017(operation_key TEXT PRIMARY KEY,family_key TEXT NOT NULL) ON COMMIT DROP;
INSERT INTO expected_operations_017 VALUES
('AV_VENTA_DE_BOLETOS_O_FICHAS_PARA_APUESTAS','AVG_JUEGOS_SORTEOS'),('AV_CONCURSOS_O_SORTEOS','AVG_JUEGOS_SORTEOS'),
('AV_EMISION_O_COMERCIALIZACION_DE_TARJETAS_DE_CREDITO','AVG_TARJETAS_NO_BANCARIAS'),('AV_EMISION_O_COMERCIALIZACION_DE_TARJETAS_DE_PREPAGO','AVG_TARJETAS_NO_BANCARIAS'),
('AV_OTORGAMIENTO_DE_MUTUO_O_PRESTAMOS','AVG_FINANCIAMIENTO_NO_BANCARIO'),('AV_OTORGAMIENTO_DE_GARANTIAS','AVG_FINANCIAMIENTO_NO_BANCARIO'),
('AV_CONSTRUCCION_DE_INMUEBLES','AVG_SECTOR_INMOBILIARIO'),('AV_DESARROLLO_DE_BIENES_INMUEBLES','AVG_SECTOR_INMOBILIARIO'),
('AV_INTERMEDIACION_EN_TRANSMISION_DE_PROPIEDAD','AVG_SECTOR_INMOBILIARIO'),('AV_COMPRAVENTA_DE_INMUEBLES_A_NOMBRE_DEL_CLIENTE','AVG_SERVICIOS_PROFESIONALES'),
('AV_ARRENDAMIENTO_DE_BIENES_INMUEBLES','AVG_ARRENDAMIENTO'),('AV_TRANSMISION_DE_DERECHOS_REALES_INMUEBLES','AVG_FE_PUBLICA'),
('AV_COMERCIALIZACION_DE_METALES_Y_PIEDRAS_PRECIOSAS','AVG_JOYERIA_RELOJES_METALES'),('AV_COMERCIALIZACION_DE_JOYAS_O_RELOJES','AVG_JOYERIA_RELOJES_METALES'),
('AV_COMERCIALIZACION_DE_OBRAS_DE_ARTE','AVG_ARTE_ANTIGUEDADES'),('AV_SUBASTA_DE_OBRAS_DE_ARTE','AVG_ARTE_ANTIGUEDADES'),
('AV_COMERCIALIZACION_DE_VEHICULOS_TERRESTRES','AVG_VEHICULOS'),('AV_COMERCIALIZACION_DE_VEHICULOS_AEREOS','AVG_VEHICULOS'),
('AV_COMERCIALIZACION_DE_VEHICULOS_MARITIMOS','AVG_VEHICULOS'),('AV_BLINDAJE_DE_VEHICULOS','AVG_BLINDAJE'),
('AV_BLINDAJE_DE_INMUEBLES','AVG_BLINDAJE'),('AV_TRASLADO_O_CUSTODIA_DE_DINERO_Y_VALORES','AVG_SEGURIDAD_CUSTODIA'),
('AV_ADMINISTRACION_DE_RECURSOS_O_CUENTAS','AVG_SERVICIOS_PROFESIONALES'),('AV_ORGANIZACION_DE_APORTACIONES_DE_CAPITAL','AVG_SERVICIOS_PROFESIONALES'),
('AV_CONSTITUCION_Y_ADMINISTRACION_DE_SOCIEDADES','AVG_SERVICIOS_PROFESIONALES'),('AV_OTORGAMIENTO_DE_PODERES_PARA_ACTOS_DE_DOMINIO','AVG_FE_PUBLICA'),
('AV_CONSTITUCION_DE_PERSONAS_MORALES','AVG_FE_PUBLICA'),('AV_RECEPCION_DE_DONATIVOS','AVG_DONATIVOS'),
('AV_DESPACHO_ADUANERO_DE_VEHICULOS','AVG_AGENTES_ADUANALES'),('AV_DESPACHO_ADUANERO_DE_METALES_JOYAS_O_ARTE','AVG_AGENTES_ADUANALES'),
('AV_INTERCAMBIO_DE_ACTIVOS_VIRTUALES','AVG_ACTIVOS_VIRTUALES');

CREATE TEMP TABLE expected_classification_017(tipo_catalogo TEXT,clave_catalogo TEXT,family_key TEXT,PRIMARY KEY(tipo_catalogo,clave_catalogo)) ON COMMIT DROP;
INSERT INTO expected_classification_017 VALUES
('ACTIVIDAD_ECONOMICA_PF','8240200','AVG_SERVICIOS_PROFESIONALES'),('ACTIVIDAD_ECONOMICA_PF','8340100','AVG_SERVICIOS_PROFESIONALES'),
('ACTIVIDAD_ECONOMICA_PF','8340300','AVG_FE_PUBLICA'),('ACTIVIDAD_ECONOMICA_PF','1135070','AVG_AGENTES_ADUANALES'),
('GIRO_MERCANTIL_PM','2300003','AVG_JOYERIA_RELOJES_METALES'),('GIRO_MERCANTIL_PM','2400002','AVG_JOYERIA_RELOJES_METALES'),('GIRO_MERCANTIL_PM','2500002','AVG_JOYERIA_RELOJES_METALES'),
('GIRO_MERCANTIL_PM','2710004','AVG_SECTOR_INMOBILIARIO'),('GIRO_MERCANTIL_PM','2720004','AVG_SECTOR_INMOBILIARIO'),('GIRO_MERCANTIL_PM','2730004','AVG_SECTOR_INMOBILIARIO'),('GIRO_MERCANTIL_PM','2740004','AVG_SECTOR_INMOBILIARIO'),
('GIRO_MERCANTIL_PM','2754004','AVG_BLINDAJE'),('GIRO_MERCANTIL_PM','3360005','AVG_VEHICULOS'),('GIRO_MERCANTIL_PM','3370005','AVG_VEHICULOS'),('GIRO_MERCANTIL_PM','3380005','AVG_BLINDAJE'),
('GIRO_MERCANTIL_PM','3440005','AVG_JOYERIA_RELOJES_METALES'),('GIRO_MERCANTIL_PM','4660026','AVG_JOYERIA_RELOJES_METALES'),('GIRO_MERCANTIL_PM','4680006','AVG_ARTE_ANTIGUEDADES'),
('GIRO_MERCANTIL_PM','4720006','AVG_VEHICULOS'),('GIRO_MERCANTIL_PM','4730006','AVG_VEHICULOS'),('GIRO_MERCANTIL_PM','4810007','AVG_VEHICULOS'),('GIRO_MERCANTIL_PM','4820007','AVG_VEHICULOS'),('GIRO_MERCANTIL_PM','4830007','AVG_VEHICULOS'),('GIRO_MERCANTIL_PM','4850007','AVG_VEHICULOS'),
('GIRO_MERCANTIL_PM','4890007','AVG_AGENTES_ADUANALES'),('GIRO_MERCANTIL_PM','4840007','AVG_SEGURIDAD_CUSTODIA'),('GIRO_MERCANTIL_PM','5340013','AVG_FINANCIAMIENTO_NO_BANCARIO'),
('GIRO_MERCANTIL_PM','5510014','AVG_ARRENDAMIENTO'),('GIRO_MERCANTIL_PM','5520014','AVG_SECTOR_INMOBILIARIO'),('GIRO_MERCANTIL_PM','5610015','AVG_SERVICIOS_PROFESIONALES'),('GIRO_MERCANTIL_PM','5620015','AVG_FE_PUBLICA'),
('GIRO_MERCANTIL_PM','5680015','AVG_SERVICIOS_PROFESIONALES'),('GIRO_MERCANTIL_PM','5710016','AVG_SERVICIOS_PROFESIONALES'),('GIRO_MERCANTIL_PM','5720016','AVG_SERVICIOS_PROFESIONALES'),('GIRO_MERCANTIL_PM','5730016','AVG_SEGURIDAD_CUSTODIA'),
('GIRO_MERCANTIL_PM','7130019','AVG_JUEGOS_SORTEOS'),('GIRO_MERCANTIL_PM','7140019','AVG_JUEGOS_SORTEOS'),('GIRO_MERCANTIL_PM','7150019','AVG_JUEGOS_SORTEOS');

DO $$ BEGIN
  IF EXISTS ((SELECT clave,nombre,fraccion FROM public.cat_actividades_vulnerables_generales EXCEPT SELECT clave,nombre,fraccion FROM expected_families_017)
    UNION ALL (SELECT clave,nombre,fraccion FROM expected_families_017 EXCEPT SELECT clave,nombre,fraccion FROM public.cat_actividades_vulnerables_generales)) THEN RAISE EXCEPTION 'VERIFY: familias, nombres o fracciones incompatibles'; END IF;
  IF (SELECT pg_catalog.count(*) FROM public.empresa_actividades_vulnerables)<>0
    OR (SELECT pg_catalog.count(*) FROM public.cliente_selecciones_pld)<>0
    OR EXISTS (SELECT 1 FROM public.cliente_perfil_transaccional WHERE seleccion_pld_cliente_id IS NOT NULL) THEN
    RAISE EXCEPTION 'VERIFY: fixtures AV no fueron eliminados completamente';
  END IF;
  IF (SELECT pg_catalog.count(*) FROM public.cat_operaciones_vulnerables)<>31 OR EXISTS (
    SELECT 1 FROM public.cat_operaciones_vulnerables o LEFT JOIN expected_operations_017 e ON e.operation_key=o.clave WHERE e.operation_key IS NULL
  ) THEN RAISE EXCEPTION 'VERIFY: operaciones incompatibles'; END IF;
  IF (SELECT pg_catalog.count(*) FROM public.actividad_vulnerable_operaciones)<>31 OR EXISTS (
    SELECT 1 FROM expected_operations_017 e LEFT JOIN public.cat_operaciones_vulnerables o ON o.clave=e.operation_key
    LEFT JOIN public.actividad_vulnerable_operaciones r ON r.operacion_vulnerable_id=o.id
    LEFT JOIN public.cat_actividades_vulnerables_generales f ON f.id=r.actividad_vulnerable_id AND f.clave=e.family_key
    WHERE f.id IS NULL
  ) OR EXISTS (
    SELECT operacion_vulnerable_id FROM public.actividad_vulnerable_operaciones GROUP BY operacion_vulnerable_id HAVING pg_catalog.count(*)<>1
  ) THEN RAISE EXCEPTION 'VERIFY: puente Nivel 1/2 incompatible'; END IF;
  IF EXISTS (SELECT 1 FROM public.clasificacion_actividad_pld_item WHERE (marca_canonica='AV') IS DISTINCT FROM (familia_av_id IS NOT NULL)) THEN RAISE EXCEPTION 'VERIFY: semantica AV/familia incumplida'; END IF;
  IF (SELECT pg_catalog.count(*) FROM public.clasificacion_actividad_pld_item WHERE marca_canonica='AV')<>38 OR EXISTS (
    SELECT 1 FROM expected_classification_017 e LEFT JOIN public.clasificacion_actividad_pld_item i ON i.tipo_catalogo=e.tipo_catalogo AND i.clave_catalogo=e.clave_catalogo AND i.marca_canonica='AV'
    LEFT JOIN public.cat_actividades_vulnerables_generales f ON f.id=i.familia_av_id AND f.clave=e.family_key WHERE f.id IS NULL
  ) THEN RAISE EXCEPTION 'VERIFY: mapa actividad/giro a familia incompatible'; END IF;
  IF EXISTS (
    SELECT 1 FROM expected_classification_017 e LEFT JOIN public.cat_actividades_economicas p ON e.tipo_catalogo='ACTIVIDAD_ECONOMICA_PF' AND p.clave=e.clave_catalogo AND p.activo
    LEFT JOIN public.cat_giros_mercantiles m ON e.tipo_catalogo='GIRO_MERCANTIL_PM' AND m.clave=e.clave_catalogo AND m.activo
    WHERE (e.tipo_catalogo='ACTIVIDAD_ECONOMICA_PF' AND p.id IS NULL) OR (e.tipo_catalogo='GIRO_MERCANTIL_PM' AND m.id IS NULL)
  ) THEN RAISE EXCEPTION 'VERIFY: clave maestra ausente o inactiva'; END IF;
  IF (SELECT pg_catalog.count(*) FROM public.clasificacion_actividad_pld_item WHERE marca_canonica='HUACHICOL')<>5
    OR (SELECT pg_catalog.count(*) FROM public.clasificacion_actividad_pld_item WHERE marca_canonica='DOBLE_USO')<>33
    OR (SELECT pg_catalog.count(*) FROM public.clasificacion_actividad_pld_item WHERE marca_canonica='PEP')<>16
    OR (SELECT pg_catalog.count(*) FROM public.clasificacion_actividad_pld_item WHERE marca_canonica='PEP_EXTRANJERO')<>0
    OR (SELECT pg_catalog.count(*) FROM public.clasificacion_actividad_pld_item WHERE marca_canonica='OSFL')<>7 THEN
    RAISE EXCEPTION 'VERIFY: otras marcas no fueron preservadas';
  END IF;
  IF EXISTS (SELECT 1 FROM public.cat_actividades_vulnerables_generales WHERE clave IN ('AVG_INSTRUMENTOS_VALOR','AVG_PRESTAMOS_GARANTIAS','AVG_INMOBILIARIA','AVG_METALES_JOYERIA','AVG_OBRAS_ARTE','AVG_TRASLADO_VALORES','AVG_COMERCIO_EXTERIOR')) THEN RAISE EXCEPTION 'VERIFY: familia legacy presente'; END IF;
END $$;

ROLLBACK;
