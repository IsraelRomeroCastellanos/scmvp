# Migraciones manuales de PostgreSQL

## Matrices PT/GR versionadas por empresa

La migración `20260801_002_matrices_pt_gr_empresa` crea exclusivamente la
línea base del modelo de matrices por empresa. Depende de que esté registrada
`20260728_001_modelo_integral_actividades_vulnerables` en
`schema_migrations`.

La migración 002 sigue sin autorización para producción. Antes de cualquier
consideración productiva debe probarse completa sobre una restauración
desechable y someterse a revisión técnica del UP, VERIFY y DOWN.

### Procedimiento de la migración 002

El orden de prueba de la migración 002 es:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f backend/migrations/20260801_002_matrices_pt_gr_empresa.up.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f backend/migrations/20260801_002_matrices_pt_gr_empresa.verify.sql
```

El VERIFY valida por catálogos la estructura de tablas y columnas, las seis
secuencias SERIAL y su propiedad, la estructura efectiva de constraints y los
índices. El rollback solo es admisible cuando las seis tablas creadas están
vacías. El DOWN exige primero esa misma estructura íntegra y después comprueba
la ausencia de filas antes de eliminar objetos:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f backend/migrations/20260801_002_matrices_pt_gr_empresa.down.sql
```

Esta migración no incluye carga o almacenamiento del Excel, API de borrador o
publicación, motor de cálculo, evaluaciones históricas ni frontend. Tampoco
modifica `matrices_riesgo` ni `cliente_perfil_transaccional`.

## Estado de la migración base

La evidencia operativa del 1 de agosto de 2026 confirma que la migración
`20260728_001_modelo_integral_actividades_vulnerables` está registrada en la
base desplegada. Es la dependencia obligatoria de la migración de matrices y
no debe volver a ejecutarse sobre esa base.

## Archivos

- `20260801_002_matrices_pt_gr_empresa.up.sql`: crea las seis tablas versionadas, sus constraints e índices y registra la migración 002.
- `20260801_002_matrices_pt_gr_empresa.verify.sql`: verifica por catálogos tablas, columnas, secuencias SERIAL, constraints e índices, y muestra la identidad de base y esquema.
- `20260801_002_matrices_pt_gr_empresa.down.sql`: exige esa estructura íntegra y revierte la migración 002 solo con las seis tablas vacías.
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
- El VERIFY muestra la identidad de base y esquema; esa salida debe compararse explícitamente contra la base y el esquema del objetivo aprobado antes de continuar.
- El UP usa un advisory lock transaccional derivado de la migration key para serializar ejecuciones concurrentes; PostgreSQL lo libera automáticamente al terminar la transacción.
- Si `schema_migrations` ya existe, el UP valida su estructura mínima y aborta sin modificarla cuando es incompatible.

## Procedimiento histórico de la migración 001

Los apartados siguientes documentan exclusivamente la migración histórica 001;
no constituyen autorización ni procedimiento de producción para la migración
002.

### Comandos genéricos de la migración 001

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

### Procedimiento histórico obligatorio en base desechable para la migración 001

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

## Rollback histórico de la migración 001

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
