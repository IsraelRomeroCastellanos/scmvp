// backend/src/routes/cliente.routes.ts
import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * Helpers
 */
function isNonEmptyString(v: any) {
  return typeof v === 'string' && v.trim().length > 0;
}

function pickEmpresaId(req: Request): number | null {
  const q = (req.query?.empresa_id as any) ?? null;
  if (q === null || q === undefined || q === '') return null;
  const n = Number(q);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

function getUser(req: Request): any {
  return (req as any).user || null;
}

function normalizeTipoCliente(v: any): 'persona_fisica' | 'persona_moral' | 'fideicomiso' | null {
  if (!isNonEmptyString(v)) return null;
  const s = v.trim();
  if (s === 'persona_fisica' || s === 'persona_moral' || s === 'fideicomiso') return s;
  return null;
}

/**
 * Validación bloqueante mínima para fideicomiso (Iteración 1)
 */
function validateFideicomisoPayload(body: any) {
  const errors: string[] = [];

  if (!isNonEmptyString(body?.nacionalidad)) {
    errors.push('nacionalidad es obligatoria');
  }

  const dc = body?.datos_completos ?? {};
  const f = dc?.fideicomiso ?? {};
  const r = dc?.representante ?? {};

  if (!isNonEmptyString(f?.denominacion_fiduciario)) errors.push('fideicomiso.denominacion_fiduciario es obligatorio');
  if (!isNonEmptyString(f?.rfc_fiduciario)) errors.push('fideicomiso.rfc_fiduciario es obligatorio');
  if (!isNonEmptyString(f?.identificador)) errors.push('fideicomiso.identificador es obligatorio');

  if (!isNonEmptyString(r?.nombre_completo)) errors.push('representante.nombre_completo es obligatorio');
  if (!isNonEmptyString(r?.fecha_nacimiento)) errors.push('representante.fecha_nacimiento es obligatorio (AAAAMMDD)');
  if (!isNonEmptyString(r?.rfc)) errors.push('representante.rfc es obligatorio');
  if (!isNonEmptyString(r?.curp)) errors.push('representante.curp es obligatorio');

  return errors;
}

/**
 * ===============================
 * GET /api/cliente/clientes
 * - admin: si manda ?empresa_id=, filtra; si no, lista todo
 * - no admin: lista por empresa_id del token (si existe), o 400
 * ===============================
 */
router.get('/clientes', authenticate, async (req: Request, res: Response) => {
  const user = getUser(req);
  const rol = user?.rol;
  const empresaIdQuery = pickEmpresaId(req);

  try {
    // admin => puede listar todo o por empresa_id
    if (rol === 'admin') {
      const { rows } = await pool.query(
        `
        SELECT *
        FROM clientes
        ${empresaIdQuery ? 'WHERE empresa_id = $1' : ''}
        ORDER BY id DESC
        LIMIT 500
        `,
        empresaIdQuery ? [empresaIdQuery] : []
      );
      return res.json({ clientes: rows });
    }

    // No admin => requiere empresa_id en token
    const empresaIdToken = Number(user?.empresa_id);
    if (!Number.isFinite(empresaIdToken) || empresaIdToken <= 0) {
      return res.status(400).json({ error: 'empresa_id inválido' });
    }

    const { rows } = await pool.query(
      `
      SELECT *
      FROM clientes
      WHERE empresa_id = $1
      ORDER BY id DESC
      LIMIT 500
      `,
      [empresaIdToken]
    );

    return res.json({ clientes: rows });
  } catch (err: any) {
    console.error('Error al listar clientes:', {
      message: err?.message,
      code: err?.code,
      detail: err?.detail,
      hint: err?.hint
    });
    return res.status(500).json({ error: 'Error al listar clientes' });
  }
});

/**
 * ===============================
 * GET /api/cliente/clientes/:id
 * - admin: puede ver cualquiera
 * - no admin: solo de su empresa_id
 * ===============================
 */
router.get('/clientes/:id', authenticate, async (req: Request, res: Response) => {
  const user = getUser(req);
  const rol = user?.rol;

  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'id inválido' });
  }

  try {
    if (rol === 'admin') {
      const r = await pool.query(SELECT * FROM clientes WHERE id = $1 LIMIT 1, [id]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
      return res.json({ cliente: r.rows[0] });
    }

    const empresaIdToken = Number(user?.empresa_id);
    if (!Number.isFinite(empresaIdToken) || empresaIdToken <= 0) {
      return res.status(400).json({ error: 'empresa_id inválido' });
    }

    const r = await pool.query(SELECT * FROM clientes WHERE id = $1 AND empresa_id = $2 LIMIT 1, [id, empresaIdToken]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    return res.json({ cliente: r.rows[0] });
  } catch (err: any) {
    console.error('Error al obtener cliente:', {
      message: err?.message,
      code: err?.code,
      detail: err?.detail,
      hint: err?.hint
    });
    return res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

/**
 * ===============================
 * POST /api/cliente/registrar-cliente
 * - Inserta con columnas mínimas para compatibilidad con BD restaurada
 * - valida fideicomiso (iteración 1)
 * ===============================
 */
router.post('/registrar-cliente', authenticate, async (req: Request, res: Response) => {
  const user = getUser(req);

  const empresa_id = Number(req.body?.empresa_id);
  if (!Number.isFinite(empresa_id) || empresa_id <= 0) {
    return res.status(400).json({ error: 'empresa_id inválido' });
  }

  const tipo_cliente = normalizeTipoCliente(req.body?.tipo_cliente);
  if (!tipo_cliente) {
    return res.status(400).json({ error: 'tipo_cliente inválido' });
  }

  if (!isNonEmptyString(req.body?.nombre_entidad)) {
    return res.status(400).json({ error: 'nombre_entidad es obligatorio' });
  }

  // Bloqueante fideicomiso
  if (tipo_cliente === 'fideicomiso') {
    const errs = validateFideicomisoPayload(req.body);
    if (errs.length) {
      // devuelve el primer error para bloquear (puedes cambiar a lista si quieres)
      return res.status(400).json({ error: errs[0] });
    }
  }

  const nacionalidad = isNonEmptyString(req.body?.nacionalidad) ? String(req.body.nacionalidad).trim() : null;
  const datos_completos = req.body?.datos_completos ?? {};

  try {
    // Nota: columnas mínimas para evitar “columna X no existe” con dumps viejos
    const q = await pool.query(
      `
      INSERT INTO clientes (empresa_id, nombre_entidad, tipo_cliente, nacionalidad, datos_completos, estado)
      VALUES ($1, $2, $3, $4, $5::jsonb, 'activo')
      RETURNING id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en
      `,
      [empresa_id, String(req.body.nombre_entidad).trim(), tipo_cliente, nacionalidad, JSON.stringify(datos_completos)]
    );

    return res.status(201).json({ ok: true, cliente: q.rows[0] });
  } catch (err: any) {
    // Duplicado típico
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'Cliente duplicado para esa empresa (empresa_id + nombre_entidad)' });
    }

    console.error('Error al registrar cliente:', {
      message: err?.message,
      code: err?.code,
      detail: err?.detail,
      hint: err?.hint,
      where: err?.where
    });

    return res.status(500).json({ error: 'Error al registrar cliente' });
  }
});

/**
 * ===============================
 * PUT /api/cliente/clientes/:id
 * - Update mínimo (compatibilidad)
 * ===============================
 */
router.put('/clientes/:id', authenticate, async (req: Request, res: Response) => {
  const user = getUser(req);
  const rol = user?.rol;

  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'id inválido' });
  }

  const nombre_entidad = isNonEmptyString(req.body?.nombre_entidad) ? String(req.body.nombre_entidad).trim() : null;
  const nacionalidad = isNonEmptyString(req.body?.nacionalidad) ? String(req.body.nacionalidad).trim() : null;
  const datos_completos = req.body?.datos_completos ?? null;

  if (!nombre_entidad) return res.status(400).json({ error: 'nombre_entidad es obligatorio' });

  try {
    if (rol === 'admin') {
      const r = await pool.query(
        `
        UPDATE clientes
        SET nombre_entidad = $1,
            nacionalidad = $2,
            datos_completos = COALESCE($3::jsonb, datos_completos),
            actualizado_en = now()
        WHERE id = $4
        RETURNING id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en
        `,
        [nombre_entidad, nacionalidad, datos_completos ? JSON.stringify(datos_completos) : null, id]
      );

      if (r.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
      return res.json({ ok: true, cliente: r.rows[0] });
    }

    const empresaIdToken = Number(user?.empresa_id);
    if (!Number.isFinite(empresaIdToken) || empresaIdToken <= 0) {
      return res.status(400).json({ error: 'empresa_id inválido' });
    }

    const r = await pool.query(
      `
      UPDATE clientes
      SET nombre_entidad = $1,
          nacionalidad = $2,
          datos_completos = COALESCE($3::jsonb, datos_completos),
          actualizado_en = now()
      WHERE id = $4 AND empresa_id = $5
      RETURNING id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en
      `,
      [nombre_entidad, nacionalidad, datos_completos ? JSON.stringify(datos_completos) : null, id, empresaIdToken]
    );

    if (r.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    return res.json({ ok: true, cliente: r.rows[0] });
  } catch (err: any) {
    console.error('Error al actualizar cliente:', {
      message: err?.message,
      code: err?.code,
      detail: err?.detail,
      hint: err?.hint
    });
    return res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

export default router;