'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Navbar from '../../../components/Navbar';
import { toast } from 'react-toastify';

export default function GestionEmpresas() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const router = useRouter();
  const [token, setToken] = useState<string>('');

  const fetchEmpresas = useCallback(async (authToken: string) => {
    try {
      setLoading(true);
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://plataforma-cumplimiento-mvp.onrender.com';
      
      const response = await axios.get(`${backendUrl}/api/admin/empresas`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      
      if (response.data && Array.isArray(response.data.empresas)) {
        setEmpresas(response.data.empresas);
      } else {
        setError('Formato de respuesta inesperado');
      }
    } catch (err: any) {
      console.error('Error al cargar empresas:', err);
      setError(err.response?.data?.error || 'Error al cargar empresas');
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      const user = JSON.parse(storedUser);
      if (user.rol === 'admin') {
        setToken(storedToken);
        fetchEmpresas(storedToken);
      } else {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router, fetchEmpresas]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Cargando empresas...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Empresas</h1>
            <button
              onClick={() => router.push('/admin/crear-empresa')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Crear Empresa
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">ID</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Nombre Legal</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">RFC</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Dirección</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Estado</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {empresas.map((empresa) => (
                  <tr key={empresa.id} className="hover:bg-gray-50">
                    <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                      {empresa.id}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">{empresa.nombre_legal}</td>
                    <td className="px-3 py-4 text-sm text-gray-500">{empresa.rfc}</td>
                    <td className="px-3 py-4 text-sm text-gray-500">{empresa.direccion || 'N/A'}</td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${
                        empresa.estado === 'activo' ? 'bg-green-100 text-green-800' :
                        empresa.estado === 'suspendido' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {empresa.estado.charAt(0).toUpperCase() + empresa.estado.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => router.push(`/admin/empresas/${empresa.id}`)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Ver
                        </button>
                        <button
                          onClick={() => router.push(`/admin/editar-empresa/${empresa.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {empresas.length === 0 && !error && (
              <div className="text-center py-8 text-gray-500">
                No se encontraron empresas
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}