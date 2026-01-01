// frontend/src/app/cliente/clientes/[id]/page.tsx
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

function fmtDateTime(v: any) {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('es-MX');
}

function safeStr(v: any) {
  if (v === null || v === undefined) return '-';
  const s = String(v).trim();
  return s ? s : '-';
}

function formatPaisLike(v: any) {
  // "MEXICO,MX" -> "MEXICO (MX)"
  const s = safeStr(v);
  if (s === '-') return s;
  const parts = s.split(',').map((x) => x.trim()).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]} (${parts[1]})`;
  return s;
}

function formatCatalogLike(v: any) {
  // {clave, descripcion} -> "descripcion (clave)"
  if (!v) return '-';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    const clave = safeStr((v as any).clave);
    const descripcion = safeStr((v as any).descripcion);
    if (descripcion !== '-' && clave !== '-') return `${descripcion} (${clave})`;
    if (descripcion !== '-') return descripcion;
    if (clave !== '-') return clave;
  }
  return safeStr(v);
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border p-4">
      <h2 className="text-lg font-medium mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value, formatter }: { label: string; value: any; formatter?: (v: any) => string }) {
  const v = formatter
    ? formatter(value)
    : value === null || value === undefined || value === ''
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

  const persona = exp?.persona ?? null; // PF
  const empresa = exp?.empresa ?? null; // PM
  const representante = exp?.representante ?? null; // PM/Fideicomiso
  const fidei = exp?.fideicomiso ?? null; // Fideicomiso

  // PF: actividad económica (obj catálogo o string)
  const actObj = persona?.actividad_economica ?? null;
  const actShow =
    actObj
      ? formatCatalogLike(actObj)
      : cliente?.actividad_economica
        ? safeStr(cliente?.actividad_economica)
        : '-';

  // PM: giro mercantil (obj catálogo o string) o empresa.giro
  const giroObj = empresa?.giro_mercantil ?? null;
  const giroShow =
    giroObj
      ? formatCatalogLike(giroObj)
      : empresa?.giro
        ? safeStr(empresa?.giro)
        : (cliente as any)?.giro_mercantil
          ? safeStr((cliente as any)?.giro_mercantil)
          : '-';

  // Representante: soporta nombre_completo o nombres/apellidos
  const repNombreCompleto =
    safeStr(representante?.nombre_completo) !== '-'
      ? safeStr(representante?.nombre_completo)
      : [representante?.nombres, representante?.apellido_paterno, representante?.apellido_materno]
          .map((x: any) => (x ? String(x).trim() : ''))
          .filter(Boolean)
          .join(' ') || '-';

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

      <Card title="Información base">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Row label="ID" value={cliente?.id} />
          <Row label="Empresa ID" value={cliente?.empresa_id} />
          <Row label="Estado" value={cliente?.estado} />
          <Row label="Tipo" value={cliente?.tipo_cliente} />

          <div className="md:col-span-2">
            <Row label="Nombre / Entidad" value={cliente?.nombre_entidad} />
          </div>

          <Row label="Alias" value={cliente?.alias} />
          <Row label="Nacionalidad" value={cliente?.nacionalidad} formatter={formatPaisLike} />

          <Row label="Cliente ID Externo" value={cliente?.cliente_id_externo} />
          <Row label="Fecha nac/constitución (columna)" value={cliente?.fecha_nacimiento_constitucion} />
          <Row label="Creado" value={cliente?.creado_en} formatter={fmtDateTime} />
          <Row label="Actualizado" value={cliente?.actualizado_en} formatter={fmtDateTime} />
        </div>
      </Card>

      <Card title="Contacto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Row label="País" value={contacto?.pais} formatter={formatPaisLike} />
          <Row label="Teléfono" value={contacto?.telefono} />
        </div>
      </Card>

      {cliente?.tipo_cliente === 'persona_fisica' && (
        <Card title="Persona Física">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Row label="Nombres" value={persona?.nombres} />
            <Row label="Apellido paterno" value={persona?.apellido_paterno} />
            <Row label="Apellido materno" value={persona?.apellido_materno} />

            <Row label="RFC" value={persona?.rfc} />
            <Row label="CURP" value={persona?.curp} />
            <Row label="Fecha nacimiento" value={persona?.fecha_nacimiento} />

            <Row label="Ocupación" value={persona?.ocupacion ?? cliente?.ocupacion} />
            <Row label="Actividad económica" value={actShow} />
          </div>
        </Card>
      )}

      {cliente?.tipo_cliente === 'persona_moral' && (
        <Card title="Persona Moral">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Row label="RFC (empresa)" value={empresa?.rfc} />
            <Row label="Fecha constitución" value={empresa?.fecha_constitucion} />
            <Row label="Giro mercantil" value={giroShow} />
          </div>

          <div className="mt-4 rounded border p-3">
            <h3 className="font-medium mb-3">Representante</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Row label="Nombre completo" value={repNombreCompleto} />
              <Row label="RFC" value={representante?.rfc} />
              <Row label="CURP" value={representante?.curp} />
            </div>
          </div>
        </Card>
      )}

      {cliente?.tipo_cliente === 'fideicomiso' && (
        <Card title="Fideicomiso">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Row label="Denominación / Razón social del fiduciario" value={fidei?.denominacion_fiduciario} />
            <Row label="RFC del fiduciario" value={fidei?.rfc_fiduciario} />
            <Row label="Identificador del fideicomiso" value={fidei?.identificador} />
          </div>

          <div className="mt-4 rounded border p-3">
            <h3 className="font-medium mb-3">Representante / Apoderado</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Row label="Nombre completo" value={repNombreCompleto} />
              <Row label="Fecha de nacimiento (AAAAMMDD)" value={representante?.fecha_nacimiento} />
              <Row label="RFC" value={representante?.rfc} />
              <Row label="CURP" value={representante?.curp} />
            </div>
          </div>
        </Card>
      )}

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
