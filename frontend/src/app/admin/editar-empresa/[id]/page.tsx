// frontend/src/app/admin/editar-empresa/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import {
  actualizarEmpresa,
  getApiErrorMessage,
  isApiRequestCanceled,
  obtenerActividadesVulnerables,
  obtenerEmpresaAdmin,
} from '@/lib/api';
import type { ActividadVulnerableGeneral } from '@/types/actividades-vulnerables';

type TipoEntidad = 'persona_moral' | 'persona_fisica';
type Estado = 'activo' | 'suspendido' | 'inactivo';

function getCatalogErrorMessage(error: unknown): string {
  return getApiErrorMessage(
    error,
    'No se pudo cargar el catálogo de actividades vulnerables',
  );
}

type EmpresaDetalle = Partial<FormState> & {
  domicilio?: string | null;
  numero?: string | null;
  actividades_vulnerables?: ActividadVulnerableGeneral[];
};

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
  const [canManage, setCanManage] = useState(false);
  const [actividades, setActividades] = useState<ActividadVulnerableGeneral[]>([]);
  const [actividadesAsignadas, setActividadesAsignadas] = useState<ActividadVulnerableGeneral[]>([]);
  const [actividadesSeleccionadas, setActividadesSeleccionadas] = useState<string[]>([]);
  const [actividadesIniciales, setActividadesIniciales] = useState<string[]>([]);
  const [actividadesTouched, setActividadesTouched] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [actividadesError, setActividadesError] = useState('');

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
      setForm((prev) => ({ ...prev, [key]: e.target.value as FormState[typeof key] }));
    };

  useEffect(() => {
    setCanManage(isAdmin(getCurrentUser()?.rol));

    const controller = new AbortController();
    let active = true;

    const loadCatalog = async () => {
      setCatalogLoading(true);
      setCatalogError('');
      try {
        const items = await obtenerActividadesVulnerables(controller.signal);
        if (active) setActividades(items);
      } catch (loadError) {
        if (!active || isApiRequestCanceled(loadError)) return;
        setCatalogError(getCatalogErrorMessage(loadError));
      } finally {
        if (active) setCatalogLoading(false);
      }
    };

    void loadCatalog();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const fetchEmpresa = async () => {
      try {
        setError('');
        setLoading(true);

        const empresa = await obtenerEmpresaAdmin<EmpresaDetalle>(
          id,
          controller.signal,
        );
        if (!active) return;

        const domicilioParts = splitDomicilio(empresa?.domicilio);
        const rawAssigned: unknown[] = Array.isArray(empresa?.actividades_vulnerables)
          ? empresa.actividades_vulnerables
          : [];
        const assigned = rawAssigned.filter(
              (item: unknown): item is ActividadVulnerableGeneral =>
                typeof item === 'object'
                && item !== null
                && typeof (item as ActividadVulnerableGeneral).clave === 'string',
            );
        const assignedKeys = Array.from(
          new Set<string>(assigned.map((item: ActividadVulnerableGeneral) => item.clave)),
        );

        setActividadesAsignadas(assigned);
        setActividadesSeleccionadas(assignedKeys);
        setActividadesIniciales(assignedKeys);
        setActividadesTouched(false);

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
      } catch (e) {
        if (!active || isApiRequestCanceled(e)) return;
        setError(getApiErrorMessage(e, 'Error al cargar la empresa'));
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchEmpresa();
    return () => {
      active = false;
      controller.abort();
    };
  }, [id]);

  const toggleActividad = (clave: string) => {
    setActividadesSeleccionadas((current) =>
      current.includes(clave)
        ? current.filter((item) => item !== clave)
        : [...current, clave],
    );
    setActividadesTouched(true);
    setActividadesError('');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || success) return;

    if (!canManage) {
      setError('No tienes permiso para guardar cambios en esta empresa');
      return;
    }
    if (actividadesTouched && actividadesSeleccionadas.length === 0) {
      setActividadesError('Selecciona al menos una actividad vulnerable.');
      return;
    }

    const removedActivities = actividadesIniciales.filter(
      (clave) => !actividadesSeleccionadas.includes(clave),
    );
    if (
      actividadesTouched
      && !catalogLoading
      && !catalogError
      && removedActivities.length > 0
      && !window.confirm(
        'Esta actividad dejará de estar disponible para nuevas selecciones. Los historiales existentes no se eliminarán.',
      )
    ) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const body: Record<string, unknown> = {
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
      };
      if (
        actividadesTouched
        && !catalogLoading
        && !catalogError
        && actividades.length > 0
      ) {
        body.actividades_vulnerables = actividadesSeleccionadas;
      }

      await actualizarEmpresa(id, body);

      setSuccess('Empresa actualizada correctamente');
      window.setTimeout(() => router.push('/admin/empresas'), 700);
    } catch (e) {
      const message = getApiErrorMessage(e, 'Error al guardar cambios');
      if (message.toLowerCase().includes('activ')) setActividadesError(message);
      setError(message);
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

          <fieldset className="rounded border border-gray-200 p-4">
            <legend className="px-1 text-sm font-semibold text-gray-700">
              Actividades vulnerables
            </legend>

            {actividadesIniciales.length === 0 && (
              <p className="mb-3 text-sm text-amber-700" role="status">
                Esta empresa tiene pendiente configurar sus actividades vulnerables.
              </p>
            )}

            {catalogLoading && (
              <p className="text-sm text-gray-600" role="status">
                Cargando actividades vulnerables…
              </p>
            )}
            {catalogError && (
              <div className="text-sm text-amber-700" role="alert">
                <p>{catalogError}</p>
                <p className="mt-1">
                  Puedes editar los demás campos; las actividades existentes no se modificarán.
                </p>
              </div>
            )}
            {!catalogLoading && !catalogError && actividades.length === 0 && (
              <p className="text-sm text-amber-700" role="alert">
                El catálogo de actividades vulnerables está vacío. Las relaciones actuales se conservarán.
              </p>
            )}

            {!canManage && (
              <div className="space-y-2">
                {actividadesAsignadas.length > 0 ? (
                  actividadesAsignadas.map((actividad) => (
                    <div key={actividad.clave} className="rounded border border-gray-200 p-3">
                      <p className="text-sm font-medium text-gray-800">{actividad.nombre}</p>
                      {actividad.fraccion && (
                        <p className="text-xs text-gray-500">Fracción {actividad.fraccion}</p>
                      )}
                      {actividad.descripcion && (
                        <p className="mt-1 text-sm text-gray-600">{actividad.descripcion}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">Sin actividades asignadas.</p>
                )}
                <p className="text-sm text-amber-700">
                  Tu rol permite consultar esta configuración, pero no modificarla.
                </p>
              </div>
            )}

            {canManage && !catalogLoading && !catalogError && actividades.length > 0 && (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-2">
                {actividades.map((actividad) => {
                  const inputId = `actividad-${actividad.clave}`;
                  return (
                    <label
                      key={actividad.clave}
                      htmlFor={inputId}
                      className="flex cursor-pointer items-start gap-3 rounded border border-gray-200 p-3 hover:bg-gray-50"
                    >
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={actividadesSeleccionadas.includes(actividad.clave)}
                        onChange={() => toggleActividad(actividad.clave)}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-medium text-gray-800">
                          {actividad.nombre}
                        </span>
                        {actividad.fraccion && (
                          <span className="block text-xs text-gray-500">
                            Fracción {actividad.fraccion}
                          </span>
                        )}
                        {actividad.descripcion && (
                          <span className="mt-1 block text-sm text-gray-600">
                            {actividad.descripcion}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {actividadesError && (
              <p className="mt-3 text-sm text-red-700" role="alert">
                {actividadesError}
              </p>
            )}
          </fieldset>

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
              disabled={
                saving
                || !!success
                || !canManage
                || (actividadesTouched && actividadesSeleccionadas.length === 0)
              }
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
