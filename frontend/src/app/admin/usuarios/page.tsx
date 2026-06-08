// frontend/src/app/admin/usuarios/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Usuario {
  id: number;
  email: string;
  nombre_completo: string;
  rol: string;
  empresa_id: number | null;
  activo: boolean;
}

export default function GestionUsuarios() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const token = localStorage.getItem('token');
        const base = process.env.NEXT_PUBLIC_API_BASE_URL;

        if (!token) {
          router.push('/login');
          return;
        }

        if (!base) {
          throw new Error('Falta NEXT_PUBLIC_API_BASE_URL');
        }

        const res = await fetch(`${base}/api/admin/usuarios`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || 'Error al cargar usuarios');
        }

        const data = await res.json();
        setUsuarios(data.usuarios || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
      } finally {
        setLoading(false);
      }
    };

    fetchUsuarios();
  }, [router]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Gestión de Usuarios</h1>
          <p className="text-sm text-gray-600">
            Listado general de usuarios del sistema
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push('/admin/crear-usuario')}
          className="w-full sm:w-auto px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          Crear usuario
        </button>
      </div>

      {loading && <p>Cargando usuarios…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border">ID</th>
                <th className="px-4 py-2 border">Email</th>
                <th className="px-4 py-2 border">Nombre</th>
                <th className="px-4 py-2 border">Rol</th>
                <th className="px-4 py-2 border">Empresa</th>
                <th className="px-4 py-2 border">Estado</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 && (
                <tr>
                  <td className="px-4 py-6 border text-center text-gray-500" colSpan={6}>
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}

              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border">{u.id}</td>
                  <td className="px-4 py-2 border">{u.email}</td>
                  <td className="px-4 py-2 border">{u.nombre_completo}</td>
                  <td className="px-4 py-2 border capitalize">{u.rol}</td>
                  <td className="px-4 py-2 border">{u.empresa_id ?? '—'}</td>
                  <td className="px-4 py-2 border">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        u.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
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
