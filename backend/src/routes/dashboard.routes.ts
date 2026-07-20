import { Router } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';

const router = Router();

router.get(
  '/stats',
  authenticate,
  authorizeRoles('admin', 'consultor', 'cliente'),
  async (req, res) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(403).json({
          error: 'Acceso denegado: rol no encontrado'
        });
      }

      if (user.rol === 'cliente') {
        if (!user.empresa_id) {
          return res.status(403).json({
            error: 'Acceso denegado: empresa no asignada'
          });
        }

        const clientesResult = await pool.query(
          'SELECT COUNT(*) FROM clientes WHERE empresa_id = $1',
          [user.empresa_id]
        );

        return res.json({
          clientes: Number(clientesResult.rows[0].count)
        });
      }

      const [empresasResult, clientesResult] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM empresas'),
        pool.query('SELECT COUNT(*) FROM clientes')
      ]);

      if (user.rol === 'consultor') {
        return res.json({
          empresas: Number(empresasResult.rows[0].count),
          clientes: Number(clientesResult.rows[0].count)
        });
      }

      const usuariosResult = await pool.query(
        'SELECT COUNT(*) FROM usuarios WHERE activo = true'
      );

      return res.json({
        usuarios_activos: Number(usuariosResult.rows[0].count),
        empresas: Number(empresasResult.rows[0].count),
        clientes: Number(clientesResult.rows[0].count)
      });
    } catch (error) {
      console.error('Error al cargar estadísticas del dashboard:', error);
      return res.status(500).json({
        error: 'Error al cargar estadísticas del dashboard'
      });
    }
  }
);

export default router;
