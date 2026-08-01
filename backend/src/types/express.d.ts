declare global {
  namespace Express {
    type AuthenticatedUser =
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

    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
