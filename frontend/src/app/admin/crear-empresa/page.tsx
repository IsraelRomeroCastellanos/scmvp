'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type TipoEntidad = 'persona_moral' | 'persona_fisica';

type ActividadVulnerable = {
  clave: string;
  fraccion: string;
  nombre: string;
  descripcion: string | null;
};

async function getEmpresaErrorMessage(res: Response): Promise<string> {
  const data = await res.json().catch(() => null);
  const detail = typeof data?.error === 'string' ? data.error : '';

  if (res.status === 400) return detail ? `Datos inválidos: ${detail}` : 'Datos inválidos';
  if (res.status === 403) return 'No tienes permiso para crear empresas';
  if (res.status === 409) return detail || 'Ya existe una empresa con ese nombre o RFC';
  if (res.status >= 500) return 'Error interno al crear la empresa';

  return detail || 'No se pudo crear la empresa';
}

export default function CrearEmpresaPage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actividades, setActividades] = useState<ActividadVulnerable[]>([]);
  const [loadingActividades, setLoadingActividades] = useState(true);
  const [actividadesCatalogError, setActividadesCatalogError] = useState('');
  const [actividadesSeleccionadas, setActividadesSeleccionadas] = useState<string[]>([]);
  const [actividadesValidationError, setActividadesValidationError] = useState('');

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

  useEffect(() => {
    let active = true;

    const fetchActividadesVulnerables = async () => {
      try {
        setLoadingActividades(true);
        setActividadesCatalogError('');

        const token = localStorage.getItem('token');
        const base = process.env.NEXT_PUBLIC_API_BASE_URL;
        if (!base) throw new Error('Falta NEXT_PUBLIC_API_BASE_URL');

        const res = await fetch(`${base}/api/catalogos/actividades-vulnerables`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error || 'No se pudo cargar el catálogo de actividades vulnerables');
        }
        if (!Array.isArray(data?.actividades_vulnerables)) {
          throw new Error('La respuesta del catálogo de actividades vulnerables no es válida');
        }

        const catalogo: ActividadVulnerable[] = data.actividades_vulnerables
          .map((item: any) => ({
            clave: String(item?.clave ?? '').trim(),
            fraccion: String(item?.fraccion ?? '').trim(),
            nombre: String(item?.nombre ?? '').trim(),
            descripcion:
              typeof item?.descripcion === 'string' && item.descripcion.trim()
                ? item.descripcion.trim()
                : null,
          }))
          .filter((item: ActividadVulnerable) => item.clave && item.fraccion && item.nombre);

        if (active) setActividades(catalogo);
      } catch (e) {
        if (!active) return;
        setActividades([]);
        setActividadesCatalogError(
          e instanceof Error
            ? e.message
            : 'No se pudo cargar el catálogo de actividades vulnerables',
        );
      } finally {
        if (active) setLoadingActividades(false);
      }
    };

    fetchActividadesVulnerables();
    return () => {
      active = false;
    };
  }, []);

  const onChange =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const toggleActividad = (clave: string) => {
    setActividadesSeleccionadas((prev) =>
      prev.includes(clave)
        ? prev.filter((item) => item !== clave)
        : [...prev, clave],
    );
    setActividadesValidationError('');
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
    if (saving || success) return;

    if (loadingActividades) {
      setActividadesValidationError('Espera a que termine de cargar el catálogo.');
      return;
    }
    if (actividadesCatalogError) {
      setActividadesValidationError('No se puede crear la empresa sin cargar el catálogo.');
      return;
    }
    if (actividadesSeleccionadas.length === 0) {
      setActividadesValidationError('Selecciona al menos una actividad vulnerable.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const base = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!base) throw new Error('Falta NEXT_PUBLIC_API_BASE_URL');

      const body = {
        nombre_legal: form.nombre_legal.trim(),
        rfc: form.rfc.trim().toUpperCase() || null,
        tipo_entidad: form.tipo_entidad,
        domicilio: buildDomicilio(),
        entidad: form.entidad.trim(),
        municipio: form.municipio.trim(),
        codigo_postal: form.codigo_postal.trim(),
        actividades_vulnerables: actividadesSeleccionadas,
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
        throw new Error(await getEmpresaErrorMessage(res));
      }

      setSuccess('Empresa creada correctamente');
      window.setTimeout(() => router.push('/admin/empresas'), 700);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear la empresa');
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

        {success && (
          <div className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-green-700">
            {success}
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
            <label className="block text-sm text-gray-600 mb-1">RFC</label>
            <input
              value={form.rfc}
              onChange={onChange('rfc')}
              className="w-full rounded border px-3 py-2"
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

          <fieldset className="rounded border border-gray-200 p-4">
            <legend className="px-1 text-sm font-semibold text-gray-700">
              Actividades vulnerables *
            </legend>

            {loadingActividades ? (
              <p className="text-sm text-gray-500">Cargando actividades vulnerables…</p>
            ) : actividadesCatalogError ? (
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {actividadesCatalogError}
              </div>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {actividades.map((actividad) => {
                  const inputId = `actividad-vulnerable-${actividad.clave}`;
                  return (
                    <div key={actividad.clave} className="rounded border border-gray-200 p-3">
                      <div className="flex items-start gap-3">
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={actividadesSeleccionadas.includes(actividad.clave)}
                          onChange={() => toggleActividad(actividad.clave)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor={inputId} className="min-w-0 cursor-pointer">
                          <span className="block text-sm font-medium text-gray-800">
                            {actividad.fraccion} — {actividad.nombre}
                          </span>
                          {actividad.descripcion ? (
                            <span className="mt-1 block text-xs leading-5 text-gray-500">
                              {actividad.descripcion}
                            </span>
                          ) : null}
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {actividadesValidationError ? (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {actividadesValidationError}
              </p>
            ) : actividadesSeleccionadas.length === 0 && !loadingActividades && !actividadesCatalogError ? (
              <p className="mt-2 text-sm text-gray-500">
                Selecciona al menos una actividad vulnerable.
              </p>
            ) : null}
          </fieldset>

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
              disabled={
                saving ||
                !!success ||
                loadingActividades ||
                !!actividadesCatalogError ||
                actividadesSeleccionadas.length === 0
              }
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
