// backend/src/routes/cliente.routes.ts
import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * Helpers de validación
 */
function isNonEmptyString(v: any): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function toInt(v: any): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  return i > 0 ? i : null;
}

// RFC (MX) - validación práctica (no perfecta pero bloqueante)
function isRFC(v: any): boolean {
  if (!isNonEmptyString(v)) return false;
  const s = v.trim().toUpperCase();
  // Persona física: 13, moral: 12, genérico: XAXX010101000 etc.
  return /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(s);
}

// CURP - validación práctica
function isCURP(v: any): boolean {
  if (!isNonEmptyString(v)) return false;
  const s = v.trim().toUpperCase();
  return /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(s);
}

// Fecha AAAAMMDD
function isYYYYMMDD(v: any): boolean {
  if (!isNonEmptyString(v)) return false;
  const s = v.trim();
  if (!/^\d{8}$/.test(s)) return false;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4, 6));
  const d = Number(s.slice(6, 8));
  if (y < 1900 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  // validación real de calendario:
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === (m - 1) && dt.getUTCDate() === d;
}

function badRequest(res: Response, msg: string) {
  return res.status(400).json({ error: msg });
}

function getUser(req: Request): any | null {
  // depende de tu middleware, normalmente setea req.user
  return (req as any).user ?? null;
}

/**
 * GET /api/cliente/clientes?empresa_id=#
 * Lista clientes por empresa.
 */
router.get('/clientes', authenticate, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);

    // empresa_id puede venir por query; si no, intenta del token
    const empresaId =
      toInt(req.query.empresa_id) ??
      toInt(user?.empresa_id);

    if (!empresaId) return badRequest(res, 'empresa_id inválido');

    const result = await pool.query(
      `
      SELECT
        id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad,
        estado, creado_en, actualizado_en
      FROM clientes
      WHERE empresa_id = $1
      ORDER BY id DESC
      `,
      [empresaId]
    );

    return res.json({ clientes: result.rows });
  } catch (err) {
    console.error('Error al listar clientes:', err);
    return res.status(500).json({ error: 'Error al listar clientes' });
  }
});

/**
 * GET /api/cliente/clientes/:id
 * Detalle de cliente
 */
router.get('/clientes/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return badRequest(res, 'id inválido');

    const result = await pool.query(
      `SELECT * FROM clientes WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    return res.json({ cliente: result.rows[0] });
  } catch (err) {
    console.error('Error al obtener cliente:', err);
    return res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

/**
 * POST /api/cliente/registrar-cliente
 * Registra cliente PF/PM/FIDE
 */
router.post('/registrar-cliente', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      empresa_id,
      tipo_cliente,
      nombre_entidad,
      nacionalidad,
      datos_completos
    } = req.body ?? {};

    const empresaId = toInt(empresa_id);
    if (!empresaId) return badRequest(res, 'empresa_id inválido');

    if (!isNonEmptyString(tipo_cliente)) return badRequest(res, 'tipo_cliente es obligatorio');
    if (!isNonEmptyString(nombre_entidad)) return badRequest(res, 'nombre_entidad es obligatorio');
    if (!isNonEmptyString(nacionalidad)) return badRequest(res, 'nacionalidad es obligatoria');

    const tipo = String(tipo_cliente).trim();

    const contacto = datos_completos?.contacto ?? {};
    if (!isNonEmptyString(contacto?.pais)) return badRequest(res, 'contacto.pais es obligatorio');
    if (!isNonEmptyString(contacto?.telefono)) return badRequest(res, 'contacto.telefono es obligatorio');

    // Validaciones por tipo
    if (tipo === 'persona_fisica') {
      const persona = datos_completos?.persona ?? {};
      if (!isNonEmptyString(persona?.nombres)) return badRequest(res, 'persona.nombres es obligatorio');
      if (!isNonEmptyString(persona?.apellido_paterno)) return badRequest(res, 'persona.apellido_paterno es obligatorio');

      // actividad económica (puede venir como {clave,descripcion} o string)
      const act = persona?.actividad_economica;
      const actOk =
        (act && typeof act === 'object' && isNonEmptyString(act.clave) && isNonEmptyString(act.descripcion)) ||
        isNonEmptyString(act);

      if (!actOk) return badRequest(res, 'persona.actividad_economica es obligatoria');
    }

    if (tipo === 'persona_moral') {
      const empresa = datos_completos?.empresa ?? {};
      if (!isNonEmptyString(empresa?.rfc)) return badRequest(res, 'empresa.rfc es obligatorio');
      if (!isRFC(empresa?.rfc)) return badRequest(res, 'empresa.rfc inválido');
      if (!isNonEmptyString(empresa?.fecha_constitucion)) return badRequest(res, 'empresa.fecha_constitucion es obligatoria');

      // giro: puede venir como {clave,descripcion} o string
      const giro = empresa?.giro_mercantil ?? empresa?.giro;
      const giroOk =
        (giro && typeof giro === 'object' && isNonEmptyString(giro.clave) && isNonEmptyString(giro.descripcion)) ||
        isNonEmptyString(giro);

      if (!giroOk) return badRequest(res, 'empresa.giro_mercantil es obligatorio');

      // representante mínimo (bloqueante)
      const rep = datos_completos?.representante ?? {};
      if (!isNonEmptyString(rep?.nombre_completo)) return badRequest(res, 'representante.nombre_completo es obligatorio');
    }

    if (tipo === 'fideicomiso') {
      const fide = datos_completos?.fideicomiso ?? {};
      if (!isNonEmptyString(fide?.identificador)) return badRequest(res, 'fideicomiso.identificador es obligatorio');
      if (!isNonEmptyString(fide?.denominacion_fiduciario)) return badRequest(res, 'fideicomiso.denominacion_fiduciario es obligatorio');
      if (!isNonEmptyString(fide?.rfc_fiduciario)) return badRequest(res, 'fideicomiso.rfc_fiduciario es obligatorio');
      if (!isRFC(fide?.rfc_fiduciario)) return badRequest(res, 'fideicomiso.rfc_fiduciario inválido');

      const rep = datos_completos?.representante ?? {};
      if (!isNonEmptyString(rep?.nombre_completo)) return badRequest(res, 'representante.nombre_completo es obligatorio');
      if (!isNonEmptyString(rep?.rfc)) return badRequest(res, 'representante.rfc es obligatorio');
      if (!isRFC(rep?.rfc)) return badRequest(res, 'representante.rfc inválido');
      if (!isNonEmptyString(rep?.curp)) return badRequest(res, 'representante.curp es obligatorio');
      if (!isCURP(rep?.curp)) return badRequest(res, 'representante.curp inválido');
      if (!isNonEmptyString(rep?.fecha_nacimiento)) return badRequest(res, 'representante.fecha_nacimiento es obligatoria');
      if (!isYYYYMMDD(rep?.fecha_nacimiento)) return badRequest(res, 'representante.fecha_nacimiento inválida (AAAAMMDD)');
    }

    // Duplicate check: (empresa_id + nombre_entidad)
    const dup = await pool.query(
      `SELECT id FROM clientes WHERE empresa_id=$1 AND nombre_entidad=$2 LIMIT 1`,
      [empresaId, nombre_entidad]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: 'Cliente duplicado para esa empresa (empresa_id + nombre_entidad)' });
    }

    const insert = await pool.query(
      `
      INSERT INTO clientes (
        empresa_id,
        nombre_entidad,
        tipo_cliente,
        nacionalidad,
        datos_completos,
        estado
      ) VALUES ($1,$2,$3,$4,$5,'activo')
      RETURNING id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en
      `,
      [empresaId, nombre_entidad, tipo, nacionalidad, datos_completos ?? {}]
    );

    return res.status(201).json({ ok: true, cliente: insert.rows[0] });
  } catch (err: any) {
    console.error('Error al registrar cliente:', err);
    return res.status(500).json({ error: 'Error al registrar cliente' });
  }
});

/**
 * PUT /api/cliente/clientes/:id
 * Actualización mínima
 */
router.put('/clientes/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return badRequest(res, 'id inválido');

    const patch: any = req.body ?? {};
    // Solo permitimos campos básicos + datos_completos (para evitar sobrescrituras peligrosas)
    const allowed = new Set([
      'nombre_entidad',
      'alias',
      'nacionalidad',
      'estado',
      'datos_completos'
    ]);

    const fields = Object.keys(patch).filter((k) => allowed.has(k));
    if (fields.length === 0) return badRequest(res, 'No hay campos válidos para actualizar');

    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    for (const k of fields) {
      sets.push(`${k} = $${idx++}`);
      vals.push(patch[k]);
    }

    sets.push(`actualizado_en = now()`);

    vals.push(id);

    const result = await pool.query(
      `UPDATE clientes SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

    return res.json({ ok: true, cliente: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar cliente:', err);
    return res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

export default router;