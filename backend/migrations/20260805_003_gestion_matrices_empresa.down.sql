BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtext('20260805_003_gestion_matrices_empresa')
);

DO $$
DECLARE
  objeto TEXT;
  columna RECORD;
  esperado RECORD;
  real RECORD;
  resultado_predicado BOOLEAN[];
  predicado_valido BOOLEAN;
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public'
     OR pg_catalog.to_regclass('public.schema_migrations') IS NULL THEN
    RAISE EXCEPTION 'Rollback no aplicable: esquema o schema_migrations incompatible';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
     WHERE migration_key = '20260805_003_gestion_matrices_empresa'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
     WHERE migration_key = '20260801_002_matrices_pt_gr_empresa'
  ) THEN
    RAISE EXCEPTION 'Rollback no aplicable: faltan las migration keys 002/003';
  END IF;

  FOREACH objeto IN ARRAY ARRAY[
    'public.matriz_empresa_version', 'public.matriz_archivo_fuente',
    'public.matriz_auditoria_evento', 'public.matriz_idempotencia'
  ] LOOP
    IF pg_catalog.to_regclass(objeto) IS NULL THEN
      RAISE EXCEPTION 'Rollback no aplicable: falta %', objeto;
    END IF;
  END LOOP;

  FOR esperado IN SELECT * FROM (VALUES
    ('matriz_empresa_version','uq_matriz_empresa_version_id_empresa','u',ARRAY['id','empresa_id'],NULL,NULL,NULL),
    ('matriz_empresa_version','fk_matriz_empresa_version_origen_empresa','f',ARRAY['version_origen_id','version_origen_empresa_id'],'matriz_empresa_version',ARRAY['id','empresa_id'],'r'),
    ('matriz_empresa_version','fk_matriz_empresa_version_activada_por','f',ARRAY['activada_por'],'usuarios',ARRAY['id'],'r'),
    ('matriz_empresa_version','fk_matriz_empresa_version_desactivada_por','f',ARRAY['desactivada_por'],'usuarios',ARRAY['id'],'r'),
    ('matriz_auditoria_evento','pk_matriz_auditoria_evento','p',ARRAY['id'],NULL,NULL,NULL),
    ('matriz_auditoria_evento','fk_matriz_auditoria_evento_empresa','f',ARRAY['empresa_id'],'empresas',ARRAY['id'],'r'),
    ('matriz_auditoria_evento','fk_matriz_auditoria_evento_version','f',ARRAY['matriz_version_id','empresa_id'],'matriz_empresa_version',ARRAY['id','empresa_id'],'r'),
    ('matriz_auditoria_evento','fk_matriz_auditoria_evento_origen','f',ARRAY['version_origen_id','empresa_id'],'matriz_empresa_version',ARRAY['id','empresa_id'],'r'),
    ('matriz_auditoria_evento','fk_matriz_auditoria_evento_actor','f',ARRAY['actor_usuario_id'],'usuarios',ARRAY['id'],'r'),
    ('matriz_idempotencia','pk_matriz_idempotencia','p',ARRAY['id'],NULL,NULL,NULL),
    ('matriz_idempotencia','uq_matriz_idempotencia_ambito','u',ARRAY['empresa_id','actor_usuario_id','operacion','clave_sha256'],NULL,NULL,NULL),
    ('matriz_idempotencia','fk_matriz_idempotencia_empresa','f',ARRAY['empresa_id'],'empresas',ARRAY['id'],'r'),
    ('matriz_idempotencia','fk_matriz_idempotencia_actor','f',ARRAY['actor_usuario_id'],'usuarios',ARRAY['id'],'r'),
    ('matriz_idempotencia','fk_matriz_idempotencia_version','f',ARRAY['matriz_version_id','empresa_id'],'matriz_empresa_version',ARRAY['id','empresa_id'],'r')
  ) AS c(tabla,nombre,tipo,columnas,tabla_ref,columnas_ref,accion) LOOP
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
       OR (esperado.tipo='f' AND (real.esquema_ref IS DISTINCT FROM 'public'
         OR real.tabla_ref IS DISTINCT FROM esperado.tabla_ref
         OR real.columnas_ref IS DISTINCT FROM esperado.columnas_ref
         OR real.accion_borrado IS DISTINCT FROM esperado.accion::"char"
         OR real.accion_actualizacion IS DISTINCT FROM 'a'::"char"
         OR real.tipo_match IS DISTINCT FROM 's'::"char")) THEN
      RAISE EXCEPTION 'Rollback no aplicable: constraint public.%.% incompatible', esperado.tabla, esperado.nombre;
    END IF;
  END LOOP;

  FOR columna IN
    SELECT * FROM (VALUES
      ('matriz_empresa_version','revision','bigint','NO','1'),
      ('matriz_empresa_version','version_origen_empresa_id','integer','YES',NULL),
      ('matriz_empresa_version','motivo_nueva_version','character varying(500)','YES',NULL),
      ('matriz_empresa_version','activada_por','integer','YES',NULL),
      ('matriz_empresa_version','activada_en','timestamp with time zone','YES',NULL),
      ('matriz_empresa_version','desactivada_por','integer','YES',NULL),
      ('matriz_empresa_version','desactivada_en','timestamp with time zone','YES',NULL),
      ('matriz_archivo_fuente','nombre_original','character varying(255)','NO',NULL),
      ('matriz_archivo_fuente','mime_detectado','character varying(127)','NO',NULL),
      ('matriz_archivo_fuente','referencia_contenido','character varying(512)','YES',NULL),
      ('matriz_archivo_fuente','contenido','bytea','NO',NULL),
      ('matriz_auditoria_evento','id','bigint','NO',NULL),
      ('matriz_auditoria_evento','empresa_id','integer','NO',NULL),
      ('matriz_auditoria_evento','matriz_version_id','integer','YES',NULL),
      ('matriz_auditoria_evento','version_origen_id','integer','YES',NULL),
      ('matriz_auditoria_evento','actor_usuario_id','integer','NO',NULL),
      ('matriz_auditoria_evento','accion','character varying(40)','NO',NULL),
      ('matriz_auditoria_evento','operacion','character varying(40)','NO',NULL),
      ('matriz_auditoria_evento','estado_anterior','character varying(20)','YES',NULL),
      ('matriz_auditoria_evento','estado_nuevo','character varying(20)','YES',NULL),
      ('matriz_auditoria_evento','activa_anterior','boolean','YES',NULL),
      ('matriz_auditoria_evento','activa_nueva','boolean','YES',NULL),
      ('matriz_auditoria_evento','motivo','character varying(500)','YES',NULL),
      ('matriz_auditoria_evento','archivo_nombre_original','character varying(255)','YES',NULL),
      ('matriz_auditoria_evento','archivo_mime_detectado','character varying(127)','YES',NULL),
      ('matriz_auditoria_evento','archivo_tamano_bytes','bigint','YES',NULL),
      ('matriz_auditoria_evento','archivo_sha256','character(64)','YES',NULL),
      ('matriz_auditoria_evento','clave_idempotencia_sha256','character(64)','YES',NULL),
      ('matriz_auditoria_evento','correlation_id','character varying(128)','YES',NULL),
      ('matriz_auditoria_evento','request_id','character varying(128)','YES',NULL),
      ('matriz_auditoria_evento','resumen','jsonb','YES',NULL),
      ('matriz_auditoria_evento','creado_en','timestamp with time zone','NO','now()'),
      ('matriz_idempotencia','id','bigint','NO',NULL),
      ('matriz_idempotencia','empresa_id','integer','NO',NULL),
      ('matriz_idempotencia','actor_usuario_id','integer','NO',NULL),
      ('matriz_idempotencia','operacion','character varying(40)','NO',NULL),
      ('matriz_idempotencia','clave_sha256','character(64)','NO',NULL),
      ('matriz_idempotencia','request_sha256','character(64)','NO',NULL),
      ('matriz_idempotencia','estado_ejecucion','character varying(40)','NO',NULL),
      ('matriz_idempotencia','codigo_http','integer','YES',NULL),
      ('matriz_idempotencia','respuesta','jsonb','YES',NULL),
      ('matriz_idempotencia','matriz_version_id','integer','YES',NULL),
      ('matriz_idempotencia','creado_en','timestamp with time zone','NO','now()'),
      ('matriz_idempotencia','completado_en','timestamp with time zone','YES',NULL),
      ('matriz_idempotencia','expira_en','timestamp with time zone','NO','(now() + ''7 days''::interval)')
    ) AS v(tabla,nombre,tipo,nulable,defecto)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class t ON t.oid=a.attrelid AND t.relkind IN ('r','p')
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=t.oid AND d.adnum=a.attnum
      WHERE n.nspname='public' AND t.relname=columna.tabla
        AND a.attname=columna.nombre AND a.attnum>0 AND NOT a.attisdropped
        AND pg_catalog.format_type(a.atttypid,a.atttypmod)=columna.tipo
        AND (CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END)=columna.nulable
        AND pg_catalog.pg_get_expr(d.adbin,d.adrelid) IS NOT DISTINCT FROM columna.defecto
    ) THEN
      RAISE EXCEPTION 'Rollback no aplicable: columna public.%.% incompatible', columna.tabla, columna.nombre;
    END IF;
  END LOOP;

  FOR esperado IN SELECT * FROM (VALUES
    ('matriz_auditoria_evento','matriz_auditoria_evento_id_seq'),
    ('matriz_idempotencia','matriz_idempotencia_id_seq')
  ) AS s(tabla,secuencia) LOOP
    IF pg_catalog.to_regclass(pg_catalog.pg_get_serial_sequence(
         pg_catalog.format('public.%I',esperado.tabla),'id'))
         IS DISTINCT FROM pg_catalog.to_regclass(pg_catalog.format('public.%I',esperado.secuencia))
       OR NOT EXISTS (
         SELECT 1 FROM pg_catalog.pg_class seq
         JOIN pg_catalog.pg_namespace sn ON sn.oid=seq.relnamespace
         JOIN pg_catalog.pg_sequence ps ON ps.seqrelid=seq.oid AND ps.seqtypid='bigint'::pg_catalog.regtype
         JOIN pg_catalog.pg_depend d ON d.classid='pg_catalog.pg_class'::pg_catalog.regclass
           AND d.objid=seq.oid AND d.objsubid=0 AND d.deptype='a'
         JOIN pg_catalog.pg_class t ON t.oid=d.refobjid
         JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
         JOIN pg_catalog.pg_attribute a ON a.attrelid=t.oid AND a.attnum=d.refobjsubid
         JOIN pg_catalog.pg_attrdef ad ON ad.adrelid=t.oid AND ad.adnum=a.attnum
         CROSS JOIN LATERAL (
           SELECT pg_catalog.pg_get_expr(ad.adbin,ad.adrelid) AS expresion
         ) defecto
         JOIN pg_catalog.pg_depend dd ON dd.classid='pg_catalog.pg_attrdef'::pg_catalog.regclass
           AND dd.objid=ad.oid AND dd.refclassid='pg_catalog.pg_class'::pg_catalog.regclass
           AND dd.refobjid=seq.oid
        WHERE sn.nspname='public' AND seq.relname=esperado.secuencia AND seq.relkind='S'
          AND n.nspname='public' AND t.relname=esperado.tabla
          AND a.attname='id' AND a.atttypid='bigint'::pg_catalog.regtype AND a.attnotnull
          AND defecto.expresion ~ '^nextval\(''[^'']+''::regclass\)$'
          AND pg_catalog.to_regclass(pg_catalog.substring(
                defecto.expresion, '^nextval\(''([^'']+)''::regclass\)$'
              )) IS NOT DISTINCT FROM seq.oid
       ) THEN
      RAISE EXCEPTION 'Rollback no aplicable: BIGSERIAL public.%.id incompatible', esperado.tabla;
    END IF;
  END LOOP;

  FOR esperado IN SELECT * FROM (VALUES
    ('matriz_empresa_version','ck_matriz_empresa_version_revision','CHECK (revision > 0)'),
    ('matriz_empresa_version','ck_matriz_empresa_version_motivo','CHECK (motivo_nueva_version IS NULL OR length(motivo_nueva_version::text) >= 1 AND length(motivo_nueva_version::text) <= 500)'),
    ('matriz_empresa_version','ck_matriz_empresa_version_origen_par','CHECK ((version_origen_id IS NULL) = (version_origen_empresa_id IS NULL))'),
    ('matriz_empresa_version','ck_matriz_empresa_version_origen_empresa','CHECK (version_origen_empresa_id IS NULL OR version_origen_empresa_id = empresa_id)'),
    ('matriz_empresa_version','ck_matriz_empresa_version_activacion_par','CHECK ((activada_por IS NULL) = (activada_en IS NULL))'),
    ('matriz_empresa_version','ck_matriz_empresa_version_desactivacion_par','CHECK ((desactivada_por IS NULL) = (desactivada_en IS NULL))'),
    ('matriz_archivo_fuente','ck_matriz_archivo_fuente_nombre','CHECK (octet_length(nombre_original::text) >= 1 AND octet_length(nombre_original::text) <= 1024)'),
    ('matriz_archivo_fuente','ck_matriz_archivo_fuente_mime','CHECK (length(mime_detectado::text) >= 1 AND length(mime_detectado::text) <= 127)'),
    ('matriz_archivo_fuente','ck_matriz_archivo_fuente_referencia','CHECK (referencia_contenido IS NULL OR length(referencia_contenido::text) >= 1 AND length(referencia_contenido::text) <= 512)'),
    ('matriz_archivo_fuente','ck_matriz_archivo_fuente_tamano_maximo','CHECK (tamano_bytes <= (5 * 1024 * 1024))'),
    ('matriz_archivo_fuente','ck_matriz_archivo_fuente_contenido_tamano','CHECK (octet_length(contenido) = tamano_bytes)'),
    ('matriz_auditoria_evento','ck_matriz_auditoria_evento_accion','CHECK (length(accion::text) >= 1 AND length(accion::text) <= 40)'),
    ('matriz_auditoria_evento','ck_matriz_auditoria_evento_operacion','CHECK (length(operacion::text) >= 1 AND length(operacion::text) <= 40)'),
    ('matriz_auditoria_evento','ck_matriz_auditoria_evento_estados','CHECK ((estado_anterior IS NULL OR (estado_anterior::text = ANY (ARRAY[''BORRADOR''::character varying, ''VALIDADA''::character varying, ''PUBLICADA''::character varying]::text[]))) AND (estado_nuevo IS NULL OR (estado_nuevo::text = ANY (ARRAY[''BORRADOR''::character varying, ''VALIDADA''::character varying, ''PUBLICADA''::character varying]::text[]))))'),
    ('matriz_auditoria_evento','ck_matriz_auditoria_evento_motivo','CHECK (motivo IS NULL OR length(motivo::text) >= 1 AND length(motivo::text) <= 500)'),
    ('matriz_auditoria_evento','ck_matriz_auditoria_evento_archivo_nombre','CHECK (archivo_nombre_original IS NULL OR octet_length(archivo_nombre_original::text) >= 1 AND octet_length(archivo_nombre_original::text) <= 1024)'),
    ('matriz_auditoria_evento','ck_matriz_auditoria_evento_archivo_tamano','CHECK (archivo_tamano_bytes IS NULL OR archivo_tamano_bytes >= 1 AND archivo_tamano_bytes <= (5 * 1024 * 1024))'),
    ('matriz_auditoria_evento','ck_matriz_auditoria_evento_hashes','CHECK ((archivo_sha256 IS NULL OR archivo_sha256 ~ ''^[0-9a-f]{64}$''::text) AND (clave_idempotencia_sha256 IS NULL OR clave_idempotencia_sha256 ~ ''^[0-9a-f]{64}$''::text))'),
    ('matriz_auditoria_evento','ck_matriz_auditoria_evento_correlation_id','CHECK (correlation_id IS NULL OR (correlation_id::text COLLATE "C") ~ ''^[\x21-\x7e]{1,128}$''::text)'),
    ('matriz_auditoria_evento','ck_matriz_auditoria_evento_request_id','CHECK (request_id IS NULL OR (request_id::text COLLATE "C") ~ ''^[\x21-\x7e]{1,128}$''::text)'),
    ('matriz_auditoria_evento','ck_matriz_auditoria_evento_resumen','CHECK (resumen IS NULL OR octet_length(resumen::text) <= (16 * 1024))'),
    ('matriz_idempotencia','ck_matriz_idempotencia_operacion','CHECK (length(operacion::text) >= 1 AND length(operacion::text) <= 40)'),
    ('matriz_idempotencia','ck_matriz_idempotencia_hashes','CHECK (clave_sha256 ~ ''^[0-9a-f]{64}$''::text AND request_sha256 ~ ''^[0-9a-f]{64}$''::text)'),
    ('matriz_idempotencia','ck_matriz_idempotencia_estado','CHECK (length(estado_ejecucion::text) >= 1 AND length(estado_ejecucion::text) <= 40)'),
    ('matriz_idempotencia','ck_matriz_idempotencia_codigo_http','CHECK (codigo_http IS NULL OR codigo_http >= 100 AND codigo_http <= 599)'),
    ('matriz_idempotencia','ck_matriz_idempotencia_respuesta','CHECK (respuesta IS NULL OR octet_length(respuesta::text) <= (64 * 1024))'),
    ('matriz_idempotencia','ck_matriz_idempotencia_fechas','CHECK (expira_en = (creado_en + ''7 days''::interval) AND (completado_en IS NULL OR completado_en >= creado_en))')
  ) AS x(tabla,nombre,definicion) LOOP
    SELECT pg_catalog.lower(pg_catalog.regexp_replace(
             pg_catalog.pg_get_constraintdef(c.oid,true),'[[:space:]]+','','g'
           )) AS definicion
      INTO real
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
     WHERE n.nspname='public' AND t.relname=esperado.tabla
       AND c.conname=esperado.nombre AND c.contype='c' AND c.convalidated;
    IF NOT FOUND OR real.definicion IS DISTINCT FROM pg_catalog.lower(
      pg_catalog.regexp_replace(esperado.definicion,'[[:space:]]+','','g')) THEN
      RAISE EXCEPTION 'Rollback no aplicable: CHECK public.%.% incompatible', esperado.tabla, esperado.nombre;
    END IF;
  END LOOP;

  FOR esperado IN SELECT * FROM (VALUES
    ('matriz_empresa_version','uq_matriz_empresa_version_pendiente_empresa',ARRAY['empresa_id'],true,'pendiente'),
    ('matriz_auditoria_evento','idx_matriz_auditoria_evento_empresa_fecha',ARRAY['empresa_id','creado_en'],false,NULL),
    ('matriz_auditoria_evento','idx_matriz_auditoria_evento_version_fecha',ARRAY['matriz_version_id','creado_en'],false,NULL),
    ('matriz_auditoria_evento','idx_matriz_auditoria_evento_actor_fecha',ARRAY['actor_usuario_id','creado_en'],false,NULL),
    ('matriz_idempotencia','idx_matriz_idempotencia_expira_en',ARRAY['expira_en'],false,NULL)
  ) AS i(tabla,nombre,columnas,unico,tipo_predicado) LOOP
    SELECT i.indisunique AS unico, i.indisvalid AS valido, i.indisready AS listo,
      i.indpred IS NOT NULL AS parcial,
      am.amname AS metodo, i.indnkeyatts AS cantidad_claves,
      i.indnatts AS cantidad_atributos,
      pg_catalog.array_agg(a.attname::TEXT ORDER BY k.ord) FILTER (WHERE k.ord<=i.indnkeyatts) AS columnas,
      pg_catalog.bool_or(k.attnum=0) FILTER (WHERE k.ord<=i.indnkeyatts) AS tiene_expresiones,
      pg_catalog.pg_get_expr(i.indpred,i.indrelid) AS predicado
      INTO real
      FROM pg_catalog.pg_index i
      JOIN pg_catalog.pg_class t ON t.oid=i.indrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      JOIN pg_catalog.pg_class x ON x.oid=i.indexrelid AND x.relnamespace=n.oid AND x.relname=esperado.nombre
      JOIN pg_catalog.pg_am am ON am.oid=x.relam
      JOIN LATERAL pg_catalog.unnest(i.indkey) WITH ORDINALITY k(attnum,ord) ON true
      LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.attnum
     WHERE n.nspname='public' AND t.relname=esperado.tabla
     GROUP BY i.indisunique,i.indisvalid,i.indisready,i.indpred IS NOT NULL,am.amname,
       i.indnkeyatts,i.indnatts,i.indpred,i.indrelid;
    IF NOT FOUND OR real.unico IS DISTINCT FROM esperado.unico
       OR NOT real.valido OR NOT real.listo OR real.metodo IS DISTINCT FROM 'btree'
       OR real.cantidad_claves IS DISTINCT FROM pg_catalog.cardinality(esperado.columnas)
       OR real.cantidad_atributos IS DISTINCT FROM pg_catalog.cardinality(esperado.columnas)
       OR real.tiene_expresiones
       OR real.columnas IS DISTINCT FROM esperado.columnas
       OR real.parcial IS DISTINCT FROM (esperado.tipo_predicado IS NOT NULL) THEN
      RAISE EXCEPTION 'Rollback no aplicable: indice public.% incompatible', esperado.nombre;
    END IF;

    predicado_valido := esperado.tipo_predicado IS NULL;
    IF esperado.tipo_predicado = 'pendiente' THEN
      BEGIN
        EXECUTE pg_catalog.format(
          'SELECT pg_catalog.array_agg((%s) IS TRUE ORDER BY orden) '
          'FROM (VALUES '
          '(1, ''BORRADOR''::varchar(20)), (2, ''VALIDADA''::varchar(20)), '
          '(3, ''PUBLICADA''::varchar(20)), (4, NULL::varchar(20)), '
          '(5, ''__INVALIDO_VERIFY__''::varchar(20))) '
          'AS matriz_empresa_version(orden, estado_editorial)',
          real.predicado
        ) INTO resultado_predicado;
        predicado_valido := resultado_predicado = ARRAY[true,true,false,false,false];
      EXCEPTION WHEN OTHERS THEN
        predicado_valido := false;
      END;
    END IF;
    IF NOT predicado_valido THEN
      RAISE EXCEPTION 'Rollback no aplicable: predicado semantico del indice public.% incompatible', esperado.nombre;
    END IF;
  END LOOP;

  IF pg_catalog.to_regclass('public.uq_matriz_empresa_version_pendiente_empresa') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM pg_catalog.pg_proc p
       JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
       JOIN pg_catalog.pg_language l ON l.oid=p.prolang
       WHERE n.nspname='public' AND p.proname='fn_matriz_auditoria_append_only'
         AND p.pronargs=0 AND p.prorettype='pg_catalog.trigger'::pg_catalog.regtype
         AND p.prokind='f' AND l.lanname='plpgsql'
         AND NOT p.prosecdef AND NOT p.proisstrict AND p.provolatile='v' AND p.proparallel='u'
         AND p.proconfig=ARRAY['search_path=pg_catalog']::TEXT[]
         AND pg_catalog.lower(pg_catalog.regexp_replace(p.prosrc,'[[:space:]]+','','g'))
           = 'beginraiseexception''public.matriz_auditoria_eventoesappend-only'';end;'
     )
     OR NOT EXISTS (
       SELECT 1 FROM pg_catalog.pg_trigger tr
       JOIN pg_catalog.pg_class t ON t.oid=tr.tgrelid
       JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
         WHERE n.nspname='public' AND t.relname='matriz_auditoria_evento'
         AND tr.tgname='trg_matriz_auditoria_append_only' AND NOT tr.tgisinternal
         AND tr.tgenabled='O' AND tr.tgtype=58
         AND tr.tgnargs=0 AND tr.tgattr=''::pg_catalog.int2vector
         AND tr.tgfoid=pg_catalog.to_regprocedure('public.fn_matriz_auditoria_append_only()')
     ) THEN
    RAISE EXCEPTION 'Rollback no aplicable: indice, funcion o trigger de la 003 incompatible';
  END IF;

  -- Cualquier version implica que revision/origen/vigencia pudieron usarse.
  -- No se destruye esa trazabilidad para forzar un rollback.
  IF EXISTS (SELECT 1 FROM public.matriz_empresa_version)
     OR EXISTS (SELECT 1 FROM public.matriz_archivo_fuente)
     OR EXISTS (SELECT 1 FROM public.matriz_auditoria_evento)
     OR EXISTS (SELECT 1 FROM public.matriz_idempotencia) THEN
    RAISE EXCEPTION 'Rollback bloqueado: existen datos creados o afectados por la 003';
  END IF;
END
$$;

DROP TABLE public.matriz_idempotencia;
DROP TRIGGER trg_matriz_auditoria_append_only ON public.matriz_auditoria_evento;
DROP TABLE public.matriz_auditoria_evento;
DROP FUNCTION public.fn_matriz_auditoria_append_only();

DROP INDEX public.uq_matriz_empresa_version_pendiente_empresa;

ALTER TABLE public.matriz_empresa_version
  DROP CONSTRAINT fk_matriz_empresa_version_origen_empresa,
  DROP CONSTRAINT fk_matriz_empresa_version_activada_por,
  DROP CONSTRAINT fk_matriz_empresa_version_desactivada_por,
  DROP CONSTRAINT ck_matriz_empresa_version_activacion_par,
  DROP CONSTRAINT ck_matriz_empresa_version_desactivacion_par,
  DROP CONSTRAINT ck_matriz_empresa_version_origen_par,
  DROP CONSTRAINT ck_matriz_empresa_version_origen_empresa,
  DROP CONSTRAINT ck_matriz_empresa_version_revision,
  DROP CONSTRAINT ck_matriz_empresa_version_motivo,
  DROP CONSTRAINT uq_matriz_empresa_version_id_empresa,
  DROP COLUMN desactivada_en,
  DROP COLUMN desactivada_por,
  DROP COLUMN activada_en,
  DROP COLUMN activada_por,
  DROP COLUMN version_origen_empresa_id,
  DROP COLUMN revision,
  ALTER COLUMN motivo_nueva_version TYPE TEXT,
  ADD CONSTRAINT fk_matriz_empresa_version_origen
    FOREIGN KEY (version_origen_id)
    REFERENCES public.matriz_empresa_version (id) ON DELETE RESTRICT;

ALTER TABLE public.matriz_archivo_fuente
  DROP CONSTRAINT ck_matriz_archivo_fuente_contenido_tamano,
  DROP CONSTRAINT ck_matriz_archivo_fuente_tamano_maximo,
  DROP CONSTRAINT ck_matriz_archivo_fuente_referencia,
  DROP CONSTRAINT ck_matriz_archivo_fuente_mime,
  DROP CONSTRAINT ck_matriz_archivo_fuente_nombre,
  DROP COLUMN contenido,
  ALTER COLUMN referencia_contenido TYPE TEXT,
  ALTER COLUMN mime_detectado TYPE VARCHAR(255),
  ALTER COLUMN nombre_original TYPE TEXT;

DELETE FROM public.schema_migrations
WHERE migration_key = '20260805_003_gestion_matrices_empresa';

COMMIT;
