'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Empresa {
  id: number;
  nombre_legal: string;
  rfc: string | null;
  tipo_entidad: 'persona_fisica' | 'persona_moral';
  estado: 'activo' | 'inactivo' | 'suspendido';
}

export default function EmpresasPage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/empresas`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!res.ok) {
          throw new Error('Error al cargar empresas');
        }

        const data = await res.json();

        // El backend devuelve: { empresas: [...] }
        setEmpresas(data.empresas || []);
      } catch (err: any) {
        console.error(err);
        setError('Error al cargar empresas');
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresas();
  }, []);

  if (loading) {
    return <p className="p-6">Cargando empresas...</p>;
  }

  if (error) {
    return <p className="p-6 text-red-600">{error}</p>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Gestión de Empresas</h1>
        <button
          onClick={() => router.push('/admin/crear-empresa')}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Crear empresa
        </button>
      </div>

      {empresas.length === 0 ? (
        <p>No hay empresas registradas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border">Nombre legal</th>
                <th className="px-4 py-2 border">RFC</th>
                <th className="px-4 py-2 border">Tipo de entidad</th>
                <th className="px-4 py-2 border">Estado</th>
                <th className="px-4 py-2 border">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((empresa) => (
                <tr key={empresa.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border">
                    {empresa.nombre_legal}
                  </td>
                  <td className="px-4 py-2 border">
                    {empresa.rfc || '—'}
                  </td>
                  <td className="px-4 py-2 border capitalize">
                    {empresa.tipo_entidad.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-2 border capitalize">
                    {empresa.estado}
                  </td>
                  <td className="px-4 py-2 border text-center">
                    <button
                      onClick={() =>
                        router.push(`/admin/editar-empresa/${empresa.id}`)
                      }
                      className="text-blue-600 hover:underline"
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
  );
}
