'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || '';
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function fmtDate(v: any) {
  if (!v) return '-';
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

function labelTipo(tipo: any) {
  if (tipo === 'persona_fisica') return 'Persona Física';
  if (tipo === 'persona_moral') return 'Persona Moral';
  if (tipo === 'fideicomiso') return 'Fideicomiso';
  return String(tipo ?? '-');
}

function Row({ k, v }: { k: string; v: any }) {
  const val = v === null || v === undefined || v === '' ? '-' : String(v);
  return (
    <div className="text-sm">
      <span className="opacity-70">{k}:</span> {val}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border p-4">
      <div className="font-medium mb-3">{title}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

export default function ClienteDetallePage() {
  const apiBase = useMemo(() => getApiBase(), []);
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [cliente, setCliente] = useState<any>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const id = params?.id;
    if (!id) return;

    (async () => {
      try {
        setLoading(true);
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

        setCliente(data?.cliente);
        setErr(null);
      } catch (e: any) {
        setErr(e?.message || 'Error de red');
      } finally {
        setLoading(false);
      }
    })();
  }, [apiBase, params, router]);

  if (loading) return <div className="p-6 text-sm">Cargando cliente...</div>;

  if (err) {
    return (
      <div className="p-6 space-y-3">
        <div className="rounded border p-3 text-sm">{err}</div>
        <button className="rounded border px-4 py-2 text-sm" onClick={() => router.push('/cliente/clientes')}>
          Volver
        </button>
      </div>
    );
  }

  const dc = cliente?.datos_completos ?? {};
  const contacto = dc?.contacto ?? {};
  const persona = dc?.persona ?? {}; // PF
  const empresa = dc?.empresa ?? {}; // PM
  const representante = dc?.representante ?? {};

  // Algunos proyectos guardan nacionalidad tanto en columna como en datos_completos
  const nacionalidadPretty =
    dc?.nacionalidad ||
    dc?.nacionalidad_descripcion ||
    dc?.nacionalidad_clave ||
    cliente?.nacionalidad ||
    '-';

  const actEco = persona?.actividad_economica ?? persona?.actividadEconomica ?? null;
  const giro = empresa?.giro_mercantil ?? empresa?.giroMercantil ?? null;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Detalle de Cliente</h1>
        <div className="flex gap-2">
          <button className="rounded border px-4 py-2 text-sm" onClick={() => router.push('/cliente/clientes')}>
            Volver
          </button>
          {/* Si tienes ruta de editar, la dejamos lista */}
          <button
            className="rounded border px-4 py-2 text-sm"
            onClick={() => router.push(`/cliente/editar-cliente/${cliente?.id}`)}
          >
            Editar
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="rounded border p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <Row k="ID" v={cliente?.id} />
          <Row k="Empresa ID" v={cliente?.empresa_id} />
          <Row k="Estado" v={cliente?.estado} />
          <div className="md:col-span-2">
            <Row k="Nombre entidad" v={cliente?.nombre_entidad} />
          </div>
          <Row k="Tipo" v={labelTipo(cliente?.tipo_cliente)} />
          <Row k="Nacionalidad" v={nacionalidadPretty} />
          <Row k="Creado" v={fmtDate(cliente?.creado_en)} />
          <Row k="Actualizado" v={fmtDate(cliente?.actualizado_en)} />
        </div>
      </div>

      {/* Contacto */}
      <Section title="Contacto">
        <Row k="País" v={contacto?.pais ?? '-'} />
        <Row k="País (clave)" v={contacto?.pais_clave ?? '-'} />
        <Row k="Teléfono" v={contacto?.telefono ?? '-'} />
        <Row k="Email" v={contacto?.email ?? '-'} />
        <Row k="Domicilio" v={contacto?.domicilio ?? contacto?.direccion ?? '-'} />
      </Section>

      {/* Persona Física */}
      {cliente?.tipo_cliente === 'persona_fisica' && (
        <>
          <Section title="Persona Física">
            <Row k="Nombres" v={persona?.nombres} />
            <Row k="Apellido paterno" v={persona?.apellido_paterno} />
            <Row k="Apellido materno" v={persona?.apellido_materno} />
            <Row k="Fecha nacimiento" v={persona?.fecha_nacimiento} />
            <Row k="RFC" v={persona?.rfc} />
            <Row k="CURP" v={persona?.curp} />
            <Row k="Ocupación" v={persona?.ocupacion} />
            <Row
              k="Actividad económica"
              v={
                actEco
                  ? typeof actEco === 'string'
                    ? actEco
                    : `${actEco?.descripcion ?? '-'} (${actEco?.clave ?? '-'})`
                  : '-'
              }
            />
          </Section>
        </>
      )}

      {/* Persona Moral */}
      {cliente?.tipo_cliente === 'persona_moral' && (
        <>
          <Section title="Persona Moral">
            <Row k="RFC" v={empresa?.rfc} />
            <Row k="Fecha constitución" v={empresa?.fecha_constitucion} />
            <Row
              k="Giro mercantil"
              v={
                giro
                  ? typeof giro === 'string'
                    ? giro
                    : `${giro?.descripcion ?? '-'} (${giro?.clave ?? '-'})`
                  : '-'
              }
            />
          </Section>

          <Section title="Representante">
            <Row k="Nombres" v={representante?.nombres} />
            <Row k="Apellido paterno" v={representante?.apellido_paterno} />
            <Row k="Apellido materno" v={representante?.apellido_materno} />
            <Row k="RFC" v={representante?.rfc} />
            <Row k="CURP" v={representante?.curp} />
          </Section>
        </>
      )}

      {/* Debug JSON (para no perder nada mientras completamos el modelo) */}
      <div className="rounded border p-4">
        <details>
          <summary className="cursor-pointer select-none font-medium">Ver JSON completo (datos_completos)</summary>
          <pre className="mt-3 text-xs overflow-auto whitespace-pre-wrap">
            {JSON.stringify(cliente?.datos_completos ?? {}, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
