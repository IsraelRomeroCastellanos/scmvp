'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CatalogItem } from '../../../lib/catalogos';
import { loadActividadesEconomicas, loadGiroMercantil, loadPaises } from '../../../lib/catalogos';

type Empresa = { id: number; nombre_legal: string };
type TipoCliente = 'persona_fisica' | 'persona_moral' | 'fideicomiso';

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || '';
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function findByText(items: CatalogItem[], text: string) {
  const t = text.toLowerCase();
  return items.find((x) => x.descripcion.toLowerCase().includes(t)) || null;
}

export default function RegistrarClientePage() {
  const router = useRouter();
  const apiBase = useMemo(() => getApiBase(), []);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Empresas (solo útil para admin/consultor)
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState<number | ''>('');

  // Catálogos
  const [paises, setPaises] = useState<CatalogItem[]>([]);
  const [actividades, setActividades] = useState<CatalogItem[]>([]);
  const [giros, setGiros] = useState<CatalogItem[]>([]);
  const [catalogErr, setCatalogErr] = useState<string | null>(null);

  // Tipo
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>('persona_fisica');

  // Base
  const [nombreEntidad, setNombreEntidad] = useState('');
  const [nacionalidadClave, setNacionalidadClave] = useState<string>(''); // selección única
  const [paisContactoClave, setPaisContactoClave] = useState<string>(''); // selección única
  const [telefono, setTelefono] = useState('');

  // PF
  const [pfNombres, setPfNombres] = useState('');
  const [pfApPaterno, setPfApPaterno] = useState('');
  const [pfApMaterno, setPfApMaterno] = useState('');
  const [pfFechaNac, setPfFechaNac] = useState(''); // YYYY-MM-DD
  const [pfRfc, setPfRfc] = useState('');
  const [pfCurp, setPfCurp] = useState('');
  const [pfOcupacion, setPfOcupacion] = useState(''); // texto libre (opcional)

  // Actividad económica (dropdown + modo buscar)
  const [actModoBuscar, setActModoBuscar] = useState(false);
  const [actQuery, setActQuery] = useState('');
  const [actClave, setActClave] = useState<string>(''); // selección por clave

  // PM
  const [pmRfc, setPmRfc] = useState('');
  const [pmFechaConst, setPmFechaConst] = useState(''); // YYYY-MM-DD

  // Giro mercantil (dropdown + modo buscar)
  const [giroModoBuscar, setGiroModoBuscar] = useState(false);
  const [giroQuery, setGiroQuery] = useState('');
  const [giroClave, setGiroClave] = useState<string>(''); // selección por clave

  // Representante (PM)
  const [repNombres, setRepNombres] = useState('');
  const [repApPaterno, setRepApPaterno] = useState('');
  const [repApMaterno, setRepApMaterno] = useState('');
  const [repRfc, setRepRfc] = useState('');
  const [repCurp, setRepCurp] = useState('');

  // Cargar catálogos locales (public/)
  useEffect(() => {
    (async () => {
      try {
        setCatalogErr(null);
        const [p, a, g] = await Promise.all([loadPaises(), loadActividadesEconomicas(), loadGiroMercantil()]);
        setPaises(p);
        setActividades(a);
        setGiros(g);

        // defaults: si existe México, lo preseleccionamos
        const mx = findByText(p, 'mexico') || findByText(p, 'méxico') || p[0] || null;
        if (mx) {
          setNacionalidadClave((prev) => prev || mx.clave);
          setPaisContactoClave((prev) => prev || mx.clave);
        }
      } catch (e: any) {
        setCatalogErr(e?.message || 'No se pudieron cargar catálogos locales');
      }
    })();
  }, []);

  // Cargar empresas (si no eres admin/consultor, podría 403 y lo ignoramos)
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/admin/empresas`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data?.empresas)) setEmpresas(data.empresas);
      } catch {
        // no bloquea registrar cliente
      }
    })();
  }, [apiBase]);

  function getItemByClave(list: CatalogItem[], clave: string) {
    return list.find((x) => x.clave === clave) || null;
  }

  const actividadesFiltradas = useMemo(() => {
    if (!actModoBuscar) return actividades;
    const q = actQuery.trim().toLowerCase();
    if (!q) return actividades;
    return actividades.filter((x) => x.descripcion.toLowerCase().includes(q) || x.clave.toLowerCase().includes(q));
  }, [actModoBuscar, actQuery, actividades]);

  const girosFiltrados = useMemo(() => {
    if (!giroModoBuscar) return giros;
    const q = giroQuery.trim().toLowerCase();
    if (!q) return giros;
    return giros.filter((x) => x.descripcion.toLowerCase().includes(q) || x.clave.toLowerCase().includes(q));
  }, [giroModoBuscar, giroQuery, giros]);

  function validate() {
    if (!nombreEntidad.trim()) return 'Nombre / Entidad es obligatorio';
    if (!telefono.trim()) return 'Teléfono es obligatorio';

    if (!paisContactoClave) return 'Selecciona País (contacto)';
    if (!nacionalidadClave) return 'Selecciona Nacionalidad';

    // si el usuario es admin/consultor, normalmente debe elegir empresa
    if (empresas.length > 0 && empresaId === '') return 'Selecciona una empresa';

    if (tipoCliente === 'persona_fisica') {
      if (!pfNombres.trim()) return 'Nombres (PF) es obligatorio';
      if (!pfApPaterno.trim()) return 'Apellido paterno (PF) es obligatorio';
      if (!actClave) return 'Selecciona Actividad económica';
    }

    if (tipoCliente === 'persona_moral') {
      if (!pmRfc.trim()) return 'RFC (PM) es obligatorio';
      if (!pmFechaConst.trim()) return 'Fecha constitución (PM) es obligatoria';
      if (!giroClave) return 'Selecciona Giro mercantil';
      if (!repNombres.trim()) return 'Nombres representante es obligatorio';
      if (!repApPaterno.trim()) return 'Apellido paterno representante es obligatorio';
    }

    if (tipoCliente === 'fideicomiso') {
      return 'Fideicomiso: pendiente (DB actualmente solo permite persona_fisica | persona_moral).';
    }

    return null;
  }

  function buildPayload() {
    const paisContacto = getItemByClave(paises, paisContactoClave);
    const nacionalidad = getItemByClave(paises, nacionalidadClave);

    const actSelected = actClave ? getItemByClave(actividades, actClave) : null;
    const giroSelected = giroClave ? getItemByClave(giros, giroClave) : null;

    const datos_completos: any = {
      contacto: {
        pais: paisContacto?.descripcion || null,
        pais_clave: paisContacto?.clave || null,
        telefono: telefono.trim()
      },
      nacionalidad: nacionalidad?.descripcion || null,
      nacionalidad_clave: nacionalidad?.clave || null
    };

    if (tipoCliente === 'persona_fisica') {
      datos_completos.persona = {
        tipo: 'persona_fisica',
        nombres: pfNombres.trim(),
        apellido_paterno: pfApPaterno.trim(),
        apellido_materno: pfApMaterno.trim() || null,
        fecha_nacimiento: pfFechaNac || null,
        rfc: pfRfc.trim() || null,
        curp: pfCurp.trim() || null,
        ocupacion: pfOcupacion.trim() || null,
        actividad_economica: actSelected ? { clave: actSelected.clave, descripcion: actSelected.descripcion } : null
      };
    }

    if (tipoCliente === 'persona_moral') {
      datos_completos.empresa = {
        tipo: 'persona_moral',
        rfc: pmRfc.trim(),
        fecha_constitucion: pmFechaConst,
        giro_mercantil: giroSelected ? { clave: giroSelected.clave, descripcion: giroSelected.descripcion } : null
      };
      datos_completos.representante = {
        nombres: repNombres.trim(),
        apellido_paterno: repApPaterno.trim(),
        apellido_materno: repApMaterno.trim() || null,
        rfc: repRfc.trim() || null,
        curp: repCurp.trim() || null
      };
    }

    const payload: any = {
      tipo_cliente: tipoCliente,
      nombre_entidad: nombreEntidad.trim(),
      nacionalidad: nacionalidad?.descripcion || null,
      datos_completos
    };

    if (empresaId !== '') payload.empresa_id = Number(empresaId);

    return payload;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    const v = validate();
    if (v) {
      setErr(v);
      return;
    }

    const token = getToken();
    if (!token) {
      setErr('No hay sesión (token). Inicia sesión nuevamente.');
      router.replace('/login');
      return;
    }

    setLoading(true);
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

      const id = data?.cliente?.id;
      setMsg(`Cliente creado ✅ (id: ${id ?? 'N/A'})`);
      if (id) router.push(`/cliente/clientes/${id}`);
      else router.push('/cliente/clientes');
    } catch (e: any) {
      setErr(e?.message || 'Error de red');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Registrar Cliente</h1>

      {catalogErr && (
        <div className="mb-4 rounded border p-3 text-sm">
          <div className="font-medium mb-1">⚠️ Catálogos no disponibles</div>
          <div className="opacity-80">{catalogErr}</div>
        </div>
      )}

      {msg && <div className="mb-4 rounded border p-3 text-sm">{msg}</div>}
      {err && <div className="mb-4 rounded border p-3 text-sm">{err}</div>}

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="rounded border p-4 space-y-3">
          <label className="block text-sm font-medium">Tipo de cliente</label>
          <select
            className="w-full rounded border p-2"
            value={tipoCliente}
            onChange={(e) => {
              setTipoCliente(e.target.value as TipoCliente);
              setErr(null);
              setMsg(null);
            }}
          >
            <option value="persona_fisica">Persona Física</option>
            <option value="persona_moral">Persona Moral</option>
            <option value="fideicomiso">Fideicomiso (pendiente)</option>
          </select>
        </div>

        {empresas.length > 0 && (
          <div className="rounded border p-4 space-y-3">
            <label className="block text-sm font-medium">Empresa</label>
            <select
              className="w-full rounded border p-2"
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Selecciona...</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.id} — {e.nombre_legal}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="rounded border p-4 space-y-3">
          <label className="block text-sm font-medium">Nombre / Entidad</label>
          <input className="w-full rounded border p-2" value={nombreEntidad} onChange={(e) => setNombreEntidad(e.target.value)} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Nacionalidad</label>
              <select
                className="w-full rounded border p-2"
                value={nacionalidadClave}
                onChange={(e) => setNacionalidadClave(e.target.value)}
                disabled={paises.length === 0}
              >
                <option value="">Selecciona...</option>
                {paises.map((p) => (
                  <option key={p.clave} value={p.clave}>
                    {p.descripcion}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">País (contacto)</label>
              <select
                className="w-full rounded border p-2"
                value={paisContactoClave}
                onChange={(e) => setPaisContactoClave(e.target.value)}
                disabled={paises.length === 0}
              >
                <option value="">Selecciona...</option>
                {paises.map((p) => (
                  <option key={p.clave} value={p.clave}>
                    {p.descripcion}
                  </option>
                ))}
              </select>
              <p className="text-xs opacity-70">Obligatorio por validación BE</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Teléfono (obligatorio)</label>
            <input className="w-full rounded border p-2" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </div>
        </div>

        {tipoCliente === 'persona_fisica' && (
          <div className="rounded border p-4 space-y-4">
            <h2 className="text-lg font-medium">Persona Física</h2>

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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium">Fecha nacimiento</label>
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

            <div>
              <label className="block text-sm font-medium">Ocupación (opcional)</label>
              <input className="w-full rounded border p-2" value={pfOcupacion} onChange={(e) => setPfOcupacion(e.target.value)} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="block text-sm font-medium">Actividad económica *</label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={actModoBuscar}
                    onChange={(e) => {
                      setActModoBuscar(e.target.checked);
                      setActQuery('');
                    }}
                  />
                  Buscar
                </label>
              </div>

              {actModoBuscar && (
                <input
                  className="w-full rounded border p-2"
                  value={actQuery}
                  onChange={(e) => setActQuery(e.target.value)}
                  placeholder="Filtra actividad…"
                  disabled={actividades.length === 0}
                />
              )}

              <select
                className="w-full rounded border p-2"
                value={actClave}
                onChange={(e) => setActClave(e.target.value)}
                disabled={actividadesFiltradas.length === 0}
              >
                <option value="">Selecciona...</option>
                {actividadesFiltradas.map((a) => (
                  <option key={a.clave} value={a.clave}>
                    {a.descripcion}
                  </option>
                ))}
              </select>
              <p className="text-xs opacity-70">Tip: activa “Buscar” si la lista es grande.</p>
            </div>
          </div>
        )}

        {tipoCliente === 'persona_moral' && (
          <div className="rounded border p-4 space-y-4">
            <h2 className="text-lg font-medium">Persona Moral</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">RFC *</label>
                <input className="w-full rounded border p-2" value={pmRfc} onChange={(e) => setPmRfc(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium">Fecha constitución *</label>
                <input type="date" className="w-full rounded border p-2" value={pmFechaConst} onChange={(e) => setPmFechaConst(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="block text-sm font-medium">Giro mercantil *</label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={giroModoBuscar}
                    onChange={(e) => {
                      setGiroModoBuscar(e.target.checked);
                      setGiroQuery('');
                    }}
                  />
                  Buscar
                </label>
              </div>

              {giroModoBuscar && (
                <input
                  className="w-full rounded border p-2"
                  value={giroQuery}
                  onChange={(e) => setGiroQuery(e.target.value)}
                  placeholder="Filtra giro…"
                  disabled={giros.length === 0}
                />
              )}

              <select
                className="w-full rounded border p-2"
                value={giroClave}
                onChange={(e) => setGiroClave(e.target.value)}
                disabled={girosFiltrados.length === 0}
              >
                <option value="">Selecciona...</option>
                {girosFiltrados.map((g) => (
                  <option key={g.clave} value={g.clave}>
                    {g.descripcion}
                  </option>
                ))}
              </select>

              <p className="text-xs opacity-70">Tip: activa “Buscar” si la lista es grande.</p>
            </div>

            <div className="rounded border p-3 space-y-3">
              <h3 className="font-medium">Representante *</h3>

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

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="rounded border px-4 py-2 text-sm">
            {loading ? 'Guardando...' : 'Registrar'}
          </button>
          <button type="button" className="rounded border px-4 py-2 text-sm" onClick={() => router.push('/cliente/clientes')}>
            Volver
          </button>
        </div>
      </form>
    </div>
  );
}
