// frontend/src/app/clientes/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type Rol = 'administrador' | 'consultor' | 'cliente' | '';

const normalizeRole = (raw: any): Rol => {
  if (!raw) return '';
  const r = String(raw).toLowerCase().trim();
  if (r === 'admin' || r === 'administrator') return 'administrador';
  if (r === 'cliente' || r === 'client') return 'cliente';
  if (r === 'consultor' || r === 'consultant') return 'consultor';
  return r as Rol;
};

interface Cliente {
  id?: number | string;
  nombre_cliente?: string;
  nombre_entidad?: string;   // según tu backend
  nombre_empresa?: string;   // por si viene así
  empresa?: string;          // otro alias posible
  tipo_cliente?: string;
  actividad_economica?: string;
  rfc?: string;
  alias?: string;
  estado_bien?: string;      // activo / inactivo
  riesgo?: string;
  riesgo_aml?: string;
  fecha_registro?: string;
  created_at?: string;
  num_operaciones?: number;
  operaciones_count?: number;
  [key: string]: any;        // por si hay más campos
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rol, setRol] = useState<Rol>('');
  const router = useRouter();

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

      // Todos los roles válidos pueden entrar a este módulo
      if (!['administrador', 'consultor', 'cliente'].includes(role)) {
        router.push('/login');
        return;
      }

      const fetchClientes = async () => {
        try {
          setLoading(true);
          setError('');

          // Ajusta la URL si tu backend usa otra ruta
          const response = await api.get('/api/clientes');
          const data = response.data as any;

          // Adaptamos según el shape de la respuesta
          const lista: Cliente[] =
            data?.clientes || data?.results || data?.data || data || [];

          if (!Array.isArray(lista)) {
            throw new Error('Formato inesperado de respuesta al cargar clientes');
          }

          setClientes(lista);
        } catch (err: any) {
          console.error('Error al cargar clientes:', err);
          setError(
            err?.response?.data?.message ||
              err.message ||
              'Error al cargar clientes'
          );
        } finally {
          setLoading(false);
        }
      };

      fetchClientes();
    } catch (err) {
      console.error('Error al leer usuario en clientes:', err);
      router.push('/login');
    }
  }, [router]);

  const titulo =
    rol === 'cliente'
      ? 'Mis Clientes'
      : 'Gestión de Clientes';

  const subtitulo =
    rol === 'cliente'
      ? 'Listado de clientes asociados a tu empresa'
      : 'Listado de clientes del sistema';

  const getEmpresaNombre = (c: Cliente) =>
    c.nombre_empresa || c.empresa || c.nombre_entidad || 'N/A';

  const getRiesgo = (c: Cliente) =>
    c.riesgo_aml || c.riesgo || 'N/A';

  const getFecha = (c: Cliente) =>
    c.fecha_registro || c.created_at || '';

  const getNumOperaciones = (c: Cliente) =>
    c.num_operaciones ?? c.operaciones_count ?? null;

  const handleVerDetalle = (cliente: Cliente) => {
    if (!cliente.id) return;
    // Más adelante podrás crear /clientes/[id] con detalle
    // De momento podrías redirigir a una ruta existente o dejarlo pendiente
    // router.push(`/clientes/${cliente.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{titulo}</h1>
          <p className="mt-1 text-sm text-gray-500">{subtitulo}</p>
        </div>

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
            <p className="text-sm text-gray-500">
              No se encontraron clientes para los filtros actuales.
            </p>
          )}

          {!loading && !error && clientes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actividad Económica
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RFC
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Alias
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Riesgo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Registro
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      No. Operaciones
                    </th>
                    {/* Aquí podrías agregar columna Acciones más adelante */}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clientes.map((c, idx) => (
                    <tr key={c.id ?? idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {c.nombre_cliente || c.nombre_entidad || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {getEmpresaNombre(c)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {c.tipo_cliente || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {c.actividad_economica || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {c.rfc || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {c.alias || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {c.estado_bien || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {getRiesgo(c)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {getFecha(c) || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {getNumOperaciones(c) ?? 'N/A'}
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
