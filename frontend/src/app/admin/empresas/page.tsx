'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Empresa = {
  id: number;
  nombre_legal: string;
  rfc: string | null;
  tipo_entidad: string;
  estado: string;
  domicilio: string | null;
};

function getToken(): string | null {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

function parseDomicilio(domicilio?: string | null) {
  let entidad = '-';
  let municipio = '-';
  let cp = '-';

  if (domicilio) {
    const parts = domicilio.split(',').map(p => p.trim());
    if (parts[1]) municipio = parts[1];
    if (parts[2]) entidad = parts[2];

    const cpMatch = domicilio.match(/CP\s*([0-9]{4,6})/i);
    if (cpMatch?.[1]) cp = cpMatch[1];
  }

  return { entidad, municipio, cp };
}

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const token = getToken();
        const res = await fetch(`${apiBase}/api/admin/empresas`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: 'no-store'
        });

        const text = await res.text();
        if (!res.ok) throw new Error(text || 'Error al cargar empresas');

        const data = JSON.parse(text);
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

  if (loading) return <div className="p-6">Cargando empresas...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Gestión de Empresas</h1>

        <Link
          href="/admin/crear-empresa"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Crear empresa
        </Link>
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
            {empresas.map((e) => {
              const { entidad, municipio, cp } = parseDomicilio(e.domicilio);

              return (
                <tr key={e.id} className="border-t">
                  <td className="border px-2 py-1">{e.id}</td>
                  <td className="border px-2 py-1">{e.nombre_legal}</td>
                  <td className="border px-2 py-1">{e.rfc || '-'}</td>
                  <td className="border px-2 py-1">{entidad}</td>
                  <td className="border px-2 py-1">{municipio}</td>
                  <td className="border px-2 py-1">{cp}</td>
                  <td className="border px-2 py-1">{e.tipo_entidad}</td>
                  <td className="border px-2 py-1">{e.estado}</td>
                  <td className="border px-2 py-1">
                    <Link
                      href={`/admin/empresas/${e.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
