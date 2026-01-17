// frontend/src/app/cliente/clientes/[id]/imprimir/page.tsx
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
  creado_en?: string;
  actualizado_en?: string;
  datos_completos?: any;
};

function fmtYYYYMMDD(v: any): string {
  const s = String(v ?? '').trim();
  if (!s) return '';
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span className="inline-block h-4 w-4 rounded border border-gray-700 align-middle">
      {checked ? <span className="block h-full w-full bg-gray-900" /> : null}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-300 rounded p-3 space-y-2">
      <div className="font-semibold">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  const v = value === null || value === undefined ? '' : String(value);
  return (
    <div className="grid grid-cols-12 gap-2 text-sm">
      <div className="col-span-4 text-gray-700">{label}</div>
      <div className="col-span-8 border-b border-dotted border-gray-400">{v}</div>
    </div>
  );
}

export default function ImprimirClientePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);

  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL || 'https://scmvp-1jhq.onrender.com', []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    if (!id || Number.isNaN(id)) {
      setFatal('ID inválido');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setFatal(null);
        setLoading(true);

        const res = await fetch(`${apiBase}/api/cliente/clientes/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setFatal(data?.error || `Error HTTP ${res.status}`);
          return;
        }

        setCliente(data?.cliente ?? null);
      } catch (e: any) {
        setFatal(e?.message ?? 'Error inesperado');
      } finally {
        setLoading(false);
      }
    })();
  }, [apiBase, id, router]);

  if (loading) return <div className="max-w-3xl mx-auto p-4">Cargando...</div>;
  if (fatal) return <div className="max-w-3xl mx-auto p-4 text-red-700">{fatal}</div>;
  if (!cliente) return <div className="max-w-3xl mx-auto p-4">Sin datos.</div>;

  const dc = cliente.datos_completos ?? {};
  const contacto = dc.contacto ?? {};

  const persona = dc.persona ?? {};
  const pfId = persona.identificacion ?? {};

  const empresa = dc.empresa ?? {};
  const rep = dc.representante ?? {};
  const repId = rep.identificacion ?? {};

  const isPF = cliente.tipo_cliente === 'persona_fisica';
  const isPM = cliente.tipo_cliente === 'persona_moral';

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4 print:p-0">
      {/* Barra de acciones (NO imprime automático, solo botón) */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <button className="rounded border border-gray-300 px-3 py-2 text-sm" onClick={() => router.back()}>
          Volver
        </button>
        <div className="flex items-center gap-2">
          <button className="rounded bg-black px-3 py-2 text-sm text-white" onClick={() => window.print()}>
            Imprimir
          </button>
          <button className="rounded border border-gray-300 px-3 py-2 text-sm" onClick={() => router.push(`/cliente/clientes/${id}`)}>
            Ir a detalle
          </button>
        </div>
      </div>

      <div className="text-center space-y-1">
        <div className="text-lg font-semibold">Formato de Identificación de Cliente</div>
        <div className="text-sm text-gray-700">
          Cliente ID: {cliente.id} · Empresa ID: {cliente.empresa_id} · Tipo: {cliente.tipo_cliente} · Estado: {cliente.estado}
        </div>
      </div>

      <Section title="Encabezado">
        <Row label="Nombre entidad" value={cliente.nombre_entidad} />
        <Row label="Nacionalidad" value={cliente.nacionalidad} />
        <Row label="Creado" value={cliente.creado_en ?? ''} />
      </Section>

      <Section title="Contacto">
        <Row label="País" value={contacto.pais ?? ''} />
        <Row label="Email" value={contacto.email ?? ''} />
        <Row label="Teléfono" value={contacto.telefono ?? ''} />
      </Section>

      {isPF ? (
        <>
          <Section title="Persona Física">
            <Row label="RFC" value={persona.rfc ?? ''} />
            <Row label="CURP" value={persona.curp ?? ''} />
            <Row label="Nombre(s)" value={persona.nombres ?? ''} />
            <Row label="Apellido paterno" value={persona.apellido_paterno ?? ''} />
            <Row label="Apellido materno" value={persona.apellido_materno ?? ''} />
            <Row label="Fecha nacimiento" value={fmtYYYYMMDD(persona.fecha_nacimiento)} />
            <Row
              label="Actividad económica"
              value={
                typeof persona.actividad_economica === 'object'
                  ? `${persona.actividad_economica.descripcion} (${persona.actividad_economica.clave})`
                  : persona.actividad_economica
              }
            />
          </Section>

          <Section title="Identificación / Acreditación">
            <Row label="Tipo / documento" value={pfId.tipo ?? ''} />
            <Row label="Autoridad" value={pfId.autoridad ?? ''} />
            <Row label="Número" value={pfId.numero ?? ''} />
            <Row label="Fecha expedición" value={fmtYYYYMMDD(pfId.fecha_expedicion)} />
            <Row label="Fecha expiración" value={fmtYYYYMMDD(pfId.fecha_expiracion)} />
          </Section>

          <Section title="Acuerdo de confidencialidad (PF)">
            <div className="text-sm text-gray-800">
              Texto a insertar (pendiente versión final) con espacios para el nombre oficial de la empresa (empresa_id: {cliente.empresa_id}).
            </div>

            <div className="space-y-2 pt-2 text-sm">
              <div className="flex items-center gap-2">
                <Checkbox checked={false} /> Declaro que acepto los términos incluidos en el acuerdo de confidencialidad (Sí/No)
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={false} /> Declaro bajo protesta de decir verdad, que los datos asentados son verdaderos y que actuó por cuenta propia. (Sí/No)
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={false} /> Declaro que el origen de los recursos con los que operaré son de origen lícito y la finalidad de la operación será para un fin lícito. (Sí/No)
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={false} /> Declaro bajo protesta de confirmar que se realizó entrevista personal, donde se me conoció de manera directa. (Sí/No)
              </div>
            </div>

            <div className="pt-6 text-sm">
              <div className="border-b border-gray-500 mt-6" />
              <div className="text-center mt-2">NOMBRE Y FIRMA</div>
            </div>
          </Section>
        </>
      ) : null}

      {isPM ? (
        <>
          <Section title="Persona Moral">
            <Row label="RFC (empresa)" value={empresa.rfc ?? ''} />
            <Row label="Fecha constitución" value={empresa.fecha_constitucion ?? ''} />
            <Row
              label="Giro mercantil"
              value={
                typeof empresa.giro_mercantil === 'object'
                  ? `${empresa.giro_mercantil.descripcion} (${empresa.giro_mercantil.clave})`
                  : empresa.giro_mercantil
              }
            />
          </Section>

          <Section title="Representante Legal">
            <Row label="Nombre completo" value={rep.nombre_completo ?? ''} />
          </Section>

          <Section title="Identificación del Representante Legal">
            <Row label="Tipo / documento" value={repId.tipo ?? ''} />
            <Row label="Autoridad" value={repId.autoridad ?? ''} />
            <Row label="Número" value={repId.numero ?? ''} />
            <Row label="Fecha expedición" value={fmtYYYYMMDD(repId.fecha_expedicion)} />
            <Row label="Fecha expiración" value={fmtYYYYMMDD(repId.fecha_expiracion)} />
          </Section>

          <Section title="Acuerdo de confidencialidad (PM)">
            <div className="text-sm text-gray-800">
              Texto a insertar (pendiente versión final) con espacios para el nombre oficial de la empresa (empresa_id: {cliente.empresa_id}).
            </div>

            <div className="space-y-2 pt-2 text-sm">
              <div className="flex items-center gap-2">
                <Checkbox checked={false} /> Declaro que acepto los términos incluidos en el acuerdo de confidencialidad (Sí/No)
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={false} /> Declaro bajo protesta de decir verdad, que los datos asentados son verdaderos. (Sí/No)
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={false} /> Declaro bajo protesta de confirmar que se realizó entrevista personal, donde se me conoció de manera directa. (Sí/No)
              </div>
            </div>

            <div className="pt-6 text-sm space-y-3">
              <div className="border-b border-gray-500 mt-6" />
              <div className="text-center">NOMBRE DE LA EMPRESA</div>

              <div className="grid grid-cols-2 gap-6 pt-8">
                <div>
                  <div className="border-b border-gray-500" />
                  <div className="text-center mt-2">Fecha</div>
                </div>
                <div>
                  <div className="border-b border-gray-500" />
                  <div className="text-center mt-2">FIRMA REPRESENTANTE LEGAL</div>
                </div>
              </div>
            </div>
          </Section>
        </>
      ) : null}

      <div className="text-xs text-gray-500 print:hidden">Nota: Fideicomiso (impresión) pendiente por requerimiento.</div>
    </div>
  );
}
