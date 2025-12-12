// frontend/src/lib/auth.ts

export type NormalizedRole = 'administrador' | 'consultor' | 'cliente';

const cookieManager = {
  get: (name: string): string | undefined => {
    if (typeof document === 'undefined') return undefined;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : undefined;
  }
};

export const normalizeRole = (rol: any): NormalizedRole | null => {
  if (!rol) return null;
  const r = String(rol).trim().toLowerCase();

  if (
    r === 'admin' ||
    r === 'administrator' ||
    r === 'administrador' ||
    r === 'administrador del sistema'
  ) {
    return 'administrador';
  }

  if (r === 'consultor' || r === 'consultant') {
    return 'consultor';
  }

  if (r === 'cliente' || r === 'client' || r === 'user' || r === 'usuario') {
    return 'cliente';
  }

  return null;
};

export const isAdmin = (rol: any): boolean =>
  normalizeRole(rol) === 'administrador';

export const isConsultor = (rol: any): boolean =>
  normalizeRole(rol) === 'consultor';

export const isCliente = (rol: any): boolean =>
  normalizeRole(rol) === 'cliente';

export const checkAuth = (requiredRole?: NormalizedRole) => {
  const token =
    cookieManager.get('token') ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);

  const userStr =
    cookieManager.get('user') ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null);

  if (!token || !userStr) {
    return { authenticated: false, redirect: '/login' };
  }

  try {
    const userData = JSON.parse(userStr);
    const normalized = normalizeRole(userData.rol || userData.role);

    if (!normalized) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      return { authenticated: false, redirect: '/login' };
    }

    if (requiredRole && normalized !== requiredRole) {
      let defaultRoute = '/dashboard';

      if (normalized === 'administrador') defaultRoute = '/admin/usuarios';
      if (normalized === 'cliente') defaultRoute = '/clientes';
      if (normalized === 'consultor') defaultRoute = '/dashboard';

      return { authenticated: false, redirect: defaultRoute };
    }

    return {
      authenticated: true,
      user: { ...userData, rol: normalized },
      redirect: null
    };
  } catch (error) {
    console.error('Error parsing user data:', error);

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    return { authenticated: false, redirect: '/login' };
  }
};

export const getCurrentUser = () => {
  const userStr =
    cookieManager.get('user') ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null);

  if (!userStr) return null;

  try {
    const parsed = JSON.parse(userStr);
    const normalized = normalizeRole(parsed.rol || parsed.role);
    return { ...parsed, rol: normalized ?? parsed.rol };
  } catch {
    return null;
  }
};
