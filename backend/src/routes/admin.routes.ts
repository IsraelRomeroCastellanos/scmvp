// backend/src/routes/admin.routes.ts
import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';

const router = Router();

/**
 * =========================
 * EMPRESAS
 * =========================
 */

// LISTAR EMPRESAS
router.get(
  '/api/admin/empresas',
  authenticate,
  authorizeRoles('admin'),
  async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT
          id,
          nombre_legal,
          rfc,
          tipo_entidad,
          estado,
          entidad,
          municipio,
          codigo_postal
        FROM empresas
        ORDER BY nombre_legal
      `);

      res.json({ empresas: result.rows });
    } catch (error) {
      console.error('Error al listar empresas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);


// OBTENER EMPRESA POR ID
router.get(
  '/api/admin/empresas/:id',
  authenticate,
  authorizeRoles('admin'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
        SELECT
          id,
          nombre_legal,
          rfc,
          tipo_entidad,
          estado,
          domicilio,
          entidad,
          municipio,
          codigo_postal
        FROM empresas
        WHERE id = $1
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }

      res.json({ empresa: result.rows[0] });
    } catch (error) {
      console.error('Error al obtener empresa:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

// CREAR EMPRESA
router.post(
  '/api/admin/empresas',
  authenticate,
  authorizeRoles('admin'),
  async (req: Request, res: Response) => {
    try {
      const {
        nombre_legal,
        rfc,
        tipo_entidad,
        domicilio,
        entidad,
        municipio,
        codigo_postal,
      } = req.body;

      if (
        !nombre_legal ||
        !tipo_entidad ||
        !domicilio ||
        !entidad ||
        !municipio ||
        !codigo_postal
      ) {
        return res.status(400).json({
          error: 'Faltan campos obligatorios',
        });
      }

      await pool.query(
        `
        INSERT INTO empresas
        (nombre_legal, rfc, tipo_entidad, domicilio, entidad, municipio, codigo_postal)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          nombre_legal,
          rfc || null,
          tipo_entidad,
          domicilio,
          entidad,
          municipio,
          codigo_postal,
        ]
      );

      res.json({ ok: true });
    } catch (error) {
      console.error('Error al crear empresa:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

export default router;