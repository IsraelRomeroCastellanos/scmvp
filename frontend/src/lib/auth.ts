// frontend/src/lib/auth.ts
import Cookies from 'js-cookie';

export const checkAuth = (requiredRole?: string) => {
  // Intentar de cookies primero, luego localStorage
  const token = Cookies.get('token') || localStorage.getItem('token');
  const userStr = Cookies.get('user') || localStorage.getItem('user');
  
  if (!token || !userStr) {
    return { authenticated: false, redirect: '/login' };
  }
  
  try {
    const userData = JSON.parse(userStr);
    
    // Verificar rol si se requiere
    if (requiredRole && userData.rol !== requiredRole) {
      // Redirigir al dashboard correspondiente
      let defaultRoute = '/dashboard';
      if (userData.rol === 'administrador') defaultRoute = '/admin/usuarios';
      if (userData.rol === 'cliente') defaultRoute = '/cliente/clientes';
      if (userData.rol === 'consultor') defaultRoute = '/dashboard';
      
      return { authenticated: false, redirect: defaultRoute };
    }
    
    return { authenticated: true, user: userData, redirect: null };
    
  } catch (error) {
    console.error('Error parsing user data:', error);
    // Limpiar datos corruptos
    Cookies.remove('token');
    Cookies.remove('user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    return { authenticated: false, redirect: '/login' };
  }
};

// Función auxiliar para obtener el usuario actual
export const getCurrentUser = () => {
  const userStr = Cookies.get('user') || localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};