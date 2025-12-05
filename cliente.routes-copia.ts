import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

const router = Router();

export const clienteRoutes = (pool: Pool) => {
  router.get('/api/cliente/mis-clientes', async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT id, nombre_entidad, tipo_cliente, actividad_economica, estado FROM clientes');
      res.json({ clientes: result.rows });
    } catch (err: any) {
      console.error('Error al listar clientes:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  return router;
};