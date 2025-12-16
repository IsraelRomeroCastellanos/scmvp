// backend/src/routes/cliente.routes.ts
import { Router } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';

const router = Router();

/**
 * GET /api/cliente/mis-clientes
 * Listado rápido para tabla (limitado).
 */
router.get(
  '/mis-clientes',
  authenticate,
  authorizeRoles('admin', 'consultor', 'cliente'),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const user = req.user;

      let query = `
        SELECT
          c.id,
          c.nombre,
          c.tipo,
          c.estado,
          e.nombre_legal AS empresa
        FROM clientes c
        LEFT JOIN empresas e ON e.id = c.empresa_id
      `;

      const params: any[] = [];

      // cliente: sólo clientes de su empresa
      if (user.rol === 'cliente') {
        query += ` WHERE c.empresa_id = $1`;
        params.push(user.empresa_id);
      }

      query += ` ORDER BY c.id DESC LIMIT 100`;

      const { rows } = await pool.query(query, params);
      return res.json({ clientes: rows });
    } catch (error) {
      console.error('Error al listar clientes:', error);
      return res.status(500).json({ error: 'Error al listar clientes' });
    }
  }
);

export default router;
