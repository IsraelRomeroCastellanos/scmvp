// frontend/src/app/cliente/registrar-cliente/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadCatalogo, type CatalogItem } from '@/lib/catalogos';

type TipoCliente = 'persona_fisica' | 'persona_moral' | 'fideicomiso';

type EmpresaItem = {
  id: number;
  nombre_legal: string;
  rfc: string | null;
};

type Errors = Record<string, string>;

function isYYYYMMDD(v: string) {
  // AAAAMMDD
  if (!/^\d{8}$/.test(v)) return false;
  const y = Number(v.slice(0, 4));
  const m = Number(v.slice(4, 6));
  const d = Number(v.slice(6, 8));
  if (y < 1900 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  // Validación simple de día por mes (sin años bisiestos finos, suficiente para iteración 1)
  const maxDay = [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  return d <= maxDay;
}

function isRFC(v: string) {
  // Acepta PF (13) o PM (12). Uppercase. Estructura general.
  const s = (v || '').trim().toUpperCase();
  return /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(s);
}

function isCURP(v: string) {
  const s = (v || '').trim().toUpperCase();
  return /^[A-Z][AEIOUX][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM][A-Z]{5}[A-Z0-9]\d$/.test(s);
}

function isTelefono(v: string) {
  // permite +, espacios, guiones; valida que queden 7–15 dígitos
  const digits = (v || '').replace(/[^\d]/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function firstErrorKey(errors: Errors) {
  const keys = Object.keys(errors);
  return keys.length ? keys[0] : null;
}

/**
 * Dropdown buscable (1 paso, sin check).
 * - items: [{clave, descripcion}]
 * - value: guarda la clave (ej: "MEXICO,MX" o "CANADA,CA")
 */
function SearchableDropdown(props: {
  label: string;
  required?: boolean;
  items: CatalogItem[];
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  error?: string;
  name?: string;
}) {
  const { label, required, items, value, placeholder, onChange, error, name } = props;

  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const selectedLabel = useMemo(() => {
    const hit = items.find((x) => x.clave === value);
    return hit ? hit.descripcion : '';
  }, [items, value]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items.slice(0, 60);
    const res = items.filter((x) => {
      const a = `${x.clave} ${x.descripcion}`.toLowerCase();
      return a.includes(query);
    });
    return res.slice(0, 60);
  }, [items, q]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = wrapRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div className="space-y-1" ref={wrapRef}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium">
          {label} {required ? <span className="text-red-600">*</span> : null}
        </label>
      </div>

      <button
        type="button"
        className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {selectedLabel ? (
          <span>{selectedLabel}</span>
        ) : (
          <span className="text-gray-400">{placeholder ?? 'Selecciona...'}</span>
        )}
      </button>

      {open ? (
        <div className="mt-2 rounded-md border border-gray-200 bg-white p-2 shadow">
          <input
            name={name ? `${name}__search` : undefined}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            placeholder="Escribe para buscar..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          <div className="mt-2 max-h-64 overflow-auto rounded-md border border-gray-100">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">Sin resultados</div>
            ) : (
              filtered.map((it) => (
                <button
                  key={it.clave}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  onClick={() => {
                    onChange(it.clave);
                    setOpen(false);
                    setQ('');
                  }}
                >
                  <div className="font-medium">{it.descripcion}</div>
                  <div className="text-xs text-gray-500">{it.clave}</div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}

      {error ? <div className="text-xs text-red-600">{error}</div> : null}
    </div>
  );
}

export default function RegistrarClientePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  // catálogos
  const [paises, setPaises] = useState<CatalogItem[]>([]);
  const [actividades, setActividades] = useState<CatalogItem[]>([]);
  const [giros, setGiros] = useState<CatalogItem[]>([]);

  // empresas (para admin)
  const [empresas, setEmpresas] = useState<EmpresaItem[]>([]);
  const [empresasLoading, setEmpresasLoading] = useState(false);

  // forma
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>('persona_fisica');

  const [empresaId, setEmpresaId] = useState<string>(''); // string para input; validaremos numeric
  const [nombreEntidad, setNombreEntidad] = useState<string>('');

  // “nacionalidad” (catálogo país)
  const [nacionalidad, setNacionalidad] = useState<string>('');

  // contacto
  const [contactoPais, setContactoPais] = useState<string>('');
  const [telefono, setTelefono] = useState<string>('');

  // PF
  const [pfNombres, setPfNombres] = useState('');
  const [pfApPaterno, setPfApPaterno] = useState('');
  const [pfApMaterno, setPfApMaterno] = useState('');
  const [pfActividad, setPfActividad] = useState<string>(''); // clave catálogo

  // PM
  const [pmRfc, setPmRfc] = useState('');
  const [pmFechaConst, setPmFechaConst] = useState(''); // YYYY-MM-DD (no bloqueante estricto aquí)
  const [pmGiro, setPmGiro] = useState<string>(''); // clave catálogo
  const [pmRepNombres, setPmRepNombres] = useState('');
  const [pmRepApPaterno, setPmRepApPaterno] = useState('');
  const [pmRepApMaterno, setPmRepApMaterno] = useState('');
  const [pmRepRfc, setPmRepRfc] = useState('');
  const [pmRepCurp, setPmRepCurp] = useState('');

  // Fideicomiso (mínimos)
  const [fidDenominacion, setFidDenominacion] = useState('');
  const [fidRfcFiduciario, setFidRfcFiduciario] = useState('');
  const [fidIdentificador, setFidIdentificador] = useState('');

  const [fidRepNombres, setFidRepNombres] = useState(''); // requerido
  const [fidRepApPaterno, setFidRepApPaterno] = useState(''); // requerido
  const [fidRepApMaterno, setFidRepApMaterno] = useState(''); // requerido
  const [fidRepFechaNac, setFidRepFechaNac] = useState(''); // AAAAMMDD requerido
  const [fidRepRfc, setFidRepRfc] = useState(''); // requerido
  const [fidRepCurp, setFidRepCurp] = useState(''); // requerido

  const [errors, setErrors] = useState<Errors>({});

  function getToken() {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('token') ?? '';
  }

  async function apiFetch(path: string, init?: RequestInit) {
    const token = getToken();
    const headers: Record<string, string> = {
      ...(init?.headers as any),
      'Content-Type': 'application/json'
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(path, { ...init, headers });
    return res;
  }

  // carga catálogos y empresas
  useEffect(() => {
    (async () => {
      try {
        const [p, a, g] = await Promise.all([
          loadCatalogo('sat/c_pais'),
          loadCatalogo('sat/c_actividad_economica'),
          loadCatalogo('internos/giro_mercantil')
        ]);
        setPaises(p);
        setActividades(a);
        setGiros(g);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setEmpresasLoading(true);
      try {
        const res = await apiFetch('/api/admin/empresas', { method: 'GET' });
        if (!res.ok) {
          // no bloqueamos: admin puede meter empresa_id manual
          setEmpresas([]);
          return;
        }
        const data = await res.json().catch(() => null);
        const arr = Array.isArray(data?.empresas) ? data.empresas : [];
        setEmpresas(
          arr.map((x: any) => ({
            id: Number(x.id),
            nombre_legal: String(x.nombre_legal ?? ''),
            rfc: x.rfc ? String(x.rfc) : null
          }))
        );
      } catch (e) {
        console.error(e);
        setEmpresas([]);
      } finally {
        setEmpresasLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Validaciones =====

  function setFieldError(field: string, msg: string) {
    setErrors((prev) => {
      const next = { ...prev };
      if (msg) next[field] = msg;
      else delete next[field];
      return next;
    });
  }

  function validateCommon(): Errors {
    const e: Errors = {};

    const emp = Number(empresaId);
    if (!empresaId.trim() || Number.isNaN(emp) || emp <= 0) e.empresa_id = 'empresa_id es obligatorio y debe ser numérico';

    if (!nombreEntidad.trim()) e.nombre_entidad = 'Nombre / Razón social es obligatorio';

    if (!nacionalidad) e.nacionalidad = 'Nacionalidad es obligatoria';
    if (!contactoPais) e.contacto_pais = 'País (contacto) es obligatorio';

    if (!telefono.trim()) e.telefono = 'Teléfono es obligatorio';
    else if (!isTelefono(telefono)) e.telefono = 'Teléfono inválido (7–15 dígitos)';

    return e;
  }

  function validatePF(): Errors {
    const e: Errors = {};
    if (!pfNombres.trim()) e.pf_nombres = 'Nombre(s) es obligatorio';
    if (!pfApPaterno.trim()) e.pf_ap_paterno = 'Apellido paterno es obligatorio';
    // Ap materno no lo hago obligatorio por ahora
    if (!pfActividad) e.pf_actividad = 'Actividad económica es obligatoria';
    return e;
  }

  function validatePM(): Errors {
    const e: Errors = {};
    if (!pmRfc.trim()) e.pm_rfc = 'RFC de la empresa es obligatorio';
    else if (!isRFC(pmRfc)) e.pm_rfc = 'RFC inválido';

    if (!pmGiro) e.pm_giro = 'Giro mercantil es obligatorio';

    if (!pmRepNombres.trim()) e.pm_rep_nombres = 'Nombre(s) representante es obligatorio';
    if (!pmRepApPaterno.trim()) e.pm_rep_ap_paterno = 'Apellido paterno representante es obligatorio';
    if (!pmRepApMaterno.trim()) e.pm_rep_ap_materno = 'Apellido materno representante es obligatorio';

    if (!pmRepRfc.trim()) e.pm_rep_rfc = 'RFC representante es obligatorio';
    else if (!isRFC(pmRepRfc)) e.pm_rep_rfc = 'RFC representante inválido';

    // CURP representante (si lo captura)
    if (pmRepCurp.trim() && !isCURP(pmRepCurp)) e.pm_rep_curp = 'CURP representante inválida';

    // Fecha constitución (si la captura) valida formato simple YYYY-MM-DD
    if (pmFechaConst.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(pmFechaConst.trim())) {
      e.pm_fecha_const = 'Fecha constitución inválida (YYYY-MM-DD)';
    }

    return e;
  }

  function validateFideicomiso(): Errors {
    const e: Errors = {};

    if (!fidDenominacion.trim()) e.fid_denominacion = 'Denominación / Razón social del fiduciario es obligatoria';

    if (!fidRfcFiduciario.trim()) e.fid_rfc_fiduciario = 'RFC del fiduciario es obligatorio';
    else if (!isRFC(fidRfcFiduciario)) e.fid_rfc_fiduciario = 'RFC del fiduciario inválido';

    if (!fidIdentificador.trim()) e.fid_identificador = 'Identificador del fideicomiso es obligatorio';

    // Representante (obligatorio según tu lista)
    if (!fidRepNombres.trim()) e.fid_rep_nombres = 'Nombre(s) del representante es obligatorio';
    if (!fidRepApPaterno.trim()) e.fid_rep_ap_paterno = 'Apellido paterno del representante es obligatorio';
    if (!fidRepApMaterno.trim()) e.fid_rep_ap_materno = 'Apellido materno del representante es obligatorio';

    if (!fidRepFechaNac.trim()) e.fid_rep_fecha_nac = 'Fecha de nacimiento es obligatoria';
    else if (!isYYYYMMDD(fidRepFechaNac)) e.fid_rep_fecha_nac = 'Fecha inválida (AAAAMMDD)';

    if (!fidRepRfc.trim()) e.fid_rep_rfc = 'RFC del representante es obligatorio';
    else if (!isRFC(fidRepRfc)) e.fid_rep_rfc = 'RFC del representante inválido';

    if (!fidRepCurp.trim()) e.fid_rep_curp = 'CURP del representante es obligatoria';
    else if (!isCURP(fidRepCurp)) e.fid_rep_curp = 'CURP inválida';

    return e;
  }

  function validateAll(): Errors {
    const base = validateCommon();
    const perTipo =
      tipoCliente === 'persona_fisica'
        ? validatePF()
        : tipoCliente === 'persona_moral'
        ? validatePM()
        : validateFideicomiso();

    return { ...base, ...perTipo };
  }

  function validateField(field: string): string {
    // Validación puntual (para onBlur)
    // Nota: esto es intencionalmente simple: reusa validateAll y toma el campo
    const all = validateAll();
    return all[field] ?? '';
  }

  async function onSubmit() {
    const all = validateAll();
    setErrors(all);

    const firstKey = firstErrorKey(all);
    if (firstKey) {
      // intenta enfocar el primer error si existe un input con ese name
      const el = document.querySelector(`[name="${firstKey}"]`) as HTMLElement | null;
      if (el?.focus) el.focus();
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        empresa_id: Number(empresaId),
        tipo_cliente: tipoCliente,
        nombre_entidad: nombreEntidad.trim(),
        nacionalidad: nacionalidad || null,
        datos_completos: {
          contacto: {
            pais: contactoPais || null,
            telefono: telefono.trim()
          }
        }
      };

      if (tipoCliente === 'persona_fisica') {
        const actividad = actividades.find((x) => x.clave === pfActividad);
        payload.datos_completos.persona = {
          tipo: 'persona_fisica',
          nombres: pfNombres.trim(),
          apellido_paterno: pfApPaterno.trim(),
          apellido_materno: pfApMaterno.trim() || undefined,
          actividad_economica: actividad
            ? { clave: actividad.clave, descripcion: actividad.descripcion }
            : undefined
        };
      }

      if (tipoCliente === 'persona_moral') {
        const giro = giros.find((x) => x.clave === pmGiro);
        payload.datos_completos.empresa = {
          tipo: 'persona_moral',
          rfc: pmRfc.trim().toUpperCase(),
          giro: giro ? giro.descripcion : pmGiro,
          fecha_constitucion: pmFechaConst.trim() || undefined
        };
        payload.datos_completos.representante = {
          nombres: pmRepNombres.trim(),
          apellido_paterno: pmRepApPaterno.trim(),
          apellido_materno: pmRepApMaterno.trim(),
          rfc: pmRepRfc.trim().toUpperCase(),
          curp: pmRepCurp.trim().toUpperCase() || undefined
        };
      }

      if (tipoCliente === 'fideicomiso') {
        payload.datos_completos.fideicomiso = {
          denominacion_fiduciario: fidDenominacion.trim(),
          rfc_fiduciario: fidRfcFiduciario.trim().toUpperCase(),
          identificador: fidIdentificador.trim()
        };
        payload.datos_completos.representante = {
          nombres: fidRepNombres.trim(),
          apellido_paterno: fidRepApPaterno.trim(),
          apellido_materno: fidRepApMaterno.trim(),
          fecha_nacimiento: fidRepFechaNac.trim(),
          rfc: fidRepRfc.trim().toUpperCase(),
          curp: fidRepCurp.trim().toUpperCase()
        };
      }

      const res = await apiFetch('/api/cliente/registrar-cliente', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.error ? String(data.error) : 'Error al registrar cliente';
        alert(msg);
        return;
      }

      // esperado: { ok:true, cliente:{ id: ... } }
      const id = data?.cliente?.id;
      if (id) router.push(`/cliente/clientes/${id}`);
      else {
        // fallback
        alert('Cliente creado, pero no se recibió ID. Revisa respuesta del backend.');
      }
    } catch (e) {
      console.error(e);
      alert('Error inesperado al registrar cliente');
    } finally {
      setLoading(false);
    }
  }

  // ===== UI helpers =====

  const paisesItems = paises;
  const actividadesItems = actividades;
  const girosItems = giros;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Registrar cliente</h1>
      <p className="mt-1 text-sm text-gray-600">
        Validaciones bloqueantes: se validan al salir del campo (onBlur) y al enviar.
      </p>

      <div className="mt-6 space-y-6">
        {/* Datos generales */}
        <div className="rounded-lg border p-4">
          <h2 className="text-lg font-medium">Datos generales</h2>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Tipo de cliente <span className="text-red-600">*</span>
              </label>
              <select
                name="tipo_cliente"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={tipoCliente}
                onChange={(e) => {
                  setTipoCliente(e.target.value as TipoCliente);
                  // limpia errores del tipo anterior para no confundir
                  setErrors((prev) => {
                    const next = { ...prev };
                    Object.keys(next).forEach((k) => {
                      if (k.startsWith('pf_') || k.startsWith('pm_') || k.startsWith('fid_')) delete next[k];
                    });
                    return next;
                  });
                }}
              >
                <option value="persona_fisica">Persona física</option>
                <option value="persona_moral">Persona moral</option>
                <option value="fideicomiso">Fideicomiso</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Empresa (empresa_id) <span className="text-red-600">*</span>
              </label>

              {empresasLoading ? (
                <div className="text-sm text-gray-500">Cargando empresas...</div>
              ) : empresas.length > 0 ? (
                <select
                  name="empresa_id"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    errors.empresa_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={empresaId}
                  onChange={(e) => setEmpresaId(e.target.value)}
                  onBlur={() => setFieldError('empresa_id', validateField('empresa_id'))}
                >
                  <option value="">Selecciona empresa...</option>
                  {empresas.map((x) => (
                    <option key={x.id} value={String(x.id)}>
                      {x.nombre_legal} (ID {x.id})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name="empresa_id"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    errors.empresa_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ej: 38"
                  value={empresaId}
                  onChange={(e) => setEmpresaId(e.target.value)}
                  onBlur={() => setFieldError('empresa_id', validateField('empresa_id'))}
                />
              )}
              {errors.empresa_id ? <div className="text-xs text-red-600">{errors.empresa_id}</div> : null}
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">
                Nombre / Razón social <span className="text-red-600">*</span>
              </label>
              <input
                name="nombre_entidad"
                className={`w-full rounded-md border px-3 py-2 text-sm ${
                  errors.nombre_entidad ? 'border-red-500' : 'border-gray-300'
                }`}
                value={nombreEntidad}
                onChange={(e) => setNombreEntidad(e.target.value)}
                onBlur={() => setFieldError('nombre_entidad', validateField('nombre_entidad'))}
              />
              {errors.nombre_entidad ? <div className="text-xs text-red-600">{errors.nombre_entidad}</div> : null}
            </div>

            <SearchableDropdown
              label="Nacionalidad"
              required
              items={paisesItems}
              value={nacionalidad}
              placeholder="Buscar país..."
              onChange={(v) => {
                setNacionalidad(v);
                setFieldError('nacionalidad', '');
              }}
              error={errors.nacionalidad}
              name="nacionalidad"
            />
          </div>
        </div>

        {/* Contacto */}
        <div className="rounded-lg border p-4">
          <h2 className="text-lg font-medium">Contacto</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <SearchableDropdown
              label="País (contacto)"
              required
              items={paisesItems}
              value={contactoPais}
              placeholder="Buscar país..."
              onChange={(v) => {
                setContactoPais(v);
                setFieldError('contacto_pais', '');
              }}
              error={errors.contacto_pais}
              name="contacto_pais"
            />

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Teléfono <span className="text-red-600">*</span>
              </label>
              <input
                name="telefono"
                className={`w-full rounded-md border px-3 py-2 text-sm ${
                  errors.telefono ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ej: 5512345678"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                onBlur={() => setFieldError('telefono', validateField('telefono'))}
              />
              {errors.telefono ? <div className="text-xs text-red-600">{errors.telefono}</div> : null}
            </div>
          </div>
        </div>

        {/* Sección por tipo */}
        {tipoCliente === 'persona_fisica' ? (
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-medium">Persona física</h2>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Nombre(s) <span className="text-red-600">*</span>
                </label>
                <input
                  name="pf_nombres"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    errors.pf_nombres ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={pfNombres}
                  onChange={(e) => setPfNombres(e.target.value)}
                  onBlur={() => setFieldError('pf_nombres', validateField('pf_nombres'))}
                />
                {errors.pf_nombres ? <div className="text-xs text-red-600">{errors.pf_nombres}</div> : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Apellido paterno <span className="text-red-600">*</span>
                </label>
                <input
                  name="pf_ap_paterno"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    errors.pf_ap_paterno ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={pfApPaterno}
                  onChange={(e) => setPfApPaterno(e.target.value)}
                  onBlur={() => setFieldError('pf_ap_paterno', validateField('pf_ap_paterno'))}
                />
                {errors.pf_ap_paterno ? <div className="text-xs text-red-600">{errors.pf_ap_paterno}</div> : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Apellido materno</label>
                <input
                  name="pf_ap_materno"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={pfApMaterno}
                  onChange={(e) => setPfApMaterno(e.target.value)}
                />
              </div>

              <SearchableDropdown
                label="Actividad económica"
                required
                items={actividadesItems}
                value={pfActividad}
                placeholder="Buscar actividad..."
                onChange={(v) => {
                  setPfActividad(v);
                  setFieldError('pf_actividad', '');
                }}
                error={errors.pf_actividad}
                name="pf_actividad"
              />
            </div>
          </div>
        ) : null}

        {tipoCliente === 'persona_moral' ? (
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-medium">Persona moral</h2>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  RFC de la empresa <span className="text-red-600">*</span>
                </label>
                <input
                  name="pm_rfc"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    errors.pm_rfc ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ej: XAXX010101000"
                  value={pmRfc}
                  onChange={(e) => setPmRfc(e.target.value)}
                  onBlur={() => setFieldError('pm_rfc', validateField('pm_rfc'))}
                />
                {errors.pm_rfc ? <div className="text-xs text-red-600">{errors.pm_rfc}</div> : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Fecha de constitución (YYYY-MM-DD)</label>
                <input
                  name="pm_fecha_const"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    errors.pm_fecha_const ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ej: 2020-02-03"
                  value={pmFechaConst}
                  onChange={(e) => setPmFechaConst(e.target.value)}
                  onBlur={() => setFieldError('pm_fecha_const', validateField('pm_fecha_const'))}
                />
                {errors.pm_fecha_const ? <div className="text-xs text-red-600">{errors.pm_fecha_const}</div> : null}
              </div>

              <SearchableDropdown
                label="Giro mercantil"
                required
                items={girosItems}
                value={pmGiro}
                placeholder="Buscar giro..."
                onChange={(v) => {
                  setPmGiro(v);
                  setFieldError('pm_giro', '');
                }}
                error={errors.pm_giro}
                name="pm_giro"
              />

              <div className="md:col-span-2 mt-2">
                <h3 className="text-sm font-semibold text-gray-700">Representante</h3>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Nombre(s) <span className="text-red-600">*</span>
                </label>
                <input
                  name="pm_rep_nombres"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    errors.pm_rep_nombres ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={pmRepNombres}
                  onChange={(e) => setPmRepNombres(e.target.value)}
                  onBlur={() => setFieldError('pm_rep_nombres', validateField('pm_rep_nombres'))}
                />
                {errors.pm_rep_nombres ? <div className="text-xs text-red-600">{errors.pm_rep_nombres}</div> : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Apellido paterno <span className="text-red-600">*</span>
                </label>
                <input
                  name="pm_rep_ap_paterno"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    errors.pm_rep_ap_paterno ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={pmRepApPaterno}
                  onChange={(e) => setPmRepApPaterno(e.target.value)}
                  onBlur={() => setFieldError('pm_rep_ap_paterno', validateField('pm_rep_ap_paterno'))}
                />
                {errors.pm_rep_ap_paterno ? (
                  <div className="text-xs text-red-600">{errors.pm_rep_ap_paterno}</div>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Apellido materno <span className="text-red-600">*</span>
                </label>
                <input
                  name="pm_rep_ap_materno"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    errors.pm_rep_ap_materno ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={pmRepApMaterno}
                  onChange={(e) => setPmRepApMaterno(e.target.value)}
                  onBlur={() => setFieldError('pm_rep_ap_materno', validateField('pm_rep_ap_materno'))}
                />
                {errors.pm_rep_ap_materno ? (
                  <div className="text-xs text-red-600">{errors.pm_rep_ap_materno}</div>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  RFC <span className="text-red-600">*</span>
                </label>
                <input
                  name="pm_rep_rfc"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    errors.pm_rep_rfc ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ej: XAXX010101000"
                  value={pmRepRfc}
                  onChange={(e) => setPmRepRfc(e.target.value)}
                  onBlur={() => setFieldError('pm_rep_rfc', validateField('pm_rep_rfc'))}
                />
                {errors.pm_rep_rfc ? <div className="text-xs text-red-600">{errors.pm_rep_rfc}</div> : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">CURP</label>
                <input
                  name="pm_rep_curp"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    errors.pm_rep_curp ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ej: PEPJ900101HDFRRN09"
                  value={pmRepCurp}
                  onChange={(e) => setPmRepCurp(e.target.value)}
                  onBlur={() => setFieldError('pm_rep_curp', validateField('pm_rep_curp'))}
                />
                {errors.pm_rep_curp ? <div className="text-xs text-red-600">{errors.pm_rep_curp}</div> : null}
              </div>
            </div>
          </div>
        ) : null}

        {tipoCliente === 'fideicomiso' ? (
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-medium">Fideicomiso</h2>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium">
                  Denominación / Razón social del fiduciario <span className="text-red-600">*</span>
                </label>
                <input
                  name="fid_denominacion"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    errors.fid_denominacion ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={fidDenominacion}
                  onChange={(e) => setFidDenominacion(e.target.value)}
                  onBlur={() => setFieldError('fid_denominacion', validateField('fid_denominacion'))}
                />
                {errors.fid_denominacion ? (
                  <div className="text-xs text-red-600">{errors.fid_denominacion}</div>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  RFC del fiduciario <span className="text-red-600">*</span>
                </label>
                <input
                  name="fid_rfc_fiduciario"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    errors.fid_rfc_fiduciario ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ej: XAXX010101000"
                  value={fidRfcFiduciario}
                  onChange={(e) => setFidRfcFiduciario(e.target.value)}
                  onBlur={() => setFieldError('fid_rfc_fiduciario', validateField('fid_rfc_fiduciario'))}
                />
                {errors.fid_rfc_fiduciario ? (
                  <div className="text-xs text-red-600">{errors.fid_rfc_fiduciario}</div>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Identificador del fideicomiso <span className="text-red-600">*</span>
                </label>
                <input
                  name="fid_identificador"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    errors.fid_identificador ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ej: FID-0001"
                  value={fidIdentificador}
                  onChange={(e) => setFidIdentificador(e.target.value)}
                  onBlur={() => setFieldError('fid_identificador', validateField('fid_identificador'))}
                />
                {errors.fid_identificador ? (
                  <div className="text-xs text-red-600">{errors.fid_identificador}</div>
                ) : null}
              </div>

              <div className="md:col-span-2 mt-2">
                <h3 className="text-sm font-semibold text-gray-700">Representante / apoderado</h3>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Nombre(s) <span className="text-red-600">*</span>
                </label>
                <input
                  name="fid_rep_nombres"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    errors.fid_rep_nombres ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={fidRepNombres}
                  onChange={(e) => setFidRepNombres(e.target.value)}
                  onBlur={() => setFieldError('fid_rep_nombres', validateField('fid_rep_nombres'))}
                />
                {errors.fid_rep_nombres ? <div className="text-xs text-red-600">{errors.fid_rep_nombres}</div> : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Apellido paterno <span className="text-red-600">*</span>
                </label>
                <input
                  name="fid_rep_ap_paterno"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    errors.fid_rep_ap_paterno ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={fidRepApPaterno}
                  onChange={(e) => setFidRepApPaterno(e.target.value)}
                  onBlur={() => setFieldError('fid_rep_ap_paterno', validateField('fid_rep_ap_paterno'))}
                />
                {errors.fid_rep_ap_paterno ? (
                  <div className="text-xs text-red-600">{errors.fid_rep_ap_paterno}</div>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Apellido materno <span className="text-red-600">*</span>
                </label>
                <input
                  name="fid_rep_ap_materno"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    errors.fid_rep_ap_materno ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={fidRepApMaterno}
                  onChange={(e) => setFidRepApMaterno(e.target.value)}
                  onBlur={() => setFieldError('fid_rep_ap_materno', validateField('fid_rep_ap_materno'))}
                />
                {errors.fid_rep_ap_materno ? (
                  <div className="text-xs text-red-600">{errors.fid_rep_ap_materno}</div>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Fecha de nacimiento (AAAAMMDD) <span className="text-red-600">*</span>
                </label>
                <input
                  name="fid_rep_fecha_nac"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    errors.fid_rep_fecha_nac ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ej: 19900101"
                  value={fidRepFechaNac}
                  onChange={(e) => setFidRepFechaNac(e.target.value)}
                  onBlur={() => setFieldError('fid_rep_fecha_nac', validateField('fid_rep_fecha_nac'))}
                />
                {errors.fid_rep_fecha_nac ? (
                  <div className="text-xs text-red-600">{errors.fid_rep_fecha_nac}</div>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  RFC (XAXX010101000) <span className="text-red-600">*</span>
                </label>
                <input
                  name="fid_rep_rfc"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    errors.fid_rep_rfc ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ej: XAXX010101000"
                  value={fidRepRfc}
                  onChange={(e) => setFidRepRfc(e.target.value)}
                  onBlur={() => setFieldError('fid_rep_rfc', validateField('fid_rep_rfc'))}
                />
                {errors.fid_rep_rfc ? <div className="text-xs text-red-600">{errors.fid_rep_rfc}</div> : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  CURP <span className="text-red-600">*</span>
                </label>
                <input
                  name="fid_rep_curp"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    errors.fid_rep_curp ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ej: PEPJ900101HDFRRN09"
                  value={fidRepCurp}
                  onChange={(e) => setFidRepCurp(e.target.value)}
                  onBlur={() => setFieldError('fid_rep_curp', validateField('fid_rep_curp'))}
                />
                {errors.fid_rep_curp ? <div className="text-xs text-red-600">{errors.fid_rep_curp}</div> : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm"
            onClick={() => router.push('/cliente/clientes')}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
