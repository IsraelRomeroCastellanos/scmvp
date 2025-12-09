// frontend/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes: { [key: string]: string | null } = {
  '/dashboard': null,
  '/admin/usuarios': 'administrador',
  '/admin/empresas': 'administrador',
  '/cliente/clientes': 'cliente',
  '/cliente/carga-masiva': 'cliente',
  '/cliente/registrar-cliente': 'cliente',
  '/consultor': 'consultor',
};

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const userCookie = request.cookies.get('user')?.value;
  const { pathname } = request.nextUrl;

  let requiredRole: string | null = null;
  
  for (const route in protectedRoutes) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      requiredRole = protectedRoutes[route];
      break;
    }
  }

  if (requiredRole === undefined) {
    return NextResponse.next();
  }

  if (!token || !userCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const userData = JSON.parse(userCookie);

    if (requiredRole && userData.rol !== requiredRole) {
      let defaultRoute = '/dashboard';
      if (userData.rol === 'administrador') defaultRoute = '/admin/usuarios';
      if (userData.rol === 'cliente') defaultRoute = '/cliente/clientes';
      if (userData.rol === 'consultor') defaultRoute = '/dashboard';

      return NextResponse.redirect(new URL(defaultRoute, request.url));
    }

    return NextResponse.next();

  } catch (error) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    response.cookies.delete('user');
    return response;
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/cliente/:path*',
    '/consultor/:path*',
  ],
};