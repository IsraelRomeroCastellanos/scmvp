'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface Cliente {
  id: number;
  nombre: string;
  email?: string;
  empresa?: string;
}

export default function GestionClientesPage() {
  const router = useRouter();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL as string;

  const fetchClientes = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await axios.get(
        `${backendUrl}/api/cliente/clientes`,
        {
          headers: {
           Authorization: `Bearer ${token}`,
          },
         timeout: 5000, // ⏱️ CLAVE
        }
      );

      const data = response.data;

      const clientesNormalizados: Cliente[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.clientes)
        ? data.clientes
        : Array.isArray(data?.data?.clientes)
        ? data.data.clientes
        : [];

      setClientes(clientesNormalizados);
    } catch (err: any) {
      console.error('⛔ Error cargando clientes:', err);

      if (err.code === 'ECONNABORTED') {
        setError('El servidor tardó demasiado en responder.');
      } else {
        setError('Error al cargar clientes');
      }

      setClientes([]);
    } finally {
      setLoading(false);
    }

  };

  useEffect(() => {
    fetchClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Gestión de Clientes</h1>

      {loading && (
        <p className="text-gray-600">Cargando clientes…</p>
      )}

      {error && (
        <p className="text-red-600">{error}</p>
      )}

      {!loading && !error && clientes.length === 0 && (
        <p className="text-gray-600">No hay clientes para mostrar.</p>
      )}

      {!loading && !error && clientes.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2 text-left">ID</th>
                <th className="border px-4 py-2 text-left">Nombre</th>
                <th className="border px-4 py-2 text-left">Empresa</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.id}>
                  <td className="border px-4 py-2">{cliente.id}</td>
                  <td className="border px-4 py-2">{cliente.nombre}</td>
                  <td className="border px-4 py-2">
                    {cliente.empresa ?? '—'}
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
