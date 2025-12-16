// backend/src/routes/cliente.routes.ts
import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import pool from '../db';
import ExcelJS from 'exceljs';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    rol: string;
    empresa_id: number | null;
  };
}

router.get(
  '/api/cliente/mis-clientes',
  authenticate,
  requireRole('admin', 'consultor', 'cliente'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const { rol, empresa_id } = req.user;

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

      if (rol === 'cliente') {
        query += ' WHERE c.empresa_id = $1';
        params.push(empresa_id);
      }

      query += ' ORDER BY c.id DESC LIMIT 100';

      const result = await pool.query(query, params);

      res.json({ clientes: result.rows });
    } catch (error) {
      console.error('Error al listar clientes:', error);
      res.status(500).json({ error: 'Error al listar clientes' });
    }
  }
);

export default router;


