// frontend/src/app/admin/crear-usuario/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'react-toastify';
import { isAdmin } from '@/lib/auth';

export default function CrearUsuario() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre_completo: '',
    rol: 'consultor',
    empresa_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [token, setToken] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (isAdmin(user.rol || user.role)) {
          setToken(storedToken);
        } else {
          router.push('/dashboard');
        }
      } catch {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMensaje('');

    try {
      const payload = {
        email: formData.email,
        password: formData.password,
        nombre_completo: formData.nombre_completo,
        rol: formData.rol,
        empresa_id: formData.rol === 'cliente' ? Number(formData.empresa_id) || null : null
      };

      const response = await api.post('/api/admin/usuarios', payload);

      setMensaje('✅ Usuario creado exitosamente');
      toast.success('Usuario creado exitosamente');

      // Podrías redirigir de inmediato:
      // router.push('/admin/usuarios');
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || 'Error al crear usuario');
      toast.error('Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Crear Usuario</h1>

        <div className="bg-white p-6 rounded-lg shadow">
          {error && (
            <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}
          {mensaje && (
            <div className="mb-4 p-3 rounded bg-green-50 text-green-700 text-sm">
              {mensaje}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="nombre_completo" className="block text-sm font-medium text-gray-700">
                  Nombre completo
                </label>
                <input
                  id="nombre_completo"
                  name="nombre_completo"
                  type="text"
                  required
                  value={formData.nombre_completo}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="rol" className="block text-sm font-medium text-gray-700">
                  Rol
                </label>
                <select
                  id="rol"
                  name="rol"
                  value={formData.rol}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="consultor">Consultor</option>
                  <option value="cliente">Cliente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {formData.rol === 'cliente' && (
                <div>
                  <label htmlFor="empresa_id" className="block text-sm font-medium text-gray-700">
                    Empresa ID
                  </label>
                  <input
                    id="empresa_id"
                    name="empresa_id"
                    type="number"
                    value={formData.empresa_id}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    min={1}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    ID de la empresa a la que pertenece el cliente
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => router.push('/admin/usuarios')}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Crear usuario'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
