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
BEGIN
  IF pg_catalog.current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Esquema invalido: se esperaba public y se obtuvo %', pg_catalog.current_schema();
  END IF;

  FOREACH objeto IN ARRAY ARRAY[
    'public.schema_migrations', 'public.empresas', 'public.usuarios',
    'public.matriz_empresa_version', 'public.matriz_criterio',
    'public.matriz_opcion', 'public.matriz_rango', 'public.matriz_regla',
    'public.matriz_archivo_fuente'
  ] LOOP
    IF pg_catalog.to_regclass(objeto) IS NULL THEN
      RAISE EXCEPTION 'Preflight fallido: falta %', objeto;
    END IF;
  END LOOP;

  -- La migration key no acredita por si sola el contrato fisico de la 002.
  FOR esperado IN
    SELECT * FROM (VALUES
      ('matriz_empresa_version','pk_matriz_empresa_version','p',ARRAY['id'],NULL,NULL,NULL),
      ('matriz_empresa_version','uq_matriz_empresa_version_empresa_numero','u',ARRAY['empresa_id','numero_version'],NULL,NULL,NULL),
      ('matriz_empresa_version','fk_matriz_empresa_version_empresa','f',ARRAY['empresa_id'],'empresas',ARRAY['id'],'r'),
      ('matriz_empresa_version','fk_matriz_empresa_version_creada_por','f',ARRAY['creada_por'],'usuarios',ARRAY['id'],'r'),
      ('matriz_empresa_version','fk_matriz_empresa_version_validada_por','f',ARRAY['validada_por'],'usuarios',ARRAY['id'],'r'),
      ('matriz_empresa_version','fk_matriz_empresa_version_publicada_por','f',ARRAY['publicada_por'],'usuarios',ARRAY['id'],'r'),
      ('matriz_empresa_version','fk_matriz_empresa_version_origen','f',ARRAY['version_origen_id'],'matriz_empresa_version',ARRAY['id'],'r'),
      ('matriz_archivo_fuente','pk_matriz_archivo_fuente','p',ARRAY['id'],NULL,NULL,NULL),
      ('matriz_archivo_fuente','uq_matriz_archivo_fuente_version','u',ARRAY['matriz_version_id'],NULL,NULL,NULL),
      ('matriz_archivo_fuente','fk_matriz_archivo_fuente_version','f',ARRAY['matriz_version_id'],'matriz_empresa_version',ARRAY['id'],'r'),
      ('matriz_archivo_fuente','fk_matriz_archivo_fuente_cargado_por','f',ARRAY['cargado_por'],'usuarios',ARRAY['id'],'r')
    ) AS c(tabla,nombre,tipo,columnas,tabla_ref,columnas_ref,accion)
  LOOP
    SELECT c.contype AS tipo,
      ARRAY(SELECT a.attname::TEXT FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY k(attnum,ord)
        JOIN pg_catalog.pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum ORDER BY k.ord) AS columnas,
      rn.nspname AS esquema_ref, rt.relname AS tabla_ref,
      ARRAY(SELECT a.attname::TEXT FROM pg_catalog.unnest(c.confkey) WITH ORDINALITY k(attnum,ord)
        JOIN pg_catalog.pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.attnum ORDER BY k.ord) AS columnas_ref,
      c.confdeltype AS accion_borrado, c.confupdtype AS accion_actualizacion,
      c.confmatchtype AS tipo_match, c.convalidated AS validada
      INTO real
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      LEFT JOIN pg_catalog.pg_class rt ON rt.oid=c.confrelid
      LEFT JOIN pg_catalog.pg_namespace rn ON rn.oid=rt.relnamespace
     WHERE n.nspname='public' AND t.relname=esperado.tabla AND c.conname=esperado.nombre;
    IF NOT FOUND OR real.tipo IS DISTINCT FROM esperado.tipo::"char"
       OR real.columnas IS DISTINCT FROM esperado.columnas OR NOT real.validada
       OR (esperado.tipo='f' AND (real.esquema_ref IS DISTINCT FROM 'public'
         OR real.tabla_ref IS DISTINCT FROM esperado.tabla_ref
         OR real.columnas_ref IS DISTINCT FROM esperado.columnas_ref
         OR real.accion_borrado IS DISTINCT FROM esperado.accion::"char"
         OR real.accion_actualizacion IS DISTINCT FROM 'a'::"char"
         OR real.tipo_match IS DISTINCT FROM 's'::"char")) THEN
      RAISE EXCEPTION 'Preflight fallido: constraint 002 public.%.% incompatible', esperado.tabla, esperado.nombre;
    END IF;
  END LOOP;

  FOR esperado IN SELECT * FROM (VALUES
    ('matriz_empresa_version','ck_matriz_empresa_version_numero','CHECK (numero_version > 0)'),
    ('matriz_empresa_version','ck_matriz_empresa_version_estado','CHECK (estado_editorial::text = ANY (ARRAY[''BORRADOR''::character varying, ''VALIDADA''::character varying, ''PUBLICADA''::character varying]::text[]))'),
    ('matriz_empresa_version','ck_matriz_empresa_version_activa_publicada','CHECK (NOT activa OR estado_editorial::text = ''PUBLICADA''::text)'),
    ('matriz_empresa_version','ck_matriz_empresa_version_origen_distinto','CHECK (version_origen_id IS NULL OR version_origen_id <> id)'),
    ('matriz_archivo_fuente','ck_matriz_archivo_fuente_tamano','CHECK (tamano_bytes > 0)'),
    ('matriz_archivo_fuente','ck_matriz_archivo_fuente_sha256','CHECK (sha256 ~ ''^[0-9a-f]{64}$''::text)')
  ) AS x(tabla,nombre,definicion) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public' AND t.relname=esperado.tabla
        AND c.conname=esperado.nombre AND c.contype='c' AND c.convalidated
        AND pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.pg_get_constraintdef(c.oid,true),'[[:space:]]+','','g'))
          = pg_catalog.lower(pg_catalog.regexp_replace(esperado.definicion,'[[:space:]]+','','g'))
    ) THEN
      RAISE EXCEPTION 'Preflight fallido: CHECK 002 public.%.% incompatible', esperado.tabla, esperado.nombre;
    END IF;
  END LOOP;

  FOR esperado IN SELECT * FROM (VALUES
    ('uq_matriz_empresa_version_activa_empresa',ARRAY['empresa_id'],true,'(activa=true)'),
    ('idx_matriz_empresa_version_estado',ARRAY['empresa_id','estado_editorial'],false,NULL),
    ('idx_matriz_empresa_version_origen',ARRAY['version_origen_id'],false,NULL),
    ('idx_matriz_empresa_version_creada_por',ARRAY['creada_por'],false,NULL),
    ('idx_matriz_empresa_version_validada_por',ARRAY['validada_por'],false,NULL),
    ('idx_matriz_empresa_version_publicada_por',ARRAY['publicada_por'],false,NULL),
    ('idx_matriz_archivo_fuente_cargado_por',ARRAY['cargado_por'],false,NULL)
  ) AS x(nombre,columnas,unico,predicado) LOOP
    SELECT i.indisunique AS unico, i.indisvalid AS valido, i.indisready AS listo,
      am.amname AS metodo, i.indnkeyatts AS cantidad_claves,
      i.indnatts AS cantidad_atributos,
      pg_catalog.array_agg(a.attname::TEXT ORDER BY k.ord) FILTER (WHERE k.ord<=i.indnkeyatts) AS columnas,
      pg_catalog.bool_or(k.attnum=0) FILTER (WHERE k.ord<=i.indnkeyatts) AS tiene_expresiones,
      pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.pg_get_expr(i.indpred,i.indrelid,false),'[[:space:]]+','','g')) AS predicado
      INTO real
      FROM pg_catalog.pg_index i
      JOIN pg_catalog.pg_class x ON x.oid=i.indexrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=x.relnamespace
      JOIN pg_catalog.pg_class t ON t.oid=i.indrelid
      JOIN pg_catalog.pg_am am ON am.oid=x.relam
      JOIN LATERAL pg_catalog.unnest(i.indkey) WITH ORDINALITY k(attnum,ord) ON true
      LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.attnum
     WHERE n.nspname='public' AND x.relname=esperado.nombre
     GROUP BY i.indisunique,i.indisvalid,i.indisready,am.amname,
       i.indnkeyatts,i.indnatts,i.indpred,i.indrelid;
    IF NOT FOUND OR real.unico IS DISTINCT FROM esperado.unico
       OR NOT real.valido OR NOT real.listo OR real.metodo IS DISTINCT FROM 'btree'
       OR real.cantidad_claves IS DISTINCT FROM pg_catalog.cardinality(esperado.columnas)
       OR real.cantidad_atributos IS DISTINCT FROM pg_catalog.cardinality(esperado.columnas)
       OR real.tiene_expresiones
       OR real.columnas IS DISTINCT FROM esperado.columnas
       OR real.predicado IS DISTINCT FROM esperado.predicado THEN
      RAISE EXCEPTION 'Preflight fallido: indice 002 public.% incompatible', esperado.nombre;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class t ON t.oid = a.attrelid AND t.relkind IN ('r', 'p')
      JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_catalog.pg_type tipo ON tipo.oid = a.atttypid
      JOIN pg_catalog.pg_namespace tipo_n
        ON tipo_n.oid = tipo.typnamespace
     WHERE n.nspname = 'public' AND t.relname = 'schema_migrations'
       AND a.attname = 'migration_key' AND a.attnum > 0 AND NOT a.attisdropped
       AND tipo_n.nspname = 'pg_catalog' AND tipo.typname = 'varchar'
       AND a.atttypmod = 150 + 4
       AND a.attnotnull
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: public.schema_migrations es incompatible';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
     WHERE migration_key = '20260728_001_modelo_integral_actividades_vulnerables'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
     WHERE migration_key = '20260801_002_matrices_pt_gr_empresa'
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: se requieren las migraciones 001 y 002 registradas';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.schema_migrations
     WHERE migration_key = '20260805_003_gestion_matrices_empresa'
  ) THEN
    RAISE EXCEPTION 'La migracion 20260805_003_gestion_matrices_empresa ya esta registrada';
  END IF;

  FOREACH objeto IN ARRAY ARRAY[
    'public.matriz_auditoria_evento', 'public.matriz_idempotencia',
    'public.fn_matriz_auditoria_append_only'
  ] LOOP
    IF pg_catalog.to_regclass(objeto) IS NOT NULL
       OR pg_catalog.to_regprocedure(objeto || '()') IS NOT NULL THEN
      RAISE EXCEPTION 'Estado parcial o incompatible: ya existe %', objeto;
    END IF;
  END LOOP;

  FOR columna IN
    SELECT * FROM (VALUES
      ('matriz_empresa_version', 'id', 'integer', true),
      ('matriz_empresa_version', 'empresa_id', 'integer', true),
      ('matriz_empresa_version', 'numero_version', 'integer', true),
      ('matriz_empresa_version', 'estado_editorial', 'character varying(20)', true),
      ('matriz_empresa_version', 'activa', 'boolean', true),
      ('matriz_empresa_version', 'creada_por', 'integer', true),
      ('matriz_empresa_version', 'validada_por', 'integer', false),
      ('matriz_empresa_version', 'publicada_por', 'integer', false),
      ('matriz_empresa_version', 'creada_en', 'timestamp with time zone', true),
      ('matriz_empresa_version', 'validada_en', 'timestamp with time zone', false),
      ('matriz_empresa_version', 'publicada_en', 'timestamp with time zone', false),
      ('matriz_empresa_version', 'reporte_validacion', 'jsonb', false),
      ('matriz_empresa_version', 'version_origen_id', 'integer', false),
      ('matriz_empresa_version', 'motivo_nueva_version', 'text', false),
      ('matriz_archivo_fuente', 'id', 'integer', true),
      ('matriz_archivo_fuente', 'matriz_version_id', 'integer', true),
      ('matriz_archivo_fuente', 'nombre_original', 'text', true),
      ('matriz_archivo_fuente', 'mime_detectado', 'character varying(255)', true),
      ('matriz_archivo_fuente', 'tamano_bytes', 'bigint', true),
      ('matriz_archivo_fuente', 'sha256', 'character(64)', true),
      ('matriz_archivo_fuente', 'referencia_contenido', 'text', false),
      ('matriz_archivo_fuente', 'cargado_por', 'integer', true),
      ('matriz_archivo_fuente', 'cargado_en', 'timestamp with time zone', true)
    ) AS v(tabla, nombre, tipo, no_nula)
  LOOP
    IF NOT EXISTS (
      SELECT 1
        FROM pg_catalog.pg_attribute a
        JOIN pg_catalog.pg_class t ON t.oid = a.attrelid AND t.relkind IN ('r', 'p')
        JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname = 'public' AND t.relname = columna.tabla
         AND a.attname = columna.nombre AND a.attnum > 0 AND NOT a.attisdropped
         AND pg_catalog.format_type(a.atttypid, a.atttypmod) = columna.tipo
         AND a.attnotnull = columna.no_nula
    ) THEN
      RAISE EXCEPTION 'Preflight fallido: columna public.%.% incompatible', columna.tabla, columna.nombre;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
      JOIN pg_catalog.pg_class rt ON rt.oid=c.confrelid
      JOIN pg_catalog.pg_namespace rn ON rn.oid=rt.relnamespace
     WHERE n.nspname='public' AND t.relname='matriz_empresa_version'
       AND c.conname='fk_matriz_empresa_version_origen' AND c.contype='f'
       AND rn.nspname='public' AND rt.relname='matriz_empresa_version'
       AND ARRAY(SELECT a.attname::TEXT FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY k(attnum,ord)
         JOIN pg_catalog.pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum ORDER BY k.ord)
           = ARRAY['version_origen_id']
       AND ARRAY(SELECT a.attname::TEXT FROM pg_catalog.unnest(c.confkey) WITH ORDINALITY k(attnum,ord)
         JOIN pg_catalog.pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.attnum ORDER BY k.ord)
           = ARRAY['id']
       AND c.confdeltype='r' AND c.confupdtype='a' AND c.confmatchtype='s'
       AND c.convalidated
  ) THEN
    RAISE EXCEPTION 'Preflight fallido: FK de origen de la 002 incompatible';
  END IF;

  FOREACH objeto IN ARRAY ARRAY[
    'revision', 'version_origen_empresa_id', 'activada_por', 'activada_en',
    'desactivada_por', 'desactivada_en'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class t ON t.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public' AND t.relname = 'matriz_empresa_version'
        AND a.attname = objeto AND a.attnum > 0 AND NOT a.attisdropped
    ) THEN
      RAISE EXCEPTION 'Estado parcial: ya existe public.matriz_empresa_version.%', objeto;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class t ON t.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'matriz_archivo_fuente'
      AND a.attname = 'contenido' AND a.attnum > 0 AND NOT a.attisdropped
  ) THEN
    RAISE EXCEPTION 'Estado parcial: ya existe public.matriz_archivo_fuente.contenido';
  END IF;

  IF EXISTS (SELECT 1 FROM public.matriz_archivo_fuente) THEN
    RAISE EXCEPTION 'Preflight fallido: existen archivos previos sin binario integro verificable; no es posible aplicar la 003';
  END IF;

END
$$;

ALTER TABLE public.matriz_archivo_fuente
  ALTER COLUMN nombre_original TYPE VARCHAR(255),
  ALTER COLUMN mime_detectado TYPE VARCHAR(127),
  ALTER COLUMN referencia_contenido TYPE VARCHAR(512),
  ADD COLUMN contenido BYTEA NOT NULL,
  ADD CONSTRAINT ck_matriz_archivo_fuente_nombre
    CHECK (pg_catalog.octet_length(nombre_original) BETWEEN 1 AND 1024),
  ADD CONSTRAINT ck_matriz_archivo_fuente_mime
    CHECK (pg_catalog.length(mime_detectado) BETWEEN 1 AND 127),
  ADD CONSTRAINT ck_matriz_archivo_fuente_referencia
    CHECK (referencia_contenido IS NULL OR pg_catalog.length(referencia_contenido) BETWEEN 1 AND 512),
  ADD CONSTRAINT ck_matriz_archivo_fuente_tamano_maximo
    CHECK (tamano_bytes <= 5 * 1024 * 1024),
  ADD CONSTRAINT ck_matriz_archivo_fuente_contenido_tamano
    CHECK (pg_catalog.octet_length(contenido) = tamano_bytes);

ALTER TABLE public.matriz_empresa_version
  DROP CONSTRAINT fk_matriz_empresa_version_origen,
  ALTER COLUMN motivo_nueva_version TYPE VARCHAR(500),
  ADD COLUMN revision BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN version_origen_empresa_id INTEGER NULL,
  ADD COLUMN activada_por INTEGER NULL,
  ADD COLUMN activada_en TIMESTAMPTZ NULL,
  ADD COLUMN desactivada_por INTEGER NULL,
  ADD COLUMN desactivada_en TIMESTAMPTZ NULL;

UPDATE public.matriz_empresa_version
   SET version_origen_empresa_id = empresa_id
 WHERE version_origen_id IS NOT NULL;

ALTER TABLE public.matriz_empresa_version
  ADD CONSTRAINT uq_matriz_empresa_version_id_empresa UNIQUE (id, empresa_id),
  ADD CONSTRAINT ck_matriz_empresa_version_revision CHECK (revision > 0),
  ADD CONSTRAINT ck_matriz_empresa_version_motivo
    CHECK (motivo_nueva_version IS NULL OR pg_catalog.length(motivo_nueva_version) BETWEEN 1 AND 500),
  ADD CONSTRAINT ck_matriz_empresa_version_origen_par
    CHECK ((version_origen_id IS NULL) = (version_origen_empresa_id IS NULL)),
  ADD CONSTRAINT ck_matriz_empresa_version_origen_empresa
    CHECK (version_origen_empresa_id IS NULL OR version_origen_empresa_id = empresa_id),
  ADD CONSTRAINT fk_matriz_empresa_version_origen_empresa
    FOREIGN KEY (version_origen_id, version_origen_empresa_id)
    REFERENCES public.matriz_empresa_version (id, empresa_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_matriz_empresa_version_activada_por
    FOREIGN KEY (activada_por) REFERENCES public.usuarios (id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_matriz_empresa_version_desactivada_por
    FOREIGN KEY (desactivada_por) REFERENCES public.usuarios (id) ON DELETE RESTRICT,
  ADD CONSTRAINT ck_matriz_empresa_version_activacion_par
    CHECK ((activada_por IS NULL) = (activada_en IS NULL)),
  ADD CONSTRAINT ck_matriz_empresa_version_desactivacion_par
    CHECK ((desactivada_por IS NULL) = (desactivada_en IS NULL));

CREATE UNIQUE INDEX uq_matriz_empresa_version_pendiente_empresa
  ON public.matriz_empresa_version (empresa_id)
  WHERE estado_editorial IN ('BORRADOR', 'VALIDADA');

CREATE TABLE public.matriz_auditoria_evento (
  id BIGSERIAL,
  empresa_id INTEGER NOT NULL,
  matriz_version_id INTEGER NULL,
  version_origen_id INTEGER NULL,
  actor_usuario_id INTEGER NOT NULL,
  accion VARCHAR(40) NOT NULL,
  operacion VARCHAR(40) NOT NULL,
  estado_anterior VARCHAR(20) NULL,
  estado_nuevo VARCHAR(20) NULL,
  activa_anterior BOOLEAN NULL,
  activa_nueva BOOLEAN NULL,
  motivo VARCHAR(500) NULL,
  archivo_nombre_original VARCHAR(255) NULL,
  archivo_mime_detectado VARCHAR(127) NULL,
  archivo_tamano_bytes BIGINT NULL,
  archivo_sha256 CHAR(64) NULL,
  clave_idempotencia_sha256 CHAR(64) NULL,
  correlation_id VARCHAR(128) NULL,
  request_id VARCHAR(128) NULL,
  resumen JSONB NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT pk_matriz_auditoria_evento PRIMARY KEY (id),
  CONSTRAINT fk_matriz_auditoria_evento_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresas (id) ON DELETE RESTRICT,
  CONSTRAINT fk_matriz_auditoria_evento_version
    FOREIGN KEY (matriz_version_id, empresa_id)
    REFERENCES public.matriz_empresa_version (id, empresa_id) ON DELETE RESTRICT,
  CONSTRAINT fk_matriz_auditoria_evento_origen
    FOREIGN KEY (version_origen_id, empresa_id)
    REFERENCES public.matriz_empresa_version (id, empresa_id) ON DELETE RESTRICT,
  CONSTRAINT fk_matriz_auditoria_evento_actor
    FOREIGN KEY (actor_usuario_id) REFERENCES public.usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT ck_matriz_auditoria_evento_accion CHECK (pg_catalog.length(accion) BETWEEN 1 AND 40),
  CONSTRAINT ck_matriz_auditoria_evento_operacion CHECK (pg_catalog.length(operacion) BETWEEN 1 AND 40),
  CONSTRAINT ck_matriz_auditoria_evento_estados CHECK (
    (estado_anterior IS NULL OR estado_anterior IN ('BORRADOR', 'VALIDADA', 'PUBLICADA'))
    AND (estado_nuevo IS NULL OR estado_nuevo IN ('BORRADOR', 'VALIDADA', 'PUBLICADA'))
  ),
  CONSTRAINT ck_matriz_auditoria_evento_motivo
    CHECK (motivo IS NULL OR pg_catalog.length(motivo) BETWEEN 1 AND 500),
  CONSTRAINT ck_matriz_auditoria_evento_archivo_nombre
    CHECK (archivo_nombre_original IS NULL OR pg_catalog.octet_length(archivo_nombre_original) BETWEEN 1 AND 1024),
  CONSTRAINT ck_matriz_auditoria_evento_archivo_tamano
    CHECK (archivo_tamano_bytes IS NULL OR archivo_tamano_bytes BETWEEN 1 AND 5 * 1024 * 1024),
  CONSTRAINT ck_matriz_auditoria_evento_hashes CHECK (
    (archivo_sha256 IS NULL OR archivo_sha256 ~ '^[0-9a-f]{64}$')
    AND (clave_idempotencia_sha256 IS NULL OR clave_idempotencia_sha256 ~ '^[0-9a-f]{64}$')
  ),
  CONSTRAINT ck_matriz_auditoria_evento_correlation_id CHECK (
    correlation_id IS NULL OR correlation_id COLLATE "C" ~ '^[\x21-\x7e]{1,128}$'
  ),
  CONSTRAINT ck_matriz_auditoria_evento_request_id CHECK (
    request_id IS NULL OR request_id COLLATE "C" ~ '^[\x21-\x7e]{1,128}$'
  ),
  CONSTRAINT ck_matriz_auditoria_evento_resumen
    CHECK (resumen IS NULL OR pg_catalog.octet_length(resumen::TEXT) <= 16 * 1024)
);

CREATE INDEX idx_matriz_auditoria_evento_empresa_fecha
  ON public.matriz_auditoria_evento (empresa_id, creado_en);
CREATE INDEX idx_matriz_auditoria_evento_version_fecha
  ON public.matriz_auditoria_evento (matriz_version_id, creado_en);
CREATE INDEX idx_matriz_auditoria_evento_actor_fecha
  ON public.matriz_auditoria_evento (actor_usuario_id, creado_en);

CREATE FUNCTION public.fn_matriz_auditoria_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'public.matriz_auditoria_evento es append-only';
END;
$$;

CREATE TRIGGER trg_matriz_auditoria_append_only
BEFORE UPDATE OR DELETE OR TRUNCATE ON public.matriz_auditoria_evento
FOR EACH STATEMENT
EXECUTE FUNCTION public.fn_matriz_auditoria_append_only();

-- Los GRANT/REVOKE nominales requieren nombres de roles aprobados por ambiente.
-- El trigger protege UPDATE/DELETE/TRUNCATE; la separacion propietario/aplicacion sigue
-- siendo una condicion operativa obligatoria previa al despliegue productivo.

CREATE TABLE public.matriz_idempotencia (
  id BIGSERIAL,
  empresa_id INTEGER NOT NULL,
  actor_usuario_id INTEGER NOT NULL,
  operacion VARCHAR(40) NOT NULL,
  clave_sha256 CHAR(64) NOT NULL,
  request_sha256 CHAR(64) NOT NULL,
  estado_ejecucion VARCHAR(40) NOT NULL,
  codigo_http INTEGER NULL,
  respuesta JSONB NULL,
  matriz_version_id INTEGER NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  completado_en TIMESTAMPTZ NULL,
  expira_en TIMESTAMPTZ NOT NULL DEFAULT (pg_catalog.now() + INTERVAL '7 days'),
  CONSTRAINT pk_matriz_idempotencia PRIMARY KEY (id),
  CONSTRAINT fk_matriz_idempotencia_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresas (id) ON DELETE RESTRICT,
  CONSTRAINT fk_matriz_idempotencia_actor
    FOREIGN KEY (actor_usuario_id) REFERENCES public.usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT fk_matriz_idempotencia_version
    FOREIGN KEY (matriz_version_id, empresa_id)
    REFERENCES public.matriz_empresa_version (id, empresa_id) ON DELETE RESTRICT,
  CONSTRAINT uq_matriz_idempotencia_ambito
    UNIQUE (empresa_id, actor_usuario_id, operacion, clave_sha256),
  CONSTRAINT ck_matriz_idempotencia_operacion CHECK (pg_catalog.length(operacion) BETWEEN 1 AND 40),
  CONSTRAINT ck_matriz_idempotencia_hashes CHECK (
    clave_sha256 ~ '^[0-9a-f]{64}$' AND request_sha256 ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT ck_matriz_idempotencia_estado
    CHECK (pg_catalog.length(estado_ejecucion) BETWEEN 1 AND 40),
  CONSTRAINT ck_matriz_idempotencia_codigo_http
    CHECK (codigo_http IS NULL OR codigo_http BETWEEN 100 AND 599),
  CONSTRAINT ck_matriz_idempotencia_respuesta
    CHECK (respuesta IS NULL OR pg_catalog.octet_length(respuesta::TEXT) <= 64 * 1024),
  CONSTRAINT ck_matriz_idempotencia_fechas CHECK (
    expira_en = creado_en + INTERVAL '7 days'
    AND (completado_en IS NULL OR completado_en >= creado_en)
  )
);

CREATE INDEX idx_matriz_idempotencia_expira_en
  ON public.matriz_idempotencia (expira_en);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.matriz_archivo_fuente
     WHERE pg_catalog.octet_length(contenido) <> tamano_bytes
        OR tamano_bytes NOT BETWEEN 1 AND 5 * 1024 * 1024
  ) OR EXISTS (
    SELECT empresa_id FROM public.matriz_empresa_version
     WHERE estado_editorial IN ('BORRADOR', 'VALIDADA')
     GROUP BY empresa_id HAVING pg_catalog.count(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM public.matriz_empresa_version
     WHERE revision <= 0
        OR (version_origen_id IS NULL) <> (version_origen_empresa_id IS NULL)
        OR (version_origen_empresa_id IS NOT NULL AND version_origen_empresa_id <> empresa_id)
        OR (activada_por IS NULL) <> (activada_en IS NULL)
        OR (desactivada_por IS NULL) <> (desactivada_en IS NULL)
  ) THEN
    RAISE EXCEPTION 'Validacion final de datos de la 003 fallida';
  END IF;
END
$$;

INSERT INTO public.schema_migrations (migration_key)
VALUES ('20260805_003_gestion_matrices_empresa');

COMMIT;
