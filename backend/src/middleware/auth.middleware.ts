// backend/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // No imprimimos el secreto, solo avisamos que falta
    console.error('❌ JWT_SECRET no está definido en variables de entorno');
    throw new Error('JWT_SECRET no definido');
  }
  return secret;
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.substring('Bearer '.length).trim();
    const secret = getJwtSecret();

    const decoded = jwt.verify(token, secret) as any;

    // Guardamos el usuario para rutas posteriores
    (req as any).user = decoded;

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
