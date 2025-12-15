'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Empresa = {
  id: number;
  nombre_legal: string;
  rfc: string | null;
  tipo_entidad: string;
  estado: string;
  entidad: string | null;
  municipio: string | null;
  codigo_postal: string | null;
};

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://scmvp.onrender.com';

  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const token = getToken();

        if (!token) {
          throw new Error('Token no encontrado');
        }

        const res = await fetch(`${apiBase}/api/admin/empresas`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
          },
          cache: 'no-store'
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al cargar empresas');
      }

      setEmpresas(data.empresas || []);
    } catch (err) {
      console.error(err);
      setError('Error al cargar empresas');
    } finally {
      setLoading(false);
    }
  };


    fetchEmpresas();
  }, [apiBase]);

  if (loading) {
    return <div className="p-6">Cargando empresas...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-4 bg-gray-50 border border-gray-200 rounded p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Gestión de Empresas</h1>

          <Link
            href="/admin/crear-empresa"
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Crear empresa
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1">ID</th>
              <th className="border px-2 py-1">Nombre legal</th>
              <th className="border px-2 py-1">RFC</th>
              <th className="border px-2 py-1">Entidad</th>
              <th className="border px-2 py-1">Municipio</th>
              <th className="border px-2 py-1">CP</th>
              <th className="border px-2 py-1">Tipo</th>
              <th className="border px-2 py-1">Estado</th>
              <th className="border px-2 py-1">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {empresas.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="border px-2 py-1">{e.id}</td>
                <td className="border px-2 py-1">{e.nombre_legal}</td>
                <td className="border px-2 py-1">{e.rfc || '-'}</td>
                <td className="border px-2 py-1">{e.entidad || '-'}</td>
                <td className="border px-2 py-1">{e.municipio || '-'}</td>
                <td className="border px-2 py-1">{e.codigo_postal || '-'}</td>
                <td className="border px-2 py-1">{e.tipo_entidad}</td>
                <td className="border px-2 py-1">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      e.estado === 'activo'
                        ? 'bg-green-100 text-green-700'
                        : e.estado === 'inactivo'
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {e.estado}
                  </span>
                </td>
                <td className="border px-2 py-1">
                  <Link
                    href={`/admin/editar-empresa/${e.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
