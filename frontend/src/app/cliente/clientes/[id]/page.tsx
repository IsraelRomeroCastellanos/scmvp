// frontend/src/app/cliente/clientes/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Cliente = any;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border p-4 space-y-3">
      <div className="font-medium">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
      <div className="font-medium">{label}</div>
      <div className="md:col-span-2 break-words">{value ?? '—'}</div>
    </div>
  );
}

function labelTipo(tipo: string) {
  if (tipo === 'persona_fisica') return 'Persona Física';
  if (tipo === 'persona_moral') return 'Persona Moral';
  if (tipo === 'fideicomiso') return 'Fideicomiso';
  return tipo || '—';
}

export default function Page() {
  const router = useRouter();
  const params = useParams();
  const id = String((params as any)?.id ?? '');

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);

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
        setCliente(data?.cliente ?? null);
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

  const dc = useMemo(() => cliente?.datos_completos ?? {}, [cliente]);
  const contacto = dc?.contacto ?? {};

  if (loading) return <div className="p-6 text-sm">Cargando detalle...</div>;

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

  if (!cliente) {
    return (
      <div className="p-6 space-y-3">
        <div className="rounded border p-3 text-sm">Cliente no encontrado.</div>
        <button className="rounded border px-4 py-2 text-sm" onClick={() => router.push('/cliente/clientes')}>
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Cliente #{cliente.id} — {labelTipo(cliente.tipo_cliente)}
          </h1>
          <div className="text-sm opacity-70">{cliente.nombre_entidad}</div>
        </div>

        <div className="flex gap-2">
          <button className="rounded border px-4 py-2 text-sm" onClick={() => router.push('/cliente/clientes')}>
            Volver
          </button>
          <button className="rounded border px-4 py-2 text-sm" onClick={() => router.push(`/cliente/editar-cliente/${cliente.id}`)}>
            Editar
          </button>
        </div>
      </div>

      <Section title="Datos generales">
        <Row label="Empresa ID" value={cliente.empresa_id} />
        <Row label="Nombre / Entidad" value={cliente.nombre_entidad} />
        <Row label="Tipo" value={labelTipo(cliente.tipo_cliente)} />
        <Row label="Nacionalidad" value={cliente.nacionalidad} />
        <Row label="Estado" value={cliente.estado} />
        <Row label="Creado" value={cliente.creado_en} />
        <Row label="Actualizado" value={cliente.actualizado_en} />
      </Section>

      <Section title="Contacto">
        <Row label="País" value={contacto?.pais} />
        <Row label="Teléfono" value={contacto?.telefono} />
        <Row label="Email" value={contacto?.email} />
        <Row label="Domicilio" value={contacto?.domicilio} />
      </Section>

      {cliente.tipo_cliente === 'persona_fisica' && (
        <Section title="Persona Física">
          <Row label="Nombres" value={dc?.persona?.nombres} />
          <Row label="Apellido paterno" value={dc?.persona?.apellido_paterno} />
          <Row label="Apellido materno" value={dc?.persona?.apellido_materno} />
          <Row label="Fecha nacimiento" value={dc?.persona?.fecha_nacimiento} />
          <Row label="RFC" value={dc?.persona?.rfc} />
          <Row label="CURP" value={dc?.persona?.curp} />
          <Row
            label="Actividad económica"
            value={
              dc?.persona?.actividad_economica
                ? `${dc.persona.actividad_economica.descripcion} (${dc.persona.actividad_economica.clave})`
                : '—'
            }
          />
        </Section>
      )}

      {cliente.tipo_cliente === 'persona_moral' && (
        <Section title="Persona Moral">
          <Row label="RFC" value={dc?.empresa?.rfc} />
          <Row label="Fecha constitución" value={dc?.empresa?.fecha_constitucion} />
          <Row
            label="Giro mercantil"
            value={
              dc?.empresa?.giro_detalle
                ? `${dc.empresa.giro_detalle.descripcion} (${dc.empresa.giro_detalle.clave})`
                : dc?.empresa?.giro
            }
          />

          <div className="pt-3 border-t" />

          <div className="font-medium">Representante</div>
          <Row label="Nombres" value={dc?.representante?.nombres} />
          <Row label="Apellido paterno" value={dc?.representante?.apellido_paterno} />
          <Row label="Apellido materno" value={dc?.representante?.apellido_materno} />
          <Row label="RFC" value={dc?.representante?.rfc} />
          <Row label="CURP" value={dc?.representante?.curp} />
        </Section>
      )}

      {cliente.tipo_cliente === 'fideicomiso' && (
        <Section title="Fideicomiso (iteración 1)">
          <Row label="Identificador" value={dc?.fideicomiso?.identificador} />
          <Row label="RFC Fiduciario" value={dc?.fideicomiso?.rfc_fiduciario} />
          <Row label="Denominación fiduciario" value={dc?.fideicomiso?.denominacion_fiduciario} />

          <div className="pt-3 border-t" />

          <div className="font-medium">Representante / Apoderado</div>
          <Row label="Nombre completo" value={dc?.representante?.nombre_completo} />
          <Row label="Nombres" value={dc?.representante?.nombres} />
          <Row label="Apellido paterno" value={dc?.representante?.apellido_paterno} />
          <Row label="Apellido materno" value={dc?.representante?.apellido_materno} />
          <Row label="Fecha nacimiento" value={dc?.representante?.fecha_nacimiento} />
          <Row label="RFC" value={dc?.representante?.rfc} />
          <Row label="CURP" value={dc?.representante?.curp} />
        </Section>
      )}

      <div className="rounded border p-4">
        <details>
          <summary className="cursor-pointer select-none font-medium">Debug: datos_completos</summary>
          <pre className="mt-3 text-xs overflow-auto whitespace-pre-wrap">{JSON.stringify(dc, null, 2)}</pre>
        </details>
      </div>
    </div>
  );
}
