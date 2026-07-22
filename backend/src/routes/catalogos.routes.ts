import { Router } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/paises', authenticate, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, clave, descripcion
       FROM public.cat_paises
       WHERE activo = true
       ORDER BY descripcion`
    );

    return res.json({ paises: result.rows });
  } catch (error) {
    console.error('Error al listar catálogo de países:', error);
    return res.status(500).json({ error: 'Error al listar catálogo de países' });
  }
});

export default router;
