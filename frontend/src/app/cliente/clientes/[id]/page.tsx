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
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('es-MX');
}

function safeStr(v: any) {
  if (v === null || v === undefined || v === '') return '-';
  return String(v);
}

function Row({ label, value }: { label: string; value: any }) {
  const v =
    value === null || value === undefined || value === ''
      ? '-'
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);

  return (
    <div className="text-sm">
      <div className="text-xs opacity-70">{label}</div>
      <div className="break-words">{v}</div>
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
  const [showRaw, setShowRaw] = useState(false);

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

  if (loading) return <div className="p-6 text-sm">Cargando cliente…</div>;

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

  const exp = cliente?.datos_completos ?? {};
  const contacto = exp?.contacto ?? {};
  const persona = exp?.persona ?? null;
  const empresa = exp?.empresa ?? null;
  const representante = exp?.representante ?? null;

  // PF: actividad económica puede venir en persona.actividad_economica como {clave,descripcion} o string
  const actObj = persona?.actividad_economica;
  const actDesc =
    actObj?.descripcion ||
    (typeof actObj === 'string' ? actObj : null) ||
    cliente?.actividad_economica ||
    null;

  // PM: giro puede venir como empresa.giro (string) o empresa.giro_mercantil (obj/string)
  const giroObj = empresa?.giro_mercantil;
  const giroDesc =
    (typeof giroObj === 'object' ? giroObj?.descripcion : giroObj) ||
    empresa?.giro ||
    cliente?.giro_mercantil ||
    null;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Detalle de Cliente</h1>

        <div className="flex gap-2">
          <button className="rounded border px-4 py-2 text-sm" onClick={() => router.push('/cliente/clientes')}>
            Volver
          </button>

          <button
            className="rounded border px-4 py-2 text-sm"
            onClick={() => router.push(`/cliente/editar-cliente/${cliente?.id}`)}
          >
            Editar
          </button>
        </div>
      </div>

      {/* Base */}
      <div className="rounded border p-4">
        <h2 className="text-lg font-medium mb-3">Información base</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Row label="ID" value={cliente?.id} />
          <Row label="Empresa ID" value={cliente?.empresa_id} />
          <Row label="Estado" value={cliente?.estado} />
          <Row label="Tipo" value={cliente?.tipo_cliente} />

          <div className="md:col-span-2">
            <Row label="Nombre / Entidad" value={cliente?.nombre_entidad} />
          </div>
          <Row label="Alias" value={cliente?.alias} />
          <Row label="Nacionalidad" value={cliente?.nacionalidad} />

          <Row label="Cliente ID Externo" value={cliente?.cliente_id_externo} />
          <Row label="Fecha nac/constitución (columna)" value={cliente?.fecha_nacimiento_constitucion} />
          <Row label="Creado" value={fmtDate(cliente?.creado_en)} />
          <Row label="Actualizado" value={fmtDate(cliente?.actualizado_en)} />
        </div>
      </div>

      {/* Contacto */}
      <div className="rounded border p-4">
        <h2 className="text-lg font-medium mb-3">Contacto</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Row label="País" value={contacto?.pais} />
          <Row label="Teléfono" value={contacto?.telefono} />
        </div>
      </div>

      {/* PF */}
      {cliente?.tipo_cliente === 'persona_fisica' && (
        <div className="rounded border p-4 space-y-3">
          <h2 className="text-lg font-medium">Persona Física</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Row label="Nombres" value={persona?.nombres} />
            <Row label="Apellido paterno" value={persona?.apellido_paterno} />
            <Row label="Apellido materno" value={persona?.apellido_materno} />

            <Row label="RFC" value={persona?.rfc} />
            <Row label="CURP" value={persona?.curp} />
            <Row label="Fecha nacimiento" value={persona?.fecha_nacimiento} />

            <Row label="Ocupación" value={persona?.ocupacion ?? cliente?.ocupacion} />
            <Row label="Actividad económica" value={actDesc} />
            <Row label="Actividad (clave)" value={actObj?.clave} />
          </div>
        </div>
      )}

      {/* PM */}
      {cliente?.tipo_cliente === 'persona_moral' && (
        <div className="rounded border p-4 space-y-4">
          <div>
            <h2 className="text-lg font-medium">Persona Moral</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <Row label="RFC (empresa)" value={empresa?.rfc} />
              <Row label="Fecha constitución" value={empresa?.fecha_constitucion} />
              <Row label="Giro mercantil" value={giroDesc} />
            </div>
          </div>

          <div className="rounded border p-3">
            <h3 className="font-medium mb-3">Representante</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Row label="Nombres" value={representante?.nombres} />
              <Row label="Apellido paterno" value={representante?.apellido_paterno} />
              <Row label="Apellido materno" value={representante?.apellido_materno} />
              <Row label="RFC" value={safeStr(representante?.rfc)} />
              <Row label="CURP" value={safeStr(representante?.curp)} />
            </div>
          </div>
        </div>
      )}

      {/* Raw JSON */}
      <div className="rounded border p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Expediente (datos_completos)</h2>
          <button className="rounded border px-3 py-1 text-sm" onClick={() => setShowRaw((v) => !v)}>
            {showRaw ? 'Ocultar JSON' : 'Ver JSON'}
          </button>
        </div>

        {showRaw && (
          <pre className="mt-3 text-xs overflow-auto whitespace-pre-wrap">
            {JSON.stringify(cliente?.datos_completos ?? {}, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
