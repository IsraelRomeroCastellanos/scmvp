export const checkAuth = (requiredRole?: string) => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (!token || !user) {
    return { authenticated: false, redirect: '/login' };
  }
  
  const userData = JSON.parse(user);
  
  if (requiredRole && userData.rol !== requiredRole) {
    // Redirigir según el rol del usuario
    if (userData.rol === 'admin') {
      return { authenticated: true, redirect: '/admin/usuarios' };
    } else if (userData.rol === 'cliente') {
      return { authenticated: true, redirect: '/cliente/clientes' };
    }
    return { authenticated: false, redirect: '/login' };
  }
  
  return { authenticated: true, redirect: null };
};