'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type TipoEntidad = 'persona_moral' | 'persona_fisica';

export default function CrearEmpresaPage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    nombre_legal: '',
    rfc: '',
    tipo_entidad: 'persona_moral' as TipoEntidad,
    calle: '',
    numero: '',
    interior: '',
    entidad: '',
    municipio: '',
    codigo_postal: '',
  });

  const onChange =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const buildDomicilio = () => {
    const parts: string[] = [];
    if (form.calle.trim()) parts.push(form.calle.trim());
    if (form.numero.trim()) parts.push(form.numero.trim());
    if (form.interior.trim()) parts.push(`Int ${form.interior.trim()}`);
    return parts.join(' ').trim();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const base = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!base) throw new Error('Falta NEXT_PUBLIC_API_BASE_URL');

      const body = {
        nombre_legal: form.nombre_legal,
        rfc: form.rfc,
        tipo_entidad: form.tipo_entidad,
        domicilio: buildDomicilio(),
        entidad: form.entidad,
        municipio: form.municipio,
        codigo_postal: form.codigo_postal,
      };

      const res = await fetch(`${base}/api/admin/empresas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error('No se pudo crear');
      }

      router.push('/admin/empresas');
    } catch (_e) {
      setError('Error al crear la empresa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-semibold mb-1">Crear Empresa</h1>
        <p className="text-sm text-gray-500 mb-6">Captura los datos obligatorios para dar de alta la empresa.</p>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Nombre legal *</label>
            <input
              value={form.nombre_legal}
              onChange={onChange('nombre_legal')}
              className="w-full rounded border px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">RFC *</label>
            <input
              value={form.rfc}
              onChange={onChange('rfc')}
              className="w-full rounded border px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Tipo de entidad *</label>
            <select
              value={form.tipo_entidad}
              onChange={onChange('tipo_entidad')}
              className="w-full rounded border px-3 py-2"
              required
            >
              <option value="persona_moral">Persona moral</option>
              <option value="persona_fisica">Persona física</option>
            </select>
          </div>

          <div className="pt-2">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Domicilio</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Calle *</label>
                <input
                  value={form.calle}
                  onChange={onChange('calle')}
                  className="w-full rounded border px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Número *</label>
                <input
                  value={form.numero}
                  onChange={onChange('numero')}
                  className="w-full rounded border px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Interior</label>
                <input
                  value={form.interior}
                  onChange={onChange('interior')}
                  className="w-full rounded border px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Entidad *</label>
                <input
                  value={form.entidad}
                  onChange={onChange('entidad')}
                  className="w-full rounded border px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Municipio *</label>
                <input
                  value={form.municipio}
                  onChange={onChange('municipio')}
                  className="w-full rounded border px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Código Postal *</label>
                <input
                  value={form.codigo_postal}
                  onChange={onChange('codigo_postal')}
                  className="w-full rounded border px-3 py-2"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Creando…' : 'Crear empresa'}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="rounded border px-4 py-2 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
