// frontend/src/app/admin/editar-empresa/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isAdmin } from '@/lib/auth';

export default function EditarEmpresaPage() {
  const { id } = useParams();
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    nombre_legal: '',
    rfc: '',
    tipo_entidad: 'persona_moral',
    estado: 'activo'
  });

  useEffect(() => {
    const init = async () => {
      try {
        const res = await api.get('/api/admin/empresas');
        const empresa = res.data.empresas.find(
          (e: any) => String(e.id) === String(id)
        );

        if (!empresa) {
          setError('Empresa no encontrada');
          return;
        }

        setFormData(empresa);
      } catch {
        setError('Error al cargar la empresa');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [id]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      await api.put(`/api/admin/empresas/${id}`, formData);
      router.push('/admin/empresas');
    } catch {
      setError('Error al guardar cambios');
    }
  };

  if (loading) return <p className="p-4">Cargando...</p>;

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Editar Empresa</h1>

      {error && <div className="mb-4 text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 shadow rounded">
        <input name="nombre_legal" value={formData.nombre_legal} onChange={handleChange} />
        <input name="rfc" value={formData.rfc} onChange={handleChange} />
        <select name="tipo_entidad" value={formData.tipo_entidad} onChange={handleChange}>
          <option value="persona_moral">Persona moral</option>
          <option value="persona_fisica">Persona física</option>
        </select>
        <select name="estado" value={formData.estado} onChange={handleChange}>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>

        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Guardar cambios
        </button>
      </form>
    </main>
  );
}
