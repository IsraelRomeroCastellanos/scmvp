BEGIN;

DO $$
BEGIN
    IF to_regclass('public.empresa_actividades_vulnerables') IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM public.empresa_actividades_vulnerables
       ) THEN
        RAISE EXCEPTION
            'Rollback cancelado: empresa_actividades_vulnerables contiene relaciones';
    END IF;
END
$$;

DROP TABLE IF EXISTS public.empresa_actividades_vulnerables;
DROP TABLE IF EXISTS public.cat_actividades_vulnerables;

DELETE FROM public.schema_migrations
WHERE migration_key = '20260727_001_empresa_actividades_vulnerables';

COMMIT;
