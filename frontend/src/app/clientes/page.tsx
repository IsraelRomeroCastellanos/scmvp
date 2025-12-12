// frontend/src/app/clientes/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

// =======================
// Types
// =======================

type Rol = 'administrador' | 'consultor' | 'cliente' | '';

const normalizeRole = (raw: any): Rol => {
  if (!raw) return '';
  const r = String(raw).toLowerCase().trim();
  if (r === 'admin' || r === 'administrator') return 'administrador';
  if (r === 'consultor' || r === 'consultant') return 'consultor';
  if (r === 'cliente' || r === 'client') return 'cliente';
  return r as Rol;
};

interface Cliente {
  id?: string | number;
  nombre_entidad?: string;
  tipo_cliente?: string;
  actividad_economica?: string;
  estado?: string;
  empresa?: string; // viene en el JOIN para admin/consultor
  alias?: string;
  fecha_nacimiento?: string;
  nacionalidad?: string;
  estado_bien?: string;
  ocupacion?: string;
}

// =======================
// Component
// =======================

export default function ClientesPage() {
  const router = useRouter();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rol, setRol] = useState<Rol>('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      const role = normalizeRole(user.rol ?? user.role);
      setRol(role);

      // Todos los roles válidos pueden entrar
      if (!['administrador', 'consultor', 'cliente'].includes(role)) {
        router.push('/login');
        return;
      }

      const fetchClientes = async () => {
        try {
          setLoading(true);
          setError('');

          // ⚠ RUTA REAL DEL BACKEND
          const response = await api.get('/api/cliente/mis-clientes');
          const data = response.data;

          if (!data || !Array.isArray(data.clientes)) {
            throw new Error('Formato inesperado al cargar clientes');
          }

          setClientes(data.clientes);
        } catch (err: any) {
          console.error('Error clientes:', err);
          setError(
            err?.response?.data?.error ||
            err?.message ||
            'Error al cargar clientes'
          );
        } finally {
          setLoading(false);
        }
      };

      fetchClientes();
    } catch (err) {
      console.error(err);
      router.push('/login');
    }
  }, [router]);

  const titulo =
    rol === 'cliente' ? 'Mis Clientes' : 'Gestión de Clientes';

  const subtitulo =
    rol === 'cliente'
      ? 'Listado de clientes asociados a tu empresa'
      : 'Listado general de clientes del sistema';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* TITULO */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{titulo}</h1>
          <p className="mt-1 text-sm text-gray-600">{subtitulo}</p>
        </div>

        {/* CARD */}
        <div className="bg-white shadow rounded-lg p-6">
          {loading && (
            <p className="text-sm text-gray-500">Cargando clientes...</p>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {!loading && !error && clientes.length === 0 && (
            <p className="text-sm text-gray-500">No se encontraron clientes.</p>
          )}

          {!loading && !error && clientes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Empresa</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Actividad</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Estado</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {clientes.map((c, idx) => (
                    <tr key={c.id ?? idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {c.nombre_entidad ?? 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {c.empresa ?? 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {c.tipo_cliente ?? 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {c.actividad_economica ?? 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {c.estado ?? 'N/A'}
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
