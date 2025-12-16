// frontend/src/app/clientes/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Cliente {
  id: number;
  nombre: string;
  empresa: string;
  tipo: string;
  actividad: string;
  estado: 'activo' | 'inactivo' | string;
}

function mostrar(v: string | null | undefined) {
  if (!v || v.trim() === '') return '—';
  return v;
}

function badgeEstado(estado: string) {
  const e = estado?.toLowerCase();
  if (e === 'activo') return 'bg-green-100 text-green-800';
  if (e === 'inactivo') return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchClientes = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const base = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!base) throw new Error('Falta NEXT_PUBLIC_API_BASE_URL');

      const res = await fetch(`${base}/api/cliente/clientes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      if (!res.ok) throw new Error('Error de servidor');

      const data = await res.json();
      setClientes(Array.isArray(data?.clientes) ? data.clientes : []);
    } catch (_e) {
      setError('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-sm p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold">Gestión de Clientes</h1>
            <p className="text-sm text-gray-500">
              Listado general de clientes del sistema
            </p>
          </div>

          <Link
            href="/cliente/registrar-cliente"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Registrar cliente
          </Link>
        </div>

        {/* Tabla */}
        <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
          {error && (
            <div className="mb-3 rounded bg-red-50 text-red-700 p-3">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-gray-600">Cargando clientes…</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-gray-600">
                  <th className="py-2 pr-3">ID</th>
                  <th className="pr-3">Nombre</th>
                  <th className="pr-3">Empresa</th>
                  <th className="pr-3">Tipo</th>
                  <th className="pr-3">Actividad</th>
                  <th className="pr-3">Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id} className="border-b text-sm hover:bg-white">
                    <td className="py-2 pr-3">{c.id}</td>
                    <td className="pr-3">{mostrar(c.nombre)}</td>
                    <td className="pr-3">{mostrar(c.empresa)}</td>
                    <td className="pr-3">{mostrar(c.tipo)}</td>
                    <td className="pr-3">{mostrar(c.actividad)}</td>
                    <td className="pr-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${badgeEstado(
                          c.estado
                        )}`}
                      >
                        {mostrar(c.estado)}
                      </span>
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/cliente/editar-cliente/${c.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}

                {clientes.length === 0 && !error && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-500">
                      No hay clientes registrados.
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
