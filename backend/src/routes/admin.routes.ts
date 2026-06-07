// backend/src/routes/admin.routes.ts
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';

const router = Router();

/**
 * ===============================
 * DEBUG — confirmar que el router carga (PROTEGIDO)
 * ===============================
 *
 * Antes estaba público y respondía 200 sin token.
 * Ahora requiere token válido y rol admin.
 */
router.get('/__debug', authenticate, authorizeRoles('admin'), (_req, res) => {
  res.json({ ok: true, router: 'admin' });
});

// ===============================
// LISTAR USUARIOS (ADMIN)
// ===============================
router.get(
  '/usuarios',
  authenticate,
  authorizeRoles('admin'),
  async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          id,
          email,
          nombre_completo,
          rol,
          empresa_id,
          activo
        FROM usuarios
        ORDER BY id ASC
      `);

      res.json({ usuarios: result.rows });
    } catch (error) {
      console.error('Error al listar usuarios:', error);
      res.status(500).json({ error: 'Error al listar usuarios' });
    }
  }
);

// ===============================
// CREAR USUARIO (ADMIN)
// ===============================
router.post(
  '/usuarios',
  authenticate,
  authorizeRoles('admin'),
  async (req, res) => {
    try {
      const email = String(req.body?.email ?? '').trim().toLowerCase();
      const password = String(req.body?.password ?? '');
      const nombre_completo = String(req.body?.nombre_completo ?? '').trim();
      const rol = String(req.body?.rol ?? '').trim().toLowerCase();
      const empresaIdRaw = req.body?.empresa_id;
      const activoRaw = req.body?.activo;

      const rolesPermitidos = ['admin', 'consultor', 'cliente'];

      if (!email) {
        return res.status(400).json({ error: 'email es obligatorio' });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'email invalido' });
      }

      if (!password) {
        return res.status(400).json({ error: 'password es obligatorio' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'password debe tener al menos 8 caracteres' });
      }

      if (!nombre_completo) {
        return res.status(400).json({ error: 'nombre_completo es obligatorio' });
      }

      if (!rolesPermitidos.includes(rol)) {
        return res.status(400).json({ error: 'rol invalido' });
      }

      let empresa_id: number | null = null;

      if (empresaIdRaw !== undefined && empresaIdRaw !== null && empresaIdRaw !== '') {
        const parsedEmpresaId = Number(empresaIdRaw);

        if (!Number.isInteger(parsedEmpresaId) || parsedEmpresaId <= 0) {
          return res.status(400).json({ error: 'empresa_id invalido' });
        }

        empresa_id = parsedEmpresaId;
      }

      if (rol === 'cliente' && !empresa_id) {
        return res.status(400).json({ error: 'empresa_id es obligatorio para rol cliente' });
      }

      let activo = true;

      if (activoRaw !== undefined) {
        if (typeof activoRaw !== 'boolean') {
          return res.status(400).json({ error: 'activo debe ser boolean' });
        }

        activo = activoRaw;
      }

      if (empresa_id !== null) {
        const empresaResult = await pool.query(
          'SELECT id FROM empresas WHERE id = $1 LIMIT 1',
          [empresa_id]
        );

        if (empresaResult.rows.length === 0) {
          return res.status(400).json({ error: 'empresa_id no existe' });
        }
      }

      const existingUser = await pool.query(
        'SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: 'email ya registrado' });
      }

      const password_hash = await bcrypt.hash(password, 10);

      const result = await pool.query(
        `
        INSERT INTO usuarios (
          email,
          password_hash,
          nombre_completo,
          rol,
          empresa_id,
          activo
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          email,
          nombre_completo,
          rol,
          empresa_id,
          activo
        `,
        [email, password_hash, nombre_completo, rol, empresa_id, activo]
      );

      return res.status(201).json({ usuario: result.rows[0] });
    } catch (error) {
      console.error('Error al crear usuario:', error);
      return res.status(500).json({ error: 'Error al crear usuario' });
    }
  }
);


/**
 * ===============================
 * LISTAR EMPRESAS
 * ===============================
 */
router.get(
  '/empresas',
  authenticate,
  authorizeRoles('admin', 'consultor'),
  async (_req, res) => {
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
      res.status(500).json({ error: 'Error al listar empresas' });
    }
  }
);

export default router;
