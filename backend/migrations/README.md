# Migraciones manuales de PostgreSQL

## Estado

La migración `20260728_001_modelo_integral_actividades_vulnerables` está preparada, pero permanece pendiente de:

1. validación jurídica de las 14 actividades generales;
2. validación jurídica de las 31 operaciones y sus fracciones;
3. aprobación final del mapa actividad–operación;
4. revisión técnica del SQL UP, DOWN y VERIFY.

No debe ejecutarse hasta obtener esas aprobaciones.

## Archivos

- `20260728_001_modelo_integral_actividades_vulnerables.up.sql`: toma un advisory lock transaccional, valida `schema_migrations`, crea el modelo, inserta el seed y registra la migración.
- `20260728_001_modelo_integral_actividades_vulnerables.verify.sql`: realiza únicamente consultas de verificación.
- `20260728_001_modelo_integral_actividades_vulnerables.down.sql`: revierte objetos solo cuando no existen datos de uso.

## Reglas de seguridad

- Tomar un respaldo completo y verificable antes de cualquier ejecución.
- Restaurar y probar primero en una base desechable.
- Usar exclusivamente la `DATABASE_URL` exacta configurada en el backend de Render para la ejecución productiva, obtenida por un canal seguro.
- No copiar la cadena de conexión al repositorio, documentación, salida de terminal, historial compartido ni evidencia.
- No ejecutar comandos que impriman la variable o sus credenciales.
- No editar backups para simular una migración.
- Usar `ON_ERROR_STOP=1` para detener `psql` ante el primer error.
- Confirmar la identidad de base y esquema mediante el VERIFY antes de aprobar producción.
- El UP usa un advisory lock transaccional derivado de la migration key para serializar ejecuciones concurrentes; PostgreSQL lo libera automáticamente al terminar la transacción.
- Si `schema_migrations` ya existe, el UP valida su estructura mínima y aborta sin modificarla cuando es incompatible.

## Comandos genéricos

Los siguientes comandos son plantillas. La variable debe inyectarse de forma segura en la sesión y nunca escribirse literalmente en archivos versionados.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f backend/migrations/20260728_001_modelo_integral_actividades_vulnerables.up.sql
```

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f backend/migrations/20260728_001_modelo_integral_actividades_vulnerables.verify.sql
```

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f backend/migrations/20260728_001_modelo_integral_actividades_vulnerables.down.sql
```

## Procedimiento obligatorio en base desechable

1. Tomar el respaldo de la base objetivo.
2. Restaurarlo sin alteraciones en una base desechable.
3. Confirmar el baseline esperado antes del UP:
   - esquema `public`;
   - tablas actuales de empresa, cliente y Perfil Transaccional;
   - perfil histórico existente;
   - ausencia de las tablas nuevas y de la migration key.
4. Ejecutar el UP.
5. Ejecutar el VERIFY.
6. Confirmar:
   - migration key registrada;
   - 14 actividades generales;
   - 31 operaciones;
   - 31 relaciones actividad–operación;
   - cero asignaciones a empresas;
   - cero selecciones PLD;
   - perfil histórico intacto y con `seleccion_pld_cliente_id IS NULL`;
   - cero huérfanos e inconsistencias.
7. Ejecutar el UP una segunda vez. Debe abortar explícitamente por migration key ya registrada y no cambiar datos.
8. Ejecutar el DOWN.
9. Confirmar que las tablas nuevas y la columna fueron eliminadas, que `schema_migrations` permanece y que solo se borró la migration key correspondiente.
10. Reaplicar el UP y repetir el VERIFY.
11. Conservar evidencia saneada de cada resultado para revisión técnica.
12. Obtener aprobación antes de considerar producción.

## Rollback

El DOWN se ejecuta dentro de una transacción y aborta si:

- falta cualquiera de las tablas esperadas;
- falta la columna, FK o índice agregado al Perfil Transaccional;
- existe cualquier relación empresa–actividad;
- existe cualquier selección PLD de cliente;
- algún Perfil Transaccional tiene `seleccion_pld_cliente_id` no nulo.

El preflight estricto del DOWN detecta estados parciales antes de consultar tablas o columnas dependientes. No usa `DROP IF EXISTS`, porque eso ocultaría una aplicación incompleta o inconsistente.

El DOWN no debe utilizarse para reparar una migración parcial. Si falta algún objeto o la estructura difiere, se debe detener el procedimiento, investigar la causa y corregir el estado mediante un runbook específico aprobado.

Las guardas de datos evitan eliminar información de uso. No debe forzarse el rollback borrando relaciones, selecciones o vínculos. Si una guarda se activa, se requiere un plan de recuperación específico y aprobado.

El DOWN conserva `schema_migrations`, elimina únicamente el registro de esta migración y no modifica backups.

## Compatibilidad histórica

- No se asignan actividades a empresas existentes.
- No se crean selecciones para clientes existentes.
- No se actualiza ni completa el Perfil Transaccional histórico.
- La nueva FK del perfil es nullable y no tiene backfill.
- La demo basada en `localStorage` no forma parte de la migración.

## Despliegue productivo

El orden obligatorio es:

> DB → backend → frontend

1. Verificar nuevamente que la conexión segura corresponde a la base usada por el backend de Render.
2. Confirmar respaldo restaurable.
3. Aplicar la migración DB con `ON_ERROR_STOP=1`.
4. Ejecutar VERIFY y revisar toda la evidencia.
5. Desplegar un backend compatible con empresas históricas y perfiles con contexto PLD pendiente.
6. Desplegar el frontend.
7. Ejecutar pruebas funcionales y de aislamiento multiempresa.

No desplegar backend o frontend dependiente de estas tablas antes de completar y verificar la migración.
