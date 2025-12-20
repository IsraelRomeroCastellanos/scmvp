// backend/src/routes/cliente.routes.ts
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import pool from '../db'; // <-- ajusta si tu pool está en otra ruta

const router = Router();

type Rol = 'admin' | 'consultor' | 'cliente';

function getUser(req: Request) {
  return (req as any).user as { id: number; rol: Rol; empresa_id: number | null } | undefined;
}

router.get('/__debug', (_req, res) => {
  res.json({ ok: true, router: 'cliente' });
});

/**
 * ===============================
 * LISTAR CLIENTES (resumen)
 * ===============================
 */
const listarClientesHandler = async (req: Request, res: Response) => {
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
      if (!user.empresa_id) return res.status(400).json({ error: 'Empresa no asociada al usuario' });
      query += ` WHERE empresa_id = $1`;
      params.push(user.empresa_id);
    }

    query += ` ORDER BY creado_en DESC`;

    const result = await pool.query(query, params);
    return res.json({ clientes: result.rows });
  } catch (error) {
    console.error('Error al listar clientes:', error);
    return res.status(500).json({ error: 'Error al listar clientes' });
  }
};

router.get('/clientes', authenticate, listarClientesHandler);
// Alias para compatibilidad con FE anterior
router.get('/mis-clientes', authenticate, listarClientesHandler);

/**
 * ===============================
 * DETALLE CLIENTE (para "ver todos los campos")
 * ===============================
 */
router.get('/clientes/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) return res.status(400).json({ error: 'id inválido' });

    // Si es cliente, validar pertenencia por empresa
    const params: any[] = [id];
    let sql = `SELECT * FROM clientes WHERE id = $1`;

    if (user.rol === 'cliente') {
      if (!user.empresa_id) return res.status(400).json({ error: 'Empresa no asociada al usuario' });
      sql += ` AND empresa_id = $2`;
      params.push(user.empresa_id);
    }

    const result = await pool.query(sql, params);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

    return res.json({ cliente: result.rows[0] });
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    return res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

/**
 * ===============================
 * CREAR CLIENTE
 * ===============================
 * DB NOT NULL: empresa_id, nombre_entidad, tipo_cliente
 *
 * Regla empresa_id:
 * - rol cliente: se toma del token (user.empresa_id)
 * - admin/consultor: debe venir en body (empresa_id)
 *
 * Regla datos_completos:
 * - se almacena tal cual (jsonb) para soportar PF/PM/Fideicomiso sin re-trabajar DB.
 */
const crearClienteHandler = async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

    const body = req.body ?? {};

    // empresa_id según rol
    const resolvedEmpresaId =
      user.rol === 'cliente'
        ? user.empresa_id
        : body.empresa_id !== undefined && body.empresa_id !== null
          ? Number(body.empresa_id)
          : null;

    if (user.rol === 'cliente') {
      if (!resolvedEmpresaId) return res.status(400).json({ error: 'Empresa no asociada al usuario' });
    } else {
      if (!resolvedEmpresaId || Number.isNaN(resolvedEmpresaId)) {
        return res.status(400).json({ error: 'empresa_id es obligatorio para admin/consultor' });
      }
    }

    const nombre_entidad = typeof body.nombre_entidad === 'string' ? body.nombre_entidad.trim() : '';
    if (!nombre_entidad) return res.status(400).json({ error: 'nombre_entidad es obligatorio' });

    const tipo_cliente = body.tipo_cliente;
    const allowedTipo = ['persona_fisica', 'persona_moral', 'fideicomiso'];
    if (!tipo_cliente || !allowedTipo.includes(tipo_cliente)) {
      return res.status(400).json({ error: `tipo_cliente inválido (${allowedTipo.join('|')})` });
    }

    // NOTA: tu check actual en DB solo permite PF/PM.
    // Para poder guardar "fideicomiso" necesitas actualizar el CHECK en DB.
    // Mientras tanto, aquí devolvemos error claro para no meter datos inválidos.
    if (tipo_cliente === 'fideicomiso') {
      return res.status(400).json({ error: 'tipo_cliente fideicomiso aún no está habilitado en DB (constraint clientes_tipo_cliente_check)' });
    }

    const insertSQL = `
      INSERT INTO clientes (
        empresa_id,
        cliente_id_externo,
        nombre_entidad,
        alias,
        fecha_nacimiento_constitucion,
        tipo_cliente,
        nacionalidad,
        domicilio_mexico,
        ocupacion,
        actividad_economica,
        datos_completos,
        estado
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      )
      RETURNING id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en
    `;

    const values = [
      resolvedEmpresaId,
      body.cliente_id_externo ?? null,
      nombre_entidad,
      body.alias ?? null,
      body.fecha_nacimiento_constitucion ?? null,
      tipo_cliente,
      body.nacionalidad ?? null,
      body.domicilio_mexico ?? null,
      body.ocupacion ?? null,
      body.actividad_economica ?? null,
      body.datos_completos ?? null,
      body.estado ?? 'activo'
    ];

    const result = await pool.query(insertSQL, values);
    return res.status(201).json({ ok: true, cliente: result.rows[0] });
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Cliente duplicado para esa empresa (empresa_id + nombre_entidad)' });
    }
    console.error('Error al crear cliente:', error);
    return res.status(500).json({ error: 'Error al crear cliente' });
  }
};

// Canónico + alias histórico
router.post('/clientes', authenticate, crearClienteHandler);
router.post('/registrar-cliente', authenticate, crearClienteHandler);

/**
 * ===============================
 * ACTUALIZAR CLIENTE (opcional pero útil)
 * ===============================
 * Alias: PUT /api/cliente/:id
 */
const actualizarClienteHandler = async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) return res.status(400).json({ error: 'id inválido' });

    // Validar pertenencia si rol cliente
    if (user.rol === 'cliente') {
      if (!user.empresa_id) return res.status(400).json({ error: 'Empresa no asociada al usuario' });
      const check = await pool.query(`SELECT id FROM clientes WHERE id = $1 AND empresa_id = $2`, [id, user.empresa_id]);
      if (check.rowCount === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const allowed: Record<string, any> = {
      cliente_id_externo: req.body?.cliente_id_externo,
      nombre_entidad: req.body?.nombre_entidad,
      alias: req.body?.alias,
      fecha_nacimiento_constitucion: req.body?.fecha_nacimiento_constitucion,
      tipo_cliente: req.body?.tipo_cliente,
      nacionalidad: req.body?.nacionalidad,
      domicilio_mexico: req.body?.domicilio_mexico,
      ocupacion: req.body?.ocupacion,
      actividad_economica: req.body?.actividad_economica,
      datos_completos: req.body?.datos_completos,
      estado: req.body?.estado
    };

    // Validaciones básicas
    if (allowed.tipo_cliente && !['persona_fisica', 'persona_moral'].includes(allowed.tipo_cliente)) {
      return res.status(400).json({ error: 'tipo_cliente inválido (persona_fisica|persona_moral)' });
    }

    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    for (const [k, v] of Object.entries(allowed)) {
      if (v !== undefined) {
        sets.push(`${k} = $${idx++}`);
        params.push(v);
      }
    }

    if (sets.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });

    sets.push(`actualizado_en = now()`);
    params.push(id);

    const sql = `
      UPDATE clientes
      SET ${sets.join(', ')}
      WHERE id = $${idx}
      RETURNING id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en
    `;

    const result = await pool.query(sql, params);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

    return res.json({ ok: true, cliente: result.rows[0] });
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Cliente duplicado para esa empresa (empresa_id + nombre_entidad)' });
    }
    console.error('Error al actualizar cliente:', error);
    return res.status(500).json({ error: 'Error al actualizar cliente' });
  }
};

router.put('/clientes/:id', authenticate, actualizarClienteHandler);
router.put('/:id', authenticate, actualizarClienteHandler);

export default router;
