# PLD VISSION / SCMVP

## Checkpoint de infraestructura operativa — 2026-08-06

- Backend vigente: https://scmvp-nxtj.onrender.com
- DB lógica vigente: `scmvp_q69o`.
- `scmvp-1jhq.onrender.com` y `scmvp_0plk` quedan clasificados como infraestructura histórica/anterior.
- Este cambio documental no acredita por sí mismo que las migraciones 002 o 003 hayan sido ejecutadas.
- La migración 002 continúa documentada como no autorizada y no ejecutada en producción, salvo evidencia posterior expresa.

## Resumen técnico ejecutivo — Lote 2: Gestión de matriz por empresa

### Situación actual

- Rama confirmada: `main`.
- Base: `5dc8596`; PR más reciente `#97`, fusionado.
- Commit de merge actual: `5dc8596 Merge pull request #97 from
  IsraelRomeroCastellanos/feat/lote-2d-bloqueo-frontend-sin-matriz`.
- La migración 001 está registrada en la base desplegada.
- La migración 002 está versionada, pero **no se ha ejecutado en producción**.
- El backend ya gestiona empresas, configuración PLD y clientes con aislamiento
  por empresa.
- Los Lotes 2A, 2B, 2C y 2D están implementados y fusionados mediante los PR
  `#94`, `#95`, `#96` y `#97`, respectivamente.
- Existe consulta reutilizable, indicador en los DTO y bloqueo en backend y
  frontend. No existe todavía gestión administrativa completa de matrices.

### Objetivo

El objetivo de los Lotes 2A–2D quedó cerrado: hacer exigible la condición de
matriz utilizable antes del alta de clientes. El siguiente objetivo es definir
el Lote 2E para la gestión administrativa mínima, sin declarar como existentes
el motor PT/GR, la evaluación histórica ni un despliegue productivo dependiente
de la migración 002.

### Regla aprobada

La empresa puede crearse sin matriz. No puede crear clientes hasta tener una
versión de su propia empresa con:

```text
estado_editorial = PUBLICADA
activa = TRUE
```

El bloqueo existe en backend y frontend. El backend es la autoridad y la
empresa autorizada no puede sustituirse mediante body, query o controles del
navegador.

### Infraestructura existente confirmada

- Migración 002 con seis tablas definidas:
  `matriz_empresa_version`, `matriz_criterio`, `matriz_opcion`,
  `matriz_rango`, `matriz_regla` y `matriz_archivo_fuente`.
- Estados editoriales: `BORRADOR`, `VALIDADA`, `PUBLICADA`.
- Máximo una matriz activa por empresa mediante índice único parcial.
- Rutas actuales de empresas:
  `GET /api/admin/empresas`, `GET /api/admin/empresas/:id`,
  `POST /api/admin/empresas`, `PUT /api/admin/empresas/:id`.
- Rutas de integración con clientes:
  `GET /api/cliente/mi-empresa` y
  `POST /api/cliente/registrar-cliente`.
- Servicios existentes: `actividades-vulnerables.service.ts` y
  `auth.service.ts`.
- Servicio reutilizable `backend/src/services/matrices-empresa.service.ts`,
  con `hasPublishedActiveCompanyMatrix` y consulta por empresa con
  `estado_editorial = 'PUBLICADA'` y `activa = TRUE`.
- Indicador `tiene_matriz_publicada_activa` expuesto en
  `GET /api/admin/empresas`, `GET /api/admin/empresas/:id` y
  `GET /api/cliente/mi-empresa`; el listado usa consulta agrupada para evitar
  N+1.
- `POST /api/cliente/registrar-cliente` valida la existencia de la empresa y,
  dentro de la transacción y antes de insertar, exige matriz publicada y activa.
- El frontend normaliza el indicador como `true`/`false`/`null`, bloquea el
  acceso desde el listado y el formulario, conserva `empresaSel = all` para
  admin y evita que los errores del indicador sustituyan el listado.
- `req.user` contiene `id`, `email`, `rol` y `empresa_id`, con contrato distinto
  para admin frente a consultor/cliente.
- `exceljs` y `express-fileupload` figuran como dependencias, pero esto no
  demuestra un flujo de carga de matrices implementado.

### Lotes cerrados

- **2A — PR #94:** servicio y consulta reutilizable.
- **2B — PR #95:** indicador en los tres endpoints y consulta agrupada sin N+1.
- **2C — PR #96:** validación transaccional previa a la inserción y respuesta
  `409` con el mensaje: “No es posible registrar clientes para esta empresa
  porque aún no cuenta con una matriz PT/GR publicada y activa.”
- **2D — PR #97:** bloqueo defensivo de frontend en listado y formulario.

El backend conserva la autoridad final. El riesgo TOCTOU se acepta
temporalmente hasta que existan flujos coordinados de publicación y activación.

### Validaciones realizadas

- builds de frontend correctos;
- TypeScript sin errores;
- `git diff --check` limpio;
- revisiones independientes aprobadas;
- cambios limitados al alcance.

### Pendientes

- migración 002 versionada, pero no ejecutada ni autorizada en producción;
- gestión administrativa para crear borrador, cargar estructura, validar,
  publicar, activar/desactivar y sustituir versión;
- motor PT/GR y evaluación histórica;
- pruebas automatizadas completas;
- pruebas controladas reales con empresa sin matriz y con matriz activa;
- pruebas por rol, manipulación de `empresa_id` y regresión integral de PF,
  PM, Fideicomiso y Recursos de Terceros.

### Fuera de alcance

- Ejecución productiva de la migración 002.
- Importación, validación, vista previa y publicación completa de Excel.
- Motor PT/GR, evaluaciones históricas y correo.
- Clasificaciones globales, GAFI y regímenes fiscales.
- Proveedor de almacenamiento o cifrado.
- Cambios a tablas operativas actuales, `usuarios.empresa_id`, PF, PM,
  Fideicomiso, Recursos de Terceros, `datos_completos` o `deepMerge`.

### Riesgos y controles

| Riesgo | Control requerido |
|---|---|
| Confiar en el frontend | Validación implementada y obligatoria en backend. |
| Usar empresa manipulada | Derivar tenant de `req.user` para consultor/cliente y validar selección admin. |
| Bloqueo después de insertar | Comprobar matriz dentro del flujo transaccional y antes de mutaciones. |
| Confundir SQL versionado con producción | Mantener explícito que la migración 002 no está aplicada. |
| Romper capturas existentes | Regresión de PF, PM, Fideicomiso, terceros y contratos actuales. |
| Exponer auditoría manipulable | Tomar identificadores futuros de `req.user.id`, no del body. |
| Ampliar el lote | Implementar cambios pequeños y excluir motor/importación/publicación. |
| Cambio concurrente de estado de matriz (TOCTOU) | Riesgo aceptado temporalmente hasta coordinar los flujos de publicación/activación. |

### Dependencias del Lote 2E

- Inspección de contratos existentes y aprobación previa de API, estados,
  permisos, auditoría y estrategia transaccional.
- Migración 001 aplicada, ya confirmada.
- Migración 002 probada en restauración desechable y autorizada antes de que
  un backend dependiente de sus tablas pueda desplegarse.
- Preservación del aislamiento multiempresa y de los contratos actuales.

### Próximo bloque de trabajo

El próximo paso inmediato es únicamente definir, inspeccionar y aprobar el
contrato técnico del Lote 2E antes de programar. La secuencia futura objetivo es:

```text
crear borrador -> cargar estructura -> validar -> publicar -> activar
```

Antes de programar deben aprobarse los contratos indicados en dependencias. No
se ejecutará la migración 002 sin autorización separada.

### Estado de producción

La migración `20260801_002_matrices_pt_gr_empresa` no está ejecutada ni
autorizada en producción. En consecuencia, la gestión funcional de matrices y
el bloqueo dependiente de esas tablas tampoco deben declararse desplegados.
