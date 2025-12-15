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
  estado: string;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const token = localStorage.getItem('token');

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/clientes`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) throw new Error();

        const data = await res.json();
        setClientes(data.clientes);
      } catch {
        setError('Error al cargar clientes');
      }
    };

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
                  <th className="py-2">Nombre</th>
                  <th>Empresa</th>
                  <th>Tipo</th>
                  <th>Actividad</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b text-sm hover:bg-white"
                  >
                    <td className="py-2">{c.nombre}</td>
                    <td>{c.empresa}</td>
                    <td>{c.tipo}</td>
                    <td>{c.actividad}</td>
                    <td>
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                        {c.estado}
                      </span>
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/cliente/clientes/${c.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        Ver
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
