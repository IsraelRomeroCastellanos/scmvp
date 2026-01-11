// frontend/src/app/cliente/clientes/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Cliente = {
  id: number;
  empresa_id: number;
  nombre_entidad: string;
  tipo_cliente: 'persona_fisica' | 'persona_moral' | 'fideicomiso';
  nacionalidad: string;
  estado: string;
  creado_en: string;
  actualizado_en: string;
  datos_completos?: any;
};

function normalizeUpper(s: string) {
  return (s ?? '').trim().toUpperCase();
}

function fmtDateIso(iso?: string) {
  if (!iso) return '';
  // muestra ISO sin segundos (simple)
  return iso.replace('T', ' ').replace('Z', '').slice(0, 19);
}

function Row({ label, value }: { label: string; value?: any }) {
  const v =
    value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
      ? '—'
      : String(value);
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-sm font-medium text-gray-900 text-right break-all">{v}</div>
    </div>
  );
}

function Section({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export default function Page() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://scmvp.onrender.com';

  const token = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('token') || '';
  }, []);

  const [loading, setLoading] = useState(false);
  const [fatal, setFatal] = useState('');
  const [cliente, setCliente] = useState<Cliente | null>(null);

  useEffect(() => {
    if (!id) return;
    if (!token) return;

    (async () => {
      setLoading(true);
      setFatal('');
      try {
        const res = await fetch(`${apiBase}/api/cliente/clientes/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setFatal(data?.error || `Error al cargar (${res.status})`);
          setCliente(null);
          return;
        }
        setCliente(data?.cliente || null);
      } catch (e: any) {
        setFatal(e?.message || 'Error inesperado');
        setCliente(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token, apiBase]);

  const datos = cliente?.datos_completos || {};
  const contacto = datos?.contacto || {};
  const persona = datos?.persona || {};
  const empresa = datos?.empresa || {};
  const fideicomiso = datos?.fideicomiso || {};
  const representante = datos?.representante || {};

  const activityLabel = (() => {
    const ae = persona?.actividad_economica;
    if (!ae) return '—';
    if (typeof ae === 'string') return ae;
    if (typeof ae === 'object') {
      const clave = ae?.clave ? String(ae.clave) : '';
      const desc = ae?.descripcion ? String(ae.descripcion) : '';
      return [desc, clave].filter(Boolean).join(' ') || '—';
    }
    return '—';
  })();

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      {/* Header + CTA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Cliente #{id}
          </h1>
          <p className="text-sm text-gray-600">
            {cliente?.nombre_entidad ? cliente.nombre_entidad : '—'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/cliente/editar-cliente/${id}`)}
            className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            title="Editar cliente"
          >
            ✏️ Editar
          </button>
          <button
            type="button"
            onClick={() => router.push('/cliente/clientes')}
            className="rounded-md border px-4 py-2 text-sm"
          >
            Volver a lista
          </button>
        </div>
      </div>

      {fatal ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {fatal}
        </div>
      ) : null}

      {loading ? <div className="text-sm text-gray-600">Cargando...</div> : null}

      {!loading && !fatal && !cliente ? (
        <div className="text-sm text-gray-600">No se encontró el cliente.</div>
      ) : null}

      {cliente ? (
        <div className="grid grid-cols-1 gap-6">
          {/* Datos generales */}
          <Section title="Datos generales">
            <Row label="ID" value={cliente.id} />
            <Row label="Empresa ID" value={cliente.empresa_id} />
            <Row label="Tipo" value={cliente.tipo_cliente} />
            <Row label="Nacionalidad" value={cliente.nacionalidad} />
            <Row label="Estado" value={cliente.estado} />
            <Row label="Creado" value={fmtDateIso(cliente.creado_en)} />
            <Row label="Actualizado" value={fmtDateIso(cliente.actualizado_en)} />
          </Section>

          {/* Contacto */}
          <Section title="Contacto">
            <Row label="País" value={contacto?.pais} />
            <Row label="Teléfono" value={contacto?.telefono} />
          </Section>

          {/* Resumen por tipo */}
          {cliente.tipo_cliente === 'persona_fisica' ? (
            <Section title="Persona física">
              <Row label="RFC" value={normalizeUpper(persona?.rfc)} />
              <Row label="CURP" value={normalizeUpper(persona?.curp)} />
              <Row label="Nombres" value={persona?.nombres} />
              <Row label="Apellido paterno" value={persona?.apellido_paterno} />
              <Row label="Apellido materno" value={persona?.apellido_materno} />
              <Row label="Fecha nacimiento (AAAAMMDD)" value={persona?.fecha_nacimiento} />
              <Row label="Actividad económica" value={activityLabel} />
            </Section>
          ) : null}

          {cliente.tipo_cliente === 'persona_moral' ? (
            <Section title="Persona moral">
              <Row label="RFC empresa" value={normalizeUpper(empresa?.rfc)} />
              <Row label="Fecha constitución" value={empresa?.fecha_constitucion} />
              <Row label="Giro mercantil" value={empresa?.giro_mercantil || empresa?.giro} />
              <div className="mt-3 border-t pt-3">
                <div className="text-sm font-semibold mb-1">Representante</div>
                <Row label="Nombre completo" value={representante?.nombre_completo} />
                <Row label="Nombres" value={representante?.nombres} />
                <Row label="Apellido paterno" value={representante?.apellido_paterno} />
                <Row label="Apellido materno" value={representante?.apellido_materno} />
                <Row label="RFC" value={normalizeUpper(representante?.rfc)} />
                <Row label="CURP" value={normalizeUpper(representante?.curp)} />
                <Row label="Fecha nacimiento (AAAAMMDD)" value={representante?.fecha_nacimiento} />
              </div>
            </Section>
          ) : null}

          {cliente.tipo_cliente === 'fideicomiso' ? (
            <Section title="Fideicomiso">
              <Row label="Nombre" value={fideicomiso?.fideicomiso_nombre} />
              <Row label="Identificador" value={fideicomiso?.identificador} />
              <Row label="Denominación fiduciario" value={fideicomiso?.denominacion_fiduciario} />
              <Row label="RFC fiduciario" value={normalizeUpper(fideicomiso?.rfc_fiduciario)} />
              <div className="mt-3 border-t pt-3">
                <div className="text-sm font-semibold mb-1">Representante</div>
                <Row label="Nombre completo" value={representante?.nombre_completo} />
                <Row label="RFC" value={normalizeUpper(representante?.rfc)} />
                <Row label="CURP" value={normalizeUpper(representante?.curp)} />
                <Row label="Fecha nacimiento (AAAAMMDD)" value={representante?.fecha_nacimiento} />
              </div>
            </Section>
          ) : null}

          {/* Debug suave (opcional): muestra si faltan datos_completos */}
          <div className="text-xs text-gray-500">
            {cliente.datos_completos ? 'datos_completos: OK' : 'datos_completos: (vacío/no disponible)'}
          </div>
        </div>
      ) : null}
    </div>
  );
}
