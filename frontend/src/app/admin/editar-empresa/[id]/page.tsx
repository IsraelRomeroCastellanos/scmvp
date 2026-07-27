// frontend/src/app/admin/editar-empresa/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type TipoEntidad = 'persona_moral' | 'persona_fisica';
type Estado = 'activo' | 'suspendido' | 'inactivo';

type ActividadVulnerable = {
  clave: string;
  fraccion: string;
  nombre: string;
  descripcion: string | null;
};

type EmpresaDetalle = {
  nombre_legal: string | null;
  rfc: string | null;
  tipo_entidad: TipoEntidad | null;
  domicilio: string | null;
  calle: string | null;
  numero: string | null;
  entidad: string | null;
  municipio: string | null;
  pais: string | null;
  colonia: string | null;
  codigo_postal: string | null;
  ciudad_delegacion: string | null;
  estado_provincia: string | null;
  estado: Estado | null;
  actividades_vulnerables: ActividadVulnerable[];
};

async function getEmpresaErrorMessage(res: Response, action: 'cargar' | 'guardar'): Promise<string> {
  const data = await res.json().catch(() => null);
  const detail = typeof data?.error === 'string' ? data.error : '';

  if (res.status === 400) return detail ? `Datos inválidos: ${detail}` : 'Datos inválidos';
  if (res.status === 403) return 'No tienes permiso para acceder a esta empresa';
  if (res.status === 404) return 'Empresa no encontrada';
  if (res.status === 409) return detail || 'Ya existe una empresa con ese nombre o RFC';
  if (res.status >= 500) {
    return action === 'cargar'
      ? 'Error interno al cargar la empresa'
      : 'Error interno al guardar la empresa';
  }

  return detail || (action === 'cargar' ? 'No se pudo cargar la empresa' : 'No se pudo guardar la empresa');
}

type FormState = {
  nombre_legal: string;
  rfc: string;
  tipo_entidad: TipoEntidad;
  calle: string;
  numero: string;
  interior: string;
  entidad: string;
  municipio: string;
  pais: string;
  colonia: string;
  codigo_postal: string;
  ciudad_delegacion: string;
  estado_provincia: string;
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
  const [success, setSuccess] = useState('');
  const [actividades, setActividades] = useState<ActividadVulnerable[]>([]);
  const [loadingActividades, setLoadingActividades] = useState(true);
  const [actividadesCatalogError, setActividadesCatalogError] = useState('');
  const [actividadesSeleccionadas, setActividadesSeleccionadas] = useState<string[]>([]);
  const [actividadesTouched, setActividadesTouched] = useState(false);
  const [actividadesValidationError, setActividadesValidationError] = useState('');

  const [form, setForm] = useState<FormState>({
    nombre_legal: '',
    rfc: '',
    tipo_entidad: 'persona_moral',
    calle: '',
    numero: '',
    interior: '',
    entidad: '',
    municipio: '',
    pais: '',
    colonia: '',
    codigo_postal: '',
    ciudad_delegacion: '',
    estado_provincia: '',
    estado: 'activo',
  });

  const onChange =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value as any }));
    };

  const toggleActividad = (clave: string) => {
    setActividadesTouched(true);
    setActividadesSeleccionadas((prev) =>
      prev.includes(clave)
        ? prev.filter((item) => item !== clave)
        : [...prev, clave],
    );
    setActividadesValidationError('');
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

        if (!res.ok) throw new Error(await getEmpresaErrorMessage(res, 'cargar'));

        const data = await res.json();
        const empresa = data?.empresa as Partial<EmpresaDetalle> | undefined;

        const domicilioParts = splitDomicilio(empresa?.domicilio);
        const actividadesGuardadas = Array.isArray(empresa?.actividades_vulnerables)
          ? Array.from(
              new Set(
                empresa.actividades_vulnerables
                  .map((actividad) => String(actividad?.clave ?? '').trim())
                  .filter(Boolean),
              ),
            )
          : [];

        setForm({
          nombre_legal: empresa?.nombre_legal ?? '',
          rfc: empresa?.rfc ?? '',
          tipo_entidad: (empresa?.tipo_entidad ?? 'persona_moral') as TipoEntidad,
          calle: empresa?.calle ?? domicilioParts.calle,
          numero: empresa?.numero ?? domicilioParts.numero,
          interior: domicilioParts.interior,
          entidad: empresa?.entidad ?? '',
          municipio: empresa?.municipio ?? '',
          pais: empresa?.pais ?? '',
          colonia: empresa?.colonia ?? '',
          codigo_postal: empresa?.codigo_postal ?? '',
          ciudad_delegacion: empresa?.ciudad_delegacion ?? '',
          estado_provincia: empresa?.estado_provincia ?? '',
          estado: (empresa?.estado ?? 'activo') as Estado,
        });
        setActividadesSeleccionadas(actividadesGuardadas);
        setActividadesTouched(false);
        setActividadesValidationError('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar la empresa');
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresa();
  }, [id]);

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || success) return;

    if (actividadesTouched && actividadesSeleccionadas.length === 0) {
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
        domicilio: buildDomicilio(form.calle, form.numero, form.interior),
        entidad: form.entidad.trim(),
        municipio: form.municipio.trim(),
        pais: form.pais.trim(),
        colonia: form.colonia.trim(),
        codigo_postal: form.codigo_postal.trim(),
        calle: form.calle.trim(),
        numero: form.numero.trim(),
        ciudad_delegacion: form.ciudad_delegacion.trim(),
        estado_provincia: form.estado_provincia.trim(),
        estado: form.estado,
        ...(actividadesTouched &&
        !actividadesCatalogError &&
        actividadesSeleccionadas.length > 0
          ? { actividades_vulnerables: actividadesSeleccionadas }
          : {}),
      };

      const res = await fetch(`${base}/api/admin/empresas/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(await getEmpresaErrorMessage(res, 'guardar'));

      setSuccess('Empresa actualizada correctamente');
      window.setTimeout(() => router.push('/admin/empresas'), 700);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar cambios');
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
              Actividades vulnerables
            </legend>

            {!actividadesTouched && actividadesSeleccionadas.length === 0 ? (
              <div className="mb-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
                Actividad vulnerable pendiente
              </div>
            ) : null}

            {loadingActividades ? (
              <p className="text-sm text-gray-500">Cargando actividades vulnerables…</p>
            ) : actividadesCatalogError ? (
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p>{actividadesCatalogError}</p>
                <p className="mt-1">
                  Puedes guardar otros cambios; las actividades actuales se conservarán.
                </p>
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

          <div className="pt-2">
            <label className="block text-sm text-gray-600 mb-1">Estado</label>
            <select
              value={form.estado}
              onChange={onChange('estado')}
              className="w-full rounded border px-3 py-2"
              required
            >
              <option value="activo">Activo</option>
              <option value="suspendido">Suspendido</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !!success}
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
