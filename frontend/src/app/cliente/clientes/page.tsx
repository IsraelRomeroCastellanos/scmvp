'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Cliente {
  id: number;
  nombre_entidad: string;
  tipo_cliente: string;
  nacionalidad: string | null;
  porcentaje_cumplimiento: number;
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

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/cliente/mis-clientes`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (!res.ok) {
          throw new Error('Error al cargar clientes');
        }

        const data = await res.json();
        setClientes(data.clientes ?? []);
      } catch (err) {
        console.error(err);
        setError('Error al cargar clientes');
      } finally {
        setLoading(false);
      }
    };

    fetchClientes();
  }, [router]);

  if (loading) {
    return <p className="p-6">Cargando clientes…</p>;
  }

  if (error) {
    return <p className="p-6 text-red-600">{error}</p>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white p-6 rounded shadow">
        <h1 className="text-2xl font-semibold mb-4">Gestión de Clientes</h1>

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
                <th className="p-2 border">% Cumplimiento</th>
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
                  <td className="p-2 border">{c.porcentaje_cumplimiento}%</td>
                  <td className="p-2 border">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        c.estado === 'activo'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {c.estado}
                    </span>
                  </td>
                  <td className="p-2 border">
                    <button
                      onClick={() => router.push(`/cliente/editar-cliente/${c.id}`)}
                      className="text-blue-600 hover:underline"
                    >
                      Ver / Editar
                    </button>
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
