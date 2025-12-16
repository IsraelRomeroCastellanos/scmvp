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
  '/api/cliente/mis-clientes',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      let query = `
        SELECT
          c.id,
          c.nombre_entidad,
          c.tipo_cliente,
          c.estado,
          c.porcentaje_cumplimiento,
          e.nombre_legal AS empresa
        FROM clientes c
        INNER JOIN empresas e ON e.id = c.empresa_id
      `;

      const params: any[] = [];

      // 🔐 Si el usuario es cliente, solo ve los de su empresa
      if (user.rol === 'cliente') {
        query += ' WHERE c.empresa_id = $1';
        params.push(user.empresa_id);
      }

      query += ' ORDER BY c.nombre_entidad';

      const result = await pool.query(query, params);

      res.json({ clientes: result.rows });
    } catch (error) {
      console.error('Error al listar clientes:', error);
      res.status(500).json({ error: 'Error al listar clientes' });
    }
  }
);
export default router;
