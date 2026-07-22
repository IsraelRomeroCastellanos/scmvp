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

router.get('/actividades-economicas', authenticate, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, clave, descripcion
       FROM public.cat_actividades_economicas
       WHERE activo = true
       ORDER BY descripcion`
    );

    return res.json({ actividades_economicas: result.rows });
  } catch (error) {
    console.error('Error al listar catálogo de actividades económicas:', error);
    return res.status(500).json({
      error: 'Error al listar catálogo de actividades económicas'
    });
  }
});

router.get('/giros-mercantiles', authenticate, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, clave, descripcion
       FROM public.cat_giros_mercantiles
       WHERE activo = true
       ORDER BY descripcion`
    );

    return res.json({ giros_mercantiles: result.rows });
  } catch (error) {
    console.error('Error al listar catálogo de giros mercantiles:', error);
    return res.status(500).json({
      error: 'Error al listar catálogo de giros mercantiles'
    });
  }
});

router.get('/codigos-postales', authenticate, async (req, res) => {
  const cp = req.query.cp;

  if (typeof cp !== 'string' || !/^\d{5}$/.test(cp)) {
    return res.status(400).json({
      error: 'cp es obligatorio y debe ser una cadena de 5 dígitos'
    });
  }

  try {
    const result = await pool.query(
      `SELECT
         id,
         codigo_postal,
         colonia,
         tipo_asentamiento,
         municipio,
         ciudad,
         estado,
         clave_estado,
         clave_municipio
       FROM public.cat_codigos_postales
       WHERE codigo_postal = $1
       ORDER BY colonia`,
      [cp]
    );

    return res.json({
      codigo_postal: cp,
      resultados: result.rows
    });
  } catch (error) {
    console.error('Error al consultar catálogo de códigos postales:', error);
    return res.status(500).json({
      error: 'Error al consultar catálogo de códigos postales'
    });
  }
});

export default router;
