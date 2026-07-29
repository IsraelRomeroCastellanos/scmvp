import { Router } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth.middleware';
import {
  ActividadesVulnerablesError,
  getActiveActivitiesCatalog,
  getActiveOperationsByActivityKey,
  normalizePublicKey,
} from '../services/actividades-vulnerables.service';

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

router.get('/actividades-vulnerables', authenticate, async (_req, res) => {
  try {
    const actividades_vulnerables = await getActiveActivitiesCatalog(pool);
    return res.json({ actividades_vulnerables });
  } catch (error) {
    console.error('Error al listar actividades vulnerables:', error);
    return res.status(500).json({
      error: 'Error al listar actividades vulnerables',
    });
  }
});

router.get('/operaciones-vulnerables', authenticate, async (req, res) => {
  const rawActivityKey = req.query.actividad_clave;
  if (rawActivityKey === undefined) {
    return res.status(400).json({
      error: 'actividad_clave es obligatoria',
    });
  }

  try {
    const actividad_clave = normalizePublicKey(rawActivityKey, 'actividad');
    const operaciones = await getActiveOperationsByActivityKey(
      pool,
      actividad_clave,
    );
    return res.json({ actividad_clave, operaciones });
  } catch (error) {
    if (error instanceof ActividadesVulnerablesError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error al listar operaciones vulnerables:', error);
    return res.status(500).json({
      error: 'Error al listar operaciones vulnerables',
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
