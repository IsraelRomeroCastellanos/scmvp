# Contrato funcional de la plantilla de matrices PT/GR V1 por empresa

**Estado del documento:** lógica funcional V1, cardinalidades V1, contrato físico/coordenadas V1, conjunto exhaustivo y obligatorio de combinaciones y celdas con contenido permitido V1, vacío funcional obligatorio de toda celda no autorizada, fórmulas prohibidas fuera de `C19:E19`, conservación operativa de la plantilla y tolerancia técnica aprobada ante la reserialización de la identidad física interna OOXML de las hojas, encabezados estructurales fijos PT/GR, trim técnico exclusivo para comparar encabezados estructurales, regla física `C/D/E` de una sola valoración por respuesta o condición, fila 19 y `C19:E19` de ambas hojas aprobadas como celdas que pueden permanecer vacías o contener cualquier fórmula válida representable en el XLSX, exclusivamente visual y no autoritativa, cálculo independiente del backend aprobado, validaciones mínimas de contenido, semántica y validación de rangos, normalización mínima de texto V1, límites máximos de longitud V1, modelo GR asistido con selección manual por Consultor o Administrador, vinculación explícita de cada criterio GR con uno o varios datos KYC configurada por Administrador, vinculaciones KYC completas como requisito bloqueante para el paso de `VALIDADA` a `PUBLICADA` e inmutabilidad de las vinculaciones KYC al publicarse aprobados; nombres o rutas técnicas concretas de campos KYC, normalización Unicode especial y política técnica exacta de saltos de línea, parser definitivo, diseño técnico del motor de evaluación y generación del Excel canónico final pendientes
**Versión lógica:** `PT_GR_EMPRESA_V1`
**Ámbito:** formato mediante el cual cada empresa captura su matriz de Perfil Transaccional (PT) y Grado de Riesgo (GR)

## 1. Propósito y referencia

El contrato V1 define el formato mediante el cual cada empresa captura su propia matriz PT/GR. Los archivos de ejemplo sirven para entender la estructura y los campos, pero sus preguntas, respuestas, condiciones, puntajes, rangos y textos no son reglas universales del sistema.

La referencia visual y funcional principal es `Copia de PT Y GR Caviace.xlsx`. Ese archivo muestra cómo una empresa configuró su matriz. No establece contenido, reglas, valores predeterminados ni criterios universales para otras empresas.

Este documento separa expresamente:

- **APROBADO:** lógica funcional, cardinalidades, contrato físico/coordenadas y restricciones aprobadas para V1.
- **PENDIENTE:** decisiones que requieren definición posterior y que no deben asumirse ni implementarse todavía.
- **FUERA DE ALCANCE:** componentes que este contrato no diseña ni modifica.

## 2. Aprobado

### 2.1 Estructura fija del libro V1

El libro contiene dos hojas funcionales:

1. `PERFIL TRANSACCIONAL`.
2. `GRADO DE RIESGO DE CLIENTE`.

La estructura V1 tiene las siguientes cantidades exactas:

| Hoja | Bloques o criterios | Respuestas, valores o condiciones por bloque | Resultados finales |
|---|---:|---:|---:|
| Perfil Transaccional | 4 | 3 | 3 |
| Grado de Riesgo | 4 | 3 | 3 |

Además, cada uno de los cuatro criterios de Grado de Riesgo incluye una indicación visible de dónde se toma la información del KYC.

Cualquier cambio en el número de hojas, bloques, criterios, respuestas, valores, condiciones o resultados finales corresponde a otra versión de la plantilla.

#### 2.1.1 Orden visible e identidad física interna OOXML de las hojas

La plantilla V1 no debe ser alterada estructuralmente por el usuario o la empresa. Debe conservar exactamente las dos hojas contractuales `PERFIL TRANSACCIONAL` y `GRADO DE RIESGO DE CLIENTE`, así como la estructura física V1 definida en este documento. El usuario o la empresa no debe:

- renombrar hojas;
- agregar hojas;
- eliminar hojas;
- mover o reordenar intencionalmente las hojas;
- cambiar filas o columnas contractuales;
- cambiar coordenadas;
- cambiar encabezados estructurales;
- cambiar combinaciones de celdas contractuales;
- alterar el formato físico definido por la plantilla.

La regla operativa y documental continúa siendo: **no mover ni modificar las hojas ni el formato de la plantilla**.

Sin perjuicio de esa obligación, el backend no debe depender de detalles internos no funcionales del contenedor OOXML que pueden cambiar cuando Excel u otra librería válida guarda o reserializa el archivo. No forman parte del contrato funcional:

- el orden físico interno de las hojas dentro de `workbook.xml`;
- los valores concretos de `sheetId`;
- que `PERFIL TRANSACCIONAL` corresponda necesariamente a `sheet1.xml`;
- que `GRADO DE RIESGO DE CLIENTE` corresponda necesariamente a `sheet2.xml`;
- nombres internos concretos con el patrón `sheetN.xml`.

El backend debe exigir exactamente dos hojas y los dos nombres contractuales exactos. Debe rechazar cualquier hoja adicional, faltante o con nombre distinto; resolver cada hoja mediante sus relaciones OOXML; y, después de resolverla, validar cada hoja contra la estructura física contractual que le corresponde.

Esta tolerancia técnica no autoriza al usuario o a la empresa a reordenar ni modificar la plantilla. Existe únicamente para evitar falsos positivos cuando una herramienta válida reserializa internamente el archivo XLSX sin cambiar su contenido funcional.

### 2.2 Contrato físico productivo V1 aprobado

Las coordenadas físicas observadas en `Copia de PT Y GR Caviace.xlsx` quedan congeladas y aprobadas como contrato físico productivo de la plantilla `PT_GR_EMPRESA_V1`. Las coordenadas y cardinalidades descritas en esta sección son fijas para V1; el contenido capturado por cada empresa no es universal.

Dentro de la dimensión contractual de cada hoja —`A1:G19` para `PERFIL TRANSACCIONAL` y `A1:H19` para `GRADO DE RIESGO DE CLIENTE`— solo las coordenadas expresamente autorizadas por este contrato pueden contener valor funcional o estructural. Cualquier otra celda debe permanecer funcionalmente vacía. Salvo la excepción aprobada de `C19:E19`, ninguna celda fuera de las coordenadas expresamente autorizadas puede contener fórmula.

Las celdas secundarias pertenecientes a una combinación contractual no constituyen contenido independiente: el valor funcional pertenece exclusivamente a la celda maestra de la combinación. Esta regla se refiere al contenido o valor de celda. Los estilos visuales, incluidos color, borde, fuente, ancho, alto y alineación, no constituyen contenido funcional adicional.

#### 2.2.1 Combinaciones de celdas contractuales y filas 1 y 2

El conjunto permitido y obligatorio de combinaciones de celdas de `PT_GR_EMPRESA_V1` es exactamente el siguiente:

| Hoja | Combinaciones obligatorias |
|---|---|
| `PERFIL TRANSACCIONAL` | `A1:E1`, `A2:E2`, `F3:G3` |
| `GRADO DE RIESGO DE CLIENTE` | `A1:E1`, `A2:E2`, `G3:H3`, `F4:F6`, `F8:F10`, `F12:F14`, `F16:F18` |

Este conjunto es cerrado y exhaustivo. Todas las combinaciones enumeradas forman parte del contrato físico V1 y deben existir exactamente con esas coordenadas. No se permite eliminar una combinación contractual, modificar sus coordenadas, dividirla, ampliarla, reducirla ni agregar combinaciones adicionales en ninguna de las dos hojas. Cualquier combinación no incluida en la tabla, así como la ausencia o alteración de cualquiera de las combinaciones obligatorias, debe provocar el rechazo estructural de la plantilla.

En ambas hojas, `A1:E1` corresponde físicamente al título general y `A2:E2` corresponde físicamente al sujeto obligado. Estas combinaciones quedan congeladas, pero el texto empresarial concreto contenido en las filas 1 y 2 no queda congelado por esta decisión.

#### 2.2.2 Hoja `PERFIL TRANSACCIONAL`

La hoja tiene una estructura fija de 19 filas físicas y columnas `A:G`.

| Fila o rango | Contenido observado |
|---|---|
| 1 | Título general en la combinación contractual `A1:E1`. La combinación queda congelada; el texto empresarial concreto no queda congelado. |
| 2 | Sujeto obligado en la combinación contractual `A2:E2`. La combinación queda congelada; el texto empresarial concreto no queda congelado. |
| 3 | Pregunta o bloque 1 y encabezados. |
| 4:6 | Tres respuestas del bloque 1. |
| 7 | Pregunta o bloque 2. |
| 8:10 | Tres respuestas del bloque 2. |
| 11 | Pregunta o bloque 3. |
| 12:14 | Tres respuestas del bloque 3. |
| 15 | Pregunta o bloque 4. |
| 16:18 | Tres respuestas del bloque 4. |
| 19 | Permanece físicamente presente. `C19:E19` pueden estar vacías o contener cualquier fórmula válida representable en el XLSX; las fórmulas son exclusivamente visuales y no autoritativas. |

Las coordenadas funcionales fijas son:

| Columna | Contenido observado |
|---|---|
| A | `A3`, `A7`, `A11` y `A15` contienen el nombre de cada pregunta o bloque; `A4:A6`, `A8:A10`, `A12:A14` y `A16:A18` contienen la posición de respuesta `1`, `2` o `3`. |
| B | `B4:B6`, `B8:B10`, `B12:B14` y `B16:B18` contienen el texto de las respuestas. |
| C | Posición física de `Puntaje máximo`, correspondiente a la valoración `3`. |
| D | Posición física de `Puntaje medio`, correspondiente a la valoración `2`. |
| E | Posición física de `Puntaje bajo`, correspondiente a la valoración `1`. |
| F | `F4:F6` contiene los nombres de los tres resultados finales PT. |
| G | `G4:G6` contiene los rangos de los tres resultados PT. |

En `F4:F6` se observan los nombres de los tres resultados y en `G4:G6` sus rangos textuales. Esos nombres y rangos son ejemplos de la empresa de la muestra, no contenido universal.

El mapa exhaustivo de contenido permitido para esta hoja es:

| Coordenadas | Regla exhaustiva V1 |
|---|---|
| `A1` | Título general empresarial obligatorio como texto; contenido concreto no congelado. Es la celda maestra de `A1:E1`. |
| `B1:E1` | Celdas secundarias de `A1:E1`; sin contenido independiente. |
| `F1:G1` | Deben permanecer vacías. |
| `A2` | Sujeto obligado empresarial obligatorio como texto; contenido concreto no congelado. Es la celda maestra de `A2:E2`. |
| `B2:E2` | Celdas secundarias de `A2:E2`; sin contenido independiente. |
| `F2:G2` | Deben permanecer vacías. |
| `A3`, `A7`, `A11`, `A15` | Pregunta o bloque empresarial obligatorio. |
| `B3`, `B7`, `B11`, `B15` | Encabezado estructural fijo exactamente `Descripción`, sujeto únicamente al trim técnico aprobado para comparación estructural. |
| `C3`, `D3`, `E3` | Respectivamente `Puntaje máximo`, `Puntaje medio` y `Puntaje bajo`. |
| `F3:G3` | Combinación contractual con `F3` como celda maestra y encabezado `Criterios`; `G3` no tiene contenido independiente. |
| `C7:G7`, `C11:G11`, `C15:G15` | Deben permanecer vacías. |
| `A4:A6`, `A8:A10`, `A12:A14`, `A16:A18` | Posición numérica literal `1`, `2` o `3`, en ese orden dentro de cada bloque. |
| `B4:B6`, `B8:B10`, `B12:B14`, `B16:B18` | Texto empresarial obligatorio de respuesta. |
| `C4:E6`, `C8:E10`, `C12:E14`, `C16:E18` | Exactamente una valoración numérica literal por fila conforme a la regla física: `C = 3`, `D = 2`, `E = 1`; las otras dos celdas deben permanecer vacías. |
| `F4:F6` | Tres nombres obligatorios de resultado PT. |
| `G4:G6` | Tres rangos obligatorios PT. |
| `F8:G10`, `F12:G14`, `F16:G18` | Deben permanecer vacías. |
| `C19:E19` | Pueden permanecer vacías o contener cualquier fórmula válida representable en XLSX, conforme a la excepción exclusivamente visual y no autoritativa. |
| `A19`, `B19`, `F19`, `G19` | Deben permanecer vacías. |

No se permite ningún otro contenido funcional en `A1:G19`.

#### 2.2.3 Hoja `GRADO DE RIESGO DE CLIENTE`

La hoja tiene una estructura fija de 19 filas físicas y columnas `A:H`.

| Fila o rango | Contenido observado |
|---|---|
| 1 | Título general en la combinación contractual `A1:E1`. La combinación queda congelada; el texto empresarial concreto no queda congelado. |
| 2 | Sujeto obligado en la combinación contractual `A2:E2`. La combinación queda congelada; el texto empresarial concreto no queda congelado. |
| 3 | Criterio 1 y encabezados. |
| 4:6 | Tres condiciones o respuestas del criterio 1. |
| 7 | Criterio 2. |
| 8:10 | Tres condiciones o respuestas del criterio 2. |
| 11 | Criterio 3. |
| 12:14 | Tres condiciones o respuestas del criterio 3. |
| 15 | Criterio 4. |
| 16:18 | Tres condiciones o respuestas del criterio 4. |
| 19 | Permanece físicamente presente. `C19:E19` pueden estar vacías o contener cualquier fórmula válida representable en el XLSX; las fórmulas son exclusivamente visuales y no autoritativas. |

Las coordenadas funcionales fijas son:

| Columna | Contenido observado |
|---|---|
| A | `A3`, `A7`, `A11` y `A15` contienen el nombre de cada criterio; `A4:A6`, `A8:A10`, `A12:A14` y `A16:A18` contienen la posición `1`, `2` o `3`. |
| B | `B4:B6`, `B8:B10`, `B12:B14` y `B16:B18` contienen el valor, respuesta o condición en texto libre. |
| C | Posición física de `Puntaje máximo`, correspondiente a la valoración `3`. |
| D | Posición física de `Puntaje medio`, correspondiente a la valoración `2`. |
| E | Posición física de `Puntaje bajo`, correspondiente a la valoración `1`. |
| F | Las combinaciones `F4:F6`, `F8:F10`, `F12:F14` y `F16:F18` contienen respectivamente el texto visible `Dato a usar del KYC` de los criterios 1, 2, 3 y 4. Cada combinación representa física y funcionalmente una sola indicación descriptiva por criterio. |
| G | `G4:G6` contiene los nombres de los tres resultados finales GR. |
| H | `H4:H6` contiene los rangos de los tres resultados GR. |

En `G4:G6` se observan los nombres de los tres resultados y en `H4:H6` sus rangos textuales. Esos nombres y rangos son ejemplos de la empresa de la muestra, no contenido universal.

El mapa exhaustivo de contenido permitido para esta hoja es:

| Coordenadas | Regla exhaustiva V1 |
|---|---|
| `A1` | Título general empresarial obligatorio como texto; contenido concreto no congelado. Es la celda maestra de `A1:E1`. |
| `B1:E1` | Celdas secundarias de `A1:E1`; sin contenido independiente. |
| `F1:H1` | Deben permanecer vacías. |
| `A2` | Sujeto obligado empresarial obligatorio como texto; contenido concreto no congelado. Es la celda maestra de `A2:E2`. |
| `B2:E2` | Celdas secundarias de `A2:E2`; sin contenido independiente. |
| `F2:H2` | Deben permanecer vacías. |
| `A3`, `A7`, `A11`, `A15` | Nombre empresarial obligatorio del criterio. |
| `B3`, `B7`, `B11`, `B15` | Encabezado estructural fijo exactamente `Descripción`, sujeto únicamente al trim técnico aprobado para comparación estructural. |
| `C3`, `D3`, `E3` | Respectivamente `Puntaje máximo`, `Puntaje medio` y `Puntaje bajo`. |
| `F3` | Encabezado estructural fijo `Dato a usar del KYC`. |
| `G3:H3` | Combinación contractual con `G3` como celda maestra y encabezado `Criterios`; `H3` no tiene contenido independiente. |
| `C7:H7`, `C11:H11`, `C15:H15` | Deben permanecer vacías. |
| `A4:A6`, `A8:A10`, `A12:A14`, `A16:A18` | Posición numérica literal `1`, `2` o `3`, en ese orden dentro de cada criterio. |
| `B4:B6`, `B8:B10`, `B12:B14`, `B16:B18` | Condición empresarial obligatoria. |
| `C4:E6`, `C8:E10`, `C12:E14`, `C16:E18` | Exactamente una valoración numérica literal por fila conforme a la regla física: `C = 3`, `D = 2`, `E = 1`; las otras dos celdas deben permanecer vacías. |
| `F4:F6`, `F8:F10`, `F12:F14`, `F16:F18` | Combinaciones contractuales KYC. Cada rango representa funcionalmente una sola indicación descriptiva KYC por criterio, contenida en su celda maestra; no existen tres indicaciones independientes. |
| `G4:G6` | Tres nombres obligatorios de resultado GR. |
| `H4:H6` | Tres rangos obligatorios GR. |
| `G8:H10`, `G12:H14`, `G16:H18` | Deben permanecer vacías. |
| `C19:E19` | Pueden permanecer vacías o contener cualquier fórmula válida representable en XLSX, conforme a la excepción exclusivamente visual y no autoritativa. |
| `A19`, `B19`, `F19`, `G19`, `H19` | Deben permanecer vacías. |

No se permite ningún otro contenido funcional en `A1:H19`.

La fila 19 continúa físicamente presente dentro del contrato físico V1 en ambas hojas. En `PERFIL TRANSACCIONAL` y `GRADO DE RIESGO DE CLIENTE`, las celdas `C19:E19` pueden:

- estar vacías; o
- contener cualquier fórmula válida representable en el XLSX.

Estas fórmulas son opcionales, exclusivamente visuales y no autoritativas. El backend no valida su semántica, no exige que sean `SUM()`, no exige un rango concreto, no interpreta sus referencias, no las ejecuta y no utiliza su resultado almacenado o cacheado. Su presencia o ausencia no constituye una condición para pasar de `BORRADOR` a `VALIDADA`. No representan la evaluación ni el puntaje individual de un cliente, no forman parte del cálculo autoritativo y no sustituyen el cálculo del backend.

El backend debe calcular siempre de forma independiente:

- **PT:** seleccionar una respuesta de cada uno de los cuatro bloques, tomar sus valoraciones `1`, `2` o `3`, sumar las cuatro valoraciones y determinar el resultado mediante los tres rangos configurados.
- **GR:** seleccionar una condición de cada uno de los cuatro criterios, tomar sus valoraciones `1`, `2` o `3`, sumar las cuatro valoraciones y determinar el resultado mediante los tres rangos configurados.

El backend no debe depender de que existan fórmulas en `C19:E19` ni utilizarlas para calcular o determinar el PT o el GR del cliente. El cálculo real de PT y GR se realiza siempre de forma independiente en el backend a partir de las cuatro valoraciones seleccionadas y de los rangos contractuales. Ninguna celda de la fila 19 aporta contenido funcional al cálculo del cliente.

Esta aprobación aplica únicamente a `C19:E19` de las hojas `PERFIL TRANSACCIONAL` y `GRADO DE RIESGO DE CLIENTE`. Fuera de `C19:E19`, las fórmulas no están autorizadas en ninguna celda de la plantilla V1. Si una coordenada exige texto, número o vacío, una fórmula debe rechazarse. No existe otra excepción de fórmula en V1.

#### 2.2.4 Encabezados estructurales fijos

Los únicos encabezados estructurales fijos aprobados para la hoja `PERFIL TRANSACCIONAL` son:

| Celda | Texto literal obligatorio |
|---|---|
| `B3` | `Descripción` |
| `B7` | `Descripción` |
| `B11` | `Descripción` |
| `B15` | `Descripción` |
| `C3` | `Puntaje máximo` |
| `D3` | `Puntaje medio` |
| `E3` | `Puntaje bajo` |
| `F3:G3` (celdas combinadas; `F3` es la celda maestra) | `Criterios` |

Los únicos encabezados estructurales fijos aprobados para la hoja `GRADO DE RIESGO DE CLIENTE` son:

| Celda | Texto literal obligatorio |
|---|---|
| `B3` | `Descripción` |
| `B7` | `Descripción` |
| `B11` | `Descripción` |
| `B15` | `Descripción` |
| `C3` | `Puntaje máximo` |
| `D3` | `Puntaje medio` |
| `E3` | `Puntaje bajo` |
| `F3` | `Dato a usar del KYC` |
| `G3:H3` (celdas combinadas; `G3` es la celda maestra) | `Criterios` |

En ambas hojas, `A3` no es un encabezado fijo: contiene, respectivamente, la primera pregunta PT o el primer criterio GR definido por la empresa. En particular, `GRADO DE RIESGO DE CLIENTE!B3` contiene `Descripción`; el encabezado `Criterios` se ubica en la combinación `G3:H3`, cuya celda maestra es `G3`, nunca en `B3`.

Como parte del contrato físico aprobado, `PERFIL TRANSACCIONAL` debe conservar la combinación `F3:G3` para el encabezado `Criterios`, con `F3` como celda maestra, y `GRADO DE RIESGO DE CLIENTE` debe conservar la combinación `G3:H3` para ese encabezado, con `G3` como celda maestra. Estas combinaciones pertenecen al conjunto cerrado definido en la sección 2.2.1. El parser debe validar el encabezado a partir de la celda maestra correspondiente. No debe exigir valores independientes en ambas celdas de una combinación. La celda secundaria combinada puede reflejar el valor de la maestra según la representación de ExcelJS.

Los textos concretos de las filas 1 y 2 no se congelan. Tampoco se congela ningún otro encabezado fuera de las celdas enumeradas en esta sección.

Para pasar de `BORRADOR` a `VALIDADA`, el parser puede aplicar `trim()` únicamente al valor textual de cada encabezado estructural fijo antes de compararlo con el texto aprobado. Por tanto, `Criterios ` y `Criterios` se consideran equivalentes exclusivamente para esta validación técnica. Después de `trim()`, la coincidencia debe ser exacta, incluidos mayúsculas, minúsculas, espacios internos y acentos; por ello, `criterios`, `CRITERIOS`, `Criterio` y cualquier otro texto distinto siguen siendo inválidos.

Este trim técnico existe exclusivamente para comparar encabezados estructurales. No modifica la normalización ni el contenido empresarial, no permite cambiar mayúsculas o minúsculas, eliminar acentos, colapsar espacios internos, aceptar variantes semánticas ni corregir ortografía. La validación tampoco puede alterar los encabezados.

#### 2.2.5 Regla física y funcional de valoración en columnas `C`, `D` y `E`

Esta regla es fija y obligatoria para todas las filas de respuesta de `PERFIL TRANSACCIONAL` y todas las filas de condición, respuesta o valor de `GRADO DE RIESGO DE CLIENTE`.

Aplica exactamente a las filas `4:6`, `8:10`, `12:14` y `16:18` de ambas hojas. Para cada una de esas filas:

1. Debe existir exactamente una sola celda con puntaje entre las columnas `C`, `D` y `E`.
2. La semántica física es fija: columna `C` = valoración `3`; columna `D` = valoración `2`; columna `E` = valoración `1`.
3. Si la valoración está en `C`, la celda debe contener exactamente el número `3`; si está en `D`, debe contener exactamente el número `2`; si está en `E`, debe contener exactamente el número `1`.
4. Las otras dos celdas de puntaje de la misma fila deben permanecer vacías.
5. El puntaje debe ser un valor numérico literal. No se permite texto ni una fórmula como sustituto del puntaje.
6. Ninguna fila puede tener más de una de las celdas `C`, `D` o `E` con contenido, un valor diferente del esperado por la columna ni un puntaje distinto de `1`, `2` o `3`.

Además, dentro de cada bloque de tres respuestas PT debe existir exactamente una respuesta valorada con `1`, una con `2` y una con `3`. Dentro de cada criterio de tres condiciones, respuestas o valores GR debe existir exactamente una condición, respuesta o valor con valoración `1`, uno con `2` y uno con `3`.

La regla de una sola valoración por fila no aplica a `C19:E19` de ninguna de las dos hojas. Esas celdas se rigen exclusivamente por la regla opcional y no autoritativa de fila 19 descrita en la sección 2.2.3.

### 2.3 Perfil Transaccional

Perfil Transaccional funciona de la siguiente manera:

1. Existen exactamente cuatro bloques.
2. Cada bloque representa una pregunta o aspecto definido por la empresa.
3. Cada bloque contiene exactamente tres respuestas posibles.
4. Cada respuesta tiene una valoración de `1`, `2` o `3` puntos. La valoración pertenece a la respuesta, no a la pregunta.
5. Para evaluar a un cliente se selecciona una respuesta de cada uno de los cuatro bloques.
6. Se suman los cuatro puntajes seleccionados.
7. La suma determina uno de los tres resultados finales de Perfil Transaccional configurados por la empresa.

Las preguntas, respuestas, montos, frecuencias, textos, puntajes, rangos y nombres de los resultados pertenecen a cada empresa. El contenido observado en el archivo de muestra no debe convertirse en contenido general del sistema.

### 2.4 Grado de Riesgo

Grado de Riesgo funciona de la siguiente manera:

1. Existen exactamente cuatro criterios.
2. Cada criterio tiene un nombre y un texto visible y descriptivo, definido por la empresa, que indica qué dato o datos del KYC deben consultarse.
3. Cada criterio contiene exactamente tres valores, respuestas o condiciones posibles en texto libre.
4. Los tres valores, respuestas o condiciones se capturan como texto libre, como ocurre en el archivo de muestra.
5. Cada valor, respuesta o condición tiene una valoración de `1`, `2` o `3` puntos.
6. Antes de utilizar operativamente la matriz, cada uno de los cuatro criterios debe quedar vinculado explícitamente con uno o varios datos reales disponibles en el expediente o KYC.
7. Durante la evaluación, el sistema identifica las vinculaciones técnicas configuradas para el criterio, obtiene los datos reales correspondientes del expediente y los muestra al Consultor o Administrador evaluador.
8. Junto con esos datos reales, el sistema muestra el texto visible `Dato a usar del KYC` y las tres condiciones en texto libre definidas por la empresa.
9. En V1, el sistema no interpreta automáticamente el significado de las condiciones de texto libre ni decide cuál corresponde al cliente basándose en los datos KYC.
10. Un usuario con rol Consultor o Administrador autorizado realiza manualmente la selección de la condición aplicable.
11. Al seleccionar una condición, el sistema asigna automáticamente su puntaje asociado: valoración `1`, `2` o `3` equivale, respectivamente, a `1`, `2` o `3` puntos.
12. El proceso se repite para los cuatro criterios.
13. Una vez seleccionada una condición en cada criterio, se suman los cuatro puntajes asignados.
14. El backend compara el total contra los tres rangos GR aprobados y obtiene el resultado final de Grado de Riesgo.
15. El resultado se determina exclusivamente por el puntaje y los rangos configurados, nunca por inferencia sobre el nombre del resultado.

Los criterios, textos, fuentes KYC, valores, condiciones, puntajes, rangos y nombres de los resultados pertenecen a cada empresa. El contenido observado en el archivo de muestra no debe convertirse en contenido general del sistema.

### 2.5 Alcance del texto libre en Grado de Riesgo

Los valores y condiciones de Grado de Riesgo son texto libre. En V1, ese texto documenta cuáles son las tres condiciones posibles de cada criterio; no constituye una expresión ejecutable ni define por sí mismo cómo consultar o comparar datos del expediente. El campo físico `Dato a usar del KYC` permanece como texto visible y descriptivo definido por la empresa. No funciona como clave técnica, nombre de columna SQL, ruta de objeto ni expresión ejecutable; el backend no debe interpretarlo automáticamente. Tampoco es una regla jurídica ni convierte las condiciones en lógica automática.

Por lo tanto, este contrato:

- no diseña tipos de comparación;
- no crea operadores;
- no crea un motor de rangos;
- no crea catálogos de tipo Sí/No;
- no crea expresiones ejecutables;
- no crea reglas automáticas derivadas del texto;
- no interpreta jurídicamente el texto;
- no impone claves técnicas KYC.

El Excel documenta de forma descriptiva qué dato se usa y cuáles son las tres condiciones posibles. No obliga a construir un motor semántico ni crea operadores, DSL, rangos automáticos o catálogos de condiciones. La vinculación técnica se configura y conserva separada del texto visible del Excel; no modifica el contenido original de la matriz empresarial. Puede asociar un criterio con un solo dato KYC o con varios datos KYC. Por ejemplo, la indicación visible `Tipo de cliente + País + Fecha de nacimiento o constitución` puede vincularse conceptualmente con el tipo de cliente, el país correspondiente y la fecha de nacimiento o constitución, sin que este contrato fije nombres técnicos, rutas, tablas o columnas concretas.

### 2.6 Vinculación técnica operativa KYC

Después de que la matriz pasa a `VALIDADA` y antes de publicarla, un usuario Administrador autorizado configura para cada uno de los cuatro criterios GR la vinculación explícita con uno o varios datos reales disponibles en el expediente o KYC. El Consultor no configura ni modifica estas vinculaciones. Una matriz puede permanecer temporalmente en `VALIDADA` sin las cuatro vinculaciones completas.

La vinculación pertenece a la versión de matriz correspondiente y permanece separada del texto visible `Dato a usar del KYC`. Configurarla o modificarla mientras la matriz está `VALIDADA` no altera el contenido original de la matriz empresarial. Si cualquiera de los cuatro criterios carece de su vinculación técnica obligatoria, la matriz no puede pasar de `VALIDADA` a `PUBLICADA`.

Al publicarse la versión, las cuatro vinculaciones KYC quedan asociadas a esa versión publicada y se vuelven inmutables junto con el resto de la versión. No pueden modificarse silenciosamente después de la publicación. Si se requiere cambiar cualquier vinculación KYC de una matriz ya `PUBLICADA`, debe generarse una nueva versión, que debe recorrer nuevamente el flujo correspondiente de validación, configuración KYC y publicación.

Esta regla preserva la reproducibilidad, la trazabilidad y la consistencia histórica, al evitar que una versión ya publicada cambie posteriormente qué datos del expediente utiliza para la evaluación GR.

Esta decisión aprueba el modelo funcional de vinculación, pero no define nombres de campos, rutas de objeto, tablas, columnas, SQL, *endpoints* ni una estructura JSON definitiva.

### 2.7 Roles en la evaluación y configuración GR

- **Administrador:** configura y modifica la vinculación técnica de cada criterio GR con uno o varios datos KYC mientras la versión está `VALIDADA` y sus permisos lo permitan. Las vinculaciones de una versión `PUBLICADA` son inmutables. También puede realizar la selección manual de condiciones GR conforme a sus permisos globales.
- **Consultor:** no configura ni modifica vinculaciones técnicas. Utiliza los datos mostrados mediante las vinculaciones existentes y puede realizar la selección manual de las condiciones GR para clientes de su empresa, sujeto al alcance de permisos ya definido en el proyecto.
- **Cliente:** no configura vinculaciones, no realiza la selección GR y no ve el resultado interno de Grado de Riesgo, conforme a las reglas de roles ya aprobadas.

### 2.8 Auditoría funcional de GR

El diseño técnico posterior debe permitir conservar, para cada selección manual de una condición GR:

- el criterio evaluado;
- la condición seleccionada;
- el puntaje asignado;
- el usuario que realizó la selección;
- la fecha y hora de la selección.

Este requisito es funcional. Este contrato no diseña tablas, columnas SQL ni *endpoints* para implementarlo.

Como requisito funcional futuro, el diseño técnico también debe permitir conservar, para cada configuración o modificación de una vinculación:

- el criterio GR;
- los datos KYC vinculados;
- el Administrador que realizó o modificó la vinculación;
- la fecha y hora;
- la versión de matriz a la que pertenece la vinculación.

Este requisito no define todavía tablas, SQL, *endpoints* ni una estructura JSON definitiva.

### 2.9 Contenido propio de cada empresa

La estructura y las cantidades son fijas para V1, pero el contenido de la matriz es empresarial. Cada empresa define, según corresponda:

- preguntas y aspectos de Perfil Transaccional;
- respuestas, valores y condiciones;
- criterios de Grado de Riesgo;
- indicaciones de fuentes o datos KYC;
- montos, frecuencias y demás textos;
- valoraciones de `1`, `2` o `3` asignadas a cada respuesta, valor o condición;
- rangos;
- nombres de los tres resultados finales de cada hoja.

El archivo de muestra no obliga a otra empresa a usar ninguno de sus contenidos.

### 2.10 Validaciones mínimas obligatorias de contenido

Para que una matriz `PT_GR_EMPRESA_V1` pueda pasar de `BORRADOR` a `VALIDADA`, debe cumplir todas las validaciones mínimas de contenido establecidas en esta sección. La ausencia de cualquiera de los campos obligatorios o el incumplimiento de la distribución exacta de valoraciones impide el cambio a `VALIDADA`.

Como validación estructural previa, cada hoja debe contener exactamente las combinaciones de celdas que le corresponden según la sección 2.2.1. Debe rechazarse la plantilla si falta una combinación obligatoria, si alguna fue dividida, ampliada, reducida o desplazada, o si existe cualquier combinación adicional.

También debe rechazarse estructuralmente la plantilla si existe contenido en una celda no autorizada por el mapa exhaustivo de la sección 2.2, si una celda que debe permanecer vacía contiene texto, número, fórmula u otro valor funcional, si existe una fórmula fuera de `C19:E19`, si falta contenido obligatorio o si se usa una coordenada distinta de las aprobadas para representar contenido funcional. Las celdas secundarias de una combinación contractual se validan como parte de la combinación y no como contenido independiente.

#### 2.10.1 Hoja `PERFIL TRANSACCIONAL`

Son obligatorios:

- `A1` y `A2`: respectivamente título general y sujeto obligado, ambos como texto empresarial obligatorio.
- `A3`, `A7`, `A11` y `A15`: nombre de las cuatro preguntas o bloques.
- `B3`, `B7`, `B11` y `B15`: texto estructural fijo `Descripción`, con el trim técnico aprobado.
- `A4:A6`, `A8:A10`, `A12:A14` y `A16:A18`: posiciones numéricas literales `1`, `2` y `3`, en ese orden dentro de cada bloque.
- `B4:B6`, `B8:B10`, `B12:B14` y `B16:B18`: texto de las doce respuestas.
- En cada fila de respuesta de los rangos `4:6`, `8:10`, `12:14` y `16:18` debe cumplirse la regla física de una sola valoración numérica literal en `C:D:E`: `3` exclusivamente en `C`, `2` exclusivamente en `D` o `1` exclusivamente en `E`; las otras dos celdas deben estar vacías.
- En cada uno de los cuatro bloques debe existir exactamente una respuesta con valoración `1`, una respuesta con valoración `2` y una respuesta con valoración `3`.
- `F4:F6`: nombres de los tres resultados finales de Perfil Transaccional.
- `G4:G6`: rangos de los tres resultados finales de Perfil Transaccional.

#### 2.10.2 Hoja `GRADO DE RIESGO DE CLIENTE`

Son obligatorios:

- `A1` y `A2`: respectivamente título general y sujeto obligado, ambos como texto empresarial obligatorio.
- `A3`, `A7`, `A11` y `A15`: nombre de los cuatro criterios.
- `B3`, `B7`, `B11` y `B15`: texto estructural fijo `Descripción`, con el trim técnico aprobado.
- `A4:A6`, `A8:A10`, `A12:A14` y `A16:A18`: posiciones numéricas literales `1`, `2` y `3`, en ese orden dentro de cada criterio.
- `B4:B6`, `B8:B10`, `B12:B14` y `B16:B18`: texto libre de las doce condiciones, respuestas o valores.
- En cada fila de condición, respuesta o valor de los rangos `4:6`, `8:10`, `12:14` y `16:18` debe cumplirse la regla física de una sola valoración numérica literal en `C:D:E`: `3` exclusivamente en `C`, `2` exclusivamente en `D` o `1` exclusivamente en `E`; las otras dos celdas deben estar vacías.
- En cada uno de los cuatro criterios debe existir exactamente una condición o respuesta con valoración `1`, una con valoración `2` y una con valoración `3`.
- `F4:F6`: dato u origen KYC del criterio 1.
- `F8:F10`: dato u origen KYC del criterio 2.
- `F12:F14`: dato u origen KYC del criterio 3.
- `F16:F18`: dato u origen KYC del criterio 4.
- `G4:G6`: nombres de los tres resultados finales de Grado de Riesgo.
- `H4:H6`: rangos de los tres resultados finales de Grado de Riesgo.

En cada criterio, el texto KYC ocupa físicamente una única combinación contractual: `F4:F6`, `F8:F10`, `F12:F14` o `F16:F18`, según corresponda. Cada combinación representa una sola indicación descriptiva KYC visible; no son tres indicaciones independientes. Esta representación física no cambia las reglas técnicas KYC: la validación del Excel no usa el texto como clave técnica ni define catálogos, operadores o lógica automática para interpretarlo o relacionarlo con el expediente.

La matriz debe rechazarse para el paso de `BORRADOR` a `VALIDADA` si cualquier fila de respuesta PT o cualquier fila de condición, respuesta o valor GR sujeta a la regla:

- tiene vacías las tres celdas `C`, `D` y `E`;
- tiene contenido en más de una de las celdas `C`, `D` y `E`;
- contiene en `C` un valor diferente del número `3`;
- contiene en `D` un valor diferente del número `2`;
- contiene en `E` un valor diferente del número `1`;
- contiene texto o una fórmula en lugar del valor numérico literal aprobado;
- provoca que su bloque PT o criterio GR no tenga exactamente una valoración `1`, una valoración `2` y una valoración `3`.

Estas causas de rechazo no se aplican a `C19:E19` de ninguna de las dos hojas. Que dichas celdas estén vacías o contengan cualquier fórmula válida representable en el XLSX no bloquea el paso de `BORRADOR` a `VALIDADA`. La fórmula se tolera y se ignora sin validación semántica. No existe una condición contractual `FORMULA_REQUERIDA` para la fila 19.

Estas validaciones comprueban presencia de contenido, límites máximos de longitud, distribución exacta de valoraciones y cumplimiento de la semántica y validación de rangos definida en la sección 2.11. Una matriz puede superar estas validaciones estructurales y de contenido del Excel aunque aún no tenga completas sus vinculaciones técnicas KYC. No definen todavía:

- los nombres o rutas técnicas concretas de los datos KYC disponibles para configurar las vinculaciones aprobadas;
- el parser definitivo;
- el diseño técnico del motor de evaluación, que debe respetar la selección manual aprobada.

### 2.11 Semántica y validación de rangos finales

Esta semántica es obligatoria tanto para Perfil Transaccional como para Grado de Riesgo en `PT_GR_EMPRESA_V1`.

#### 2.11.1 Base matemática

Cada evaluación contiene exactamente cuatro bloques o criterios y en cada uno se obtiene exactamente una valoración entera de `1`, `2` o `3`. Por lo tanto, el puntaje total posible es siempre un número entero entre `4` y `12`, ambos inclusive.

#### 2.11.2 Definición de los tres rangos

Cada empresa define los nombres de sus tres resultados finales y los puntos de corte de los tres rangos numéricos asociados. Los rangos observados en archivos de ejemplo, incluido el archivo de Caviace, no son valores universales.

Los tres rangos deben cumplir simultáneamente las siguientes reglas:

1. Cada rango tiene un límite inferior entero y un límite superior entero.
2. Ambos extremos son inclusivos.
3. Los tres rangos, considerados en conjunto, cubren exactamente todos los puntajes enteros desde `4` hasta `12`.
4. No existen huecos entre rangos.
5. No existen traslapes entre rangos.
6. Cada número entero entre `4` y `12` pertenece exactamente a un solo resultado.
7. Ningún rango incluye valores menores de `4` ni mayores de `12`.
8. En cada rango, el límite inferior es menor o igual al límite superior.

Son ejemplos válidos:

- Resultado A: `4 a 5`; Resultado B: `6 a 8`; Resultado C: `9 a 12`.
- Resultado A: `4 a 7`; Resultado B: `8 a 10`; Resultado C: `11 a 12`.

Son ejemplos inválidos:

- Traslape: `4 a 6`, `6 a 9`, `10 a 12`, porque el puntaje `6` pertenece a dos resultados.
- Hueco: `4 a 5`, `7 a 9`, `10 a 12`, porque el puntaje `6` no pertenece a ningún resultado.

#### 2.11.3 Fuente física e interpretación V1

Las fuentes físicas aprobadas son:

- Perfil Transaccional: `F4:F6` contiene los nombres de los tres resultados y `G4:G6` sus rangos textuales asociados.
- Grado de Riesgo: `G4:G6` contiene los nombres de los tres resultados y `H4:H6` sus rangos textuales asociados.

El formato físico observado expresa los rangos mediante textos como `4 a 6`, `7 a 9` y `10 a 12`. Para V1, primero puede eliminarse el espacio en blanco inicial y final del rango textual; después, el parser debe obtener de cada texto sus dos límites enteros y aplicar todas las reglas de esta sección. Esta obligación de interpretación V1 no define todavía el diseño ni la implementación del parser definitivo y no modifica el intervalo permitido de `4` a `12` ni las reglas de cobertura, continuidad y ausencia de traslapes.

El backend determina el resultado únicamente comparando el puntaje total calculado contra los tres rangos aprobados. No debe inferir un nivel de riesgo a partir del nombre del resultado ni asumir que el primer resultado significa "bajo", el segundo "medio" o el tercero "alto". Los nombres y los puntos de corte pertenecen a cada empresa.

#### 2.11.4 Condiciones para pasar a `VALIDADA`

Una matriz no puede pasar de `BORRADOR` a `VALIDADA` si ocurre cualquiera de las siguientes condiciones en los rangos de PT o GR:

- alguno de los tres rangos no puede interpretarse como dos enteros;
- algún valor queda fuera del intervalo de `4` a `12`;
- existe un traslape;
- existe un hueco;
- algún límite inferior es mayor que su límite superior;
- algún puntaje entero de `4` a `12` pertenece a cero resultados;
- algún puntaje entero de `4` a `12` pertenece a más de un resultado.

### 2.12 Normalización mínima de texto V1

La normalización mínima aprobada aplica al contenido textual empresarial capturado en la plantilla, incluyendo:

- nombres de preguntas PT;
- respuestas PT;
- nombres de criterios GR;
- condiciones, respuestas o valores GR;
- texto visible `Dato a usar del KYC`;
- nombres de resultados PT;
- nombres de resultados GR;
- rangos textuales, únicamente antes de su interpretación numérica.

El sistema puede eliminar los espacios en blanco al inicio y al final del texto. Por ejemplo, `  Arrendamiento directo  ` se trata funcionalmente como `Arrendamiento directo`. Un campo se considera vacío si, después de eliminar esos espacios iniciales y finales, no contiene caracteres. En consecuencia, cualquier campo textual obligatorio debe rechazarse como vacío en el paso de `BORRADOR` a `VALIDADA` cuando, después de ese recorte, no contenga texto.

Fuera de ese recorte, deben conservarse tal como fueron capturados por la empresa las mayúsculas y minúsculas, los acentos, la letra `ñ`, los signos, la puntuación, las palabras, el idioma y el contenido semántico. El sistema no debe:

- corregir ortografía;
- traducir;
- sustituir palabras;
- reinterpretar el significado;
- cambiar mayúsculas o minúsculas del contenido empresarial;
- eliminar acentos;
- convertir la letra `ñ`;
- modificar signos o puntuación;
- colapsar automáticamente espacios internos;
- eliminar o transformar automáticamente saltos de línea;
- reformular textos;
- normalizar el contenido empresarial de forma que cambie su significado.

Los textos empresariales que sigan siendo diferentes después del recorte de espacios iniciales y finales deben conservarse como textos distintos. Por ejemplo, `Persona Física` y `persona física` no deben convertirse automáticamente en el mismo texto empresarial.

Esta regla no impide que el parser aplique validaciones técnicas específicas a nombres exactos de hojas, coordenadas fijas, encabezados estructurales y demás elementos del contrato físico. Para los encabezados estructurales fijos, la comparación técnica debe aplicar exclusivamente el `trim()` aprobado en la sección 2.2.4 y exigir después una coincidencia exacta; esta regla no puede usarse para alterar ni normalizar el contenido empresarial. Las fórmulas opcionales de `C19:E19` se rigen por la regla no autoritativa de fila 19 y no son una condición de validación.

Esta decisión no define todavía normalización Unicode especial, la política técnica exacta de saltos de línea, el catálogo técnico KYC ni el parser definitivo.

### 2.12.1 Límites máximos de longitud V1

Los siguientes límites máximos son obligatorios para el contenido textual empresarial de `PT_GR_EMPRESA_V1`:

| Hoja | Tipo de contenido | Coordenadas | Máximo |
|---|---|---|---:|
| `PERFIL TRANSACCIONAL` | Preguntas | `A3`, `A7`, `A11`, `A15` | 200 caracteres |
| `PERFIL TRANSACCIONAL` | Respuestas | `B4:B6`, `B8:B10`, `B12:B14`, `B16:B18` | 500 caracteres |
| `PERFIL TRANSACCIONAL` | Nombres de resultados finales PT | `F4:F6` | 150 caracteres |
| `PERFIL TRANSACCIONAL` | Rangos textuales PT | `G4:G6` | 30 caracteres |
| `GRADO DE RIESGO DE CLIENTE` | Nombres de criterios | `A3`, `A7`, `A11`, `A15` | 200 caracteres |
| `GRADO DE RIESGO DE CLIENTE` | Condiciones, respuestas o valores en texto libre | `B4:B6`, `B8:B10`, `B12:B14`, `B16:B18` | 1000 caracteres |
| `GRADO DE RIESGO DE CLIENTE` | Texto visible `Dato a usar del KYC` | `F4:F6`, `F8:F10`, `F12:F14`, `F16:F18` | 1000 caracteres |
| `GRADO DE RIESGO DE CLIENTE` | Nombres de resultados finales GR | `G4:G6` | 150 caracteres |
| `GRADO DE RIESGO DE CLIENTE` | Rangos textuales GR | `H4:H6` | 30 caracteres |

Cada límite se evalúa después de aplicar únicamente la normalización mínima aprobada de recorte de espacios en blanco iniciales y finales. Para hacer que un texto cumpla su límite, el sistema no debe truncarlo, abreviarlo, reformularlo, sustituir palabras ni modificar su significado automáticamente.

Si cualquier campo textual obligatorio supera el máximo aplicable, la matriz no puede pasar de `BORRADOR` a `VALIDADA`. La validación debe reportar el campo o celda que excede el límite y el máximo permitido; el usuario debe corregir el archivo.

El texto descriptivo KYC de cada criterio, contenido en la celda maestra de su combinación contractual `F4:F6`, `F8:F10`, `F12:F14` o `F16:F18`, debe respetar el límite de 1000 caracteres. Cada combinación representa una sola indicación descriptiva por criterio y esta regla no transforma el texto en una clave técnica.

Estos límites no aplican a los valores numéricos de las columnas `C`, `D` y `E`, a las fórmulas opcionales `C19:E19` de ambas hojas, a las celdas vacías estructurales ni a nombres o rutas técnicas KYC futuras, que tendrán su propio diseño técnico.

### 2.13 Flujo editorial y vigencia

El flujo general de una versión de matriz es:

```text
BORRADOR -> VALIDADA -> PUBLICADA -> ACTIVA
```

- `BORRADOR` identifica una versión en preparación.
- `VALIDADA` identifica una versión que superó las validaciones estructurales, físicas y de contenido del Excel aprobadas. Puede permanecer temporalmente en este estado sin sus cuatro vinculaciones KYC completas, y un Administrador autorizado puede configurarlas mientras la versión permanezca en este estado.
- `PUBLICADA` identifica una versión publicada. Una versión `PUBLICADA`, incluidas sus cuatro vinculaciones KYC, es inmutable.
- `ACTIVA` es una condición de vigencia separada de la publicación.

Una empresa puede existir sin matriz. Sin embargo, no puede registrar clientes hasta contar con una matriz `PUBLICADA` y activa.

La validación del Excel y la configuración operativa KYC son controles distintos y se aplican en momentos diferentes del flujo:

- **`BORRADOR -> VALIDADA`:** depende exclusivamente de las validaciones estructurales, físicas y de contenido del Excel ya aprobadas. No requiere que las cuatro vinculaciones KYC estén configuradas.
- **Estado `VALIDADA`:** permite que un Administrador autorizado configure la vinculación técnica de cada uno de los cuatro criterios GR con uno o varios datos reales del expediente o KYC. La versión puede permanecer temporalmente en este estado con una configuración incompleta.
- **`VALIDADA -> PUBLICADA`:** exige que los cuatro criterios GR tengan configurada su vinculación técnica. Si falta la vinculación de cualquiera de ellos, la publicación queda bloqueada; no se permite publicar una matriz con configuración KYC incompleta.
- **Estado `PUBLICADA`:** las cuatro vinculaciones quedan asociadas a la versión publicada y son inmutables junto con el resto de la versión. Cualquier cambio posterior requiere una nueva versión y un nuevo recorrido por la validación, la configuración KYC y la publicación.
- **Estado `ACTIVA`:** como una matriz debe estar `PUBLICADA` antes de poder estar `ACTIVA`, toda matriz `ACTIVA` tiene necesariamente completas sus cuatro vinculaciones KYC.

Esta decisión no crea un estado editorial nuevo ni modifica el flujo `BORRADOR -> VALIDADA -> PUBLICADA -> ACTIVA`.

### 2.14 Configuración simplificada de reglas GR V1

El configurador V1 solicita al Administrador exclusivamente la valoración empresarial de cada condición GR: `Bajo`, `Medio` o `Alto`. El sistema persiste internamente la equivalencia `Bajo = 1`, `Medio = 2` y `Alto = 3`.

La prioridad es un detalle técnico generado por el sistema para resolver de forma determinista la coexistencia de marcas; no es una valoración jurídica o empresarial adicional. En `DESTINO_RECURSOS_GR` y `PERFIL_TRANSACCIONAL` la prioridad interna es `0`.

`alto_automatico` y `causa_codigo` no son configurables en V1. Todas las reglas guardadas por este configurador persisten `alto_automatico = false` y `causa_codigo = null`. Cualquier política especial futura requiere aprobación funcional y versionado explícitos antes de incorporarse.

Los archivos Excel y los materiales CAVIACE son referencias funcionales. No constituyen una plantilla literal de la interfaz ni definen por sí solos el flujo operativo del configurador.

## 3. Pendiente

Las siguientes decisiones no están aprobadas por este contrato y no deben inferirse del archivo de muestra:

1. Los nombres y rutas técnicas concretas de los datos KYC disponibles para las vinculaciones, así como el mecanismo técnico para obtenerlos y presentarlos al evaluador.
2. El parser funcional definitivo.
3. El diseño técnico del motor de evaluación, que debe respetar el modelo funcional aprobado de selección manual por Consultor o Administrador, asignación automática del puntaje seleccionado y comparación del total contra los rangos configurados.
4. La generación del archivo Excel canónico final.
5. La normalización Unicode especial y la política técnica exacta de saltos de línea, sin perjuicio de la conservación del contenido empresarial exigida por la normalización mínima aprobada.

Mientras estas decisiones sigan pendientes, no se consideran aprobados:

- marcadores internos;
- protección de hojas;
- puntajes de `0` a `100` o cualquier puntaje distinto de `1`, `2` o `3` para respuestas, valores o condiciones;
- fórmulas fuera de `C19:E19`, expresamente prohibidas por este contrato;
- totales visibles fuera de los controles opcionales `C19:E19` de ambas hojas;
- claves técnicas KYC;
- catálogos KYC;
- reglas especiales, salvo la configuración simplificada GR V1 definida en 2.14;
- prioridades u *overrides* distintos del mecanismo técnico GR V1 definido en 2.14;
- motores de reglas distintos del mecanismo ejecutable GR V1 definido en 2.14;
- columnas adicionales que no estén presentes en el ejemplo;
- un parser definitivo.

## 4. Fuera de alcance

Este contrato no incluye el diseño, implementación o modificación de:

- base de datos;
- rutas o *endpoints*;
- frontend;
- migraciones;
- ejecución SQL;
- parser existente;
- archivos Excel existentes;
- dependencias del proyecto;
- motor de comparación;
- interpretación jurídica automática;
- catálogos definitivos KYC;
- reglas especiales;
- motor de reglas;
- conexiones externas.

## 5. Regla de interpretación

Ante cualquier diferencia entre este contrato y una decisión anterior, prevalecen la lógica funcional, las cardinalidades y el contrato físico/coordenadas aprobados en este documento. Ningún contenido particular de `Copia de PT Y GR Caviace.xlsx` debe interpretarse como regla universal, y ninguna decisión marcada como pendiente debe implementarse como si ya estuviera aprobada.

## 6. Estado de aprobación V1

| Elemento | Estado |
|---|---|
| Lógica funcional V1 | **APROBADA** |
| Cardinalidades V1 | **APROBADAS** |
| Contrato físico/coordenadas V1 | **APROBADO** |
| Mapa exhaustivo V1 de celdas con contenido permitido y vacío funcional obligatorio de toda celda no autorizada | **APROBADO** |
| Fórmulas prohibidas fuera de `C19:E19` en ambas hojas | **APROBADO** |
| Vacío obligatorio de `A19`, `B19`, `F19`, `G19` PT y `A19`, `B19`, `F19`, `G19`, `H19` GR | **APROBADO** |
| Conjunto exhaustivo y obligatorio de combinaciones de celdas PT/GR V1 | **APROBADO** |
| Rechazo estructural ante cualquier combinación faltante, alterada o adicional | **APROBADO** |
| Combinaciones `A1:E1` y `A2:E2` en ambas hojas, sin congelar su texto empresarial | **APROBADAS** |
| Conservación operativa de la plantilla y tolerancia técnica ante identidad física interna OOXML de las hojas | **APROBADAS** |
| Encabezados estructurales fijos PT/GR, incluido `Descripción` en `B3`, `B7`, `B11` y `B15` | **APROBADOS** |
| Trim técnico exclusivo para comparación de encabezados estructurales | **APROBADO** |
| Combinaciones `F3:G3` PT y `G3:H3` GR para el encabezado `Criterios` | **APROBADAS** |
| Combinaciones KYC GR `F4:F6`, `F8:F10`, `F12:F14` y `F16:F18` como una indicación visible por criterio | **APROBADAS** |
| Regla física C/D/E de una sola valoración por respuesta/condición | **APROBADA** |
| `C19:E19` PT/GR vacías o con cualquier fórmula válida representable en el XLSX | **APROBADAS COMO EXCEPCIÓN EXCLUSIVAMENTE VISUAL, TOLERADA Y NO AUTORITATIVA** |
| Cálculo independiente del backend para PT y GR | **APROBADO** |
| Validaciones mínimas de contenido | **APROBADAS** |
| Semántica y validación de rangos | **APROBADAS** |
| Normalización mínima de texto V1 | **APROBADA** |
| Límites máximos de longitud V1 | **APROBADOS** |
| Modelo GR asistido con selección manual Consultor/Admin | **APROBADO** |
| Vinculación explícita de cada criterio GR con uno o varios datos KYC configurada por Administrador | **APROBADA** |
| Vinculaciones KYC completas como requisito bloqueante `VALIDADA -> PUBLICADA` | **APROBADAS** |
| Inmutabilidad de vinculaciones KYC al publicarse | **APROBADA** |
| Nombres/rutas técnicas concretas de campos KYC | **PENDIENTES** |
| Normalización Unicode especial y política técnica exacta de saltos de línea | **PENDIENTES** |
| Parser definitivo | **PENDIENTE** |
| Motor de evaluación en su diseño técnico, respetando el modelo funcional aprobado | **PENDIENTE** |
| Generación del Excel canónico final | **PENDIENTE** |
