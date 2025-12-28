// backend/src/routes/cliente.routes.ts
import { Router, Request, Response } from 'express';
import pool from '../db';
import authenticate from '../middleware/auth.middleware';

const router = Router();

router.get('/__debug', (_req, res) => {
  res.json({ ok: true, router: 'cliente' });
});

type AuthUser = {
  id: number;
  email: string;
  rol: string;
  empresa_id: number | null;
};

function getUser(req: Request): AuthUser | null {
  return (req as any).user ?? null;
}

function isValidRFC(raw: string): boolean {
  const v = String(raw ?? '').trim().toUpperCase();
  // RFC genérico + RFC real (12/13)
  return /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(v);
}

function isValidCURP(raw: string): boolean {
  const v = String(raw ?? '').trim().toUpperCase();
  // Validación razonable (18 chars). No es 100% “oficial”, pero evita basura.
  return /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]{2}$/.test(v);
}

function isYYYYMMDD(raw: string): boolean {
  return /^\d{8}$/.test(String(raw ?? '').trim());
}

function normalizePaisValue(x: any): string {
  // En FE mandas "MEXICO,MX" / "CANADA,CA" etc.
  const v = String(x ?? '').trim();
  return v;
}

/**
 * ===============================
 * LISTAR CLIENTES (compat)
 * GET /api/cliente/clientes
 * GET /api/cliente/mis-clientes (alias legacy)
 * ===============================
 */
async function listClientesHandler(req: Request, res: Response) {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

    let query = `
      SELECT
        id,
        empresa_id,
        nombre_entidad,
        tipo_cliente,
        nacionalidad,
        estado,
        creado_en
      FROM clientes
    `;
    const params: any[] = [];

    if (user.rol === 'cliente') {
      if (!user.empresa_id) {
        return res.status(403).json({ error: 'Empresa no asociada al usuario' });
      }
      query += ` WHERE empresa_id = $1`;
      params.push(user.empresa_id);
    }

    query += ` ORDER BY creado_en DESC`;

    const result = await pool.query(query, params);
    return res.json({ clientes: result.rows });
  } catch (e) {
    console.error('Error al listar clientes:', e);
    return res.status(500).json({ error: 'Error al listar clientes' });
  }
}

router.get('/clientes', authenticate, listClientesHandler);
router.get('/mis-clientes', authenticate, listClientesHandler);

/**
 * ===============================
 * DETALLE CLIENTE
 * GET /api/cliente/clientes/:id
 * ===============================
 */
router.get('/clientes/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });

    let query = `SELECT * FROM clientes WHERE id = $1`;
    const params: any[] = [id];

    if (user.rol === 'cliente') {
      if (!user.empresa_id) return res.status(403).json({ error: 'Empresa no asociada al usuario' });
      query += ` AND empresa_id = $2`;
      params.push(user.empresa_id);
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

    return res.json({ cliente: result.rows[0] });
  } catch (e) {
    console.error('Error al obtener cliente:', e);
    return res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

/**
 * ===============================
 * REGISTRAR CLIENTE
 * POST /api/cliente/registrar-cliente
 * ===============================
 */
router.post('/registrar-cliente', authenticate, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

    const {
      empresa_id: empresaIdBody,
      tipo_cliente,
      nombre_entidad,
      nacionalidad,
      datos_completos
    } = req.body ?? {};

    // empresa_id: si es rol cliente, forzamos su empresa
    let empresa_id: number | null = null;
    if (user.rol === 'cliente') {
      empresa_id = user.empresa_id ?? null;
    } else {
      empresa_id = Number(empresaIdBody);
    }

    const fields: string[] = [];

    if (!empresa_id || !Number.isInteger(empresa_id) || empresa_id <= 0) fields.push('empresa_id');
    if (!String(tipo_cliente ?? '').trim()) fields.push('tipo_cliente');
    if (!String(nombre_entidad ?? '').trim()) fields.push('nombre_entidad');

    const nacionalidadNorm = normalizePaisValue(nacionalidad);
    if (!nacionalidadNorm) fields.push('nacionalidad');

    // contacto mínimo (para todos)
    const contacto = datos_completos?.contacto ?? {};
    const paisContacto = normalizePaisValue(contacto?.pais);
    const telefono = String(contacto?.telefono ?? '').trim();
    if (!paisContacto) fields.push('datos_completos.contacto.pais');
    if (!telefono) fields.push('datos_completos.contacto.telefono');

    // Validaciones mínimas por tipo
    if (tipo_cliente === 'fideicomiso') {
      const fid = datos_completos?.fideicomiso ?? {};
      const rep = datos_completos?.representante ?? {};

      const identificador = String(fid?.identificador ?? '').trim();
      const denominacion = String(fid?.denominacion_fiduciario ?? '').trim();
      const rfcFiduciario = String(fid?.rfc_fiduciario ?? '').trim();

      const repNombre = String(rep?.nombre_completo ?? '').trim();
      const repRfc = String(rep?.rfc ?? '').trim();
      const repCurp = String(rep?.curp ?? '').trim();
      const repFechaNac = String(rep?.fecha_nacimiento ?? '').trim();

      if (!identificador) fields.push('datos_completos.fideicomiso.identificador');
      if (!denominacion) fields.push('datos_completos.fideicomiso.denominacion_fiduciario');
      if (!rfcFiduciario) fields.push('datos_completos.fideicomiso.rfc_fiduciario');

      if (!repNombre) fields.push('datos_completos.representante.nombre_completo');
      if (!repRfc) fields.push('datos_completos.representante.rfc');
      if (!repCurp) fields.push('datos_completos.representante.curp');
      if (!repFechaNac) fields.push('datos_completos.representante.fecha_nacimiento');

      // formato básico
      if (rfcFiduciario && !isValidRFC(rfcFiduciario)) fields.push('datos_completos.fideicomiso.rfc_fiduciario(formato)');
      if (repRfc && !isValidRFC(repRfc)) fields.push('datos_completos.representante.rfc(formato)');
      if (repCurp && !isValidCURP(repCurp)) fields.push('datos_completos.representante.curp(formato)');
      if (repFechaNac && !isYYYYMMDD(repFechaNac)) fields.push('datos_completos.representante.fecha_nacimiento(AAAAMMDD)');
    }

    if (fields.length > 0) {
      return res.status(400).json({
        error: 'Validación fallida',
        fields
      });
    }

    const insertQuery = `
      INSERT INTO clientes (
        empresa_id,
        nombre_entidad,
        tipo_cliente,
        nacionalidad,
        datos_completos,
        estado
      )
      VALUES ($1, $2, $3, $4, $5, 'activo')
      RETURNING
        id,
        empresa_id,
        nombre_entidad,
        tipo_cliente,
        nacionalidad,
        estado,
        creado_en,
        actualizado_en
    `;

    const insertParams = [
      empresa_id,
      String(nombre_entidad).trim(),
      String(tipo_cliente).trim(),
      nacionalidadNorm,
      datos_completos ?? {}
    ];

    const result = await pool.query(insertQuery, insertParams);

    return res.status(201).json({ ok: true, cliente: result.rows[0] });
  } catch (e: any) {
    // unique(empresa_id, nombre_entidad) => 23505
    if (e?.code === '23505') {
      return res.status(409).json({
        error: 'Cliente duplicado para esa empresa (empresa_id + nombre_entidad)'
      });
    }

    console.error('Error al registrar cliente:', e);
    return res.status(500).json({ error: 'Error al registrar cliente' });
  }
});

/**
 * ===============================
 * EDITAR CLIENTE (mínimo)
 * PUT /api/cliente/clientes/:id
 * ===============================
 */
router.put('/clientes/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });

    const { nombre_entidad, nacionalidad, estado, datos_completos } = req.body ?? {};

    const params: any[] = [
      nombre_entidad ?? null,
      nacionalidad ?? null,
      estado ?? null,
      datos_completos ?? null,
      id
    ];

    let query = `
      UPDATE clientes
      SET
        nombre_entidad = COALESCE($1, nombre_entidad),
        nacionalidad = COALESCE($2, nacionalidad),
        estado = COALESCE($3, estado),
        datos_completos = COALESCE($4, datos_completos),
        actualizado_en = now()
      WHERE id = $5
    `;

    if (user.rol === 'cliente') {
      if (!user.empresa_id) return res.status(403).json({ error: 'Empresa no asociada al usuario' });
      query += ` AND empresa_id = $6`;
      params.push(user.empresa_id);
    }

    query += ` RETURNING id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en`;

    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

    return res.json({ ok: true, cliente: result.rows[0] });
  } catch (e: any) {
    if (e?.code === '23505') {
      return res.status(409).json({
        error: 'Cliente duplicado para esa empresa (empresa_id + nombre_entidad)'
      });
    }
    console.error('Error al editar cliente:', e);
    return res.status(500).json({ error: 'Error al editar cliente' });
  }
});

export default router;
