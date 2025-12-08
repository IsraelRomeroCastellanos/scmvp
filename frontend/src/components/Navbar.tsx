// frontend/src/components/Navbar.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { FiLogOut } from 'react-icons/fi';
import Cookies from 'js-cookie';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Leer de cookies PRIMERO (para consistencia con middleware)
    const userCookie = Cookies.get('user');
    const tokenCookie = Cookies.get('token');
    
    if (userCookie && tokenCookie) {
      setUser(JSON.parse(userCookie));
      // Sincronizar con localStorage por si acaso
      localStorage.setItem('user', userCookie);
      localStorage.setItem('token', tokenCookie);
    } else {
      // Fallback a localStorage (para compatibilidad)
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        // Sincronizar a cookies
        Cookies.set('user', storedUser, { path: '/', expires: 7 });
        Cookies.set('token', storedToken, { path: '/', expires: 7 });
      }
    }
  }, [pathname]); // Re-evaluar cuando cambie la ruta

  const handleLogout = () => {
    // Limpiar TODO
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    Cookies.remove('token', { path: '/' });
    Cookies.remove('user', { path: '/' });
    
    // Redirigir y refrescar
    router.push('/login');
    router.refresh(); // Importante para que el middleware detecte el cambio
  };

  // CORREGIDO: Usar 'administrador' en lugar de 'admin'
  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', role: 'all' },
    { href: '/admin/usuarios', label: 'Gestión de Usuarios', role: 'administrador' },
    { href: '/admin/empresas', label: 'Gestión de Empresas', role: 'administrador' },
    { href: '/cliente/clientes', label: 'Mis Clientes', role: 'cliente' },
    { href: '/consultor/clientes', label: 'Gestión de Clientes', role: 'consultor' },
    { href: '/cliente/carga-masiva', label: 'Carga Masiva', role: 'cliente' },
    { href: '/cliente/registrar-cliente', label: 'Registrar Cliente', role: 'cliente' },
  ];

  const shouldShowItem = (item: any) => {
    if (!user) return false;
    if (item.role === 'all') return true;
    
    // Lógica jerárquica de roles
    if (user.rol === 'administrador') return true; // Admin ve todo
    
    if (item.role === 'consultor' && user.rol === 'consultor') return true;
    if (item.role === 'cliente' && user.rol === 'cliente') return true;
    
    return user.rol === item.role;
  };

  // No mostrar navbar en la página de login
  if (pathname === '/login') return null;

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-blue-600">
              Sistema de Cumplimiento
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => {
              if (shouldShowItem(item)) {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
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
                    {item.label}
                  </Link>
                );
              }
              return null;
            })}
            
            {user && (
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">
                  Bienvenido, {user.nombre_completo}
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
                    {item.label}
                  </Link>
                );
              }
              return null;
            })}
            
            {user && (
              <>
                <div className="block px-3 py-2 text-base font-medium text-gray-700 border-t">
                  Bienvenido, {user.nombre_completo}
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