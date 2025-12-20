// backend/src/routes/cliente.routes.ts
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import pool from '../db'; // <-- Si tu proyecto exporta pool distinto, ajusta esta línea (ver nota abajo)

const router = Router();

/**
 * Debug rápido para confirmar que el router de cliente está montado y corresponde al build actual.
 */
router.get('/__debug', (_req, res) => {
  res.json({ ok: true, router: 'cliente' });
});

/**
 * ===============================
 * LISTAR CLIENTES (handler reusable)
 * ===============================
 *
 * Regla:
 * - rol "cliente": debe tener empresa_id y solo ve sus clientes
 * - admin/consultor: ve todos (no requiere empresa_id)
 */
const listarClientesHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
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

    // Si es cliente, debe tener empresa_id y se filtra
    if (user.rol === 'cliente') {
      if (!user.empresa_id) {
        return res.status(400).json({ error: 'Empresa no asociada al usuario' });
      }
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

/**
 * ===============================
 * RUTAS (clientes)
 * ===============================
 */
router.get('/clientes', authenticate, listarClientesHandler);

/**
 * Alias para compatibilidad con FE actual (evita 404 en Vercel):
 * FE hoy llama: /api/cliente/mis-clientes
 */
router.get('/mis-clientes', authenticate, listarClientesHandler);

export default router;

/**
 * NOTA IMPORTANTE (si truena el build):
 * - Si tu pool NO se exporta como default, cambia:
 *     import pool from '../db';
 *   por alguna de estas variantes típicas:
 *     import { pool } from '../db';
 *     import { pool } from '../config/db';
 *     import pool from '../config/db';
 */
