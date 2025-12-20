'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Empresa = { id: number; nombre_legal: string };
type TipoCliente = 'persona_fisica' | 'persona_moral' | 'fideicomiso';

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || '';
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
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

  // Tipo
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>('persona_fisica');

  // Base
  const [nombreEntidad, setNombreEntidad] = useState('');
  const [nacionalidad, setNacionalidad] = useState('México');

  // Contacto (común)
  const [pais, setPais] = useState('México');
  const [telefono, setTelefono] = useState('');

  // PF
  const [pfNombres, setPfNombres] = useState('');
  const [pfApPaterno, setPfApPaterno] = useState('');
  const [pfApMaterno, setPfApMaterno] = useState('');
  const [pfFechaNac, setPfFechaNac] = useState(''); // YYYY-MM-DD
  const [pfRfc, setPfRfc] = useState('');
  const [pfCurp, setPfCurp] = useState('');
  const [pfOcupacion, setPfOcupacion] = useState('');
  const [pfActividad, setPfActividad] = useState('');

  // PM
  const [pmRfc, setPmRfc] = useState('');
  const [pmFechaConst, setPmFechaConst] = useState(''); // YYYY-MM-DD
  const [pmGiro, setPmGiro] = useState('');

  // Representante (para PM y futuro fideicomiso)
  const [repNombres, setRepNombres] = useState('');
  const [repApPaterno, setRepApPaterno] = useState('');
  const [repApMaterno, setRepApMaterno] = useState('');
  const [repRfc, setRepRfc] = useState('');
  const [repCurp, setRepCurp] = useState('');

  // Cargar empresas (si no eres admin/consultor, esto podría 403 y lo ignoramos)
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/admin/empresas`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        });

        if (!res.ok) return; // si 403, ignorar
        const data = await res.json();
        if (Array.isArray(data?.empresas)) {
          setEmpresas(
            data.empresas.map((e: any) => ({ id: e.id, nombre_legal: e.nombre_legal }))
          );
        }
      } catch {
        // ignore
      }
    })();
  }, [apiBase]);

  function validate(): string | null {
    if (!nombreEntidad.trim()) return 'nombre_entidad es obligatorio';
    if (!telefono.trim()) return 'Teléfono es obligatorio';

    // DB aún no permite fideicomiso (te dejo SQL)
    if (tipoCliente === 'fideicomiso') {
      return 'Fideicomiso aún no está habilitado en DB. Activa el constraint primero.';
    }

    // Requeridos por tipo
    if (tipoCliente === 'persona_fisica') {
      if (!pfNombres.trim()) return 'Nombres (PF) es obligatorio';
      if (!pfApPaterno.trim()) return 'Apellido paterno (PF) es obligatorio';
      if (!pfFechaNac.trim()) return 'Fecha de nacimiento (PF) es obligatoria';
    }

    if (tipoCliente === 'persona_moral') {
      if (!pmRfc.trim()) return 'RFC (PM) es obligatorio';
      if (!pmFechaConst.trim()) return 'Fecha de constitución (PM) es obligatoria';
      if (!repNombres.trim() || !repApPaterno.trim()) return 'Representante (PM) es obligatorio (nombres y apellido paterno)';
    }

    // Para admin/consultor: empresa_id requerido (porque usuario admin suele tener empresa_id null)
    // No tenemos rol aquí sin decodificar JWT, así que si hay empresas cargadas asumimos admin/consultor y exigimos empresaId.
    if (empresas.length > 0 && empresaId === '') return 'Selecciona una empresa';

    return null;
  }

  function buildPayload() {
    const datos_completos: any = {
      contacto: { pais, telefono }
    };

    if (tipoCliente === 'persona_fisica') {
      datos_completos.persona = {
        tipo: 'persona_fisica',
        nombres: pfNombres,
        apellido_paterno: pfApPaterno,
        apellido_materno: pfApMaterno || null,
        fecha_nacimiento: pfFechaNac,
        rfc: pfRfc || null,
        curp: pfCurp || null,
        ocupacion: pfOcupacion || null,
        actividad_economica: pfActividad || null
      };
    }

    if (tipoCliente === 'persona_moral') {
      datos_completos.empresa = {
        tipo: 'persona_moral',
        rfc: pmRfc,
        fecha_constitucion: pmFechaConst,
        giro: pmGiro || null
      };
      datos_completos.representante = {
        nombres: repNombres,
        apellido_paterno: repApPaterno,
        apellido_materno: repApMaterno || null,
        rfc: repRfc || null,
        curp: repCurp || null
      };
    }

    const payload: any = {
      tipo_cliente: tipoCliente,
      nombre_entidad: nombreEntidad.trim(),
      nacionalidad: nacionalidad || null,
      datos_completos
    };

    if (empresaId !== '') payload.empresa_id = Number(empresaId);

    return payload;
  }

  async function onSubmit(e: React.FormEvent) {
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

      setMsg(`Cliente creado ✅ (id: ${data?.cliente?.id ?? 'N/A'})`);
      // Enviar a detalle si existe, si no, al listado
      const id = data?.cliente?.id;
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

      {msg && <div className="mb-4 rounded border p-3 text-sm">{msg}</div>}
      {err && <div className="mb-4 rounded border p-3 text-sm">{err}</div>}

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Tipo */}
        <div className="rounded border p-4 space-y-3">
          <label className="block text-sm font-medium">Tipo de cliente</label>
          <select
            className="w-full rounded border p-2"
            value={tipoCliente}
            onChange={(e) => setTipoCliente(e.target.value as TipoCliente)}
          >
            <option value="persona_fisica">Persona Física</option>
            <option value="persona_moral">Persona Moral</option>
            <option value="fideicomiso">Fideicomiso (pendiente habilitar DB)</option>
          </select>
          <p className="text-xs opacity-70">
            PF/PM guardan expediente en <code>datos_completos</code>. Fideicomiso requiere actualizar constraint en DB.
          </p>
        </div>

        {/* Empresa (si cargaron empresas, pedimos selección) */}
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
            <p className="text-xs opacity-70">
              Para admin/consultor es obligatorio porque su <code>empresa_id</code> suele ser null.
            </p>
          </div>
        )}

        {/* Datos base */}
        <div className="rounded border p-4 space-y-3">
          <label className="block text-sm font-medium">Nombre / Entidad</label>
          <input
            className="w-full rounded border p-2"
            value={nombreEntidad}
            onChange={(e) => setNombreEntidad(e.target.value)}
            placeholder="Ej. Juan Pérez o Comercializadora SA de CV"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Nacionalidad</label>
              <input
                className="w-full rounded border p-2"
                value={nacionalidad}
                onChange={(e) => setNacionalidad(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Teléfono (obligatorio)</label>
              <input
                className="w-full rounded border p-2"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="5512345678"
              />
            </div>
          </div>

          <label className="block text-sm font-medium">País (contacto)</label>
          <input className="w-full rounded border p-2" value={pais} onChange={(e) => setPais(e.target.value)} />
        </div>

        {/* PF */}
        {tipoCliente === 'persona_fisica' && (
          <div className="rounded border p-4 space-y-3">
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
                <label className="block text-sm font-medium">Fecha nacimiento *</label>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">Ocupación</label>
                <input className="w-full rounded border p-2" value={pfOcupacion} onChange={(e) => setPfOcupacion(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium">Actividad económica</label>
                <input className="w-full rounded border p-2" value={pfActividad} onChange={(e) => setPfActividad(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* PM */}
        {tipoCliente === 'persona_moral' && (
          <div className="rounded border p-4 space-y-3">
            <h2 className="text-lg font-medium">Persona Moral</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium">RFC *</label>
                <input className="w-full rounded border p-2" value={pmRfc} onChange={(e) => setPmRfc(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium">Fecha constitución *</label>
                <input type="date" className="w-full rounded border p-2" value={pmFechaConst} onChange={(e) => setPmFechaConst(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium">Giro</label>
                <input className="w-full rounded border p-2" value={pmGiro} onChange={(e) => setPmGiro(e.target.value)} />
              </div>
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
          <button
            type="submit"
            disabled={loading}
            className="rounded border px-4 py-2 text-sm"
          >
            {loading ? 'Guardando...' : 'Registrar'}
          </button>

          <button
            type="button"
            className="rounded border px-4 py-2 text-sm"
            onClick={() => router.push('/cliente/clientes')}
          >
            Volver
          </button>
        </div>
      </form>
    </div>
  );
}
