// backend/src/middleware/auth.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { secretFingerprint } from '../utils/secretFingerprint';

export type UserRole = 'admin' | 'consultor' | 'cliente';

export type AuthUser =
  | {
      id: number;
      email: string;
      rol: 'admin';
      empresa_id: null;
    }
  | {
      id: number;
      email: string;
      rol: 'consultor' | 'cliente';
      empresa_id: number;
    };

export type AuthRequest = Request & {
  user?: AuthUser;
};

function isUserRole(x: any): x is UserRole {
  return x === 'admin' || x === 'consultor' || x === 'cliente';
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = String(req.headers.authorization || '');
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : '';

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('❌ JWT_SECRET no definido en Render Environment');
    return res.status(500).json({ error: 'Configuración inválida: JWT_SECRET no definido' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as any;

    const rolRaw = decoded?.rol;
    if (!isUserRole(rolRaw)) {
      return res.status(401).json({ error: 'Token inválido (rol inválido)' });
    }

    if (rolRaw === 'admin') {
      if (decoded?.empresa_id !== null) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      req.user = {
        id: Number(decoded?.id),
        email: String(decoded?.email ?? ''),
        rol: rolRaw,
        empresa_id: null
      };
    } else {
      const empresaId = decoded?.empresa_id;

      if (typeof empresaId !== 'number' || !Number.isInteger(empresaId) || empresaId <= 0) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      req.user = {
        id: Number(decoded?.id),
        email: String(decoded?.email ?? ''),
        rol: rolRaw,
        empresa_id: empresaId
      };
    }

    return next();
  } catch (err: any) {
    console.log('JWT_SECRET fp (verify):', secretFingerprint(jwtSecret));

    if (err?.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }

    return res.status(401).json({ error: 'Token inválido (firma/secret)' });
  }
}
