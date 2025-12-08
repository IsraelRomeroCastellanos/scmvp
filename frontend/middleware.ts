// frontend/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Mapa de rutas protegidas y el rol requerido (null = cualquier autenticado)
const protectedRoutes: { [key: string]: string | null } = {
  '/dashboard': null,
  '/admin/usuarios': 'administrador',
  '/admin/empresas': 'administrador',
  '/cliente/clientes': 'cliente',
  '/cliente/carga-masiva': 'cliente',
  '/cliente/registrar-cliente': 'cliente',
  '/consultor': 'consultor', // Si tienes rutas específicas para consultor
};

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const userCookie = request.cookies.get('user')?.value;
  const { pathname } = request.nextUrl;

  // Verificar si la ruta actual está protegida
  let requiredRole: string | null = null;
  
  // Buscar coincidencia exacta o por prefijo para rutas dinámicas
  for (const route in protectedRoutes) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      requiredRole = protectedRoutes[route];
      break;
    }
  }

  // Si la ruta no está en la lista de protegidas, permitir acceso
  if (requiredRole === undefined) {
    return NextResponse.next();
  }

  // Si la ruta es protegida y no hay token, redirigir a login
  if (!token || !userCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const userData = JSON.parse(userCookie);

    // Si se requiere un rol específico, verificar coincidencia
    if (requiredRole && userData.rol !== requiredRole) {
      // Usuario sin permisos: redirigir a su dashboard por defecto
      let defaultRoute = '/dashboard';
      if (userData.rol === 'administrador') defaultRoute = '/admin/usuarios';
      if (userData.rol === 'cliente') defaultRoute = '/cliente/clientes';
      if (userData.rol === 'consultor') defaultRoute = '/dashboard';

      return NextResponse.redirect(new URL(defaultRoute, request.url));
    }

    // Usuario tiene permisos: permitir acceso
    return NextResponse.next();

  } catch (error) {
    // Error en los datos: limpiar cookies y redirigir
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    response.cookies.delete('user');
    return response;
  }
}

// Configurar en qué rutas se ejecuta este middleware
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/cliente/:path*',
    '/consultor/:path*',
  ],
};