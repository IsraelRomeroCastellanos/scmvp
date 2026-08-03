BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('20260801_002_matrices_pt_gr_empresa'));

DO $$
DECLARE
  esperado RECORD;
  real RECORD;
  filas BIGINT;
  expresion TEXT;
BEGIN
  IF current_schema() IS DISTINCT FROM 'public'
     OR pg_catalog.to_regclass('public.schema_migrations') IS NULL THEN
    RAISE EXCEPTION 'Rollback no aplicable: esquema o schema_migrations incompatible';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE migration_key = '20260801_002_matrices_pt_gr_empresa'
  ) THEN
    RAISE EXCEPTION 'Rollback no aplicable: falta la migration_key';
  END IF;

  FOR esperado IN SELECT pg_catalog.unnest(ARRAY[
    'matriz_empresa_version','matriz_criterio','matriz_opcion',
    'matriz_rango','matriz_regla','matriz_archivo_fuente'
  ]) AS tabla LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_class t JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public' AND t.relname = esperado.tabla
        AND t.relkind IN ('r','p')
    ) THEN
      RAISE EXCEPTION 'Rollback no aplicable: falta o es incompatible public.%', esperado.tabla;
    END IF;
  END LOOP;

  FOR esperado IN
    SELECT * FROM (VALUES
      ('matriz_empresa_version','id','integer','NO',NULL),('matriz_empresa_version','empresa_id','integer','NO',NULL),('matriz_empresa_version','numero_version','integer','NO',NULL),('matriz_empresa_version','estado_editorial','character varying(20)','NO','''BORRADOR''::character varying'),('matriz_empresa_version','activa','boolean','NO','false'),('matriz_empresa_version','creada_por','integer','NO',NULL),('matriz_empresa_version','validada_por','integer','YES',NULL),('matriz_empresa_version','publicada_por','integer','YES',NULL),('matriz_empresa_version','creada_en','timestamp with time zone','NO','now()'),('matriz_empresa_version','validada_en','timestamp with time zone','YES',NULL),('matriz_empresa_version','publicada_en','timestamp with time zone','YES',NULL),('matriz_empresa_version','reporte_validacion','jsonb','YES',NULL),('matriz_empresa_version','version_origen_id','integer','YES',NULL),('matriz_empresa_version','motivo_nueva_version','text','YES',NULL),
      ('matriz_criterio','id','integer','NO',NULL),('matriz_criterio','matriz_version_id','integer','NO',NULL),('matriz_criterio','codigo','character varying(100)','NO',NULL),('matriz_criterio','ambito','character varying(2)','NO',NULL),('matriz_criterio','texto','text','NO',NULL),('matriz_criterio','orden','integer','NO',NULL),('matriz_criterio','fuente_dato','character varying(100)','YES',NULL),('matriz_criterio','suma_perfil','boolean','NO','false'),('matriz_criterio','creado_en','timestamp with time zone','NO','now()'),
      ('matriz_opcion','id','integer','NO',NULL),('matriz_opcion','criterio_id','integer','NO',NULL),('matriz_opcion','codigo','character varying(100)','NO',NULL),('matriz_opcion','etiqueta','text','NO',NULL),('matriz_opcion','puntaje','numeric','YES',NULL),('matriz_opcion','orden','integer','NO',NULL),('matriz_opcion','referencia_origen','text','YES',NULL),('matriz_opcion','creado_en','timestamp with time zone','NO','now()'),
      ('matriz_rango','id','integer','NO',NULL),('matriz_rango','criterio_id','integer','NO',NULL),('matriz_rango','codigo','character varying(100)','NO',NULL),('matriz_rango','unidad','character varying(30)','NO',NULL),('matriz_rango','minimo','numeric','YES',NULL),('matriz_rango','maximo','numeric','YES',NULL),('matriz_rango','minimo_incluido','boolean','NO','true'),('matriz_rango','maximo_incluido','boolean','NO','true'),('matriz_rango','puntaje','numeric','YES',NULL),('matriz_rango','resultado_codigo','character varying(100)','YES',NULL),('matriz_rango','orden','integer','NO',NULL),('matriz_rango','referencia_origen','text','YES',NULL),('matriz_rango','creado_en','timestamp with time zone','NO','now()'),
      ('matriz_regla','id','integer','NO',NULL),('matriz_regla','matriz_version_id','integer','NO',NULL),('matriz_regla','criterio_id','integer','YES',NULL),('matriz_regla','codigo','character varying(100)','NO',NULL),('matriz_regla','marca_canonica','character varying(100)','YES',NULL),('matriz_regla','condicion_controlada','character varying(100)','YES',NULL),('matriz_regla','puntaje','numeric','YES',NULL),('matriz_regla','prioridad','integer','NO','0'),('matriz_regla','alto_automatico','boolean','NO','false'),('matriz_regla','causa_codigo','character varying(100)','YES',NULL),('matriz_regla','creado_en','timestamp with time zone','NO','now()'),
      ('matriz_archivo_fuente','id','integer','NO',NULL),('matriz_archivo_fuente','matriz_version_id','integer','NO',NULL),('matriz_archivo_fuente','nombre_original','text','NO',NULL),('matriz_archivo_fuente','mime_detectado','character varying(255)','NO',NULL),('matriz_archivo_fuente','tamano_bytes','bigint','NO',NULL),('matriz_archivo_fuente','sha256','character(64)','NO',NULL),('matriz_archivo_fuente','referencia_contenido','text','YES',NULL),('matriz_archivo_fuente','cargado_por','integer','NO',NULL),('matriz_archivo_fuente','cargado_en','timestamp with time zone','NO','now()')
    ) AS c(tabla,columna,tipo,nulable,defecto)
  LOOP
    SELECT pg_catalog.format_type(a.atttypid,a.atttypmod) AS tipo,
           CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS nulable,
           CASE WHEN esperado.columna='id' THEN NULL ELSE pg_catalog.pg_get_expr(d.adbin,d.adrelid) END AS defecto
      INTO real
      FROM pg_catalog.pg_namespace n
      JOIN pg_catalog.pg_class t ON t.relnamespace=n.oid AND t.relkind IN ('r','p')
      JOIN pg_catalog.pg_attribute a ON a.attrelid=t.oid AND a.attname=esperado.columna AND a.attnum>0 AND NOT a.attisdropped
      LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=t.oid AND d.adnum=a.attnum
     WHERE n.nspname='public' AND t.relname=esperado.tabla;
    IF NOT FOUND OR real.tipo IS DISTINCT FROM esperado.tipo OR real.nulable IS DISTINCT FROM esperado.nulable OR real.defecto IS DISTINCT FROM esperado.defecto THEN
      RAISE EXCEPTION 'Rollback no aplicable: columna public.%.% incompatible', esperado.tabla, esperado.columna;
    END IF;
  END LOOP;

  FOR esperado IN SELECT * FROM (VALUES
    ('matriz_empresa_version','matriz_empresa_version_id_seq'),('matriz_criterio','matriz_criterio_id_seq'),('matriz_opcion','matriz_opcion_id_seq'),('matriz_rango','matriz_rango_id_seq'),('matriz_regla','matriz_regla_id_seq'),('matriz_archivo_fuente','matriz_archivo_fuente_id_seq')
  ) AS s(tabla,secuencia) LOOP
    IF pg_catalog.pg_get_serial_sequence(pg_catalog.format('public.%I',esperado.tabla),'id') IS DISTINCT FROM pg_catalog.format('public.%I',esperado.secuencia)
       OR NOT EXISTS (
         SELECT 1 FROM pg_catalog.pg_class seq
         JOIN pg_catalog.pg_namespace sn ON sn.oid=seq.relnamespace
         JOIN pg_catalog.pg_depend dep ON dep.classid='pg_catalog.pg_class'::pg_catalog.regclass AND dep.objid=seq.oid AND dep.objsubid=0 AND dep.deptype='a'
         JOIN pg_catalog.pg_class tab ON tab.oid=dep.refobjid
         JOIN pg_catalog.pg_namespace tn ON tn.oid=tab.relnamespace
         JOIN pg_catalog.pg_attribute a ON a.attrelid=tab.oid AND a.attnum=dep.refobjsubid
         JOIN pg_catalog.pg_attrdef d ON d.adrelid=tab.oid AND d.adnum=a.attnum
         CROSS JOIN LATERAL (SELECT pg_catalog.pg_get_expr(d.adbin,d.adrelid) AS expresion) defecto
         JOIN pg_catalog.pg_depend dd ON dd.classid='pg_catalog.pg_attrdef'::pg_catalog.regclass AND dd.objid=d.oid AND dd.refclassid='pg_catalog.pg_class'::pg_catalog.regclass AND dd.refobjid=seq.oid
         WHERE sn.nspname='public' AND seq.relname=esperado.secuencia AND seq.relkind='S' AND tn.nspname='public' AND tab.relname=esperado.tabla AND a.attname='id'
           AND defecto.expresion ~ '^nextval\(''[^'']+''::regclass\)$'
           AND pg_catalog.to_regclass(pg_catalog.substring(defecto.expresion, '^nextval\(''([^'']+)''::regclass\)$'))
               IS NOT DISTINCT FROM pg_catalog.to_regclass(pg_catalog.format('public.%I',esperado.secuencia))
       ) THEN RAISE EXCEPTION 'Rollback no aplicable: secuencia SERIAL de public.%.id incompatible', esperado.tabla;
    END IF;
  END LOOP;

  FOR esperado IN
    SELECT * FROM (VALUES
      ('matriz_empresa_version','pk_matriz_empresa_version','p'),
      ('matriz_criterio','pk_matriz_criterio','p'),('matriz_opcion','pk_matriz_opcion','p'),
      ('matriz_rango','pk_matriz_rango','p'),('matriz_regla','pk_matriz_regla','p'),
      ('matriz_archivo_fuente','pk_matriz_archivo_fuente','p'),
      ('matriz_empresa_version','fk_matriz_empresa_version_empresa','f'),
      ('matriz_empresa_version','fk_matriz_empresa_version_creada_por','f'),
      ('matriz_empresa_version','fk_matriz_empresa_version_validada_por','f'),
      ('matriz_empresa_version','fk_matriz_empresa_version_publicada_por','f'),
      ('matriz_empresa_version','fk_matriz_empresa_version_origen','f'),
      ('matriz_criterio','fk_matriz_criterio_version','f'),
      ('matriz_opcion','fk_matriz_opcion_criterio','f'),
      ('matriz_rango','fk_matriz_rango_criterio','f'),
      ('matriz_regla','fk_matriz_regla_version','f'),
      ('matriz_regla','fk_matriz_regla_criterio_version','f'),
      ('matriz_archivo_fuente','fk_matriz_archivo_fuente_version','f'),
      ('matriz_archivo_fuente','fk_matriz_archivo_fuente_cargado_por','f'),
      ('matriz_empresa_version','uq_matriz_empresa_version_empresa_numero','u'),
      ('matriz_criterio','uq_matriz_criterio_version_codigo','u'),
      ('matriz_criterio','uq_matriz_criterio_version_ambito_orden','u'),
      ('matriz_criterio','uq_matriz_criterio_id_version','u'),
      ('matriz_opcion','uq_matriz_opcion_criterio_codigo','u'),
      ('matriz_opcion','uq_matriz_opcion_criterio_orden','u'),
      ('matriz_rango','uq_matriz_rango_criterio_codigo','u'),
      ('matriz_rango','uq_matriz_rango_criterio_orden','u'),
      ('matriz_regla','uq_matriz_regla_version_codigo','u'),
      ('matriz_archivo_fuente','uq_matriz_archivo_fuente_version','u'),
      ('matriz_empresa_version','ck_matriz_empresa_version_numero','c'),
      ('matriz_empresa_version','ck_matriz_empresa_version_estado','c'),
      ('matriz_empresa_version','ck_matriz_empresa_version_activa_publicada','c'),
      ('matriz_empresa_version','ck_matriz_empresa_version_origen_distinto','c'),
      ('matriz_criterio','ck_matriz_criterio_ambito','c'),
      ('matriz_criterio','ck_matriz_criterio_orden','c'),
      ('matriz_opcion','ck_matriz_opcion_orden','c'),
      ('matriz_rango','ck_matriz_rango_unidad','c'),
      ('matriz_rango','ck_matriz_rango_limites','c'),
      ('matriz_rango','ck_matriz_rango_orden','c'),
      ('matriz_regla','ck_matriz_regla_condicion','c'),
      ('matriz_regla','ck_matriz_regla_prioridad','c'),
      ('matriz_archivo_fuente','ck_matriz_archivo_fuente_tamano','c'),
      ('matriz_archivo_fuente','ck_matriz_archivo_fuente_sha256','c')
    ) AS c(tabla,nombre,tipo)
  LOOP
    SELECT c.contype AS contype,
           ARRAY(SELECT a.attname::text FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY k(attnum,ord) JOIN pg_catalog.pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum ORDER BY k.ord) AS columnas,
           rn.nspname AS esquema_ref, rt.relname AS tabla_ref,
           ARRAY(SELECT a.attname::text FROM pg_catalog.unnest(c.confkey) WITH ORDINALITY k(attnum,ord) JOIN pg_catalog.pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.attnum ORDER BY k.ord) AS columnas_ref,
           c.confdeltype AS confdeltype, c.confupdtype AS confupdtype,
           c.confmatchtype AS confmatchtype,
           pg_catalog.pg_get_constraintdef(c.oid,true) AS definicion
      INTO real
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      LEFT JOIN pg_catalog.pg_class rt ON rt.oid=c.confrelid
      LEFT JOIN pg_catalog.pg_namespace rn ON rn.oid=rt.relnamespace
     WHERE n.nspname='public' AND t.relname=esperado.tabla AND c.conname=esperado.nombre;
    expresion := pg_catalog.lower(pg_catalog.regexp_replace(real.definicion,'[[:space:]]+','','g'));
    IF NOT FOUND OR real.contype IS DISTINCT FROM esperado.tipo::"char"
       OR (esperado.tipo IN ('p','u','f') AND real.columnas IS DISTINCT FROM CASE esperado.nombre
         WHEN 'pk_matriz_empresa_version' THEN ARRAY['id'] WHEN 'pk_matriz_criterio' THEN ARRAY['id'] WHEN 'pk_matriz_opcion' THEN ARRAY['id'] WHEN 'pk_matriz_rango' THEN ARRAY['id'] WHEN 'pk_matriz_regla' THEN ARRAY['id'] WHEN 'pk_matriz_archivo_fuente' THEN ARRAY['id']
         WHEN 'fk_matriz_empresa_version_empresa' THEN ARRAY['empresa_id'] WHEN 'fk_matriz_empresa_version_creada_por' THEN ARRAY['creada_por'] WHEN 'fk_matriz_empresa_version_validada_por' THEN ARRAY['validada_por'] WHEN 'fk_matriz_empresa_version_publicada_por' THEN ARRAY['publicada_por'] WHEN 'fk_matriz_empresa_version_origen' THEN ARRAY['version_origen_id']
         WHEN 'fk_matriz_criterio_version' THEN ARRAY['matriz_version_id'] WHEN 'fk_matriz_opcion_criterio' THEN ARRAY['criterio_id'] WHEN 'fk_matriz_rango_criterio' THEN ARRAY['criterio_id'] WHEN 'fk_matriz_regla_version' THEN ARRAY['matriz_version_id'] WHEN 'fk_matriz_regla_criterio_version' THEN ARRAY['criterio_id','matriz_version_id'] WHEN 'fk_matriz_archivo_fuente_version' THEN ARRAY['matriz_version_id'] WHEN 'fk_matriz_archivo_fuente_cargado_por' THEN ARRAY['cargado_por']
         WHEN 'uq_matriz_empresa_version_empresa_numero' THEN ARRAY['empresa_id','numero_version'] WHEN 'uq_matriz_criterio_version_codigo' THEN ARRAY['matriz_version_id','codigo'] WHEN 'uq_matriz_criterio_version_ambito_orden' THEN ARRAY['matriz_version_id','ambito','orden'] WHEN 'uq_matriz_criterio_id_version' THEN ARRAY['id','matriz_version_id'] WHEN 'uq_matriz_opcion_criterio_codigo' THEN ARRAY['criterio_id','codigo'] WHEN 'uq_matriz_opcion_criterio_orden' THEN ARRAY['criterio_id','orden'] WHEN 'uq_matriz_rango_criterio_codigo' THEN ARRAY['criterio_id','codigo'] WHEN 'uq_matriz_rango_criterio_orden' THEN ARRAY['criterio_id','orden'] WHEN 'uq_matriz_regla_version_codigo' THEN ARRAY['matriz_version_id','codigo'] WHEN 'uq_matriz_archivo_fuente_version' THEN ARRAY['matriz_version_id'] END)
       OR (esperado.tipo='f' AND (real.esquema_ref IS DISTINCT FROM 'public'
         OR real.tabla_ref IS DISTINCT FROM CASE esperado.nombre WHEN 'fk_matriz_empresa_version_empresa' THEN 'empresas' WHEN 'fk_matriz_empresa_version_creada_por' THEN 'usuarios' WHEN 'fk_matriz_empresa_version_validada_por' THEN 'usuarios' WHEN 'fk_matriz_empresa_version_publicada_por' THEN 'usuarios' WHEN 'fk_matriz_empresa_version_origen' THEN 'matriz_empresa_version' WHEN 'fk_matriz_criterio_version' THEN 'matriz_empresa_version' WHEN 'fk_matriz_opcion_criterio' THEN 'matriz_criterio' WHEN 'fk_matriz_rango_criterio' THEN 'matriz_criterio' WHEN 'fk_matriz_regla_version' THEN 'matriz_empresa_version' WHEN 'fk_matriz_regla_criterio_version' THEN 'matriz_criterio' WHEN 'fk_matriz_archivo_fuente_version' THEN 'matriz_empresa_version' WHEN 'fk_matriz_archivo_fuente_cargado_por' THEN 'usuarios' END
         OR real.columnas_ref IS DISTINCT FROM CASE esperado.nombre WHEN 'fk_matriz_regla_criterio_version' THEN ARRAY['id','matriz_version_id'] ELSE ARRAY['id'] END
         OR real.confdeltype IS DISTINCT FROM CASE WHEN esperado.nombre IN ('fk_matriz_criterio_version','fk_matriz_opcion_criterio','fk_matriz_rango_criterio','fk_matriz_regla_version','fk_matriz_regla_criterio_version') THEN 'c'::"char" ELSE 'r'::"char" END
         OR real.confupdtype IS DISTINCT FROM 'a'::"char"
         OR real.confmatchtype IS DISTINCT FROM 's'::"char"))
       OR (esperado.tipo='c' AND expresion IS DISTINCT FROM pg_catalog.lower(pg_catalog.regexp_replace(CASE esperado.nombre
         WHEN 'ck_matriz_empresa_version_numero' THEN 'CHECK (numero_version > 0)'
         WHEN 'ck_matriz_empresa_version_estado' THEN 'CHECK (estado_editorial::text = ANY (ARRAY[''BORRADOR''::character varying, ''VALIDADA''::character varying, ''PUBLICADA''::character varying]::text[]))'
         WHEN 'ck_matriz_empresa_version_activa_publicada' THEN 'CHECK (NOT activa OR estado_editorial::text = ''PUBLICADA''::text)'
         WHEN 'ck_matriz_empresa_version_origen_distinto' THEN 'CHECK (version_origen_id IS NULL OR version_origen_id <> id)'
         WHEN 'ck_matriz_criterio_ambito' THEN 'CHECK (ambito::text = ANY (ARRAY[''PT''::character varying, ''GR''::character varying]::text[]))'
         WHEN 'ck_matriz_criterio_orden' THEN 'CHECK (orden > 0)' WHEN 'ck_matriz_opcion_orden' THEN 'CHECK (orden > 0)'
         WHEN 'ck_matriz_rango_unidad' THEN 'CHECK (unidad::text = ANY (ARRAY[''EDAD_ANIOS''::character varying, ''ANTIGUEDAD_MESES''::character varying, ''MONTO''::character varying, ''PUNTAJE''::character varying, ''OTRA''::character varying]::text[]))'
         WHEN 'ck_matriz_rango_limites' THEN 'CHECK (minimo IS NULL OR maximo IS NULL OR minimo <= maximo)' WHEN 'ck_matriz_rango_orden' THEN 'CHECK (orden > 0)'
         WHEN 'ck_matriz_regla_condicion' THEN 'CHECK (marca_canonica IS NOT NULL OR condicion_controlada IS NOT NULL)' WHEN 'ck_matriz_regla_prioridad' THEN 'CHECK (prioridad >= 0)'
         WHEN 'ck_matriz_archivo_fuente_tamano' THEN 'CHECK (tamano_bytes > 0)' WHEN 'ck_matriz_archivo_fuente_sha256' THEN 'CHECK (sha256 ~ ''^[0-9a-f]{64}$''::text)' END,'[[:space:]]+','','g'))) THEN
      RAISE EXCEPTION 'Rollback no aplicable: constraint %.% faltante o incompatible', esperado.tabla, esperado.nombre;
    END IF;
  END LOOP;

  FOR esperado IN
    SELECT * FROM (VALUES
      ('matriz_empresa_version','uq_matriz_empresa_version_activa_empresa',ARRAY['empresa_id'],true,true),
      ('matriz_empresa_version','idx_matriz_empresa_version_estado',ARRAY['empresa_id','estado_editorial'],false,false),
      ('matriz_empresa_version','idx_matriz_empresa_version_origen',ARRAY['version_origen_id'],false,false),
      ('matriz_empresa_version','idx_matriz_empresa_version_creada_por',ARRAY['creada_por'],false,false),
      ('matriz_empresa_version','idx_matriz_empresa_version_validada_por',ARRAY['validada_por'],false,false),
      ('matriz_empresa_version','idx_matriz_empresa_version_publicada_por',ARRAY['publicada_por'],false,false),
      ('matriz_criterio','idx_matriz_criterio_version',ARRAY['matriz_version_id'],false,false),
      ('matriz_opcion','idx_matriz_opcion_criterio',ARRAY['criterio_id'],false,false),
      ('matriz_rango','idx_matriz_rango_criterio',ARRAY['criterio_id'],false,false),
      ('matriz_regla','idx_matriz_regla_version',ARRAY['matriz_version_id'],false,false),
      ('matriz_regla','idx_matriz_regla_criterio',ARRAY['criterio_id'],false,false),
      ('matriz_archivo_fuente','idx_matriz_archivo_fuente_cargado_por',ARRAY['cargado_por'],false,false)
    ) AS i(tabla,nombre,columnas,unico,parcial)
  LOOP
    SELECT i.indisunique AS unico, i.indpred IS NOT NULL AS parcial,
           array_agg(a.attname::text ORDER BY k.ord) FILTER (WHERE k.ord <= i.indnkeyatts) AS columnas,
           pg_catalog.pg_get_expr(i.indpred, i.indrelid, true) AS predicado
      INTO real
      FROM pg_catalog.pg_namespace n JOIN pg_catalog.pg_class t ON t.relnamespace=n.oid
      JOIN pg_catalog.pg_index i ON i.indrelid=t.oid
      JOIN pg_catalog.pg_class x ON x.oid=i.indexrelid AND x.relnamespace=n.oid AND x.relname=esperado.nombre
      JOIN LATERAL pg_catalog.unnest(i.indkey) WITH ORDINALITY k(attnum,ord) ON true
      LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.attnum
     WHERE n.nspname='public' AND t.relname=esperado.tabla
     GROUP BY i.indisunique,i.indpred,i.indrelid;
    IF NOT FOUND OR real.columnas IS DISTINCT FROM esperado.columnas
       OR real.unico IS DISTINCT FROM esperado.unico
       OR real.parcial IS DISTINCT FROM esperado.parcial THEN
      RAISE EXCEPTION 'Rollback no aplicable: índice %.% faltante o incompatible', esperado.tabla, esperado.nombre;
    END IF;
    IF esperado.nombre = 'uq_matriz_empresa_version_activa_empresa'
       AND pg_catalog.lower(pg_catalog.regexp_replace(real.predicado, '[[:space:]()]', '', 'g'))
           NOT IN ('activa', 'activa=true', 'true=activa') THEN
      RAISE EXCEPTION 'Rollback no aplicable: predicado incompatible de %.%', esperado.tabla, esperado.nombre;
    END IF;
  END LOOP;

  FOR esperado IN SELECT pg_catalog.unnest(ARRAY[
    'matriz_empresa_version','matriz_criterio','matriz_opcion',
    'matriz_rango','matriz_regla','matriz_archivo_fuente'
  ]) AS tabla LOOP
    EXECUTE pg_catalog.format('SELECT COUNT(*) FROM public.%I', esperado.tabla) INTO filas;
    IF filas <> 0 THEN
      RAISE EXCEPTION 'Rollback bloqueado: public.% contiene % filas', esperado.tabla, filas;
    END IF;
  END LOOP;
END
$$;

DROP TABLE public.matriz_archivo_fuente;
DROP TABLE public.matriz_regla;
DROP TABLE public.matriz_rango;
DROP TABLE public.matriz_opcion;
DROP TABLE public.matriz_criterio;
DROP TABLE public.matriz_empresa_version;

DELETE FROM public.schema_migrations
WHERE migration_key = '20260801_002_matrices_pt_gr_empresa';

COMMIT;
