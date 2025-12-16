'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Empresa {
  id: number;
  nombre_legal: string;
  rfc: string | null;
  tipo_entidad: string;
  estado: 'activo' | 'suspendido' | 'inactivo' | string;
  entidad: string | null;
  municipio: string | null;
  codigo_postal: string | null;
}

function mostrar(v: string | null | undefined) {
  if (v === null || v === undefined || String(v).trim() === '') return '—';
  return v;
}

function badgeEstado(estado: string) {
  const e = (estado || '').toLowerCase();
  if (e === 'activo') return 'bg-green-100 text-green-800';
  if (e === 'suspendido') return 'bg-yellow-100 text-yellow-800';
  if (e === 'inactivo') return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
}

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEmpresas = async () => {
    try {
      setError('');
      setLoading(true);

      const token = localStorage.getItem('token');
      const base = process.env.NEXT_PUBLIC_API_BASE_URL;

      if (!base) {
        throw new Error('Falta NEXT_PUBLIC_API_BASE_URL');
      }

      const res = await fetch(`${base}/api/admin/empresas`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      if (!res.ok) throw new Error('No se pudo cargar empresas');

      const data = await res.json();
      setEmpresas(Array.isArray(data?.empresas) ? data.empresas : []);
    } catch (_e) {
      setError('Error al cargar empresas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpresas();
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-sm p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold">Gestión de Empresas</h1>
            <p className="text-sm text-gray-500">Listado general de empresas del sistema</p>
          </div>

          <Link
            href="/admin/crear-empresa"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Crear empresa
          </Link>
        </div>

        {/* Tabla */}
        <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
          {error && (
            <div className="text-red-600 bg-red-50 p-3 rounded mb-3">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-gray-600">Cargando empresas…</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-gray-600">
                  <th className="py-2 pr-3">ID</th>
                  <th className="pr-3">Nombre legal</th>
                  <th className="pr-3">RFC</th>
                  <th className="pr-3">Tipo</th>
                  <th className="pr-3">Entidad</th>
                  <th className="pr-3">Municipio</th>
                  <th className="pr-3">C.P.</th>
                  <th className="pr-3">Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {empresas.map((e) => (
                  <tr key={e.id} className="border-b text-sm hover:bg-white">
                    <td className="py-2 pr-3">{e.id}</td>
                    <td className="pr-3">{mostrar(e.nombre_legal)}</td>
                    <td className="pr-3">{mostrar(e.rfc)}</td>
                    <td className="pr-3">{mostrar(e.tipo_entidad)}</td>
                    <td className="pr-3">{mostrar(e.entidad)}</td>
                    <td className="pr-3">{mostrar(e.municipio)}</td>
                    <td className="pr-3">{mostrar(e.codigo_postal)}</td>
                    <td className="pr-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${badgeEstado(e.estado)}`}
                      >
                        {mostrar(e.estado)}
                      </span>
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/admin/editar-empresa/${e.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}

                {empresas.length === 0 && !error && (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-gray-500">
                      No hay empresas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
