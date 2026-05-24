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


function YesNoBoxes({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <Checkbox checked={false} /> Sí
      </span>
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <Checkbox checked={false} /> No
      </span>
      <span className="flex-1">{text}</span>
    </div>
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

function formatCatalogValue(v: any): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && (v?.clave || v?.descripcion)) {
    const clave = String(v?.clave ?? '').trim();
    const descripcion = String(v?.descripcion ?? '').trim();
    if (descripcion && clave) return `${descripcion} (${clave})`;
    if (descripcion) return descripcion;
    if (clave) return clave;
  }
  return String(v ?? '').trim();
}

function boolText(v: any): string {
  return v ? 'Sí' : 'No';
}

function getDomicilio(contacto: any): any {
  return contacto?.domicilio ?? contacto?.domicilio_mexico ?? {};
}

function getRecursosTerceros(dc: any, persona: any, empresa?: any, tipoCliente?: string): any[] {
  const root = Array.isArray(dc?.recursos_terceros) ? dc.recursos_terceros : [];
  const personaRecursos = Array.isArray(persona?.recursos_terceros) ? persona.recursos_terceros : [];
  const empresaRecursos = Array.isArray(empresa?.recursos_terceros) ? empresa.recursos_terceros : [];

  let merged: any[] = [];

  if (tipoCliente === 'persona_moral') {
    merged = [...root, ...empresaRecursos];

    // Fallback legacy/pruebas: solo usar persona.recursos_terceros si PM no trae root/empresa.
    if (!merged.length && personaRecursos.length) {
      merged = [...personaRecursos];
    }
  } else if (tipoCliente === 'persona_fisica') {
    merged = [...root, ...personaRecursos];
  } else {
    merged = [...root];
  }

  const seen = new Set<string>();

  return merged.filter((row) => {
    let key = '';
    try {
      key = JSON.stringify(row);
    } catch {
      key = String(row);
    }

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function recursoActividad(row: any): any {
  return (
    row?.actividad_giro ??
    row?.datos_completos?.persona?.actividad_economica ??
    row?.datos_completos?.empresa?.giro_mercantil ??
    ''
  );
}

function recursoRfc(row: any): any {
  return row?.rfc ?? row?.datos_completos?.persona?.rfc ?? row?.datos_completos?.empresa?.rfc ?? '';
}

function recursoCurp(row: any): any {
  return row?.curp ?? row?.datos_completos?.persona?.curp ?? '';
}

function recursoFechaNacimiento(row: any): any {
  return row?.fecha_nacimiento ?? row?.datos_completos?.persona?.fecha_nacimiento ?? '';
}


function fullNameFromParts(v: any): string {
  const direct = String(v?.nombre_completo ?? v?.nombre ?? '').trim();
  if (direct) return direct;

  return [
    v?.nombres,
    v?.apellido_paterno,
    v?.apellido_materno
  ]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ');
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

  const contactoDomicilio = getDomicilio(contacto);
  const recursosTerceros = getRecursosTerceros(dc, persona, empresa, cliente.tipo_cliente);
  const paisContactoLabel = isPF ? 'País de nacimiento' : isPM ? 'País de constitución' : 'País';

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4 print:p-0">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <button className="rounded border border-gray-300 px-3 py-2 text-sm" onClick={() => router.back()}>
          Volver
        </button>

        <div className="flex items-center gap-2">
          <button className="rounded bg-black px-3 py-2 text-sm text-white" onClick={() => window.print()}>
            Imprimir
          </button>

          <button
            className="rounded border border-gray-300 px-3 py-2 text-sm"
            onClick={() => router.push(`/cliente/clientes/${id}`)}
          >
            Ir a detalle
          </button>
        </div>
      </div>

      <div className="text-center space-y-1">
        <div className="text-lg font-semibold">Formato de Identificación de Cliente</div>
        <div className="text-sm text-gray-700">
          Cliente ID: {cliente.id} · Empresa ID: {cliente.empresa_id} · Tipo: {cliente.tipo_cliente} · Estado:{' '}
          {cliente.estado}
        </div>
      </div>

      <Section title="Encabezado">
        <Row
          label={isPM ? 'Razón social' : 'Nombre entidad'}
          value={isPM ? empresa.razon_social ?? empresa.nombre_entidad ?? cliente.nombre_entidad : cliente.nombre_entidad}
        />
        <Row label="Nacionalidad" value={cliente.nacionalidad} />
        <Row label="Creado" value={cliente.creado_en ?? ''} />
      </Section>

      <Section title="Contacto">
        <Row label={paisContactoLabel} value={contacto.pais ?? ''} />
        <Row label="Email" value={contacto.email ?? ''} />
        <Row label="Teléfono" value={contacto.telefono ?? ''} />
      </Section>

      {isPF || isPM ? (
        <Section title="Domicilio">
          <Row label="Calle" value={contactoDomicilio.calle ?? ''} />
          <Row label="Número exterior" value={contactoDomicilio.numero ?? ''} />
          <Row label="Número interior" value={contactoDomicilio.interior ?? ''} />
          <Row label="Colonia" value={contactoDomicilio.colonia ?? ''} />
          <Row label="Municipio" value={contactoDomicilio.municipio ?? ''} />
          <Row
            label="Ciudad / Delegación"
            value={contactoDomicilio.ciudad_delegacion ?? contactoDomicilio.ciudadDelegacion ?? contactoDomicilio.ciudad ?? ''}
          />
          <Row label="Código postal" value={contactoDomicilio.codigo_postal ?? contactoDomicilio.codigoPostal ?? ''} />
          <Row label="Estado" value={contactoDomicilio.estado ?? ''} />
          <Row label="País domicilio" value={contactoDomicilio.pais ?? ''} />
        </Section>
      ) : null}

      {isPF ? (
        <>
          <Section title="Persona Física">
            <Row label="RFC" value={persona.rfc ?? ''} />
            <Row label="CURP" value={persona.curp ?? ''} />
            <Row label="Nombre(s)" value={persona.nombres ?? ''} />
            <Row label="Apellido paterno" value={persona.apellido_paterno ?? ''} />
            <Row label="Apellido materno" value={persona.apellido_materno ?? ''} />
            <Row label="Fecha nacimiento" value={fmtYYYYMMDD(persona.fecha_nacimiento)} />
            <Row label="Actividad económica" value={formatCatalogValue(persona.actividad_economica)} />
          </Section>

          <Section title="Identificación / Acreditación">
            <Row label="Tipo / documento" value={pfId.tipo ?? ''} />
            <Row label="Autoridad" value={pfId.autoridad ?? ''} />
            <Row label="Número" value={pfId.numero ?? ''} />
            <Row label="Fecha expedición" value={fmtYYYYMMDD(pfId.fecha_expedicion)} />
            <Row label="Fecha expiración" value={fmtYYYYMMDD(pfId.fecha_expiracion)} />
          </Section>

          <Section title="Recursos de terceros">
            {recursosTerceros.length ? (
              <div className="space-y-3">
                {recursosTerceros.map((row, index) => (
                  <div key={index} className="rounded border border-gray-200 p-3 space-y-1">
                    <div className="text-sm font-medium">Recurso {index + 1}</div>
                    <Row label="Tipo tercero" value={row?.tipo_tercero ?? row?.tipo_entidad ?? ''} />
                    <Row label="Nombre / Razón social" value={row?.nombre_razon_social ?? row?.nombre_entidad ?? ''} />
                    <Row label="Relación con cliente" value={row?.relacion_con_cliente ?? ''} />
                    <Row label="Actividad / giro" value={formatCatalogValue(recursoActividad(row))} />
                    <Row label="Sin documentación" value={boolText(row?.sin_documentacion)} />
                    <Row label="RFC" value={recursoRfc(row)} />
                    <Row label="CURP" value={recursoCurp(row)} />
                    <Row label="Fecha nacimiento" value={fmtYYYYMMDD(recursoFechaNacimiento(row))} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-600">Sin recursos de terceros registrados.</div>
            )}
          </Section>

          <Section title="Acuerdo de confidencialidad (PF)">
            <div className="text-sm text-gray-800">
              Texto a insertar (pendiente versión final) con espacios para el nombre oficial de la empresa (empresa_id:{' '}
              {cliente.empresa_id}).
            </div>

            <div className="space-y-2 pt-2">
              <YesNoBoxes text="Declaro que acepto los términos incluidos en el acuerdo de confidencialidad." />
              <YesNoBoxes text="Declaro bajo protesta de decir verdad, que los datos asentados son verdaderos y que actuó por cuenta propia." />
              <YesNoBoxes text="Declaro que el origen de los recursos con los que operaré son de origen lícito y la finalidad de la operación será para un fin lícito." />
              <YesNoBoxes text="Declaro bajo protesta de confirmar que se realizó entrevista personal, donde se me conoció de manera directa." />
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
            <Row label="Giro mercantil" value={formatCatalogValue(empresa.giro_mercantil)} />
          </Section>

          <Section title="Representante Legal">
            <Row label="Nombre completo" value={fullNameFromParts(rep)} />
            <Row label="RFC" value={rep.rfc ?? ''} />
            <Row label="CURP" value={rep.curp ?? ''} />
            <Row label="Fecha nacimiento" value={fmtYYYYMMDD(rep.fecha_nacimiento)} />
          </Section>

          <Section title="Identificación del Representante Legal">
            <Row label="Tipo / documento" value={repId.tipo ?? ''} />
            <Row label="Autoridad" value={repId.autoridad ?? ''} />
            <Row label="Número" value={repId.numero ?? ''} />
            <Row label="Fecha expedición" value={fmtYYYYMMDD(repId.fecha_expedicion)} />
            <Row label="Fecha expiración" value={fmtYYYYMMDD(repId.fecha_expiracion)} />
          </Section>

          <Section title="Recursos de terceros">
            {recursosTerceros.length ? (
              <div className="space-y-3">
                {recursosTerceros.map((row, index) => (
                  <div key={index} className="rounded border border-gray-200 p-3 space-y-1">
                    <div className="text-sm font-medium">Recurso {index + 1}</div>
                    <Row label="Tipo tercero" value={row?.tipo_tercero ?? row?.tipo_entidad ?? ''} />
                    <Row label="Nombre / Razón social" value={row?.nombre_razon_social ?? row?.nombre_entidad ?? ''} />
                    <Row label="Relación con cliente" value={row?.relacion_con_cliente ?? ''} />
                    <Row label="Actividad / giro" value={formatCatalogValue(recursoActividad(row))} />
                    <Row label="Sin documentación" value={boolText(row?.sin_documentacion)} />
                    <Row label="RFC" value={recursoRfc(row)} />
                    <Row label="CURP" value={recursoCurp(row)} />
                    <Row label="Fecha nacimiento" value={fmtYYYYMMDD(recursoFechaNacimiento(row))} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-600">Sin recursos de terceros registrados.</div>
            )}
          </Section>

          <Section title="Acuerdo de confidencialidad (PM)">
            <div className="text-sm text-gray-800">
              Texto a insertar (pendiente versión final) con espacios para el nombre oficial de la empresa (empresa_id:{' '}
              {cliente.empresa_id}).
            </div>

            <div className="space-y-2 pt-2">
              <YesNoBoxes text="Declaro que acepto los términos incluidos en el acuerdo de confidencialidad." />
              <YesNoBoxes text="Declaro bajo protesta de decir verdad, que los datos asentados son verdaderos." />
              <YesNoBoxes text="Declaro bajo protesta de confirmar que se realizó entrevista personal, donde se me conoció de manera directa." />
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
