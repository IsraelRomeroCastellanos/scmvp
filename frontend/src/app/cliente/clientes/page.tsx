'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Cliente {
  id: number;
  nombre_entidad: string;
  tipo_cliente: string;
  nacionalidad: string | null;
  estado: 'activo' | 'inactivo';
}

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        const res = await fetch(`${apiBase}/api/cliente/clientes`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || 'Error al cargar clientes');
        }

        setClientes(data?.clientes ?? []);
      } catch (err) {
        console.error(err);
        setError('Error al cargar clientes');
      } finally {
        setLoading(false);
      }
    };

    fetchClientes();
  }, [router]);

  if (loading) return <p className="p-6">Cargando clientes…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white p-6 rounded shadow">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Gestión de Clientes</h1>
            <p className="text-sm text-gray-500 mb-4">Listado general de clientes del sistema</p>
          </div>

          <button
            className="rounded border px-4 py-2 text-sm"
            onClick={() => router.push('/cliente/registrar-cliente')}
          >
            + Registrar cliente
          </button>
        </div>

        {clientes.length === 0 ? (
          <p>No hay clientes registrados.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2 border">ID</th>
                <th className="p-2 border">Nombre</th>
                <th className="p-2 border">Tipo</th>
                <th className="p-2 border">Nacionalidad</th>
                <th className="p-2 border">Estado</th>
                <th className="p-2 border">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {clientes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="p-2 border">{c.id}</td>
                  <td className="p-2 border">{c.nombre_entidad}</td>
                  <td className="p-2 border">{c.tipo_cliente}</td>
                  <td className="p-2 border">{c.nacionalidad ?? '-'}</td>
                  <td className="p-2 border">
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                      {c.estado}
                    </span>
                  </td>

                  <td className="p-2 border">
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => router.push(`/cliente/clientes/${c.id}`)}
                        className="text-blue-600 hover:underline text-sm"
                        title="Ver detalle"
                      >
                        Ver
                      </button>

                      <button
                        onClick={() => router.push(`/cliente/editar-cliente/${c.id}`)}
                        className="text-blue-600 hover:underline text-sm"
                        title="Editar"
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
