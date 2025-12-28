// frontend/src/app/cliente/clientes/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Cliente = {
  id: number;
  empresa_id: number;
  nombre_entidad: string;
  tipo_cliente: 'persona_fisica' | 'persona_moral' | 'fideicomiso';
  nacionalidad: string | null;
  estado: string | null;
  creado_en?: string;
  actualizado_en?: string;
  datos_completos?: any;
};

function formatDateIso(dt?: string) {
  if (!dt) return '';
  try {
    const d = new Date(dt);
    return d.toLocaleString();
  } catch {
    return dt;
  }
}

export default function ClienteDetallePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const id = params.id;

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function run() {
      setLoading(true);
      setErr(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setErr('No hay token. Inicia sesión de nuevo.');
        setLoading(false);
        return;
      }

      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
        const res = await fetch(`${apiBase}/api/cliente/clientes/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setErr(data?.error || `Error HTTP ${res.status}`);
          return;
        }

        if (mounted) setCliente(data?.cliente ?? null);
      } catch (e: any) {
        setErr(e?.message || 'Error de red');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <div className="p-6 text-sm">Cargando cliente...</div>;

  if (err || !cliente) {
    return (
      <div className="p-6 space-y-3">
        <div className="rounded border p-3 text-sm">{err || 'No se pudo cargar el cliente.'}</div>
        <button className="rounded border px-4 py-2 text-sm" onClick={() => router.push('/cliente/clientes')}>
          Volver
        </button>
      </div>
    );
  }

  const dc = cliente.datos_completos ?? {};
  const contacto = dc.contacto ?? {};

  const persona = dc.persona ?? {};
  const empresa = dc.empresa ?? {};
  const rep = dc.representante ?? {};
  const fideicomiso = dc.fideicomiso ?? {};

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          Cliente #{cliente.id} — {cliente.nombre_entidad}
        </h1>
        <div className="flex gap-2">
          <button className="rounded border px-4 py-2 text-sm" onClick={() => router.push('/cliente/clientes')}>
            Volver
          </button>
          <button className="rounded border px-4 py-2 text-sm" onClick={() => router.push(`/cliente/editar-cliente/${cliente.id}`)}>
            Editar
          </button>
        </div>
      </div>

      <div className="rounded border p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <div className="font-medium">Tipo</div>
          <div>{cliente.tipo_cliente}</div>
        </div>
        <div>
          <div className="font-medium">Empresa ID</div>
          <div>{cliente.empresa_id}</div>
        </div>
        <div>
          <div className="font-medium">Nacionalidad</div>
          <div>{cliente.nacionalidad ?? '-'}</div>
        </div>
        <div>
          <div className="font-medium">Estado</div>
          <div>{cliente.estado ?? '-'}</div>
        </div>
        <div>
          <div className="font-medium">Creado</div>
          <div>{formatDateIso(cliente.creado_en)}</div>
        </div>
        <div>
          <div className="font-medium">Actualizado</div>
          <div>{formatDateIso(cliente.actualizado_en)}</div>
        </div>
      </div>

      <div className="rounded border p-4 space-y-2">
        <div className="font-medium">Contacto</div>
        <div className="text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <span className="font-medium">País:</span> {contacto?.pais ?? '-'}
          </div>
          <div>
            <span className="font-medium">Teléfono:</span> {contacto?.telefono ?? '-'}
          </div>
          <div>
            <span className="font-medium">Email:</span> {contacto?.email ?? '-'}
          </div>
          <div>
            <span className="font-medium">Domicilio:</span> {contacto?.domicilio ?? '-'}
          </div>
        </div>
      </div>

      {cliente.tipo_cliente === 'persona_fisica' && (
        <div className="rounded border p-4 space-y-2">
          <div className="font-medium">Persona Física</div>
          <div className="text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <span className="font-medium">Nombres:</span> {persona?.nombres ?? '-'}
            </div>
            <div>
              <span className="font-medium">Apellido paterno:</span> {persona?.apellido_paterno ?? '-'}
            </div>
            <div>
              <span className="font-medium">Apellido materno:</span> {persona?.apellido_materno ?? '-'}
            </div>
            <div>
              <span className="font-medium">Actividad económica:</span>{' '}
              {persona?.actividad_economica?.descripcion
                ? `${persona.actividad_economica.descripcion} (${persona.actividad_economica.clave})`
                : '-'}
            </div>
          </div>
        </div>
      )}

      {cliente.tipo_cliente === 'persona_moral' && (
        <div className="rounded border p-4 space-y-4">
          <div>
            <div className="font-medium">Persona Moral</div>
            <div className="text-sm grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              <div>
                <span className="font-medium">RFC:</span> {empresa?.rfc ?? '-'}
              </div>
              <div>
                <span className="font-medium">Fecha constitución:</span> {empresa?.fecha_constitucion ?? '-'}
              </div>
              <div className="md:col-span-2">
                <span className="font-medium">Giro mercantil:</span> {empresa?.giro ?? '-'}
              </div>
            </div>
          </div>

          <div className="rounded border p-3 space-y-2">
            <div className="font-medium">Representante</div>
            <div className="text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <span className="font-medium">Nombres:</span> {rep?.nombres ?? '-'}
              </div>
              <div>
                <span className="font-medium">Apellido paterno:</span> {rep?.apellido_paterno ?? '-'}
              </div>
              <div>
                <span className="font-medium">Apellido materno:</span> {rep?.apellido_materno ?? '-'}
              </div>
              <div>
                <span className="font-medium">RFC:</span> {rep?.rfc ?? '-'}
              </div>
              <div>
                <span className="font-medium">CURP:</span> {rep?.curp ?? '-'}
              </div>
            </div>
          </div>
        </div>
      )}

      {cliente.tipo_cliente === 'fideicomiso' && (
        <div className="rounded border p-4 space-y-4">
          <div>
            <div className="font-medium">Fideicomiso</div>
            <div className="text-sm grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              <div className="md:col-span-2">
                <span className="font-medium">Denominación fiduciario:</span> {fideicomiso?.denominacion_fiduciario ?? '-'}
              </div>
              <div>
                <span className="font-medium">RFC fiduciario:</span> {fideicomiso?.rfc_fiduciario ?? '-'}
              </div>
              <div>
                <span className="font-medium">Identificador:</span> {fideicomiso?.identificador ?? '-'}
              </div>
            </div>
          </div>

          <div className="rounded border p-3 space-y-2">
            <div className="font-medium">Representante / Apoderado</div>
            <div className="text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="md:col-span-2">
                <span className="font-medium">Nombre completo:</span> {rep?.nombre_completo ?? '-'}
              </div>
              <div>
                <span className="font-medium">RFC:</span> {rep?.rfc ?? '-'}
              </div>
              <div>
                <span className="font-medium">CURP:</span> {rep?.curp ?? '-'}
              </div>
              <div>
                <span className="font-medium">Fecha nacimiento:</span> {rep?.fecha_nacimiento ?? '-'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded border p-4">
        <details>
          <summary className="cursor-pointer select-none font-medium">Debug: datos_completos</summary>
          <pre className="mt-3 text-xs overflow-auto whitespace-pre-wrap">
            {JSON.stringify(dc, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
