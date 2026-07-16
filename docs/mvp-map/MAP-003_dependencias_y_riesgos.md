# MAP-003 — Dependencias y riesgos

| Módulo | Depende de | Impacta | Riesgo de cambio | Regresión obligatoria |
|---|---|---|---|---|
| MAP-01 Auth | JWT_SECRET, usuarios, storage/cookies | todos | Alto | login válido/inválido/inactivo; token expirado; 401 |
| MAP-02 Dashboard | auth y decisión de producto | entrada autenticada | Alto por información engañosa | roles y ausencia de mocks no rotulados |
| MAP-03 Usuarios | auth, empresas | accesos y alcance | Alto | CRUD, roles, empresa cliente, auto-desactivación |
| MAP-04 Empresas | auth y contrato/modelo | usuarios, clientes, impresión | Alto por `empresa_id` transversal | listado + alta/edición + 401/403 + RFC duplicado |
| MAP-05 Clientes consulta | auth, empresa, JSONB | edición/impresión | Alto por aislamiento | tres roles, dos empresas, PF/PM/FID |
| MAP-06/07/08 Registro | catálogos, BC, empresa | clientes, carga | Alto por datos regulatorios | payload válido/inválido por tipo; duplicados; rollback |
| MAP-09 Edición | contrato y datos legacy | detalle/impresión | Muy alto por pérdida silenciosa | round-trip y patch parcial PF/PM/FID |
| MAP-10 BC | tipos, identidades, compatibilidad | registro/edición/impresión | Muy alto por duplicación/pérdida | aplica/no aplica, obligatorio PM/FID, autocoincidencia |
| MAP-11 Impresión | cliente y futura identidad empresa | expediente formal | Alto legal/reputacional | PF/PM/FID por empresa, print CSS, sin IDs/placeholders |
| MAP-12 Carga | registro, permisos, atomicidad | escrituras masivas | Muy alto | CSV válido/inválido/duplicado/límite; resumen; rollback |
| MAP-13 Catálogos | fuente/licencia/distribución | domicilios | Medio | CP multiestado, colonias, fallback y rendimiento |
| MAP-14 Autorización | auth y empresa_id | todos | Crítico | matriz anónimo/admin/consultor/cliente; 401 antes de 403 |
| MAP-15 Auditoría | definición y modelo | trazabilidad | Alto | REQUIERE VALIDACIÓN; no abrir fuera del MVP |
| MAP-16 Riesgo | metodología/versionado/auditoría | cumplimiento | Alto regulatorio | mantener demo aislada; no promover sin definición |
| MAP-17 Perfil | definición/transacciones/riesgo | monitoreo | Alto | mantener demo aislada; no promover sin definición |
| MAP-18 Infra | variables, Vercel, Render, schema | todos | Crítico | build; UI→API; endpoint protegido 401; conexión DB |

## Riesgos transversales operativos

1. **Contrato dinámico de cliente:** `clientes.datos_completos` y materialización en tres tablas relacionadas mezclan fuente canónica y compatibilidad legacy (`backend/src/routes/cliente.routes.ts`).
2. **Aislamiento empresarial:** toda lectura/escritura de clientes debe conservar las guardas por `empresa_id` (`backend/src/routes/cliente.routes.ts:30-105`).
3. **Configuración divergente:** existen fallbacks de backend distintos en `frontend/next.config.js`, impresión y edición; los documentos también conservan URLs históricas.
4. **Ausencia de pruebas automatizadas:** `frontend/package.json` y `backend/package.json` no declaran `test`; la evidencia de regresión es documental.
5. **Esquema no reproducible:** SQL raíz/histórico no prueba el esquema vigente y contiene estructuras no usadas por la API; validar antes de migrar.
6. **Documentación vs. árbol actual:** `/test-css`, `db/` y bootstrap están documentados pero no localizados; no asumir eliminación en Production.
