<!-- GAP-MAP-DOC-01:START -->
# SCMVP — GAP_MAP_01

## 1. Identificación

| Campo | Valor |
|---|---|
| Proyecto | SCMVP — Sistema de Cumplimiento |
| Documento | Mapa canónico de brechas, alcance y pronóstico |
| Frente documental | GAP-MAP-DOC-01 |
| Base auditada | `dedffc8dd32515262b100610b3ae4eb6104e25a9` |
| Tag de referencia | `stable-authz-20260628` |
| Fecha de auditoría | 2026-06-29 |
| Naturaleza | Auditoría técnica y visual read-only |
| Escrituras de negocio | 0 |
| Modificaciones durante GAP-MAP-01 | 0 |
| Fuentes | Código versionado, Production, contratos frontend/backend, red, DOM y documentación |
| Frontend Production | `https://scmvp.vercel.app` |
| Backend vigente | `https://scmvp-nxtj.onrender.com` |

La evidencia visual utilizada contiene datos de prueba o datos personales visibles en Production. Las capturas no se incorporan a este repositorio y deben mantenerse como evidencia restringida del proyecto.

## 2. Resumen ejecutivo

SCMVP cuenta con una base estable de autenticación, autorización, navegación por roles y gestión principal de clientes. El listado de empresas está operativo; el registro, edición, consulta e impresión de clientes disponen de una base funcional; existe infraestructura inicial para códigos postales; y las demos de Grado de Riesgo y Perfil Transaccional permanecen deshabilitadas en Production.

El alcance todavía no puede considerarse cerrado por cuatro razones principales:

1. Hay funciones visibles cuya integración backend está incompleta: Crear/Editar empresa y Carga Masiva.
2. Hay información simulada presentada sin advertencia como si proviniera de Production: Dashboard, actividad reciente y estado de servicios.
3. El formato de impresión conserva identificadores técnicos, valores sin normalizar, ausencia de identidad por empresa y texto legal provisional.
4. Persisten brechas de experiencia, datos y presentación: Beneficiario Controlador PF, catálogo postal mínimo, campos obsoletos y página pública parcialmente alineada con Shield.

También existe una ruta técnica residual, `/test-css`, accesible públicamente con HTTP 200. No contiene información sensible, pero no debe formar parte de la superficie pública final.

Las prioridades quedan congeladas así:

- **P0:** contención o bloqueo operativo.
- **P1:** necesario para cierre funcional.
- **P2:** evolución futura o deuda técnica.
- **Administrativa:** pendiente separado sin impacto funcional inmediato.

No se utilizan porcentajes globales de avance. Las estimaciones expresan rangos y confianza; no constituyen fechas compromiso.

## 3. Alcances diferenciados

### 3.1 Alcance de cierre funcional actual

Incluye:

- GAP-03 — CRUD de empresas.
- GAP-04 — identidad empresarial e impresión formal.
- GAP-06 — Carga Masiva end-to-end.
- GAP-07 — contención del Dashboard simulado.
- GAP-11 — retiro o bloqueo de `/test-css`.
- GAP-01 — UX de Beneficiario Controlador PF.
- GAP-02 — catálogo nacional de códigos postales.
- GAP-05 — depuración de campos del cliente.
- GAP-08 — presentación pública institucional.
- regresión integral, documentación y release.

### 3.2 Mejoras posteriores

Pueden ejecutarse después del cierre funcional:

- Dashboard conectado a métricas y monitoreo reales.
- indicadores operativos avanzados;
- refinamientos adicionales de presentación;
- higiene controlada del árbol fuente.

### 3.3 Épicas separadas

Quedan fuera del pronóstico de cierre inmediato:

- GAP-09 — Grado de Riesgo.
- GAP-10 — Perfil Transaccional.
- monitoreo transaccional;
- alertas y matrices configurables;
- historial avanzado.

### 3.4 Deuda técnica y pendientes administrativos

- GAP-12 — higiene del árbol fuente.
- proyecto Vercel accidental `scmvp-legacy-routes-preview-audit`.
- untracked y stash históricos, preservados hasta autorización específica.

## 4. Clasificación

| Categoría | Significado |
|---|---|
| P0 | Contención inmediata, función visible rota o riesgo de información engañosa |
| P1 | Necesario para considerar cerrado el alcance funcional vigente |
| P2 | Evolución futura, épica separada o deuda técnica |
| Administrativa | No afecta inmediatamente la operación de SCMVP |

## 5. Matriz ejecutiva de brechas

| ID | Nombre | Prioridad | Clasificación | Estado comprobado | Horas min/prob/max | Confianza | Frente recomendado | Orden |
|---|---|---:|---|---|---:|---|---|---:|
| GAP-11 | Ruta pública `/test-css` | P0 | Deuda / superficie residual | Pública, HTTP 200, sin datos sensibles | 1 / 2 / 4 | Alta | `PROD-SURFACE-01` | 1 |
| GAP-07 | Dashboard simulado | P0 | Defecto / información engañosa | 24, 8, 156 y 3; actividad y servicios simulados sin advertencia | 3 / 6 / 10 | Alta | `DASHBOARD-CONTENTION-01` | 2 |
| GAP-03 | CRUD de empresas | P0 | Funcionalidad parcial | Listado operativo; alta y edición frontend sin CRUD backend completo | 20 / 32 / 48 | Media | `EMPRESAS-CRUD-01` | 3 |
| GAP-06 | Carga Masiva | P0 | Funcionalidad parcial | UI y plantilla presentes; endpoint backend ausente | 20 / 34 / 54 | Media | `CARGA-MASIVA-01` | 4 |
| GAP-04 | Identidad e impresión por empresa | P0 | Parcial / ausente | Impresión de borrador sin identidad, aviso ni texto final | 26 / 44 / 72 | Baja-media | `EMPRESA-IDENTIDAD-PRINT-01` | 5 |
| GAP-01 | Beneficiario Controlador PF | P1 | UX | Contrato funcional; layout estrecho, superpuesto y distinto de PM/FID | 4 / 7 / 12 | Alta | `BC-PF-UX-01` | 6 |
| GAP-02 | Catálogo nacional de C.P. | P1 | Datos | Infraestructura existente; solo dos códigos postales | 12 / 22 / 36 | Media | `CP-MX-CATALOGO-01` | 7 |
| GAP-05 | Campos y detalle de cliente | P1 | Parcial / consistencia | Campos obsoletos visibles y superficies no alineadas | 8 / 14 / 24 | Media | `CLIENTE-CAMPOS-01` | 8 |
| GAP-08 | Página pública Shield | P1 | Presentación / UX | Diseño parcial; mensaje anterior todavía visible | 6 / 10 / 18 | Media | `SHIELD-PRESENTACION-01` | 9 |
| GAP-09 | Grado de Riesgo | P2 | Épica separada | Demo deshabilitada, localStorage, sin backend ni DB integrada | 45 / 80 / 130 | Baja | `RIESGO-EPIC-01` | Separada |
| GAP-10 | Perfil Transaccional | P2 | Épica separada | Demo deshabilitada, localStorage, sin backend ni DB integrada | 50 / 90 / 150 | Baja | `PERFIL-TRANSACCIONAL-EPIC-01` | Separada |
| GAP-12 | Higiene del árbol | P2 | Deuda técnica | Nueve auxiliares: uno tracked y ocho untracked | 3 / 6 / 10 | Alta | `REPO-HYGIENE-01` | Posterior |

## 6. Matriz detallada

### GAP-11 — Ruta técnica pública `/test-css`

1. **ID:** GAP-11.
2. **Nombre:** Retiro o bloqueo de ruta técnica pública.
3. **Descripción para usuario final:** una página de prueba de estilos es accesible desde Internet y no pertenece al producto final.
4. **Estado comprobado:** responde HTTP 200 en Production; incluye componentes de prueba y navegación institucional.
5. **Clasificación:** deuda y superficie técnica residual; P0 de contención.
6. **Evidencia:** consulta anónima en Production y revisión del archivo `frontend/src/app/test-css/page.tsx`.
7. **Frontend requerido:** retirar la ruta o convertirla en una respuesta no accesible en Production.
8. **Backend requerido:** no.
9. **DB o migración:** no.
10. **Infraestructura o datos externos:** no.
11. **Decisiones pendientes:** eliminación física o bloqueo por entorno/ruta.
12. **Dependencias:** ninguna.
13. **Riesgo:** bajo técnicamente, medio reputacional.
14. **Horas mínimas:** 1.
15. **Horas probables:** 2.
16. **Horas máximas:** 4.
17. **Confianza:** alta.
18. **Criterio de aceptación:** `/test-css` no existe en Production o no es accesible públicamente; build, Preview y Production correctos.
19. **Frente recomendado:** `PROD-SURFACE-01`.
20. **Orden recomendado:** Bloque 0, primera acción.

Estimación por fase: análisis `0.25/0.5/1`, implementación `0.25/0.5/1`, pruebas locales `0.25/0.25/0.5`, Preview `0.10/0.25/0.5`, Production `0.10/0.25/0.5`, documentación y cierre `0.05/0.25/0.5`; total `1/2/4`.

---

### GAP-07 — Dashboard y estados simulados

1. **ID:** GAP-07.
2. **Nombre:** Contención del Dashboard simulado.
3. **Descripción para usuario final:** el sistema presenta cifras, actividad reciente y estado de servicios como información real aunque son datos fijos.
4. **Estado comprobado:** Usuarios 24, Empresas 8, Clientes 156, Alertas 3; actividad reciente simulada; Base de Datos, API Backend, Autenticación y Carga Masiva al 100 % simulado; sin aviso de demostración.
5. **Clasificación:** defecto y riesgo de información engañosa; P0.
6. **Evidencia:** DOM de Production y valores hardcodeados en `frontend/src/app/dashboard/page.tsx`.
7. **Frontend requerido:** retirar las métricas o sustituir la página por contenido institucional.
8. **Backend requerido:** no para la contención; sí para un Dashboard real posterior.
9. **DB o migración:** no para la contención.
10. **Infraestructura o datos externos:** monitoreo real solo en una fase futura.
11. **Decisiones pendientes:**
   - **A:** retirar temporalmente métricas simuladas;
   - **B:** sustituir Dashboard por página institucional autenticada.
12. **Dependencias:** decisión del usuario sobre A o B; posible agrupación con GAP-08.
13. **Riesgo:** alto para confianza y toma de decisiones.
14. **Horas mínimas:** 3.
15. **Horas probables:** 6.
16. **Horas máximas:** 10.
17. **Confianza:** alta para contención; baja para un Dashboard real no definido.
18. **Criterio de aceptación:** ningún dato simulado se presenta como real; la alternativa elegida está validada por rol y en Production.
19. **Frente recomendado:** `DASHBOARD-CONTENTION-01`.
20. **Orden recomendado:** Bloque 0, después de GAP-11.

Estimación por fase: análisis `0.5/1/2`, implementación `1/2.5/4`, pruebas locales `0.5/1/1.5`, Preview `0.25/0.5/1`, Production `0.25/0.5/1`, documentación y cierre `0.5/0.5/0.5`; total `3/6/10`.

Un Dashboard conectado a métricas reales no está incluido en estas horas.

---

### GAP-03 — CRUD de empresas

1. **ID:** GAP-03.
2. **Nombre:** Completar gestión end-to-end de empresas.
3. **Descripción para usuario final:** el listado funciona, pero no es posible crear o editar empresas de forma operativa.
4. **Estado comprobado:** existen pantallas de alta y edición; el backend activo solo contiene `GET /api/admin/empresas`; no existen POST, GET individual ni PUT/PATCH de empresa; Editar muestra `Error al cargar la empresa` y campos vacíos.
5. **Clasificación:** funcionalidad parcial; CRUD backend y contrato incompletos; P0.
6. **Evidencia:** rutas frontend, `admin.routes.ts`, red y DOM de Production.
7. **Frontend requerido:** conectar alta y edición con contratos definitivos; validación, estados de carga y errores.
8. **Backend requerido:** POST, GET individual y PUT/PATCH protegidos, con validaciones y respuestas sin datos sensibles.
9. **DB o migración:** revisión obligatoria del modelo `empresas`; migración únicamente si faltan campos o restricciones requeridos.
10. **Infraestructura o datos externos:** no prevista para el CRUD básico.
11. **Decisiones pendientes:** campos definitivos, unicidad de RFC, estado de empresa, reglas de autorización y estrategia de actualización.
12. **Dependencias:** contrato y modelo antes del frontend final; GAP-04 depende de este frente.
13. **Riesgo:** alto por función visible rota y por impacto transversal de `empresa_id`.
14. **Horas mínimas:** 20.
15. **Horas probables:** 32.
16. **Horas máximas:** 48.
17. **Confianza:** media.
18. **Criterio de aceptación:** alta y edición operativas; consulta individual correcta; 401 sin sesión, 403 por rol insuficiente; validaciones coherentes; Preview y Production aprobados; sin regresión del listado.
19. **Frente recomendado:** `EMPRESAS-CRUD-01`.
20. **Orden recomendado:** Bloque 1.

Desglose ejecutable:

| Componente | Min | Probable | Máx |
|---|---:|---:|---:|
| Contrato y modelo | 3 | 5 | 8 |
| Endpoints backend | 6 | 10 | 15 |
| Alta frontend | 2 | 3 | 5 |
| Edición frontend | 2 | 4 | 6 |
| Validaciones y errores | 3 | 4 | 6 |
| QA, Preview, Production y cierre | 4 | 6 | 8 |
| **Total** | **20** | **32** | **48** |

Estimación por fase: análisis `3/5/8`, implementación `10/17/26`, pruebas locales `3/4/6`, Preview `1/2/3`, Production `1/2/3`, documentación y cierre `2/2/2`.

---

### GAP-06 — Carga Masiva

1. **ID:** GAP-06.
2. **Nombre:** Implementar Carga Masiva end-to-end.
3. **Descripción para usuario final:** la interfaz permite descargar plantilla y seleccionar CSV, pero el procesamiento real no está disponible.
4. **Estado comprobado:** plantilla, selector, lectura local y botón presentes; frontend intenta `POST /api/cliente/carga-masiva` con `csvContent`; endpoint backend ausente.
5. **Clasificación:** funcionalidad parcial; P0.
6. **Evidencia:** página frontend, búsqueda exhaustiva de backend y rutas registradas.
7. **Frontend requerido:** contrato de plantilla, vista previa, estados, resumen y errores por fila.
8. **Backend requerido:** endpoint protegido, parser, validación, procesamiento y respuesta estructurada.
9. **DB o migración:** probablemente no para el primer alcance; revisar transacciones, restricciones y trazabilidad.
10. **Infraestructura o datos externos:** límites de tamaño, memoria y tiempo de respuesta; almacenamiento temporal solo si se decide recibir archivos.
11. **Decisiones pendientes:** política atómica o parcial, límite de filas, duplicados, reintentos y formato final.
12. **Dependencias:** contrato de Registro de Cliente y validaciones vigentes.
13. **Riesgo:** alto por creación masiva, duplicados y consistencia transaccional.
14. **Horas mínimas:** 20.
15. **Horas probables:** 34.
16. **Horas máximas:** 54.
17. **Confianza:** media.
18. **Criterio de aceptación:** plantilla versionada; validación por fila; política de procesamiento documentada; permisos correctos; resumen reproducible; cero escrituras fuera del alcance esperado; QA con archivos válidos e inválidos.
19. **Frente recomendado:** `CARGA-MASIVA-01`.
20. **Orden recomendado:** Bloque 2.

Desglose ejecutable:

| Componente | Min | Probable | Máx |
|---|---:|---:|---:|
| Contrato de plantilla | 2 | 3 | 5 |
| Parser | 3 | 5 | 8 |
| Validación por fila | 4 | 7 | 11 |
| Endpoint backend | 4 | 7 | 12 |
| Política atómica o parcial | 1 | 2 | 4 |
| Errores y resumen | 2 | 3 | 5 |
| Permisos | 1 | 2 | 3 |
| QA, Preview, Production y cierre | 3 | 5 | 6 |
| **Total** | **20** | **34** | **54** |

Estimación por fase: análisis `3/5/8`, implementación `9/16/28`, pruebas locales `3/5/8`, Preview `1/2/3`, Production `1/2/3`, documentación y cierre `3/4/4`.

---

### GAP-04 — Identidad empresarial e impresión personalizada

1. **ID:** GAP-04.
2. **Nombre:** Logo, aviso, textos legales e impresión por empresa.
3. **Descripción para usuario final:** el documento imprimible es un borrador técnico y no representa formalmente a la empresa correspondiente.
4. **Estado comprobado:** sin logo por empresa, sin aviso de privacidad, Cliente ID y Empresa ID visibles, tipo y estado internos visibles, nacionalidad técnica, fechas ISO y texto `Texto a insertar (pendiente versión final)`.
5. **Clasificación:** parcial y ausente; P0.
6. **Evidencia:** formulario de empresa, impresión PF y código de PF/PM/Fideicomiso.
7. **Frontend requerido:** campos de configuración, carga de logo, previsualización e impresión final PF/PM/FID.
8. **Backend requerido:** consulta y actualización segura de identidad y textos por empresa.
9. **DB o migración:** campos o tablas para logo, aviso, textos legales, metadatos y versiones.
10. **Infraestructura o datos externos:** almacenamiento de imagen, límites, tipos permitidos, acceso y respaldo.
11. **Decisiones pendientes:** proveedor de almacenamiento, tamaño/formato de logo, texto legal aprobado, fallback y versionado.
12. **Dependencias:** GAP-03; aprobación del contenido legal.
13. **Riesgo:** alto por uso formal del documento, identidad incorrecta o texto incompleto.
14. **Horas mínimas:** 26.
15. **Horas probables:** 44.
16. **Horas máximas:** 72.
17. **Confianza:** baja-media por decisiones de almacenamiento y contenido legal.
18. **Criterio de aceptación:** logo y aviso correctos por empresa; impresión PF/PM/FID sin placeholders ni IDs técnicos; fechas y catálogos legibles; fallback definido; pruebas de impresión y Production aprobadas.
19. **Frente recomendado:** `EMPRESA-IDENTIDAD-PRINT-01`.
20. **Orden recomendado:** Bloque 3.

Desglose ejecutable:

| Componente | Min | Probable | Máx |
|---|---:|---:|---:|
| Modelo de logo y aviso | 3 | 5 | 8 |
| Almacenamiento de imagen | 4 | 7 | 12 |
| Alta/edición de empresa | 3 | 5 | 8 |
| Consulta de identidad empresarial | 2 | 3 | 5 |
| Integración impresión PF | 2 | 4 | 6 |
| Integración impresión PM | 2 | 4 | 6 |
| Integración impresión Fideicomiso | 2 | 4 | 6 |
| Depuración formal de impresión | 3 | 5 | 9 |
| QA, Preview, Production y cierre | 5 | 7 | 12 |
| **Total** | **26** | **44** | **72** |

Estimación por fase: análisis `4/7/12`, implementación `13/23/38`, pruebas locales `4/6/10`, Preview `2/3/4`, Production `1/2/3`, documentación y cierre `2/3/5`.

Calidad actual congelada: **2/5 — borrador funcional, no apto todavía como formato formal**.

---

### GAP-01 — Beneficiario Controlador PF

1. **ID:** GAP-01.
2. **Nombre:** Corrección responsiva de Beneficiario Controlador PF.
3. **Descripción para usuario final:** la sección funciona, pero es difícil de leer y capturar por campos estrechos y etiquetas superpuestas.
4. **Estado comprobado:** contrato y botón Agregar funcionales; controles comprimidos; etiquetas superpuestas; desplazamiento excesivo; integración distinta a PM/FID.
5. **Clasificación:** UX; P1.
6. **Evidencia:** DOM y captura visual de Registrar PF.
7. **Frontend requerido:** redistribución de cuadrícula, anchos, agrupación y responsive.
8. **Backend requerido:** no previsto.
9. **DB o migración:** no.
10. **Infraestructura o datos externos:** no.
11. **Decisiones pendientes:** equivalencia visual exacta con PM/FID y anchos soportados.
12. **Dependencias:** conservar contrato y validaciones vigentes.
13. **Riesgo:** medio por errores de captura y baja usabilidad.
14. **Horas mínimas:** 4.
15. **Horas probables:** 7.
16. **Horas máximas:** 12.
17. **Confianza:** alta.
18. **Criterio de aceptación:** sin superposición en anchos soportados; campos legibles; uso adecuado del espacio; equivalencia visual con PM/FID; mismo payload y validaciones.
19. **Frente recomendado:** `BC-PF-UX-01`.
20. **Orden recomendado:** Bloque 4.

Estimación por fase: análisis `1/1.5/2`, implementación `1.5/3/5`, pruebas locales `0.5/1/2`, Preview `0.25/0.5/1`, Production `0.25/0.5/1`, documentación y cierre `0.5/0.5/1`; total `4/7/12`.

---

### GAP-02 — Catálogo nacional de códigos postales

1. **ID:** GAP-02.
2. **Nombre:** Cobertura nacional de códigos postales de México.
3. **Descripción para usuario final:** el autocompletado solo reconoce dos códigos postales y obliga a captura manual en el resto del país.
4. **Estado comprobado:** infraestructura de carga y búsqueda existente; catálogo con `44100` y `44600`.
5. **Clasificación:** datos; P1.
6. **Evidencia:** `codigos_postales_mx.json`, librería de búsqueda y formularios Registrar/Editar.
7. **Frontend requerido:** integración eficiente, fallback y selección de colonias.
8. **Backend requerido:** no necesariamente; evaluar si el volumen exige servicio o API.
9. **DB o migración:** opcional según arquitectura elegida.
10. **Infraestructura o datos externos:** fuente nacional confiable, licencia, actualización y tamaño.
11. **Decisiones pendientes:** fuente, periodicidad, normalización, versionado y estrategia de distribución.
12. **Dependencias:** reglas vigentes para nacionalidad y domicilio.
13. **Riesgo:** medio por cobertura, calidad de datos y rendimiento.
14. **Horas mínimas:** 12.
15. **Horas probables:** 22.
16. **Horas máximas:** 36.
17. **Confianza:** media.
18. **Criterio de aceptación:** fuente documentada; cobertura nacional; normalización reproducible; búsqueda rápida; múltiples colonias; fallback manual; QA de muestras de diversas entidades.
19. **Frente recomendado:** `CP-MX-CATALOGO-01`.
20. **Orden recomendado:** Bloque 4.

Desglose ejecutable:

| Componente | Min | Probable | Máx |
|---|---:|---:|---:|
| Obtención de fuente | 3 | 6 | 10 |
| Normalización | 2 | 4 | 7 |
| Integración | 2 | 3 | 5 |
| Rendimiento | 1 | 2 | 3 |
| Mantenimiento futuro | 1 | 2 | 4 |
| QA de cobertura | 3 | 5 | 7 |
| **Total** | **12** | **22** | **36** |

Estimación por fase: análisis `3/6/10`, implementación `5/9/15`, pruebas locales `2/3/5`, Preview `0.5/1/2`, Production `0.5/1/2`, documentación y cierre `1/2/2`.

---

### GAP-05 — Campos y superficies del cliente

1. **ID:** GAP-05.
2. **Nombre:** Depuración coherente de campos del cliente.
3. **Descripción para usuario final:** aparecen campos obsoletos o técnicamente confusos en distintas pantallas.
4. **Estado comprobado:** Detalle muestra Alias, Cliente ID externo, porcentaje de cumplimiento y Ocupación; Registrar PF conserva Calidad migratoria; Representante legal requiere regla de visibilidad cuando tenga contenido.
5. **Clasificación:** consistencia y funcionalidad parcial; P1.
6. **Evidencia:** Registrar, Editar, Detalle, Impresión, tipos y payloads.
7. **Frontend requerido:** retirar, ocultar o condicionar campos según matriz aprobada.
8. **Backend requerido:** revisar contratos y serialización; no asumir eliminación.
9. **DB o migración:** no asumir eliminación de columnas ni datos históricos.
10. **Infraestructura o datos externos:** no.
11. **Decisiones pendientes:** destino exacto de cada campo y tratamiento histórico.
12. **Dependencias:** validación del usuario interno sobre matriz de campos.
13. **Riesgo:** medio por pérdida accidental de información o incoherencia entre superficies.
14. **Horas mínimas:** 8.
15. **Horas probables:** 14.
16. **Horas máximas:** 24.
17. **Confianza:** media.
18. **Criterio de aceptación:** matriz aprobada; superficies coherentes; payload sin campos derogados cuando corresponda; datos históricos preservados; Representante legal visible solo cuando aplique y tenga contenido.
19. **Frente recomendado:** `CLIENTE-CAMPOS-01`.
20. **Orden recomendado:** Bloque 4.

Matriz de decisión requerida:

| Campo | Registrar | Editar | Detalle | Impresión | Payload | Persistencia histórica |
|---|---|---|---|---|---|---|
| Alias | Confirmar ausencia | Confirmar ausencia | Retirar | No mostrar | Revisar | Preservar hasta decisión |
| Cliente ID externo | Confirmar ausencia | Confirmar ausencia | Retirar | No mostrar | Revisar | Preservar hasta decisión |
| % Cumplimiento | No capturar | No editar | Retirar hasta módulo real | No mostrar | No enviar como dato manual | Preservar si existe |
| Ocupación | Derogada | Derogada | Retirar | No mostrar | Revisar emisiones vacías | Preservar hasta decisión |
| Calidad migratoria | Revisar retiro | Revisar consistencia | No mostrar salvo decisión | No mostrar salvo decisión | Revisar | Preservar hasta decisión |
| Representante legal | Según tipo | Según tipo | Mostrar con contenido | Mostrar con contenido | Preservar contrato | Preservar |

Estimación por fase: análisis `2/3/5`, implementación `3/6/10`, pruebas locales `1/2/3`, Preview `0.5/1/2`, Production `0.5/1/2`, documentación y cierre `1/1/2`; total `8/14/24`.

---

### GAP-08 — Página pública Shield

1. **ID:** GAP-08.
2. **Nombre:** Presentación institucional pública.
3. **Descripción para usuario final:** el diseño usa elementos de Shield, pero el mensaje principal todavía pertenece a la identidad anterior.
4. **Estado comprobado:** texto `Bienvenido al Sistema de Cumplimiento`; estructura visual parcialmente alineada con Shield by Vission.
5. **Clasificación:** presentación y UX; P1.
6. **Evidencia:** raíz pública en Production y `frontend/src/app/page.tsx`.
7. **Frontend requerido:** identidad, contenido, llamados a la acción y responsive.
8. **Backend requerido:** no para contenido estático.
9. **DB o migración:** no.
10. **Infraestructura o datos externos:** activos e información institucional aprobados.
11. **Decisiones pendientes:** redirección a login, página institucional pública o portal mixto.
12. **Dependencias:** decisión de Dashboard A/B y contenido de marca.
13. **Riesgo:** medio reputacional.
14. **Horas mínimas:** 6.
15. **Horas probables:** 10.
16. **Horas máximas:** 18.
17. **Confianza:** media.
18. **Criterio de aceptación:** marca y contenido aprobados; navegación clara; coherencia con login y área autenticada; Preview y Production responsive.
19. **Frente recomendado:** `SHIELD-PRESENTACION-01`.
20. **Orden recomendado:** Bloque 5.

Estimación por fase: análisis `1/2/3`, implementación `2.5/4/8`, pruebas locales `1/1.5/2.5`, Preview `0.5/0.5/1`, Production `0.5/0.5/1`, documentación y cierre `0.5/1.5/2.5`; total `6/10/18`.

Puede agruparse con la alternativa B de GAP-07 para evitar duplicación.

---

### GAP-09 — Grado de Riesgo

1. **ID:** GAP-09.
2. **Nombre:** Módulo productivo de Grado de Riesgo.
3. **Descripción para usuario final:** existe una demostración, pero no un módulo persistente y auditable integrado al cliente.
4. **Estado comprobado:** demo deshabilitada en Production; bandera `NEXT_PUBLIC_MOCK_RIESGO`; persistencia en localStorage; sin backend ni DB funcional integrada.
5. **Clasificación:** épica separada; P2.
6. **Evidencia:** rutas demo, bandera de habilitación y almacenamiento local.
7. **Frontend requerido:** cuestionario, resultados, historial, permisos y experiencia aprobada.
8. **Backend requerido:** cálculo, reglas, historial, auditoría y autorización.
9. **DB o migración:** modelos de evaluación, respuestas, versiones y resultados.
10. **Infraestructura o datos externos:** matrices o catálogos si se definen.
11. **Decisiones pendientes:** definición funcional, metodología, bandas, versionado y responsables.
12. **Dependencias:** documento de definición validado.
13. **Riesgo:** alto regulatorio y de interpretación.
14. **Horas mínimas:** 45.
15. **Horas probables:** 80.
16. **Horas máximas:** 130.
17. **Confianza:** baja.
18. **Criterio de aceptación:** definición aprobada; persistencia y trazabilidad; cálculo reproducible; permisos; historial; QA integral.
19. **Frente recomendado:** `RIESGO-EPIC-01`.
20. **Orden recomendado:** épica separada, fuera del cierre inmediato.

Estimación por fase: análisis `8/14/24`, implementación `24/44/72`, pruebas locales `6/10/16`, Preview `2/4/6`, Production `2/3/5`, documentación y cierre `3/5/7`; total `45/80/130`.

---

### GAP-10 — Perfil Transaccional

1. **ID:** GAP-10.
2. **Nombre:** Módulo productivo de Perfil Transaccional.
3. **Descripción para usuario final:** existe una demo local, pero no un perfil persistente, versionado y conectado con la operación del cliente.
4. **Estado comprobado:** demo deshabilitada; localStorage; sin backend ni DB funcional integrada.
5. **Clasificación:** épica separada; P2.
6. **Evidencia:** rutas demo, bandera y almacenamiento local.
7. **Frontend requerido:** definición, captura, resultados, vigencia, historial y permisos.
8. **Backend requerido:** contratos, reglas, versionado, auditoría e integración futura.
9. **DB o migración:** perfil, respuestas, versiones, vigencias e historial.
10. **Infraestructura o datos externos:** posible integración futura con monitoreo.
11. **Decisiones pendientes:** definición funcional, periodicidad, variables y relación con Grado de Riesgo.
12. **Dependencias:** documento de definición validado.
13. **Riesgo:** alto por ambigüedad funcional y futura dependencia transaccional.
14. **Horas mínimas:** 50.
15. **Horas probables:** 90.
16. **Horas máximas:** 150.
17. **Confianza:** baja.
18. **Criterio de aceptación:** definición aprobada; persistencia, versiones y vigencias; permisos; historial; pruebas integrales.
19. **Frente recomendado:** `PERFIL-TRANSACCIONAL-EPIC-01`.
20. **Orden recomendado:** épica separada, fuera del cierre inmediato.

Estimación por fase: análisis `10/18/30`, implementación `26/50/84`, pruebas locales `7/11/18`, Preview `2/4/6`, Production `2/3/5`, documentación y cierre `3/4/7`; total `50/90/150`.

---

### GAP-12 — Higiene del árbol fuente

1. **ID:** GAP-12.
2. **Nombre:** Revisión controlada de archivos auxiliares.
3. **Descripción para usuario final:** no tiene impacto visible inmediato, pero incrementa ruido y riesgo operativo en el repositorio.
4. **Estado comprobado:** nueve auxiliares; uno tracked, `backend/src/main.ts.txt:Zone.Identifier`; ocho untracked históricos o temporales.
5. **Clasificación:** deuda técnica; P2.
6. **Evidencia:** inventario y clasificación con `git ls-files`.
7. **Frontend requerido:** solo revisión de auxiliares dentro del árbol frontend.
8. **Backend requerido:** solo revisión del archivo tracked y respaldos.
9. **DB o migración:** no.
10. **Infraestructura o datos externos:** no.
11. **Decisiones pendientes:** qué archivos eliminar, preservar o mover fuera del repositorio.
12. **Dependencias:** autorización separada y respaldo verificado.
13. **Riesgo:** bajo funcional, medio operativo si se limpia sin control.
14. **Horas mínimas:** 3.
15. **Horas probables:** 6.
16. **Horas máximas:** 10.
17. **Confianza:** alta.
18. **Criterio de aceptación:** tracked innecesario retirado con build aprobado; untracked, backups y stash tratados únicamente según autorización; inventario final documentado.
19. **Frente recomendado:** `REPO-HYGIENE-01`.
20. **Orden recomendado:** deuda controlada posterior.

Estimación por fase: análisis `0.5/1/2`, implementación `1/2/3`, pruebas locales `0.5/1/1.5`, Preview `0.25/0.5/1`, Production `0.25/0.5/1`, documentación y cierre `0.5/1/1.5`; total `3/6/10`.

No se autoriza ninguna eliminación dentro de GAP-MAP-DOC-01.

## 7. Pendiente administrativo separado

### Proyecto Vercel accidental

- Nombre: `scmvp-legacy-routes-preview-audit`.
- Estado conocido: vacío, no vinculado y sin impacto en SCMVP.
- Clasificación: administrativa.
- Acción vigente: preservar sin cambios.
- Eliminación: requiere autorización independiente.
- Relación con GAP-11: ninguna; no deben mezclarse.

## 8. Decisiones pendientes

1. Dashboard: retirar métricas simuladas o sustituirlo por página institucional.
2. Empresas: campos definitivos, restricciones y reglas de actualización.
3. Carga Masiva: política atómica o parcial, límites y duplicados.
4. Identidad empresarial: proveedor de almacenamiento, formatos y fallback.
5. Impresión: textos legales aprobados y datos técnicos que deben omitirse.
6. Códigos postales: fuente nacional, licencia, actualización y distribución.
7. Campos de cliente: matriz definitiva por superficie y tratamiento histórico.
8. Página pública: redirección, página institucional o portal mixto.
9. Grado de Riesgo: metodología y definición funcional.
10. Perfil Transaccional: variables, vigencia, historial y relación con monitoreo.

Estas decisiones abiertas no se ocultan dentro de la contingencia.

## 9. Supuestos de estimación

- Jornada efectiva: 5 a 6 horas.
- Ejecución: secuencial.
- Contingencia para alcance conocido: 15 %.
- Builds, QA responsive, despliegues y documentación compartidos se contabilizan una sola vez en los pronósticos.
- No se incluye como alcance conocido:
  - decisiones funcionales abiertas;
  - proveedores o infraestructura todavía no seleccionados;
  - licencias o fuentes de datos no confirmadas;
  - funciones nuevas no descritas;
  - hallazgos futuros.
- Los rangos de confianza baja no son fechas compromiso.

## 10. Pronósticos

### Pronóstico A — cierre funcional actual

Incluye P0, P1, regresión integral, documentación y release. Excluye Grado de Riesgo, Perfil Transaccional, monitoreo transaccional y GAP-12.

Cálculo:

| Concepto | Min | Probable | Máx |
|---|---:|---:|---:|
| Suma directa GAP-01/02/03/04/05/06/07/08/11 | 100 | 171 | 278 |
| Ahorro por QA, builds y cierres compartidos | -6 | -12 | -20 |
| Regresión integral y release | 10 | 16 | 24 |
| Base conocida | 104 | 175 | 282 |
| Contingencia 15 % | 16 | 27 | 43 |
| **Pronóstico A** | **120** | **202** | **325** |

| Escenario | Horas | Jornadas de 5–6 h | Semanas secuenciales |
|---|---:|---:|---:|
| Mínimo | 120 | 20–24 | 4–5 |
| Probable | 202 | 34–41 | 7–9 |
| Máximo | 325 | 55–65 | 11–13 |

**Confianza:** media.

### Pronóstico B — cierre funcional más épicas básicas

Agrega Grado de Riesgo y Perfil Transaccional únicamente después de validar sus definiciones.

| Concepto | Min | Probable | Máx |
|---|---:|---:|---:|
| Base conocida de Pronóstico A antes de contingencia | 104 | 175 | 282 |
| Grado de Riesgo | 45 | 80 | 130 |
| Perfil Transaccional | 50 | 90 | 150 |
| Integración transversal | 10 | 18 | 30 |
| Base conocida | 209 | 363 | 592 |
| Contingencia 15 % | 32 | 55 | 89 |
| **Pronóstico B** | **241** | **418** | **681** |

| Escenario | Horas | Jornadas de 5–6 h | Semanas secuenciales |
|---|---:|---:|---:|
| Mínimo | 241 | 41–49 | 9–10 |
| Probable | 418 | 70–84 | 14–17 |
| Máximo | 681 | 114–137 | 23–28 |

**Confianza:** baja. Es provisional y depende de definiciones aún no validadas.

### Pronóstico C — evolución extendida

Agrega solo como referencia monitoreo transaccional, alertas, matrices configurables e historial avanzado.

| Concepto | Min | Probable | Máx |
|---|---:|---:|---:|
| Base conocida de Pronóstico B antes de contingencia | 209 | 363 | 592 |
| Evolución extendida de referencia | 90 | 170 | 300 |
| Base conocida | 299 | 533 | 892 |
| Contingencia 15 % | 45 | 80 | 134 |
| **Pronóstico C** | **344** | **613** | **1026** |

| Escenario | Horas | Jornadas de 5–6 h | Semanas secuenciales |
|---|---:|---:|---:|
| Mínimo | 344 | 58–69 | 12–14 |
| Probable | 613 | 103–123 | 21–25 |
| Máximo | 1026 | 171–206 | 35–42 |

**Confianza:** baja. No representa compromiso de entrega.

## 11. Secuencia recomendada

### Bloque 0 — contención inmediata

1. Retirar o bloquear `/test-css`.
2. Retirar métricas simuladas o sustituir Dashboard por página institucional.

### Bloque 1 — empresas

1. Contrato.
2. Modelo y DB si corresponde.
3. Backend.
4. Crear empresa.
5. Editar empresa.
6. Validaciones y QA.

### Bloque 2 — Carga Masiva

1. Plantilla.
2. Parser y validación.
3. Endpoint.
4. Política de procesamiento.
5. Resumen de errores.
6. QA end-to-end.

### Bloque 3 — identidad empresarial e impresión

1. Logo.
2. Aviso y textos legales.
3. Almacenamiento.
4. Consulta por empresa.
5. Impresión PF.
6. Impresión PM.
7. Impresión Fideicomiso.
8. Depuración formal.

### Bloque 4 — UX y datos de clientes

1. Beneficiario Controlador PF.
2. Catálogo nacional de C.P.
3. Campos obsoletos.
4. Representante legal.
5. Detalles menores confirmados.

### Bloque 5 — presentación

1. Página autenticada.
2. Decisión de Dashboard/presentación.
3. Página pública Shield.

### Bloque 6 — regresión y release

1. QA integral por rol.
2. Regresión backend.
3. Preview.
4. Production.
5. Documentación.
6. Tag estable.

### Épicas separadas

- Grado de Riesgo.
- Perfil Transaccional.
- Monitoreo transaccional.

### Deuda controlada

- Higiene del árbol.
- Proyecto Vercel accidental.

## 12. Criterio de cierre del mapa

Este documento permite distinguir:

- qué está terminado;
- qué está parcial;
- qué está ausente;
- qué es exclusivamente UX;
- qué requiere backend;
- qué puede requerir DB;
- qué requiere infraestructura o datos externos;
- qué depende de decisiones;
- cuánto puede tardar;
- qué debe ejecutarse primero;
- qué queda fuera del cierre inmediato.

GAP-MAP-DOC-01 no autoriza implementación. Cada frente requiere autorización independiente.
<!-- GAP-MAP-DOC-01:END -->
