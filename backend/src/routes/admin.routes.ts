// backend/src/routes/admin.routes.ts

import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';

const router = Router();

/**
 * ==========================
 * EMPRESAS
 * ==========================
 */

// LISTAR EMPRESAS (para listado)
router.get(
  '/empresas',
  authenticate,
  authorizeRoles('admin'),
  async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT id, nombre_legal, rfc, tipo_entidad, estado, domicilio
        FROM empresas
        ORDER BY nombre_legal
      `);

      const empresas = result.rows.map((e) => {
        let entidad = null;
        let municipio = null;
        let codigo_postal = null;

        if (e.domicilio) {
          const parts = e.domicilio.split(',').map((p: string) => p.trim());

          municipio = parts[1] || null;
          entidad = parts[2] || null;

          const cpMatch = e.domicilio.match(/CP\s*(\d{4,6})/i);
          if (cpMatch) codigo_postal = cpMatch[1];
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
  }
);

// OBTENER EMPRESA POR ID
router.get(
  '/empresas/:id',
  authenticate,
  authorizeRoles('admin'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'SELECT * FROM empresas WHERE id = $1',
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
  }
);

// CREAR EMPRESA
router.post(
  '/empresas',
  authenticate,
  authorizeRoles('admin'),
  async (req: Request, res: Response) => {
    try {
      const {
        nombre_legal,
        rfc,
        tipo_entidad,
        domicilio
      } = req.body;

      if (!nombre_legal || !tipo_entidad || !domicilio) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }

      const result = await pool.query(
        `
        INSERT INTO empresas (nombre_legal, rfc, tipo_entidad, domicilio)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [nombre_legal, rfc, tipo_entidad, domicilio]
      );

      res.status(201).json({ empresa: result.rows[0] });
    } catch (err) {
      console.error('Error al crear empresa:', err);
      res.status(500).json({ error: 'Error al crear empresa' });
    }
  }
);

// EDITAR EMPRESA
router.put(
  '/empresas/:id',
  authenticate,
  authorizeRoles('admin'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        nombre_legal,
        rfc,
        tipo_entidad,
        estado,
        domicilio
      } = req.body;

      const result = await pool.query(
        `
        UPDATE empresas
        SET nombre_legal = $1,
            rfc = $2,
            tipo_entidad = $3,
            estado = $4,
            domicilio = $5,
            actualizado_en = now()
        WHERE id = $6
        RETURNING *
        `,
        [nombre_legal, rfc, tipo_entidad, estado, domicilio, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }

      res.json({ empresa: result.rows[0] });
    } catch (err) {
      console.error('Error al editar empresa:', err);
      res.status(500).json({ error: 'Error al editar empresa' });
    }
  }
);

export default router;
