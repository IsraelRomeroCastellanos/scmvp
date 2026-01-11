## 2026-01-11

- Checkpoint: Contrato único de Cliente estabilizado (PF/PM/FID) + evidencia en PROD
- BE (prod): https://scmvp-1jhq.onrender.com
- FE (prod): (pendiente: URL de Vercel)
- Nota: Para admin, endpoints de clientes requieren empresa_id explícito (ej. 32)

### Evidencia (curls)
- PF:
  - 400: persona.curp es obligatorio
  - 400: persona.fecha_nacimiento inválida (AAAAMMDD)
  - 400: persona.apellido_materno es obligatorio
  - 201: PF OK (ej. cliente id=61)
- Fideicomiso:
  - representante.fecha_nacimiento requiere formato AAAAMMDD (confirmado)
  - 201: FID OK (ej. cliente id=58)
- Seguridad:
  - GET /api/admin/__debug -> 401 sin token; 401 token basura

### Mission
- Última corrida mission: 2026-01-10 (Overall: OK)
- Log: docs/ops/mission/mission_20260110_182748.txt

---

## Semáforo

- Auth/Login: ✅
- Admin/Empresas: ✅
- Seguridad /api/admin/__debug: ✅ (protegido)
- Clientes (listado): ✅ (GET /api/cliente/clientes?empresa_id=32)
- Clientes (crear): ✅ (POST /api/cliente/registrar-cliente)
- Clientes (editar): ✅ (PUT /api/cliente/clientes/:id)
- Contrato único de cliente (docs/contratos): ✅
- Producción estable (Vercel/Render): ✅

---

## URLs

- Backend prod actual: https://scmvp-1jhq.onrender.com
- Backend viejo: https://scmvp.onrender.com (suspendido intencionalmente)
