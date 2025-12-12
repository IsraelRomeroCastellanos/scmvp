// frontend/src/app/admin/usuarios/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { normalizeRole, isAdmin } from '@/lib/auth';

interface Usuario {
  id: number;
  email: string;
  nombre_completo: string;
  rol: string;
  empresa_id: number | null;
  activo?: boolean;
}

export default function UsuariosPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userStr);
    if (!isAdmin(user.rol || user.role)) {
      router.push('/dashboard');
      return;
    }

    const fetchUsuarios = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await api.get('/api/admin/usuarios');
        const data = response.data;

        // ✅ aceptar múltiples formatos del backend
        let lista: Usuario[] = [];

        if (Array.isArray(data)) {
          lista = data;
        } else if (Array.isArray(data.usuarios)) {
          lista = data.usuarios;
        } else if (Array.isArray(data.data)) {
          lista = data.data;
        } else {
          throw new Error('Formato inesperado de respuesta');
        }

        setUsuarios(lista);
      } catch (err) {
        console.error('Error al cargar usuarios:', err);
        setError('Error al cargar usuarios.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsuarios();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Gestión de Usuarios</h1>

        <div className="bg-white p-6 rounded-lg shadow">
          {loading && <p className="text-gray-600">Cargando usuarios...</p>}
          {error && <p className="text-red-600 mb-4">{error}</p>}

          {!loading && !error && usuarios.length === 0 && (
            <p className="text-gray-600">No hay usuarios registrados.</p>
          )}

          {!loading && !error && usuarios.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Nombre
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Rol
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Empresa
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {usuarios.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{u.nombre_completo}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                      <td className="px-4 py-3 text-sm">
                        {normalizeRole(u.rol) === 'administrador'
                          ? 'Administrador'
                          : normalizeRole(u.rol) === 'consultor'
                          ? 'Consultor'
                          : 'Cliente'}
                      </td>
                      <td className="px-4 py-3 text-sm">{u.empresa_id ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
