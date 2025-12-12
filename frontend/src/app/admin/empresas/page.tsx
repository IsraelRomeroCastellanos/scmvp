'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isAdmin } from '@/lib/auth';

interface Empresa {
  id: number;
  nombre_legal: string;
  rfc: string;
  direccion?: string;
  estado: string;
}

export default function GestionEmpresas() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userStr);
    if (!isAdmin(user.rol || user.role)) {
      router.push('/dashboard');
      return;
    }

    const fetchEmpresas = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await api.get('/api/admin/empresas');
        const data = response.data;

        let lista: Empresa[] = [];

        if (Array.isArray(data)) {
          lista = data;
        } else if (Array.isArray(data.empresas)) {
          lista = data.empresas;
        } else if (Array.isArray(data.data)) {
          lista = data.data;
        } else {
          throw new Error('Formato inesperado de respuesta');
        }

        setEmpresas(lista);
      } catch (err: any) {
        console.error('Error al cargar empresas:', err);
        setError('Error al cargar empresas.');
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresas();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600 text-lg">Cargando empresas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Gestión de Empresas
          </h1>

          <button
            onClick={() => router.push('/admin/crear-empresa')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Crear Empresa
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {!error && empresas.length === 0 && (
            <p className="text-gray-600">
              No se encontraron empresas registradas.
            </p>
          )}

          {!error && empresas.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Nombre Legal
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      RFC
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Dirección
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-right"></th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {empresas.map((empresa) => (
                    <tr key={empresa.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{empresa.id}</td>
                      <td className="px-4 py-3 text-sm">
                        {empresa.nombre_legal}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {empresa.rfc}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {empresa.direccion || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 inline-flex text-xs font-semibold rounded-full ${
                            empresa.estado === 'activo'
                              ? 'bg-green-100 text-green-800'
                              : empresa.estado === 'suspendido'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {empresa.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right space-x-3">
                        <button
                          onClick={() =>
                            router.push(`/admin/editar-empresa/${empresa.id}`)
                          }
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
