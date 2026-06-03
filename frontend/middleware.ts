// frontend/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type AppRole = 'admin' | 'consultor' | 'cliente';

const protectedRoutes: { path: string; roles: AppRole[] | null }[] = [
  { path: '/dashboard', roles: null },
  { path: '/admin/usuarios', roles: ['admin'] },
  { path: '/admin/empresas', roles: ['admin'] },
  { path: '/cliente/clientes', roles: ['admin', 'consultor', 'cliente'] },
  { path: '/cliente/carga-masiva', roles: ['admin', 'cliente'] },
  { path: '/cliente/registrar-cliente', roles: ['admin', 'cliente'] },
  { path: '/consultor', roles: ['consultor'] },
];

const normalizeRole = (raw: unknown): AppRole | null => {
  if (!raw) return null;
  const r = String(raw).toLowerCase().trim();

  if (
    r === 'admin' ||
    r === 'administrator' ||
    r === 'administrador' ||
    r === 'administrador del sistema'
  ) {
    return 'admin';
  }

  if (r === 'consultor' || r === 'consultant') return 'consultor';
  if (r === 'cliente' || r === 'client') return 'cliente';

  return null;
};

const defaultRouteForRole = (role: AppRole | null): string => {
  if (role === 'admin') return '/admin/usuarios';
  if (role === 'consultor') return '/cliente/clientes';
  if (role === 'cliente') return '/cliente/clientes';
  return '/dashboard';
};

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const userCookie = request.cookies.get('user')?.value;
  const { pathname } = request.nextUrl;

  const route = protectedRoutes.find(
    (item) => pathname === item.path || pathname.startsWith(item.path + '/'),
  );

  if (!route) {
    return NextResponse.next();
  }

  if (!token || !userCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const userData = JSON.parse(userCookie);
    const role = normalizeRole(userData?.rol ?? userData?.role);

    if (!role) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('token');
      response.cookies.delete('user');
      return response;
    }

    if (route.roles && !route.roles.includes(role)) {
      return NextResponse.redirect(new URL(defaultRouteForRole(role), request.url));
    }

    return NextResponse.next();
  } catch (_error) {
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
