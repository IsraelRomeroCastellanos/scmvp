# SCMVP — Changelog de Control

Este archivo conserva hitos relevantes. El estado operativo actual se documenta en `STATUS.md`.

## 2026-06-19 — PF-EDIT-GENERAL-01 cerrado

- PR #44 mergeado a `main`.
- Merge commit: `3492522ec4bb1c9894c50b55983e2e56e8edee4c`.
- Commits integrados:
  - `8c57e90` — ampliar edición de datos generales PF.
  - `41a4a7e` — retirar campos PF derogados.
- Archivo funcional modificado:
  - `frontend/src/app/cliente/editar-cliente/[id]/page.tsx`.
- Campos PF vigentes incorporados:
  - nombres y apellidos;
  - fecha de nacimiento;
  - RFC y CURP;
  - país de nacimiento;
  - actividad económica principal;
  - identificación vigente.
- Campos derogados excluidos:
  - estado civil;
  - régimen matrimonial;
  - ocupación;
  - profesión / actividad profesional.
- QA local, Preview y Production aprobadas con interceptor.
- BC `true` y `false` preservados.
- Cero escrituras reales.
- Rama local y remota eliminadas después del cierre.

## 2026-06 — UX-BRAND-01 integrado

- PR #43 mergeado antes de PF-EDIT-GENERAL-01.
- Merge commit base: `be893e8f81270e2f89a2dba43b0f2095fc00301e`.
- Marca visible consolidada: Shield by Vission.
- Logo institucional, shell oscuro y contenido claro.
- Login, dashboard, clientes y administración actualizados.
- Responsive y accesibilidad básica validados.
- Roles y permisos conservados.

## 2026-06 — Beneficiario Controlador unificado

Frentes integrados:

- BC-UNIFY-BE1A
- BC-UNIFY-FE1A
- BC-UNIFY-FE2A
- BC-UNIFY-PRINT1

Resultado consolidado:

- Contrato canónico:
  - `beneficiarios_controladores_aplica`
  - `beneficiarios_controladores`
- Registrar:
  - PF condicionado por manifestación;
  - PM y FID obligatorios;
  - BC siempre Persona Física;
  - autocoincidencia RFC/CURP bloqueada;
  - escritura exclusivamente canónica.
- Editar:
  - mismas reglas PF/PM/FID;
  - lectura legacy temporal;
  - escritura exclusivamente canónica;
  - Recursos de terceros retirado de Editar PF;
  - Observaciones retirado.
- Impresión:
  - una sola sección BC;
  - PF muestra Aplica Sí/No;
  - PM/FID imprimen filas BC;
  - sin Recursos de terceros;
  - sin Dueños / Beneficiarios duplicado;
  - sin Observaciones visibles.

## 2026-06-16 — incidencia protegida cliente 67

- Se confirmó un PUT real durante QA a `/api/cliente/clientes/67`.
- Fecha: `2026-06-16T06:03:52.87196317Z`.
- Alcance histórico: indeterminado.
- Estado posterior: estructuralmente válido.
- No se restauró ni se volvió a modificar.
- Evidencia preservada fuera del repositorio.
- SHA-256: `1a520ca596c87724acd26eeb44200ac3e1a278338b4eb1776472a62b59e418f3`.
- El ID `67` quedó protegido para QA.
- Los IDs `99`, `100` y `101` permanecen protegidos como registros accidentales.
- No se documentan datos personales.

## 2026-05 a 2026-06 — Clientes y QA post-D2

- Domicilio inteligente en Registrar y Editar.
- Actividad económica PF y giro PM consolidados.
- Impresión base PF y PM integrada.
- Correcciones de captura PF/PM y Beneficiario Controlador.
- U1D-BE1 y U1D-FE1 integrados para activar/desactivar usuarios.
- Tags y checkpoints anteriores permanecen como historial; no representan el estado actual de main.

## Historial anterior

Los hitos de 2025 y enero de 2026 correspondieron a etapas iniciales de estabilización, migraciones de backend y recuperación de rutas. Sus URLs, pendientes y tags no deben interpretarse como estado operativo vigente.
