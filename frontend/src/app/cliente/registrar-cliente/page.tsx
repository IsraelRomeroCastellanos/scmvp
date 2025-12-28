// frontend/src/app/cliente/registrar-cliente/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadCatalogo, type CatalogItem } from '@/lib/catalogos';

type TipoCliente = 'persona_fisica' | 'persona_moral' | 'fideicomiso';

function labelTipo(t: TipoCliente) {
  if (t === 'persona_fisica') return 'Persona Física';
  if (t === 'persona_moral') return 'Persona Moral';
  return 'Fideicomiso';
}

function toPaisValue(it: CatalogItem) {
  // Normalizamos a "DESCRIPCION,CLAVE" (como ya estás usando: "MEXICO,MX")
  return `${it.descripcion},${it.clave}`.toUpperCase();
}

function isValidRFC(raw: string) {
  const v = String(raw ?? '').trim().toUpperCase();
  return /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(v);
}

function isValidCURP(raw: string) {
  const v = String(raw ?? '').trim().toUpperCase();
  return /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]{2}$/.test(v);
}

function isYYYYMMDD(raw: string) {
  return /^\d{8}$/.test(String(raw ?? '').trim());
}

function SearchSelect({
  label,
  value,
  onChange,
  items,
  placeholder,
  required,
  modoBusqueda,
  onToggleModoBusqueda
}: {
  label: string;
  value: CatalogItem | null;
  onChange: (v: CatalogItem | null) => void;
  items: CatalogItem[];
  placeholder?: string;
  required?: boolean;
  modoBusqueda: boolean;
  onToggleModoBusqueda: (v: boolean) => void;
}) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => {
      const a = `${x.clave} ${x.descripcion}`.toLowerCase();
      return a.includes(s);
    });
  }, [q, items]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <label className="block text-sm font-medium">
          {label} {required ? '*' : ''}
        </label>

        <label className="flex items-center gap-2 text-xs opacity-80 select-none">
          <input
            type="checkbox"
            checked={modoBusqueda}
            onChange={(e) => onToggleModoBusqueda(e.target.checked)}
          />
          activar búsqueda
        </label>
      </div>

      {modoBusqueda ? (
        <input
          className="w-full rounded border p-2"
          placeholder="Escribe para buscar..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      ) : null}

      <select
        className="w-full rounded border p-2"
        value={value?.clave ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          const it = items.find((x) => x.clave === v) ?? null;
          onChange(it);
        }}
      >
        <option value="">{placeholder ?? 'Selecciona...'}</option>
        {(modoBusqueda ? filtered : items).map((it) => (
          <option key={it.clave} value={it.clave}>
            {it.descripcion} ({it.clave})
          </option>
        ))}
      </select>
    </div>
  );
}

export default function RegistrarClientePage() {
  const router = useRouter();

  // Carga de catálogos
  const [paises, setPaises] = useState<CatalogItem[]>([]);
  const [actividades, setActividades] = useState<CatalogItem[]>([]);
  const [giros, setGiros] = useState<CatalogItem[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  // UI: toggles búsqueda por select
  const [buscaNacionalidad, setBuscaNacionalidad] = useState(true);
  const [buscaPaisContacto, setBuscaPaisContacto] = useState(true);
  const [buscaActividad, setBuscaActividad] = useState(true);
  const [buscaGiro, setBuscaGiro] = useState(true);

  // Form: base
  const [empresaId, setEmpresaId] = useState<number>(38); // ajusta tu default si quieres
  const [tipo, setTipo] = useState<TipoCliente>('persona_fisica');
  const [nombreEntidad, setNombreEntidad] = useState('');
  const [nacionalidadSel, setNacionalidadSel] = useState<CatalogItem | null>(null);

  // Contacto
  const [paisContactoSel, setPaisContactoSel] = useState<CatalogItem | null>(null);
  const [telefono, setTelefono] = useState('');
  const [emailContacto, setEmailContacto] = useState('');
  const [domicilioContacto, setDomicilioContacto] = useState('');

  // Persona física
  const [pfNombres, setPfNombres] = useState('');
  const [pfApPaterno, setPfApPaterno] = useState('');
  const [pfApMaterno, setPfApMaterno] = useState('');
  const [pfActividadSel, setPfActividadSel] = useState<CatalogItem | null>(null);

  // Persona moral
  const [pmRfc, setPmRfc] = useState('');
  const [pmFechaConst, setPmFechaConst] = useState('');
  const [pmGiroSel, setPmGiroSel] = useState<CatalogItem | null>(null);

  const [repNombres, setRepNombres] = useState('');
  const [repApPaterno, setRepApPaterno] = useState('');
  const [repApMaterno, setRepApMaterno] = useState('');
  const [repRfc, setRepRfc] = useState('');
  const [repCurp, setRepCurp] = useState('');

  // Fideicomiso (iteración 1: mínimos reales)
  const [fidIdentificador, setFidIdentificador] = useState('');
  const [fidDenominacion, setFidDenominacion] = useState('');
  const [fidRfcFiduciario, setFidRfcFiduciario] = useState('');

  const [fidRepNombreCompleto, setFidRepNombreCompleto] = useState('');
  const [fidRepRfc, setFidRepRfc] = useState('');
  const [fidRepCurp, setFidRepCurp] = useState('');
  const [fidRepFechaNac, setFidRepFechaNac] = useState(''); // AAAAMMDD

  // UX
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function run() {
      setLoadingCatalogos(true);
      try {
        const [p, a, g] = await Promise.all([
          loadCatalogo('sat/c_pais'),
          loadCatalogo('sat/c_actividad_economica'),
          loadCatalogo('internos/giro_mercantil')
        ]);

        if (!mounted) return;
        setPaises(p);
        setActividades(a);
        setGiros(g);

        // defaults “seguros”
        if (!nacionalidadSel && p.length) setNacionalidadSel(p[0]);
        if (!paisContactoSel && p.length) setPaisContactoSel(p[0]);
      } catch (e: any) {
        console.error(e);
        if (mounted) setErr(e?.message || 'No se pudieron cargar catálogos');
      } finally {
        if (mounted) setLoadingCatalogos(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validate(): string[] {
    const errors: string[] = [];

    if (!empresaId || empresaId <= 0) errors.push('Empresa (empresa_id) es obligatoria');
    if (!tipo) errors.push('Tipo de cliente es obligatorio');
    if (!nombreEntidad.trim()) errors.push('Nombre / Entidad es obligatorio');

    if (!nacionalidadSel) errors.push('Nacionalidad es obligatoria');
    if (!paisContactoSel) errors.push('País (contacto) es obligatorio');
    if (!telefono.trim()) errors.push('Teléfono es obligatorio');

    if (tipo === 'persona_fisica') {
      if (!pfNombres.trim()) errors.push('PF: nombres son obligatorios');
      if (!pfApPaterno.trim()) errors.push('PF: apellido paterno es obligatorio');
      if (!pfActividadSel) errors.push('PF: actividad económica es obligatoria');
    }

    if (tipo === 'persona_moral') {
      if (!pmRfc.trim()) errors.push('PM: RFC es obligatorio');
      if (pmRfc.trim() && !isValidRFC(pmRfc)) errors.push('PM: RFC inválido');
      if (!pmFechaConst) errors.push('PM: fecha de constitución es obligatoria');
      if (!pmGiroSel) errors.push('PM: giro mercantil es obligatorio');

      if (!repNombres.trim()) errors.push('PM: representante nombres son obligatorios');
      if (!repApPaterno.trim()) errors.push('PM: representante apellido paterno es obligatorio');
      if (repRfc.trim() && !isValidRFC(repRfc)) errors.push('PM: representante RFC inválido');
      if (repCurp.trim() && !isValidCURP(repCurp)) errors.push('PM: representante CURP inválida');
    }

    if (tipo === 'fideicomiso') {
      if (!fidIdentificador.trim()) errors.push('Fideicomiso: identificador es obligatorio');
      if (!fidDenominacion.trim()) errors.push('Fideicomiso: denominación del fiduciario es obligatoria');
      if (!fidRfcFiduciario.trim()) errors.push('Fideicomiso: RFC del fiduciario es obligatorio');
      if (fidRfcFiduciario.trim() && !isValidRFC(fidRfcFiduciario)) errors.push('Fideicomiso: RFC del fiduciario inválido');

      if (!fidRepNombreCompleto.trim()) errors.push('Fideicomiso: nombre completo del representante es obligatorio');
      if (!fidRepRfc.trim()) errors.push('Fideicomiso: RFC del representante es obligatorio');
      if (fidRepRfc.trim() && !isValidRFC(fidRepRfc)) errors.push('Fideicomiso: RFC del representante inválido');

      if (!fidRepCurp.trim()) errors.push('Fideicomiso: CURP del representante es obligatoria');
      if (fidRepCurp.trim() && !isValidCURP(fidRepCurp)) errors.push('Fideicomiso: CURP del representante inválida');

      if (!fidRepFechaNac.trim()) errors.push('Fideicomiso: fecha de nacimiento (AAAAMMDD) es obligatoria');
      if (fidRepFechaNac.trim() && !isYYYYMMDD(fidRepFechaNac)) errors.push('Fideicomiso: fecha de nacimiento debe ser AAAAMMDD');
    }

    return errors;
  }

  function buildPayload() {
    const nacionalidad = nacionalidadSel ? toPaisValue(nacionalidadSel) : '';
    const paisContacto = paisContactoSel ? toPaisValue(paisContactoSel) : '';

    const contacto: any = {
      pais: paisContacto,
      telefono: telefono.trim()
    };
    if (emailContacto.trim()) contacto.email = emailContacto.trim();
    if (domicilioContacto.trim()) contacto.domicilio = domicilioContacto.trim();

    const base: any = {
      empresa_id: empresaId,
      tipo_cliente: tipo,
      nombre_entidad: nombreEntidad.trim(),
      nacionalidad,
      datos_completos: { contacto }
    };

    if (tipo === 'persona_fisica') {
      base.datos_completos.persona = {
        tipo: 'persona_fisica',
        nombres: pfNombres.trim(),
        apellido_paterno: pfApPaterno.trim(),
        apellido_materno: pfApMaterno.trim() || undefined,
        actividad_economica: pfActividadSel
          ? { clave: pfActividadSel.clave, descripcion: pfActividadSel.descripcion }
          : undefined
      };
    }

    if (tipo === 'persona_moral') {
      base.datos_completos.empresa = {
        tipo: 'persona_moral',
        rfc: pmRfc.trim().toUpperCase(),
        fecha_constitucion: pmFechaConst,
        giro: pmGiroSel ? pmGiroSel.descripcion : undefined
      };

      base.datos_completos.representante = {
        nombres: repNombres.trim(),
        apellido_paterno: repApPaterno.trim(),
        apellido_materno: repApMaterno.trim() || undefined,
        rfc: repRfc.trim() ? repRfc.trim().toUpperCase() : undefined,
        curp: repCurp.trim() ? repCurp.trim().toUpperCase() : undefined
      };
    }

    if (tipo === 'fideicomiso') {
      base.datos_completos.fideicomiso = {
        identificador: fidIdentificador.trim(),
        denominacion_fiduciario: fidDenominacion.trim(),
        rfc_fiduciario: fidRfcFiduciario.trim().toUpperCase()
      };

      base.datos_completos.representante = {
        nombre_completo: fidRepNombreCompleto.trim(),
        rfc: fidRepRfc.trim().toUpperCase(),
        curp: fidRepCurp.trim().toUpperCase(),
        fecha_nacimiento: fidRepFechaNac.trim()
      };
    }

    return base;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOkMsg(null);

    const errors = validate();
    if (errors.length) {
      setErr(errors.join(' | '));
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setErr('No hay token. Inicia sesión de nuevo.');
      return;
    }

    const payload = buildPayload();

    setSubmitting(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

      const res = await fetch(`${apiBase}/api/cliente/registrar-cliente`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // si backend manda fields, lo mostramos
        const extra = Array.isArray(data?.fields) ? ` | ${data.fields.join(', ')}` : '';
        setErr((data?.error || `Error HTTP ${res.status}`) + extra);
        return;
      }

      const newId =
        data?.cliente?.id ??
        data?.id ??
        data?.clienteId ??
        null;

      if (!newId) {
        setOkMsg('Cliente registrado ✅ (pero no llegó id en respuesta)');
        return;
      }

      setOkMsg(`Cliente registrado ✅ ID=${newId}`);
      router.push(`/cliente/clientes/${newId}`);
    } catch (e: any) {
      setErr(e?.message || 'Error de red');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingCatalogos) return <div className="p-6 text-sm">Cargando catálogos...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Registrar Cliente</h1>

      {okMsg && <div className="rounded border p-3 text-sm">{okMsg}</div>}
      {err && <div className="rounded border p-3 text-sm">{err}</div>}

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="rounded border p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium">Empresa ID *</label>
              <input
                type="number"
                className="w-full rounded border p-2"
                value={empresaId}
                onChange={(e) => setEmpresaId(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Tipo *</label>
              <select className="w-full rounded border p-2" value={tipo} onChange={(e) => setTipo(e.target.value as TipoCliente)}>
                <option value="persona_fisica">Persona Física</option>
                <option value="persona_moral">Persona Moral</option>
                <option value="fideicomiso">Fideicomiso</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Nombre / Entidad *</label>
              <input className="w-full rounded border p-2" value={nombreEntidad} onChange={(e) => setNombreEntidad(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SearchSelect
              label="Nacionalidad"
              value={nacionalidadSel}
              onChange={setNacionalidadSel}
              items={paises}
              required
              modoBusqueda={buscaNacionalidad}
              onToggleModoBusqueda={setBuscaNacionalidad}
              placeholder="Selecciona nacionalidad..."
            />

            <SearchSelect
              label="País (contacto)"
              value={paisContactoSel}
              onChange={setPaisContactoSel}
              items={paises}
              required
              modoBusqueda={buscaPaisContacto}
              onToggleModoBusqueda={setBuscaPaisContacto}
              placeholder="Selecciona país..."
            />
          </div>
        </div>

        <div className="rounded border p-4 space-y-3">
          <div className="font-medium">Contacto</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Teléfono *</label>
              <input className="w-full rounded border p-2" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input className="w-full rounded border p-2" value={emailContacto} onChange={(e) => setEmailContacto(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Domicilio</label>
            <input className="w-full rounded border p-2" value={domicilioContacto} onChange={(e) => setDomicilioContacto(e.target.value)} />
          </div>
        </div>

        {tipo === 'persona_fisica' && (
          <div className="rounded border p-4 space-y-3">
            <div className="font-medium">{labelTipo(tipo)}</div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium">Nombres *</label>
                <input className="w-full rounded border p-2" value={pfNombres} onChange={(e) => setPfNombres(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium">Apellido paterno *</label>
                <input className="w-full rounded border p-2" value={pfApPaterno} onChange={(e) => setPfApPaterno(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium">Apellido materno</label>
                <input className="w-full rounded border p-2" value={pfApMaterno} onChange={(e) => setPfApMaterno(e.target.value)} />
              </div>
            </div>

            <SearchSelect
              label="Actividad económica"
              value={pfActividadSel}
              onChange={setPfActividadSel}
              items={actividades}
              required
              modoBusqueda={buscaActividad}
              onToggleModoBusqueda={setBuscaActividad}
              placeholder="Selecciona actividad..."
            />
          </div>
        )}

        {tipo === 'persona_moral' && (
          <div className="rounded border p-4 space-y-4">
            <div className="font-medium">{labelTipo(tipo)}</div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium">RFC *</label>
                <input className="w-full rounded border p-2" value={pmRfc} onChange={(e) => setPmRfc(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium">Fecha constitución *</label>
                <input type="date" className="w-full rounded border p-2" value={pmFechaConst} onChange={(e) => setPmFechaConst(e.target.value)} />
              </div>
              <div className="md:col-span-1">
                <SearchSelect
                  label="Giro mercantil"
                  value={pmGiroSel}
                  onChange={setPmGiroSel}
                  items={giros}
                  required
                  modoBusqueda={buscaGiro}
                  onToggleModoBusqueda={setBuscaGiro}
                  placeholder="Selecciona giro..."
                />
              </div>
            </div>

            <div className="rounded border p-3 space-y-3">
              <div className="font-medium">Representante</div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium">Nombres *</label>
                  <input className="w-full rounded border p-2" value={repNombres} onChange={(e) => setRepNombres(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Apellido paterno *</label>
                  <input className="w-full rounded border p-2" value={repApPaterno} onChange={(e) => setRepApPaterno(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Apellido materno</label>
                  <input className="w-full rounded border p-2" value={repApMaterno} onChange={(e) => setRepApMaterno(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium">RFC</label>
                  <input className="w-full rounded border p-2" value={repRfc} onChange={(e) => setRepRfc(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium">CURP</label>
                  <input className="w-full rounded border p-2" value={repCurp} onChange={(e) => setRepCurp(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {tipo === 'fideicomiso' && (
          <div className="rounded border p-4 space-y-4">
            <div className="font-medium">{labelTipo(tipo)} — mínimos (iteración 1)</div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium">Identificador *</label>
                <input className="w-full rounded border p-2" value={fidIdentificador} onChange={(e) => setFidIdentificador(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium">Denominación / Razón Social del Fiduciario *</label>
                <input className="w-full rounded border p-2" value={fidDenominacion} onChange={(e) => setFidDenominacion(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">RFC del Fiduciario *</label>
                <input className="w-full rounded border p-2" value={fidRfcFiduciario} onChange={(e) => setFidRfcFiduciario(e.target.value)} />
                <p className="text-xs opacity-70 mt-1">Formato: XAXX010101000</p>
              </div>
            </div>

            <div className="rounded border p-3 space-y-3">
              <div className="font-medium">Representante / Apoderado *</div>

              <div>
                <label className="block text-sm font-medium">Nombre completo *</label>
                <input className="w-full rounded border p-2" value={fidRepNombreCompleto} onChange={(e) => setFidRepNombreCompleto(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium">RFC *</label>
                  <input className="w-full rounded border p-2" value={fidRepRfc} onChange={(e) => setFidRepRfc(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium">CURP *</label>
                  <input className="w-full rounded border p-2" value={fidRepCurp} onChange={(e) => setFidRepCurp(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Fecha nacimiento *</label>
                  <input
                    className="w-full rounded border p-2"
                    placeholder="AAAAMMDD"
                    value={fidRepFechaNac}
                    onChange={(e) => setFidRepFechaNac(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="rounded border px-4 py-2 text-sm">
            {submitting ? 'Registrando...' : 'Registrar'}
          </button>
          <button type="button" className="rounded border px-4 py-2 text-sm" onClick={() => router.push('/cliente/clientes')}>
            Cancelar
          </button>
        </div>

        <div className="rounded border p-4">
          <details>
            <summary className="cursor-pointer select-none font-medium">Debug: payload</summary>
            <pre className="mt-3 text-xs overflow-auto whitespace-pre-wrap">
              {JSON.stringify(buildPayload(), null, 2)}
            </pre>
          </details>
        </div>
      </form>
    </div>
  );
}
