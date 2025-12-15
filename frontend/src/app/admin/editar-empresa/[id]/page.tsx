// frontend/src/app/admin/editar-empresa/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function EditarEmpresaPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    nombre_legal: '',
    rfc: '',
    tipo_entidad: 'persona_moral',
    calle: '',
    numero: '',
    interior: '',
    entidad: '',
    municipio: '',
    codigo_postal: '',
    estado: 'activo'
  });

  useEffect(() => {
    const fetchEmpresa = async () => {
      try {
        const res = await api.get(`/api/admin/empresas/${id}`);
        const empresa = res.data.empresa;

        // 🔹 Descomponer domicilio
        let calle = '';
        let numero = '';
        let interior = '';

        if (empresa.domicilio) {
          const match = empresa.domicilio.match(
            /^(.*?)(?:\s+(\d+))?(?:\s+Int\.?\s*(\w+))?$/i
          );
          if (match) {
            calle = match[1] || '';
            numero = match[2] || '';
            interior = match[3] || '';
          }
        }

        setFormData({
          nombre_legal: empresa.nombre_legal ?? '',
          rfc: empresa.rfc ?? '',
          tipo_entidad: empresa.tipo_entidad ?? 'persona_moral',
          calle,
          numero,
          interior,
          entidad: empresa.entidad ?? '',
          municipio: empresa.municipio ?? '',
          codigo_postal: empresa.codigo_postal ?? '',
          estado: empresa.estado ?? 'activo'
        });
      } catch (err) {
        setError('Error al cargar la empresa');
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresa();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const domicilio = `${formData.calle} ${formData.numero}${
        formData.interior ? ' Int ' + formData.interior : ''
      }`.trim();

      await api.put(`/api/admin/empresas/${id}`, {
        nombre_legal: formData.nombre_legal,
        rfc: formData.rfc,
        tipo_entidad: formData.tipo_entidad,
        domicilio,
        entidad: formData.entidad,
        municipio: formData.municipio,
        codigo_postal: formData.codigo_postal,
        estado: formData.estado
      });

      router.push('/admin/empresas');
    } catch (err) {
      setError('Error al guardar cambios');
    }
  };

  if (loading) return <p className="p-4">Cargando...</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
      <h1 className="text-xl font-bold mb-4">Editar Empresa</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="nombre_legal" value={formData.nombre_legal} onChange={handleChange} placeholder="Nombre legal" className="input" required />
        <input name="rfc" value={formData.rfc} onChange={handleChange} placeholder="RFC" className="input" />
        <select name="tipo_entidad" value={formData.tipo_entidad} onChange={handleChange} className="input">
          <option value="persona_moral">Persona moral</option>
          <option value="persona_fisica">Persona física</option>
        </select>

        <input name="calle" value={formData.calle} onChange={handleChange} placeholder="Calle" className="input" />
        <input name="numero" value={formData.numero} onChange={handleChange} placeholder="Número" className="input" />
        <input name="interior" value={formData.interior} onChange={handleChange} placeholder="Interior" className="input" />

        <input name="entidad" value={formData.entidad} onChange={handleChange} placeholder="Entidad" className="input" />
        <input name="municipio" value={formData.municipio} onChange={handleChange} placeholder="Municipio" className="input" />
        <input name="codigo_postal" value={formData.codigo_postal} onChange={handleChange} placeholder="Código Postal" className="input" />

        <select name="estado" value={formData.estado} onChange={handleChange} className="input">
          <option value="activo">Activo</option>
          <option value="suspendido">Suspendido</option>
          <option value="inactivo">Inactivo</option>
        </select>

        <div className="flex gap-4">
          <button type="submit" className="btn-primary">Guardar cambios</button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
