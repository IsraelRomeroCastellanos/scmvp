// backend/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = header.slice('Bearer '.length).trim();
    const secret = process.env.JWT_SECRET;

    // Si falta secreto, es error de configuración (no 401)
    if (!secret) {
      console.error('❌ JWT_SECRET no definido en Render Environment');
      return res.status(500).json({ error: 'Configuración inválida: JWT_SECRET no definido' });
    }

    const decoded = jwt.verify(token, secret) as any;
    (req as any).user = decoded;

    return next();
  } catch (_err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
