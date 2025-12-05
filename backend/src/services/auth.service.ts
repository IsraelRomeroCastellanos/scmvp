// backend/src/services/auth.service.ts
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

export const generateToken = (userId: number, email: string, role: string, empresaId?: number) => {
  return jwt.sign({ userId, email, role, empresaId }, JWT_SECRET, { expiresIn: '24h' });
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET) as { 
      userId: number; 
      email: string; 
      role: string; 
      empresaId?: number; 
    };
  } catch (err) {
    return null;
  }
};

// ✅ NO incluir: export { JWT_SECRET };