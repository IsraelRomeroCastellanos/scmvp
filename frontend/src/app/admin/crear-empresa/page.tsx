'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import {
  crearEmpresa,
  getApiErrorMessage,
  isApiRequestCanceled,
  obtenerActividadesVulnerables,
} from '@/lib/api';
import type { ActividadVulnerableGeneral } from '@/types/actividades-vulnerables';
import {
  buildDomicilioCompleto,
  buildDomicilioLegacy,
  EmpresaConfirmationModal,
  EmpresaDomicilioConfirmacion,
} from '@/components/EmpresaDomicilioConfirmacion';

type TipoEntidad = 'persona_moral' | 'persona_fisica';

function getCatalogErrorMessage(error: unknown): string {
  return getApiErrorMessage(
    error,
    'No se pudo cargar el catálogo de actividades vulnerables',
  );
}

export default function CrearEmpresaPage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [actividades, setActividades] = useState<ActividadVulnerableGeneral[]>([]);
  const [actividadesSeleccionadas, setActividadesSeleccionadas] = useState<string[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [actividadesError, setActividadesError] = useState('');
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const submitLockRef = useRef(false);

  const [form, setForm] = useState({
    nombre_legal: '',
    rfc: '',
    tipo_entidad: 'persona_moral' as TipoEntidad,
    calle: '',
    numero: '',
    interior: '',
    pais: 'México',
    entidad: '',
    municipio: '',
    ciudad_delegacion: '',
    colonia: '',
    codigo_postal: '',
  });

  const onChange =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
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

  const toggleActividad = (clave: string) => {
    setActividadesSeleccionadas((current) =>
      current.includes(clave)
        ? current.filter((item) => item !== clave)
        : [...current, clave],
    );
    setActividadesError('');
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || success || confirmationOpen) return;

    setError('');
    setActividadesError('');
    if (!canManage) {
      setError('No tienes permiso para crear empresas');
      return;
    }
    if (catalogLoading) {
      setActividadesError('Espera a que termine de cargar el catálogo.');
      return;
    }
    if (catalogError || actividades.length === 0) {
      setActividadesError('El catálogo no está disponible; no es posible crear la empresa.');
      return;
    }
    if (actividadesSeleccionadas.length === 0) {
      setActividadesError('Selecciona al menos una actividad vulnerable.');
      return;
    }
    if (
      ['méxico', 'mexico', 'mx', 'mex'].includes(form.pais.trim().toLowerCase())
      && !/^\d{5}$/.test(form.codigo_postal)
    ) {
      setError('Para México, el código postal debe tener 5 dígitos.');
      return;
    }
    setConfirmationOpen(true);
  };

  const confirmCreate = async () => {
    if (submitLockRef.current || saving || success) return;
    submitLockRef.current = true;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const body = {
        nombre_legal: form.nombre_legal.trim(),
        rfc: form.rfc.trim().toUpperCase() || null,
        tipo_entidad: form.tipo_entidad,
        domicilio: buildDomicilioLegacy(form),
        pais: form.pais.trim(),
        entidad: form.entidad.trim(),
        municipio: form.municipio.trim(),
        ciudad_delegacion: form.ciudad_delegacion.trim(),
        colonia: form.colonia.trim(),
        codigo_postal: form.codigo_postal.trim(),
        calle: form.calle.trim(),
        numero: form.numero.trim(),
        actividades_vulnerables: actividadesSeleccionadas,
      };

      await crearEmpresa(body);

      setSuccess('Empresa creada correctamente');
      setConfirmationOpen(false);
      window.setTimeout(() => router.push('/admin/empresas'), 700);
    } catch (e) {
      const message = getApiErrorMessage(e, 'Error al crear la empresa');
      if (message.toLowerCase().includes('activ')) setActividadesError(message);
      setError(message);
      setConfirmationOpen(false);
    } finally {
      submitLockRef.current = false;
      setSaving(false);
    }
  };

  const selectedActivityNames = actividades
    .filter((actividad) => actividadesSeleccionadas.includes(actividad.clave))
    .map((actividad) => actividad.nombre);

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
              disabled={!canManage}
              className="w-full rounded border px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">RFC</label>
            <input
              value={form.rfc}
              onChange={onChange('rfc')}
              disabled={!canManage}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Tipo de entidad *</label>
            <select
              value={form.tipo_entidad}
              onChange={onChange('tipo_entidad')}
              disabled={!canManage}
              className="w-full rounded border px-3 py-2"
              required
            >
              <option value="persona_moral">Persona moral</option>
              <option value="persona_fisica">Persona física</option>
            </select>
          </div>

          <div className="pt-2">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Domicilio</h2>

            <EmpresaDomicilioConfirmacion
              form={form}
              setForm={setForm}
              lookupEnabled
              disabled={!canManage}
            />
          </div>

          <fieldset className="rounded border border-gray-200 p-4">
            <legend className="px-1 text-sm font-semibold text-gray-700">
              Actividades vulnerables *
            </legend>
            <p className="mb-3 text-sm text-gray-500">
              Selecciona una o más actividades aplicables a la empresa.
            </p>

            {catalogLoading && (
              <p className="text-sm text-gray-600" role="status">
                Cargando actividades vulnerables…
              </p>
            )}
            {catalogError && (
              <p className="text-sm text-red-700" role="alert">
                {catalogError}
              </p>
            )}
            {!catalogLoading && !catalogError && actividades.length === 0 && (
              <p className="text-sm text-amber-700" role="alert">
                El catálogo de actividades vulnerables está vacío.
              </p>
            )}
            {!catalogLoading && !catalogError && actividades.length > 0 && (
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
                        disabled={!canManage}
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
            {!canManage && (
              <p className="mt-3 text-sm text-amber-700">
                Tu rol permite consultar la configuración, pero no crear ni asignar actividades.
              </p>
            )}
            {actividadesError && (
              <p className="mt-3 text-sm text-red-700" role="alert">
                {actividadesError}
              </p>
            )}
          </fieldset>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={
                saving
                || !!success
                || !canManage
                || catalogLoading
                || !!catalogError
                || actividades.length === 0
                || actividadesSeleccionadas.length === 0
              }
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              Crear empresa
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
      <EmpresaConfirmationModal
        open={confirmationOpen}
        title="Confirmar alta de empresa"
        busy={saving}
        confirmLabel="Confirmar alta"
        busyLabel="Creando empresa..."
        onCancel={() => setConfirmationOpen(false)}
        onConfirm={() => void confirmCreate()}
      >
        <dl className="space-y-3 text-sm">
          <div><dt className="font-medium">Nombre legal</dt><dd>{form.nombre_legal.trim()}</dd></div>
          <div><dt className="font-medium">RFC</dt><dd>{form.rfc.trim().toUpperCase() || 'Sin RFC'}</dd></div>
          <div><dt className="font-medium">Tipo de entidad</dt><dd>{form.tipo_entidad === 'persona_moral' ? 'Persona moral' : 'Persona física'}</dd></div>
          <div><dt className="font-medium">Domicilio completo</dt><dd>{buildDomicilioCompleto(form)}</dd></div>
          <div>
            <dt className="font-medium">Actividades vulnerables</dt>
            <dd>{selectedActivityNames.join(', ')}</dd>
          </div>
        </dl>
      </EmpresaConfirmationModal>
    </div>
  );
}
