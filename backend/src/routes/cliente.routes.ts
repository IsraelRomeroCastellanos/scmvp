// backend/src/routes/cliente.routes.ts
import { Router, Response } from 'express';
import pool from '../db';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

/**
 * ===============================
 * GET /api/cliente/mis-clientes
 * ===============================
 */
router.get(
  '/mis-clientes',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      let query = `
        SELECT
          id,
          nombre_entidad,
          tipo_cliente,
          nacionalidad,
          porcentaje_cumplimiento,
          estado
        FROM clientes
      `;

      const params: any[] = [];

      if (user.rol === 'cliente' && user.empresa_id) {
        query += ' WHERE empresa_id = $1';
        params.push(user.empresa_id);
      }

      query += ' ORDER BY creado_en DESC';

      const result = await pool.query(query, params);
      res.json({ clientes: result.rows });
    } catch (err) {
      console.error('Error al listar clientes:', err);
      res.status(500).json({ error: 'Error al listar clientes' });
    }
  }
);

/**
 * ===============================
 * PUT /api/cliente/:id
 * ===============================
 */
router.put(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const {
        nombre_entidad,
        tipo_cliente,
        nacionalidad,
        estado
      } = req.body;

      if (!nombre_entidad || !tipo_cliente) {
        return res.status(400).json({ error: 'Campos obligatorios faltantes' });
      }

      await pool.query(
        `
        UPDATE clientes
        SET
          nombre_entidad = $1,
          tipo_cliente = $2,
          nacionalidad = $3,
          estado = $4,
          actualizado_en = NOW()
        WHERE id = $5
        `,
        [
          nombre_entidad,
          tipo_cliente,
          nacionalidad || null,
          estado || 'activo',
          id
        ]
      );

      res.json({ ok: true });
    } catch (err) {
      console.error('Error al actualizar cliente:', err);
      res.status(500).json({ error: 'Error al actualizar cliente' });
    }
  }
);

export default router;
