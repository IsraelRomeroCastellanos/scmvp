'use client';

import { useState, useEffect, useCallback } from 'react'; // Importar useCallback
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-toastify';
import Navbar from '@/components/Navbar';
import { FiArrowLeft } from 'react-icons/fi';

export default function DetalleUsuario() {
  const [usuario, setUsuario] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const router = useRouter();
  const { id } = useParams();
  const [token, setToken] = useState<string>('');

  // Memorizar la función fetchUsuario
  const fetchUsuario = useCallback(async (authToken: string, userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/usuarios/${userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar usuario');
      }
      
      const data = await response.json();
      
      if (data.usuario) {
        setUsuario(data.usuario);
      } else {
        setError('Usuario no encontrado');
      }
    } catch (err: any) {
      console.error('Error al cargar usuario:', err);
      setError(err.message || 'Error al cargar usuario');
      if (err.message?.includes('401') || err.message?.includes('403')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [router]); // Incluir router como dependencia

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      const user = JSON.parse(storedUser);
      if (user.rol === 'admin') {
        setToken(storedToken);
        if (id) {
          fetchUsuario(storedToken, id.toString()); // Ahora fetchUsuario está memorizada
        }
      } else {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [id, router, fetchUsuario]); // Incluir fetchUsuario como dependencia

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-600">Cargando usuario...</div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              <p className="font-medium">{error}</p>
            </div>
            <button
              onClick={() => router.push('/admin/usuarios')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Volver a la lista de usuarios
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Detalle del Usuario</h1>
            <button
              onClick={() => router.push('/admin/usuarios')}
              className="flex items-center space-x-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FiArrowLeft size={16} />
              <span>Volver</span>
            </button>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  ID de Usuario
                </label>
                <p className="text-lg font-semibold text-gray-900">{usuario.id}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Estado
                </label>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  usuario.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {usuario.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Nombre Completo
                </label>
                <p className="text-lg font-semibold text-gray-900">{usuario.nombre_completo}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Email
                </label>
                <p className="text-lg font-semibold text-gray-900">{usuario.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Rol
                </label>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  usuario.rol === 'admin' ? 'bg-green-100 text-green-800' :
                  usuario.rol === 'consultor' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {usuario.rol.charAt(0).toUpperCase() + usuario.rol.slice(1)}
                </span>
              </div>

              {usuario.empresa_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    ID de Empresa
                  </label>
                  <p className="text-lg font-semibold text-gray-900">{usuario.empresa_id}</p>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Fecha de Creación
                </label>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(usuario.creado_en).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => router.push(`/admin/editar-usuario/${usuario.id}`)}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Editar Usuario
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}