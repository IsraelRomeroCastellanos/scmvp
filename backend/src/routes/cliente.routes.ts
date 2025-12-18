// backend/src/routes/cliente.routes.ts
import { Router } from 'express';
import  pool  from '../db';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';

const router = Router();

/**
 * ===============================
 * LISTAR CLIENTES
 * ===============================
 */
router.get(
  '/api/cliente/mis-clientes',
  authenticate,
  authorizeRoles('admin', 'consultor', 'cliente'),
  async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      let query = `
        SELECT
          id,
          nombre_entidad,
          tipo_cliente,
          nacionalidad,
          porcentaje_cumplimiento,
          estado
        FROM clientes
      `;
      const params: any[] = [];

      if (user.rol === 'cliente') {
        query += ' WHERE empresa_id = $1';
        params.push(user.empresa_id);
      }

      query += ' ORDER BY creado_en DESC';

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
 * EDITAR CLIENTE (PUT)
 * ===============================
 */
router.put(
  '/api/cliente/:id',
  authenticate,
  authorizeRoles('admin', 'consultor'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        nombre_entidad,
        alias,
        tipo_cliente,
        nacionalidad,
        domicilio_mexico,
        ocupacion,
        actividad_economica,
        estado
      } = req.body;

      const result = await pool.query(
        `
        UPDATE clientes
        SET
          nombre_entidad = $1,
          alias = $2,
          tipo_cliente = $3,
          nacionalidad = $4,
          domicilio_mexico = $5,
          ocupacion = $6,
          actividad_economica = $7,
          estado = $8,
          actualizado_en = NOW()
        WHERE id = $9
        RETURNING *
        `,
        [
          nombre_entidad,
          alias,
          tipo_cliente,
          nacionalidad,
          domicilio_mexico,
          ocupacion,
          actividad_economica,
          estado,
          id
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      res.json({ ok: true, cliente: result.rows[0] });
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      res.status(500).json({ error: 'Error al actualizar cliente' });
    }
  }
);

export default router;
