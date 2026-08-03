# PLD VISSION / SCMVP

## Resumen técnico ejecutivo — Lote 2: Gestión de matriz por empresa

### Situación actual

- Rama confirmada: `feat/fase-2-gestion-matriz-empresa`.
- Base: `dcceca0`; PR más reciente `#92`, fusionado.
- La migración 001 está registrada en la base desplegada.
- La migración 002 está versionada, pero **no se ha ejecutado en producción**.
- El backend ya gestiona empresas, configuración PLD y clientes con aislamiento
  por empresa.
- No existe gestión funcional de matrices, servicio de matrices, endpoints de
  carga/publicación ni indicador de matriz activa en los DTO actuales.

### Objetivo

Preparar la gestión mínima de matriz PT/GR por empresa y hacer exigible la
condición de matriz utilizable antes del alta de clientes, sin implementar aún
importación Excel, publicación completa, motor PT/GR o históricos.

### Regla aprobada

La empresa puede crearse sin matriz. No puede crear clientes hasta tener una
versión de su propia empresa con:

```text
estado_editorial = PUBLICADA
activa = TRUE
```

El bloqueo debe existir en backend y frontend. El backend es la autoridad y la
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
- `req.user` contiene `id`, `email`, `rol` y `empresa_id`, con contrato distinto
  para admin frente a consultor/cliente.
- `exceljs` y `express-fileupload` figuran como dependencias, pero esto no
  demuestra un flujo de carga de matrices implementado.

### Brechas

- No existe consulta reutilizable de matriz publicada y activa.
- Los DTO de empresa no indican disponibilidad de matriz PT/GR.
- El alta de cliente no valida la existencia de matriz utilizable.
- El frontend no bloquea ni explica esta condición.
- No existen rutas ni servicio de gestión de versiones.
- No existen pruebas automatizadas detectadas.
- El flujo de auditoría hacia `creada_por`, `validada_por`, `publicada_por` y
  `cargado_por` aún no está implementado.

### Alcance

**Confirmado:** conservar la creación de empresa sin matriz y bloquear la
creación de clientes sin matriz `PUBLICADA` y activa, tanto en backend como en
frontend.

**Propuesto para implementación mínima:**

1. consulta backend parametrizada y reutilizable por `empresa_id`;
2. indicador mínimo de disponibilidad en DTO de empresa;
3. bloqueo de `POST /api/cliente/registrar-cliente` antes de insertar;
4. bloqueo defensivo y mensaje en el frontend;
5. build, pruebas controladas por rol y regresión.

**Pendiente de decisión:** nombre del indicador, contrato de error, metadatos
expuestos, primera API administrativa y estrategia de pruebas automatizadas.

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
| Confiar en el frontend | Validación obligatoria en backend. |
| Usar empresa manipulada | Derivar tenant de `req.user` para consultor/cliente y validar selección admin. |
| Bloqueo después de insertar | Comprobar matriz dentro del flujo transaccional y antes de mutaciones. |
| Confundir SQL versionado con producción | Mantener explícito que la migración 002 no está aplicada. |
| Romper capturas existentes | Regresión de PF, PM, Fideicomiso, terceros y contratos actuales. |
| Exponer auditoría manipulable | Tomar identificadores futuros de `req.user.id`, no del body. |
| Ampliar el lote | Implementar cambios pequeños y excluir motor/importación/publicación. |

### Dependencias

- Aprobación del contrato mínimo de DTO y error.
- Migración 001 aplicada, ya confirmada.
- Migración 002 probada en restauración desechable y autorizada antes de que
  un backend dependiente de sus tablas pueda desplegarse.
- Preservación del aislamiento multiempresa y de los contratos actuales.

### Criterio de cierre del lote

1. Empresa sin matriz puede crearse, pero su alta de cliente es rechazada sin
   insertar datos.
2. Empresa con matriz propia `PUBLICADA` y activa conserva el alta autorizada.
3. Backend y frontend aplican la regla; manipular `empresa_id` no la evade.
4. Admin, consultor y cliente mantienen sus alcances vigentes.
5. Builds backend/frontend, lint disponible, pruebas controladas y regresión
   resultan satisfactorios.
6. Diff limitado al alcance, `git diff --check` limpio y revisión independiente
   completada.

### Estado de producción

La migración `20260801_002_matrices_pt_gr_empresa` no está ejecutada ni
autorizada en producción. En consecuencia, la gestión funcional de matrices y
el bloqueo dependiente de esas tablas tampoco deben declararse desplegados.
