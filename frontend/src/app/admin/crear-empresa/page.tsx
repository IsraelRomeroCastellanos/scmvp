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
      await api.post('/api/admin/empresas', formData);
      router.push('/admin/empresas');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al crear la empresa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Crear Empresa</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 shadow rounded">
        <div>
          <label className="block text-sm font-medium">Nombre legal</label>
          <input
            name="nombre_legal"
            required
            value={formData.nombre_legal}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">RFC</label>
          <input
            name="rfc"
            required
            value={formData.rfc}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Tipo de entidad</label>
          <select
            name="tipo_entidad"
            value={formData.tipo_entidad}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="persona_moral">Persona moral</option>
            <option value="persona_fisica">Persona física</option>
          </select>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin/empresas')}
            className="border px-4 py-2 rounded"
          >
            Cancelar
          </button>
          <button
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            {loading ? 'Guardando...' : 'Crear Empresa'}
          </button>
        </div>
      </form>
    </main>
  );
}
