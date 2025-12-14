'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Empresa {
  id: number;
  nombre_legal: string;
  rfc: string | null;
  tipo_entidad: string;
  estado: string;
}

export default function EmpresasPage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/empresas`;
        console.log('Fetching empresas from:', url);

        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        console.log('Response status:', res.status);

        const text = await res.text();
        console.log('Raw response:', text);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${text}`);
        }

        const data = JSON.parse(text);

        if (!data.empresas || !Array.isArray(data.empresas)) {
          throw new Error('Formato inesperado de respuesta');
        }

        setEmpresas(data.empresas);
      } catch (err: any) {
        console.error('Error cargando empresas:', err);
        setError(err.message || 'Error al cargar empresas');
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
    return (
      <div className="p-6 text-red-600">
        <p>Error:</p>
        <pre className="mt-2 whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Gestión de Empresas</h1>
        <button
          onClick={() => router.push('/admin/crear-empresa')}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Crear empresa
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 border">Nombre legal</th>
              <th className="px-4 py-2 border">RFC</th>
              <th className="px-4 py-2 border">Tipo</th>
              <th className="px-4 py-2 border">Estado</th>
              <th className="px-4 py-2 border">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((empresa) => (
              <tr key={empresa.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border">{empresa.nombre_legal}</td>
                <td className="px-4 py-2 border">{empresa.rfc || '—'}</td>
                <td className="px-4 py-2 border">{empresa.tipo_entidad}</td>
                <td className="px-4 py-2 border">{empresa.estado}</td>
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
    </div>
  );
}
