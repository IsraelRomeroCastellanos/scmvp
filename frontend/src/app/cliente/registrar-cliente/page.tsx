// frontend/src/app/cliente/registrar-cliente/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadCatalogo, type CatalogItem } from '@/lib/catalogos';

type TipoCliente = 'persona_fisica' | 'persona_moral' | 'fideicomiso';

type Errors = Record<string, string>;

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
  // RFC genérico XAXX010101000 pasa.
  // Acepta PF(13) o PM(12)
  return /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(v);
}

function isCURP(s: string) {
  const v = normalizeUpper(s);
  return /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(v);
}

function req(errors: Errors, key: string, label: string, value: any) {
  const v = typeof value === 'string' ? value.trim() : value;
  if (!v) errors[key] = `${label} es obligatorio`;
}

function reqRFC(errors: Errors, key: string, label: string, value: string) {
  if (!value?.trim()) return (errors[key] = `${label} es obligatorio`);
  if (!isRFC(value)) errors[key] = `${label} inválido (formato RFC)`;
}

function reqCURP(errors: Errors, key: string, label: string, value: string) {
  if (!value?.trim()) return (errors[key] = `${label} es obligatorio`);
  if (!isCURP(value)) errors[key] = `${label} inválida (formato CURP)`;
}

function reqYYYYMMDD(errors: Errors, key: string, label: string, value: string) {
  if (!value?.trim()) return (errors[key] = `${label} es obligatorio`);
  if (!isYYYYMMDD(value)) errors[key] = `${label} inválida (AAAAMMDD)`;
}

function reqPhone(errors: Errors, key: string, label: string, value: string) {
  const d = onlyDigits(value);
  if (!d) return (errors[key] = `${label} es obligatorio`);
  if (d.length < 8 || d.length > 15) errors[key] = `${label} inválido (8–15 dígitos)`;
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
 */
function SearchableSelect(props: {
  label: string;
  required?: boolean;
  placeholder?: string;
  items: CatalogItem[];
  value: string; // guardamos "CLAVE" o "CLAVE,XX" según tu catálogo
  onChange: (v: string) => void;
  error?: string;
}) {
  const { label, required, placeholder, items, value, onChange, error } = props;

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
      if (!el.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

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

  // Catálogos
  const [paises, setPaises] = useState<CatalogItem[]>([]);
  const [actividades, setActividades] = useState<CatalogItem[]>([]);
  const [giros, setGiros] = useState<CatalogItem[]>([]);

  // Form
  const [empresaId, setEmpresaId] = useState<string>(''); // string para input
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>('persona_fisica');

  const [nombreEntidad, setNombreEntidad] = useState('');
  const [nacionalidad, setNacionalidad] = useState(''); // clave catálogo país

  const [contactoPais, setContactoPais] = useState(''); // clave catálogo país
  const [telefono, setTelefono] = useState('');

  // PF
  const [pfNombres, setPfNombres] = useState('');
  const [pfAP, setPfAP] = useState('');
  const [pfAM, setPfAM] = useState('');
  const [pfFechaNac, setPfFechaNac] = useState(''); // AAAAMMDD
  const [pfRFC, setPfRFC] = useState('');
  const [pfCURP, setPfCURP] = useState('');
  const [pfActividad, setPfActividad] = useState(''); // clave catálogo

  // PM
  const [pmRFC, setPmRFC] = useState('');
  const [pmFechaConst, setPmFechaConst] = useState(''); // AAAAMMDD (simple)
  const [pmGiro, setPmGiro] = useState(''); // clave catálogo giro mercantil

  const [repNombre, setRepNombre] = useState('');
  const [repAP, setRepAP] = useState('');
  const [repAM, setRepAM] = useState('');
  const [repFechaNac, setRepFechaNac] = useState(''); // AAAAMMDD
  const [repRFC, setRepRFC] = useState('');
  const [repCURP, setRepCURP] = useState('');

  // Fideicomiso (iteración 1)
  const [fidDenom, setFidDenom] = useState('');
  const [fidRFC, setFidRFC] = useState('');
  const [fidIdent, setFidIdent] = useState('');

  // token
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

  function validate(): Errors {
    const e: Errors = {};

    // Top-level
    req(e, 'empresa_id', 'Empresa', empresaId);
    if (empresaId && isNaN(Number(empresaId))) e.empresa_id = 'Empresa inválida';

    req(e, 'nombre_entidad', 'Nombre / Razón social', nombreEntidad);
    req(e, 'nacionalidad', 'Nacionalidad', nacionalidad);

    req(e, 'contacto.pais', 'País (contacto)', contactoPais);
    reqPhone(e, 'contacto.telefono', 'Teléfono', telefono);

    if (tipoCliente === 'persona_fisica') {
      req(e, 'pf.nombres', 'Nombre(s)', pfNombres);
      req(e, 'pf.apellido_paterno', 'Apellido paterno', pfAP);
      req(e, 'pf.apellido_materno', 'Apellido materno', pfAM);

      reqYYYYMMDD(e, 'pf.fecha_nacimiento', 'Fecha de nacimiento', pfFechaNac);
      reqRFC(e, 'pf.rfc', 'RFC', pfRFC);
      reqCURP(e, 'pf.curp', 'CURP', pfCURP);

      req(e, 'pf.actividad', 'Actividad económica', pfActividad);
    }

    if (tipoCliente === 'persona_moral') {
      reqRFC(e, 'pm.rfc', 'RFC (empresa)', pmRFC);
      reqYYYYMMDD(e, 'pm.fecha_constitucion', 'Fecha de constitución', pmFechaConst);
      req(e, 'pm.giro', 'Giro mercantil', pmGiro);

      // Representante (mínimo bloqueante)
      req(e, 'rep.nombres', 'Nombre(s) representante', repNombre);
      req(e, 'rep.apellido_paterno', 'Apellido paterno representante', repAP);
      req(e, 'rep.apellido_materno', 'Apellido materno representante', repAM);
      reqYYYYMMDD(e, 'rep.fecha_nacimiento', 'Fecha nacimiento representante', repFechaNac);
      reqRFC(e, 'rep.rfc', 'RFC representante', repRFC);
      reqCURP(e, 'rep.curp', 'CURP representante', repCURP);
    }

    if (tipoCliente === 'fideicomiso') {
      // Campos mínimos del fideicomiso (bloqueantes)
      req(e, 'fid.denom', 'Denominación del fiduciario', fidDenom);
      reqRFC(e, 'fid.rfc', 'RFC del fiduciario', fidRFC);
      req(e, 'fid.ident', 'Identificador del fideicomiso', fidIdent);

      // Representante (lo que marcaste obligatorio)
      req(e, 'rep.nombres', 'Nombre(s) representante', repNombre);
      req(e, 'rep.apellido_paterno', 'Apellido paterno representante', repAP);
      req(e, 'rep.apellido_materno', 'Apellido materno representante', repAM);
      reqYYYYMMDD(e, 'rep.fecha_nacimiento', 'Fecha nacimiento representante', repFechaNac);
      reqRFC(e, 'rep.rfc', 'RFC representante', repRFC);
      reqCURP(e, 'rep.curp', 'CURP representante', repCURP);
    }

    return e;
  }

  async function onSubmit() {
    setFatal('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      // bloqueante
      return;
    }

    if (!token) {
      setFatal('No hay token en sesión. Vuelve a iniciar sesión.');
      return;
    }

    setLoading(true);
    try {
      // Buscar descripción por clave (para guardar objeto {clave, descripcion} donde aplique)
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

      // soporte a ambos formatos: {ok:true, cliente:{id}} o {cliente:{id}} o {id}
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

  if (fatal) {
    // Ojo: fatal aquí también se usa para errores (mostramos banner, no bloqueamos UI completa)
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
            onChange={(e) => setEmpresaId(e.target.value)}
            className={classInput(!!errors.empresa_id)}
            placeholder="Ej. 38"
          />
          {errText(errors.empresa_id)}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">
            Tipo de cliente <span className="text-red-600">*</span>
          </label>
          <select
            value={tipoCliente}
            onChange={(e) => {
              setTipoCliente(e.target.value as TipoCliente);
              setErrors({});
              setFatal('');
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
          className={classInput(!!errors.nombre_entidad)}
          placeholder="Ej. Alicia Pruebas / Empresa SA de CV"
        />
        {errText(errors.nombre_entidad)}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SearchableSelect
          label="Nacionalidad"
          required
          items={paises}
          value={nacionalidad}
          onChange={setNacionalidad}
          error={errors.nacionalidad}
          placeholder="Selecciona nacionalidad..."
        />

        <SearchableSelect
          label="País (contacto)"
          required
          items={paises}
          value={contactoPais}
          onChange={setContactoPais}
          error={errors['contacto.pais']}
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
          className={classInput(!!errors['contacto.telefono'])}
          placeholder="Solo dígitos (8–15)"
        />
        {errText(errors['contacto.telefono'])}
      </div>

      {/* Secciones por tipo */}
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
                className={classInput(!!errors['pf.nombres'])}
              />
              {errText(errors['pf.nombres'])}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Apellido paterno <span className="text-red-600">*</span>
              </label>
              <input
                value={pfAP}
                onChange={(e) => setPfAP(e.target.value)}
                className={classInput(!!errors['pf.apellido_paterno'])}
              />
              {errText(errors['pf.apellido_paterno'])}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Apellido materno <span className="text-red-600">*</span>
              </label>
              <input
                value={pfAM}
                onChange={(e) => setPfAM(e.target.value)}
                className={classInput(!!errors['pf.apellido_materno'])}
              />
              {errText(errors['pf.apellido_materno'])}
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
                className={classInput(!!errors['pf.fecha_nacimiento'])}
                placeholder="19900101"
              />
              {errText(errors['pf.fecha_nacimiento'])}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                RFC <span className="text-red-600">*</span>
              </label>
              <input
                value={pfRFC}
                onChange={(e) => setPfRFC(e.target.value)}
                className={classInput(!!errors['pf.rfc'])}
                placeholder="XAXX010101000"
              />
              {errText(errors['pf.rfc'])}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                CURP <span className="text-red-600">*</span>
              </label>
              <input
                value={pfCURP}
                onChange={(e) => setPfCURP(e.target.value)}
                className={classInput(!!errors['pf.curp'])}
                placeholder="PEPJ900101HDFRRN09"
              />
              {errText(errors['pf.curp'])}
            </div>
          </div>

          <SearchableSelect
            label="Actividad económica"
            required
            items={actividades}
            value={pfActividad}
            onChange={setPfActividad}
            error={errors['pf.actividad']}
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
                className={classInput(!!errors['pm.rfc'])}
              />
              {errText(errors['pm.rfc'])}
            </div>

            <div className="space-y-1 sm:col-span-1">
              <label className="text-sm font-medium">
                Fecha constitución (AAAAMMDD) <span className="text-red-600">*</span>
              </label>
              <input
                value={pmFechaConst}
                onChange={(e) => setPmFechaConst(onlyDigits(e.target.value).slice(0, 8))}
                className={classInput(!!errors['pm.fecha_constitucion'])}
                placeholder="20200203"
              />
              {errText(errors['pm.fecha_constitucion'])}
            </div>

            <div className="sm:col-span-1">
              <SearchableSelect
                label="Giro mercantil"
                required
                items={giros}
                value={pmGiro}
                onChange={setPmGiro}
                error={errors['pm.giro']}
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
                  className={classInput(!!errors['rep.nombres'])}
                />
                {errText(errors['rep.nombres'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Apellido paterno <span className="text-red-600">*</span>
                </label>
                <input
                  value={repAP}
                  onChange={(e) => setRepAP(e.target.value)}
                  className={classInput(!!errors['rep.apellido_paterno'])}
                />
                {errText(errors['rep.apellido_paterno'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Apellido materno <span className="text-red-600">*</span>
                </label>
                <input
                  value={repAM}
                  onChange={(e) => setRepAM(e.target.value)}
                  className={classInput(!!errors['rep.apellido_materno'])}
                />
                {errText(errors['rep.apellido_materno'])}
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
                  className={classInput(!!errors['rep.fecha_nacimiento'])}
                  placeholder="19900101"
                />
                {errText(errors['rep.fecha_nacimiento'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  RFC <span className="text-red-600">*</span>
                </label>
                <input
                  value={repRFC}
                  onChange={(e) => setRepRFC(e.target.value)}
                  className={classInput(!!errors['rep.rfc'])}
                />
                {errText(errors['rep.rfc'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  CURP <span className="text-red-600">*</span>
                </label>
                <input
                  value={repCURP}
                  onChange={(e) => setRepCURP(e.target.value)}
                  className={classInput(!!errors['rep.curp'])}
                />
                {errText(errors['rep.curp'])}
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
                className={classInput(!!errors['fid.denom'])}
              />
              {errText(errors['fid.denom'])}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                RFC fiduciario <span className="text-red-600">*</span>
              </label>
              <input
                value={fidRFC}
                onChange={(e) => setFidRFC(e.target.value)}
                className={classInput(!!errors['fid.rfc'])}
                placeholder="XAXX010101000"
              />
              {errText(errors['fid.rfc'])}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Identificador del fideicomiso <span className="text-red-600">*</span>
            </label>
            <input
              value={fidIdent}
              onChange={(e) => setFidIdent(e.target.value)}
              className={classInput(!!errors['fid.ident'])}
              placeholder="FID-0001"
            />
            {errText(errors['fid.ident'])}
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
                  className={classInput(!!errors['rep.nombres'])}
                />
                {errText(errors['rep.nombres'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Apellido paterno <span className="text-red-600">*</span>
                </label>
                <input
                  value={repAP}
                  onChange={(e) => setRepAP(e.target.value)}
                  className={classInput(!!errors['rep.apellido_paterno'])}
                />
                {errText(errors['rep.apellido_paterno'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Apellido materno <span className="text-red-600">*</span>
                </label>
                <input
                  value={repAM}
                  onChange={(e) => setRepAM(e.target.value)}
                  className={classInput(!!errors['rep.apellido_materno'])}
                />
                {errText(errors['rep.apellido_materno'])}
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
                  className={classInput(!!errors['rep.fecha_nacimiento'])}
                />
                {errText(errors['rep.fecha_nacimiento'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  RFC <span className="text-red-600">*</span>
                </label>
                <input
                  value={repRFC}
                  onChange={(e) => setRepRFC(e.target.value)}
                  className={classInput(!!errors['rep.rfc'])}
                  placeholder="XAXX010101000"
                />
                {errText(errors['rep.rfc'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  CURP <span className="text-red-600">*</span>
                </label>
                <input
                  value={repCURP}
                  onChange={(e) => setRepCURP(e.target.value)}
                  className={classInput(!!errors['rep.curp'])}
                  placeholder="PEPJ900101HDFRRN09"
                />
                {errText(errors['rep.curp'])}
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
