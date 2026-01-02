// backend/src/routes/cliente.routes.ts
import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * Helpers
 */
type AuthUser = {
  id: number;
  email: string;
  rol: 'admin' | 'consultor' | 'cliente';
  empresa_id: number | null;
};

function getUser(req: Request): AuthUser | null {
  return (req as any).user ?? null;
}

function parseIdParam(req: Request, res: Response): number | null {
  const raw = String(req.params.id ?? '').trim();
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'id inválido' });
    return null;
  }
  return id;
}

/**
 * =========================================
 * DEBUG
 * GET /api/cliente/__debug
 * =========================================
 */
router.get('/__debug', authenticate, (req, res) => {
  return res.json({ ok: true, router: 'cliente' });
});

/**
 * =========================================
 * LISTAR CLIENTES
 * GET /api/cliente/clientes
 * GET /api/cliente/mis-clientes  (alias)
 *
 * - rol "cliente": filtra por empresa_id del token (obligatorio)
 * - rol "admin"/"consultor": puede filtrar opcionalmente con ?empresa_id=NNN
 * =========================================
 */
async function listClientesHandler(req: Request, res: Response) {
  try {
    const user = getUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    let empresaIdFilter: number | null = null;

    if (user.rol === 'cliente') {
      if (!user.empresa_id) {
        return res
          .status(403)
          .json({ error: 'Usuario cliente sin empresa_id (no puede listar clientes)' });
      }
      empresaIdFilter = Number(user.empresa_id);
    } else if (user.rol === 'admin' || user.rol === 'consultor') {
      const raw = (req.query.empresa_id as string | undefined) ?? '';
      const trimmed = String(raw).trim();

      if (trimmed) {
        const n = Number(trimmed);
        if (!Number.isInteger(n) || n <= 0) {
          return res.status(400).json({ error: 'empresa_id inválido' });
        }
        empresaIdFilter = n;
      }
    }

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
    if (empresaIdFilter !== null) {
      query += ` WHERE empresa_id = $1`;
      params.push(empresaIdFilter);
    }

    query += ` ORDER BY creado_en DESC`;

    const result = await pool.query(query, params);
    return res.json({ clientes: result.rows });
  } catch (error) {
    console.error('Error al listar clientes:', error);
    return res.status(500).json({ error: 'Error al listar clientes' });
  }
}

router.get('/clientes', authenticate, listClientesHandler);
router.get('/mis-clientes', authenticate, listClientesHandler);

/**
 * =========================================
 * DETALLE CLIENTE
 * GET /api/cliente/clientes/:id
 * =========================================
 */
router.get('/clientes/:id', authenticate, async (req: Request, res: Response) => {
  const id = parseIdParam(req, res);
  if (!id) return;

  try {
    const result = await pool.query(
      `
      SELECT
        id,
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
        porcentaje_cumplimiento,
        creado_en,
        actualizado_en,
        estado
      FROM clientes
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    return res.json({ cliente: result.rows[0] });
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    return res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

/**
 * =========================================
 * REGISTRAR CLIENTE
 * POST /api/cliente/registrar-cliente
 * =========================================
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

    if (!empresa_id || !Number.isInteger(Number(empresa_id)) || Number(empresa_id) <= 0) {
      return res.status(400).json({ error: 'empresa_id inválido' });
    }
    if (!tipo_cliente) {
      return res.status(400).json({ error: 'tipo_cliente es obligatorio' });
    }
    if (!nombre_entidad || String(nombre_entidad).trim().length < 2) {
      return res.status(400).json({ error: 'nombre_entidad es obligatorio' });
    }

    // Validaciones mínimas por tipo (iteración 1)
    if (tipo_cliente === 'fideicomiso') {
      const f = datos_completos?.fideicomiso ?? {};
      const r = datos_completos?.representante ?? {};

      if (!f?.identificador || String(f.identificador).trim().length < 2) {
        return res.status(400).json({ error: 'fideicomiso.identificador es obligatorio' });
      }
      if (!f?.denominacion_fiduciario || String(f.denominacion_fiduciario).trim().length < 2) {
        return res.status(400).json({ error: 'fideicomiso.denominacion_fiduciario es obligatorio' });
      }
      if (!f?.rfc_fiduciario || String(f.rfc_fiduciario).trim().length < 10) {
        return res.status(400).json({ error: 'fideicomiso.rfc_fiduciario es obligatorio' });
      }

      // Representante (obligatorio) – tu decisión: lo marcaste como obligatorio
      if (!r?.nombre_completo || String(r.nombre_completo).trim().length < 3) {
        return res.status(400).json({ error: 'representante.nombre_completo es obligatorio' });
      }
      if (!r?.fecha_nacimiento || String(r.fecha_nacimiento).trim().length !== 8) {
        return res.status(400).json({ error: 'representante.fecha_nacimiento debe ser AAAAMMDD' });
      }
      if (!r?.rfc || String(r.rfc).trim().length < 10) {
        return res.status(400).json({ error: 'representante.rfc es obligatorio' });
      }
      if (!r?.curp || String(r.curp).trim().length < 10) {
        return res.status(400).json({ error: 'representante.curp es obligatorio' });
      }
    }

    const insert = await pool.query(
      `
      INSERT INTO clientes (
        empresa_id,
        tipo_cliente,
        nombre_entidad,
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
      `,
      [
        Number(empresa_id),
        tipo_cliente,
        String(nombre_entidad).trim(),
        nacionalidad ?? null,
        datos_completos ?? null
      ]
    );

    return res.status(201).json({ ok: true, cliente: insert.rows[0] });
  } catch (error: any) {
    // duplicado por unique(empresa_id, nombre_entidad)
    const msg = String(error?.message ?? '');
    if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
      return res.status(409).json({
        error: 'Cliente duplicado para esa empresa (empresa_id + nombre_entidad)'
      });
    }

    console.error('Error al registrar cliente:', error);
    return res.status(500).json({ error: 'Error al registrar cliente' });
  }
});

/**
 * =========================================
 * ACTUALIZAR CLIENTE
 * PUT /api/cliente/clientes/:id
 * =========================================
 */
router.put('/clientes/:id', authenticate, async (req: Request, res: Response) => {
  const id = parseIdParam(req, res);
  if (!id) return;

  try {
    const {
      nombre_entidad,
      alias,
      nacionalidad,
      estado,
      datos_completos
    } = req.body ?? {};

    const upd = await pool.query(
      `
      UPDATE clientes
      SET
        nombre_entidad = COALESCE($1, nombre_entidad),
        alias = COALESCE($2, alias),
        nacionalidad = COALESCE($3, nacionalidad),
        estado = COALESCE($4, estado),
        datos_completos = COALESCE($5, datos_completos),
        actualizado_en = NOW()
      WHERE id = $6
      RETURNING
        id,
        empresa_id,
        nombre_entidad,
        tipo_cliente,
        nacionalidad,
        estado,
        creado_en,
        actualizado_en
      `,
      [
        nombre_entidad ?? null,
        alias ?? null,
        nacionalidad ?? null,
        estado ?? null,
        datos_completos ?? null,
        id
      ]
    );

    if (upd.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    return res.json({ ok: true, cliente: upd.rows[0] });
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    return res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

export default router;
