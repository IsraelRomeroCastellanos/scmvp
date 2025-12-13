'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isAdmin } from '@/lib/auth';

interface Empresa {
  id: number;
  nombre_legal: string;
  rfc: string;
  actividad: string;
  entidad: string;
  municipio: string;
  estado: string;
  creado_en: string;
}

export default function EmpresasPage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargarEmpresas = async () => {
    try {
      const res = await api.get('/api/admin/empresas');
      setEmpresas(res.data.empresas || []);
    } catch (e: any) {
      setError('Error al cargar empresas');
    } finally {
      setLoading(false);
    }
  };

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

    cargarEmpresas();
  }, [router]);

  const toggleEstado = async (empresa: Empresa) => {
    const nuevoEstado = empresa.estado === 'activo' ? 'inactivo' : 'activo';

    const confirmar = confirm(
      `¿Deseas ${nuevoEstado === 'activo' ? 'activar' : 'inactivar'} la empresa "${empresa.nombre_legal}"?`
    );

    if (!confirmar) return;

    try {
      await api.put(`/api/admin/empresas/${empresa.id}`, {
        ...empresa,
        estado: nuevoEstado
      });
      cargarEmpresas();
    } catch {
      alert('Error al cambiar el estado de la empresa');
    }
  };

  if (loading) return <p className="p-4">Cargando empresas…</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Empresas</h1>
        <button
          onClick={() => router.push('/admin/crear-empresa')}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Crear Empresa
        </button>
      </div>

      <div className="overflow-x-auto bg-white shadow rounded">
        <table className="min-w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Nombre legal</th>
              <th className="p-2 border">RFC</th>
              <th className="p-2 border">Actividad</th>
              <th className="p-2 border">Entidad</th>
              <th className="p-2 border">Municipio</th>
              <th className="p-2 border">Estado</th>
              <th className="p-2 border">Fecha alta</th>
              <th className="p-2 border">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="p-2 border">{e.nombre_legal}</td>
                <td className="p-2 border">{e.rfc}</td>
                <td className="p-2 border">{e.actividad}</td>
                <td className="p-2 border">{e.entidad}</td>
                <td className="p-2 border">{e.municipio}</td>
                <td className="p-2 border font-semibold">
                  {e.estado}
                </td>
                <td className="p-2 border">
                  {new Date(e.creado_en).toLocaleDateString()}
                </td>
                <td className="p-2 border space-x-2">
                  <button
                    onClick={() => router.push(`/admin/editar-empresa/${e.id}`)}
                    className="text-blue-600 hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => toggleEstado(e)}
                    className="text-red-600 hover:underline"
                  >
                    {e.estado === 'activo' ? 'Inactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
            {empresas.length === 0 && (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-500">
                  No hay empresas registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
