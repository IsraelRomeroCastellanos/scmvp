'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Empresa {
  id: number;
  nombre_legal: string;
  rfc: string | null;
  tipo_entidad: string;
  estado: string;
}

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const token = localStorage.getItem('token');

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/empresas`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) throw new Error();

        const data = await res.json();
        setEmpresas(data.empresas);
      } catch {
        setError('Error al cargar empresas.');
      }
    };

    fetchEmpresas();
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-sm p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold">Gestión de Empresas</h1>
            <p className="text-sm text-gray-500">
              Listado general de empresas del sistema
            </p>
          </div>

          <Link
            href="/admin/empresas/crear"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Crear empresa
          </Link>
        </div>

        {/* Tabla */}
        <div className="bg-gray-50 rounded-lg p-4">
          {error && (
            <div className="text-red-600 bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          {!error && (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b text-left text-sm text-gray-600">
                  <th className="py-2">ID</th>
                  <th>Nombre legal</th>
                  <th>RFC</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {empresas.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b text-sm hover:bg-white"
                  >
                    <td className="py-2">{e.id}</td>
                    <td>{e.nombre_legal}</td>
                    <td>{e.rfc ?? '-'}</td>
                    <td>{e.tipo_entidad}</td>
                    <td>
                      <span className="text-green-700 bg-green-100 px-2 py-1 rounded text-xs">
                        {e.estado}
                      </span>
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/admin/empresas/${e.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
