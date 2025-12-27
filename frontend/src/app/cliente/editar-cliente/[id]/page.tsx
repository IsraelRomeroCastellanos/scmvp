// frontend/src/app/cliente/editar-cliente/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type TipoCliente = 'persona_fisica' | 'persona_moral' | 'fideicomiso';
type Cliente = any;

function labelTipo(tipo: TipoCliente) {
  if (tipo === 'persona_fisica') return 'Persona Física';
  if (tipo === 'persona_moral') return 'Persona Moral';
  return 'Fideicomiso';
}

function toYYYYMMDD(value: string) {
  const v = (value ?? '').trim();
  if (!v) return '';
  if (/^\d{8}$/.test(v)) return v;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v.replaceAll('-', '');
  return v;
}

export default function Page() {
  const router = useRouter();
  const params = useParams();
  const id = String((params as any)?.id ?? '');

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [cliente, setCliente] = useState<Cliente | null>(null);

  // generales
  const [nombreEntidad, setNombreEntidad] = useState('');
  const [nacionalidad, setNacionalidad] = useState('');
  const [estado, setEstado] = useState<'activo' | 'inactivo'>('activo');

  // contacto
  const [paisContacto, setPaisContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [emailContacto, setEmailContacto] = useState('');
  const [domicilioContacto, setDomicilioContacto] = useState('');

  // PF
  const [pfNombres, setPfNombres] = useState('');
  const [pfApPaterno, setPfApPaterno] = useState('');
  const [pfApMaterno, setPfApMaterno] = useState('');
  const [pfFechaNac, setPfFechaNac] = useState('');
  const [pfRfc, setPfRfc] = useState('');
  const [pfCurp, setPfCurp] = useState('');
  const [pfOcupacion, setPfOcupacion] = useState('');

  // PM
  const [pmRfc, setPmRfc] = useState('');
  const [pmFechaConst, setPmFechaConst] = useState('');

  // Rep PM
  const [repNombres, setRepNombres] = useState('');
  const [repApPaterno, setRepApPaterno] = useState('');
  const [repApMaterno, setRepApMaterno] = useState('');
  const [repRfc, setRepRfc] = useState('');
  const [repCurp, setRepCurp] = useState('');

  // Fideicomiso
  const [fidDenominacion, setFidDenominacion] = useState('');
  const [fidRfcFiduciario, setFidRfcFiduciario] = useState('');
  const [fidIdentificador, setFidIdentificador] = useState('');

  const [fidRepNombres, setFidRepNombres] = useState('');
  const [fidRepApPaterno, setFidRepApPaterno] = useState('');
  const [fidRepApMaterno, setFidRepApMaterno] = useState('');
  const [fidRepFechaNac, setFidRepFechaNac] = useState(''); // date input
  const [fidRepRfc, setFidRepRfc] = useState('');
  const [fidRepCurp, setFidRepCurp] = useState('');

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        setLoading(true);
        setErr(null);

        const token = localStorage.getItem('token');
        if (!token) {
          router.replace('/login');
          return;
        }

        const res = await fetch(`${apiBase}/api/cliente/clientes/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) {
            router.replace('/login');
            return;
          }
          throw new Error(data?.error || `Error HTTP ${res.status}`);
        }

        if (!mounted) return;

        const c = data?.cliente ?? null;
        setCliente(c);

        setNombreEntidad(c?.nombre_entidad ?? '');
        setNacionalidad(c?.nacionalidad ?? '');
        setEstado((c?.estado ?? 'activo') as any);

        const dc = c?.datos_completos ?? {};
        const contacto = dc?.contacto ?? {};
        setPaisContacto(contacto?.pais ?? '');
        setTelefono(contacto?.telefono ?? '');
        setEmailContacto(contacto?.email ?? '');
        setDomicilioContacto(contacto?.domicilio ?? '');

        if (c?.tipo_cliente === 'persona_fisica') {
          const pf = dc?.persona ?? {};
          setPfNombres(pf?.nombres ?? '');
          setPfApPaterno(pf?.apellido_paterno ?? '');
          setPfApMaterno(pf?.apellido_materno ?? '');
          // si venía AAAAMMDD, lo dejamos; si venía YYYY-MM-DD, igual
          setPfFechaNac(pf?.fecha_nacimiento ?? '');
          setPfRfc(pf?.rfc ?? '');
          setPfCurp(pf?.curp ?? '');
          setPfOcupacion(pf?.ocupacion ?? '');
        }

        if (c?.tipo_cliente === 'persona_moral') {
          const pm = dc?.empresa ?? {};
          setPmRfc(pm?.rfc ?? '');
          setPmFechaConst(pm?.fecha_constitucion ?? '');

          const rep = dc?.representante ?? {};
          setRepNombres(rep?.nombres ?? '');
          setRepApPaterno(rep?.apellido_paterno ?? '');
          setRepApMaterno(rep?.apellido_materno ?? '');
          setRepRfc(rep?.rfc ?? '');
          setRepCurp(rep?.curp ?? '');
        }

        if (c?.tipo_cliente === 'fideicomiso') {
          const f = dc?.fideicomiso ?? {};
          setFidIdentificador(f?.identificador ?? '');
          setFidRfcFiduciario(f?.rfc_fiduciario ?? '');
          setFidDenominacion(f?.denominacion_fiduciario ?? '');

          const rep = dc?.representante ?? {};
          setFidRepNombres(rep?.nombres ?? '');
          setFidRepApPaterno(rep?.apellido_paterno ?? '');
          setFidRepApMaterno(rep?.apellido_materno ?? '');
          // si venía AAAAMMDD, lo dejamos (si quieres, luego lo convertimos a date)
          setFidRepFechaNac(rep?.fecha_nacimiento ?? '');
          setFidRepRfc(rep?.rfc ?? '');
          setFidRepCurp(rep?.curp ?? '');
        }
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message || 'No se pudo cargar el cliente');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (apiBase && id) run();
    return () => {
      mounted = false;
    };
  }, [apiBase, id, router]);

  const dcActual = useMemo(() => cliente?.datos_completos ?? {}, [cliente]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }

    if (!nombreEntidad.trim()) {
      setErr('Nombre / Entidad es obligatorio');
      return;
    }
    if (!paisContacto.trim() || !telefono.trim()) {
      setErr('Contacto (país y teléfono) es obligatorio');
      return;
    }

    const tipo = (cliente?.tipo_cliente ?? 'persona_fisica') as TipoCliente;

    // clon base de datos_completos existente para no perder nada
    const datos_completos: any = { ...(dcActual || {}) };

    datos_completos.contacto = {
      ...(datos_completos.contacto || {}),
      pais: paisContacto.trim(),
      telefono: telefono.trim(),
      email: emailContacto.trim() || undefined,
      domicilio: domicilioContacto.trim() || undefined
    };

    if (tipo === 'persona_fisica') {
      datos_completos.persona = {
        ...(datos_completos.persona || {}),
        tipo: 'persona_fisica',
        nombres: pfNombres.trim(),
        apellido_paterno: pfApPaterno.trim(),
        apellido_materno: pfApMaterno.trim() || undefined,
        fecha_nacimiento: pfFechaNac ? toYYYYMMDD(pfFechaNac) : undefined,
        rfc: pfRfc.trim() || undefined,
        curp: pfCurp.trim() || undefined,
        ocupacion: pfOcupacion.trim() || undefined
      };
    }

    if (tipo === 'persona_moral') {
      datos_completos.empresa = {
        ...(datos_completos.empresa || {}),
        tipo: 'persona_moral',
        rfc: pmRfc.trim(),
        fecha_constitucion: pmFechaConst
      };

      datos_completos.representante = {
        ...(datos_completos.representante || {}),
        nombres: repNombres.trim(),
        apellido_paterno: repApPaterno.trim(),
        apellido_materno: repApMaterno.trim() || undefined,
        rfc: repRfc.trim() || undefined,
        curp: repCurp.trim() || undefined
      };
    }

    if (tipo === 'fideicomiso') {
      if (!fidDenominacion.trim() || !fidRfcFiduciario.trim() || !fidIdentificador.trim()) {
        setErr('Fideicomiso: denominación, RFC fiduciario e identificador son obligatorios');
        return;
      }

      const ymd = toYYYYMMDD(fidRepFechaNac);
      if (!ymd || !/^\d{8}$/.test(ymd)) {
        setErr('Fideicomiso: fecha de nacimiento del representante debe ser AAAAMMDD');
        return;
      }
      if (!fidRepNombres.trim() || !fidRepApPaterno.trim() || !fidRepRfc.trim() || !fidRepCurp.trim()) {
        setErr('Fideicomiso: datos mínimos del representante incompletos');
        return;
      }

      datos_completos.fideicomiso = {
        ...(datos_completos.fideicomiso || {}),
        identificador: fidIdentificador.trim(),
        rfc_fiduciario: fidRfcFiduciario.trim(),
        denominacion_fiduciario: fidDenominacion.trim()
      };

      const nombreCompleto = `${fidRepNombres} ${fidRepApPaterno} ${fidRepApMaterno}`.replace(/\s+/g, ' ').trim();

      datos_completos.representante = {
        ...(datos_completos.representante || {}),
        nombre_completo: nombreCompleto,
        nombres: fidRepNombres.trim(),
        apellido_paterno: fidRepApPaterno.trim(),
        apellido_materno: fidRepApMaterno.trim() || undefined,
        fecha_nacimiento: ymd,
        rfc: fidRepRfc.trim(),
        curp: fidRepCurp.trim()
      };
    }

    const payload: any = {
      nombre_entidad: nombreEntidad.trim(),
      nacionalidad: nacionalidad.trim() || undefined,
      estado,
      datos_completos
    };

    try {
      setSaving(true);

      const res = await fetch(`${apiBase}/api/cliente/clientes/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        setErr(data?.error || `Error HTTP ${res.status}`);
        return;
      }

      setCliente(data?.cliente ?? cliente);
      setMsg('Cambios guardados ✅');
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
                <input className="w-full rounded border p-2" value={pfFechaNac} onChange={(e) => setPfFechaNac(e.target.value)} placeholder="YYYY-MM-DD o AAAAMMDD" />
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
              Nota: actividad económica/catálogos se mantienen en datos_completos; aquí no la re-editamos aún.
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
                Nota: giro mercantil/catálogos se mantienen en datos_completos si ya existen.
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

        {tipo === 'fideicomiso' && (
          <div className="rounded border p-4 space-y-4">
            <div className="font-medium">Fideicomiso (iteración 1)</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">Denominación fiduciario *</label>
                <input className="w-full rounded border p-2" value={fidDenominacion} onChange={(e) => setFidDenominacion(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium">RFC fiduciario *</label>
                <input className="w-full rounded border p-2" value={fidRfcFiduciario} onChange={(e) => setFidRfcFiduciario(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">Identificador *</label>
              <input className="w-full rounded border p-2" value={fidIdentificador} onChange={(e) => setFidIdentificador(e.target.value)} />
            </div>

            <div className="rounded border p-3 space-y-3">
              <div className="font-medium">Representante / Apoderado *</div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium">Nombre(s) *</label>
                  <input className="w-full rounded border p-2" value={fidRepNombres} onChange={(e) => setFidRepNombres(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Apellido paterno *</label>
                  <input className="w-full rounded border p-2" value={fidRepApPaterno} onChange={(e) => setFidRepApPaterno(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Apellido materno</label>
                  <input className="w-full rounded border p-2" value={fidRepApMaterno} onChange={(e) => setFidRepApMaterno(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium">Fecha nacimiento *</label>
                  <input className="w-full rounded border p-2" value={fidRepFechaNac} onChange={(e) => setFidRepFechaNac(e.target.value)} placeholder="YYYY-MM-DD o AAAAMMDD" />
                </div>
                <div>
                  <label className="block text-sm font-medium">RFC *</label>
                  <input className="w-full rounded border p-2" value={fidRepRfc} onChange={(e) => setFidRepRfc(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium">CURP *</label>
                  <input className="w-full rounded border p-2" value={fidRepCurp} onChange={(e) => setFidRepCurp(e.target.value)} />
                </div>
              </div>

              <p className="text-xs opacity-70">Se enviará fecha_nacimiento como AAAAMMDD.</p>
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
            <pre className="mt-3 text-xs overflow-auto whitespace-pre-wrap">{JSON.stringify(cliente?.datos_completos ?? {}, null, 2)}</pre>
          </details>
        </div>
      </form>
    </div>
  );
}
