BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtext('20260817_011_clasificacion_geografica_pld')
);

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
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Rollback no aplicable: se esperaba public';
  END IF;
  IF pg_catalog.to_regclass('public.clasificacion_geografica_pld_version') IS NULL
     OR pg_catalog.to_regclass('public.clasificacion_geografica_pld_jurisdiccion') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.schema_migrations
        WHERE migration_key='20260817_011_clasificacion_geografica_pld'
     ) THEN
    RAISE EXCEPTION 'Rollback no aplicable: faltan tablas o migration key 011';
  END IF;
  IF EXISTS (SELECT 1 FROM public.clasificacion_geografica_pld_version)
     OR EXISTS (SELECT 1 FROM public.clasificacion_geografica_pld_jurisdiccion) THEN
    RAISE EXCEPTION 'Rollback bloqueado: existe informacion de clasificacion geografica';
  END IF;

  FOR expected IN
    SELECT * FROM (VALUES
      ('clasificacion_geografica_pld_version','id','pg_catalog.int8'::pg_catalog.regtype,-1,true,'d'),
      ('clasificacion_geografica_pld_version','tipo_clasificacion','pg_catalog.varchar'::pg_catalog.regtype,44,true,''),
      ('clasificacion_geografica_pld_version','fuente_codigo','pg_catalog.varchar'::pg_catalog.regtype,104,true,''),
      ('clasificacion_geografica_pld_version','fuente_nombre','pg_catalog.varchar'::pg_catalog.regtype,259,true,''),
      ('clasificacion_geografica_pld_version','fuente_url','pg_catalog.text'::pg_catalog.regtype,-1,false,''),
      ('clasificacion_geografica_pld_version','fuente_version','pg_catalog.varchar'::pg_catalog.regtype,104,true,''),
      ('clasificacion_geografica_pld_version','fecha_publicacion','pg_catalog.date'::pg_catalog.regtype,-1,true,''),
      ('clasificacion_geografica_pld_version','vigente_desde','pg_catalog.date'::pg_catalog.regtype,-1,true,''),
      ('clasificacion_geografica_pld_version','vigente_hasta','pg_catalog.date'::pg_catalog.regtype,-1,false,''),
      ('clasificacion_geografica_pld_version','activa','pg_catalog.bool'::pg_catalog.regtype,-1,true,''),
      ('clasificacion_geografica_pld_version','creado_en','pg_catalog.timestamptz'::pg_catalog.regtype,-1,true,''),
      ('clasificacion_geografica_pld_version','creado_por','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('clasificacion_geografica_pld_jurisdiccion','id','pg_catalog.int8'::pg_catalog.regtype,-1,true,'d'),
      ('clasificacion_geografica_pld_jurisdiccion','version_id','pg_catalog.int8'::pg_catalog.regtype,-1,true,''),
      ('clasificacion_geografica_pld_jurisdiccion','pais_id','pg_catalog.int4'::pg_catalog.regtype,-1,false,''),
      ('clasificacion_geografica_pld_jurisdiccion','jurisdiccion_codigo','pg_catalog.varchar'::pg_catalog.regtype,104,true,''),
      ('clasificacion_geografica_pld_jurisdiccion','nombre_fuente','pg_catalog.varchar'::pg_catalog.regtype,259,true,''),
      ('clasificacion_geografica_pld_jurisdiccion','nombre_normalizado','pg_catalog.varchar'::pg_catalog.regtype,259,true,''),
      ('clasificacion_geografica_pld_jurisdiccion','tipo_entidad_geografica','pg_catalog.varchar'::pg_catalog.regtype,24,true,''),
      ('clasificacion_geografica_pld_jurisdiccion','observacion','pg_catalog.text'::pg_catalog.regtype,-1,false,''),
      ('clasificacion_geografica_pld_jurisdiccion','creado_en','pg_catalog.timestamptz'::pg_catalog.regtype,-1,true,'')
    ) AS x(tabla,columna,tipo_oid,typmod,no_nula,identidad)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
       WHERE a.attrelid=pg_catalog.to_regclass('public.' || expected.tabla)
         AND a.attname=expected.columna AND a.attnum>0 AND NOT a.attisdropped
         AND a.atttypid=expected.tipo_oid AND a.atttypmod=expected.typmod
         AND a.attnotnull=expected.no_nula AND a.attidentity=expected.identidad
    ) THEN
      RAISE EXCEPTION 'Rollback no aplicable: %.% incompatible',expected.tabla,expected.columna;
    END IF;
  END LOOP;

  SELECT pg_catalog.pg_get_expr(d.adbin,d.adrelid) INTO expression_sql
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
   WHERE a.attrelid='public.clasificacion_geografica_pld_version'::pg_catalog.regclass
     AND a.attname='activa';
  IF expression_sql IS NULL THEN
    RAISE EXCEPTION 'Rollback no aplicable: falta default activa';
  END IF;
  EXECUTE pg_catalog.format('SELECT (%s)::boolean',expression_sql) INTO evaluated_boolean;
  IF evaluated_boolean IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Rollback no aplicable: default activa incompatible';
  END IF;

  FOR expected IN
    SELECT * FROM (VALUES
      ('clasificacion_geografica_pld_version','creado_en'),
      ('clasificacion_geografica_pld_jurisdiccion','creado_en')
    ) AS x(tabla,columna)
  LOOP
    SELECT pg_catalog.pg_get_expr(d.adbin,d.adrelid) INTO expression_sql
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
     WHERE a.attrelid=pg_catalog.to_regclass('public.' || expected.tabla)
       AND a.attname=expected.columna;
    IF expression_sql IS NULL THEN
      RAISE EXCEPTION 'Rollback no aplicable: falta default %.%',expected.tabla,expected.columna;
    END IF;
    EXECUTE pg_catalog.format('SELECT (%s)::timestamptz',expression_sql) INTO evaluated_timestamp;
    IF evaluated_timestamp IS NULL THEN
      RAISE EXCEPTION 'Rollback no aplicable: default temporal incompatible';
    END IF;
  END LOOP;

  FOR expected IN
    SELECT * FROM (VALUES
      ('clasificacion_geografica_pld_version','pk_clasificacion_geografica_pld_version','p',ARRAY['id']::TEXT[],NULL::TEXT,NULL::TEXT[]),
      ('clasificacion_geografica_pld_version','uq_clasificacion_geografica_pld_version_fuente','u',ARRAY['tipo_clasificacion','fuente_codigo','fuente_version']::TEXT[],NULL::TEXT,NULL::TEXT[]),
      ('clasificacion_geografica_pld_version','fk_clasificacion_geografica_pld_version_creado_por','f',ARRAY['creado_por']::TEXT[],'usuarios',ARRAY['id']::TEXT[]),
      ('clasificacion_geografica_pld_jurisdiccion','pk_clasificacion_geografica_pld_jurisdiccion','p',ARRAY['id']::TEXT[],NULL::TEXT,NULL::TEXT[]),
      ('clasificacion_geografica_pld_jurisdiccion','uq_clasificacion_geografica_pld_jurisdiccion_version_codigo','u',ARRAY['version_id','jurisdiccion_codigo']::TEXT[],NULL::TEXT,NULL::TEXT[]),
      ('clasificacion_geografica_pld_jurisdiccion','fk_clasificacion_geografica_pld_jurisdiccion_version','f',ARRAY['version_id']::TEXT[],'clasificacion_geografica_pld_version',ARRAY['id']::TEXT[]),
      ('clasificacion_geografica_pld_jurisdiccion','fk_clasificacion_geografica_pld_jurisdiccion_pais','f',ARRAY['pais_id']::TEXT[],'cat_paises',ARRAY['id']::TEXT[])
    ) AS x(tabla,nombre,tipo,columnas,tabla_ref,columnas_ref)
  LOOP
    SELECT ARRAY(
             SELECT a.attname::TEXT FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY k(attnum,ord)
             JOIN pg_catalog.pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum ORDER BY k.ord
           ), CASE WHEN c.contype='f' THEN ARRAY(
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
      RAISE EXCEPTION 'Rollback no aplicable: constraint % incompatible',expected.nombre;
    END IF;
  END LOOP;

  FOR expected IN
    SELECT * FROM (VALUES
      ('clasificacion_geografica_pld_version','ck_clasificacion_geografica_pld_version_tipo',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,''GAFI_ALTO_RIESGO''::varchar(40)),(2,''GAFI_LISTA_GRIS''::varchar(40)),(3,''REGIMEN_FISCAL_PREFERENTE''::varchar(40)),(4,''OTRA''::varchar(40))) v(n,tipo_clasificacion)',ARRAY[true,true,true,false]::BOOLEAN[]),
      ('clasificacion_geografica_pld_version','ck_clasificacion_geografica_pld_version_fuente_codigo',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,''GAFI''::varchar(100)),(2,''SAT_2026''::varchar(100)),(3,''''::varchar(100)),(4,''min''::varchar(100)),(5,''A-1''::varchar(100))) v(n,fuente_codigo)',ARRAY[true,true,false,false,false]::BOOLEAN[]),
      ('clasificacion_geografica_pld_version','ck_clasificacion_geografica_pld_version_fuente_nombre',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,''GAFI''::varchar(255)),(2,'' ''::varchar(255))) v(n,fuente_nombre)',ARRAY[true,false]::BOOLEAN[]),
      ('clasificacion_geografica_pld_version','ck_clasificacion_geografica_pld_version_fuente_url',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,NULL::text),(2,''https://example.test''::text),(3,'' ''::text)) v(n,fuente_url)',ARRAY[true,true,false]::BOOLEAN[]),
      ('clasificacion_geografica_pld_version','ck_clasificacion_geografica_pld_version_fuente_version',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,''2026-08''::varchar(100)),(2,'' ''::varchar(100))) v(n,fuente_version)',ARRAY[true,false]::BOOLEAN[]),
      ('clasificacion_geografica_pld_version','ck_clasificacion_geografica_pld_version_vigencia',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,''2026-01-01''::date,''2026-01-01''::date,NULL::date),(2,''2026-01-01''::date,''2026-01-02''::date,''2026-01-02''::date),(3,''2026-01-02''::date,''2026-01-01''::date,NULL::date),(4,''2026-01-01''::date,''2026-01-02''::date,''2026-01-01''::date)) v(n,fecha_publicacion,vigente_desde,vigente_hasta)',ARRAY[true,true,false,false]::BOOLEAN[]),
      ('clasificacion_geografica_pld_jurisdiccion','ck_clasificacion_geografica_pld_jurisdiccion_codigo',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,''MX''::varchar(100)),(2,''ZONE_1.A''::varchar(100)),(3,''''::varchar(100)),(4,''min''::varchar(100))) v(n,jurisdiccion_codigo)',ARRAY[true,true,false,false]::BOOLEAN[]),
      ('clasificacion_geografica_pld_jurisdiccion','ck_clasificacion_geografica_pld_jurisdiccion_nombre_fuente',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,''Mexico''::varchar(255)),(2,'' ''::varchar(255))) v(n,nombre_fuente)',ARRAY[true,false]::BOOLEAN[]),
      ('clasificacion_geografica_pld_jurisdiccion','ck_clasificacion_geografica_pld_jurisdiccion_nombre_normalizado',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,''MEXICO''::varchar(255)),(2,'' ''::varchar(255))) v(n,nombre_normalizado)',ARRAY[true,false]::BOOLEAN[]),
      ('clasificacion_geografica_pld_jurisdiccion','ck_clasificacion_geografica_pld_jurisdiccion_tipo',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,''PAIS''::varchar(20)),(2,''TERRITORIO''::varchar(20)),(3,''ZONA''::varchar(20)),(4,''OTRO''::varchar(20))) v(n,tipo_entidad_geografica)',ARRAY[true,true,true,false]::BOOLEAN[]),
      ('clasificacion_geografica_pld_jurisdiccion','ck_clasificacion_geografica_pld_jurisdiccion_pais_requerido',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,''PAIS''::varchar(20),1),(2,''PAIS''::varchar(20),NULL::integer),(3,''TERRITORIO''::varchar(20),NULL::integer),(4,''ZONA''::varchar(20),NULL::integer)) v(n,tipo_entidad_geografica,pais_id)',ARRAY[true,false,true,true]::BOOLEAN[]),
      ('clasificacion_geografica_pld_jurisdiccion','ck_clasificacion_geografica_pld_jurisdiccion_observacion',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,NULL::text),(2,''Nota''::text),(3,'' ''::text)) v(n,observacion)',ARRAY[true,true,false]::BOOLEAN[])
    ) AS x(tabla,nombre,consulta,esperado)
  LOOP
    SELECT pg_catalog.pg_get_expr(c.conbin,c.conrelid) INTO expression_sql
      FROM pg_catalog.pg_constraint c
     WHERE c.conrelid=pg_catalog.to_regclass('public.' || expected.tabla)
       AND c.conname=expected.nombre AND c.contype='c'
       AND c.convalidated AND NOT c.condeferrable;
    IF expression_sql IS NULL THEN
      RAISE EXCEPTION 'Rollback no aplicable: CHECK % ausente',expected.nombre;
    END IF;
    EXECUTE pg_catalog.format(expected.consulta,expression_sql) INTO accepted;
    IF accepted IS DISTINCT FROM expected.esperado THEN
      RAISE EXCEPTION 'Rollback no aplicable: semantica de % incompatible',expected.nombre;
    END IF;
  END LOOP;

  FOR expected IN
    SELECT * FROM (VALUES
      ('clasificacion_geografica_pld_version','pk_clasificacion_geografica_pld_version',ARRAY['id']::TEXT[],true,true,false),
      ('clasificacion_geografica_pld_version','uq_clasificacion_geografica_pld_version_fuente',ARRAY['tipo_clasificacion','fuente_codigo','fuente_version']::TEXT[],true,false,false),
      ('clasificacion_geografica_pld_version','uq_clasificacion_geografica_pld_version_tipo_activa',ARRAY['tipo_clasificacion']::TEXT[],true,false,true),
      ('clasificacion_geografica_pld_version','idx_clasificacion_geografica_pld_version_creado_por',ARRAY['creado_por']::TEXT[],false,false,false),
      ('clasificacion_geografica_pld_jurisdiccion','pk_clasificacion_geografica_pld_jurisdiccion',ARRAY['id']::TEXT[],true,true,false),
      ('clasificacion_geografica_pld_jurisdiccion','uq_clasificacion_geografica_pld_jurisdiccion_version_codigo',ARRAY['version_id','jurisdiccion_codigo']::TEXT[],true,false,false),
      ('clasificacion_geografica_pld_jurisdiccion','uq_clasificacion_geografica_pld_jurisdiccion_version_pais',ARRAY['version_id','pais_id']::TEXT[],true,false,true),
      ('clasificacion_geografica_pld_jurisdiccion','idx_clasificacion_geografica_pld_jurisdiccion_pais',ARRAY['pais_id']::TEXT[],false,false,true)
    ) AS x(tabla,nombre,columnas,unico,primario,parcial)
  LOOP
    SELECT ARRAY(
      SELECT a.attname::TEXT
        FROM pg_catalog.generate_series(0,i.indnkeyatts-1) p(pos)
        JOIN pg_catalog.pg_attribute a
          ON a.attrelid=i.indrelid AND a.attnum=i.indkey[p.pos]
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
      RAISE EXCEPTION 'Rollback no aplicable: indice % incompatible',expected.nombre;
    END IF;
  END LOOP;

  FOR expected IN
    SELECT * FROM (VALUES
      ('uq_clasificacion_geografica_pld_version_tipo_activa',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,true),(2,false)) v(n,activa)',ARRAY[true,false]::BOOLEAN[]),
      ('uq_clasificacion_geografica_pld_jurisdiccion_version_pais',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,1),(2,NULL::integer)) v(n,pais_id)',ARRAY[true,false]::BOOLEAN[]),
      ('idx_clasificacion_geografica_pld_jurisdiccion_pais',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,1),(2,NULL::integer)) v(n,pais_id)',ARRAY[true,false]::BOOLEAN[])
    ) AS x(nombre,consulta,esperado)
  LOOP
    SELECT pg_catalog.pg_get_expr(i.indpred,i.indrelid) INTO expression_sql
      FROM pg_catalog.pg_index i
      JOIN pg_catalog.pg_class x ON x.oid=i.indexrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=x.relnamespace
     WHERE n.nspname='public' AND x.relname=expected.nombre;
    IF expression_sql IS NULL THEN
      RAISE EXCEPTION 'Rollback no aplicable: falta predicado de indice %',expected.nombre;
    END IF;
    EXECUTE pg_catalog.format(expected.consulta,expression_sql) INTO accepted;
    IF accepted IS DISTINCT FROM expected.esperado THEN
      RAISE EXCEPTION 'Rollback no aplicable: predicado de indice % incompatible',expected.nombre;
    END IF;
  END LOOP;

  IF (SELECT pg_catalog.count(*) FROM pg_catalog.pg_attribute a
       WHERE a.attrelid='public.clasificacion_geografica_pld_version'::pg_catalog.regclass
         AND a.attnum>0 AND NOT a.attisdropped) <> 12
     OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_attribute a
       WHERE a.attrelid='public.clasificacion_geografica_pld_jurisdiccion'::pg_catalog.regclass
         AND a.attnum>0 AND NOT a.attisdropped) <> 9
     OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_constraint c
       WHERE c.conrelid='public.clasificacion_geografica_pld_version'::pg_catalog.regclass) <> 9
     OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_constraint c
       WHERE c.conrelid='public.clasificacion_geografica_pld_jurisdiccion'::pg_catalog.regclass) <> 10
     OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_index i
       WHERE i.indrelid='public.clasificacion_geografica_pld_version'::pg_catalog.regclass) <> 4
     OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_index i
       WHERE i.indrelid='public.clasificacion_geografica_pld_jurisdiccion'::pg_catalog.regclass) <> 4 THEN
    RAISE EXCEPTION 'Rollback no aplicable: estructura o cantidad de objetos incompatible';
  END IF;
END
$$;

DROP TABLE public.clasificacion_geografica_pld_jurisdiccion;
DROP TABLE public.clasificacion_geografica_pld_version;

DELETE FROM public.schema_migrations
WHERE migration_key='20260817_011_clasificacion_geografica_pld';

COMMIT;
