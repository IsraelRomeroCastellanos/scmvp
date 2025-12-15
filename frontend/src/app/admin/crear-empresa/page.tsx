'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CrearEmpresaPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    nombre_legal: '',
    rfc: '',
    tipo_entidad: 'persona_moral',
    calle: '',
    numero: '',
    interior: '',
    entidad: '',
    municipio: '',
    codigo_postal: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validar = () => {
    if (
      !form.nombre_legal ||
      !form.rfc ||
      !form.calle ||
      !form.numero ||
      !form.entidad ||
      !form.municipio ||
      !form.codigo_postal
    ) {
      setError('Por favor completa todos los campos obligatorios.');
      return false;
    }
    return true;
  };

const onSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  if (!validar()) return;

  try {
    setLoading(true);
    const token = localStorage.getItem('token');

    const payload = {
      nombre_legal: form.nombre_legal,
      rfc: form.rfc,
      tipo_entidad: form.tipo_entidad,
      domicilio: `${form.calle} ${form.numero}${form.interior ? ` Int. ${form.interior}` : ''}`,
      entidad: form.entidad,
      municipio: form.municipio,
      codigo_postal: form.codigo_postal,
    };

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/empresas`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) throw new Error();

    router.push('/admin/empresas');
  } catch {
    setError('Error al crear la empresa.');
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-semibold mb-4">Crear Empresa</h1>

        {error && (
          <div className="mb-4 bg-red-50 text-red-600 p-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <input name="nombre_legal" placeholder="Nombre legal *" onChange={onChange} className="input" />
          <input name="rfc" placeholder="RFC *" onChange={onChange} className="input" />

          <select name="tipo_entidad" onChange={onChange} className="input">
            <option value="persona_moral">Persona moral</option>
            <option value="persona_fisica">Persona física</option>
          </select>

          <input name="calle" placeholder="Calle *" onChange={onChange} className="input" />
          <input name="numero" placeholder="Número *" onChange={onChange} className="input" />
          <input name="interior" placeholder="Interior" onChange={onChange} className="input" />

          <input name="entidad" placeholder="Entidad *" onChange={onChange} className="input" />
          <input name="municipio" placeholder="Municipio *" onChange={onChange} className="input" />
          <input name="codigo_postal" placeholder="Código Postal *" onChange={onChange} className="input" />

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Crear empresa'}
            </button>

            <button
              type="button"
              onClick={() => router.push('/admin/empresas')}
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
