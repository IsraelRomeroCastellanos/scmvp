'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  useEffect(() => {
    console.log('✅ Frontend funcionando correctamente en producción');
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 flex-grow">
      <div className="text-center p-8 max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          ✅ Sistema de Cumplimiento - MVP
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Sistema desplegado correctamente en producción. Todos los componentes están funcionando.
        </p>
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          <p className="font-medium">Status: Sistema operativo y listo para producción</p>
        </div>
        <div className="space-x-4">
          <Link 
            href="/admin/usuarios" 
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors inline-block"
          >
            Admin Usuarios
          </Link>
          <Link 
            href="/cliente/carga-masiva" 
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors inline-block"
          >
            Carga Masiva
          </Link>
        </div>
      </div>
    </div>
  );
}