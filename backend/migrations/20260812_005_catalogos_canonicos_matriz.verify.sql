BEGIN;
SET TRANSACTION READ ONLY;

SELECT
  pg_catalog.current_database() AS current_database,
  pg_catalog.current_schema() AS current_schema,
  current_user AS current_user,
  pg_catalog.current_setting('server_version') AS server_version;

DO $$
DECLARE
  esperado RECORD;
  real RECORD;
  objeto TEXT;
  expresion TEXT;
  incompatibles BIGINT;
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'VERIFY fallido: se esperaba el esquema public';
  END IF;

  FOREACH objeto IN ARRAY ARRAY[
    'public.schema_migrations',
    'public.catalogo_criterio_pt',
    'public.catalogo_criterio_pt_version',
    'public.catalogo_criterio_gr',
    'public.catalogo_criterio_gr_version'
  ] LOOP
    IF pg_catalog.to_regclass(objeto) IS NULL THEN
      RAISE EXCEPTION 'VERIFY fallido: falta %', objeto;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class t ON t.oid=a.attrelid AND t.relkind IN ('r','p')
    JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
    JOIN pg_catalog.pg_type tipo ON tipo.oid=a.atttypid
    JOIN pg_catalog.pg_namespace tipo_n ON tipo_n.oid=tipo.typnamespace
    WHERE n.nspname='public' AND t.relname='schema_migrations'
      AND a.attname='migration_key' AND a.attnum>0 AND NOT a.attisdropped
      AND tipo_n.nspname='pg_catalog' AND tipo.typname='varchar'
      AND a.atttypmod=150+4 AND a.attnotnull
  ) THEN
    RAISE EXCEPTION 'VERIFY fallido: public.schema_migrations es incompatible';
  END IF;

  FOR esperado IN
    SELECT * FROM (VALUES
      ('catalogo_criterio_pt','ck_catalogo_criterio_pt_retiro'),
      ('catalogo_criterio_gr','ck_catalogo_criterio_gr_retiro')
    ) AS c(tabla, nombre)
  LOOP
    SELECT pg_catalog.pg_get_expr(c.conbin,c.conrelid,true)
      INTO expresion
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public' AND t.relname=esperado.tabla
        AND c.conname=esperado.nombre AND c.contype='c' AND c.convalidated;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'VERIFY fallido: falta CHECK public.%.%',
        esperado.tabla, esperado.nombre;
    END IF;

    EXECUTE pg_catalog.format($sql$
      SELECT pg_catalog.count(*)
      FROM (
        SELECT estado, retirado_por, retirado_en, version_vigente_id,
          CASE
            WHEN estado='ACTIVO' AND retirado_por IS NULL AND retirado_en IS NULL
              THEN true
            WHEN estado='RETIRADO' AND retirado_por IS NOT NULL
              AND retirado_en IS NOT NULL AND version_vigente_id IS NULL
              THEN true
            ELSE false
          END AS esperado
        FROM (VALUES ('ACTIVO'::varchar),('RETIRADO'::varchar),('OTRO'::varchar)) e(estado)
        CROSS JOIN (VALUES (NULL::integer),(1::integer)) rp(retirado_por)
        CROSS JOIN (VALUES (NULL::timestamptz),(pg_catalog.to_timestamp(0))) re(retirado_en)
        CROSS JOIN (VALUES (NULL::integer),(1::integer)) vv(version_vigente_id)
      ) casos
      WHERE (%s) IS DISTINCT FROM esperado
    $sql$, expresion) INTO incompatibles;

    IF incompatibles <> 0 THEN
      RAISE EXCEPTION 'VERIFY fallido: semantica de public.%.% incompatible',
        esperado.tabla, esperado.nombre;
    END IF;
  END LOOP;

  SELECT pg_catalog.pg_get_expr(c.conbin,c.conrelid,true)
    INTO expresion
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND t.relname='catalogo_criterio_pt_version'
      AND c.conname='ck_catalogo_criterio_pt_version_parametrizacion'
      AND c.contype='c' AND c.convalidated;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERIFY fallido: falta parametrizacion PT';
  END IF;

  EXECUTE pg_catalog.format($sql$
    SELECT pg_catalog.count(*)
    FROM (
      SELECT tipo_resolucion, tipo_parametrizacion, unidad_canonica,
        CASE
          WHEN tipo_resolucion='CAPTURA_OPCIONES'
            AND tipo_parametrizacion='OPCIONES' AND unidad_canonica IS NULL THEN true
          WHEN tipo_resolucion='CAPTURA_RANGO_NUMERICO'
            AND tipo_parametrizacion='RANGOS_NUMERICOS'
            AND unidad_canonica='MONTO' THEN true
          ELSE false
        END AS esperado
      FROM (VALUES ('CAPTURA_OPCIONES'::varchar),
                   ('CAPTURA_RANGO_NUMERICO'::varchar),('OTRO'::varchar)) r(tipo_resolucion)
      CROSS JOIN (VALUES ('OPCIONES'::varchar),
                         ('RANGOS_NUMERICOS'::varchar),('OTRO'::varchar)) p(tipo_parametrizacion)
      CROSS JOIN (VALUES (NULL::varchar),('MONTO'::varchar),('monto'::varchar)) u(unidad_canonica)
    ) casos
    WHERE (%s) IS DISTINCT FROM esperado
  $sql$, expresion) INTO incompatibles;

  IF incompatibles <> 0 THEN
    RAISE EXCEPTION 'VERIFY fallido: semantica de parametrizacion PT incompatible';
  END IF;

  SELECT pg_catalog.pg_get_expr(c.conbin,c.conrelid,true)
    INTO expresion
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND t.relname='catalogo_criterio_gr_version'
      AND c.conname='ck_catalogo_criterio_gr_version_parametrizacion'
      AND c.contype='c' AND c.convalidated;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERIFY fallido: falta parametrizacion GR';
  END IF;

  EXECUTE pg_catalog.format($sql$
    SELECT pg_catalog.count(*)
    FROM (
      SELECT tipo_resolucion, tipo_parametrizacion, unidad_canonica,
        CASE
          WHEN tipo_resolucion='KYC_RANGO'
            AND tipo_parametrizacion='RANGOS_NUMERICOS'
            AND unidad_canonica='MONTO' THEN true
          WHEN tipo_resolucion IN ('CATALOGO_GLOBAL','DERIVADO','ESTRUCTURADO')
            AND tipo_parametrizacion='NINGUNA' AND unidad_canonica IS NULL THEN true
          ELSE false
        END AS esperado
      FROM (VALUES ('KYC_RANGO'::varchar),('CATALOGO_GLOBAL'::varchar),
                   ('DERIVADO'::varchar),('ESTRUCTURADO'::varchar),('OTRO'::varchar)) r(tipo_resolucion)
      CROSS JOIN (VALUES ('RANGOS_NUMERICOS'::varchar),
                         ('NINGUNA'::varchar),('OTRO'::varchar)) p(tipo_parametrizacion)
      CROSS JOIN (VALUES (NULL::varchar),('MONTO'::varchar),('monto'::varchar)) u(unidad_canonica)
    ) casos
    WHERE (%s) IS DISTINCT FROM esperado
  $sql$, expresion) INTO incompatibles;

  IF incompatibles <> 0 THEN
    RAISE EXCEPTION 'VERIFY fallido: semantica de parametrizacion GR incompatible';
  END IF;

  SELECT pg_catalog.pg_get_expr(c.conbin,c.conrelid,true)
    INTO expresion
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND t.relname='matriz_criterio'
      AND c.conname='ck_matriz_criterio_catalogo_ambito'
      AND c.contype='c' AND c.convalidated;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERIFY fallido: falta CHECK de catalogo/ambito';
  END IF;

  EXECUTE pg_catalog.format($sql$
    SELECT pg_catalog.count(*)
    FROM (
      SELECT catalogo_criterio_pt_version_id, catalogo_criterio_gr_version_id, ambito,
        ((catalogo_criterio_pt_version_id IS NULL OR ambito='PT')
         AND (catalogo_criterio_gr_version_id IS NULL OR ambito='GR')
         AND NOT (catalogo_criterio_pt_version_id IS NOT NULL
                  AND catalogo_criterio_gr_version_id IS NOT NULL)) AS esperado
      FROM (VALUES (NULL::integer),(1::integer)) pt(catalogo_criterio_pt_version_id)
      CROSS JOIN (VALUES (NULL::integer),(1::integer)) gr(catalogo_criterio_gr_version_id)
      CROSS JOIN (VALUES ('PT'::varchar),('GR'::varchar),('OTRO'::varchar)) a(ambito)
    ) casos
    WHERE (%s) IS DISTINCT FROM esperado
  $sql$, expresion) INTO incompatibles;

  IF incompatibles <> 0 THEN
    RAISE EXCEPTION 'VERIFY fallido: semantica de catalogo/ambito incompatible';
  END IF;

  FOR esperado IN
    SELECT * FROM (VALUES
      ('catalogo_criterio_pt',10),
      ('catalogo_criterio_pt_version',8),
      ('catalogo_criterio_gr',10),
      ('catalogo_criterio_gr_version',9)
    ) AS c(tabla, cantidad)
  LOOP
    IF (
      SELECT pg_catalog.count(*)
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class t ON t.oid=a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public' AND t.relname=esperado.tabla
        AND a.attnum>0 AND NOT a.attisdropped
    ) <> esperado.cantidad THEN
      RAISE EXCEPTION 'VERIFY fallido: public.% tiene columnas inesperadas', esperado.tabla;
    END IF;
  END LOOP;

  FOREACH objeto IN ARRAY ARRAY[
    '20260801_002_matrices_pt_gr_empresa',
    '20260805_003_gestion_matrices_empresa',
    '20260810_004_resultados_globales_matriz',
    '20260812_005_catalogos_canonicos_matriz'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.schema_migrations WHERE migration_key=objeto
    ) THEN
      RAISE EXCEPTION 'VERIFY fallido: falta la migration key %', objeto;
    END IF;
  END LOOP;

  FOR esperado IN
    SELECT * FROM (VALUES
      ('catalogo_criterio_pt','id','integer','NO'),
      ('catalogo_criterio_pt','codigo_canonico','character varying(100)','NO'),
      ('catalogo_criterio_pt','nombre_visible_global','character varying(150)','NO'),
      ('catalogo_criterio_pt','descripcion','text','YES'),
      ('catalogo_criterio_pt','estado','character varying(10)','NO'),
      ('catalogo_criterio_pt','creado_por','integer','NO'),
      ('catalogo_criterio_pt','creado_en','timestamp with time zone','NO'),
      ('catalogo_criterio_pt','retirado_por','integer','YES'),
      ('catalogo_criterio_pt','retirado_en','timestamp with time zone','YES'),
      ('catalogo_criterio_pt','version_vigente_id','integer','YES'),
      ('catalogo_criterio_pt_version','id','integer','NO'),
      ('catalogo_criterio_pt_version','criterio_pt_id','integer','NO'),
      ('catalogo_criterio_pt_version','version_contrato','integer','NO'),
      ('catalogo_criterio_pt_version','tipo_resolucion','character varying(30)','NO'),
      ('catalogo_criterio_pt_version','tipo_parametrizacion','character varying(30)','NO'),
      ('catalogo_criterio_pt_version','unidad_canonica','character varying(100)','YES'),
      ('catalogo_criterio_pt_version','creado_por','integer','NO'),
      ('catalogo_criterio_pt_version','creado_en','timestamp with time zone','NO'),
      ('catalogo_criterio_gr','id','integer','NO'),
      ('catalogo_criterio_gr','codigo_canonico','character varying(100)','NO'),
      ('catalogo_criterio_gr','nombre_visible_global','character varying(150)','NO'),
      ('catalogo_criterio_gr','descripcion','text','YES'),
      ('catalogo_criterio_gr','estado','character varying(10)','NO'),
      ('catalogo_criterio_gr','creado_por','integer','NO'),
      ('catalogo_criterio_gr','creado_en','timestamp with time zone','NO'),
      ('catalogo_criterio_gr','retirado_por','integer','YES'),
      ('catalogo_criterio_gr','retirado_en','timestamp with time zone','YES'),
      ('catalogo_criterio_gr','version_vigente_id','integer','YES'),
      ('catalogo_criterio_gr_version','id','integer','NO'),
      ('catalogo_criterio_gr_version','criterio_gr_id','integer','NO'),
      ('catalogo_criterio_gr_version','version_contrato','integer','NO'),
      ('catalogo_criterio_gr_version','tipo_resolucion','character varying(30)','NO'),
      ('catalogo_criterio_gr_version','resolver_codigo','character varying(100)','NO'),
      ('catalogo_criterio_gr_version','tipo_parametrizacion','character varying(30)','NO'),
      ('catalogo_criterio_gr_version','unidad_canonica','character varying(100)','YES'),
      ('catalogo_criterio_gr_version','creado_por','integer','NO'),
      ('catalogo_criterio_gr_version','creado_en','timestamp with time zone','NO'),
      ('matriz_empresa_version','procedencia','character varying(20)','YES'),
      ('matriz_criterio','catalogo_criterio_pt_version_id','integer','YES'),
      ('matriz_criterio','catalogo_criterio_gr_version_id','integer','YES'),
      ('matriz_opcion','puntaje','numeric','NO'),
      ('matriz_rango','puntaje','numeric','NO'),
      ('matriz_resultado','referencia_nombre_origen','text','YES'),
      ('matriz_resultado','referencia_rango_origen','text','YES')
    ) AS c(tabla, columna, tipo, nulable)
  LOOP
    SELECT pg_catalog.format_type(a.atttypid, a.atttypmod) AS tipo,
           CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS nulable
      INTO real
      FROM pg_catalog.pg_namespace n
      JOIN pg_catalog.pg_class t ON t.relnamespace = n.oid AND t.relkind IN ('r','p')
      JOIN pg_catalog.pg_attribute a ON a.attrelid = t.oid
       AND a.attname = esperado.columna AND a.attnum > 0 AND NOT a.attisdropped
     WHERE n.nspname = 'public' AND t.relname = esperado.tabla;

    IF NOT FOUND OR real.tipo IS DISTINCT FROM esperado.tipo
       OR real.nulable IS DISTINCT FROM esperado.nulable THEN
      RAISE EXCEPTION 'VERIFY fallido: columna public.%.% incompatible',
        esperado.tabla, esperado.columna;
    END IF;
  END LOOP;

  FOR esperado IN
    SELECT * FROM (VALUES
      ('catalogo_criterio_pt','id','catalogo_criterio_pt_id_seq'),
      ('catalogo_criterio_pt_version','id','catalogo_criterio_pt_version_id_seq'),
      ('catalogo_criterio_gr','id','catalogo_criterio_gr_id_seq'),
      ('catalogo_criterio_gr_version','id','catalogo_criterio_gr_version_id_seq')
    ) AS s(tabla, columna, secuencia)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class t
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      JOIN pg_catalog.pg_attribute a ON a.attrelid=t.oid
      JOIN pg_catalog.pg_attrdef d ON d.adrelid=t.oid AND d.adnum=a.attnum
      JOIN pg_catalog.pg_class s ON s.relname=esperado.secuencia AND s.relkind='S'
      JOIN pg_catalog.pg_namespace sn ON sn.oid=s.relnamespace AND sn.nspname='public'
      JOIN pg_catalog.pg_depend dep ON dep.classid='pg_catalog.pg_class'::pg_catalog.regclass
        AND dep.objid=s.oid AND dep.objsubid=0
        AND dep.refclassid='pg_catalog.pg_class'::pg_catalog.regclass
        AND dep.refobjid=t.oid AND dep.refobjsubid=a.attnum AND dep.deptype='a'
      JOIN pg_catalog.pg_depend defdep ON defdep.classid='pg_catalog.pg_attrdef'::pg_catalog.regclass
        AND defdep.objid=d.oid AND defdep.objsubid=0
        AND defdep.refclassid='pg_catalog.pg_class'::pg_catalog.regclass
        AND defdep.refobjid=s.oid AND defdep.refobjsubid=0 AND defdep.deptype='n'
      WHERE n.nspname='public' AND t.relname=esperado.tabla
        AND a.attname=esperado.columna AND a.attnum>0 AND NOT a.attisdropped
        AND a.atttypid='pg_catalog.int4'::pg_catalog.regtype AND a.attnotnull
        AND pg_catalog.pg_get_expr(d.adbin,d.adrelid) IN (
          pg_catalog.format('nextval(''%I''::regclass)',esperado.secuencia),
          pg_catalog.format('nextval(''public.%I''::regclass)',esperado.secuencia)
        )
    ) THEN
      RAISE EXCEPTION 'VERIFY fallido: SERIAL public.%.% incompatible',
        esperado.tabla, esperado.columna;
    END IF;
  END LOOP;

  FOR esperado IN
    SELECT * FROM (VALUES
      ('catalogo_criterio_pt','estado','''ACTIVO''::character varying'),
      ('catalogo_criterio_pt','creado_en','now()'),
      ('catalogo_criterio_pt_version','creado_en','now()'),
      ('catalogo_criterio_gr','estado','''ACTIVO''::character varying'),
      ('catalogo_criterio_gr','creado_en','now()'),
      ('catalogo_criterio_gr_version','creado_en','now()')
    ) AS d(tabla, columna, expresion)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_class t
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      JOIN pg_catalog.pg_attribute a ON a.attrelid=t.oid
      JOIN pg_catalog.pg_attrdef d ON d.adrelid=t.oid AND d.adnum=a.attnum
      WHERE n.nspname='public' AND t.relname=esperado.tabla
        AND a.attname=esperado.columna AND a.attnum>0 AND NOT a.attisdropped
        AND pg_catalog.pg_get_expr(d.adbin,d.adrelid)=esperado.expresion
    ) THEN
      RAISE EXCEPTION 'VERIFY fallido: DEFAULT public.%.% incompatible',
        esperado.tabla, esperado.columna;
    END IF;
  END LOOP;

  FOR esperado IN
    SELECT * FROM (VALUES
      ('catalogo_criterio_pt','ck_catalogo_criterio_pt_codigo',
       'CHECKcodigo_canonicoCOLLATE"C"~''^[A-Z][A-Z0-9_]{0,99}$'''),
      ('catalogo_criterio_gr','ck_catalogo_criterio_gr_codigo',
       'CHECKcodigo_canonicoCOLLATE"C"~''^[A-Z][A-Z0-9_]{0,99}$'''),
      ('catalogo_criterio_gr_version','ck_catalogo_criterio_gr_version_resolver',
       'CHECKresolver_codigoCOLLATE"C"~''^[A-Z][A-Z0-9_]{0,99}$'''),
      ('catalogo_criterio_pt','ck_catalogo_criterio_pt_estado',
       'CHECKestado=ANYARRAY[''ACTIVO'',''RETIRADO'']'),
      ('catalogo_criterio_gr','ck_catalogo_criterio_gr_estado',
       'CHECKestado=ANYARRAY[''ACTIVO'',''RETIRADO'']'),
      ('catalogo_criterio_pt_version','ck_catalogo_criterio_pt_version_resolucion',
       'CHECKtipo_resolucion=ANYARRAY[''CAPTURA_OPCIONES'',''CAPTURA_RANGO_NUMERICO'']'),
      ('catalogo_criterio_pt_version','ck_catalogo_criterio_pt_version_parametrizacion',
       'CHECKtipo_resolucion=''CAPTURA_OPCIONES''ANDtipo_parametrizacion=''OPCIONES''ANDunidad_canonicaISNULLORtipo_resolucion=''CAPTURA_RANGO_NUMERICO''ANDtipo_parametrizacion=''RANGOS_NUMERICOS''ANDunidad_canonicaISNOTNULLANDunidad_canonicaCOLLATE"C"~''^[A-Z][A-Z0-9_]{0,99}$'''),
      ('catalogo_criterio_gr_version','ck_catalogo_criterio_gr_version_resolucion',
       'CHECKtipo_resolucion=ANYARRAY[''KYC_RANGO'',''CATALOGO_GLOBAL'',''DERIVADO'',''ESTRUCTURADO'']'),
      ('catalogo_criterio_gr_version','ck_catalogo_criterio_gr_version_parametrizacion',
       'CHECKtipo_resolucion=''KYC_RANGO''ANDtipo_parametrizacion=''RANGOS_NUMERICOS''ANDunidad_canonicaISNOTNULLANDunidad_canonicaCOLLATE"C"~''^[A-Z][A-Z0-9_]{0,99}$''ORtipo_resolucion=ANYARRAY[''CATALOGO_GLOBAL'',''DERIVADO'',''ESTRUCTURADO'']ANDtipo_parametrizacion=''NINGUNA''ANDunidad_canonicaISNULL'),
      ('matriz_empresa_version','ck_matriz_empresa_version_procedencia',
       'CHECKprocedencia=ANYARRAY[''CREADA_EN_SISTEMA'',''IMPORTADA_XLSX'']'),
      ('matriz_criterio','ck_matriz_criterio_catalogo_ambito',
       'CHECKcatalogo_criterio_pt_version_idISNULLORambito=''PT''ANDcatalogo_criterio_gr_version_idISNULLORambito=''GR''ANDNOTcatalogo_criterio_pt_version_idISNOTNULLANDcatalogo_criterio_gr_version_idISNOTNULL'),
      ('matriz_opcion','ck_matriz_opcion_puntaje_mvp',
       'CHECKpuntaje=ANYARRAY[1,2,3]'),
      ('matriz_rango','ck_matriz_rango_puntaje_mvp',
       'CHECKpuntaje=ANYARRAY[1,2,3]'),
      ('matriz_resultado','ck_matriz_resultado_minimo_positivo','CHECKminimo>0'),
      ('matriz_resultado','ck_matriz_resultado_maximo_positivo','CHECKmaximo>0')
    ) AS c(tabla, nombre, definicion_normalizada)
  LOOP
    SELECT pg_catalog.regexp_replace(
             pg_catalog.replace(
               pg_catalog.replace(
                 pg_catalog.replace(
                   pg_catalog.replace(
                     pg_catalog.pg_get_constraintdef(c.oid,true),
                     '::character varying',''),
                   '::text[]',''),
                 '::text',''),
               '::numeric',''),
             '(pg_catalog[.]|[[:space:]()])','','g'
           ) AS definicion_normalizada
      INTO real
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public' AND t.relname=esperado.tabla
        AND c.conname=esperado.nombre AND c.contype='c' AND c.convalidated;

    IF NOT FOUND OR real.definicion_normalizada IS DISTINCT FROM esperado.definicion_normalizada THEN
      RAISE EXCEPTION 'VERIFY fallido: CHECK public.%.% incompatible',
        esperado.tabla, esperado.nombre;
    END IF;
  END LOOP;

  FOR esperado IN
    SELECT * FROM (VALUES
      ('catalogo_criterio_pt','pk_catalogo_criterio_pt','p',ARRAY['id'],NULL,NULL,NULL),
      ('catalogo_criterio_pt','uq_catalogo_criterio_pt_codigo','u',ARRAY['codigo_canonico'],NULL,NULL,NULL),
      ('catalogo_criterio_pt','fk_catalogo_criterio_pt_creado_por','f',ARRAY['creado_por'],'usuarios',ARRAY['id'],'r'),
      ('catalogo_criterio_pt','fk_catalogo_criterio_pt_retirado_por','f',ARRAY['retirado_por'],'usuarios',ARRAY['id'],'r'),
      ('catalogo_criterio_pt','fk_catalogo_criterio_pt_version_vigente','f',ARRAY['version_vigente_id','id'],'catalogo_criterio_pt_version',ARRAY['id','criterio_pt_id'],'r'),
      ('catalogo_criterio_pt_version','pk_catalogo_criterio_pt_version','p',ARRAY['id'],NULL,NULL,NULL),
      ('catalogo_criterio_pt_version','uq_catalogo_criterio_pt_version_id_criterio','u',ARRAY['id','criterio_pt_id'],NULL,NULL,NULL),
      ('catalogo_criterio_pt_version','uq_catalogo_criterio_pt_version','u',ARRAY['criterio_pt_id','version_contrato'],NULL,NULL,NULL),
      ('catalogo_criterio_pt_version','fk_catalogo_criterio_pt_version_criterio','f',ARRAY['criterio_pt_id'],'catalogo_criterio_pt',ARRAY['id'],'r'),
      ('catalogo_criterio_pt_version','fk_catalogo_criterio_pt_version_creado_por','f',ARRAY['creado_por'],'usuarios',ARRAY['id'],'r'),
      ('catalogo_criterio_gr','pk_catalogo_criterio_gr','p',ARRAY['id'],NULL,NULL,NULL),
      ('catalogo_criterio_gr','uq_catalogo_criterio_gr_codigo','u',ARRAY['codigo_canonico'],NULL,NULL,NULL),
      ('catalogo_criterio_gr','fk_catalogo_criterio_gr_creado_por','f',ARRAY['creado_por'],'usuarios',ARRAY['id'],'r'),
      ('catalogo_criterio_gr','fk_catalogo_criterio_gr_retirado_por','f',ARRAY['retirado_por'],'usuarios',ARRAY['id'],'r'),
      ('catalogo_criterio_gr','fk_catalogo_criterio_gr_version_vigente','f',ARRAY['version_vigente_id','id'],'catalogo_criterio_gr_version',ARRAY['id','criterio_gr_id'],'r'),
      ('catalogo_criterio_gr_version','pk_catalogo_criterio_gr_version','p',ARRAY['id'],NULL,NULL,NULL),
      ('catalogo_criterio_gr_version','uq_catalogo_criterio_gr_version_id_criterio','u',ARRAY['id','criterio_gr_id'],NULL,NULL,NULL),
      ('catalogo_criterio_gr_version','uq_catalogo_criterio_gr_version','u',ARRAY['criterio_gr_id','version_contrato'],NULL,NULL,NULL),
      ('catalogo_criterio_gr_version','fk_catalogo_criterio_gr_version_criterio','f',ARRAY['criterio_gr_id'],'catalogo_criterio_gr',ARRAY['id'],'r'),
      ('catalogo_criterio_gr_version','fk_catalogo_criterio_gr_version_creado_por','f',ARRAY['creado_por'],'usuarios',ARRAY['id'],'r'),
      ('matriz_criterio','fk_matriz_criterio_catalogo_pt_version','f',ARRAY['catalogo_criterio_pt_version_id'],'catalogo_criterio_pt_version',ARRAY['id'],'r'),
      ('matriz_criterio','fk_matriz_criterio_catalogo_gr_version','f',ARRAY['catalogo_criterio_gr_version_id'],'catalogo_criterio_gr_version',ARRAY['id'],'r')
    ) AS c(tabla,nombre,tipo,columnas,tabla_ref,columnas_ref,accion)
  LOOP
    SELECT c.contype AS tipo,
      ARRAY(SELECT a.attname::TEXT FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY k(attnum,ord)
        JOIN pg_catalog.pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum ORDER BY k.ord) AS columnas,
      rn.nspname AS esquema_ref, rt.relname AS tabla_ref,
      ARRAY(SELECT a.attname::TEXT FROM pg_catalog.unnest(c.confkey) WITH ORDINALITY k(attnum,ord)
        JOIN pg_catalog.pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.attnum ORDER BY k.ord) AS columnas_ref,
      c.confdeltype AS accion_borrado, c.confupdtype AS accion_actualizacion,
      c.confmatchtype AS tipo_match, c.convalidated AS validada,
      c.condeferrable AS diferible, c.condeferred AS diferida
      INTO real
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      LEFT JOIN pg_catalog.pg_class rt ON rt.oid=c.confrelid
      LEFT JOIN pg_catalog.pg_namespace rn ON rn.oid=rt.relnamespace
     WHERE n.nspname='public' AND t.relname=esperado.tabla AND c.conname=esperado.nombre;

    IF NOT FOUND OR real.tipo IS DISTINCT FROM esperado.tipo::"char"
       OR real.columnas IS DISTINCT FROM esperado.columnas OR NOT real.validada
       OR real.diferible OR real.diferida
       OR (esperado.tipo='f' AND (
         real.esquema_ref IS DISTINCT FROM 'public'
         OR real.tabla_ref IS DISTINCT FROM esperado.tabla_ref
         OR real.columnas_ref IS DISTINCT FROM esperado.columnas_ref
         OR real.accion_borrado IS DISTINCT FROM esperado.accion::"char"
         OR real.accion_actualizacion IS DISTINCT FROM 'a'::"char"
         OR real.tipo_match IS DISTINCT FROM 's'::"char"
       )) THEN
      RAISE EXCEPTION 'VERIFY fallido: constraint public.%.% incompatible',
        esperado.tabla, esperado.nombre;
    END IF;
  END LOOP;

  FOR esperado IN
    SELECT * FROM (VALUES
      ('matriz_resultado','ck_matriz_resultado_ambito',
       'CHECK (ambito::text = ANY (ARRAY[''PT''::character varying, ''GR''::character varying]::text[]))'),
      ('matriz_resultado','ck_matriz_resultado_orden','CHECK (orden >= 1 AND orden <= 3)'),
      ('matriz_resultado','ck_matriz_resultado_limites','CHECK (minimo <= maximo)'),
      ('matriz_resultado','ck_matriz_resultado_minimo_incluido','CHECK (minimo_incluido = true)'),
      ('matriz_resultado','ck_matriz_resultado_maximo_incluido','CHECK (maximo_incluido = true)')
    ) AS c(tabla,nombre,definicion)
  LOOP
    SELECT pg_catalog.lower(pg_catalog.regexp_replace(
             pg_catalog.pg_get_constraintdef(c.oid,true),'[[:space:]]+','','g')) AS definicion
      INTO real
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public' AND t.relname=esperado.tabla
        AND c.conname=esperado.nombre AND c.contype='c' AND c.convalidated;
    IF NOT FOUND OR real.definicion IS DISTINCT FROM pg_catalog.lower(
       pg_catalog.regexp_replace(esperado.definicion,'[[:space:]]+','','g')) THEN
      RAISE EXCEPTION 'VERIFY fallido: CHECK public.%.% incompatible',
        esperado.tabla, esperado.nombre;
    END IF;
  END LOOP;

  FOR esperado IN
    SELECT * FROM (VALUES
      ('catalogo_criterio_pt','ck_catalogo_criterio_pt_nombre',
       'CHECKlengthnombre_visible_global>=1ANDlengthnombre_visible_global<=150'),
      ('catalogo_criterio_pt','ck_catalogo_criterio_pt_retiro',
       'CHECKestado=''ACTIVO''ANDretirado_porISNULLANDretirado_enISNULLORestado=''RETIRADO''ANDretirado_porISNOTNULLANDretirado_enISNOTNULLANDversion_vigente_idISNULL'),
      ('catalogo_criterio_pt_version','ck_catalogo_criterio_pt_version_numero',
       'CHECKversion_contrato>0'),
      ('catalogo_criterio_gr','ck_catalogo_criterio_gr_nombre',
       'CHECKlengthnombre_visible_global>=1ANDlengthnombre_visible_global<=150'),
      ('catalogo_criterio_gr','ck_catalogo_criterio_gr_retiro',
       'CHECKestado=''ACTIVO''ANDretirado_porISNULLANDretirado_enISNULLORestado=''RETIRADO''ANDretirado_porISNOTNULLANDretirado_enISNOTNULLANDversion_vigente_idISNULL'),
      ('catalogo_criterio_gr_version','ck_catalogo_criterio_gr_version_numero',
       'CHECKversion_contrato>0')
    ) AS c(tabla, nombre, definicion_normalizada)
  LOOP
    SELECT pg_catalog.regexp_replace(
             pg_catalog.replace(
               pg_catalog.replace(pg_catalog.pg_get_constraintdef(c.oid,true),
                 '::character varying',''),
               '::text',''),
             '(pg_catalog[.]|[[:space:]()])','','g'
           ) AS definicion_normalizada
      INTO real
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public' AND t.relname=esperado.tabla
        AND c.conname=esperado.nombre AND c.contype='c' AND c.convalidated;

    IF NOT FOUND OR real.definicion_normalizada IS DISTINCT FROM esperado.definicion_normalizada THEN
      RAISE EXCEPTION 'VERIFY fallido: CHECK public.%.% incompatible',
        esperado.tabla, esperado.nombre;
    END IF;
  END LOOP;

  FOR esperado IN
    SELECT * FROM (VALUES
      ('catalogo_criterio_pt',10),
      ('catalogo_criterio_pt_version',8),
      ('catalogo_criterio_gr',10),
      ('catalogo_criterio_gr_version',9)
    ) AS c(tabla, cantidad)
  LOOP
    IF (
      SELECT pg_catalog.count(*) FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public' AND t.relname=esperado.tabla
    ) <> esperado.cantidad THEN
      RAISE EXCEPTION 'VERIFY fallido: public.% tiene constraints inesperadas', esperado.tabla;
    END IF;
  END LOOP;

  FOR esperado IN
    SELECT * FROM (VALUES
      ('idx_catalogo_criterio_pt_estado','catalogo_criterio_pt',ARRAY['estado']),
      ('idx_catalogo_criterio_pt_version_vigente','catalogo_criterio_pt',ARRAY['version_vigente_id']),
      ('idx_catalogo_criterio_pt_version_creado_por','catalogo_criterio_pt_version',ARRAY['creado_por']),
      ('idx_catalogo_criterio_gr_estado','catalogo_criterio_gr',ARRAY['estado']),
      ('idx_catalogo_criterio_gr_version_vigente','catalogo_criterio_gr',ARRAY['version_vigente_id']),
      ('idx_catalogo_criterio_gr_version_creado_por','catalogo_criterio_gr_version',ARRAY['creado_por']),
      ('idx_matriz_criterio_catalogo_pt_version','matriz_criterio',ARRAY['catalogo_criterio_pt_version_id']),
      ('idx_matriz_criterio_catalogo_gr_version','matriz_criterio',ARRAY['catalogo_criterio_gr_version_id'])
    ) AS i(nombre, tabla, columnas)
  LOOP
    SELECT i.indisunique AS unico, i.indisvalid AS valido, i.indisready AS listo,
      i.indpred IS NULL AS no_parcial, i.indexprs IS NULL AS sin_expresiones,
      i.indnatts = i.indnkeyatts AS sin_include, am.amname AS metodo,
      pg_catalog.array_agg(a.attname::TEXT ORDER BY k.ord) AS columnas
      INTO real
      FROM pg_catalog.pg_index i
      JOIN pg_catalog.pg_class t ON t.oid=i.indrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      JOIN pg_catalog.pg_class x ON x.oid=i.indexrelid AND x.relnamespace=n.oid
      JOIN pg_catalog.pg_am am ON am.oid=x.relam
      JOIN LATERAL pg_catalog.unnest(i.indkey) WITH ORDINALITY k(attnum,ord) ON true
      JOIN pg_catalog.pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.attnum
      WHERE n.nspname='public' AND t.relname=esperado.tabla AND x.relname=esperado.nombre
      GROUP BY i.indexrelid,i.indisunique,i.indisvalid,i.indisready,i.indpred,i.indexprs,
        i.indnatts,i.indnkeyatts,am.amname;
    IF NOT FOUND OR real.unico OR NOT real.valido OR NOT real.listo
       OR NOT real.no_parcial OR NOT real.sin_expresiones OR NOT real.sin_include
       OR real.metodo IS DISTINCT FROM 'btree'
       OR real.columnas IS DISTINCT FROM esperado.columnas THEN
      RAISE EXCEPTION 'VERIFY fallido: indice public.% incompatible', esperado.nombre;
    END IF;
  END LOOP;

  FOR esperado IN
    SELECT * FROM (VALUES
      ('fn_catalogo_criterio_codigo_inmutable',
       $body$
BEGIN
  IF NEW.codigo_canonico IS DISTINCT FROM OLD.codigo_canonico THEN
    RAISE EXCEPTION 'El codigo canonico es inmutable';
  END IF;
  RETURN NEW;
END;
$body$),
      ('fn_catalogo_criterio_version_inmutable',
       $body$
BEGIN
  RAISE EXCEPTION 'Las versiones contractuales son inmutables';
END;
$body$),
      ('fn_catalogo_criterio_vigencia_diferida',
       $body$
DECLARE
  estado_actual TEXT;
  version_actual INTEGER;
BEGIN
  IF TG_TABLE_SCHEMA = 'public' AND TG_TABLE_NAME = 'catalogo_criterio_pt' THEN
    SELECT estado, version_vigente_id
      INTO estado_actual, version_actual
      FROM public.catalogo_criterio_pt
      WHERE id = NEW.id;
  ELSIF TG_TABLE_SCHEMA = 'public' AND TG_TABLE_NAME = 'catalogo_criterio_gr' THEN
    SELECT estado, version_vigente_id
      INTO estado_actual, version_actual
      FROM public.catalogo_criterio_gr
      WHERE id = NEW.id;
  ELSE
    RAISE EXCEPTION 'Tabla no soportada para validar vigencia canonica';
  END IF;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF (estado_actual = 'ACTIVO' AND version_actual IS NULL)
     OR (estado_actual = 'RETIRADO' AND version_actual IS NOT NULL) THEN
    RAISE EXCEPTION 'Estado y version vigente del criterio canonico son incompatibles';
  END IF;

  RETURN NULL;
END;
$body$)
    ) AS f(nombre, fuente_exacta)
  LOOP
    SELECT p.pronargs AS argumentos, l.lanname AS lenguaje,
      p.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype AS retorna_trigger,
      p.prokind AS clase, p.proconfig AS configuracion,
      p.prosrc AS fuente_exacta
      INTO real
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
      JOIN pg_catalog.pg_language l ON l.oid=p.prolang
      WHERE n.nspname='public' AND p.proname=esperado.nombre AND p.pronargs=0;

    IF NOT FOUND OR real.argumentos <> 0 OR real.lenguaje IS DISTINCT FROM 'plpgsql'
       OR NOT real.retorna_trigger OR real.clase IS DISTINCT FROM 'f'::"char"
       OR real.configuracion IS DISTINCT FROM ARRAY['search_path=pg_catalog']::TEXT[]
       OR real.fuente_exacta IS DISTINCT FROM esperado.fuente_exacta THEN
      RAISE EXCEPTION 'VERIFY fallido: funcion public.% incompatible', esperado.nombre;
    END IF;
  END LOOP;

  FOR esperado IN
    SELECT * FROM (VALUES
      ('trg_catalogo_criterio_pt_codigo_inmutable','catalogo_criterio_pt',
       'fn_catalogo_criterio_codigo_inmutable',19,false,false,false),
      ('trg_catalogo_criterio_gr_codigo_inmutable','catalogo_criterio_gr',
       'fn_catalogo_criterio_codigo_inmutable',19,false,false,false),
      ('trg_catalogo_criterio_pt_version_inmutable','catalogo_criterio_pt_version',
       'fn_catalogo_criterio_version_inmutable',27,false,false,false),
      ('trg_catalogo_criterio_gr_version_inmutable','catalogo_criterio_gr_version',
       'fn_catalogo_criterio_version_inmutable',27,false,false,false),
      ('trg_catalogo_criterio_pt_vigencia_diferida','catalogo_criterio_pt',
       'fn_catalogo_criterio_vigencia_diferida',21,true,true,true),
      ('trg_catalogo_criterio_gr_vigencia_diferida','catalogo_criterio_gr',
       'fn_catalogo_criterio_vigencia_diferida',21,true,true,true)
    ) AS x(nombre, tabla, funcion, tipo, es_constraint, diferible, diferido)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_trigger tr
      JOIN pg_catalog.pg_class t ON t.oid=tr.tgrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      JOIN pg_catalog.pg_proc p ON p.oid=tr.tgfoid
      JOIN pg_catalog.pg_namespace pn ON pn.oid=p.pronamespace
      WHERE n.nspname='public' AND t.relname=esperado.tabla
        AND tr.tgname=esperado.nombre AND NOT tr.tgisinternal
        AND tr.tgenabled='O' AND tr.tgtype=esperado.tipo
        AND (tr.tgconstraint<>0)=esperado.es_constraint
        AND tr.tgdeferrable=esperado.diferible
        AND tr.tginitdeferred=esperado.diferido
        AND pn.nspname='public' AND p.proname=esperado.funcion
    ) THEN
      RAISE EXCEPTION 'VERIFY fallido: trigger % incompatible', esperado.nombre;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND t.relname='matriz_resultado'
      AND c.conname IN ('ck_matriz_resultado_minimo','ck_matriz_resultado_maximo')
  ) THEN
    RAISE EXCEPTION 'VERIFY fallido: persisten los CHECK rigidos 4..12';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='matriz_archivo_fuente'
      AND column_name='contenido' AND data_type='bytea' AND is_nullable='NO'
  ) THEN
    RAISE EXCEPTION 'VERIFY fallido: matriz_archivo_fuente.contenido fue alterado';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.matriz_opcion WHERE puntaje NOT IN (1,2,3)
  ) OR EXISTS (
    SELECT 1 FROM public.matriz_rango WHERE puntaje NOT IN (1,2,3)
  ) OR EXISTS (
    SELECT 1 FROM public.matriz_resultado WHERE minimo <= 0 OR maximo <= 0
  ) THEN
    RAISE EXCEPTION 'VERIFY fallido: existen datos incompatibles con 005';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.catalogo_criterio_pt
    WHERE (estado='ACTIVO' AND version_vigente_id IS NULL)
       OR (estado='RETIRADO' AND version_vigente_id IS NOT NULL)
  ) OR EXISTS (
    SELECT 1 FROM public.catalogo_criterio_gr
    WHERE (estado='ACTIVO' AND version_vigente_id IS NULL)
       OR (estado='RETIRADO' AND version_vigente_id IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'VERIFY fallido: existe un criterio sin vigencia final coherente';
  END IF;
END
$$;

SELECT migration_key
FROM public.schema_migrations
WHERE migration_key IN (
  '20260801_002_matrices_pt_gr_empresa',
  '20260805_003_gestion_matrices_empresa',
  '20260810_004_resultados_globales_matriz',
  '20260812_005_catalogos_canonicos_matriz'
)
ORDER BY migration_key;

COMMIT;
