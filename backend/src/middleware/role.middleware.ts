// backend/src/middleware/role.middleware.ts
import { Request, Response, NextFunction } from 'express';

export function authorizeRoles(...rolesPermitidos: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // El middleware authenticate ya puso el usuario en req.user
    const user = (req as any).user;

    if (!user || !user.rol) {
      return res.status(403).json({
        error: 'Acceso denegado: rol no encontrado'
      });
    }

    if (!rolesPermitidos.includes(user.rol)) {
      return res.status(403).json({
        error: 'Acceso denegado: rol insuficiente'
      });
    }

    next();
  };
}
