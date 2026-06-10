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
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

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

  const cambiarEstadoUsuario = async (id: number, activoNuevo: boolean) => {
    setError('');
    setUpdatingUserId(id);

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

      const res = await fetch(`${base}/api/admin/usuarios/${id}/activo`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activo: activoNuevo }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Error al cambiar estado del usuario');
      }

      const usuarioActualizado = data?.usuario;

      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                activo:
                  typeof usuarioActualizado?.activo === 'boolean'
                    ? usuarioActualizado.activo
                    : activoNuevo,
              }
            : u
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cambiar estado del usuario'
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

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
                <th className="px-4 py-2 border">Acción</th>
                <th className="px-4 py-2 border">Editar</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 && (
                <tr>
                  <td className="px-4 py-6 border text-center text-gray-500" colSpan={8}>
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
                  <td className="px-4 py-2 border">
                    <button
                      type="button"
                      disabled={updatingUserId === u.id}
                      onClick={() => cambiarEstadoUsuario(u.id, !u.activo)}
                      className={`px-3 py-1 rounded text-xs font-medium disabled:opacity-60 disabled:cursor-not-allowed ${
                        u.activo
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {updatingUserId === u.id
                        ? 'Actualizando…'
                        : u.activo
                          ? 'Desactivar'
                          : 'Activar'}
                    </button>
                  </td>
                    <td className="px-4 py-2 border">
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/editar-usuario/${u.id}`)}
                        className="px-3 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Editar
                      </button>
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
