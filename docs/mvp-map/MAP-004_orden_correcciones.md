# MAP-004 — Orden de correcciones del MVP

| Orden | Brecha | Archivos probables | Dependencias | Riesgo | Prueba mínima | Bloquea producción |
|---:|---|---|---|---|---|---|
| 1 | Contención de `/test-css` (GAP-11) | `frontend/src/app/` (**archivo NO LOCALIZADO**); configuración Vercel | confirmar si el artefacto desplegado corresponde al código actual | Medio | GET anónimo devuelve 404/redirect; build y rutas principales | Sí, si sigue pública |
| 2 | Contención de Dashboard simulado (GAP-07) | `frontend/src/app/dashboard/page.tsx`; `frontend/src/components/Navbar.tsx` | decisión: aviso/retiro/página institucional | Alto reputacional | ningún número/actividad/estado falso sin rótulo; roles y responsive | Sí |
| 3 | CRUD de Empresas (GAP-03) | `backend/src/routes/admin.routes.ts`; páginas `frontend/src/app/admin/*empresa*` | contrato, campos, unicidad RFC, estado y alcance; modelo real | Alto transversal | POST/GET-id/PATCH; listado; 400/401/403/404/409; dos roles | Sí |
| 4 | Carga Masiva (GAP-06) | `frontend/src/app/cliente/carga-masiva/page.tsx`; `backend/src/routes/cliente.routes.ts` | contrato de Registro; atomicidad; filas/límites/duplicados | Muy alto | CSV válido, inválido y duplicado; permisos; rollback/resumen | Sí |
| 5 | Identidad e impresión por empresa (GAP-04) | `frontend/src/app/cliente/clientes/[id]/imprimir/page.tsx`; páginas empresa; `admin.routes.ts` | CRUD empresas, contenido legal, almacenamiento de logo | Alto legal | PF/PM/FID para dos empresas; sin IDs/placeholders; impresión | Sí |
| 6 | UX Beneficiario Controlador PF (GAP-01) | `frontend/src/app/cliente/registrar-cliente/ClientPage.tsx`; `validate.ts` | preservar contrato canónico y validaciones | Medio | responsive; payload idéntico; aplica sí/no; autocoincidencia | No aislado; sí para cierre |
| 7 | Catálogo nacional de códigos postales (GAP-02) | `frontend/public/catalogos/internos/codigos_postales_mx.json`; `frontend/src/lib/codigosPostalesMx.ts`; formularios | fuente/licencia/versionado/rendimiento | Medio | muestras multiestado, múltiples colonias, fallback, carga | No aislado; sí para cierre |
| 8 | Depuración de campos del cliente (GAP-05) | detalle, registro, edición e impresión bajo `frontend/src/app/cliente/` | matriz aprobada; preservar datos históricos | Alto por pérdida | PF/PM/FID; payload sin campos retirados; round-trip sin pérdida | No aislado; sí para cierre |
| 9 | Página pública Shield (GAP-08) | `frontend/src/app/page.tsx`; activos `frontend/public/brand/` | contenido aprobado y decisión Dashboard | Medio reputacional | CTA/login, marca, responsive, accesibilidad | No |
| 10 | Seguridad, regresión y liberación | `frontend/src/middleware.ts`; `backend/src/middleware/`; rutas modificadas; runbook | todos los tickets anteriores; configuración Vercel/Render | Crítico | matriz completa roles/empresa; builds; smoke read-only; Preview y Production | Sí |

## Secuencia de entrada

- Primer ticket recomendado: **PROD-SURFACE-01 — confirmar y contener `/test-css`**. Es pequeño, P0 y reduce superficie pública; como el archivo no está en el árbol actual, su primer paso es verificar el artefacto desplegado y la correspondencia commit/deploy, sin asumir que ya fue resuelto.
- Después: **DASHBOARD-CONTENTION-01**, antes de implementar métricas reales.
- CRUD Empresas debe cerrar contrato/modelo antes de identidad e impresión.
- Carga Masiva debe reutilizar las validaciones canónicas de registro, no duplicarlas sin decisión explícita.
- Riesgo, Perfil Transaccional, auditoría general e higiene del árbol permanecen fuera de este orden de cierre inmediato.
