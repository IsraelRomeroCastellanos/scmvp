// backend/src/routes/auth.routes.ts
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db';

const router = Router();

/**
 * LOGIN
 * POST /api/auth/login
 */
router.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validación básica
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña son obligatorios'
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        email,
        password,
        rol,
        empresa_id,
        nombre_completo
      FROM usuarios
      WHERE email = $1
      `,
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET no definido');
      return res.status(500).json({
        success: false,
        error: 'Error de configuración del servidor'
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        rol: user.rol,
        empresa_id: user.empresa_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        rol: user.rol,
        empresa_id: user.empresa_id,
        nombre_completo: user.nombre_completo
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * LOGOUT (opcional, frontend puede manejarlo localmente)
 * POST /api/auth/logout
 */
router.post('/api/auth/logout', (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: 'Logout exitoso'
  });
});

export default router;
