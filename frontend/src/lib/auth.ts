// frontend/src/lib/auth.ts

export type AuthResult = {
  authenticated: boolean;
  redirect?: string;
  user?: any;
  token?: string;
};

// Manejo simple de cookies (solo en cliente)
const cookieManager = {
  get(name: string): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(
      new RegExp("(^| )" + name + "=([^;]+)")
    );
    return match ? decodeURIComponent(match[2]) : null;
  },
};

/**
 * Lee token y user desde cookies y/o localStorage.
 * Usa los mismos nombres que tu login y Navbar:
 *  - 'token'
 *  - 'user'
 */
function getStoredAuth(): { user: any | null; token: string | null } {
  if (typeof window === "undefined") {
    return { user: null, token: null };
  }

  let token = cookieManager.get("token");
  let userStr = cookieManager.get("user");

  // Si no están en cookies, intenta en localStorage
  if (!token) {
    token = window.localStorage.getItem("token");
  }
  if (!userStr) {
    userStr = window.localStorage.getItem("user");
  }

  let user: any = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch {
      user = null;
    }
  }

  return { user, token };
}

/**
 * Verifica si el usuario tiene el rol requerido.
 * - Admin ve todo.
 * - Si requiredRole es 'all', cualquier usuario autenticado pasa.
 * - Si no hay rol o no coincide, no pasa.
 */
function hasRequiredRole(user: any, requiredRole?: string): boolean {
  if (!requiredRole) return true;
  if (!user || !user.rol) return false;

  const userRole = user.rol;

  // Admin ve todo
  if (userRole === "administrador") return true;

  if (requiredRole === "all") return true;

  return userRole === requiredRole;
}

/**
 * checkAuth: usado por AuthGuard.
 * Devuelve:
 *  - authenticated: true/false
 *  - redirect: ruta a la que debe ir si NO está autenticado
 */
export function checkAuth(requiredRole?: string): AuthResult {
  const { user, token } = getStoredAuth();

  // Sin token o sin usuario → no autenticado
  if (!user || !token) {
    return {
      authenticated: false,
      redirect: "/login",
    };
  }

  // Si no cumple el rol requerido → también fuera
  if (!hasRequiredRole(user, requiredRole)) {
    return {
      authenticated: false,
      redirect: "/login",
    };
  }

  return {
    authenticated: true,
    user,
    token,
  };
}
