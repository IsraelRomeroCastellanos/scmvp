// src/components/Navbar.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiLogOut } from 'react-icons/fi';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', role: 'all' },
    { href: '/admin/usuarios', label: 'Gestión de Usuarios', role: 'admin' },
    { href: '/admin/empresas', label: 'Gestión de Empresas', role: 'admin' },
    { href: '/cliente/clientes', label: 'Mis Clientes', role: 'cliente' },
    { href: '/cliente/clientes', label: 'Gestión de Clientes', role: 'consultor' },
    { href: '/cliente/carga-masiva', label: 'Carga Masiva', role: 'all' },
    { href: '/cliente/registrar-cliente', label: 'Registrar Cliente', role: 'all' },
  ];

  const shouldShowItem = (item: any) => {
    if (!user) return false;
    if (item.role === 'all') return true;
    if (item.role === 'cliente' && user.rol === 'cliente') return true;
    if (item.role === 'consultor' && (user.rol === 'consultor' || user.rol === 'admin')) return true;
    return user.rol === item.role;
  };

  return (
    <nav className="bg-white shadow-sm">
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
                return (
                  <Link 
                    key={item.href} 
                    href={item.href} 
                    className="text-gray-700 hover:text-blue-600 font-medium"
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
                  className="flex items-center text-gray-700 hover:text-red-600"
                >
                  <FiLogOut className="mr-1" /> Cerrar sesión
                </button>
              </div>
            )}
            
            {!user && (
              <Link 
                href="/login" 
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Iniciar Sesión
              </Link>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 focus:outline-none"
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
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {menuItems.map((item) => {
              if (shouldShowItem(item)) {
                return (
                  <Link 
                    key={item.href} 
                    href={item.href} 
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
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
                <div className="block px-3 py-2 text-base font-medium text-gray-700">
                  Bienvenido, {user.nombre_completo}
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <FiLogOut className="mr-2" /> Cerrar sesión
                  </div>
                </button>
              </>
            )}
            
            {!user && (
              <Link 
                href="/login" 
                className="block px-3 py-2 rounded-md text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
                onClick={() => setIsOpen(false)}
              >
                Iniciar Sesión
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}