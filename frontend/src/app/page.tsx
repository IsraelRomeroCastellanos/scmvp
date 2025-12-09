// frontend/src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { checkAuth } from '@/lib/auth';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const auth = checkAuth();
    
    if (auth.authenticated && auth.user) {
      setUser(auth.user);
      
      // Redirigir automáticamente según rol
      if (auth.user.rol === 'administrador') {
        router.push('/admin/usuarios');
      } else if (auth.user.rol === 'cliente') {
        router.push('/cliente/clientes');
      } else if (auth.user.rol === 'consultor') {
        router.push('/dashboard');
      }
    }
    
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 flex-grow">
      <div className="text-center p-8 max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Sistema de Cumplimiento - MVP
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Plataforma para automatización de procesos de cumplimiento normativo
        </p>
        
        {!user ? (
          <>
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-6">
              <p className="font-medium">Por favor, inicia sesión para acceder al sistema</p>
            </div>
            <div className="space-x-4">
              <Link 
                href="/login" 
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors inline-block"
              >
                Iniciar Sesión
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
              <p className="font-medium">
                Bienvenido, {user.nombre_completo} ({user.rol})
              </p>
            </div>
            <div className="space-x-4">
              {user.rol === 'administrador' && (
                <Link 
                  href="/admin/usuarios" 
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors inline-block"
                >
                  Administrar Usuarios
                </Link>
              )}
              <Link 
                href="/dashboard" 
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors inline-block"
              >
                Ir al Dashboard
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}