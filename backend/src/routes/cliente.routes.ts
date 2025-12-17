// backend/src/routes/cliente.routes.ts
import { Router, Response } from 'express';
import pool from '../db';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /mis-clientes
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

      if (user.rol === 'cliente') {
        query += ' WHERE empresa_id = $1';
        params.push(user.empresa_id);
      }

      query += ' ORDER BY creado_en DESC';

      const result = await pool.query(query, params);

      res.json({ clientes: result.rows });
    } catch (error) {
      console.error('Error al listar clientes:', error);
      res.status(500).json({ error: 'Error al listar clientes' });
    }
  }
);

export default router;
