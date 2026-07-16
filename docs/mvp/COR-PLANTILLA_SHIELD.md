# COR-PLANTILLA.md
## Plantilla operativa para tickets de corrección
### SHIELD by Vission — MVP de 2 semanas

> Usar esta plantilla para un solo ticket a la vez.  
> No mezclar módulos, no abrir frentes nuevos y no hacer refactorizaciones generales.

---

# PARTE A — ANÁLISIS DEL TICKET

## Datos del ticket

- **Ticket:** COR-XXX
- **Nombre:** [Nombre corto]
- **Módulo:** [Módulo]
- **Prioridad:** P0 / P1
- **Objetivo:** [Resultado concreto esperado]
- **Criterio de aceptación:** [Cómo sabremos que quedó resuelto]

## Prompt A para Codex

```text
COR-XXX — ANÁLISIS
Proyecto: SHIELD by Vission

OBJETIVO

Analiza únicamente el ticket COR-XXX:

[DESCRIBIR AQUÍ EL PROBLEMA Y EL RESULTADO ESPERADO]

REGLAS

1. Lee primero:
   - AGENTS.md
   - docs/mvp/SCOPE.md
   - docs/mvp/TOOLS.md
   - docs/mvp-map/MAP-001_mapa_tecnico.md
   - docs/mvp-map/MAP-003_dependencias_y_riesgos.md
   - docs/mvp-map/MAP-004_orden_correcciones.md

2. Trabaja únicamente sobre COR-XXX.

3. No modifiques archivos.

4. No instales paquetes.

5. No ejecutes migraciones, seeds, deploys ni escrituras contra Production.

6. No leas ni muestres secretos, tokens, contraseñas, DATABASE_URL o datos personales.

7. No hagas refactorizaciones generales.

8. No abras otros tickets.

9. Verifica antes:
   - pwd
   - rama actual
   - git status --short
   - HEAD actual

10. Si existen cambios de código no relacionados con COR-XXX, detente.

11. Si solo existen archivos autorizados dentro de AGENTS.md, docs/mvp/ o docs/mvp-map/, continúa.

ANÁLISIS OBLIGATORIO

1. Localiza:
   - rutas frontend;
   - componentes;
   - llamadas HTTP;
   - endpoints backend;
   - rutas o servicios backend;
   - tablas o persistencia;
   - validaciones;
   - permisos;
   - dependencias;
   - pruebas existentes.

2. Reconstruye la cadena técnica:

Pantalla
→ Componente
→ Cliente HTTP
→ Endpoint
→ Backend
→ Servicio/consulta
→ Tabla

3. Identifica:
   - causa probable;
   - archivos que deben modificarse;
   - archivos que no deben tocarse;
   - impacto en otros módulos;
   - riesgos;
   - regresiones obligatorias;
   - dudas que requieran decisión humana.

4. No propongas trabajo fuera del alcance.

RESULTADO OBLIGATORIO

Responde únicamente con:

1. Estado del ticket:
   - LISTO PARA IMPLEMENTAR
   - BLOQUEADO
   - REQUIERE DECISIÓN
   - NO REPRODUCIDO

2. Causa identificada.

3. Archivos exactos involucrados.

4. Cadena técnica.

5. Cambio mínimo recomendado.

6. Dependencias.

7. Riesgos.

8. Pruebas requeridas.

9. Decisiones pendientes.

10. Confirmación de que no modificaste archivos.

Detente al terminar.
```

---

## Revisión humana después del Prompt A

Antes de autorizar cambios, confirmar:

- [ ] La causa está sustentada con evidencia.
- [ ] Los archivos señalados corresponden al ticket.
- [ ] No se abrió otro módulo.
- [ ] El cambio propuesto es mínimo.
- [ ] Las dependencias están claras.
- [ ] Las pruebas están definidas.
- [ ] Las decisiones funcionales están resueltas.
- [ ] Se autorizó pasar a implementación.

---

# PARTE B — IMPLEMENTACIÓN DEL TICKET

## Prompt B para Codex

```text
COR-XXX — IMPLEMENTACIÓN
Proyecto: SHIELD by Vission

AUTORIZACIÓN

Se autoriza implementar únicamente COR-XXX conforme al análisis aprobado.

OBJETIVO

[DESCRIBIR AQUÍ EL RESULTADO CONCRETO]

ARCHIVOS AUTORIZADOS

- [ruta 1]
- [ruta 2]
- [ruta 3]

ARCHIVOS NO AUTORIZADOS

- cualquier archivo no listado;
- backups;
- archivos .bak;
- dumps;
- node_modules;
- dist;
- .next;
- configuración de Production;
- migraciones no autorizadas.

REGLAS

1. Trabaja únicamente en COR-XXX.

2. Realiza el cambio mínimo seguro.

3. No refactorices componentes o servicios ajenos.

4. No instales paquetes salvo autorización expresa.

5. No ejecutes migraciones, seeds, deploys ni escrituras contra Production.

6. No hagas commit, push, merge ni deploy.

7. No expongas secretos ni datos personales.

8. Si necesitas modificar un archivo no autorizado, detente y explica por qué.

9. Conserva contratos, permisos y compatibilidad existentes salvo que el ticket indique lo contrario.

IMPLEMENTACIÓN

1. Aplica el cambio únicamente en los archivos autorizados.

2. Ejecuta:
   - revisión de tipos;
   - build del módulo afectado;
   - prueba del caso objetivo;
   - regresión mínima relacionada.

3. No corrijas warnings o errores ajenos al ticket.

4. Si el build falla por una causa preexistente, documenta la evidencia y detente.

VALIDACIÓN OBLIGATORIA

Ejecuta al final:

- git diff --check
- git status --short
- git diff --stat
- git diff -- [ARCHIVOS AUTORIZADOS]

RESULTADO OBLIGATORIO

Responde únicamente con:

1. Estado:
   - IMPLEMENTADO
   - IMPLEMENTADO CON OBSERVACIONES
   - BLOQUEADO
   - NO IMPLEMENTADO

2. Archivos modificados.

3. Resumen exacto del cambio.

4. Resultado del build.

5. Resultado de la prueba objetivo.

6. Resultado de regresión.

7. Riesgos restantes.

8. Diff resumido.

9. Comandos ejecutados.

10. Confirmación de que no hiciste commit, push, merge ni deploy.

Detente al terminar.
```

---

# PARTE C — CIERRE DEL TICKET

## Checklist de cierre

- [ ] El cambio corresponde únicamente a COR-XXX.
- [ ] El diff fue revisado.
- [ ] No se modificaron archivos fuera del alcance.
- [ ] Build aprobado.
- [ ] Caso objetivo aprobado.
- [ ] Regresión aprobada.
- [ ] Permisos y roles validados.
- [ ] No hubo escrituras no autorizadas en Production.
- [ ] Evidencia registrada en MVP-CONTROL.
- [ ] PR creado y revisado.
- [ ] Ticket marcado como Cerrado.
- [ ] Fecha real registrada.

## Datos de cierre

- **Rama:**  
- **Commit:**  
- **PR:**  
- **Resultado:**  
- **Fecha:**  
- **Responsable:**  
- **Observaciones:**  

---

# Regla final

No iniciar el siguiente ticket hasta que COR-XXX esté:

- cerrado, o
- formalmente bloqueado con causa, responsable y decisión pendiente.
