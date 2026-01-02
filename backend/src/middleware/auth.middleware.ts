// backend/src/middleware/auth.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { secretFingerprint } from '../utils/secretFingerprint';

export type AuthUser = {
  id: number;
  email: string;
  rol: string;
  empresa_id: number | null;
};

export type AuthRequest = Request & {
  user?: AuthUser;
};

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = String(req.headers.authorization || '');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('❌ JWT_SECRET no definido en Render Environment');
    return res
      .status(500)
      .json({ error: 'Configuración inválida: JWT_SECRET no definido' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as any;

    req.user = {
      id: Number(decoded?.id),
      email: String(decoded?.email ?? ''),
      rol: String(decoded?.rol ?? ''),
      empresa_id:
        decoded?.empresa_id === null || decoded?.empresa_id === undefined
          ? null
          : Number(decoded.empresa_id)
    };

    return next();
  } catch (err: any) {
    // Log útil para diagnosticar firma/secret vs expiración
    console.log('JWT_SECRET fp (verify):', secretFingerprint(jwtSecret));

    if (err?.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }

    return res.status(401).json({ error: 'Token inválido (firma/secret)' });
  }
}
