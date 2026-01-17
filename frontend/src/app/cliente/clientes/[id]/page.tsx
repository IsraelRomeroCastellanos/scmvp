// frontend/src/app/cliente/clientes/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Cliente = {
  id: number;
  empresa_id: number;
  cliente_id_externo?: string | null;
  nombre_entidad: string;
  alias?: string | null;
  fecha_nacimiento_constitucion?: string | null;
  tipo_cliente: 'persona_fisica' | 'persona_moral' | 'fideicomiso';
  nacionalidad?: string | null;
  domicilio_mexico?: string | null;
  ocupacion?: string | null;
  actividad_economica?: any;
  datos_completos?: any;
  porcentaje_cumplimiento?: number | null;
  creado_en?: string | null;
  actualizado_en?: string | null;
  estado?: string | null;
};

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-gray-500">{children}</div>;
}

function Value({ children }: { children: React.ReactNode }) {
  return <div className="text-sm break-words">{children}</div>;
}

function Row({ label, value }: { label: string; value: any }) {
  const v = formatAny(value);
  return (
    <div>
      <Label>{label}</Label>
      <Value>{v}</Value>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border bg-white p-4">
      <h2 className="text-lg font-medium mb-3">{title}</h2>
      {children}
    </div>
  );
}

function formatAny(v: any) {
  if (v === null || v === undefined) return '—';

  // Catálogo tipo { clave, descripcion }
  if (typeof v === 'object' && (v?.clave || v?.descripcion)) {
    const clave = String(v?.clave ?? '').trim();
    const descripcion = String(v?.descripcion ?? '').trim();
    if (descripcion && clave) return `${descripcion} (${clave})`;
    if (descripcion) return descripcion;
    if (clave) return clave;
  }

  // "MEXICO,MX" => "MEXICO (MX)"
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return '—';
    const parts = s.split(',').map((x) => x.trim()).filter(Boolean);
    if (parts.length >= 2) return `${parts[0]} (${parts[1]})`;
    return s;
  }

  // number/bool
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);

  // fallback
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function fullNameFrom(parts: any) {
  if (!parts) return '';
  const s = String(parts?.nombre_completo ?? '').trim();
  if (s) return s;

  const nombres = String(parts?.nombres ?? '').trim();
  const ap = String(parts?.apellido_paterno ?? '').trim();
  const am = String(parts?.apellido_materno ?? '').trim();
  const join = [nombres, ap, am].filter(Boolean).join(' ');
  return join || '';
}

export default function ClienteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const idParam = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  const id = useMemo(() => {
    const n = Number(idParam);
    return Number.isFinite(n) ? n : null;
  }, [idParam]);

  useEffect(() => {
    if (!id) {
      setErr('ID inválido');
      setLoading(false);
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.replace('/login');
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(`${apiBase}/api/cliente/clientes/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        });

        if (res.status === 401) {
          router.replace('/login');
          return;
        }

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setErr(data?.error || `Error HTTP ${res.status}`);
          setCliente(null);
          return;
        }

        setCliente(data?.cliente ?? null);
      } catch (e: any) {
        setErr(e?.message || 'Error al cargar cliente');
        setCliente(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [apiBase, id, router]);

  const datos = cliente?.datos_completos ?? {};
  const contacto = datos?.contacto ?? null;

  const persona = datos?.persona ?? null;
  const empresa = datos?.empresa ?? null;
  const representante = datos?.representante ?? null;

  const fidei = datos?.fideicomiso ?? null;

  const repNombreCompleto = useMemo(() => fullNameFrom(representante), [representante]);

  const actividadPF =
    persona?.actividad_economica ??
    persona?.actividadEconomica ??
    cliente?.actividad_economica ??
    null;

  const giroPM =
    empresa?.giro_mercantil ??
    empresa?.giroMercantil ??
    empresa?.giro ??
    null;

  if (loading) return <div className="p-6">Cargando…</div>;

  if (err) {
    return (
      <div className="p-6 space-y-3">
        <div className="rounded border bg-red-50 p-3 text-sm text-red-700">{err}</div>
        <button className="rounded border px-3 py-2" onClick={() => router.back()}>
          Volver
        </button>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="p-6 space-y-3">
        <div className="rounded border bg-yellow-50 p-3 text-sm">No se encontró el cliente.</div>
        <button className="rounded border px-3 py-2" onClick={() => router.back()}>
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{cliente.nombre_entidad}</h1>
          <div className="text-sm text-gray-600">
            ID: {cliente.id} · Empresa: {cliente.empresa_id} · Tipo: {cliente.tipo_cliente}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            onClick={() => router.push(`/cliente/editar-cliente/${cliente.id}`)}
            title="Editar cliente"
          >
            ✏️ Editar
          </button>

          {/* ✅ NUEVO: Generar / Imprimir manual */}
          <button
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            onClick={() => router.push(`/cliente/clientes/${cliente.id}/imprimir`)}
            title="Generar / Imprimir expediente"
          >
            🖨️ Generar / Imprimir
          </button>

          <button className="rounded border px-3 py-2 text-sm" onClick={() => router.back()}>
            Volver
          </button>
        </div>
      </div>

      <Card title="Datos generales">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Row label="Nombre / Razón social" value={cliente.nombre_entidad} />
          <Row label="Alias" value={cliente.alias} />
          <Row label="Cliente ID externo" value={cliente.cliente_id_externo} />
          <Row label="Estado" value={cliente.estado} />

          <Row label="Nacionalidad" value={cliente.nacionalidad} />
          <Row label="% Cumplimiento" value={cliente.porcentaje_cumplimiento} />
          <Row label="Creado" value={cliente.creado_en} />
          <Row label="Actualizado" value={cliente.actualizado_en} />
        </div>
      </Card>

      <Card title="Contacto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Row label="País" value={contacto?.pais} />
          <Row label="Teléfono" value={contacto?.telefono} />
          <Row label="Domicilio (México)" value={cliente.domicilio_mexico} />
        </div>
      </Card>

      {cliente.tipo_cliente === 'persona_fisica' && (
        <Card title="Persona Física">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Row label="Nombre(s)" value={persona?.nombres} />
            <Row label="Apellido paterno" value={persona?.apellido_paterno} />
            <Row label="Apellido materno" value={persona?.apellido_materno} />
            <Row label="Fecha nacimiento (AAAAMMDD)" value={persona?.fecha_nacimiento} />

            <Row label="RFC" value={persona?.rfc} />
            <Row label="CURP" value={persona?.curp} />
            <Row label="Ocupación" value={persona?.ocupacion ?? cliente.ocupacion} />
            <Row label="Actividad económica" value={actividadPF} />
          </div>
        </Card>
      )}

      {cliente.tipo_cliente === 'persona_moral' && (
        <Card title="Persona Moral">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Row label="RFC" value={empresa?.rfc} />
            <Row label="Fecha constitución" value={empresa?.fecha_constitucion} />
            <Row label="Giro mercantil" value={giroPM} />
          </div>

          <div className="mt-4 rounded border p-3">
            <h3 className="font-medium mb-3">Representante / Apoderado</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Row label="Nombre completo" value={repNombreCompleto} />
              <Row label="RFC" value={representante?.rfc} />
              <Row label="CURP" value={representante?.curp} />
            </div>
          </div>
        </Card>
      )}

      {cliente.tipo_cliente === 'fideicomiso' && (
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

      <div className="rounded border bg-white p-4">
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
