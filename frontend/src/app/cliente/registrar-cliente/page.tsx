// frontend/src/app/cliente/registrar-cliente/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadCatalogo, type CatalogItem } from '@/lib/catalogos';

type TipoCliente = 'persona_fisica' | 'persona_moral' | 'fideicomiso';

type Errors = Record<string, string>;
type Touched = Record<string, boolean>;

function onlyDigits(s: string) {
  return (s ?? '').replace(/\D+/g, '');
}

function normalizeUpper(s: string) {
  return (s ?? '').trim().toUpperCase();
}

function isYYYYMMDD(s: string) {
  return /^\d{8}$/.test(s ?? '');
}

function isRFC(s: string) {
  const v = normalizeUpper(s);
  return /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(v);
}

function isCURP(s: string) {
  const v = normalizeUpper(s);
  return /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(v);
}

function errText(msg?: string) {
  if (!msg) return null;
  return <p className="text-sm text-red-600 mt-1">{msg}</p>;
}

function classInput(hasErr: boolean) {
  return `w-full rounded-md border px-3 py-2 text-sm outline-none ${
    hasErr ? 'border-red-500' : 'border-gray-300'
  }`;
}

/**
 * Dropdown con búsqueda integrada (1 paso).
 * - Para "onBlur" práctico: llamamos onTouch() cuando:
 *   a) se selecciona un item
 *   b) se cierra el panel al hacer click fuera
 */
function SearchableSelect(props: {
  label: string;
  required?: boolean;
  placeholder?: string;
  items: CatalogItem[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
  onTouch?: () => void;
}) {
  const { label, required, placeholder, items, value, onChange, error, onTouch } = props;

  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const selected = useMemo(() => {
    if (!value) return null;
    return items.find((x) => x.clave === value) ?? null;
  }, [items, value]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items.slice(0, 200);
    return items
      .filter((x) => {
        const a = (x.clave ?? '').toLowerCase();
        const b = (x.descripcion ?? '').toLowerCase();
        return a.includes(t) || b.includes(t);
      })
      .slice(0, 200);
  }, [items, q]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = wrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) {
        if (open) onTouch?.(); // se intentó interactuar y se cerró
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, onTouch]);

  return (
    <div className="space-y-1" ref={wrapRef}>
      <label className="text-sm font-medium">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </label>

      <button
        type="button"
        className={`${classInput(!!error)} flex items-center justify-between`}
        onClick={() => setOpen((s) => !s)}
      >
        <span className="text-left">
          {selected ? `${selected.descripcion} (${selected.clave})` : placeholder ?? 'Selecciona...'}
        </span>
        <span className="ml-3 text-gray-500">▾</span>
      </button>

      {open ? (
        <div className="rounded-md border border-gray-200 bg-white shadow-sm">
          <div className="p-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none"
              placeholder="Buscar..."
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-auto border-t border-gray-100">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">Sin resultados</div>
            ) : (
              filtered.map((it) => (
                <button
                  key={it.clave}
                  type="button"
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    it.clave === value ? 'bg-gray-50' : ''
                  }`}
                  onClick={() => {
                    onChange(it.clave);
                    onTouch?.();
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

      {errText(error)}
    </div>
  );
}

export default function Page() {
  const router = useRouter();

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://scmvp.onrender.com';

  const [loading, setLoading] = useState(false);
  const [fatal, setFatal] = useState<string>('');
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Touched>({});

  // Catálogos
  const [paises, setPaises] = useState<CatalogItem[]>([]);
  const [actividades, setActividades] = useState<CatalogItem[]>([]);
  const [giros, setGiros] = useState<CatalogItem[]>([]);

  // Form
  const [empresaId, setEmpresaId] = useState<string>('');
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>('persona_fisica');

  const [nombreEntidad, setNombreEntidad] = useState('');
  const [nacionalidad, setNacionalidad] = useState('');

  const [contactoPais, setContactoPais] = useState('');
  const [telefono, setTelefono] = useState('');

  // PF
  const [pfNombres, setPfNombres] = useState('');
  const [pfAP, setPfAP] = useState('');
  const [pfAM, setPfAM] = useState('');
  const [pfFechaNac, setPfFechaNac] = useState('');
  const [pfRFC, setPfRFC] = useState('');
  const [pfCURP, setPfCURP] = useState('');
  const [pfActividad, setPfActividad] = useState('');

  // PM
  const [pmRFC, setPmRFC] = useState('');
  const [pmFechaConst, setPmFechaConst] = useState('');
  const [pmGiro, setPmGiro] = useState('');

  const [repNombre, setRepNombre] = useState('');
  const [repAP, setRepAP] = useState('');
  const [repAM, setRepAM] = useState('');
  const [repFechaNac, setRepFechaNac] = useState('');
  const [repRFC, setRepRFC] = useState('');
  const [repCURP, setRepCURP] = useState('');

  // Fideicomiso
  const [fidDenom, setFidDenom] = useState('');
  const [fidRFC, setFidRFC] = useState('');
  const [fidIdent, setFidIdent] = useState('');

  const token = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('token') || '';
  }, []);

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
      } catch (e: any) {
        setFatal(e?.message || 'No se pudieron cargar catálogos');
      }
    })();
  }, []);

  function touch(key: string) {
    setTouched((t) => (t[key] ? t : { ...t, [key]: true }));
  }

  function showErr(key: string) {
    return touched[key] ? errors[key] : '';
  }

  function computeErrors(): Errors {
    const e: Errors = {};

    // Top-level
    if (!empresaId.trim()) e.empresa_id = 'Empresa es obligatorio';
    else if (isNaN(Number(empresaId))) e.empresa_id = 'Empresa inválida';

    if (!nombreEntidad.trim()) e.nombre_entidad = 'Nombre / Razón social es obligatorio';
    if (!nacionalidad) e.nacionalidad = 'Nacionalidad es obligatorio';

    if (!contactoPais) e['contacto.pais'] = 'País (contacto) es obligatorio';

    const telDigits = onlyDigits(telefono);
    if (!telDigits) e['contacto.telefono'] = 'Teléfono es obligatorio';
    else if (telDigits.length < 8 || telDigits.length > 15)
      e['contacto.telefono'] = 'Teléfono inválido (8–15 dígitos)';

    if (tipoCliente === 'persona_fisica') {
      if (!pfNombres.trim()) e['pf.nombres'] = 'Nombre(s) es obligatorio';
      if (!pfAP.trim()) e['pf.apellido_paterno'] = 'Apellido paterno es obligatorio';
      if (!pfAM.trim()) e['pf.apellido_materno'] = 'Apellido materno es obligatorio';

      if (!pfFechaNac.trim()) e['pf.fecha_nacimiento'] = 'Fecha de nacimiento es obligatorio';
      else if (!isYYYYMMDD(pfFechaNac)) e['pf.fecha_nacimiento'] = 'Fecha inválida (AAAAMMDD)';

      if (!pfRFC.trim()) e['pf.rfc'] = 'RFC es obligatorio';
      else if (!isRFC(pfRFC)) e['pf.rfc'] = 'RFC inválido (formato RFC)';

      if (!pfCURP.trim()) e['pf.curp'] = 'CURP es obligatorio';
      else if (!isCURP(pfCURP)) e['pf.curp'] = 'CURP inválida (formato CURP)';

      if (!pfActividad) e['pf.actividad'] = 'Actividad económica es obligatorio';
    }

    if (tipoCliente === 'persona_moral') {
      if (!pmRFC.trim()) e['pm.rfc'] = 'RFC (empresa) es obligatorio';
      else if (!isRFC(pmRFC)) e['pm.rfc'] = 'RFC (empresa) inválido';

      if (!pmFechaConst.trim()) e['pm.fecha_constitucion'] = 'Fecha constitución es obligatorio';
      else if (!isYYYYMMDD(pmFechaConst)) e['pm.fecha_constitucion'] = 'Fecha inválida (AAAAMMDD)';

      if (!pmGiro) e['pm.giro'] = 'Giro mercantil es obligatorio';

      if (!repNombre.trim()) e['rep.nombres'] = 'Nombre(s) representante es obligatorio';
      if (!repAP.trim()) e['rep.apellido_paterno'] = 'Apellido paterno representante es obligatorio';
      if (!repAM.trim()) e['rep.apellido_materno'] = 'Apellido materno representante es obligatorio';

      if (!repFechaNac.trim()) e['rep.fecha_nacimiento'] = 'Fecha nacimiento representante es obligatorio';
      else if (!isYYYYMMDD(repFechaNac)) e['rep.fecha_nacimiento'] = 'Fecha inválida (AAAAMMDD)';

      if (!repRFC.trim()) e['rep.rfc'] = 'RFC representante es obligatorio';
      else if (!isRFC(repRFC)) e['rep.rfc'] = 'RFC representante inválido';

      if (!repCURP.trim()) e['rep.curp'] = 'CURP representante es obligatorio';
      else if (!isCURP(repCURP)) e['rep.curp'] = 'CURP representante inválida';
    }

    if (tipoCliente === 'fideicomiso') {
      if (!fidDenom.trim()) e['fid.denom'] = 'Denominación del fiduciario es obligatorio';

      if (!fidRFC.trim()) e['fid.rfc'] = 'RFC del fiduciario es obligatorio';
      else if (!isRFC(fidRFC)) e['fid.rfc'] = 'RFC del fiduciario inválido';

      if (!fidIdent.trim()) e['fid.ident'] = 'Identificador del fideicomiso es obligatorio';

      if (!repNombre.trim()) e['rep.nombres'] = 'Nombre(s) representante es obligatorio';
      if (!repAP.trim()) e['rep.apellido_paterno'] = 'Apellido paterno representante es obligatorio';
      if (!repAM.trim()) e['rep.apellido_materno'] = 'Apellido materno representante es obligatorio';

      if (!repFechaNac.trim()) e['rep.fecha_nacimiento'] = 'Fecha nacimiento representante es obligatorio';
      else if (!isYYYYMMDD(repFechaNac)) e['rep.fecha_nacimiento'] = 'Fecha inválida (AAAAMMDD)';

      if (!repRFC.trim()) e['rep.rfc'] = 'RFC representante es obligatorio';
      else if (!isRFC(repRFC)) e['rep.rfc'] = 'RFC representante inválido';

      if (!repCURP.trim()) e['rep.curp'] = 'CURP representante es obligatorio';
      else if (!isCURP(repCURP)) e['rep.curp'] = 'CURP representante inválida';
    }

    return e;
  }

  function recomputeAndSetErrors() {
    const e = computeErrors();
    setErrors(e);
    return e;
  }

  function validateField(key: string) {
    // recalculamos todo por simplicidad/consistencia y extraemos el campo
    const e = computeErrors();
    setErrors((prev) => ({ ...prev, [key]: e[key] || '' }));
  }

  function touchAndValidate(key: string) {
    touch(key);
    validateField(key);
  }

  function touchAllVisible() {
    const keys: string[] = [
      'empresa_id',
      'nombre_entidad',
      'nacionalidad',
      'contacto.pais',
      'contacto.telefono'
    ];

    if (tipoCliente === 'persona_fisica') {
      keys.push(
        'pf.nombres',
        'pf.apellido_paterno',
        'pf.apellido_materno',
        'pf.fecha_nacimiento',
        'pf.rfc',
        'pf.curp',
        'pf.actividad'
      );
    }

    if (tipoCliente === 'persona_moral') {
      keys.push(
        'pm.rfc',
        'pm.fecha_constitucion',
        'pm.giro',
        'rep.nombres',
        'rep.apellido_paterno',
        'rep.apellido_materno',
        'rep.fecha_nacimiento',
        'rep.rfc',
        'rep.curp'
      );
    }

    if (tipoCliente === 'fideicomiso') {
      keys.push(
        'fid.denom',
        'fid.rfc',
        'fid.ident',
        'rep.nombres',
        'rep.apellido_paterno',
        'rep.apellido_materno',
        'rep.fecha_nacimiento',
        'rep.rfc',
        'rep.curp'
      );
    }

    setTouched((t) => {
      const n = { ...t };
      for (const k of keys) n[k] = true;
      return n;
    });
  }

  async function onSubmit() {
    setFatal('');
    const e = recomputeAndSetErrors();
    touchAllVisible();

    if (Object.keys(e).some((k) => e[k])) {
      return; // bloqueante
    }

    if (!token) {
      setFatal('No hay token en sesión. Vuelve a iniciar sesión.');
      return;
    }

    setLoading(true);
    try {
      const act = actividades.find((x) => x.clave === pfActividad) || null;
      const giro = giros.find((x) => x.clave === pmGiro) || null;

      const body: any = {
        empresa_id: Number(empresaId),
        tipo_cliente: tipoCliente,
        nombre_entidad: nombreEntidad.trim(),
        nacionalidad,
        datos_completos: {
          contacto: {
            pais: contactoPais,
            telefono: onlyDigits(telefono)
          }
        }
      };

      if (tipoCliente === 'persona_fisica') {
        body.datos_completos.persona = {
          tipo: 'persona_fisica',
          nombres: pfNombres.trim(),
          apellido_paterno: pfAP.trim(),
          apellido_materno: pfAM.trim(),
          fecha_nacimiento: pfFechaNac.trim(),
          rfc: normalizeUpper(pfRFC),
          curp: normalizeUpper(pfCURP),
          actividad_economica: act
            ? { clave: act.clave, descripcion: act.descripcion }
            : { clave: pfActividad, descripcion: '' }
        };
      }

      if (tipoCliente === 'persona_moral') {
        body.datos_completos.empresa = {
          tipo: 'persona_moral',
          rfc: normalizeUpper(pmRFC),
          fecha_constitucion: pmFechaConst.trim(),
          giro: giro ? giro.descripcion : ''
        };
        body.datos_completos.representante = {
          nombres: repNombre.trim(),
          apellido_paterno: repAP.trim(),
          apellido_materno: repAM.trim(),
          fecha_nacimiento: repFechaNac.trim(),
          rfc: normalizeUpper(repRFC),
          curp: normalizeUpper(repCURP)
        };
      }

      if (tipoCliente === 'fideicomiso') {
        body.datos_completos.fideicomiso = {
          denominacion_fiduciario: fidDenom.trim(),
          rfc_fiduciario: normalizeUpper(fidRFC),
          identificador: fidIdent.trim()
        };
        body.datos_completos.representante = {
          nombre_completo: `${repNombre.trim()} ${repAP.trim()} ${repAM.trim()}`.trim(),
          fecha_nacimiento: repFechaNac.trim(),
          rfc: normalizeUpper(repRFC),
          curp: normalizeUpper(repCURP)
        };
      }

      const res = await fetch(`${apiBase}/api/cliente/registrar-cliente`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFatal(data?.error || `Error al registrar (${res.status})`);
        return;
      }

      const id =
        data?.cliente?.id ??
        data?.id ??
        data?.ok?.cliente?.id ??
        data?.ok?.id ??
        null;

      if (!id) {
        setFatal('Registrado, pero no pude leer el ID de respuesta.');
        return;
      }

      router.push(`/cliente/clientes/${id}`);
    } catch (e: any) {
      setFatal(e?.message || 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Registrar cliente</h1>

      {fatal ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {fatal}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">
            Empresa ID <span className="text-red-600">*</span>
          </label>
          <input
            value={empresaId}
            onChange={(e) => {
              setEmpresaId(e.target.value);
            }}
            onBlur={() => touchAndValidate('empresa_id')}
            className={classInput(!!showErr('empresa_id'))}
            placeholder="Ej. 38"
          />
          {errText(showErr('empresa_id'))}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">
            Tipo de cliente <span className="text-red-600">*</span>
          </label>
          <select
            value={tipoCliente}
            onChange={(e) => {
              setTipoCliente(e.target.value as TipoCliente);
              // reset parcial (sin borrar todo)
              setFatal('');
              // recalcular errores por el cambio de tipo
              setTimeout(() => recomputeAndSetErrors(), 0);
            }}
            className={classInput(false)}
          >
            <option value="persona_fisica">Persona física</option>
            <option value="persona_moral">Persona moral</option>
            <option value="fideicomiso">Fideicomiso</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">
          Nombre / Razón social <span className="text-red-600">*</span>
        </label>
        <input
          value={nombreEntidad}
          onChange={(e) => setNombreEntidad(e.target.value)}
          onBlur={() => touchAndValidate('nombre_entidad')}
          className={classInput(!!showErr('nombre_entidad'))}
          placeholder="Ej. Alicia Pruebas / Empresa SA de CV"
        />
        {errText(showErr('nombre_entidad'))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SearchableSelect
          label="Nacionalidad"
          required
          items={paises}
          value={nacionalidad}
          onChange={(v) => setNacionalidad(v)}
          onTouch={() => touchAndValidate('nacionalidad')}
          error={showErr('nacionalidad')}
          placeholder="Selecciona nacionalidad..."
        />

        <SearchableSelect
          label="País (contacto)"
          required
          items={paises}
          value={contactoPais}
          onChange={(v) => setContactoPais(v)}
          onTouch={() => touchAndValidate('contacto.pais')}
          error={showErr('contacto.pais')}
          placeholder="Selecciona país de contacto..."
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">
          Teléfono <span className="text-red-600">*</span>
        </label>
        <input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          onBlur={() => touchAndValidate('contacto.telefono')}
          className={classInput(!!showErr('contacto.telefono'))}
          placeholder="Solo dígitos (8–15)"
        />
        {errText(showErr('contacto.telefono'))}
      </div>

      {tipoCliente === 'persona_fisica' ? (
        <div className="rounded-md border p-4 space-y-4">
          <h2 className="font-semibold">Persona física</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Nombre(s) <span className="text-red-600">*</span>
              </label>
              <input
                value={pfNombres}
                onChange={(e) => setPfNombres(e.target.value)}
                onBlur={() => touchAndValidate('pf.nombres')}
                className={classInput(!!showErr('pf.nombres'))}
              />
              {errText(showErr('pf.nombres'))}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Apellido paterno <span className="text-red-600">*</span>
              </label>
              <input
                value={pfAP}
                onChange={(e) => setPfAP(e.target.value)}
                onBlur={() => touchAndValidate('pf.apellido_paterno')}
                className={classInput(!!showErr('pf.apellido_paterno'))}
              />
              {errText(showErr('pf.apellido_paterno'))}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Apellido materno <span className="text-red-600">*</span>
              </label>
              <input
                value={pfAM}
                onChange={(e) => setPfAM(e.target.value)}
                onBlur={() => touchAndValidate('pf.apellido_materno')}
                className={classInput(!!showErr('pf.apellido_materno'))}
              />
              {errText(showErr('pf.apellido_materno'))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Fecha nacimiento (AAAAMMDD) <span className="text-red-600">*</span>
              </label>
              <input
                value={pfFechaNac}
                onChange={(e) => setPfFechaNac(onlyDigits(e.target.value).slice(0, 8))}
                onBlur={() => touchAndValidate('pf.fecha_nacimiento')}
                className={classInput(!!showErr('pf.fecha_nacimiento'))}
                placeholder="19900101"
              />
              {errText(showErr('pf.fecha_nacimiento'))}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                RFC <span className="text-red-600">*</span>
              </label>
              <input
                value={pfRFC}
                onChange={(e) => setPfRFC(e.target.value)}
                onBlur={() => touchAndValidate('pf.rfc')}
                className={classInput(!!showErr('pf.rfc'))}
                placeholder="XAXX010101000"
              />
              {errText(showErr('pf.rfc'))}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                CURP <span className="text-red-600">*</span>
              </label>
              <input
                value={pfCURP}
                onChange={(e) => setPfCURP(e.target.value)}
                onBlur={() => touchAndValidate('pf.curp')}
                className={classInput(!!showErr('pf.curp'))}
                placeholder="PEPJ900101HDFRRN09"
              />
              {errText(showErr('pf.curp'))}
            </div>
          </div>

          <SearchableSelect
            label="Actividad económica"
            required
            items={actividades}
            value={pfActividad}
            onChange={(v) => setPfActividad(v)}
            onTouch={() => touchAndValidate('pf.actividad')}
            error={showErr('pf.actividad')}
            placeholder="Selecciona actividad..."
          />
        </div>
      ) : null}

      {tipoCliente === 'persona_moral' ? (
        <div className="rounded-md border p-4 space-y-4">
          <h2 className="font-semibold">Persona moral</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1 sm:col-span-1">
              <label className="text-sm font-medium">
                RFC (empresa) <span className="text-red-600">*</span>
              </label>
              <input
                value={pmRFC}
                onChange={(e) => setPmRFC(e.target.value)}
                onBlur={() => touchAndValidate('pm.rfc')}
                className={classInput(!!showErr('pm.rfc'))}
              />
              {errText(showErr('pm.rfc'))}
            </div>

            <div className="space-y-1 sm:col-span-1">
              <label className="text-sm font-medium">
                Fecha constitución (AAAAMMDD) <span className="text-red-600">*</span>
              </label>
              <input
                value={pmFechaConst}
                onChange={(e) => setPmFechaConst(onlyDigits(e.target.value).slice(0, 8))}
                onBlur={() => touchAndValidate('pm.fecha_constitucion')}
                className={classInput(!!showErr('pm.fecha_constitucion'))}
                placeholder="20200203"
              />
              {errText(showErr('pm.fecha_constitucion'))}
            </div>

            <div className="sm:col-span-1">
              <SearchableSelect
                label="Giro mercantil"
                required
                items={giros}
                value={pmGiro}
                onChange={(v) => setPmGiro(v)}
                onTouch={() => touchAndValidate('pm.giro')}
                error={showErr('pm.giro')}
                placeholder="Selecciona giro..."
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold">Representante legal</h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Nombre(s) <span className="text-red-600">*</span>
                </label>
                <input
                  value={repNombre}
                  onChange={(e) => setRepNombre(e.target.value)}
                  onBlur={() => touchAndValidate('rep.nombres')}
                  className={classInput(!!showErr('rep.nombres'))}
                />
                {errText(showErr('rep.nombres'))}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Apellido paterno <span className="text-red-600">*</span>
                </label>
                <input
                  value={repAP}
                  onChange={(e) => setRepAP(e.target.value)}
                  onBlur={() => touchAndValidate('rep.apellido_paterno')}
                  className={classInput(!!showErr('rep.apellido_paterno'))}
                />
                {errText(showErr('rep.apellido_paterno'))}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Apellido materno <span className="text-red-600">*</span>
                </label>
                <input
                  value={repAM}
                  onChange={(e) => setRepAM(e.target.value)}
                  onBlur={() => touchAndValidate('rep.apellido_materno')}
                  className={classInput(!!showErr('rep.apellido_materno'))}
                />
                {errText(showErr('rep.apellido_materno'))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Fecha nacimiento (AAAAMMDD) <span className="text-red-600">*</span>
                </label>
                <input
                  value={repFechaNac}
                  onChange={(e) => setRepFechaNac(onlyDigits(e.target.value).slice(0, 8))}
                  onBlur={() => touchAndValidate('rep.fecha_nacimiento')}
                  className={classInput(!!showErr('rep.fecha_nacimiento'))}
                  placeholder="19900101"
                />
                {errText(showErr('rep.fecha_nacimiento'))}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  RFC <span className="text-red-600">*</span>
                </label>
                <input
                  value={repRFC}
                  onChange={(e) => setRepRFC(e.target.value)}
                  onBlur={() => touchAndValidate('rep.rfc')}
                  className={classInput(!!showErr('rep.rfc'))}
                />
                {errText(showErr('rep.rfc'))}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  CURP <span className="text-red-600">*</span>
                </label>
                <input
                  value={repCURP}
                  onChange={(e) => setRepCURP(e.target.value)}
                  onBlur={() => touchAndValidate('rep.curp')}
                  className={classInput(!!showErr('rep.curp'))}
                />
                {errText(showErr('rep.curp'))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tipoCliente === 'fideicomiso' ? (
        <div className="rounded-md border p-4 space-y-4">
          <h2 className="font-semibold">Fideicomiso (iteración 1)</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">
                Denominación del fiduciario <span className="text-red-600">*</span>
              </label>
              <input
                value={fidDenom}
                onChange={(e) => setFidDenom(e.target.value)}
                onBlur={() => touchAndValidate('fid.denom')}
                className={classInput(!!showErr('fid.denom'))}
              />
              {errText(showErr('fid.denom'))}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                RFC fiduciario <span className="text-red-600">*</span>
              </label>
              <input
                value={fidRFC}
                onChange={(e) => setFidRFC(e.target.value)}
                onBlur={() => touchAndValidate('fid.rfc')}
                className={classInput(!!showErr('fid.rfc'))}
                placeholder="XAXX010101000"
              />
              {errText(showErr('fid.rfc'))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Identificador del fideicomiso <span className="text-red-600">*</span>
            </label>
            <input
              value={fidIdent}
              onChange={(e) => setFidIdent(e.target.value)}
              onBlur={() => touchAndValidate('fid.ident')}
              className={classInput(!!showErr('fid.ident'))}
              placeholder="FID-0001"
            />
            {errText(showErr('fid.ident'))}
          </div>

          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold">Representante / apoderado</h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Nombre(s) <span className="text-red-600">*</span>
                </label>
                <input
                  value={repNombre}
                  onChange={(e) => setRepNombre(e.target.value)}
                  onBlur={() => touchAndValidate('rep.nombres')}
                  className={classInput(!!showErr('rep.nombres'))}
                />
                {errText(showErr('rep.nombres'))}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Apellido paterno <span className="text-red-600">*</span>
                </label>
                <input
                  value={repAP}
                  onChange={(e) => setRepAP(e.target.value)}
                  onBlur={() => touchAndValidate('rep.apellido_paterno')}
                  className={classInput(!!showErr('rep.apellido_paterno'))}
                />
                {errText(showErr('rep.apellido_paterno'))}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Apellido materno <span className="text-red-600">*</span>
                </label>
                <input
                  value={repAM}
                  onChange={(e) => setRepAM(e.target.value)}
                  onBlur={() => touchAndValidate('rep.apellido_materno')}
                  className={classInput(!!showErr('rep.apellido_materno'))}
                />
                {errText(showErr('rep.apellido_materno'))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Fecha nacimiento (AAAAMMDD) <span className="text-red-600">*</span>
                </label>
                <input
                  value={repFechaNac}
                  onChange={(e) => setRepFechaNac(onlyDigits(e.target.value).slice(0, 8))}
                  onBlur={() => touchAndValidate('rep.fecha_nacimiento')}
                  className={classInput(!!showErr('rep.fecha_nacimiento'))}
                />
                {errText(showErr('rep.fecha_nacimiento'))}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  RFC <span className="text-red-600">*</span>
                </label>
                <input
                  value={repRFC}
                  onChange={(e) => setRepRFC(e.target.value)}
                  onBlur={() => touchAndValidate('rep.rfc')}
                  className={classInput(!!showErr('rep.rfc'))}
                  placeholder="XAXX010101000"
                />
                {errText(showErr('rep.rfc'))}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  CURP <span className="text-red-600">*</span>
                </label>
                <input
                  value={repCURP}
                  onChange={(e) => setRepCURP(e.target.value)}
                  onBlur={() => touchAndValidate('rep.curp')}
                  className={classInput(!!showErr('rep.curp'))}
                  placeholder="PEPJ900101HDFRRN09"
                />
                {errText(showErr('rep.curp'))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={onSubmit}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Registrar'}
        </button>

        <button
          type="button"
          className="rounded-md border px-4 py-2 text-sm"
          onClick={() => router.push('/cliente/clientes')}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
