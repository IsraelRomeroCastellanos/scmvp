// backend/src/routes/auth.routes.ts
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db';

const router = Router();

/**
 * ===============================
 * POST /api/auth/login
 * ===============================
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son obligatorios' });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        id,
        email,
        password_hash,
        nombre_completo,
        rol,
        empresa_id,
        activo
      FROM usuarios
      WHERE email = $1
      LIMIT 1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];

    if (!user.activo) {
      return res.status(403).json({ error: 'Usuario inactivo' });
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);

    if (!passwordOk) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET no definido');

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('❌ JWT_SECRET no definido en Render Environment');
  return res.status(500).json({ error: 'Configuración inválida: JWT_SECRET no definido' });
}

const token = jwt.sign(
  {
    id: user.id,
    email: user.email,
    rol: user.rol,
    empresa_id: user.empresa_id
  },
  jwtSecret,
  { expiresIn: '8h' }
);


    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre_completo: user.nombre_completo,
        rol: user.rol,
        empresa_id: user.empresa_id
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

export default router;
