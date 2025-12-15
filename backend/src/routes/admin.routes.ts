// backend/src/routes/admin.routes.ts
import { Router } from 'express';
import pool from '../db';

const router = Router();

// ✅ Listar empresas (extendido para listado)
router.get('/api/admin/empresas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        nombre_legal,
        rfc,
        tipo_entidad,
        estado,
        domicilio
      FROM empresas
      ORDER BY nombre_legal
    `);

    const empresas = result.rows.map((e) => {
      let entidad = null;
      let municipio = null;
      let codigo_postal = null;

      if (e.domicilio) {
        const parts = e.domicilio.split(',').map((p: string) => p.trim());

        if (parts[1]) municipio = parts[1];
        if (parts[2]) entidad = parts[2];

        const cpMatch = e.domicilio.match(/CP\s*([0-9]{4,6})/i);
        if (cpMatch?.[1]) codigo_postal = cpMatch[1];
      }

      return {
        id: e.id,
        nombre_legal: e.nombre_legal,
        rfc: e.rfc,
        tipo_entidad: e.tipo_entidad,
        estado: e.estado,
        entidad,
        municipio,
        codigo_postal
      };
    });

    res.json({ empresas });
  } catch (err) {
    console.error('Error al listar empresas:', err);
    res.status(500).json({ error: 'Error al listar empresas' });
  }
});


/**
 * ===============================
 * OBTENER EMPRESA POR ID
 * GET /api/admin/empresas/:id
 * ===============================
 */
router.get('/empresas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        id,
        nombre_legal,
        rfc,
        tipo_entidad,
        pais,
        domicilio,
        estado
      FROM empresas
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    res.json({ empresa: result.rows[0] });
  } catch (err) {
    console.error('Error al obtener empresa:', err);
    res.status(500).json({ error: 'Error al obtener empresa' });
  }
});

/**
 * ===============================
 * CREAR EMPRESA
 * POST /api/admin/empresas
 * ===============================
 */
router.post('/empresas', async (req, res) => {
  try {
    const {
      nombre_legal,
      rfc,
      tipo_entidad,
      pais,
      domicilio
    } = req.body;

    if (!nombre_legal || !tipo_entidad || !pais || !domicilio) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios'
      });
    }

    const result = await pool.query(
      `
      INSERT INTO empresas
        (nombre_legal, rfc, tipo_entidad, pais, domicilio)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [nombre_legal, rfc, tipo_entidad, pais, domicilio]
    );

    res.status(201).json({
      success: true,
      id: result.rows[0].id
    });
  } catch (err) {
    console.error('Error al crear empresa:', err);
    res.status(500).json({ error: 'Error al crear empresa' });
  }
});

/**
 * ===============================
 * EDITAR EMPRESA
 * PUT /api/admin/empresas/:id
 * ===============================
 */
router.put('/empresas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre_legal,
      rfc,
      tipo_entidad,
      pais,
      domicilio,
      estado
    } = req.body;

    if (!nombre_legal || !tipo_entidad || !pais || !domicilio || !estado) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios'
      });
    }

    const result = await pool.query(
      `
      UPDATE empresas
      SET
        nombre_legal = $1,
        rfc = $2,
        tipo_entidad = $3,
        pais = $4,
        domicilio = $5,
        estado = $6,
        actualizado_en = NOW()
      WHERE id = $7
      RETURNING id
      `,
      [
        nombre_legal,
        rfc,
        tipo_entidad,
        pais,
        domicilio,
        estado,
        id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error al editar empresa:', err);
    res.status(500).json({ error: 'Error al editar empresa' });
  }
});

export default router;
