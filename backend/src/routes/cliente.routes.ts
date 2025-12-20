// backend/src/routes/cliente.routes.ts
import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * ===============================
 * DEBUG
 * ===============================
 */
router.get('/__debug', (_req, res) => {
  res.json({ ok: true, router: 'cliente' });
});

/**
 * ===============================
 * LISTAR CLIENTES
 * ===============================
 */
router.get(
  '/clientes',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      let query = `
        SELECT
          id,
          nombre_entidad,
          tipo_cliente,
          nacionalidad,
          estado,
          creado_en
        FROM clientes
      `;
      const params: any[] = [];

      // Si es cliente, sólo ve los de su empresa
      if (user.rol === 'cliente' && user.empresa_id) {
        query += ` WHERE empresa_id = $1`;
        params.push(user.empresa_id);
      }

      query += ` ORDER BY creado_en DESC`;

      const result = await pool.query(query, params);
      res.json({ clientes: result.rows });
    } catch (error) {
      console.error('Error al listar clientes:', error);
      res.status(500).json({ error: 'Error al listar clientes' });
    }
  }
);

/**
 * ===============================
 * REGISTRAR CLIENTE
 * ===============================
 */
router.post(
  '/clientes',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      if (!user || !user.empresa_id) {
        return res.status(403).json({ error: 'Empresa no asociada al usuario' });
      }

      const {
        tipo_cliente,
        nombre_entidad,
        nacionalidad,
        datos_completos
      } = req.body;

      if (!tipo_cliente || !nombre_entidad || !datos_completos) {
        return res.status(400).json({ error: 'Campos obligatorios faltantes' });
      }

      // ===============================
      // VALIDACIÓN FLEXIBLE DE CONTACTO
      // ===============================
      const contacto = datos_completos.contacto || {};

      const pais =
        contacto.pais ||
        contacto.pais_descripcion ||
        contacto.descripcion_pais ||
        contacto.pais_contacto ||
        contacto.country;

      if (!pais) {
        return res
          .status(400)
          .json({ error: 'Contacto: país es obligatorio' });
      }

      const telefono =
        contacto.telefono ||
        contacto.telefono_contacto ||
        contacto.phone;

      if (!telefono) {
        return res
          .status(400)
          .json({ error: 'Contacto: teléfono es obligatorio' });
      }

      // ===============================
      // INSERT
      // ===============================
      await pool.query(
        `
        INSERT INTO clientes (
          empresa_id,
          nombre_entidad,
          tipo_cliente,
          nacionalidad,
          datos_completos,
          estado
        )
        VALUES ($1, $2, $3, $4, $5, 'activo')
        `,
        [
          user.empresa_id,
          nombre_entidad,
          tipo_cliente,
          nacionalidad || null,
          datos_completos
        ]
      );

      res.json({ ok: true });
    } catch (error) {
      console.error('Error al registrar cliente:', error);
      res.status(500).json({ error: 'Error al registrar cliente' });
    }
  }
);

export default router;
