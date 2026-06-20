// frontend/src/components/Navbar.tsx
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  FiBriefcase,
  FiHome,
  FiLogOut,
  FiMenu,
  FiUploadCloud,
  FiUserPlus,
  FiUsers,
  FiX,
} from 'react-icons/fi';

// Funciones nativas para manejar cookies
const cookieManager = {
  get: (name: string): string | undefined => {
    if (typeof document === 'undefined') return undefined;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : undefined;
  },

  set: (
    name: string,
    value: string,
    options: { expires?: number; path?: string; sameSite?: string; secure?: boolean } = {}
  ) => {
    let cookie = `${name}=${encodeURIComponent(value)}`;
    if (options.expires) {
      const date = new Date();
      date.setDate(date.getDate() + options.expires);
      cookie += `; expires=${date.toUTCString()}`;
    }
    if (options.path) {
      cookie += `; path=${options.path}`;
    } else {
      cookie += '; path=/';
    }
    if (options.sameSite) {
      cookie += `; sameSite=${options.sameSite}`;
    }
    if (options.secure) {
      cookie += '; secure';
    }
    document.cookie = cookie;
  },

  remove: (name: string, options: { path?: string } = {}) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${options.path || '/'};`;
  },
};

// Normaliza el rol para tolerar variaciones de texto y mayúsculas.
// El contrato frontend/base es el mismo que backend: admin | consultor | cliente.
const normalizeRole = (raw: any): string => {
  if (!raw) return '';
  const r = String(raw).toLowerCase().trim();

  if (
    r === 'admin' ||
    r === 'administrator' ||
    r === 'administrador' ||
    r === 'administrador del sistema'
  ) {
    return 'admin';
  }

  if (r === 'cliente' || r === 'client') return 'cliente';
  if (r === 'consultor' || r === 'consultant') return 'consultor';

  return '';
};

const roleLabel = (role: string) => {
  if (role === 'admin') return 'Administrador';
  if (role === 'consultor') return 'Consultor';
  if (role === 'cliente') return 'Cliente';
  return 'Usuario';
};

const pageTitles: Array<{ prefix: string; title: string }> = [
  { prefix: '/admin/usuarios', title: 'Gestión de Usuarios' },
  { prefix: '/admin/empresas', title: 'Gestión de Empresas' },
  { prefix: '/cliente/carga-masiva', title: 'Carga Masiva' },
  { prefix: '/cliente/registrar-cliente', title: 'Registrar Cliente' },
  { prefix: '/cliente/editar-cliente', title: 'Editar Cliente' },
  { prefix: '/cliente/clientes', title: 'Gestión de Clientes' },
  { prefix: '/dashboard', title: 'Dashboard' },
];

export default function Navbar({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const userCookie = cookieManager.get('user');
    const tokenCookie = cookieManager.get('token');

    if (userCookie && tokenCookie) {
      try {
        setUser(JSON.parse(userCookie));
      } catch {
        setUser(null);
      }
      localStorage.setItem('user', userCookie);
      localStorage.setItem('token', tokenCookie);
    } else {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');
      if (storedUser && storedToken) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          setUser(null);
        }
        cookieManager.set('user', storedUser, { expires: 7, path: '/' });
        cookieManager.set('token', storedToken, { expires: 7, path: '/' });
      }
    }
  }, [pathname]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    cookieManager.remove('token', { path: '/' });
    cookieManager.remove('user', { path: '/' });

    router.push('/login');
    router.refresh();
  };

  const role = normalizeRole(user?.rol ?? user?.role);

  const menuItems: {
    href: string;
    baseLabel: string;
    roles: string[];
    icon: typeof FiHome;
  }[] = [
    {
      href: '/dashboard',
      baseLabel: 'Dashboard',
      roles: ['admin', 'consultor', 'cliente'],
      icon: FiHome,
    },
    {
      href: '/admin/usuarios',
      baseLabel: 'Gestión de Usuarios',
      roles: ['admin'],
      icon: FiUsers,
    },
    {
      href: '/admin/empresas',
      baseLabel: 'Gestión de Empresas',
      roles: ['admin', 'consultor'],
      icon: FiBriefcase,
    },
    {
      href: '/cliente/clientes',
      baseLabel: 'Gestión de Clientes',
      roles: ['admin', 'consultor', 'cliente'],
      icon: FiUsers,
    },
    {
      href: '/cliente/carga-masiva',
      baseLabel: 'Carga Masiva',
      roles: ['admin', 'cliente'],
      icon: FiUploadCloud,
    },
    {
      href: '/cliente/registrar-cliente',
      baseLabel: 'Registrar Cliente',
      roles: ['admin', 'cliente'],
      icon: FiUserPlus,
    },
  ];

  const shouldShowItem = (item: (typeof menuItems)[number]) => {
    if (!user) return false;
    if (!role) return false;
    return item.roles.includes(role);
  };

  if (pathname === '/login') {
    return <main className="min-h-screen">{children}</main>;
  }

  const homeHref = user ? '/dashboard' : '/login';

  const getItemLabel = (item: (typeof menuItems)[number]) => {
    if (item.href === '/cliente/clientes' && role === 'cliente') {
      return 'Mis Clientes';
    }
    return item.baseLabel;
  };

  const currentPageTitle =
    pageTitles.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`))
      ?.title || 'Shield by Vission';

  const userName = user?.nombre_completo ?? user?.nombre ?? user?.email ?? 'Usuario';

  const navigation = (
    <>
      <div className="flex min-h-32 items-center border-b border-border-dark px-5 py-4">
        <Link
          href={homeHref}
          className="flex min-h-11 w-full items-center justify-center rounded-control focus-visible:ring-2 focus-visible:ring-brand-silver"
          aria-label="Ir al inicio de Shield by Vission"
        >
          <Image
            src="/brand/shield-by-vission-lockup.png"
            alt="Logotipo oficial Shield by Vission"
            width={575}
            height={408}
            className="h-auto w-full max-w-[11.5rem] object-contain"
            priority
          />
          <span className="sr-only">Shield by Vission</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-text-dark-muted">
          Navegación
        </div>
        <div className="space-y-1">
          {menuItems.map((item) => {
            if (!shouldShowItem(item)) return null;

            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`group flex min-h-11 items-center gap-3 rounded-control border-l-4 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand-silver ${
                  isActive
                    ? 'border-brand-silver bg-brand-silver text-brand-black'
                    : 'border-transparent text-text-dark-muted hover:bg-white/10 hover:text-text-dark'
                }`}
              >
                <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
                <span>{getItemLabel(item)}</span>
                {isActive ? <span className="sr-only">(sección actual)</span> : null}
              </Link>
            );
          })}
        </div>
      </div>

    </>
  );

  return (
    <div className="min-h-screen bg-app">
      <a href="#main-content" className="sbv-skip-link">
        Saltar al contenido principal
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-brand-black lg:flex">
        {navigation}
      </aside>

      {isOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú principal">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-black/65"
            onClick={() => setIsOpen(false)}
          />
          <aside id="mobile-navigation" className="relative flex h-full w-[min(20rem,88vw)] flex-col bg-brand-black shadow-float">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar menú"
              className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-control text-text-dark-muted hover:bg-white/10 hover:text-text-dark focus-visible:ring-2 focus-visible:ring-brand-silver"
            >
              <FiX className="h-6 w-6" aria-hidden="true" />
            </button>
            {navigation}
          </aside>
        </div>
      ) : null}

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 border-b border-border-dark bg-brand-elevated px-4 text-text-dark shadow-sm sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              aria-label="Abrir menú"
              aria-controls="mobile-navigation"
              aria-expanded={isOpen}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-text-dark-muted hover:bg-white/10 hover:text-text-dark focus-visible:ring-2 focus-visible:ring-brand-silver lg:hidden"
            >
              <FiMenu className="h-6 w-6" aria-hidden="true" />
            </button>

            <Link
              href={homeHref}
              aria-label="Ir al inicio de Shield by Vission"
              className="flex h-11 w-[3.9rem] shrink-0 items-center justify-center overflow-hidden rounded-control bg-brand-black px-1 focus-visible:ring-2 focus-visible:ring-brand-silver lg:hidden"
            >
              <Image
                src="/brand/shield-by-vission-lockup.png"
                alt="Logotipo oficial Shield by Vission"
                width={575}
                height={408}
                className="h-auto w-full object-contain"
              />
              <span className="sr-only">Shield by Vission</span>
            </Link>

            <div className="min-w-0">
              <div className="truncate text-sm font-semibold sm:text-base">{currentPageTitle}</div>
              <div className="truncate text-xs text-text-dark-muted">Shield by Vission</div>
            </div>
          </div>

          {user ? (
            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden min-w-0 text-right sm:block">
                <div className="max-w-56 truncate text-sm font-medium text-text-dark">{userName}</div>
                <div className="text-xs text-text-dark-muted">{roleLabel(role)}</div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex min-h-11 items-center gap-2 rounded-control border border-border-dark px-3 text-sm font-semibold text-text-dark-muted transition-colors hover:border-brand-silver hover:text-text-dark focus-visible:ring-2 focus-visible:ring-brand-silver"
                aria-label="Cerrar sesión"
              >
                <FiLogOut className="h-5 w-5" aria-hidden="true" />
                <span className="hidden md:inline">Cerrar sesión</span>
              </button>
            </div>
          ) : null}
        </header>

        <main id="main-content" className="sbv-page min-w-0">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
