// backend/src/routes/cliente.routes.ts
import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/__debug', (_req, res) => {
  res.json({ ok: true, router: 'cliente' });
});

type AuthUser = {
  id: number;
  email: string;
  rol: 'admin' | 'consultor' | 'cliente';
  empresa_id: number | null;
};

function getUser(req: Request): AuthUser | null {
  return ((req as any).user ?? null) as AuthUser | null;
}

function isYYYYMMDD(raw: any): boolean {
  return /^\d{8}$/.test(String(raw ?? '').trim());
}

function normalizePaisValue(x: any): string {
  return String(x ?? '').trim();
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
      if (!user.empresa_id) return res.status(403).json({ error: 'Empresa no asociada al usuario' });
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
    console.error('Error al obtener detalle cliente:', e);
    return res.status(500).json({ error: 'Error al obtener detalle cliente' });
  }
});

/**
 * ===============================
 * REGISTRAR / CREAR CLIENTE (compat)
 * POST /api/cliente/registrar-cliente (legacy FE)
 * POST /api/cliente/clientes (alias estable)
 * ===============================
 */
async function createClienteHandler(req: Request, res: Response) {
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

    let empresa_id: number | null = null;
    if (user.rol === 'cliente') {
      empresa_id = user.empresa_id ?? null;
    } else {
      empresa_id = Number(empresaIdBody);
    }

    const fields: string[] = [];

    const tipo = String(tipo_cliente ?? '').trim();
    const nombre = String(nombre_entidad ?? '').trim();
    const nacionalidadNorm = normalizePaisValue(nacionalidad);

    if (!empresa_id || !Number.isInteger(empresa_id) || empresa_id <= 0) fields.push('empresa_id');
    if (!tipo) fields.push('tipo_cliente');
    if (!nombre) fields.push('nombre_entidad');
    if (!nacionalidadNorm) fields.push('nacionalidad');

    const contacto = datos_completos?.contacto ?? {};
    const pais = normalizePaisValue(contacto?.pais);
    const telefono = String(contacto?.telefono ?? '').trim();
    if (!pais) fields.push('datos_completos.contacto.pais');
    if (!telefono) fields.push('datos_completos.contacto.telefono');

    const allowedTipos = new Set(['persona_fisica', 'persona_moral', 'fideicomiso']);
    if (tipo && !allowedTipos.has(tipo)) fields.push('tipo_cliente(inválido)');

    if (tipo === 'fideicomiso') {
      const fid = datos_completos?.fideicomiso ?? {};
      const rep = datos_completos?.representante ?? {};

      const identificador = String(fid?.identificador ?? '').trim();
      const denominacion = String(fid?.denominacion_fiduciario ?? '').trim();
      const rfcFiduciario = String(fid?.rfc_fiduciario ?? '').trim();

      const repNombreCompleto = String(rep?.nombre_completo ?? '').trim();
      const repNombres = String(rep?.nombres ?? '').trim();
      const repApellidoP = String(rep?.apellido_paterno ?? '').trim();
      const repApellidoM = String(rep?.apellido_materno ?? '').trim();
      const repFechaNac = String(rep?.fecha_nacimiento ?? '').trim();
      const repRfc = String(rep?.rfc ?? '').trim();
      const repCurp = String(rep?.curp ?? '').trim();

      if (!identificador) fields.push('datos_completos.fideicomiso.identificador');
      if (!denominacion) fields.push('datos_completos.fideicomiso.denominacion_fiduciario');
      if (!rfcFiduciario) fields.push('datos_completos.fideicomiso.rfc_fiduciario');

      const tieneNombre = !!repNombreCompleto || (!!repNombres && !!repApellidoP);
      if (!tieneNombre) fields.push('datos_completos.representante.nombre');
      if (!repFechaNac || !isYYYYMMDD(repFechaNac)) fields.push('datos_completos.representante.fecha_nacimiento(YYYYMMDD)');
      if (!repRfc) fields.push('datos_completos.representante.rfc');
      if (!repCurp) fields.push('datos_completos.representante.curp');

      if (!repNombreCompleto && tieneNombre) {
        const nombreArmado = [repNombres, repApellidoP, repApellidoM].filter(Boolean).join(' ').trim();
        (datos_completos as any).representante = {
          ...rep,
          nombre_completo: nombreArmado
        };
      }
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
      nombre,
      tipo,
      nacionalidadNorm,
      datos_completos ?? {}
    ];

    const result = await pool.query(insertQuery, insertParams);
    return res.status(201).json({ ok: true, cliente: result.rows[0] });
  } catch (e: any) {
    if (e?.code === '23505') {
      return res.status(409).json({
        error: 'Cliente duplicado para esa empresa (empresa_id + nombre_entidad)'
      });
    }

    console.error('Error al registrar cliente:', e);
    return res.status(500).json({ error: 'Error al registrar cliente' });
  }
}

router.post('/registrar-cliente', authenticate, createClienteHandler);
router.post('/clientes', authenticate, createClienteHandler);

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
