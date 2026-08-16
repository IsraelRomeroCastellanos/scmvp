BEGIN;
SET TRANSACTION READ ONLY;

SELECT pg_catalog.current_database() AS current_database,
       pg_catalog.current_schema() AS current_schema,
       pg_catalog.current_user AS current_user,
       pg_catalog.current_setting('server_version') AS server_version;

DO $$
DECLARE
  expected RECORD;
  actual_columns TEXT[];
  referenced_columns TEXT[];
  expression_sql TEXT;
  accepted BOOLEAN[];
  evaluated_text TEXT;
  evaluated_timestamp TIMESTAMPTZ;
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'VERIFY fallido: se esperaba el esquema public';
  END IF;

  IF pg_catalog.to_regclass('public.schema_migrations') IS NULL
     OR pg_catalog.to_regclass('public.cliente_pt_evaluacion') IS NULL
     OR pg_catalog.to_regclass('public.cliente_pt_respuesta') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.schema_migrations
        WHERE migration_key = '20260815_009_cliente_pt_evaluacion_matriz'
     ) THEN
    RAISE EXCEPTION 'VERIFY fallido: faltan tablas o migration key 009';
  END IF;

  FOR expected IN
    SELECT * FROM (VALUES
      ('cliente_pt_evaluacion','id','pg_catalog.int8'::pg_catalog.regtype,-1,true,'d'),
      ('cliente_pt_evaluacion','cliente_id','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('cliente_pt_evaluacion','empresa_id','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('cliente_pt_evaluacion','matriz_version_id','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('cliente_pt_evaluacion','ambito','pg_catalog.varchar'::pg_catalog.regtype,6,true,''),
      ('cliente_pt_evaluacion','numero_version','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('cliente_pt_evaluacion','puntaje_total','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('cliente_pt_evaluacion','matriz_resultado_id','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('cliente_pt_evaluacion','estado','pg_catalog.varchar'::pg_catalog.regtype,24,true,''),
      ('cliente_pt_evaluacion','creada_por','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('cliente_pt_evaluacion','creada_en','pg_catalog.timestamptz'::pg_catalog.regtype,-1,true,''),
      ('cliente_pt_respuesta','id','pg_catalog.int8'::pg_catalog.regtype,-1,true,'d'),
      ('cliente_pt_respuesta','evaluacion_id','pg_catalog.int8'::pg_catalog.regtype,-1,true,''),
      ('cliente_pt_respuesta','matriz_version_id','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('cliente_pt_respuesta','ambito','pg_catalog.varchar'::pg_catalog.regtype,6,true,''),
      ('cliente_pt_respuesta','matriz_criterio_id','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('cliente_pt_respuesta','matriz_opcion_id','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('cliente_pt_respuesta','puntaje','pg_catalog.numeric'::pg_catalog.regtype,-1,true,''),
      ('cliente_pt_respuesta','orden','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('cliente_pt_respuesta','creada_en','pg_catalog.timestamptz'::pg_catalog.regtype,-1,true,'')
    ) AS x(tabla,columna,tipo_oid,typmod,no_nula,identidad)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
       WHERE a.attrelid = pg_catalog.to_regclass('public.' || expected.tabla)
         AND a.attname = expected.columna
         AND a.attnum > 0 AND NOT a.attisdropped
         AND a.atttypid = expected.tipo_oid
         AND a.atttypmod = expected.typmod
         AND a.attnotnull = expected.no_nula
         AND a.attidentity = expected.identidad
    ) THEN
      RAISE EXCEPTION 'VERIFY fallido: %.% es incompatible', expected.tabla, expected.columna;
    END IF;
  END LOOP;

  IF (SELECT pg_catalog.count(*) FROM pg_catalog.pg_attribute a
       WHERE a.attrelid='public.cliente_pt_evaluacion'::pg_catalog.regclass
         AND a.attnum>0 AND NOT a.attisdropped) <> 11
     OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_attribute a
       WHERE a.attrelid='public.cliente_pt_respuesta'::pg_catalog.regclass
         AND a.attnum>0 AND NOT a.attisdropped) <> 9 THEN
    RAISE EXCEPTION 'VERIFY fallido: cantidad de columnas incompatible';
  END IF;

  FOR expected IN
    SELECT * FROM (VALUES
      ('cliente_pt_evaluacion','ambito','PT'),
      ('cliente_pt_evaluacion','estado','COMPLETADA'),
      ('cliente_pt_respuesta','ambito','PT')
    ) AS x(tabla,columna,valor)
  LOOP
    SELECT pg_catalog.pg_get_expr(d.adbin,d.adrelid)
      INTO expression_sql
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
     WHERE a.attrelid=pg_catalog.to_regclass('public.' || expected.tabla)
       AND a.attname=expected.columna AND a.attnum>0 AND NOT a.attisdropped;
    IF expression_sql IS NULL THEN
      RAISE EXCEPTION 'VERIFY fallido: falta default %.%', expected.tabla, expected.columna;
    END IF;
    EXECUTE pg_catalog.format('SELECT (%s)::text', expression_sql) INTO evaluated_text;
    IF evaluated_text IS DISTINCT FROM expected.valor THEN
      RAISE EXCEPTION 'VERIFY fallido: default %.% incompatible', expected.tabla, expected.columna;
    END IF;
  END LOOP;

  FOR expected IN
    SELECT * FROM (VALUES
      ('cliente_pt_evaluacion','creada_en'),
      ('cliente_pt_respuesta','creada_en')
    ) AS x(tabla,columna)
  LOOP
    SELECT pg_catalog.pg_get_expr(d.adbin,d.adrelid)
      INTO expression_sql
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
     WHERE a.attrelid=pg_catalog.to_regclass('public.' || expected.tabla)
       AND a.attname=expected.columna AND a.attnum>0 AND NOT a.attisdropped;
    IF expression_sql IS NULL THEN
      RAISE EXCEPTION 'VERIFY fallido: falta default %.%', expected.tabla, expected.columna;
    END IF;
    EXECUTE pg_catalog.format('SELECT (%s)::timestamptz', expression_sql)
      INTO evaluated_timestamp;
    IF evaluated_timestamp IS NULL THEN
      RAISE EXCEPTION 'VERIFY fallido: default %.% no produce timestamptz', expected.tabla, expected.columna;
    END IF;
  END LOOP;

  FOR expected IN
    SELECT * FROM (VALUES
      ('cliente_pt_evaluacion','pk_cliente_pt_evaluacion','p',ARRAY['id']::TEXT[],NULL::TEXT,NULL::TEXT[]),
      ('cliente_pt_evaluacion','uq_cliente_pt_evaluacion_cliente_version','u',ARRAY['cliente_id','numero_version']::TEXT[],NULL::TEXT,NULL::TEXT[]),
      ('cliente_pt_evaluacion','uq_cliente_pt_evaluacion_id_matriz_ambito','u',ARRAY['id','matriz_version_id','ambito']::TEXT[],NULL::TEXT,NULL::TEXT[]),
      ('cliente_pt_evaluacion','fk_cliente_pt_evaluacion_cliente_empresa','f',ARRAY['cliente_id','empresa_id']::TEXT[],'clientes',ARRAY['id','empresa_id']::TEXT[]),
      ('cliente_pt_evaluacion','fk_cliente_pt_evaluacion_empresa','f',ARRAY['empresa_id']::TEXT[],'empresas',ARRAY['id']::TEXT[]),
      ('cliente_pt_evaluacion','fk_cliente_pt_evaluacion_matriz_empresa','f',ARRAY['matriz_version_id','empresa_id']::TEXT[],'matriz_empresa_version',ARRAY['id','empresa_id']::TEXT[]),
      ('cliente_pt_evaluacion','fk_cliente_pt_evaluacion_resultado_matriz_ambito','f',ARRAY['matriz_resultado_id','matriz_version_id','ambito']::TEXT[],'matriz_resultado',ARRAY['id','matriz_version_id','ambito']::TEXT[]),
      ('cliente_pt_evaluacion','fk_cliente_pt_evaluacion_creada_por','f',ARRAY['creada_por']::TEXT[],'usuarios',ARRAY['id']::TEXT[]),
      ('cliente_pt_respuesta','pk_cliente_pt_respuesta','p',ARRAY['id']::TEXT[],NULL::TEXT,NULL::TEXT[]),
      ('cliente_pt_respuesta','uq_cliente_pt_respuesta_evaluacion_criterio','u',ARRAY['evaluacion_id','matriz_criterio_id']::TEXT[],NULL::TEXT,NULL::TEXT[]),
      ('cliente_pt_respuesta','fk_cliente_pt_respuesta_evaluacion_matriz_ambito','f',ARRAY['evaluacion_id','matriz_version_id','ambito']::TEXT[],'cliente_pt_evaluacion',ARRAY['id','matriz_version_id','ambito']::TEXT[]),
      ('cliente_pt_respuesta','fk_cliente_pt_respuesta_criterio_matriz_ambito','f',ARRAY['matriz_criterio_id','matriz_version_id','ambito','orden']::TEXT[],'matriz_criterio',ARRAY['id','matriz_version_id','ambito','orden']::TEXT[]),
      ('cliente_pt_respuesta','fk_cliente_pt_respuesta_opcion_criterio_puntaje','f',ARRAY['matriz_opcion_id','matriz_criterio_id','puntaje']::TEXT[],'matriz_opcion',ARRAY['id','criterio_id','puntaje']::TEXT[])
    ) AS x(tabla,nombre,tipo,columnas,tabla_ref,columnas_ref)
  LOOP
    SELECT ARRAY(
             SELECT a.attname::TEXT
               FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY k(attnum,ord)
               JOIN pg_catalog.pg_attribute a
                 ON a.attrelid=c.conrelid AND a.attnum=k.attnum
              ORDER BY k.ord
           ),
           CASE WHEN c.contype='f' THEN ARRAY(
             SELECT a.attname::TEXT
               FROM pg_catalog.unnest(c.confkey) WITH ORDINALITY k(attnum,ord)
               JOIN pg_catalog.pg_attribute a
                 ON a.attrelid=c.confrelid AND a.attnum=k.attnum
              ORDER BY k.ord
           ) ELSE NULL END
      INTO actual_columns, referenced_columns
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      LEFT JOIN pg_catalog.pg_class rt ON rt.oid=c.confrelid
      LEFT JOIN pg_catalog.pg_namespace rn ON rn.oid=rt.relnamespace
     WHERE n.nspname='public' AND t.relname=expected.tabla
       AND c.conname=expected.nombre AND c.contype=expected.tipo::"char"
       AND c.convalidated AND NOT c.condeferrable
       AND (c.contype<>'f' OR (
         rn.nspname='public' AND rt.relname=expected.tabla_ref
         AND c.confdeltype='r'::"char" AND c.confupdtype='a'::"char"
         AND c.confmatchtype='s'::"char"
       ));
    IF actual_columns IS DISTINCT FROM expected.columnas
       OR referenced_columns IS DISTINCT FROM expected.columnas_ref THEN
      RAISE EXCEPTION 'VERIFY fallido: constraint % incompatible', expected.nombre;
    END IF;
  END LOOP;

  FOR expected IN
    SELECT * FROM (VALUES
      ('clientes','uq_clientes_id_empresa_pt',ARRAY['id','empresa_id']::TEXT[]),
      ('matriz_criterio','uq_matriz_criterio_id_version_ambito_orden_pt',ARRAY['id','matriz_version_id','ambito','orden']::TEXT[]),
      ('matriz_opcion','uq_matriz_opcion_id_criterio_puntaje_pt',ARRAY['id','criterio_id','puntaje']::TEXT[]),
      ('matriz_resultado','uq_matriz_resultado_id_version_ambito_pt',ARRAY['id','matriz_version_id','ambito']::TEXT[])
    ) AS x(tabla,nombre,columnas)
  LOOP
    SELECT ARRAY(
             SELECT a.attname::TEXT
               FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY k(attnum,ord)
               JOIN pg_catalog.pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum
              ORDER BY k.ord
           )
      INTO actual_columns
      FROM pg_catalog.pg_constraint c
     WHERE c.conrelid=pg_catalog.to_regclass('public.' || expected.tabla)
       AND c.conname=expected.nombre AND c.contype='u' AND c.convalidated;
    IF actual_columns IS DISTINCT FROM expected.columnas THEN
      RAISE EXCEPTION 'VERIFY fallido: constraint auxiliar % incompatible', expected.nombre;
    END IF;
  END LOOP;

  FOR expected IN
    SELECT * FROM (VALUES
      ('cliente_pt_evaluacion','ck_cliente_pt_evaluacion_ambito',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY orden) FROM (VALUES (1,''PT''::varchar(2)),(2,''GR''::varchar(2)),(3,''XX''::varchar(2))) AS cliente_pt_evaluacion(orden,ambito)', ARRAY[true,false,false]::BOOLEAN[]),
      ('cliente_pt_evaluacion','ck_cliente_pt_evaluacion_numero_version',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY orden) FROM (VALUES (1,1),(2,0),(3,-1)) AS cliente_pt_evaluacion(orden,numero_version)', ARRAY[true,false,false]::BOOLEAN[]),
      ('cliente_pt_evaluacion','ck_cliente_pt_evaluacion_puntaje_total',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY orden) FROM (VALUES (1,1),(2,0),(3,-1)) AS cliente_pt_evaluacion(orden,puntaje_total)', ARRAY[true,false,false]::BOOLEAN[]),
      ('cliente_pt_evaluacion','ck_cliente_pt_evaluacion_estado',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY orden) FROM (VALUES (1,''COMPLETADA''::varchar(20)),(2,''BORRADOR''::varchar(20)),(3,''OTRO''::varchar(20))) AS cliente_pt_evaluacion(orden,estado)', ARRAY[true,false,false]::BOOLEAN[]),
      ('cliente_pt_respuesta','ck_cliente_pt_respuesta_ambito',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY orden) FROM (VALUES (1,''PT''::varchar(2)),(2,''GR''::varchar(2)),(3,''XX''::varchar(2))) AS cliente_pt_respuesta(orden,ambito)', ARRAY[true,false,false]::BOOLEAN[]),
      ('cliente_pt_respuesta','ck_cliente_pt_respuesta_puntaje',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY orden) FROM (VALUES (1,1::numeric),(2,2::numeric),(3,3::numeric),(4,0::numeric),(5,4::numeric),(6,1.5::numeric)) AS cliente_pt_respuesta(orden,puntaje)', ARRAY[true,true,true,false,false,false]::BOOLEAN[]),
      ('cliente_pt_respuesta','ck_cliente_pt_respuesta_orden',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY orden_prueba) FROM (VALUES (1,1),(2,0),(3,-1)) AS cliente_pt_respuesta(orden_prueba,orden)', ARRAY[true,false,false]::BOOLEAN[])
    ) AS x(tabla,nombre,consulta,esperado)
  LOOP
    SELECT pg_catalog.pg_get_expr(c.conbin,c.conrelid)
      INTO expression_sql
      FROM pg_catalog.pg_constraint c
     WHERE c.conrelid=pg_catalog.to_regclass('public.' || expected.tabla)
       AND c.conname=expected.nombre AND c.contype='c'
       AND c.convalidated AND NOT c.condeferrable;
    IF expression_sql IS NULL THEN
      RAISE EXCEPTION 'VERIFY fallido: CHECK % ausente', expected.nombre;
    END IF;
    EXECUTE pg_catalog.format(expected.consulta, expression_sql) INTO accepted;
    IF accepted IS DISTINCT FROM expected.esperado THEN
      RAISE EXCEPTION 'VERIFY fallido: semantica de % incompatible', expected.nombre;
    END IF;
  END LOOP;

  FOR expected IN
    SELECT * FROM (VALUES
      ('cliente_pt_evaluacion','uq_cliente_pt_evaluacion_cliente_version',ARRAY['cliente_id','numero_version']::TEXT[],true),
      ('cliente_pt_evaluacion','idx_cliente_pt_evaluacion_empresa',ARRAY['empresa_id']::TEXT[],false),
      ('cliente_pt_evaluacion','idx_cliente_pt_evaluacion_matriz',ARRAY['matriz_version_id']::TEXT[],false),
      ('cliente_pt_evaluacion','idx_cliente_pt_evaluacion_resultado',ARRAY['matriz_resultado_id']::TEXT[],false),
      ('cliente_pt_evaluacion','idx_cliente_pt_evaluacion_creada_por',ARRAY['creada_por']::TEXT[],false),
      ('cliente_pt_respuesta','uq_cliente_pt_respuesta_evaluacion_criterio',ARRAY['evaluacion_id','matriz_criterio_id']::TEXT[],true),
      ('cliente_pt_respuesta','idx_cliente_pt_respuesta_criterio',ARRAY['matriz_criterio_id']::TEXT[],false),
      ('cliente_pt_respuesta','idx_cliente_pt_respuesta_opcion',ARRAY['matriz_opcion_id']::TEXT[],false)
    ) AS x(tabla,nombre,columnas,unico)
  LOOP
    SELECT ARRAY(
             SELECT a.attname::TEXT
               FROM pg_catalog.generate_series(
                      pg_catalog.array_lower(i.indkey::SMALLINT[], 1),
                      pg_catalog.array_lower(i.indkey::SMALLINT[], 1) + i.indnkeyatts - 1
                    ) AS key_position(position)
               JOIN pg_catalog.pg_attribute a
                 ON a.attrelid=i.indrelid
                AND a.attnum=(i.indkey::SMALLINT[])[key_position.position]
                AND a.attnum>0 AND NOT a.attisdropped
              ORDER BY key_position.position
           )
      INTO actual_columns
      FROM pg_catalog.pg_index i
      JOIN pg_catalog.pg_class x ON x.oid=i.indexrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=x.relnamespace
      JOIN pg_catalog.pg_am am ON am.oid=x.relam
     WHERE n.nspname='public' AND x.relname=expected.nombre
       AND i.indrelid=pg_catalog.to_regclass('public.' || expected.tabla)
       AND am.amname='btree'
       AND i.indisvalid AND i.indisready AND i.indislive
       AND i.indisunique=expected.unico
       AND i.indpred IS NULL AND i.indexprs IS NULL
       AND i.indnkeyatts=pg_catalog.cardinality(expected.columnas)
       AND i.indnatts=pg_catalog.cardinality(expected.columnas);
    IF actual_columns IS DISTINCT FROM expected.columnas THEN
      RAISE EXCEPTION 'VERIFY fallido: indice % incompatible', expected.nombre;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM public.cliente_pt_evaluacion e
    LEFT JOIN public.clientes c ON c.id=e.cliente_id AND c.empresa_id=e.empresa_id
    LEFT JOIN public.matriz_empresa_version mv ON mv.id=e.matriz_version_id AND mv.empresa_id=e.empresa_id
    LEFT JOIN public.matriz_resultado mr ON mr.id=e.matriz_resultado_id
      AND mr.matriz_version_id=e.matriz_version_id AND mr.ambito=e.ambito
    LEFT JOIN public.usuarios u ON u.id=e.creada_por
    WHERE c.id IS NULL OR mv.id IS NULL OR mr.id IS NULL OR u.id IS NULL
  ) OR EXISTS (
    SELECT 1 FROM public.cliente_pt_respuesta r
    LEFT JOIN public.cliente_pt_evaluacion e ON e.id=r.evaluacion_id
      AND e.matriz_version_id=r.matriz_version_id AND e.ambito=r.ambito
    LEFT JOIN public.matriz_criterio mc ON mc.id=r.matriz_criterio_id
      AND mc.matriz_version_id=r.matriz_version_id AND mc.ambito=r.ambito
      AND mc.orden=r.orden
    LEFT JOIN public.matriz_opcion mo ON mo.id=r.matriz_opcion_id
      AND mo.criterio_id=r.matriz_criterio_id AND mo.puntaje=r.puntaje
    WHERE e.id IS NULL OR mc.id IS NULL OR mo.id IS NULL
  ) THEN
    RAISE EXCEPTION 'VERIFY fallido: existen referencias historicas incoherentes';
  END IF;
END
$$;

SELECT migration_key
FROM public.schema_migrations
WHERE migration_key = '20260815_009_cliente_pt_evaluacion_matriz';

COMMIT;
