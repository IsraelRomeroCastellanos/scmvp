'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function MisClientes() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const router = useRouter();
  const [token, setToken] = useState<string>('');

  const fetchClientes = useCallback(async (authToken: string) => {
    try {
      setLoading(true);

      const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL!;
      
      const response = await axios.get(`${backendUrl}/api/cliente/mis-clientes`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      
      const data = response.data;

const clientesNormalizados = Array.isArray(data)
  ? data
  : Array.isArray(data?.clientes)
  ? data.clientes
  : Array.isArray(data?.data?.clientes)
  ? data.data.clientes
  : [];

setClientes(clientesNormalizados);

    } catch (err: any) {
      console.error('Error al cargar clientes:', err);
      setError(err.response?.data?.error || 'Error al cargar clientes');
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
      if (user.rol === 'cliente' || user.rol === 'consultor' || user.rol === 'admin') {
        setToken(storedToken);
        fetchClientes(storedToken);
      } else {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router, fetchClientes]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Cargando clientes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Mis Clientes</h1>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/cliente/carga-masiva')}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                Carga Masiva
              </button>
              <button
                onClick={() => router.push('/registrar-cliente')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Registrar Cliente
              </button>
            </div>
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
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Nombre</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Tipo</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Actividad</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Estado</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {clientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-gray-50">
                    <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                      {cliente.id}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">{cliente.nombre_entidad}</td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${
                        cliente.tipo_cliente === 'persona_fisica' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {cliente.tipo_cliente === 'persona_fisica' ? 'Persona Física' : 'Persona Moral'}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">{cliente.actividad_economica}</td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${
                        cliente.estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {cliente.estado}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => router.push(`/cliente/clientes/${cliente.id}`)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Ver
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {clientes.length === 0 && !error && (
              <div className="text-center py-8 text-gray-500">
                No se encontraron clientes
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}