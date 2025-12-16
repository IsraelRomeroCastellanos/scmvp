'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface Cliente {
  id: number;
  nombre_completo: string;
  email: string;
}

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      router.push('/login');
      return;
    }

    const fetchClientes = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

        const response = await axios.get(
          `${backendUrl}/api/cliente/clientes`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            timeout: 5000,
          }
        );

        setClientes(response.data.clientes || []);
      } catch (err: any) {
        console.error('⛔ Error cargando clientes:', err);

        if (err.code === 'ECONNABORTED') {
          setError('El servidor tardó demasiado en responder.');
        } else {
          setError('Error al cargar clientes.');
        }
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
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Gestión de Clientes</h1>

      {clientes.length === 0 ? (
        <p>No hay clientes registrados.</p>
      ) : (
        <table className="min-w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1">ID</th>
              <th className="border px-2 py-1">Nombre</th>
              <th className="border px-2 py-1">Email</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id}>
                <td className="border px-2 py-1">{c.id}</td>
                <td className="border px-2 py-1">{c.nombre_completo}</td>
                <td className="border px-2 py-1">{c.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
