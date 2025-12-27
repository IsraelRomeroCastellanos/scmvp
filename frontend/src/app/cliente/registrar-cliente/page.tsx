// frontend/src/app/cliente/registrar-cliente/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  loadPaises,
  loadActividadesEconomicas,
  loadGiroMercantil,
  type CatalogItem
} from '@/lib/catalogos';

type TipoCliente = 'persona_fisica' | 'persona_moral' | 'fideicomiso';

function labelTipo(tipo: TipoCliente) {
  if (tipo === 'persona_fisica') return 'Persona Física';
  if (tipo === 'persona_moral') return 'Persona Moral';
  return 'Fideicomiso';
}

// Dropdown con búsqueda (simple y robusto)
function SearchSelect({
  label,
  items,
  value,
  onChange,
  placeholder,
  required
}: {
  label: string;
  items: CatalogItem[];
  value: CatalogItem | null;
  onChange: (v: CatalogItem | null) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter(
      (x) =>
        x.descripcion.toLowerCase().includes(qq) ||
        x.clave.toLowerCase().includes(qq)
    );
  }, [items, q]);

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </label>

      <div className="relative">
        <button
          type="button"
          className="w-full rounded border p-2 text-left"
          onClick={() => setOpen((s) => !s)}
        >
          {value?.descripcion ?? placeholder ?? 'Selecciona…'}
        </button>

        {open && (
          <div className="absolute z-20 mt-1 w-full rounded border bg-white shadow">
            <div className="p-2 border-b">
              <input
                className="w-full rounded border p-2 text-sm"
                placeholder="Buscar…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="max-h-64 overflow-auto">
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                  setQ('');
                }}
              >
                — Limpiar —
              </button>

              {filtered.map((it) => (
                <button
                  key={`${it.clave}-${it.descripcion}`}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => {
                    onChange(it);
                    setOpen(false);
                    setQ('');
                  }}
                >
                  <div className="font-medium">{it.descripcion}</div>
                  <div className="text-xs opacity-60">{it.clave}</div>
                </button>
              ))}

              {!filtered.length ? (
                <div className="px-3 py-3 text-sm opacity-70">
                  Sin resultados
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function toYYYYMMDD(value: string) {
  // value puede venir como "YYYY-MM-DD" (input date) o "YYYYMMDD" (texto)
  const v = (value ?? '').trim();
  if (!v) return '';
  if (/^\d{8}$/.test(v)) return v;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v.replaceAll('-', '');
  return v; // lo dejamos tal cual y validamos aparte
}

function findMexico(paises: CatalogItem[]) {
  // intentamos empatar con tus strings tipo "MEXICO,MX" o "México"
  const byClave = paises.find((p) => p.clave.toUpperCase() === 'MX');
  if (byClave) return byClave;

  const byDesc =
    paises.find((p) => p.descripcion.toUpperCase().includes('MEXICO')) ??
    paises.find((p) => p.descripcion.toLowerCase().includes('méxico')) ??
    null;

  return byDesc;
}

export default function Page() {
  const router = useRouter();
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [loadingCats, setLoadingCats] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // catálogos
  const [paises, setPaises] = useState<CatalogItem[]>([]);
  const [actividades, setActividades] = useState<CatalogItem[]>([]);
  const [giros, setGiros] = useState<CatalogItem[]>([]);

  // form base
  const [empresaId, setEmpresaId] = useState<number>(1);
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>('persona_fisica');
  const [nombreEntidad, setNombreEntidad] = useState('');

  // contacto
  const [paisContactoSel, setPaisContactoSel] = useState<CatalogItem | null>(null);
  const [telefono, setTelefono] = useState('');

  // nacionalidad (separada de país contacto)
  const [nacionalidadSel, setNacionalidadSel] = useState<CatalogItem | null>(null);

  // PF
  const [pfNombres, setPfNombres] = useState('');
  const [pfApPaterno, setPfApPaterno] = useState('');
  const [pfApMaterno, setPfApMaterno] = useState('');
  const [pfFechaNac, setPfFechaNac] = useState(''); // YYYY-MM-DD opcional
  const [pfRfc, setPfRfc] = useState('');
  const [pfCurp, setPfCurp] = useState('');
  const [actividadSel, setActividadSel] = useState<CatalogItem | null>(null);

  // PM
  const [pmRfc, setPmRfc] = useState('');
  const [pmFechaConst, setPmFechaConst] = useState(''); // YYYY-MM-DD
  const [giroSel, setGiroSel] = useState<CatalogItem | null>(null);

  // representante (PM)
  const [repNombres, setRepNombres] = useState('');
  const [repApPaterno, setRepApPaterno] = useState('');
  const [repApMaterno, setRepApMaterno] = useState('');
  const [repRfc, setRepRfc] = useState('');
  const [repCurp, setRepCurp] = useState('');

  // FIDEICOMISO (iteración 1)
  const [fidDenominacion, setFidDenominacion] = useState('');
  const [fidRfcFiduciario, setFidRfcFiduciario] = useState('');
  const [fidIdentificador, setFidIdentificador] = useState('');

  const [fidRepNombres, setFidRepNombres] = useState('');
  const [fidRepApPaterno, setFidRepApPaterno] = useState('');
  const [fidRepApMaterno, setFidRepApMaterno] = useState('');
  const [fidRepFechaNac, setFidRepFechaNac] = useState(''); // input date
  const [fidRepRfc, setFidRepRfc] = useState('');
  const [fidRepCurp, setFidRepCurp] = useState('');

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        setLoadingCats(true);
        setErrorMsg(null);

        const [p, a, g] = await Promise.all([
          loadPaises(),
          loadActividadesEconomicas(),
          loadGiroMercantil()
        ]);

        if (!mounted) return;

        setPaises(p);
        setActividades(a);
        setGiros(g);

        const mx = findMexico(p);
        // defaults razonables
        setPaisContactoSel(mx);
        setNacionalidadSel(mx);
      } catch (e: any) {
        if (!mounted) return;
        setErrorMsg(e?.message || 'No se pudieron cargar catálogos');
      } finally {
        if (mounted) setLoadingCats(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, []);

  function validate(): string | null {
    if (!apiBase) return 'NEXT_PUBLIC_API_BASE_URL no está configurado';

    if (!empresaId || Number.isNaN(empresaId)) return 'empresa_id es obligatorio';
    if (!nombreEntidad.trim()) return 'Nombre / Entidad es obligatorio';

    if (!paisContactoSel) return 'País (contacto) es obligatorio';
    if (!telefono.trim()) return 'Teléfono es obligatorio';
    if (!nacionalidadSel) return 'Nacionalidad es obligatoria';

    if (tipoCliente === 'persona_fisica') {
      if (!pfNombres.trim()) return 'Nombres (PF) es obligatorio';
      if (!pfApPaterno.trim()) return 'Apellido paterno (PF) es obligatorio';
      if (!actividadSel) return 'Actividad económica (PF) es obligatoria (catálogo)';
    }

    if (tipoCliente === 'persona_moral') {
      if (!pmRfc.trim()) return 'RFC (PM) es obligatorio';
      if (!pmFechaConst.trim()) return 'Fecha constitución (PM) es obligatoria';
      if (!giroSel) return 'Giro mercantil (PM) es obligatorio (catálogo)';

      if (!repNombres.trim()) return 'Nombres del representante (PM) es obligatorio';
      if (!repApPaterno.trim()) return 'Apellido paterno del representante (PM) es obligatorio';
    }

    if (tipoCliente === 'fideicomiso') {
      if (!fidDenominacion.trim()) return 'Denominación / Razón Social del Fiduciario es obligatoria';
      if (!fidRfcFiduciario.trim()) return 'RFC del Fiduciario es obligatorio';
      if (!fidIdentificador.trim()) return 'Identificador del fideicomiso es obligatorio';

      if (!fidRepNombres.trim()) return 'Nombres del representante (Fideicomiso) es obligatorio';
      if (!fidRepApPaterno.trim()) return 'Apellido paterno del representante (Fideicomiso) es obligatorio';

      const ymd = toYYYYMMDD(fidRepFechaNac);
      if (!ymd) return 'Fecha de nacimiento del representante (Fideicomiso) es obligatoria';
      if (!/^\d{8}$/.test(ymd)) return 'Fecha de nacimiento debe ser AAAAMMDD (Fideicomiso)';

      if (!fidRepRfc.trim()) return 'RFC del representante (Fideicomiso) es obligatorio';
      if (!fidRepCurp.trim()) return 'CURP del representante (Fideicomiso) es obligatorio';
    }

    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }

    const v = validate();
    if (v) {
      setErrorMsg(v);
      return;
    }

    const datos_completos: any = {
      contacto: {
        pais: paisContactoSel?.descripcion,
        telefono: telefono.trim()
      }
    };

    if (tipoCliente === 'persona_fisica') {
      datos_completos.persona = {
        tipo: 'persona_fisica',
        nombres: pfNombres.trim(),
        apellido_paterno: pfApPaterno.trim(),
        apellido_materno: pfApMaterno.trim() || undefined,
        fecha_nacimiento: pfFechaNac ? pfFechaNac.replaceAll('-', '') : undefined,
        rfc: pfRfc.trim() || undefined,
        curp: pfCurp.trim() || undefined,
        actividad_economica: actividadSel
          ? { clave: actividadSel.clave, descripcion: actividadSel.descripcion }
          : undefined
      };
    }

    if (tipoCliente === 'persona_moral') {
      datos_completos.empresa = {
        tipo: 'persona_moral',
        rfc: pmRfc.trim(),
        fecha_constitucion: pmFechaConst,
        giro: giroSel ? giroSel.descripcion : undefined,
        giro_detalle: giroSel ? { clave: giroSel.clave, descripcion: giroSel.descripcion } : undefined
      };

      datos_completos.representante = {
        tipo: 'representante',
        nombres: repNombres.trim(),
        apellido_paterno: repApPaterno.trim(),
        apellido_materno: repApMaterno.trim() || undefined,
        rfc: repRfc.trim() || undefined,
        curp: repCurp.trim() || undefined
      };
    }

    if (tipoCliente === 'fideicomiso') {
      datos_completos.fideicomiso = {
        identificador: fidIdentificador.trim(),
        rfc_fiduciario: fidRfcFiduciario.trim(),
        denominacion_fiduciario: fidDenominacion.trim()
      };

      const nombreCompleto = `${fidRepNombres} ${fidRepApPaterno} ${fidRepApMaterno}`.replace(/\s+/g, ' ').trim();
      datos_completos.representante = {
        nombre_completo: nombreCompleto,
        nombres: fidRepNombres.trim(),
        apellido_paterno: fidRepApPaterno.trim(),
        apellido_materno: fidRepApMaterno.trim() || undefined,
        fecha_nacimiento: toYYYYMMDD(fidRepFechaNac),
        rfc: fidRepRfc.trim(),
        curp: fidRepCurp.trim()
      };
    }

    const payload = {
      empresa_id: empresaId,
      tipo_cliente: tipoCliente,
      nombre_entidad: nombreEntidad.trim(),
      nacionalidad: nacionalidadSel?.descripcion ?? '',
      datos_completos
    };

    try {
      setSubmitting(true);

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
        if (res.status === 409) {
          setErrorMsg(data?.error || 'Cliente duplicado para esa empresa.');
          return;
        }
        if (res.status === 401) {
          setErrorMsg(data?.error || 'Sesión inválida. Vuelve a iniciar sesión.');
          router.replace('/login');
          return;
        }
        setErrorMsg(data?.error || `Error HTTP ${res.status}`);
        return;
      }

      const id = data?.cliente?.id ?? data?.id ?? null;
      if (id) {
        router.push(`/cliente/clientes/${id}`);
      } else {
        router.push('/cliente/clientes');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error de red');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Registrar Cliente</h1>
            <p className="text-sm text-gray-500">
              Selecciona el tipo de cliente y captura los datos mínimos requeridos (iteración 1).
            </p>
          </div>

          <button className="rounded border px-4 py-2 text-sm" onClick={() => router.push('/cliente/clientes')}>
            Volver
          </button>
        </div>

        {loadingCats ? <div className="text-sm">Cargando catálogos…</div> : null}

        {errorMsg ? (
          <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Datos base */}
          <div className="rounded border p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">Empresa ID *</label>
                <input
                  className="w-full rounded border p-2"
                  type="number"
                  value={empresaId}
                  onChange={(e) => setEmpresaId(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Tipo de cliente *</label>
                <select
                  className="w-full rounded border p-2"
                  value={tipoCliente}
                  onChange={(e) => setTipoCliente(e.target.value as TipoCliente)}
                >
                  <option value="persona_fisica">Persona Física</option>
                  <option value="persona_moral">Persona Moral</option>
                  <option value="fideicomiso">Fideicomiso</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">Nombre / Entidad *</label>
              <input
                className="w-full rounded border p-2"
                value={nombreEntidad}
                onChange={(e) => setNombreEntidad(e.target.value)}
                placeholder={
                  tipoCliente === 'persona_fisica'
                    ? 'Ej. Juan Pérez López'
                    : tipoCliente === 'persona_moral'
                    ? 'Ej. Comercializadora XYZ S.A. de C.V.'
                    : 'Ej. Fideicomiso ABC'
                }
              />
            </div>

            <SearchSelect
              label="Nacionalidad"
              required
              items={paises}
              value={nacionalidadSel}
              onChange={setNacionalidadSel}
              placeholder="Selecciona nacionalidad…"
            />
          </div>

          {/* Contacto */}
          <div className="rounded border p-4 space-y-3">
            <div className="font-medium">Contacto</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SearchSelect
                label="País (contacto)"
                required
                items={paises}
                value={paisContactoSel}
                onChange={setPaisContactoSel}
                placeholder="Selecciona país…"
              />

              <div>
                <label className="block text-sm font-medium">
                  Teléfono <span className="text-red-600">*</span>
                </label>
                <input
                  className="w-full rounded border p-2"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej. 5512345678"
                />
              </div>
            </div>
          </div>

          {/* PF */}
          {tipoCliente === 'persona_fisica' && (
            <div className="rounded border p-4 space-y-4">
              <div className="font-medium">{labelTipo(tipoCliente)}</div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium">
                    Nombres <span className="text-red-600">*</span>
                  </label>
                  <input className="w-full rounded border p-2" value={pfNombres} onChange={(e) => setPfNombres(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Apellido paterno <span className="text-red-600">*</span>
                  </label>
                  <input className="w-full rounded border p-2" value={pfApPaterno} onChange={(e) => setPfApPaterno(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Apellido materno</label>
                  <input className="w-full rounded border p-2" value={pfApMaterno} onChange={(e) => setPfApMaterno(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium">Fecha de nacimiento</label>
                  <input type="date" className="w-full rounded border p-2" value={pfFechaNac} onChange={(e) => setPfFechaNac(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium">RFC</label>
                  <input className="w-full rounded border p-2" value={pfRfc} onChange={(e) => setPfRfc(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium">CURP</label>
                  <input className="w-full rounded border p-2" value={pfCurp} onChange={(e) => setPfCurp(e.target.value)} />
                </div>
              </div>

              <SearchSelect
                label="Actividad económica"
                required
                items={actividades}
                value={actividadSel}
                onChange={setActividadSel}
                placeholder="Selecciona actividad…"
              />
            </div>
          )}

          {/* PM */}
          {tipoCliente === 'persona_moral' && (
            <div className="rounded border p-4 space-y-4">
              <div className="font-medium">{labelTipo(tipoCliente)}</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium">
                    RFC <span className="text-red-600">*</span>
                  </label>
                  <input className="w-full rounded border p-2" value={pmRfc} onChange={(e) => setPmRfc(e.target.value)} />
                </div>

                <div>
                  <label className="block text-sm font-medium">
                    Fecha constitución <span className="text-red-600">*</span>
                  </label>
                  <input type="date" className="w-full rounded border p-2" value={pmFechaConst} onChange={(e) => setPmFechaConst(e.target.value)} />
                </div>
              </div>

              <SearchSelect
                label="Giro mercantil"
                required
                items={giros}
                value={giroSel}
                onChange={setGiroSel}
                placeholder="Selecciona giro…"
              />

              <div className="rounded border p-3 space-y-3">
                <div className="font-medium">Representante legal</div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium">
                      Nombres <span className="text-red-600">*</span>
                    </label>
                    <input className="w-full rounded border p-2" value={repNombres} onChange={(e) => setRepNombres(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Apellido paterno <span className="text-red-600">*</span>
                    </label>
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

          {/* FIDEICOMISO */}
          {tipoCliente === 'fideicomiso' && (
            <div className="rounded border p-4 space-y-4">
              <div className="font-medium">{labelTipo(tipoCliente)} (iteración 1)</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium">
                    Denominación / Razón Social del Fiduciario <span className="text-red-600">*</span>
                  </label>
                  <input
                    className="w-full rounded border p-2"
                    value={fidDenominacion}
                    onChange={(e) => setFidDenominacion(e.target.value)}
                    placeholder="Ej. Fiduciario Ejemplo S.A."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    RFC del Fiduciario <span className="text-red-600">*</span>
                  </label>
                  <input
                    className="w-full rounded border p-2"
                    value={fidRfcFiduciario}
                    onChange={(e) => setFidRfcFiduciario(e.target.value)}
                    placeholder="XAXX010101000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">
                  Identificador del fideicomiso <span className="text-red-600">*</span>
                </label>
                <input
                  className="w-full rounded border p-2"
                  value={fidIdentificador}
                  onChange={(e) => setFidIdentificador(e.target.value)}
                  placeholder="Ej. FID-0001"
                />
              </div>

              <div className="rounded border p-3 space-y-3">
                <div className="font-medium">Representante / Apoderado legal</div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium">
                      Nombre(s) <span className="text-red-600">*</span>
                    </label>
                    <input className="w-full rounded border p-2" value={fidRepNombres} onChange={(e) => setFidRepNombres(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Apellido paterno <span className="text-red-600">*</span>
                    </label>
                    <input className="w-full rounded border p-2" value={fidRepApPaterno} onChange={(e) => setFidRepApPaterno(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Apellido materno</label>
                    <input className="w-full rounded border p-2" value={fidRepApMaterno} onChange={(e) => setFidRepApMaterno(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium">
                      Fecha nacimiento <span className="text-red-600">*</span>
                    </label>
                    <input type="date" className="w-full rounded border p-2" value={fidRepFechaNac} onChange={(e) => setFidRepFechaNac(e.target.value)} />
                    <div className="text-xs opacity-60 mt-1">Se enviará como AAAAMMDD</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      RFC <span className="text-red-600">*</span>
                    </label>
                    <input className="w-full rounded border p-2" value={fidRepRfc} onChange={(e) => setFidRepRfc(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      CURP <span className="text-red-600">*</span>
                    </label>
                    <input className="w-full rounded border p-2" value={fidRepCurp} onChange={(e) => setFidRepCurp(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="rounded border px-4 py-2 text-sm">
              {submitting ? 'Registrando…' : 'Registrar'}
            </button>
            <button type="button" className="rounded border px-4 py-2 text-sm" onClick={() => router.push('/cliente/clientes')}>
              Cancelar
            </button>
          </div>

          <div className="rounded border p-4">
            <details>
              <summary className="cursor-pointer select-none font-medium">Debug: payload (preview)</summary>
              <pre className="mt-3 text-xs overflow-auto whitespace-pre-wrap">
                {JSON.stringify(
                  {
                    empresa_id: empresaId,
                    tipo_cliente: tipoCliente,
                    nombre_entidad: nombreEntidad,
                    nacionalidad: nacionalidadSel?.descripcion,
                    datos_completos_preview: {
                      contacto: { pais: paisContactoSel?.descripcion, telefono },
                      pf: tipoCliente === 'persona_fisica' ? { pfNombres, pfApPaterno, actividadSel } : undefined,
                      pm: tipoCliente === 'persona_moral' ? { pmRfc, pmFechaConst, giroSel } : undefined,
                      fideicomiso:
                        tipoCliente === 'fideicomiso'
                          ? { fidDenominacion, fidRfcFiduciario, fidIdentificador, fidRepNombres }
                          : undefined
                    }
                  },
                  null,
                  2
                )}
              </pre>
            </details>
          </div>
        </form>
      </div>
    </div>
  );
}
