// frontend/src/app/admin/usuarios/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Usuario {
  id: number;
  email: string;
  nombre_completo: string;
  rol: string;
  activo: boolean;
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const token = localStorage.getItem('token');

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/usuarios`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) throw new Error();

        const data = await res.json();
        setUsuarios(data.usuarios);
      } catch {
        setError('Error al cargar usuarios.');
      }
    };

    fetchUsuarios();
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-sm p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold">Gestión de Usuarios</h1>
            <p className="text-sm text-gray-500">
              Listado general de usuarios del sistema
            </p>
          </div>

          <Link
            href="/admin/crear-usuario"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Crear usuario
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
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b text-sm hover:bg-white"
                  >
                    <td className="py-2">{u.id}</td>
                    <td>{u.nombre_completo}</td>
                    <td>{u.email}</td>
                    <td>{u.rol}</td>
                    <td>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          u.activo
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {u.activo ? 'activo' : 'inactivo'}
                      </span>
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/admin/usuarios/${u.id}`}
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
