'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadCatalogo, type CatalogItem } from '@/lib/catalogos';

type TipoCliente = 'persona_fisica' | 'persona_moral' | 'fideicomiso';

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || '';
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function labelTipo(t: TipoCliente) {
  if (t === 'persona_fisica') return 'Persona Física';
  if (t === 'persona_moral') return 'Persona Moral';
  return 'Fideicomiso';
}

function asString(v: any) {
  return (v ?? '').toString();
}

function SearchSelect(props: {
  label: string;
  items: CatalogItem[];
  value: CatalogItem | null;
  onChange: (v: CatalogItem | null) => void;
  placeholder?: string;
}) {
  const { label, items, value, onChange, placeholder } = props;
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items.slice(0, 200);
    return items
      .filter((x) => `${x.clave} ${x.descripcion}`.toLowerCase().includes(qq))
      .slice(0, 200);
  }, [items, q]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      <input
        className="w-full rounded border p-2 text-sm"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder || 'Escribe para filtrar...'}
      />
      <div className="max-h-56 overflow-auto rounded border">
        {filtered.map((it) => {
          const active = value?.clave === it.clave && value?.descripcion === it.descripcion;
          return (
            <button
              type="button"
              key={`${it.clave}-${it.descripcion}`}
              className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 ${
                active ? 'bg-black/5' : ''
              }`}
              onClick={() => onChange(it)}
            >
              <div className="font-mono text-xs opacity-70">{it.clave}</div>
              <div>{it.descripcion}</div>
            </button>
          );
        })}
      </div>

      {value ? (
        <div className="text-xs opacity-70">
          Seleccionado: <span className="font-mono">{value.clave}</span> — {value.descripcion}{' '}
          <button type="button" className="underline ml-2" onClick={() => onChange(null)}>
            limpiar
          </button>
        </div>
      ) : (
        <div className="text-xs opacity-70">Sin selección</div>
      )}
    </div>
  );
}

function PlainSelect(props: {
  label: string;
  items: CatalogItem[];
  value: CatalogItem | null;
  onChange: (v: CatalogItem | null) => void;
  placeholder?: string;
}) {
  const { label, items, value, onChange, placeholder } = props;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      <select
        className="w-full rounded border p-2 text-sm"
        value={value ? `${value.clave}||${value.descripcion}` : ''}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) return onChange(null);
          const [clave, descripcion] = v.split('||');
          onChange({ clave, descripcion });
        }}
      >
        <option value="">{placeholder || 'Selecciona...'}</option>
        {items.map((it) => (
          <option key={`${it.clave}-${it.descripcion}`} value={`${it.clave}||${it.descripcion}`}>
            {it.descripcion}
          </option>
        ))}
      </select>

      {value ? (
        <div className="text-xs opacity-70">
          Seleccionado: <span className="font-mono">{value.clave}</span> — {value.descripcion}{' '}
          <button type="button" className="underline ml-2" onClick={() => onChange(null)}>
            limpiar
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CatalogField(props: {
  label: string;
  items: CatalogItem[];
  value: CatalogItem | null;
  onChange: (v: CatalogItem | null) => void;
  defaultBuscar?: boolean;
  placeholder?: string;
}) {
  const { label, items, value, onChange, defaultBuscar, placeholder } = props;
  const [buscar, setBuscar] = useState(!!defaultBuscar);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">{label}</div>
        <label className="flex items-center gap-2 text-xs opacity-80">
          <input type="checkbox" checked={buscar} onChange={(e) => setBuscar(e.target.checked)} />
          Buscar en lista
        </label>
      </div>

      {buscar ? (
        <SearchSelect label="" items={items} value={value} onChange={onChange} placeholder={placeholder} />
      ) : (
        <PlainSelect label="" items={items} value={value} onChange={onChange} placeholder={placeholder} />
      )}
    </div>
  );
}

export default function RegistrarClientePage() {
  const apiBase = useMemo(() => getApiBase(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [tipo, setTipo] = useState<TipoCliente>('persona_fisica');

  // Empresas (para admin/consultor)
  const [empresas, setEmpresas] = useState<Array<{ id: number; nombre_legal: string }>>([]);
  const [empresaId, setEmpresaId] = useState<number>(1);

  // Campos base
  const [nombreEntidad, setNombreEntidad] = useState('');
  const [estado] = useState<'activo' | 'inactivo'>('activo');

  // Catálogos
  const [paises, setPaises] = useState<CatalogItem[]>([]);
  const [actividades, setActividades] = useState<CatalogItem[]>([]);
  const [giros, setGiros] = useState<CatalogItem[]>([]);

  // Selecciones (SEPARADAS)
  const [nacionalidadSel, setNacionalidadSel] = useState<CatalogItem | null>(null);
  const [paisContactoSel, setPaisContactoSel] = useState<CatalogItem | null>(null);
  const [actividadSel, setActividadSel] = useState<CatalogItem | null>(null);
  const [giroSel, setGiroSel] = useState<CatalogItem | null>(null);

  // Contacto
  const [telefono, setTelefono] = useState('');

  // PF
  const [pfNombres, setPfNombres] = useState('');
  const [pfApPaterno, setPfApPaterno] = useState('');
  const [pfApMaterno, setPfApMaterno] = useState('');

  // PM
  const [pmRfc, setPmRfc] = useState('');
  const [pmFechaConst, setPmFechaConst] = useState(''); // YYYY-MM-DD
  const [repNombres, setRepNombres] = useState('');
  const [repApPaterno, setRepApPaterno] = useState('');
  const [repApMaterno, setRepApMaterno] = useState('');
  const [repRfc, setRepRfc] = useState('');
  const [repCurp, setRepCurp] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        setMsg(null);

        const [p, a, g] = await Promise.all([
          loadCatalogo('sat/c_pais'),
          loadCatalogo('sat/c_actividad_economica'),
          loadCatalogo('internos/giro_mercantil')
        ]);

        setPaises(p);
        setActividades(a);
        setGiros(g);

        // defaults suaves: país contacto = México si existe
        const mx = p.find((x) => x.descripcion.toLowerCase().includes('méxico') || x.descripcion.toLowerCase().includes('mexico'));
        if (mx) {
          setPaisContactoSel(mx);
          // nacionalidad default también a México, pero YA no va “amarrada”
          setNacionalidadSel(mx);
        }

        // Intentar cargar empresas (solo si tu backend lo permite al rol)
        const resEmp = await fetch(`${apiBase}/api/admin/empresas`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        });
        const dataEmp = await resEmp.json().catch(() => ({}));
        if (resEmp.ok && Array.isArray(dataEmp?.empresas)) {
          const list = dataEmp.empresas.map((e: any) => ({
            id: Number(e.id),
            nombre_legal: asString(e.nombre_legal)
          }));
          setEmpresas(list);
          if (list[0]?.id) setEmpresaId(list[0].id);
        }
      } catch (e: any) {
        setErr(e?.message || 'Error cargando catálogos');
      } finally {
        setLoading(false);
      }
    })();
  }, [apiBase, router]);

  function validate() {
    if (!empresaId) return 'empresa_id es obligatorio';
    if (!nombreEntidad.trim()) return 'Nombre / Entidad es obligatorio';
    if (!paisContactoSel) return 'País (contacto) es obligatorio';
    if (!telefono.trim()) return 'Teléfono es obligatorio';

    // Nacionalidad: la hacemos obligatoria porque tú lo estás pidiendo con catálogo
    if (!nacionalidadSel) return 'Nacionalidad es obligatoria';

    if (tipo === 'persona_fisica') {
      if (!pfNombres.trim()) return 'Nombres (PF) es obligatorio';
      if (!pfApPaterno.trim()) return 'Apellido paterno (PF) es obligatorio';
      if (!actividadSel) return 'Actividad económica (PF) es obligatoria';
    }

    if (tipo === 'persona_moral') {
      if (!pmRfc.trim()) return 'RFC (PM) es obligatorio';
      if (!pmFechaConst.trim()) return 'Fecha constitución (PM) es obligatoria';
      if (!giroSel) return 'Giro mercantil (PM) es obligatorio';
      if (!repNombres.trim()) return 'Nombres representante es obligatorio';
      if (!repApPaterno.trim()) return 'Apellido paterno representante es obligatorio';
    }

    return null;
  }

  function buildPayload() {
    const datos_completos: any = {
      contacto: {
        pais: paisContactoSel?.descripcion || null,
        telefono: telefono.trim()
      }
    };

    if (tipo === 'persona_fisica') {
      datos_completos.persona = {
        tipo: 'persona_fisica',
        nombres: pfNombres.trim(),
        apellido_paterno: pfApPaterno.trim(),
        apellido_materno: pfApMaterno.trim() || null,
        actividad_economica: actividadSel
          ? { clave: actividadSel.clave, descripcion: actividadSel.descripcion }
          : null
      };
    }

    if (tipo === 'persona_moral') {
      datos_completos.empresa = {
        tipo: 'persona_moral',
        rfc: pmRfc.trim(),
        fecha_constitucion: pmFechaConst,
        giro_mercantil: giroSel ? { clave: giroSel.clave, descripcion: giroSel.descripcion } : null
      };
      datos_completos.representante = {
        nombres: repNombres.trim(),
        apellido_paterno: repApPaterno.trim(),
        apellido_materno: repApMaterno.trim() || null,
        rfc: repRfc.trim() || null,
        curp: repCurp.trim() || null
      };
    }

    return {
      empresa_id: empresaId,
      tipo_cliente: tipo,
      nombre_entidad: nombreEntidad.trim(),
      // OJO: nacionalidad ES del cliente; NO es el país de contacto
      nacionalidad: nacionalidadSel?.descripcion || null,
      estado,
      datos_completos
    };
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    const v = validate();
    if (v) return setErr(v);

    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/cliente/registrar-cliente`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildPayload())
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || `Error HTTP ${res.status}`);
        return;
      }

      setMsg('Cliente registrado ✅');

      const newId = data?.cliente?.id ?? data?.id ?? null;
      if (newId) router.push(`/cliente/clientes/${newId}`);
      else router.push('/cliente/clientes');
    } catch (e: any) {
      setErr(e?.message || 'Error de red');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-sm">Cargando formulario...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Registrar Cliente</h1>
        <button className="rounded border px-4 py-2 text-sm" onClick={() => router.push('/cliente/clientes')}>
          Volver
        </button>
      </div>

      {msg && <div className="rounded border p-3 text-sm">{msg}</div>}
      {err && <div className="rounded border p-3 text-sm">{err}</div>}

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="rounded border p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium">Tipo de cliente</label>
              <select className="w-full rounded border p-2 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value as TipoCliente)}>
                <option value="persona_fisica">Persona Física</option>
                <option value="persona_moral">Persona Moral</option>
                <option value="fideicomiso">Fideicomiso (pendiente)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium">Nombre / Entidad *</label>
              <input className="w-full rounded border p-2 text-sm" value={nombreEntidad} onChange={(e) => setNombreEntidad(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium">Empresa *</label>
              {empresas.length > 0 ? (
                <select
                  className="w-full rounded border p-2 text-sm"
                  value={empresaId}
                  onChange={(e) => setEmpresaId(Number(e.target.value))}
                >
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      #{e.id} — {e.nombre_legal}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  className="w-full rounded border p-2 text-sm"
                  value={empresaId}
                  onChange={(e) => setEmpresaId(Number(e.target.value))}
                />
              )}
              <div className="text-xs opacity-70 mt-1">
                Si no carga la lista, tu rol no tiene acceso a /api/admin/empresas (o el token no corresponde).
              </div>
            </div>

            <div className="md:col-span-2">
              <CatalogField
                label="Nacionalidad *"
                items={paises}
                value={nacionalidadSel}
                onChange={setNacionalidadSel}
                defaultBuscar={true}
                placeholder="Selecciona nacionalidad..."
              />
            </div>
          </div>
        </div>

        <div className="rounded border p-4 space-y-3">
          <div className="font-medium">Contacto</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CatalogField
              label="País (contacto) *"
              items={paises}
              value={paisContactoSel}
              onChange={setPaisContactoSel}
              defaultBuscar={true}
              placeholder="Selecciona país..."
            />
            <div>
              <label className="block text-sm font-medium">Teléfono *</label>
              <input className="w-full rounded border p-2 text-sm" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
          </div>
        </div>

        {tipo === 'persona_fisica' && (
          <div className="rounded border p-4 space-y-3">
            <div className="font-medium">{labelTipo(tipo)}</div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium">Nombres *</label>
                <input className="w-full rounded border p-2 text-sm" value={pfNombres} onChange={(e) => setPfNombres(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium">Apellido paterno *</label>
                <input className="w-full rounded border p-2 text-sm" value={pfApPaterno} onChange={(e) => setPfApPaterno(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium">Apellido materno</label>
                <input className="w-full rounded border p-2 text-sm" value={pfApMaterno} onChange={(e) => setPfApMaterno(e.target.value)} />
              </div>
            </div>

            <CatalogField
              label="Actividad económica (PF) *"
              items={actividades}
              value={actividadSel}
              onChange={setActividadSel}
              defaultBuscar={true}
              placeholder="Selecciona actividad..."
            />
          </div>
        )}

        {tipo === 'persona_moral' && (
          <div className="rounded border p-4 space-y-4">
            <div className="font-medium">{labelTipo(tipo)}</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">RFC *</label>
                <input className="w-full rounded border p-2 text-sm" value={pmRfc} onChange={(e) => setPmRfc(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium">Fecha constitución *</label>
                <input type="date" className="w-full rounded border p-2 text-sm" value={pmFechaConst} onChange={(e) => setPmFechaConst(e.target.value)} />
              </div>
            </div>

            <CatalogField
              label="Giro mercantil (PM) *"
              items={giros}
              value={giroSel}
              onChange={setGiroSel}
              defaultBuscar={true}
              placeholder="Selecciona giro..."
            />

            <div className="rounded border p-3 space-y-3">
              <div className="font-medium">Representante *</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium">Nombres *</label>
                  <input className="w-full rounded border p-2 text-sm" value={repNombres} onChange={(e) => setRepNombres(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Apellido paterno *</label>
                  <input className="w-full rounded border p-2 text-sm" value={repApPaterno} onChange={(e) => setRepApPaterno(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Apellido materno</label>
                  <input className="w-full rounded border p-2 text-sm" value={repApMaterno} onChange={(e) => setRepApMaterno(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium">RFC</label>
                  <input className="w-full rounded border p-2 text-sm" value={repRfc} onChange={(e) => setRepRfc(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium">CURP</label>
                  <input className="w-full rounded border p-2 text-sm" value={repCurp} onChange={(e) => setRepCurp(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {tipo === 'fideicomiso' && (
          <div className="rounded border p-4 text-sm">
            Fideicomiso: lo armamos en el siguiente paso (campos + validaciones).
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="rounded border px-4 py-2 text-sm">
            {saving ? 'Guardando...' : 'Registrar'}
          </button>
          <button type="button" className="rounded border px-4 py-2 text-sm" onClick={() => router.push('/cliente/clientes')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
