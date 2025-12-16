// frontend/src/app/admin/editar-empresa/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type TipoEntidad = 'persona_moral' | 'persona_fisica';
type Estado = 'activo' | 'suspendido' | 'inactivo';

type FormState = {
  nombre_legal: string;
  rfc: string;
  tipo_entidad: TipoEntidad;
  calle: string;
  numero: string;
  interior: string;
  entidad: string;
  municipio: string;
  codigo_postal: string;
  estado: Estado;
};

function splitDomicilio(domicilio: string | null | undefined) {
  let calle = '';
  let numero = '';
  let interior = '';

  if (!domicilio) return { calle, numero, interior };

  // Flexible: "Calle 123 Int 4" | "Calle 123" | "Calle"
  const match = domicilio.match(/^(.*?)(?:\s+(\d+))?(?:\s+Int\.?\s*(.+))?$/i);
  if (!match) return { calle: domicilio, numero: '', interior: '' };

  calle = (match[1] || '').trim();
  numero = (match[2] || '').trim();
  interior = (match[3] || '').trim();

  return { calle, numero, interior };
}

function buildDomicilio(calle: string, numero: string, interior: string) {
  const parts: string[] = [];
  if (calle.trim()) parts.push(calle.trim());
  if (numero.trim()) parts.push(numero.trim());
  if (interior.trim()) parts.push(`Int ${interior.trim()}`);
  return parts.join(' ').trim();
}

export default function EditarEmpresaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<FormState>({
    nombre_legal: '',
    rfc: '',
    tipo_entidad: 'persona_moral',
    calle: '',
    numero: '',
    interior: '',
    entidad: '',
    municipio: '',
    codigo_postal: '',
    estado: 'activo',
  });

  const onChange =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value as any }));
    };

  useEffect(() => {
    const fetchEmpresa = async () => {
      try {
        setError('');
        setLoading(true);

        const token = localStorage.getItem('token');
        const base = process.env.NEXT_PUBLIC_API_BASE_URL;
        if (!base) throw new Error('Falta NEXT_PUBLIC_API_BASE_URL');

        const res = await fetch(`${base}/api/admin/empresas/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (!res.ok) throw new Error('No se pudo cargar empresa');

        const data = await res.json();
        const empresa = data?.empresa;

        const { calle, numero, interior } = splitDomicilio(empresa?.domicilio);

        setForm({
          nombre_legal: empresa?.nombre_legal ?? '',
          rfc: empresa?.rfc ?? '',
          tipo_entidad: (empresa?.tipo_entidad ?? 'persona_moral') as TipoEntidad,
          calle,
          numero,
          interior,
          entidad: empresa?.entidad ?? '',
          municipio: empresa?.municipio ?? '',
          codigo_postal: empresa?.codigo_postal ?? '',
          estado: (empresa?.estado ?? 'activo') as Estado,
        });
      } catch (_e) {
        setError('Error al cargar la empresa');
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresa();
  }, [id]);

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
        domicilio: buildDomicilio(form.calle, form.numero, form.interior),
        entidad: form.entidad,
        municipio: form.municipio,
        codigo_postal: form.codigo_postal,
        estado: form.estado,
      };

      const res = await fetch(`${base}/api/admin/empresas/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('No se pudo guardar');

      router.push('/admin/empresas');
    } catch (_e) {
      setError('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6">
          Cargando…
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-semibold mb-1">Editar Empresa</h1>
        <p className="text-sm text-gray-500 mb-6">Actualiza los datos de la empresa.</p>

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

          <div className="pt-2">
            <label className="block text-sm text-gray-600 mb-1">Estado</label>
            <select
              value={form.estado}
              onChange={onChange('estado')}
              className="w-full rounded border px-3 py-2"
            >
              <option value="activo">Activo</option>
              <option value="suspendido">Suspendido</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
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
