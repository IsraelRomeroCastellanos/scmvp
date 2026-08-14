BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtext('20260810_004_resultados_globales_matriz')
);

DO $$
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public'
     OR pg_catalog.to_regclass('public.schema_migrations') IS NULL
     OR pg_catalog.to_regclass('public.matriz_resultado') IS NULL THEN
    RAISE EXCEPTION 'Rollback no aplicable: esquema u objetos requeridos incompatibles';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.schema_migrations
                  WHERE migration_key='20260728_001_modelo_integral_actividades_vulnerables')
     OR NOT EXISTS (SELECT 1 FROM public.schema_migrations
                  WHERE migration_key='20260801_002_matrices_pt_gr_empresa')
     OR NOT EXISTS (SELECT 1 FROM public.schema_migrations
                  WHERE migration_key='20260805_003_gestion_matrices_empresa')
     OR NOT EXISTS (SELECT 1 FROM public.schema_migrations
                  WHERE migration_key='20260810_004_resultados_globales_matriz') THEN
    RAISE EXCEPTION 'Rollback no aplicable: faltan migration keys 001/002/003/004';
  END IF;

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
    RAISE EXCEPTION 'Rollback no aplicable: public.schema_migrations es incompatible';
  END IF;
END
$$;

LOCK TABLE public.matriz_resultado IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
  esperado RECORD;
  real RECORD;
BEGIN
  FOR esperado IN SELECT * FROM (VALUES
    ('id','integer','NO',NULL), ('matriz_version_id','integer','NO',NULL),
    ('codigo','character varying(100)','NO',NULL), ('ambito','character varying(2)','NO',NULL),
    ('orden','integer','NO',NULL), ('nombre_empresarial','character varying(150)','NO',NULL),
    ('minimo','integer','NO',NULL), ('maximo','integer','NO',NULL),
    ('minimo_incluido','boolean','NO','true'), ('maximo_incluido','boolean','NO','true'),
    ('referencia_nombre_origen','text','NO',NULL), ('referencia_rango_origen','text','NO',NULL),
    ('creado_en','timestamp with time zone','NO','now()')
  ) AS c(columna,tipo,nulable,defecto) LOOP
    SELECT pg_catalog.format_type(a.atttypid,a.atttypmod) AS tipo,
      CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS nulable,
      CASE WHEN esperado.columna='id' THEN NULL ELSE pg_catalog.pg_get_expr(d.adbin,d.adrelid) END AS defecto
      INTO real
      FROM pg_catalog.pg_namespace n
      JOIN pg_catalog.pg_class t ON t.relnamespace=n.oid AND t.relkind IN ('r','p')
      JOIN pg_catalog.pg_attribute a ON a.attrelid=t.oid AND a.attname=esperado.columna
        AND a.attnum>0 AND NOT a.attisdropped
      LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=t.oid AND d.adnum=a.attnum
     WHERE n.nspname='public' AND t.relname='matriz_resultado';
    IF NOT FOUND OR real.tipo IS DISTINCT FROM esperado.tipo OR real.nulable IS DISTINCT FROM esperado.nulable
       OR real.defecto IS DISTINCT FROM esperado.defecto THEN
      RAISE EXCEPTION 'Rollback no aplicable: columna public.matriz_resultado.% incompatible', esperado.columna;
    END IF;
  END LOOP;

  IF (SELECT pg_catalog.count(*) FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class t ON t.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public' AND t.relname='matriz_resultado' AND a.attnum>0 AND NOT a.attisdropped) <> 13 THEN
    RAISE EXCEPTION 'Rollback no aplicable: public.matriz_resultado tiene columnas inesperadas';
  END IF;

  IF pg_catalog.to_regclass(pg_catalog.pg_get_serial_sequence('public.matriz_resultado','id'))
       IS DISTINCT FROM pg_catalog.to_regclass('public.matriz_resultado_id_seq')
     OR NOT EXISTS (
       SELECT 1
         FROM pg_catalog.pg_class seq
         JOIN pg_catalog.pg_namespace sn ON sn.oid=seq.relnamespace
         JOIN pg_catalog.pg_sequence ps ON ps.seqrelid=seq.oid
           AND ps.seqtypid='pg_catalog.int4'::pg_catalog.regtype
         JOIN pg_catalog.pg_depend dep
           ON dep.classid='pg_catalog.pg_class'::pg_catalog.regclass
          AND dep.objid=seq.oid AND dep.objsubid=0 AND dep.deptype='a'
         JOIN pg_catalog.pg_class tab ON tab.oid=dep.refobjid
         JOIN pg_catalog.pg_namespace tn ON tn.oid=tab.relnamespace
         JOIN pg_catalog.pg_attribute a ON a.attrelid=tab.oid AND a.attnum=dep.refobjsubid
         JOIN pg_catalog.pg_attrdef d ON d.adrelid=tab.oid AND d.adnum=a.attnum
         JOIN pg_catalog.pg_depend dd
           ON dd.classid='pg_catalog.pg_attrdef'::pg_catalog.regclass AND dd.objid=d.oid
          AND dd.refclassid='pg_catalog.pg_class'::pg_catalog.regclass AND dd.refobjid=seq.oid
        WHERE sn.nspname='public' AND seq.relname='matriz_resultado_id_seq' AND seq.relkind='S'
          AND tn.nspname='public' AND tab.relname='matriz_resultado'
          AND a.attname='id' AND a.atttypid='pg_catalog.int4'::pg_catalog.regtype AND a.attnotnull
          AND pg_catalog.pg_get_expr(d.adbin,d.adrelid) ~ '^nextval\(''[^'']+''::regclass\)$'
          AND pg_catalog.to_regclass(pg_catalog.substring(
                pg_catalog.pg_get_expr(d.adbin,d.adrelid), '^nextval\(''([^'']+)''::regclass\)$'
              )) IS NOT DISTINCT FROM seq.oid
     ) THEN
    RAISE EXCEPTION 'Rollback no aplicable: SERIAL public.matriz_resultado.id incompatible';
  END IF;

  FOR esperado IN SELECT * FROM (VALUES
    ('pk_matriz_resultado','p',ARRAY['id'],NULL,NULL,NULL),
    ('fk_matriz_resultado_version','f',ARRAY['matriz_version_id'],'matriz_empresa_version',ARRAY['id'],'c'),
    ('uq_matriz_resultado_version_codigo','u',ARRAY['matriz_version_id','codigo'],NULL,NULL,NULL),
    ('uq_matriz_resultado_version_ambito_orden','u',ARRAY['matriz_version_id','ambito','orden'],NULL,NULL,NULL)
  ) AS c(nombre,tipo,columnas,tabla_ref,columnas_ref,accion) LOOP
    SELECT c.contype AS tipo,
      ARRAY(SELECT a.attname::TEXT FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY k(attnum,ord)
        JOIN pg_catalog.pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum ORDER BY k.ord) AS columnas,
      rn.nspname AS esquema_ref, rt.relname AS tabla_ref,
      ARRAY(SELECT a.attname::TEXT FROM pg_catalog.unnest(c.confkey) WITH ORDINALITY k(attnum,ord)
        JOIN pg_catalog.pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.attnum ORDER BY k.ord) AS columnas_ref,
      c.confdeltype AS accion_borrado, c.confupdtype AS accion_actualizacion,
      c.confmatchtype AS tipo_match, c.convalidated AS validada,
      c.condeferrable AS diferible, c.condeferred AS diferida INTO real
      FROM pg_catalog.pg_constraint c JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      LEFT JOIN pg_catalog.pg_class rt ON rt.oid=c.confrelid LEFT JOIN pg_catalog.pg_namespace rn ON rn.oid=rt.relnamespace
     WHERE n.nspname='public' AND t.relname='matriz_resultado' AND c.conname=esperado.nombre;
    IF NOT FOUND OR real.tipo IS DISTINCT FROM esperado.tipo::"char" OR real.columnas IS DISTINCT FROM esperado.columnas
       OR NOT real.validada OR real.diferible OR real.diferida
       OR (esperado.tipo='f' AND (real.esquema_ref IS DISTINCT FROM 'public' OR real.tabla_ref IS DISTINCT FROM esperado.tabla_ref
         OR real.columnas_ref IS DISTINCT FROM esperado.columnas_ref OR real.accion_borrado IS DISTINCT FROM esperado.accion::"char"
         OR real.accion_actualizacion IS DISTINCT FROM 'a'::"char" OR real.tipo_match IS DISTINCT FROM 's'::"char")) THEN
      RAISE EXCEPTION 'Rollback no aplicable: constraint public.matriz_resultado.% incompatible', esperado.nombre;
    END IF;
  END LOOP;

  FOR esperado IN SELECT * FROM (VALUES
    ('ck_matriz_resultado_ambito','CHECK (ambito::text = ANY (ARRAY[''PT''::character varying, ''GR''::character varying]::text[]))'),
    ('ck_matriz_resultado_orden','CHECK (orden >= 1 AND orden <= 3)'),
    ('ck_matriz_resultado_minimo','CHECK (minimo >= 4 AND minimo <= 12)'),
    ('ck_matriz_resultado_maximo','CHECK (maximo >= 4 AND maximo <= 12)'),
    ('ck_matriz_resultado_limites','CHECK (minimo <= maximo)'),
    ('ck_matriz_resultado_minimo_incluido','CHECK (minimo_incluido = true)'),
    ('ck_matriz_resultado_maximo_incluido','CHECK (maximo_incluido = true)'),
    ('ck_matriz_resultado_nombre','CHECK (length(nombre_empresarial::text) >= 1 AND length(nombre_empresarial::text) <= 150)'),
    ('ck_matriz_resultado_codigo','CHECK (length(codigo::text) >= 1 AND length(codigo::text) <= 100)'),
    ('ck_matriz_resultado_referencia_nombre','CHECK (length(referencia_nombre_origen) >= 1)'),
    ('ck_matriz_resultado_referencia_rango','CHECK (length(referencia_rango_origen) >= 1)')
  ) AS x(nombre,definicion) LOOP
    SELECT pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.pg_get_constraintdef(c.oid,true),'[[:space:]]+','','g')) AS definicion
      INTO real FROM pg_catalog.pg_constraint c JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
     WHERE n.nspname='public' AND t.relname='matriz_resultado' AND c.conname=esperado.nombre
       AND c.contype='c' AND c.convalidated;
    IF NOT FOUND OR real.definicion IS DISTINCT FROM pg_catalog.lower(
       pg_catalog.regexp_replace(esperado.definicion,'[[:space:]]+','','g')) THEN
      RAISE EXCEPTION 'Rollback no aplicable: CHECK public.matriz_resultado.% incompatible', esperado.nombre;
    END IF;
  END LOOP;

  FOR esperado IN SELECT * FROM (VALUES
    ('pk_matriz_resultado',ARRAY['id'],true),
    ('uq_matriz_resultado_version_codigo',ARRAY['matriz_version_id','codigo'],false),
    ('uq_matriz_resultado_version_ambito_orden',ARRAY['matriz_version_id','ambito','orden'],false)
  ) AS i(nombre,columnas,primario) LOOP
    SELECT i.indisunique AS unico, i.indisprimary AS primario,
      i.indisvalid AS valido, i.indisready AS listo, i.indpred IS NULL AS no_parcial,
      i.indexprs IS NULL AS sin_expresiones, i.indnatts=i.indnkeyatts AS sin_include,
      am.amname AS metodo,
      NOT COALESCE((pg_catalog.to_jsonb(i)->>'indnullsnotdistinct')::boolean,false) AS nulls_distinct,
      pg_catalog.bool_and(k.opcion=0) AS orden_normal,
      pg_catalog.bool_and(k.collation_oid=a.attcollation) AS collations_normales,
      pg_catalog.bool_and(opc.opcdefault AND opc.opcmethod=am.oid) AS opclasses_normales,
      pg_catalog.array_agg(a.attname::TEXT ORDER BY k.ord) FILTER (WHERE k.ord<=i.indnkeyatts) AS columnas,
      c.conname AS constraint_nombre
      INTO real
      FROM pg_catalog.pg_index i
      JOIN pg_catalog.pg_class t ON t.oid=i.indrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      JOIN pg_catalog.pg_class x ON x.oid=i.indexrelid AND x.relnamespace=n.oid
      JOIN pg_catalog.pg_am am ON am.oid=x.relam
      LEFT JOIN pg_catalog.pg_constraint c ON c.conindid=i.indexrelid AND c.conrelid=i.indrelid
      JOIN LATERAL pg_catalog.unnest(i.indkey,i.indcollation,i.indclass,i.indoption)
        WITH ORDINALITY k(attnum,collation_oid,opclass_oid,opcion,ord) ON true
      LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.attnum
      LEFT JOIN pg_catalog.pg_opclass opc ON opc.oid=k.opclass_oid
     WHERE n.nspname='public' AND t.relname='matriz_resultado' AND x.relname=esperado.nombre
     GROUP BY i.indexrelid,i.indisunique,i.indisprimary,i.indisvalid,i.indisready,
       i.indpred,i.indexprs,i.indnatts,i.indnkeyatts,am.amname,c.conname;
    IF NOT FOUND OR NOT real.unico OR real.primario IS DISTINCT FROM esperado.primario
       OR NOT real.valido OR NOT real.listo OR NOT real.no_parcial
       OR NOT real.sin_expresiones OR NOT real.sin_include
       OR real.metodo IS DISTINCT FROM 'btree' OR NOT real.nulls_distinct
       OR NOT real.orden_normal OR NOT real.collations_normales OR NOT real.opclasses_normales
       OR real.columnas IS DISTINCT FROM esperado.columnas
       OR real.constraint_nombre IS DISTINCT FROM esperado.nombre THEN
      RAISE EXCEPTION 'Rollback no aplicable: indice public.% incompatible', esperado.nombre;
    END IF;
  END LOOP;

  IF (SELECT pg_catalog.count(*) FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class t ON t.oid=c.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public' AND t.relname='matriz_resultado') <> 15
     OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_index i
         JOIN pg_catalog.pg_class t ON t.oid=i.indrelid JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
         WHERE n.nspname='public' AND t.relname='matriz_resultado') <> 3 THEN
    RAISE EXCEPTION 'Rollback no aplicable: constraints o indices inesperados';
  END IF;

  IF EXISTS (SELECT 1 FROM public.matriz_resultado) THEN
    RAISE EXCEPTION 'Rollback bloqueado: public.matriz_resultado contiene datos';
  END IF;
END
$$;

DROP TABLE public.matriz_resultado;

DELETE FROM public.schema_migrations
WHERE migration_key='20260810_004_resultados_globales_matriz';

COMMIT;
