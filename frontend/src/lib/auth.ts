// frontend/src/lib/auth.ts

// Tipos de rol normalizado en el FRONTEND
export type NormalizedRole = 'administrador' | 'consultor' | 'cliente';

// Funciones nativas para manejar cookies
const cookieManager = {
  get: (name: string): string | undefined => {
    if (typeof document === 'undefined') return undefined;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : undefined;
  }
};

/**
 * Normaliza cualquier valor de rol que venga del backend
 * a uno de los valores esperados en el frontend.
 *
 * Backend típicamente envía: "admin", "cliente", "consultor".
 * Aquí los convertimos a: "administrador", "cliente", "consultor".
 */
export const normalizeRole = (rol: any): NormalizedRole | null => {
  if (!rol) return null;
  const r = String(rol).trim().toLowerCase();

  if (r === 'admin' || r === 'administrator' || r === 'administrador' || r === 'administrador del sistema') {
    return 'administrador';
  }

  if (r === 'consultor' || r === 'consultant') {
    return 'consultor';
  }

  // valor por defecto seguro si viene "cliente", "client", etc.
  if (r === 'cliente' || r === 'client' || r === 'usuario' || r === 'user') {
    return 'cliente';
  }

  return null;
};

export const isAdmin = (rol: any): boolean => normalizeRole(rol) === 'administrador';
export const isConsultor = (rol: any): boolean => normalizeRole(rol) === 'consultor';
export const isCliente = (rol: any): boolean => normalizeRole(rol) === 'cliente';

/**
 * Verifica autenticación y opcionalmente rol requerido.
 * Devuelve:
 *  - authenticated: boolean
 *  - user: objeto usuario normalizado (incluye rol normalizado)
 *  - redirect: ruta sugerida si NO está autorizado
 */
export const checkAuth = (requiredRole?: NormalizedRole) => {
  // En cliente podemos usar cookies y localStorage
  const token =
    cookieManager.get('token') ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);

  const userStr =
    cookieManager.get('user') ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null);

  if (!token || !userStr) {
    return { authenticated: false, redirect: '/login' as const };
  }

  try {
    const userData = JSON.parse(userStr);
    const normalized = normalizeRole(userData.rol || userData.role);

    if (!normalized) {
      // Rol desconocido → tratamos como no autenticado
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      return { authenticated: false, redirect: '/login' as const };
    }

    // Si se requiere un rol específico y no coincide
    if (requiredRole && normalized !== requiredRole) {
      let defaultRoute: string = '/dashboard';

      if (normalized === 'administrador') defaultRoute = '/admin/usuarios';
      if (normalized === 'cliente') defaultRoute = '/clientes';
      if (normalized === 'consultor') defaultRoute = '/dashboard';

      return { authenticated: false, redirect: defaultRoute as const };
    }

    // Devolvemos user con el rol normalizado
    return {
      authenticated: true,
      user: { ...userData, rol: normalized },
      redirect: null as null
    };

  } catch (error) {
    console.error('Error parsing user data:', error);

    // Limpiar datos corruptos
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    return { authenticated: false, redirect: '/login' as const };
  }
};

/**
 * Obtiene el usuario actual (sin validar rol).
 * Útil si solo quieres leer datos básicos.
 */
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
