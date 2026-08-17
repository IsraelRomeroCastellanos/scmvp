BEGIN;
SET TRANSACTION READ ONLY;

SELECT pg_catalog.current_database() AS current_database,
       pg_catalog.current_schema() AS current_schema,
       current_user AS current_user,
       pg_catalog.current_setting('server_version') AS server_version;

DO $$
DECLARE
  expected RECORD;
  actual_columns TEXT[];
  referenced_columns TEXT[];
  expression_sql TEXT;
  evaluated_boolean BOOLEAN;
  evaluated_timestamp TIMESTAMPTZ;
  accepted BOOLEAN[];
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public'
     OR pg_catalog.to_regclass('public.clasificacion_actividad_pld_version') IS NULL
     OR pg_catalog.to_regclass('public.clasificacion_actividad_pld_item') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.schema_migrations
        WHERE migration_key='20260817_012_clasificacion_actividad_pld'
     ) THEN
    RAISE EXCEPTION 'VERIFY fallido: faltan esquema, tablas o migration key 012';
  END IF;

  FOR expected IN
    SELECT * FROM (VALUES
      ('clasificacion_actividad_pld_version','id','pg_catalog.int8'::pg_catalog.regtype,-1,true,'d'),
      ('clasificacion_actividad_pld_version','tipo_catalogo','pg_catalog.varchar'::pg_catalog.regtype,34,true,''),
      ('clasificacion_actividad_pld_version','fuente_codigo','pg_catalog.varchar'::pg_catalog.regtype,104,true,''),
      ('clasificacion_actividad_pld_version','fuente_nombre','pg_catalog.varchar'::pg_catalog.regtype,259,true,''),
      ('clasificacion_actividad_pld_version','fuente_version','pg_catalog.varchar'::pg_catalog.regtype,104,true,''),
      ('clasificacion_actividad_pld_version','fecha_publicacion','pg_catalog.date'::pg_catalog.regtype,-1,false,''),
      ('clasificacion_actividad_pld_version','vigente_desde','pg_catalog.date'::pg_catalog.regtype,-1,true,''),
      ('clasificacion_actividad_pld_version','vigente_hasta','pg_catalog.date'::pg_catalog.regtype,-1,false,''),
      ('clasificacion_actividad_pld_version','activa','pg_catalog.bool'::pg_catalog.regtype,-1,true,''),
      ('clasificacion_actividad_pld_version','creada_por','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('clasificacion_actividad_pld_version','creado_en','pg_catalog.timestamptz'::pg_catalog.regtype,-1,true,''),
      ('clasificacion_actividad_pld_item','id','pg_catalog.int8'::pg_catalog.regtype,-1,true,'d'),
      ('clasificacion_actividad_pld_item','version_id','pg_catalog.int8'::pg_catalog.regtype,-1,true,''),
      ('clasificacion_actividad_pld_item','tipo_catalogo','pg_catalog.varchar'::pg_catalog.regtype,34,true,''),
      ('clasificacion_actividad_pld_item','clave_catalogo','pg_catalog.text'::pg_catalog.regtype,-1,true,''),
      ('clasificacion_actividad_pld_item','descripcion_fuente','pg_catalog.varchar'::pg_catalog.regtype,259,true,''),
      ('clasificacion_actividad_pld_item','marca_canonica','pg_catalog.varchar'::pg_catalog.regtype,34,true,''),
      ('clasificacion_actividad_pld_item','categoria_fuente','pg_catalog.varchar'::pg_catalog.regtype,154,false,''),
      ('clasificacion_actividad_pld_item','observacion','pg_catalog.text'::pg_catalog.regtype,-1,false,''),
      ('clasificacion_actividad_pld_item','creado_en','pg_catalog.timestamptz'::pg_catalog.regtype,-1,true,'')
    ) AS x(tabla,columna,tipo_oid,typmod,no_nula,identidad)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
       WHERE a.attrelid=pg_catalog.to_regclass('public.' || expected.tabla)
         AND a.attname=expected.columna AND a.attnum>0 AND NOT a.attisdropped
         AND a.atttypid=expected.tipo_oid AND a.atttypmod=expected.typmod
         AND a.attnotnull=expected.no_nula AND a.attidentity=expected.identidad
    ) THEN
      RAISE EXCEPTION 'VERIFY fallido: %.% incompatible',expected.tabla,expected.columna;
    END IF;
  END LOOP;

  IF (SELECT pg_catalog.count(*) FROM pg_catalog.pg_attribute a
       WHERE a.attrelid='public.clasificacion_actividad_pld_version'::pg_catalog.regclass
         AND a.attnum>0 AND NOT a.attisdropped) <> 11
     OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_attribute a
       WHERE a.attrelid='public.clasificacion_actividad_pld_item'::pg_catalog.regclass
         AND a.attnum>0 AND NOT a.attisdropped) <> 9 THEN
    RAISE EXCEPTION 'VERIFY fallido: cantidad de columnas incompatible';
  END IF;

  SELECT pg_catalog.pg_get_expr(d.adbin,d.adrelid) INTO expression_sql
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
   WHERE a.attrelid='public.clasificacion_actividad_pld_version'::pg_catalog.regclass
     AND a.attname='activa';
  IF expression_sql IS NULL THEN RAISE EXCEPTION 'VERIFY fallido: falta default activa'; END IF;
  EXECUTE pg_catalog.format('SELECT (%s)::boolean',expression_sql) INTO evaluated_boolean;
  IF evaluated_boolean IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'VERIFY fallido: default activa incompatible';
  END IF;

  FOR expected IN SELECT * FROM (VALUES
    ('clasificacion_actividad_pld_version','creado_en'),
    ('clasificacion_actividad_pld_item','creado_en')
  ) AS x(tabla,columna)
  LOOP
    SELECT pg_catalog.pg_get_expr(d.adbin,d.adrelid) INTO expression_sql
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
     WHERE a.attrelid=pg_catalog.to_regclass('public.' || expected.tabla)
       AND a.attname=expected.columna;
    IF expression_sql IS NULL THEN RAISE EXCEPTION 'VERIFY fallido: falta default %.%',expected.tabla,expected.columna; END IF;
    EXECUTE pg_catalog.format('SELECT (%s)::timestamptz',expression_sql) INTO evaluated_timestamp;
    IF evaluated_timestamp IS NULL THEN RAISE EXCEPTION 'VERIFY fallido: default temporal incompatible'; END IF;
  END LOOP;

  FOR expected IN
    SELECT * FROM (VALUES
      ('clasificacion_actividad_pld_version','pk_clasificacion_actividad_pld_version','p',ARRAY['id']::TEXT[],NULL::TEXT,NULL::TEXT[]),
      ('clasificacion_actividad_pld_version','uq_clasificacion_actividad_pld_version_fuente','u',ARRAY['tipo_catalogo','fuente_codigo','fuente_version']::TEXT[],NULL::TEXT,NULL::TEXT[]),
      ('clasificacion_actividad_pld_version','uq_clasificacion_actividad_pld_version_id_tipo','u',ARRAY['id','tipo_catalogo']::TEXT[],NULL::TEXT,NULL::TEXT[]),
      ('clasificacion_actividad_pld_version','fk_clasificacion_actividad_pld_version_creada_por','f',ARRAY['creada_por']::TEXT[],'usuarios',ARRAY['id']::TEXT[]),
      ('clasificacion_actividad_pld_item','pk_clasificacion_actividad_pld_item','p',ARRAY['id']::TEXT[],NULL::TEXT,NULL::TEXT[]),
      ('clasificacion_actividad_pld_item','uq_clasificacion_actividad_pld_item_version_clave_marca','u',ARRAY['version_id','clave_catalogo','marca_canonica']::TEXT[],NULL::TEXT,NULL::TEXT[]),
      ('clasificacion_actividad_pld_item','fk_clasificacion_actividad_pld_item_version','f',ARRAY['version_id','tipo_catalogo']::TEXT[],'clasificacion_actividad_pld_version',ARRAY['id','tipo_catalogo']::TEXT[])
    ) AS x(tabla,nombre,tipo,columnas,tabla_ref,columnas_ref)
  LOOP
    SELECT ARRAY(
             SELECT a.attname::TEXT FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY k(attnum,ord)
             JOIN pg_catalog.pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum ORDER BY k.ord
           ),CASE WHEN c.contype='f' THEN ARRAY(
             SELECT a.attname::TEXT FROM pg_catalog.unnest(c.confkey) WITH ORDINALITY k(attnum,ord)
             JOIN pg_catalog.pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.attnum ORDER BY k.ord
           ) END
      INTO actual_columns,referenced_columns
      FROM pg_catalog.pg_constraint c
      LEFT JOIN pg_catalog.pg_class rt ON rt.oid=c.confrelid
      LEFT JOIN pg_catalog.pg_namespace rn ON rn.oid=rt.relnamespace
     WHERE c.conrelid=pg_catalog.to_regclass('public.' || expected.tabla)
       AND c.conname=expected.nombre AND c.contype=expected.tipo::"char"
       AND c.convalidated AND NOT c.condeferrable
       AND (c.contype<>'f' OR (
         rn.nspname='public' AND rt.relname=expected.tabla_ref
         AND c.confdeltype='r'::"char" AND c.confupdtype='a'::"char"
         AND c.confmatchtype='s'::"char"
       ));
    IF actual_columns IS DISTINCT FROM expected.columnas
       OR (expected.tipo='f' AND referenced_columns IS DISTINCT FROM expected.columnas_ref) THEN
      RAISE EXCEPTION 'VERIFY fallido: constraint % incompatible',expected.nombre;
    END IF;
  END LOOP;

  FOR expected IN
    SELECT * FROM (VALUES
      ('clasificacion_actividad_pld_version','ck_clasificacion_actividad_pld_version_tipo',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,''ACTIVIDAD_ECONOMICA_PF''::varchar(30)),(2,''GIRO_MERCANTIL_PM''::varchar(30)),(3,''FIDEICOMISO''::varchar(30))) v(n,tipo_catalogo)',ARRAY[true,true,false]::BOOLEAN[]),
      ('clasificacion_actividad_pld_version','ck_clasificacion_actividad_pld_version_fuente_codigo',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,''FUENTE_1''::varchar(100)),(2,''''::varchar(100)),(3,''minuscula''::varchar(100))) v(n,fuente_codigo)',ARRAY[true,false,false]::BOOLEAN[]),
      ('clasificacion_actividad_pld_version','ck_clasificacion_actividad_pld_version_fuente_nombre',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,''Fuente''::varchar(255)),(2,'' ''::varchar(255))) v(n,fuente_nombre)',ARRAY[true,false]::BOOLEAN[]),
      ('clasificacion_actividad_pld_version','ck_clasificacion_actividad_pld_version_fuente_version',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,''2026''::varchar(100)),(2,'' ''::varchar(100))) v(n,fuente_version)',ARRAY[true,false]::BOOLEAN[]),
      ('clasificacion_actividad_pld_version','ck_clasificacion_actividad_pld_version_vigencia',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,NULL::date,''2026-01-01''::date,NULL::date),(2,''2026-01-01''::date,''2026-01-02''::date,''2026-01-02''::date),(3,''2026-01-02''::date,''2026-01-01''::date,NULL::date),(4,NULL::date,''2026-01-02''::date,''2026-01-01''::date)) v(n,fecha_publicacion,vigente_desde,vigente_hasta)',ARRAY[true,true,false,false]::BOOLEAN[]),
      ('clasificacion_actividad_pld_item','ck_clasificacion_actividad_pld_item_clave',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,''A1''::text),(2,''''::text),(3,'' A1''::text)) v(n,clave_catalogo)',ARRAY[true,false,false]::BOOLEAN[]),
      ('clasificacion_actividad_pld_item','ck_clasificacion_actividad_pld_item_descripcion',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,''Actividad''::varchar(255)),(2,'' ''::varchar(255))) v(n,descripcion_fuente)',ARRAY[true,false]::BOOLEAN[]),
      ('clasificacion_actividad_pld_item','ck_clasificacion_actividad_pld_item_marca',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,''AV''::varchar(30)),(2,''HUACHICOL''::varchar(30)),(3,''DOBLE_USO''::varchar(30)),(4,''PEP''::varchar(30)),(5,''PEP_EXTRANJERO''::varchar(30)),(6,''OSFL''::varchar(30)),(7,''OTRA''::varchar(30))) v(n,marca_canonica)',ARRAY[true,true,true,true,true,true,false]::BOOLEAN[]),
      ('clasificacion_actividad_pld_item','ck_clasificacion_actividad_pld_item_marca_tipo',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,''ACTIVIDAD_ECONOMICA_PF''::varchar(30),''PEP_EXTRANJERO''::varchar(30)),(2,''GIRO_MERCANTIL_PM''::varchar(30),''PEP_EXTRANJERO''::varchar(30)),(3,''GIRO_MERCANTIL_PM''::varchar(30),''OSFL''::varchar(30)),(4,''ACTIVIDAD_ECONOMICA_PF''::varchar(30),''OSFL''::varchar(30)),(5,''ACTIVIDAD_ECONOMICA_PF''::varchar(30),''AV''::varchar(30)),(6,''OTRO''::varchar(30),''AV''::varchar(30))) v(n,tipo_catalogo,marca_canonica)',ARRAY[true,false,true,false,true,false]::BOOLEAN[]),
      ('clasificacion_actividad_pld_item','ck_clasificacion_actividad_pld_item_categoria',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,NULL::varchar(150)),(2,''Categoria''::varchar(150)),(3,'' ''::varchar(150))) v(n,categoria_fuente)',ARRAY[true,true,false]::BOOLEAN[]),
      ('clasificacion_actividad_pld_item','ck_clasificacion_actividad_pld_item_observacion',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,NULL::text),(2,''Nota''::text),(3,'' ''::text)) v(n,observacion)',ARRAY[true,true,false]::BOOLEAN[])
    ) AS x(tabla,nombre,consulta,esperado)
  LOOP
    SELECT pg_catalog.pg_get_expr(c.conbin,c.conrelid) INTO expression_sql
      FROM pg_catalog.pg_constraint c
     WHERE c.conrelid=pg_catalog.to_regclass('public.' || expected.tabla)
       AND c.conname=expected.nombre AND c.contype='c'
       AND c.convalidated AND NOT c.condeferrable;
    IF expression_sql IS NULL THEN RAISE EXCEPTION 'VERIFY fallido: CHECK % ausente',expected.nombre; END IF;
    EXECUTE pg_catalog.format(expected.consulta,expression_sql) INTO accepted;
    IF accepted IS DISTINCT FROM expected.esperado THEN
      RAISE EXCEPTION 'VERIFY fallido: semantica de % incompatible',expected.nombre;
    END IF;
  END LOOP;

  FOR expected IN
    SELECT * FROM (VALUES
      ('clasificacion_actividad_pld_version','pk_clasificacion_actividad_pld_version',ARRAY['id']::TEXT[],true,true,false),
      ('clasificacion_actividad_pld_version','uq_clasificacion_actividad_pld_version_fuente',ARRAY['tipo_catalogo','fuente_codigo','fuente_version']::TEXT[],true,false,false),
      ('clasificacion_actividad_pld_version','uq_clasificacion_actividad_pld_version_id_tipo',ARRAY['id','tipo_catalogo']::TEXT[],true,false,false),
      ('clasificacion_actividad_pld_version','uq_clasificacion_actividad_pld_version_tipo_activa',ARRAY['tipo_catalogo']::TEXT[],true,false,true),
      ('clasificacion_actividad_pld_version','idx_clasificacion_actividad_pld_version_creada_por',ARRAY['creada_por']::TEXT[],false,false,false),
      ('clasificacion_actividad_pld_item','pk_clasificacion_actividad_pld_item',ARRAY['id']::TEXT[],true,true,false),
      ('clasificacion_actividad_pld_item','uq_clasificacion_actividad_pld_item_version_clave_marca',ARRAY['version_id','clave_catalogo','marca_canonica']::TEXT[],true,false,false),
      ('clasificacion_actividad_pld_item','idx_clasificacion_actividad_pld_item_clave',ARRAY['clave_catalogo']::TEXT[],false,false,false)
    ) AS x(tabla,nombre,columnas,unico,primario,parcial)
  LOOP
    SELECT ARRAY(
      SELECT a.attname::TEXT FROM pg_catalog.generate_series(0,i.indnkeyatts-1) p(pos)
      JOIN pg_catalog.pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=i.indkey[p.pos]
      ORDER BY p.pos
    ) INTO actual_columns
      FROM pg_catalog.pg_index i
      JOIN pg_catalog.pg_class x ON x.oid=i.indexrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=x.relnamespace
      JOIN pg_catalog.pg_am am ON am.oid=x.relam
     WHERE n.nspname='public' AND x.relname=expected.nombre
       AND i.indrelid=pg_catalog.to_regclass('public.' || expected.tabla)
       AND am.amname='btree' AND i.indisvalid AND i.indisready AND i.indislive
       AND i.indisunique=expected.unico AND i.indisprimary=expected.primario
       AND i.indexprs IS NULL AND (i.indpred IS NOT NULL)=expected.parcial
       AND i.indnkeyatts=pg_catalog.cardinality(expected.columnas)
       AND i.indnatts=pg_catalog.cardinality(expected.columnas);
    IF actual_columns IS DISTINCT FROM expected.columnas THEN
      RAISE EXCEPTION 'VERIFY fallido: indice % incompatible',expected.nombre;
    END IF;
  END LOOP;

  SELECT pg_catalog.pg_get_expr(i.indpred,i.indrelid) INTO expression_sql
    FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class x ON x.oid=i.indexrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=x.relnamespace
   WHERE n.nspname='public' AND x.relname='uq_clasificacion_actividad_pld_version_tipo_activa';
  IF expression_sql IS NULL THEN RAISE EXCEPTION 'VERIFY fallido: falta predicado activo'; END IF;
  EXECUTE pg_catalog.format(
    'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,true),(2,false)) v(n,activa)',expression_sql
  ) INTO accepted;
  IF accepted IS DISTINCT FROM ARRAY[true,false]::BOOLEAN[] THEN
    RAISE EXCEPTION 'VERIFY fallido: predicado activo incompatible';
  END IF;

  IF (SELECT pg_catalog.count(*) FROM pg_catalog.pg_constraint c
       WHERE c.conrelid='public.clasificacion_actividad_pld_version'::pg_catalog.regclass) <> 9
     OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_constraint c
       WHERE c.conrelid='public.clasificacion_actividad_pld_item'::pg_catalog.regclass) <> 9
     OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_index i
       WHERE i.indrelid='public.clasificacion_actividad_pld_version'::pg_catalog.regclass) <> 5
     OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_index i
       WHERE i.indrelid='public.clasificacion_actividad_pld_item'::pg_catalog.regclass) <> 3 THEN
    RAISE EXCEPTION 'VERIFY fallido: cantidad de objetos inesperada';
  END IF;
END
$$;

ROLLBACK;
