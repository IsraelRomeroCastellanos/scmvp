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

// RFC genérico (no perfecto, pero suficiente para validación básica)
function isRFC(v: any): boolean {
  if (!isNonEmptyString(v)) return false;
  // 12 (PM) o 13 (PF) con estructura general; se permite Ñ/& y dígitos
  return /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/i.test(v.trim());
}

// CURP básico
function isCURP(v: any): boolean {
  if (!isNonEmptyString(v)) return false;
  return /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/i.test(v.trim());
}

// Formato AAAAMMDD
function isYYYYMMDD(v: any): boolean {
  if (!isNonEmptyString(v)) return false;
  if (!/^\d{8}$/.test(v.trim())) return false;

  const yyyy = parseInt(v.slice(0, 4), 10);
  const mm = parseInt(v.slice(4, 6), 10);
  const dd = parseInt(v.slice(6, 8), 10);

  if (yyyy < 1900 || yyyy > 2100) return false;
  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > 31) return false;

  return true;
}

function badRequest(res: Response, msg: string) {
  return res.status(400).json({ error: msg });
}

// Nota: este helper existe en tu archivo original (se mantiene por compatibilidad si lo usas más abajo)
function parsePositiveInt(n: any) {
  if (n === null || n === undefined) return null;
  const i = Math.trunc(Number(n));
  return i > 0 ? i : null;
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
 * REGISTRAR CLIENTE
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

    // contacto común
    const contacto = datos_completos?.contacto ?? {};
    if (!isNonEmptyString(contacto?.pais)) return badRequest(res, 'contacto.pais es obligatorio');
    if (!isNonEmptyString(contacto?.telefono)) return badRequest(res, 'contacto.telefono es obligatorio');

    // Validaciones por tipo
    if (tipo === 'persona_fisica') {
      const persona = datos_completos?.persona ?? {};

      // Identidad mínima PF
      if (!isNonEmptyString(persona?.nombres)) return badRequest(res, 'persona.nombres es obligatorio');
      if (!isNonEmptyString(persona?.apellido_paterno)) return badRequest(res, 'persona.apellido_paterno es obligatorio');

      // RFC + CURP obligatorios (regla de negocio estandarizada)
      if (!isNonEmptyString(persona?.rfc)) return badRequest(res, 'persona.rfc es obligatorio');
      if (!isRFC(persona?.rfc)) return badRequest(res, 'persona.rfc inválido');

      if (!isNonEmptyString(persona?.curp)) return badRequest(res, 'persona.curp es obligatorio');
      if (!isCURP(persona?.curp)) return badRequest(res, 'persona.curp inválido');

      // Fecha nacimiento: formato AAAAMMDD (estandarizado)
      if (!isNonEmptyString(persona?.fecha_nacimiento))
        return badRequest(res, 'persona.fecha_nacimiento es obligatoria');
      if (!isYYYYMMDD(persona?.fecha_nacimiento))
        return badRequest(res, 'persona.fecha_nacimiento inválida (AAAAMMDD)');

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
      if (!isNonEmptyString(empresa?.fecha_constitucion))
        return badRequest(res, 'empresa.fecha_constitucion es obligatoria');

      // giro mercantil (puede venir como {clave,descripcion} o string)
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
      if (!isNonEmptyString(fide?.fideicomiso_nombre))
        return badRequest(res, 'fideicomiso.fideicomiso_nombre es obligatorio');

      if (!isNonEmptyString(fide?.identificador)) return badRequest(res, 'fideicomiso.identificador es obligatorio');

      if (!isNonEmptyString(fide?.denominacion_fiduciario))
        return badRequest(res, 'fideicomiso.denominacion_fiduciario es obligatorio');

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
 * EDITAR CLIENTE
 * ===============================
 */
router.put('/clientes/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return badRequest(res, 'id inválido');

    const { nombre_entidad, nacionalidad, datos_completos, estado } = req.body;

    const result = await pool.query(
      `UPDATE clientes
       SET nombre_entidad = COALESCE($1, nombre_entidad),
           nacionalidad = COALESCE($2, nacionalidad),
           datos_completos = COALESCE($3, datos_completos),
           estado = COALESCE($4, estado),
           actualizado_en = NOW()
       WHERE id=$5
       RETURNING id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en`,
      [nombre_entidad, nacionalidad, datos_completos, estado, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

    return res.json({ ok: true, cliente: result.rows[0] });
  } catch (error) {
    console.error('Error al editar cliente:', error);
    return res.status(500).json({ error: 'Error al editar cliente' });
  }
});

export default router;
