// frontend/src/components/Navbar.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { FiLogOut } from 'react-icons/fi';

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
      cookie += `; path=/`;
    }
    if (options.sameSite) {
      cookie += `; sameSite=${options.sameSite}`;
    }
    if (options.secure) {
      cookie += `; secure`;
    }
    document.cookie = cookie;
  },
  
  remove: (name: string, options: { path?: string } = {}) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${options.path || '/'};`;
  }
};

// Normaliza el rol para tolerar variaciones de texto y mayúsculas
const normalizeRole = (raw: any): string => {
  if (!raw) return '';
  const r = String(raw).toLowerCase().trim();

  if (r === 'admin' || r === 'administrator') return 'administrador';
  if (r === 'cliente' || r === 'client') return 'cliente';
  if (r === 'consultor' || r === 'consultant') return 'consultor';

  return r;
};

export default function Navbar() {
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

  const handleLogout = () => {
    localStorage.removeItem('token');
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
    roles: string[]; // roles que pueden ver este item
  }[] = [
    {
      href: '/dashboard',
      baseLabel: 'Dashboard',
      roles: ['administrador', 'consultor', 'cliente'],
    },
    {
      href: '/admin/usuarios',
      baseLabel: 'Gestión de Usuarios',
      roles: ['administrador'],
    },
    {
      href: '/admin/empresas',
      baseLabel: 'Gestión de Empresas',
      roles: ['administrador'],
    },
    {
      // Módulo unificado de clientes
      href: '/clientes',
      baseLabel: 'Gestión de Clientes',
      roles: ['administrador', 'consultor', 'cliente'],
    },
    {
      href: '/cliente/carga-masiva',
      baseLabel: 'Carga Masiva',
      roles: ['administrador', 'cliente'],
    },
    {
      href: '/registrar-cliente',
      baseLabel: 'Registrar Cliente',
      roles: ['administrador', 'cliente'],
    },
  ];

  const shouldShowItem = (item: (typeof menuItems)[number]) => {
    if (!user) return false;
    if (!role) return false;
    return item.roles.includes(role);
  };

  // No mostrar navbar en la página de login
  if (pathname === '/login') return null;

  const homeHref = user ? '/dashboard' : '/login';

  const getItemLabel = (item: (typeof menuItems)[number]) => {
    if (item.href === '/clientes' && role === 'cliente') {
      return 'Mis Clientes';
    }
    return item.baseLabel;
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href={homeHref} className="text-xl font-bold text-blue-600">
              Sistema de Cumplimiento
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => {
              if (shouldShowItem(item)) {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + '/');
                return (
                  <Link 
                    key={item.href} 
                    href={item.href} 
                    className={`font-medium transition-colors ${ 
                      isActive 
                        ? 'text-blue-600 border-b-2 border-blue-600' 
                        : 'text-gray-700 hover:text-blue-600'
                    }`}
                  >
                    {getItemLabel(item)}
                  </Link>
                );
              }
              return null;
            })}
            
            {user && (
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">
                  Bienvenido, {user.nombre_completo ?? user.nombre ?? user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center text-gray-700 hover:text-red-600 transition-colors"
                >
                  <FiLogOut className="mr-1" /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 focus:outline-none"
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {menuItems.map((item) => {
              if (shouldShowItem(item)) {
                return (
                  <Link 
                    key={item.href} 
                    href={item.href} 
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {getItemLabel(item)}
                  </Link>
                );
              }
              return null;
            })}
            
            {user && (
              <>
                <div className="block px-3 py-2 text-base font-medium text-gray-700 border-t">
                  Bienvenido, {user.nombre_completo ?? user.nombre ?? user.email}
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <FiLogOut className="mr-2" /> Cerrar sesión
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
