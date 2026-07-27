# Migraciones del backend

Este directorio contiene migraciones incrementales del esquema PostgreSQL. Los
archivos `backup.sql` y `backup.clean.sql` son respaldos históricos y no deben
editarse ni utilizarse como sustituto de una migración.

## Migración de actividades vulnerables

La migración
`20260727_001_empresa_actividades_vulnerables` crea el catálogo de actividades
vulnerables, la relación muchos-a-muchos con empresas y el registro de control
en `public.schema_migrations`.

La ejecución es manual. No forma parte de `npm run build`, `npm start` ni del
arranque automático del backend.

### Preparación

1. Confirmar que se está trabajando contra la base y ambiente autorizados.
2. Crear y validar un respaldo completo antes de aplicar la migración.
3. Confirmar que el respaldo puede restaurarse.
4. No imprimir, copiar al repositorio ni registrar en logs la cadena de
   conexión.

### Aplicación

Usar una variable de entorno configurada de forma segura y detener la ejecución
ante el primer error:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f backend/migrations/20260727_001_empresa_actividades_vulnerables.up.sql
```

La migración completa se ejecuta en una sola transacción. El registro en
`public.schema_migrations` se inserta únicamente al final.

El orden de liberación es:

1. Base de datos.
2. Backend.
3. Frontend.

No debe desplegarse código que dependa de las tablas nuevas antes de aplicar y
verificar la migración.

### Verificación

Después de la aplicación se debe comprobar, sin modificar datos:

- existe un registro de migración con la clave
  `20260727_001_empresa_actividades_vulnerables`;
- `public.cat_actividades_vulnerables` contiene exactamente 31 registros;
- las 31 claves son únicas;
- existen las restricciones e índices declarados por la migración;
- `public.empresa_actividades_vulnerables` no contiene filas inmediatamente
  después del seed;
- las empresas existentes permanecen sin asignación automática.

También debe intentarse una segunda ejecución del archivo `up`. El resultado
esperado es un error explícito indicando que la migración ya fue aplicada. Esa
prueba no debe alterar el catálogo ni crear registros duplicados.

### Rollback

El rollback también es manual:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f backend/migrations/20260727_001_empresa_actividades_vulnerables.down.sql
```

El archivo `down` aborta si
`public.empresa_actividades_vulnerables` contiene alguna relación, para evitar
pérdida de datos. Si no existen relaciones, elimina primero la tabla de
relación, después el catálogo y finalmente solo el registro de esta migración.
No elimina `public.schema_migrations`.

El rollback debe probarse primero en una base desechable. Una vez que existan
asignaciones reales, debe preferirse revertir el código y preparar una
migración correctiva, no eliminar las tablas.
