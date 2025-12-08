// frontend/src/lib/auth.ts

// SOLUCIÓN CORRECTA: Importar la función por defecto
import jsCookies from 'js-cookie';

export const checkAuth = (requiredRole?: string) => {
  const token = jsCookies.get('token') || localStorage.getItem('token');
  const userStr = jsCookies.get('user') || localStorage.getItem('user');
  
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
    jsCookies.remove('token');
    jsCookies.remove('user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    return { authenticated: false, redirect: '/login' };
  }
};

export const getCurrentUser = () => {
  const userStr = jsCookies.get('user') || localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};