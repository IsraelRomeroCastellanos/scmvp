// backend/src/routes/cliente.routes.ts
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

function badRequest(res: Response, msg: string) {
  return res.status(400).json({ error: msg });
}

function parsePositiveInt(v: any): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// RFC genérico (no perfecto, pero suficiente para validación básica)
function isRFC(v: any): boolean {
  if (!isNonEmptyString(v)) return false;
  const s = v.trim().toUpperCase();
  return /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(s);
}

// CURP genérico (validación básica)
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
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Deep merge: permite PUT parcial de datos_completos sin perder campos existentes.
 * - No mezcla arrays.
 * - Ignora keys con undefined.
 */
function isPlainObject(v: any): v is Record<string, any> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(base: any, patch: any): any {
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch;
  const out: Record<string, any> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (isPlainObject(v) && isPlainObject(out[k])) out[k] = deepMerge(out[k], v);
    else out[k] = v;
  }
  return out;
}

/**
 * Validación por tipo (reusada por POST y PUT)
 * - Retorna true si OK
 * - Si falla, responde 400 con error específico y retorna false
 */
function validateDatosCompletosOr400(res: Response, tipo: any, datos_completos: any): boolean {
  // contacto común
  const contacto = datos_completos?.contacto ?? {};
  if (!isNonEmptyString(contacto?.pais)) return (badRequest(res, 'contacto.pais es obligatorio'), false);
  if (!isNonEmptyString(contacto?.telefono)) return (badRequest(res, 'contacto.telefono es obligatorio'), false);

  // Validaciones por tipo
  if (tipo === 'persona_fisica') {
    const persona = datos_completos?.persona ?? {};

    if (!isNonEmptyString(persona?.nombres)) return (badRequest(res, 'persona.nombres es obligatorio'), false);
    if (!isNonEmptyString(persona?.apellido_paterno)) return (badRequest(res, 'persona.apellido_paterno es obligatorio'), false);
    if (!isNonEmptyString(persona?.apellido_materno)) return (badRequest(res, 'persona.apellido_materno es obligatorio'), false);

    if (!isNonEmptyString(persona?.rfc)) return (badRequest(res, 'persona.rfc es obligatorio'), false);
    if (!isRFC(persona?.rfc)) return (badRequest(res, 'persona.rfc inválido'), false);

    if (!isNonEmptyString(persona?.curp)) return (badRequest(res, 'persona.curp es obligatorio'), false);
    if (!isCURP(persona?.curp)) return (badRequest(res, 'persona.curp inválido'), false);

    if (!isNonEmptyString(persona?.fecha_nacimiento)) return (badRequest(res, 'persona.fecha_nacimiento es obligatoria'), false);
    if (!isYYYYMMDD(persona?.fecha_nacimiento))
      return (badRequest(res, 'persona.fecha_nacimiento inválida (AAAAMMDD)'), false);

    const act = persona?.actividad_economica;
    const actOk =
      (act && typeof act === 'object' && isNonEmptyString((act as any).clave) && isNonEmptyString((act as any).descripcion)) ||
      isNonEmptyString(act);
    if (!actOk) return (badRequest(res, 'persona.actividad_economica es obligatoria'), false);
  }

  if (tipo === 'persona_moral') {
    const empresa = datos_completos?.empresa ?? {};
    if (!isNonEmptyString(empresa?.rfc)) return (badRequest(res, 'empresa.rfc es obligatorio'), false);
    if (!isRFC(empresa?.rfc)) return (badRequest(res, 'empresa.rfc inválido'), false);
    if (!isNonEmptyString(empresa?.fecha_constitucion)) return (badRequest(res, 'empresa.fecha_constitucion es obligatoria'), false);

    const giro = empresa?.giro_mercantil ?? empresa?.giro;
    const giroOk =
      (giro && typeof giro === 'object' && isNonEmptyString((giro as any).clave) && isNonEmptyString((giro as any).descripcion)) ||
      isNonEmptyString(giro);
    if (!giroOk) return (badRequest(res, 'empresa.giro_mercantil es obligatorio'), false);

    const rep = datos_completos?.representante ?? {};
    if (!isNonEmptyString(rep?.nombre_completo)) return (badRequest(res, 'representante.nombre_completo es obligatorio'), false);
  }

  if (tipo === 'fideicomiso') {
    const fide = datos_completos?.fideicomiso ?? {};
    if (!isNonEmptyString(fide?.fideicomiso_nombre))
      return (badRequest(res, 'fideicomiso.fideicomiso_nombre es obligatorio'), false);

    if (!isNonEmptyString(fide?.identificador)) return (badRequest(res, 'fideicomiso.identificador es obligatorio'), false);

    if (!isNonEmptyString(fide?.denominacion_fiduciario))
      return (badRequest(res, 'fideicomiso.denominacion_fiduciario es obligatorio'), false);

    if (!isNonEmptyString(fide?.rfc_fiduciario)) return (badRequest(res, 'fideicomiso.rfc_fiduciario es obligatorio'), false);
    if (!isRFC(fide?.rfc_fiduciario)) return (badRequest(res, 'fideicomiso.rfc_fiduciario inválido'), false);

    const rep = datos_completos?.representante ?? {};
    if (!isNonEmptyString(rep?.nombre_completo)) return (badRequest(res, 'representante.nombre_completo es obligatorio'), false);
    if (!isNonEmptyString(rep?.rfc)) return (badRequest(res, 'representante.rfc es obligatorio'), false);
    if (!isRFC(rep?.rfc)) return (badRequest(res, 'representante.rfc inválido'), false);
    if (!isNonEmptyString(rep?.curp)) return (badRequest(res, 'representante.curp es obligatorio'), false);
    if (!isCURP(rep?.curp)) return (badRequest(res, 'representante.curp inválido'), false);
    if (!isNonEmptyString(rep?.fecha_nacimiento))
      return (badRequest(res, 'representante.fecha_nacimiento es obligatoria'), false);
    if (!isYYYYMMDD(rep?.fecha_nacimiento))
      return (badRequest(res, 'representante.fecha_nacimiento inválida (AAAAMMDD)'), false);
  }

  return true;
}

/**
 * ===============================
 * LISTAR CLIENTES
 * ===============================
 */
router.get('/clientes', authenticate, async (req: Request, res: Response) => {
  try {
    const empresa_id = parsePositiveInt(req.query.empresa_id);
    if (!empresa_id) return badRequest(res, 'empresa_id inválido');

    const result = await pool.query(
      `SELECT id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en
       FROM clientes
       WHERE empresa_id=$1
       ORDER BY id DESC`,
      [empresa_id]
    );

    return res.json({ clientes: result.rows });
  } catch (error) {
    console.error('Error al listar clientes:', error);
    return res.status(500).json({ error: 'Error al listar clientes' });
  }
});

/**
 * ===============================
 * OBTENER CLIENTE POR ID
 * ===============================
 */
router.get('/clientes/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return badRequest(res, 'id inválido');

    const result = await pool.query(
      `SELECT id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en, datos_completos
       FROM clientes
       WHERE id=$1
       LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

    return res.json({ cliente: result.rows[0] });
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    return res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

/**
 * ===============================
 * REGISTRAR CLIENTE (Contrato Único)
 * ===============================
 */
router.post('/registrar-cliente', authenticate, async (req: Request, res: Response) => {
  try {
    const empresa_id = parsePositiveInt(req.body.empresa_id);
    const tipo = req.body.tipo_cliente;
    const nombre_entidad = req.body.nombre_entidad;
    const nacionalidad = req.body.nacionalidad;
    const datos_completos = req.body.datos_completos;

    if (!empresa_id) return badRequest(res, 'empresa_id inválido');
    if (!isNonEmptyString(tipo)) return badRequest(res, 'tipo_cliente es obligatorio');
    if (!isNonEmptyString(nombre_entidad)) return badRequest(res, 'nombre_entidad es obligatorio');
    if (!isNonEmptyString(nacionalidad)) return badRequest(res, 'nacionalidad es obligatoria');

    if (!validateDatosCompletosOr400(res, tipo, datos_completos)) return;

    // Duplicate check: (empresa_id + nombre_entidad)
    const dup = await pool.query(
      `SELECT id FROM clientes WHERE empresa_id=$1 AND nombre_entidad=$2 LIMIT 1`,
      [empresa_id, nombre_entidad]
    );
    if (dup.rows.length > 0) return res.status(409).json({ error: 'Cliente duplicado para esa empresa' });

    const insert = await pool.query(
      `INSERT INTO clientes (empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, datos_completos)
       VALUES ($1, $2, $3, $4, 'activo', $5)
       RETURNING id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en`,
      [empresa_id, nombre_entidad, tipo, nacionalidad, datos_completos]
    );

    return res.status(201).json({ ok: true, cliente: insert.rows[0] });
  } catch (error) {
    console.error('Error al registrar cliente:', error);
    return res.status(500).json({ error: 'Error al registrar cliente' });
  }
});

/**
 * ===============================
 * EDITAR CLIENTE (PUT endurecido)
 * - merge de datos_completos
 * - valida por tipo si se intenta actualizar datos_completos
 * ===============================
 */
router.put('/clientes/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return badRequest(res, 'id inválido');

    // cargar cliente actual (tipo + datos)
    const current = await pool.query(
      `SELECT id, tipo_cliente, datos_completos
       FROM clientes
       WHERE id=$1
       LIMIT 1`,
      [id]
    );
    if (current.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

    const tipo = current.rows[0].tipo_cliente;
    const currentDatos = current.rows[0].datos_completos ?? {};

    const { nombre_entidad, nacionalidad, estado } = req.body;

    let nextDatos: any = null;
    if (req.body.datos_completos !== undefined) {
      nextDatos = deepMerge(currentDatos, req.body.datos_completos);
      if (!validateDatosCompletosOr400(res, tipo, nextDatos)) return;
    }

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
  } catch (error) {
    console.error('Error al editar cliente:', error);
    return res.status(500).json({ error: 'Error al editar cliente' });
  }
});

export default router;
