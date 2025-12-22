'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || '';
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

type TipoCliente = 'persona_fisica' | 'persona_moral' | 'fideicomiso';

function labelTipo(t: any) {
  if (t === 'persona_fisica') return 'Persona Física';
  if (t === 'persona_moral') return 'Persona Moral';
  if (t === 'fideicomiso') return 'Fideicomiso';
  return String(t ?? '-');
}

export default function EditarClientePage() {
  const apiBase = useMemo(() => getApiBase(), []);
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [cliente, setCliente] = useState<any>(null);

  // Campos base
  const [nombreEntidad, setNombreEntidad] = useState('');
  const [nacionalidad, setNacionalidad] = useState('');
  const [estado, setEstado] = useState<'activo' | 'inactivo'>('activo');

  // Contacto (en datos_completos.contacto)
  const [paisContacto, setPaisContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [emailContacto, setEmailContacto] = useState('');
  const [domicilioContacto, setDomicilioContacto] = useState('');

  // PF
  const [pfNombres, setPfNombres] = useState('');
  const [pfApPaterno, setPfApPaterno] = useState('');
  const [pfApMaterno, setPfApMaterno] = useState('');
  const [pfFechaNac, setPfFechaNac] = useState(''); // YYYY-MM-DD
  const [pfRfc, setPfRfc] = useState('');
  const [pfCurp, setPfCurp] = useState('');
  const [pfOcupacion, setPfOcupacion] = useState('');

  // PM
  const [pmRfc, setPmRfc] = useState('');
  const [pmFechaConst, setPmFechaConst] = useState(''); // YYYY-MM-DD
  const [repNombres, setRepNombres] = useState('');
  const [repApPaterno, setRepApPaterno] = useState('');
  const [repApMaterno, setRepApMaterno] = useState('');
  const [repRfc, setRepRfc] = useState('');
  const [repCurp, setRepCurp] = useState('');

  // Helpers para date -> input[type=date]
  function toDateInput(v: any) {
    if (!v) return '';
    try {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return String(v);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return '';
    }
  }

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    if (!id) return;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        setMsg(null);

        const res = await fetch(`${apiBase}/api/cliente/clientes/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErr(data?.error || `Error HTTP ${res.status}`);
          setCliente(null);
          return;
        }

        const c = data?.cliente;
        setCliente(c);

        // Base
        setNombreEntidad(c?.nombre_entidad ?? '');
        setNacionalidad(c?.nacionalidad ?? '');
        setEstado((c?.estado === 'inactivo' ? 'inactivo' : 'activo') as any);

        // datos_completos
        const dc = c?.datos_completos ?? {};
        const contacto = dc?.contacto ?? {};

        setPaisContacto(contacto?.pais ?? '');
        setTelefono(contacto?.telefono ?? '');
        setEmailContacto(contacto?.email ?? '');
        setDomicilioContacto(contacto?.domicilio ?? contacto?.direccion ?? '');

        // PF
        const persona = dc?.persona ?? {};
        setPfNombres(persona?.nombres ?? '');
        setPfApPaterno(persona?.apellido_paterno ?? '');
        setPfApMaterno(persona?.apellido_materno ?? '');
        setPfFechaNac(toDateInput(persona?.fecha_nacimiento));
        setPfRfc(persona?.rfc ?? '');
        setPfCurp(persona?.curp ?? '');
        setPfOcupacion(persona?.ocupacion ?? '');

        // PM
        const empresa = dc?.empresa ?? {};
        setPmRfc(empresa?.rfc ?? '');
        setPmFechaConst(toDateInput(empresa?.fecha_constitucion));
        const rep = dc?.representante ?? {};
        setRepNombres(rep?.nombres ?? '');
        setRepApPaterno(rep?.apellido_paterno ?? '');
        setRepApMaterno(rep?.apellido_materno ?? '');
        setRepRfc(rep?.rfc ?? '');
        setRepCurp(rep?.curp ?? '');
      } catch (e: any) {
        setErr(e?.message || 'Error de red');
      } finally {
        setLoading(false);
      }
    })();
  }, [apiBase, id, router]);

  function validate() {
    if (!nombreEntidad.trim()) return 'Nombre / Entidad es obligatorio';
    if (!paisContacto.trim()) return 'País (contacto) es obligatorio';
    if (!telefono.trim()) return 'Teléfono es obligatorio';

    const tipo = (cliente?.tipo_cliente ?? '') as TipoCliente;

    if (tipo === 'persona_fisica') {
      if (!pfNombres.trim()) return 'Nombres (PF) es obligatorio';
      if (!pfApPaterno.trim()) return 'Apellido paterno (PF) es obligatorio';
    }

    if (tipo === 'persona_moral') {
      if (!pmRfc.trim()) return 'RFC (PM) es obligatorio';
      if (!pmFechaConst.trim()) return 'Fecha constitución (PM) es obligatoria';
      if (!repNombres.trim()) return 'Nombres representante es obligatorio';
      if (!repApPaterno.trim()) return 'Apellido paterno representante es obligatorio';
    }

    return null;
  }

  function buildPayload() {
    // Clonar datos_completos actual para NO perder campos no pintados aún
    const dcPrev = cliente?.datos_completos ?? {};
    const dcNext: any = { ...dcPrev };

    dcNext.contacto = {
      ...(dcPrev?.contacto ?? {}),
      pais: paisContacto.trim(),
      telefono: telefono.trim(),
      email: emailContacto.trim() || null,
      domicilio: domicilioContacto.trim() || null
    };

    const tipo = (cliente?.tipo_cliente ?? '') as TipoCliente;

    if (tipo === 'persona_fisica') {
      dcNext.persona = {
        ...(dcPrev?.persona ?? {}),
        tipo: 'persona_fisica',
        nombres: pfNombres.trim(),
        apellido_paterno: pfApPaterno.trim(),
        apellido_materno: pfApMaterno.trim() || null,
        fecha_nacimiento: pfFechaNac || null,
        rfc: pfRfc.trim() || null,
        curp: pfCurp.trim() || null,
        ocupacion: pfOcupacion.trim() || null
      };
    }

    if (tipo === 'persona_moral') {
      dcNext.empresa = {
        ...(dcPrev?.empresa ?? {}),
        tipo: 'persona_moral',
        rfc: pmRfc.trim(),
        fecha_constitucion: pmFechaConst || null
      };
      dcNext.representante = {
        ...(dcPrev?.representante ?? {}),
        nombres: repNombres.trim(),
        apellido_paterno: repApPaterno.trim(),
        apellido_materno: repApMaterno.trim() || null,
        rfc: repRfc.trim() || null,
        curp: repCurp.trim() || null
      };
    }

    return {
      // Campos top-level que tu backend ya maneja en el PUT
      nombre_entidad: nombreEntidad.trim(),
      tipo_cliente: cliente?.tipo_cliente,
      nacionalidad: nacionalidad.trim() || null,
      estado,
      datos_completos: dcNext
    };
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    const v = validate();
    if (v) {
      setErr(v);
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/cliente/clientes/${id}`, {
        method: 'PUT',
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

      setCliente(data?.cliente ?? cliente);
      setMsg('Cambios guardados ✅');
      // opcional: regresar a detalle
      router.push(`/cliente/clientes/${id}`);
    } catch (e: any) {
      setErr(e?.message || 'Error de red');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-sm">Cargando edición...</div>;

  if (!cliente) {
    return (
      <div className="p-6 space-y-3">
        <div className="rounded border p-3 text-sm">No se pudo cargar el cliente.</div>
        <button className="rounded border px-4 py-2 text-sm" onClick={() => router.push('/cliente/clientes')}>
          Volver
        </button>
      </div>
    );
  }

  const tipo = cliente?.tipo_cliente as TipoCliente;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          Editar Cliente #{cliente?.id} — {labelTipo(tipo)}
        </h1>
        <div className="flex gap-2">
          <button className="rounded border px-4 py-2 text-sm" onClick={() => router.push(`/cliente/clientes/${id}`)}>
            Volver
          </button>
        </div>
      </div>

      {msg && <div className="rounded border p-3 text-sm">{msg}</div>}
      {err && <div className="rounded border p-3 text-sm">{err}</div>}

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="rounded border p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Nombre / Entidad *</label>
              <input className="w-full rounded border p-2" value={nombreEntidad} onChange={(e) => setNombreEntidad(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium">Nacionalidad</label>
              <input className="w-full rounded border p-2" value={nacionalidad} onChange={(e) => setNacionalidad(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Estado</label>
              <select className="w-full rounded border p-2" value={estado} onChange={(e) => setEstado(e.target.value as any)}>
                <option value="activo">activo</option>
                <option value="inactivo">inactivo</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded border p-4 space-y-3">
          <div className="font-medium">Contacto</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">País *</label>
              <input className="w-full rounded border p-2" value={paisContacto} onChange={(e) => setPaisContacto(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium">Teléfono *</label>
              <input className="w-full rounded border p-2" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input className="w-full rounded border p-2" value={emailContacto} onChange={(e) => setEmailContacto(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium">Domicilio</label>
              <input className="w-full rounded border p-2" value={domicilioContacto} onChange={(e) => setDomicilioContacto(e.target.value)} />
            </div>
          </div>
        </div>

        {tipo === 'persona_fisica' && (
          <div className="rounded border p-4 space-y-3">
            <div className="font-medium">Persona Física</div>

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

            <p className="text-xs opacity-70">
              Nota: actividad económica / catálogos se mantienen en datos_completos si ya existen; en este paso no la re-editamos aún.
            </p>
          </div>
        )}

        {tipo === 'persona_moral' && (
          <div className="rounded border p-4 space-y-4">
            <div>
              <div className="font-medium">Persona Moral</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-sm font-medium">RFC *</label>
                  <input className="w-full rounded border p-2" value={pmRfc} onChange={(e) => setPmRfc(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Fecha constitución *</label>
                  <input type="date" className="w-full rounded border p-2" value={pmFechaConst} onChange={(e) => setPmFechaConst(e.target.value)} />
                </div>
              </div>

              <p className="text-xs opacity-70 mt-2">
                Nota: giro mercantil / catálogos se mantienen en datos_completos si ya existen; lo re-editamos en el siguiente bloque.
              </p>
            </div>

            <div className="rounded border p-3 space-y-3">
              <div className="font-medium">Representante *</div>
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
          <button type="submit" disabled={saving} className="rounded border px-4 py-2 text-sm">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button type="button" className="rounded border px-4 py-2 text-sm" onClick={() => router.push(`/cliente/clientes/${id}`)}>
            Cancelar
          </button>
        </div>

        <div className="rounded border p-4">
          <details>
            <summary className="cursor-pointer select-none font-medium">Debug: datos_completos actual</summary>
            <pre className="mt-3 text-xs overflow-auto whitespace-pre-wrap">
              {JSON.stringify(cliente?.datos_completos ?? {}, null, 2)}
            </pre>
          </details>
        </div>
      </form>
    </div>
  );
}
