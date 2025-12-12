'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isAdmin } from '@/lib/auth';

export default function CrearEmpresaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    nombre_legal: '',
    rfc: '',
    tipo_entidad: 'persona_moral'
  });

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
    }
  }, [router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/api/admin/empresas', {
        nombre_legal: formData.nombre_legal,
        rfc: formData.rfc || null,
        tipo_entidad: formData.tipo_entidad
      });

      router.push('/admin/empresas');
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.error ||
        'Error al crear la empresa'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">
          Crear Empresa
        </h1>

        <div className="bg-white p-6 rounded-lg shadow max-w-2xl">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre legal */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nombre legal
              </label>
              <input
                type="text"
                name="nombre_legal"
                required
                value={formData.nombre_legal}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            {/* RFC */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                RFC (opcional)
              </label>
              <input
                type="text"
                name="rfc"
                value={formData.rfc}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            {/* Tipo de entidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tipo de entidad
              </label>
              <select
                name="tipo_entidad"
                value={formData.tipo_entidad}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="persona_moral">Persona moral</option>
                <option value="persona_fisica">Persona física</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.push('/admin/empresas')}
                className="px-4 py-2 border rounded-md"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Crear Empresa'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
