// backend/src/routes/cliente.routes.ts
import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db';
import authenticate from '../middleware/auth.middleware';

type AuthUser = {
  id: number;
  email: string;
  rol: 'admin' | 'consultor' | 'cliente';
  empresa_id: number | null;
};

function getUser(req: Request): AuthUser | null {
  return ((req as any).user as AuthUser) ?? null;
}

const router = Router();

/**
 * ===============================
 * DEBUG (rápido para validar router mount)
 * GET /api/cliente/__debug
 * ===============================
 */
router.get('/__debug', (_req: Request, res: Response) => {
  res.json({ ok: true, router: 'cliente' });
});

/**
 * ===============================
 * LISTAR CLIENTES
 * GET /api/cliente/clientes
 * ===============================
 */
router.get('/clientes', authenticate, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

    let query = `
      SELECT
        id,
        nombre_entidad,
        tipo_cliente,
        nacionalidad,
        estado,
        creado_en
      FROM clientes
    `;
    const params: any[] = [];

    // Si es rol cliente, filtra por empresa_id
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
});

/**
 * Alias FE legacy:
 * GET /api/cliente/mis-clientes  -> igual que /clientes
 */
router.get('/mis-clientes', authenticate, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

    let query = `
      SELECT
        id,
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
    console.error('Error al listar mis-clientes:', e);
    return res.status(500).json({ error: 'Error al listar clientes' });
  }
});

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
      empresa_id,
      tipo_cliente,
      nombre_entidad,
      nacionalidad,
      datos_completos
    } = req.body ?? {};

    if (!empresa_id || !Number.isInteger(Number(empresa_id))) {
      return res.status(400).json({ error: 'empresa_id inválido' });
    }

    if (!tipo_cliente || typeof tipo_cliente !== 'string') {
      return res.status(400).json({ error: 'tipo_cliente es obligatorio' });
    }

    if (!nombre_entidad || typeof nombre_entidad !== 'string' || !nombre_entidad.trim()) {
      return res.status(400).json({ error: 'nombre_entidad es obligatorio' });
    }

    if (!nacionalidad || typeof nacionalidad !== 'string' || !nacionalidad.trim()) {
      return res.status(400).json({ error: 'nacionalidad es obligatoria' });
    }

    // Validaciones mínimas por tipo (manténlo simple)
    if (tipo_cliente === 'persona_fisica') {
      const persona = datos_completos?.persona;
      if (!persona?.nombres || !persona?.apellido_paterno) {
        return res.status(400).json({
          error: 'persona_fisica requiere persona.nombres y persona.apellido_paterno'
        });
      }
    }

    if (tipo_cliente === 'persona_moral') {
      const empresa = datos_completos?.empresa;
      if (!empresa?.rfc) {
        return res.status(400).json({
          error: 'persona_moral requiere empresa.rfc'
        });
      }
    }

    if (tipo_cliente === 'fideicomiso') {
      const f = datos_completos?.fideicomiso;
      const r = datos_completos?.representante;

      if (!f?.denominacion_fiduciario || !f?.rfc_fiduciario) {
        return res.status(400).json({
          error: 'fideicomiso requiere fideicomiso.denominacion_fiduciario y fideicomiso.rfc_fiduciario'
        });
      }

      // Representante: obligatorio (según tu definición actual)
      if (
        !r?.nombre_completo ||
        !r?.fecha_nacimiento ||
        !r?.rfc ||
        !r?.curp
      ) {
        return res.status(400).json({
          error:
            'fideicomiso requiere representante.nombre_completo, representante.fecha_nacimiento, representante.rfc y representante.curp'
        });
      }
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
      ) VALUES ($1, $2, $3, $4, $5, 'activo')
      RETURNING id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en
      `,
      [
        Number(empresa_id),
        nombre_entidad.trim(),
        tipo_cliente,
        nacionalidad.trim(),
        datos_completos ?? {}
      ]
    );

    return res.status(201).json({ ok: true, cliente: insert.rows[0] });
  } catch (e: any) {
    const msg = String(e?.message ?? e ?? '');

    // Unique (empresa_id, nombre_entidad)
    if (msg.toLowerCase().includes('idx_clientes_empresa_nombre') || msg.toLowerCase().includes('duplicate')) {
      return res.status(409).json({
        error: 'Cliente duplicado para esa empresa (empresa_id + nombre_entidad)'
      });
    }

    console.error('Error al registrar cliente:', e);
    return res.status(500).json({ error: 'Error al registrar cliente' });
  }
});

export default router;
