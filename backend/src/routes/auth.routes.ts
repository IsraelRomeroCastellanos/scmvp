// backend/src/routes/auth.routes.ts
import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_jwt_muy_seguro';

// Función para sanear entradas
const sanitizeInput = (input: string) => {
  return input.trim().toLowerCase();
};

export default (pool: Pool) => {
  // Endpoint de login
  router.post('/api/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      // Validación de entradas
      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Email y contraseña son requeridos' 
        });
      }

      console.log('Login recibido:', { email, password: '******' });

      // Sanear email
      const sanitizedEmail = sanitizeInput(email);

      // Buscar usuario
      const result = await pool.query(
        'SELECT id, email, password_hash, nombre_completo, rol, empresa_id, activo FROM usuarios WHERE email = $1',
        [sanitizedEmail]
      );

      if (result.rows.length === 0) {
        console.log('Usuario no encontrado para el email:', sanitizedEmail);
        return res.status(401).json({ 
          error: 'Credenciales inválidas' 
        });
      }

      const user = result.rows[0];

      // Verificar si el usuario está activo
      if (!user.activo) {
        console.log('Usuario inactivo:', sanitizedEmail);
        return res.status(403).json({ 
          error: 'Usuario desactivado. Contacta al administrador.' 
        });
      }

      // Verificar contraseña
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      
      if (!passwordMatch) {
        console.log('Contraseña incorrecta para el usuario:', sanitizedEmail);
        return res.status(401).json({ 
          error: 'Credenciales inválidas' 
        });
      }

      // Generar token JWT
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          rol: user.rol,
          empresaId: user.empresa_id
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log('Login exitoso para:', sanitizedEmail);

      // Responder con token y datos del usuario (sin la contraseña)
      res.status(200).json({
        token,
        user: {
          id: user.id,
          nombre_completo: user.nombre_completo,
          email: user.email,
          rol: user.rol,
          empresa_id: user.empresa_id,
          activo: user.activo
        }
      });

    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  });

  return router;
};