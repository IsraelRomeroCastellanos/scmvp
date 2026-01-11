// backend/src/routes/cliente.routes.ts
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import pool from '../db';

const router = Router();

/* =========================
   Helpers
========================= */

function badRequest(res: Response, msg: string) {
  return res.status(400).json({ error: msg });
}

function isNonEmptyString(v: any): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function parsePositiveInt(v: any): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function isYYYYMMDD(v: any): boolean {
  if (!isNonEmptyString(v)) return false;
  if (!/^\d{8}$/.test(v)) return false;
  const y = Number(v.slice(0, 4));
  const m = Number(v.slice(4, 6));
  const d = Number(v.slice(6, 8));
  if (y < 1900 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/* =========================
   Deep merge seguro
========================= */

function isPlainObject(v: any): v is Record<string, any> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(base: any, patch: any): any {
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch;
  const out: Record<string, any> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (isPlainObject(v) && isPlainObject(out[k])) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/* =========================
   Validación por tipo
   (POST y PUT comparten reglas)
========================= */

function validateDatosCompletosOr400(
  res: Response,
  tipo: string,
  datos: any
): boolean {
  if (!datos) return badRequest(res, 'datos_completos es obligatorio'), false;

  const contacto = datos.contacto ?? {};
  if (!isNonEmptyString(contacto?.pais))
    return badRequest(res, 'contacto.pais es obligatorio'), false;
  if (!isNonEmptyString(contacto?.telefono))
    return badRequest(res, 'contacto.telefono es obligatorio'), false;

  if (tipo === 'persona_fisica') {
    const p = datos.persona ?? {};
    if (!isNonEmptyString(p.nombres))
      return badRequest(res, 'persona.nombres es obligatorio'), false;
    if (!isNonEmptyString(p.apellido_paterno))
      return badRequest(res, 'persona.apellido_paterno es obligatorio'), false;
    if (!isNonEmptyString(p.apellido_materno))
      return badRequest(res, 'persona.apellido_materno es obligatorio'), false;
    if (!isNonEmptyString(p.rfc))
      return badRequest(res, 'persona.rfc es obligatorio'), false;
    if (!isNonEmptyString(p.curp))
      return badRequest(res, 'persona.curp es obligatorio'), false;
    if (!isNonEmptyString(p.fecha_nacimiento))
      return badRequest(res, 'persona.fecha_nacimiento es obligatorio'), false;
    if (!isYYYYMMDD(p.fecha_nacimiento))
      return badRequest(res, 'persona.fecha_nacimiento inválida (AAAAMMDD)'), false;
    if (!isNonEmptyString(p.actividad_economica))
      return badRequest(res, 'persona.actividad_economica es obligatoria'), false;
  }

  if (tipo === 'persona_moral') {
    const e = datos.empresa ?? {};
    if (!isNonEmptyString(e.rfc))
      return badRequest(res, 'empresa.rfc es obligatorio'), false;
    if (!isNonEmptyString(e.fecha_constitucion))
      return badRequest(res, 'empresa.fecha_constitucion es obligatoria'), false;
    if (!isNonEmptyString(e.giro_mercantil))
      return badRequest(res, 'empresa.giro_mercantil es obligatorio'), false;

    const r = datos.representante ?? {};
    if (!isNonEmptyString(r.nombre_completo))
      return badRequest(res, 'representante.nombre_completo es obligatorio'), false;
  }

  if (tipo === 'fideicomiso') {
    const f = datos.fideicomiso ?? {};
    if (!isNonEmptyString(f.identificador))
      return badRequest(res, 'fideicomiso.identificador es obligatorio'), false;
    if (!isNonEmptyString(f.denominacion_fiduciario))
      return badRequest(res, 'fideicomiso.denominacion_fiduciario es obligatorio'), false;
    if (!isNonEmptyString(f.rfc_fiduciario))
      return badRequest(res, 'fideicomiso.rfc_fiduciario es obligatorio'), false;

    const r = datos.representante ?? {};
    if (!isNonEmptyString(r.nombre_completo))
      return badRequest(res, 'representante.nombre_completo es obligatorio'), false;
    if (!isNonEmptyString(r.rfc))
      return badRequest(res, 'representante.rfc es obligatorio'), false;
    if (!isNonEmptyString(r.curp))
      return badRequest(res, 'representante.curp es obligatorio'), false;
    if (!isNonEmptyString(r.fecha_nacimiento))
      return badRequest(res, 'representante.fecha_nacimiento es obligatoria'), false;
    if (!isYYYYMMDD(r.fecha_nacimiento))
      return badRequest(res, 'representante.fecha_nacimiento inválida (AAAAMMDD)'), false;
  }

  return true;
}

/* =========================
   PUT /clientes/:id (ENDURECIDO)
========================= */

router.put('/clientes/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return badRequest(res, 'id inválido');

    const current = await pool.query(
      `SELECT id, tipo_cliente, datos_completos
       FROM clientes
       WHERE id=$1
       LIMIT 1`,
      [id]
    );

    if (current.rows.length === 0)
      return res.status(404).json({ error: 'Cliente no encontrado' });

    const tipo_cliente = current.rows[0].tipo_cliente as string;
    const currentDatos = current.rows[0].datos_completos ?? {};

    let nextDatos: any = null;
    if (req.body.datos_completos !== undefined) {
      nextDatos = deepMerge(currentDatos, req.body.datos_completos);
      if (!validateDatosCompletosOr400(res, tipo_cliente, nextDatos)) return;
    }

    const { nombre_entidad, nacionalidad, estado } = req.body;

    const result = await pool.query(
      `UPDATE clientes
       SET nombre_entidad = COALESCE($1, nombre_entidad),
           nacionalidad = COALESCE($2, nacionalidad),
           datos_completos = COALESCE($3, datos_completos),
           estado = COALESCE($4, estado),
           actualizado_en = NOW()
       WHERE id=$5
       RETURNING id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en`,
      [nombre_entidad, nacionalidad, nextDatos, estado, id]
    );

    return res.json({ ok: true, cliente: result.rows[0] });
  } catch (err) {
    console.error('Error al editar cliente:', err);
    return res.status(500).json({ error: 'Error al editar cliente' });
  }
});

export default router;