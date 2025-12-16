import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        rol: 'admin' | 'consultor' | 'cliente';
        empresa_id: number | null;
      };
    }
  }
}

export {};
