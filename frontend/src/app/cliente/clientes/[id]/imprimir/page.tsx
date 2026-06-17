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


function getDomicilio(contacto: any): any {
  return contacto?.domicilio ?? contacto?.domicilio_mexico ?? {};
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

function firstNonEmpty(...values: any[]): any {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && !value.trim()) continue;
    return value;
  }

  return '';
}

function getBeneficiariosControladores(dc: any): any[] {
  if (Array.isArray(dc?.beneficiarios_controladores)) {
    return dc.beneficiarios_controladores;
  }

  return Array.isArray(dc?.duenos_beneficiarios) ? dc.duenos_beneficiarios : [];
}

function beneficiarioField(row: any, field: string): any {
  return firstNonEmpty(
    row?.datos_completos?.persona?.[field],
    row?.[field]
  );
}

function shouldShowBeneficiariosEmptyCopy(rows: any[], aplica: boolean, showAplica: boolean): boolean {
  return rows.length === 0 && (!showAplica || aplica);
}

function BeneficiariosControladoresSection({
  rows,
  aplica,
  showAplica = false
}: {
  rows: any[];
  aplica: boolean;
  showAplica?: boolean;
}) {
  return (
    <Section title="Beneficiario Controlador">
      {showAplica ? <Row label="Aplica" value={aplica ? 'Sí' : 'No'} /> : null}

      {rows.length ? (
        <div className="space-y-3">
          {rows.map((row: any, index: number) => {
            const nombre = [
              beneficiarioField(row, 'nombres'),
              beneficiarioField(row, 'apellido_paterno'),
              beneficiarioField(row, 'apellido_materno')
            ]
              .map((part) => String(part ?? '').trim())
              .filter(Boolean)
              .join(' ') || String(row?.nombre_entidad ?? '').trim();

            return (
              <div key={index} className="rounded border border-gray-200 p-3 space-y-1">
                <div className="text-sm font-medium">Beneficiario Controlador {index + 1}</div>
                <Row label="Nombre" value={nombre} />
                <Row label="Fecha nacimiento" value={fmtYYYYMMDD(beneficiarioField(row, 'fecha_nacimiento'))} />
                <Row label="Nacionalidad" value={beneficiarioField(row, 'nacionalidad')} />
                <Row label="Relación con el cliente" value={beneficiarioField(row, 'relacion_con_cliente')} />
                <Row label="RFC" value={beneficiarioField(row, 'rfc')} />
                <Row label="CURP" value={beneficiarioField(row, 'curp')} />
                <Row label="Porcentaje accionario" value={beneficiarioField(row, 'porcentaje_participacion')} />
              </div>
            );
          })}
        </div>
      ) : shouldShowBeneficiariosEmptyCopy(rows, aplica, showAplica) ? (
        <div className="text-sm text-gray-600">Sin beneficiarios controladores registrados.</div>
      ) : null}
    </Section>
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
  const rep = dc.representante ?? empresa.representante ?? {};
  const repId = rep.identificacion ?? {};
  const fidei = dc.fideicomiso ?? {};

  const isPF = cliente.tipo_cliente === 'persona_fisica';
  const isPM = cliente.tipo_cliente === 'persona_moral';
  const isFID = cliente.tipo_cliente === 'fideicomiso';

  const contactoDomicilio = getDomicilio(contacto);
  const beneficiariosControladores = getBeneficiariosControladores(dc);
  const beneficiariosControladoresAplica =
    typeof dc?.beneficiarios_controladores_aplica === 'boolean'
      ? dc.beneficiarios_controladores_aplica
      : !!dc?.duenos_beneficiarios_aplica || beneficiariosControladores.length > 0;

  const representanteEsAccionista =
    dc?.representante_es_accionista === true;

  const accionistaTercero =
    dc?.accionista_tercero &&
    typeof dc.accionista_tercero === 'object' &&
    !Array.isArray(dc.accionista_tercero)
      ? dc.accionista_tercero
      : null;
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

      {isPF || isPM || isFID ? (
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

          <BeneficiariosControladoresSection
            rows={beneficiariosControladores}
            aplica={beneficiariosControladoresAplica}
            showAplica
          />

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

          <Section title="Participación accionaria del representante legal">
  <Row
  label="El representante legal también es accionista"
  value={representanteEsAccionista ? 'Sí' : 'No'}
  />

  {representanteEsAccionista ? (
  accionistaTercero ? (
  <>
  <Row
  label="Porcentaje accionario"
  value={accionistaTercero?.porcentaje_accionario ?? ''}
  />
  <Row
  label="Relación con la sociedad"
  value={accionistaTercero?.relacion ?? ''}
  />
  </>
  ) : (
  <div className="text-sm text-gray-600">
  Información accionaria no disponible.
  </div>
  )
  ) : null}
  </Section>

          <BeneficiariosControladoresSection
            rows={beneficiariosControladores}
            aplica={beneficiariosControladoresAplica}
          />

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


      {isFID ? (
        <>
          <Section title="Fideicomiso">
            <Row label="Nombre del fideicomiso" value={fidei.fideicomiso_nombre ?? ''} />
            <Row label="Identificador del fideicomiso" value={fidei.identificador ?? ''} />
            <Row label="Denominación / Razón social del fiduciario" value={fidei.denominacion_fiduciario ?? ''} />
            <Row label="RFC del fiduciario" value={fidei.rfc_fiduciario ?? ''} />
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

                  <BeneficiariosControladoresSection
            rows={beneficiariosControladores}
            aplica={beneficiariosControladoresAplica}
          />

          <Section title="Acuerdo de confidencialidad (Fideicomiso)">
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
              <div className="text-center">NOMBRE DEL FIDEICOMISO</div>

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

    </div>
  );
}
