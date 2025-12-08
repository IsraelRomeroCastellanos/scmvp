// frontend/src/lib/auth.ts
import CookieManager from 'js-cookie';  // Renombrado

export const checkAuth = (requiredRole?: string) => {
  const token = CookieManager.get('token') || localStorage.getItem('token');
  const userStr = CookieManager.get('user') || localStorage.getItem('user');
  
  if (!token || !userStr) {
    return { authenticated: false, redirect: '/login' };
  }
  
  try {
    const userData = JSON.parse(userStr);
    
    if (requiredRole && userData.rol !== requiredRole) {
      let defaultRoute = '/dashboard';
      if (userData.rol === 'administrador') defaultRoute = '/admin/usuarios';
      if (userData.rol === 'cliente') defaultRoute = '/cliente/clientes';
      if (userData.rol === 'consultor') defaultRoute = '/dashboard';
      
      return { authenticated: false, redirect: defaultRoute };
    }
    
    return { authenticated: true, user: userData, redirect: null };
    
  } catch (error) {
    console.error('Error parsing user data:', error);
    CookieManager.remove('token');
    CookieManager.remove('user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    return { authenticated: false, redirect: '/login' };
  }
};

export const getCurrentUser = () => {
  const userStr = CookieManager.get('user') || localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};