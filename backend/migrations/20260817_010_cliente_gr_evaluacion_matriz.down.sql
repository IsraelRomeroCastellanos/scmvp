BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtext('20260817_010_cliente_gr_evaluacion_matriz')
);

DO $$
DECLARE
  expected RECORD;
  actual_columns TEXT[];
  referenced_columns TEXT[];
  expression_sql TEXT;
  evaluated_text TEXT;
  evaluated_timestamp TIMESTAMPTZ;
  accepted BOOLEAN[];
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Rollback no aplicable: se esperaba public';
  END IF;
  IF pg_catalog.to_regclass('public.cliente_gr_evaluacion') IS NULL
     OR pg_catalog.to_regclass('public.cliente_gr_criterio_resultado') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.schema_migrations
        WHERE migration_key='20260817_010_cliente_gr_evaluacion_matriz'
     ) THEN
    RAISE EXCEPTION 'Rollback no aplicable: faltan tablas o migration key 010';
  END IF;
  IF EXISTS (SELECT 1 FROM public.cliente_gr_evaluacion)
     OR EXISTS (SELECT 1 FROM public.cliente_gr_criterio_resultado) THEN
    RAISE EXCEPTION 'Rollback bloqueado: existen evaluaciones o resultados de criterio GR';
  END IF;

  FOR expected IN
    SELECT * FROM (VALUES
      ('cliente_gr_evaluacion','id','pg_catalog.int8'::pg_catalog.regtype,-1,true,'d'),
      ('cliente_gr_evaluacion','cliente_id','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('cliente_gr_evaluacion','empresa_id','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('cliente_gr_evaluacion','matriz_version_id','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('cliente_gr_evaluacion','pt_evaluacion_id','pg_catalog.int8'::pg_catalog.regtype,-1,true,''),
      ('cliente_gr_evaluacion','ambito','pg_catalog.varchar'::pg_catalog.regtype,6,true,''),
      ('cliente_gr_evaluacion','numero_version','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('cliente_gr_evaluacion','puntaje_total','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('cliente_gr_evaluacion','matriz_resultado_id','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('cliente_gr_evaluacion','estado','pg_catalog.varchar'::pg_catalog.regtype,24,true,''),
      ('cliente_gr_evaluacion','creada_por','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('cliente_gr_evaluacion','creada_en','pg_catalog.timestamptz'::pg_catalog.regtype,-1,true,''),
      ('cliente_gr_criterio_resultado','id','pg_catalog.int8'::pg_catalog.regtype,-1,true,'d'),
      ('cliente_gr_criterio_resultado','evaluacion_id','pg_catalog.int8'::pg_catalog.regtype,-1,true,''),
      ('cliente_gr_criterio_resultado','matriz_version_id','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('cliente_gr_criterio_resultado','ambito','pg_catalog.varchar'::pg_catalog.regtype,6,true,''),
      ('cliente_gr_criterio_resultado','matriz_criterio_id','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('cliente_gr_criterio_resultado','resolver_codigo','pg_catalog.varchar'::pg_catalog.regtype,104,true,''),
      ('cliente_gr_criterio_resultado','puntaje','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('cliente_gr_criterio_resultado','orden','pg_catalog.int4'::pg_catalog.regtype,-1,true,''),
      ('cliente_gr_criterio_resultado','evidencia','pg_catalog.jsonb'::pg_catalog.regtype,-1,true,''),
      ('cliente_gr_criterio_resultado','creada_en','pg_catalog.timestamptz'::pg_catalog.regtype,-1,true,'')
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

  FOR expected IN
    SELECT * FROM (VALUES
      ('cliente_gr_evaluacion','ambito','GR'),
      ('cliente_gr_evaluacion','estado','COMPLETADA'),
      ('cliente_gr_criterio_resultado','ambito','GR')
    ) AS x(tabla,columna,valor)
  LOOP
    SELECT pg_catalog.pg_get_expr(d.adbin,d.adrelid) INTO expression_sql
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
     WHERE a.attrelid=pg_catalog.to_regclass('public.' || expected.tabla)
       AND a.attname=expected.columna AND a.attnum>0 AND NOT a.attisdropped;
    IF expression_sql IS NULL THEN
      RAISE EXCEPTION 'Rollback no aplicable: falta default %.%',expected.tabla,expected.columna;
    END IF;
    EXECUTE pg_catalog.format('SELECT (%s)::text',expression_sql) INTO evaluated_text;
    IF evaluated_text IS DISTINCT FROM expected.valor THEN
      RAISE EXCEPTION 'Rollback no aplicable: default %.% incompatible',expected.tabla,expected.columna;
    END IF;
  END LOOP;

  FOR expected IN
    SELECT * FROM (VALUES
      ('cliente_gr_evaluacion','creada_en'),
      ('cliente_gr_criterio_resultado','creada_en')
    ) AS x(tabla,columna)
  LOOP
    SELECT pg_catalog.pg_get_expr(d.adbin,d.adrelid) INTO expression_sql
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
     WHERE a.attrelid=pg_catalog.to_regclass('public.' || expected.tabla)
       AND a.attname=expected.columna AND a.attnum>0 AND NOT a.attisdropped;
    IF expression_sql IS NULL THEN
      RAISE EXCEPTION 'Rollback no aplicable: falta default %.%',expected.tabla,expected.columna;
    END IF;
    EXECUTE pg_catalog.format('SELECT (%s)::timestamptz',expression_sql)
      INTO evaluated_timestamp;
    IF evaluated_timestamp IS NULL THEN
      RAISE EXCEPTION 'Rollback no aplicable: default %.% no produce timestamptz',expected.tabla,expected.columna;
    END IF;
  END LOOP;

  FOR expected IN
    SELECT * FROM (VALUES
      ('cliente_gr_evaluacion','ck_cliente_gr_evaluacion_ambito',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,''GR''::varchar(2)),(2,''PT''::varchar(2))) v(n,ambito)',ARRAY[true,false]::BOOLEAN[]),
      ('cliente_gr_evaluacion','ck_cliente_gr_evaluacion_numero_version',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,1),(2,0),(3,-1)) v(n,numero_version)',ARRAY[true,false,false]::BOOLEAN[]),
      ('cliente_gr_evaluacion','ck_cliente_gr_evaluacion_puntaje_total',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,4),(2,12),(3,3),(4,13)) v(n,puntaje_total)',ARRAY[true,true,false,false]::BOOLEAN[]),
      ('cliente_gr_evaluacion','ck_cliente_gr_evaluacion_estado',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,''COMPLETADA''::varchar(20)),(2,''BORRADOR''::varchar(20))) v(n,estado)',ARRAY[true,false]::BOOLEAN[]),
      ('cliente_gr_criterio_resultado','ck_cliente_gr_criterio_resultado_ambito',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,''GR''::varchar(2)),(2,''PT''::varchar(2))) v(n,ambito)',ARRAY[true,false]::BOOLEAN[]),
      ('cliente_gr_criterio_resultado','ck_cliente_gr_criterio_resultado_puntaje',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,1),(2,2),(3,3),(4,0),(5,4)) v(n,puntaje)',ARRAY[true,true,true,false,false]::BOOLEAN[]),
      ('cliente_gr_criterio_resultado','ck_cliente_gr_criterio_resultado_orden',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,1),(2,4),(3,0),(4,5)) v(n,orden)',ARRAY[true,true,false,false]::BOOLEAN[]),
      ('cliente_gr_criterio_resultado','ck_cliente_gr_criterio_resultado_resolver_codigo',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,''A''::varchar(100)),(2,''ACTIVIDAD_ECONOMICA''::varchar(100)),(3,''''::varchar(100)),(4,''minuscula''::varchar(100)),(5,''A-1''::varchar(100))) v(n,resolver_codigo)',ARRAY[true,true,false,false,false]::BOOLEAN[]),
      ('cliente_gr_criterio_resultado','ck_cliente_gr_criterio_resultado_evidencia_objeto',
       'SELECT pg_catalog.array_agg((%s) IS NOT FALSE ORDER BY n) FROM (VALUES (1,''{}''::jsonb),(2,''{"a":1}''::jsonb),(3,''[]''::jsonb),(4,''null''::jsonb)) v(n,evidencia)',ARRAY[true,true,false,false]::BOOLEAN[])
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
      ('cliente_gr_evaluacion','fk_cliente_gr_evaluacion_cliente_empresa',ARRAY['cliente_id','empresa_id']::TEXT[],'clientes',ARRAY['id','empresa_id']::TEXT[]),
      ('cliente_gr_evaluacion','fk_cliente_gr_evaluacion_matriz_empresa',ARRAY['matriz_version_id','empresa_id']::TEXT[],'matriz_empresa_version',ARRAY['id','empresa_id']::TEXT[]),
      ('cliente_gr_evaluacion','fk_cliente_gr_evaluacion_pt_cliente_empresa_matriz',ARRAY['pt_evaluacion_id','cliente_id','empresa_id','matriz_version_id']::TEXT[],'cliente_pt_evaluacion',ARRAY['id','cliente_id','empresa_id','matriz_version_id']::TEXT[]),
      ('cliente_gr_evaluacion','fk_cliente_gr_evaluacion_resultado_matriz_ambito',ARRAY['matriz_resultado_id','matriz_version_id','ambito']::TEXT[],'matriz_resultado',ARRAY['id','matriz_version_id','ambito']::TEXT[]),
      ('cliente_gr_evaluacion','fk_cliente_gr_evaluacion_creada_por',ARRAY['creada_por']::TEXT[],'usuarios',ARRAY['id']::TEXT[]),
      ('cliente_gr_criterio_resultado','fk_cliente_gr_criterio_resultado_evaluacion_matriz',ARRAY['evaluacion_id','matriz_version_id']::TEXT[],'cliente_gr_evaluacion',ARRAY['id','matriz_version_id']::TEXT[]),
      ('cliente_gr_criterio_resultado','fk_cliente_gr_criterio_resultado_criterio_matriz_ambito_orden',ARRAY['matriz_criterio_id','matriz_version_id','ambito','orden']::TEXT[],'matriz_criterio',ARRAY['id','matriz_version_id','ambito','orden']::TEXT[])
    ) AS x(tabla,nombre,columnas,tabla_ref,columnas_ref)
  LOOP
    SELECT ARRAY(
             SELECT a.attname::TEXT FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY k(attnum,ord)
             JOIN pg_catalog.pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum ORDER BY k.ord
           ), ARRAY(
             SELECT a.attname::TEXT FROM pg_catalog.unnest(c.confkey) WITH ORDINALITY k(attnum,ord)
             JOIN pg_catalog.pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.attnum ORDER BY k.ord
           )
      INTO actual_columns,referenced_columns
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class rt ON rt.oid=c.confrelid
      JOIN pg_catalog.pg_namespace rn ON rn.oid=rt.relnamespace
     WHERE c.conrelid=pg_catalog.to_regclass('public.' || expected.tabla)
       AND c.conname=expected.nombre AND c.contype='f' AND c.convalidated
       AND rn.nspname='public' AND rt.relname=expected.tabla_ref
       AND c.confdeltype='r'::"char";
    IF actual_columns IS DISTINCT FROM expected.columnas
       OR referenced_columns IS DISTINCT FROM expected.columnas_ref THEN
      RAISE EXCEPTION 'Rollback no aplicable: FK % incompatible',expected.nombre;
    END IF;
  END LOOP;

  FOR expected IN
    SELECT * FROM (VALUES
      ('cliente_gr_evaluacion','pk_cliente_gr_evaluacion','p'),
      ('cliente_gr_evaluacion','uq_cliente_gr_evaluacion_cliente_version','u'),
      ('cliente_gr_evaluacion','uq_cliente_gr_evaluacion_id_matriz','u'),
      ('cliente_gr_evaluacion','ck_cliente_gr_evaluacion_ambito','c'),
      ('cliente_gr_evaluacion','ck_cliente_gr_evaluacion_numero_version','c'),
      ('cliente_gr_evaluacion','ck_cliente_gr_evaluacion_puntaje_total','c'),
      ('cliente_gr_evaluacion','ck_cliente_gr_evaluacion_estado','c'),
      ('cliente_gr_criterio_resultado','pk_cliente_gr_criterio_resultado','p'),
      ('cliente_gr_criterio_resultado','uq_cliente_gr_criterio_resultado_evaluacion_criterio','u'),
      ('cliente_gr_criterio_resultado','ck_cliente_gr_criterio_resultado_ambito','c'),
      ('cliente_gr_criterio_resultado','ck_cliente_gr_criterio_resultado_puntaje','c'),
      ('cliente_gr_criterio_resultado','ck_cliente_gr_criterio_resultado_orden','c'),
      ('cliente_gr_criterio_resultado','ck_cliente_gr_criterio_resultado_resolver_codigo','c'),
      ('cliente_gr_criterio_resultado','ck_cliente_gr_criterio_resultado_evidencia_objeto','c')
    ) AS x(tabla,nombre,tipo)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
       WHERE c.conrelid=pg_catalog.to_regclass('public.' || expected.tabla)
         AND c.conname=expected.nombre AND c.contype=expected.tipo::"char"
         AND c.convalidated AND NOT c.condeferrable
    ) THEN
      RAISE EXCEPTION 'Rollback no aplicable: constraint % incompatible',expected.nombre;
    END IF;
  END LOOP;

  FOR expected IN
    SELECT * FROM (VALUES
      ('cliente_gr_evaluacion','pk_cliente_gr_evaluacion'),
      ('cliente_gr_evaluacion','uq_cliente_gr_evaluacion_cliente_version'),
      ('cliente_gr_evaluacion','uq_cliente_gr_evaluacion_id_matriz'),
      ('cliente_gr_evaluacion','idx_cliente_gr_evaluacion_empresa'),
      ('cliente_gr_evaluacion','idx_cliente_gr_evaluacion_matriz'),
      ('cliente_gr_evaluacion','idx_cliente_gr_evaluacion_pt'),
      ('cliente_gr_evaluacion','idx_cliente_gr_evaluacion_resultado'),
      ('cliente_gr_evaluacion','idx_cliente_gr_evaluacion_creada_por'),
      ('cliente_gr_criterio_resultado','pk_cliente_gr_criterio_resultado'),
      ('cliente_gr_criterio_resultado','uq_cliente_gr_criterio_resultado_evaluacion_criterio'),
      ('cliente_gr_criterio_resultado','idx_cliente_gr_criterio_resultado_criterio')
    ) AS x(tabla,nombre)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_index i
      JOIN pg_catalog.pg_class x ON x.oid=i.indexrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=x.relnamespace
       WHERE i.indrelid=pg_catalog.to_regclass('public.' || expected.tabla)
         AND n.nspname='public' AND x.relname=expected.nombre
         AND i.indisvalid AND i.indisready AND i.indislive
         AND i.indpred IS NULL AND i.indexprs IS NULL
    ) THEN
      RAISE EXCEPTION 'Rollback no aplicable: indice % incompatible',expected.nombre;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
     WHERE c.conrelid='public.cliente_pt_evaluacion'::pg_catalog.regclass
       AND c.conname='uq_cliente_pt_evaluacion_id_cliente_empresa_matriz_gr'
       AND c.contype='u' AND c.convalidated
       AND ARRAY(
         SELECT a.attname::TEXT
           FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY k(attnum,ord)
           JOIN pg_catalog.pg_attribute a
             ON a.attrelid=c.conrelid AND a.attnum=k.attnum
          ORDER BY k.ord
       ) = ARRAY['id','cliente_id','empresa_id','matriz_version_id']::TEXT[]
  ) THEN
    RAISE EXCEPTION 'Rollback no aplicable: falta auxiliar GR en cliente_pt_evaluacion';
  END IF;

  IF (SELECT pg_catalog.count(*) FROM pg_catalog.pg_attribute a
       WHERE a.attrelid='public.cliente_gr_evaluacion'::pg_catalog.regclass
         AND a.attnum>0 AND NOT a.attisdropped) <> 12
     OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_attribute a
       WHERE a.attrelid='public.cliente_gr_criterio_resultado'::pg_catalog.regclass
         AND a.attnum>0 AND NOT a.attisdropped) <> 10
     OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_constraint c
       WHERE c.conrelid='public.cliente_gr_evaluacion'::pg_catalog.regclass) <> 12
     OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_constraint c
       WHERE c.conrelid='public.cliente_gr_criterio_resultado'::pg_catalog.regclass) <> 9
     OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_index i
       WHERE i.indrelid='public.cliente_gr_evaluacion'::pg_catalog.regclass) <> 8
     OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_index i
       WHERE i.indrelid='public.cliente_gr_criterio_resultado'::pg_catalog.regclass) <> 3 THEN
    RAISE EXCEPTION 'Rollback no aplicable: estructura o cantidad de objetos incompatible';
  END IF;
END
$$;

DROP TABLE public.cliente_gr_criterio_resultado;
DROP TABLE public.cliente_gr_evaluacion;

ALTER TABLE public.cliente_pt_evaluacion
  DROP CONSTRAINT uq_cliente_pt_evaluacion_id_cliente_empresa_matriz_gr;

DELETE FROM public.schema_migrations
WHERE migration_key='20260817_010_cliente_gr_evaluacion_matriz';

COMMIT;
