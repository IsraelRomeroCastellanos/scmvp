// frontend/src/app/cliente/editar-cliente/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { loadCatalogo, type CatalogItem } from '@/lib/catalogos';
import {
  findCodigoPostalMx,
  loadCodigosPostalesMx,
  normalizeCodigoPostalMx,
  type CodigoPostalMx,
} from '@/lib/codigosPostalesMx';
import {
  buildBeneficiariosControladoresContract,
  validateBeneficiariosControladores,
} from '../../registrar-cliente/validate';

type TipoCliente = 'persona_fisica' | 'persona_moral' | 'fideicomiso';
type Errors = Record<string, string>;

type DuenoBeneficiarioItem = {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: string;
  nacionalidad: string;
  relacion_con_cliente: string;
  rfc: string;
  curp: string;
  porcentaje_participacion: string;
  observaciones: string;
};


function createEmptyRelatedDueno(): RelatedDuenoRow {
  return {
    tipo_entidad: 'persona_fisica',
    nombre_entidad: "",
    nacionalidad: "MEX",
    relacion_con_cliente: "",
    porcentaje_participacion: "",
    sin_documentacion: false,
    observaciones: "",
    datos_completos: {
      persona: {
        nombres: "",
        apellido_paterno: "",
        apellido_materno: "",
        fecha_nacimiento: "",
        nacionalidad: "MEX",
        relacion_con_cliente: "",
        rfc: "",
        curp: "",
        porcentaje_participacion: "",
        observaciones: "",
      },
      contacto: {
        pais: "",
        email: "",
        telefono: "",
        domicilio: {
          calle: "",
          numero: "",
          interior: "",
          colonia: "",
          municipio: "",
          ciudad_delegacion: "",
          codigo_postal: "",
          estado: "",
          pais: "",
        },
      },
    },
  };
}

function deriveRelatedDuenoNombre(row: RelatedDuenoRow): string {
  const p = row.datos_completos?.persona || ({} as any);
  return [p.nombres, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(" ").trim();
}

function normalizeRelatedDuenoRow(row: any): RelatedDuenoRow {
  const p = row?.datos_completos?.persona || row || {};
  const c = row?.datos_completos?.contacto || {};
  const d = c?.domicilio || {};
  const porcentaje = safeInput(
    p?.porcentaje_participacion ??
    row?.porcentaje_participacion ??
    row?.porcentajeParticipacion
  );
  const nacionalidad = safeInput((p?.nacionalidad ?? row?.nacionalidad) || "MEX");
  const relacion = safeInput(p?.relacion_con_cliente ?? row?.relacion_con_cliente);
  const observaciones = safeInput(p?.observaciones ?? row?.observaciones);

  return {
    tipo_entidad: 'persona_fisica',
    nombre_entidad:
      safeInput(row?.nombre_entidad) ||
      [p?.nombres, p?.apellido_paterno, p?.apellido_materno].filter(Boolean).join(" ").trim(),
    nacionalidad,
    relacion_con_cliente: relacion,
    porcentaje_participacion: porcentaje,
    sin_documentacion: !!row?.sin_documentacion,
    observaciones,
    datos_completos: {
      persona: {
        nombres: safeInput(p?.nombres),
        apellido_paterno: safeInput(p?.apellido_paterno),
        apellido_materno: safeInput(p?.apellido_materno),
        fecha_nacimiento: safeInput(p?.fecha_nacimiento),
        nacionalidad,
        relacion_con_cliente: relacion,
        rfc: safeInput(p?.rfc),
        curp: safeInput(p?.curp),
        porcentaje_participacion: porcentaje,
        observaciones,
      },
      contacto: {
        pais: safeInput(c?.pais),
        email: safeInput(c?.email),
        telefono: safeInput(c?.telefono),
        domicilio: {
          calle: safeInput(d?.calle),
          numero: safeInput(d?.numero),
          interior: safeInput(d?.interior),
          colonia: safeInput(d?.colonia),
          municipio: safeInput(d?.municipio),
          ciudad_delegacion: safeInput(d?.ciudad_delegacion),
          codigo_postal: safeInput(d?.codigo_postal),
          estado: safeInput(d?.estado),
          pais: safeInput(d?.pais),
        },
      },
    },
  };
}


type RelatedTipoEntidad = 'persona_fisica' | 'persona_moral' | 'fideicomiso';

type RelatedPFData = {
  contacto: Record<string, any>;
  persona: Record<string, any>;
};

type RelatedPMData = {
  contacto: Record<string, any>;
  empresa: Record<string, any>;
  representante: Record<string, any>;
};

type RelatedFIDData = {
  contacto: Record<string, any>;
  fideicomiso: Record<string, any>;
  representante: Record<string, any>;
};

type RelatedDuenoRow = {
  tipo_entidad: 'persona_fisica';
  nombre_entidad: string;
  nacionalidad: string;
  relacion_con_cliente: string;
  porcentaje_participacion: string;
  sin_documentacion: boolean;
  observaciones: string;
  datos_completos: RelatedPFData;
};

function onlyDigits(s: string) {
  return (s ?? '').replace(/\D+/g, '');
}
function normalizeUpper(s: string) {
  return (s ?? '').trim().toUpperCase();
}
function isYYYYMMDD(s: string) {
  return /^\d{8}$/.test(s ?? '');
}
function isRFC(s: string) {
  const v = normalizeUpper(s);
  return /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(v);
}
function isCURP(s: string) {
  const v = normalizeUpper(s);
  return /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(v);
}
function isEmail(v: any) {
  if (!v) return false;
  const s = String(v).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

/**
 * Remueve:
 * - undefined / null
 * - strings vacíos
 * - objetos vacíos
 * NO toca arrays.
 */
function stripEmpty(obj: any): any {
  if (Array.isArray(obj)) return obj;
  if (obj && typeof obj === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || v === null) continue;
      if (typeof v === 'string' && v.trim() === '') continue;

      const cleaned = stripEmpty(v);
      if (cleaned === undefined || cleaned === null) continue;

      if (cleaned && typeof cleaned === 'object' && !Array.isArray(cleaned) && Object.keys(cleaned).length === 0) {
        continue;
      }
      out[k] = cleaned;
    }
    return out;
  }
  return obj;
}

function req(errors: Errors, key: string, label: string, value: any) {
  const v = typeof value === 'string' ? value.trim() : value;
  if (!v) errors[key] = `${label} es obligatorio`;
}
function reqEmail(errors: Errors, key: string, label: string, value: string) {
  if (!value?.trim()) return (errors[key] = `${label} es obligatorio`);
  if (!isEmail(value)) errors[key] = `${label} inválido (formato email)`;
}
function reqPhone(errors: Errors, key: string, label: string, value: string) {
  const d = onlyDigits(value);
  if (!d) return (errors[key] = `${label} es obligatorio`);
  if (d.length < 8 || d.length > 15) errors[key] = `${label} inválido (8–15 dígitos)`;
}
function reqRFC(errors: Errors, key: string, label: string, value: string) {
  if (!value?.trim()) return (errors[key] = `${label} es obligatorio`);
  if (!isRFC(value)) errors[key] = `${label} inválido (formato RFC)`;
}
function reqCURP(errors: Errors, key: string, label: string, value: string) {
  if (!value?.trim()) return (errors[key] = `${label} es obligatorio`);
  if (!isCURP(value)) errors[key] = `${label} inválida (formato CURP)`;
}
function reqYYYYMMDD(errors: Errors, key: string, label: string, value: string) {
  if (!value?.trim()) return (errors[key] = `${label} es obligatorio`);
  if (!isYYYYMMDD(value)) errors[key] = `${label} inválida (AAAAMMDD)`;
}

function errText(msg?: string) {
  if (!msg) return null;
  return <p className="text-sm text-red-600 mt-1">{msg}</p>;
}
function classInput(hasErr: boolean) {
  return `w-full rounded-md border px-3 py-2 text-sm outline-none ${hasErr ? 'border-red-500' : 'border-gray-300'}`;
}

function fmtItem(i: CatalogItem) {
  return `${i.descripcion} (${i.clave})`;
}

function displayCatalogValue(value: string, items: CatalogItem[]) {
  const v = (value ?? '').trim();
  if (!v) return '';

  const found = items.find((x) => x.clave === v);
  if (found) return fmtItem(found);

  return `${v} (valor legacy)`;
}


const MEXICO_CATALOGO_KEY = 'mexico-mx';

type TipoNacionalidad = '' | 'nacional' | 'extranjero';

function isMexicoKey(value: string) {
  const v = (value ?? '').trim().toLowerCase();
  return v === MEXICO_CATALOGO_KEY || v === 'mex';
}

function inferNacionalExtranjero(value: string): TipoNacionalidad {
  const v = (value ?? '').trim();
  if (!v) return '';
  return isMexicoKey(v) ? 'nacional' : 'extranjero';
}

function valueToCatalogKey(v: string) {
  return v;
}

function SearchableSelect({
  label,
  required,
  value,
  items,
  placeholder,
  error,
  onChange,
}: {
  label: string;
  required?: boolean;
  value: string;
  items: CatalogItem[];
  placeholder?: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const needle = q.trim().toLowerCase();
  const filtered = (needle
    ? items.filter((it) => {
        const a = it.descripcion.toLowerCase();
        const b = it.clave.toLowerCase();
        return a.includes(needle) || b.includes(needle);
      })
    : items
  ).slice(0, 50);

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {label} {required ? '*' : null}
      </label>

      <input
        className={`w-full rounded-md border px-3 py-2 text-sm outline-none ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        value={open ? q : displayCatalogValue(value, items)}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setQ('');
        }}
        onChange={(e) => {
          setOpen(true);
          setQ(e.target.value);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />

      {open ? (
        <div className="max-h-56 overflow-auto rounded-md border bg-white shadow">
          {filtered.map((it) => (
            <button
              key={it.clave}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(it.clave);
                setOpen(false);
                setQ('');
              }}
            >
              {fmtItem(it)}
            </button>
          ))}

          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">Sin resultados</div>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}


function isPlainObject(value: any): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeDeepRecord(base: Record<string, any>, incoming: any): Record<string, any> {
  const src = isPlainObject(incoming) ? incoming : {};
  const out: Record<string, any> = { ...base };

  for (const [key, value] of Object.entries(src)) {
    if (isPlainObject(value) && isPlainObject(out[key])) {
      out[key] = mergeDeepRecord(out[key], value);
    } else if (value !== undefined && value !== null) {
      out[key] = value;
    }
  }

  return out;
}

function createEmptyRelatedPFData(): RelatedPFData {
  return {
    contacto: {
      pais: 'MEX',
      email: '',
      telefono: '',
      domicilio: {
        calle: '',
        numero: '',
        colonia: '',
        municipio: '',
        ciudad_delegacion: '',
        codigo_postal: '',
        estado: '',
        pais: 'MEX',
      },
    },
    persona: {
      nombres: '',
      apellido_paterno: '',
      apellido_materno: '',
      fecha_nacimiento: '',
      rfc: '',
      curp: '',
      actividad_economica: '',
    },
  };
}

function createEmptyRelatedPMData(): RelatedPMData {
  return {
    contacto: {
      pais: 'MEX',
      email: '',
      telefono: '',
      domicilio: {
        calle: '',
        numero: '',
        colonia: '',
        municipio: '',
        ciudad_delegacion: '',
        codigo_postal: '',
        estado: '',
        pais: 'MEX',
      },
    },
    empresa: {
      rfc: '',
      fecha_constitucion: '',
      giro_mercantil: '',
      nombre_entidad: '',
      razon_social: '',
    },
    representante: {
      nombres: '',
      apellido_paterno: '',
      apellido_materno: '',
      fecha_nacimiento: '',
      rfc: '',
      curp: '',
      identificacion: {
        tipo: '',
        autoridad: '',
        numero: '',
        fecha_expedicion: '',
        fecha_expiracion: '',
      },
    },
  };
}

function createEmptyRelatedFIDData(): RelatedFIDData {
  return {
    contacto: {
      pais: 'MEX',
      email: '',
      telefono: '',
      domicilio: {
        calle: '',
        numero: '',
        colonia: '',
        municipio: '',
        ciudad_delegacion: '',
        codigo_postal: '',
        estado: '',
        pais: 'MEX',
      },
    },
    fideicomiso: {
      nombre_entidad: '',
      denominacion: '',
      nombre_fideicomiso: '',
    },
    representante: {
      nombres: '',
      apellido_paterno: '',
      apellido_materno: '',
      fecha_nacimiento: '',
      rfc: '',
      curp: '',
      identificacion: {
        tipo: '',
        autoridad: '',
        numero: '',
        fecha_expedicion: '',
        fecha_expiracion: '',
      },
    },
  };
}

function deriveRelatedNombreEntidad(
  tipo_entidad: RelatedTipoEntidad,
  datos_completos: RelatedPFData | RelatedPMData | RelatedFIDData
): string {
  if (tipo_entidad === 'persona_fisica') {
    const pf = datos_completos as RelatedPFData;
    return [
      safeInput(pf.persona?.nombres).trim(),
      safeInput(pf.persona?.apellido_paterno).trim(),
      safeInput(pf.persona?.apellido_materno).trim(),
    ].filter(Boolean).join(' ');
  }

  if (tipo_entidad === 'persona_moral') {
    const pm = datos_completos as RelatedPMData;
    return safeInput(pm.empresa?.razon_social || pm.empresa?.nombre_entidad).trim();
  }

  const fid = datos_completos as RelatedFIDData;
  return safeInput(
    fid.fideicomiso?.nombre_entidad ||
    fid.fideicomiso?.denominacion ||
    fid.fideicomiso?.nombre_fideicomiso
  ).trim();
}

function detectRelatedTipoEntidad(row: any): RelatedTipoEntidad {
  const raw = safeInput(row?.tipo_entidad || row?.tipo_tercero).trim();
  if (raw === 'persona_fisica' || raw === 'persona_moral' || raw === 'fideicomiso') {
    return raw;
  }

  const datos = isPlainObject(row?.datos_completos) ? row.datos_completos : {};
  if (isPlainObject(datos?.fideicomiso)) return 'fideicomiso';
  if (isPlainObject(datos?.empresa)) return 'persona_moral';
  return 'persona_fisica';
}

function hydrateRelatedPFData(data: any): RelatedPFData {
  const empty = createEmptyRelatedPFData();
  return {
    contacto: mergeDeepRecord(empty.contacto as Record<string, any>, data?.contacto),
    persona: mergeDeepRecord(empty.persona as Record<string, any>, data?.persona),
  };
}

function hydrateRelatedPMData(data: any): RelatedPMData {
  const empty = createEmptyRelatedPMData();
  return {
    contacto: mergeDeepRecord(empty.contacto as Record<string, any>, data?.contacto),
    empresa: mergeDeepRecord(empty.empresa as Record<string, any>, data?.empresa),
    representante: mergeDeepRecord(empty.representante as Record<string, any>, data?.representante),
  };
}

function hydrateRelatedFIDData(data: any): RelatedFIDData {
  const empty = createEmptyRelatedFIDData();
  return {
    contacto: mergeDeepRecord(empty.contacto as Record<string, any>, data?.contacto),
    fideicomiso: mergeDeepRecord(empty.fideicomiso as Record<string, any>, data?.fideicomiso),
    representante: mergeDeepRecord(empty.representante as Record<string, any>, data?.representante),
  };
}

function hydrateRelatedDuenoRow(row: any): RelatedDuenoRow {
  if (!isPlainObject(row)) {
    const datos_completos = createEmptyRelatedPFData();
    return {
      tipo_entidad: 'persona_fisica',
      nombre_entidad: '',
      nacionalidad: 'MEX',
      relacion_con_cliente: '',
      porcentaje_participacion: '',
      sin_documentacion: false,
      observaciones: '',
      datos_completos,
    };
  }

  const legacy = !isPlainObject(row?.datos_completos) && ('nombres' in row || 'apellido_paterno' in row || 'apellido_materno' in row);

  const datos_completos = legacy
    ? hydrateRelatedPFData({
        contacto: { pais: row?.nacionalidad || 'MEX', email: '', telefono: '', domicilio: {} },
        persona: {
          nombres: row?.nombres,
          apellido_paterno: row?.apellido_paterno,
          apellido_materno: row?.apellido_materno,
          fecha_nacimiento: row?.fecha_nacimiento,
          rfc: row?.rfc,
          curp: row?.curp,
          actividad_economica: '',
        },
      })
    : hydrateRelatedPFData(row?.datos_completos);

  return {
    tipo_entidad: 'persona_fisica',
    nombre_entidad: deriveRelatedNombreEntidad('persona_fisica', datos_completos) || safeInput(row?.nombre_entidad).trim(),
    nacionalidad: safeInput(row?.nacionalidad || 'MEX').trim() || 'MEX',
    relacion_con_cliente: safeInput(row?.relacion_con_cliente).trim(),
    porcentaje_participacion: safeInput(
      row?.porcentaje_participacion ?? datos_completos.persona?.porcentaje_participacion
    ).trim(),
    sin_documentacion: !!row?.sin_documentacion,
    observaciones: safeInput(row?.observaciones ?? datos_completos.persona?.observaciones).trim(),
    datos_completos,
  };
}

function buildBeneficiarioControladorPayloadRow(row: RelatedDuenoRow) {
  const datos_completos = hydrateRelatedPFData(row?.datos_completos);
  const persona = {
    ...(isPlainObject(datos_completos?.persona)
      ? datos_completos.persona
      : {}),
  };
  delete persona.observaciones;
  const nacionalidad =
    safeInput(persona?.nacionalidad ?? row?.nacionalidad).trim() || 'MEX';
  const relacion = safeInput(
    persona?.relacion_con_cliente ?? row?.relacion_con_cliente
  ).trim();
  const porcentaje = safeInput(
    persona?.porcentaje_participacion ?? row?.porcentaje_participacion
  ).trim();
  const nombres = safeInput(persona?.nombres).trim();
  const apellido_paterno = safeInput(persona?.apellido_paterno).trim();
  const apellido_materno = safeInput(persona?.apellido_materno).trim();
  const fecha_nacimiento = onlyDigits(
    safeInput(persona?.fecha_nacimiento)
  ).slice(0, 8);
  const rfc = normalizeUpper(safeInput(persona?.rfc)).replace(/\s+/g, '');
  const curp = normalizeUpper(safeInput(persona?.curp)).replace(/\s+/g, '');

  const datosCanonicos: RelatedPFData = {
    ...datos_completos,
    persona: {
      ...persona,
      nombres,
      apellido_paterno,
      apellido_materno,
      fecha_nacimiento,
      rfc,
      curp,
      nacionalidad,
      relacion_con_cliente: relacion,
      porcentaje_participacion: porcentaje,
    },
  };

  return {
    nombre_entidad:
      deriveRelatedNombreEntidad('persona_fisica', datosCanonicos) ||
      safeInput(row?.nombre_entidad).trim(),
    nombres,
    apellido_paterno,
    apellido_materno,
    fecha_nacimiento,
    rfc,
    curp,
    nacionalidad,
    relacion_con_cliente: relacion,
    porcentaje_participacion: porcentaje,
    sin_documentacion: !!row?.sin_documentacion,
    datos_completos: datosCanonicos,
  };
}

function hydrateRelatedCollectionsFromDatos(datos: any) {
  const safeDatos = isPlainObject(datos) ? datos : {};

  const hasCanonicalBeneficiarios = Array.isArray(
    safeDatos?.beneficiarios_controladores
  );
  const beneficiariosRaw = hasCanonicalBeneficiarios
    ? safeDatos.beneficiarios_controladores
    : Array.isArray(safeDatos?.duenos_beneficiarios)
      ? safeDatos.duenos_beneficiarios
      : [];

  const relatedDuenos = beneficiariosRaw.map(hydrateRelatedDuenoRow);
  const canonicalAplica =
    typeof safeDatos?.beneficiarios_controladores_aplica === 'boolean'
      ? safeDatos.beneficiarios_controladores_aplica
      : null;

  return {
    relatedDuenosAplica:
      canonicalAplica ??
      (!!safeDatos?.duenos_beneficiarios_aplica || relatedDuenos.length > 0),
    relatedDuenos,
  };
}

function projectRelatedDuenoToLegacy(row: RelatedDuenoRow): DuenoBeneficiarioItem {
  const p = row?.datos_completos?.persona || ({} as any);
  return {
    nombres: safeInput(p?.nombres),
    apellido_paterno: safeInput(p?.apellido_paterno),
    apellido_materno: safeInput(p?.apellido_materno),
    fecha_nacimiento: safeInput(p?.fecha_nacimiento),
    nacionalidad: safeInput(p?.nacionalidad || row?.nacionalidad || "MEX"),
    relacion_con_cliente: safeInput(p?.relacion_con_cliente || row?.relacion_con_cliente),
    rfc: safeInput(p?.rfc),
    curp: safeInput(p?.curp),
    porcentaje_participacion: safeInput(
      p?.porcentaje_participacion ??
      row?.porcentaje_participacion
    ),
    observaciones: safeInput(p?.observaciones || row?.observaciones),
  };
}

function safeInput(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function safeBool(value: any): boolean {
  return value === true;
}

function createEmptyDuenoBeneficiario(): DuenoBeneficiarioItem {
  return {
    nombres: '',
    apellido_paterno: '',
    apellido_materno: '',
    fecha_nacimiento: '',
    nacionalidad: 'MEX',
    relacion_con_cliente: '',
    rfc: '',
    curp: '',
    porcentaje_participacion: '',
    observaciones: ''
  };
}

function normalizeDuenoBeneficiarioRow(row: any): DuenoBeneficiarioItem {
  return {
    nombres: safeInput(row?.nombres),
    apellido_paterno: safeInput(row?.apellido_paterno),
    apellido_materno: safeInput(row?.apellido_materno),
    fecha_nacimiento: safeInput(row?.fecha_nacimiento),
    nacionalidad: safeInput(row?.nacionalidad || 'MEX'),
    relacion_con_cliente: safeInput(row?.relacion_con_cliente ?? row?.relacion),
    rfc: safeInput(row?.rfc),
    curp: safeInput(row?.curp),
    porcentaje_participacion: safeInput(row?.porcentaje_participacion),
    observaciones: safeInput(row?.observaciones)
  };
}

function addDuenoBeneficiarioRow(
  setDuenosBeneficiarios: React.Dispatch<React.SetStateAction<DuenoBeneficiarioItem[]>>
) {
  setDuenosBeneficiarios((prev) => [...prev, createEmptyDuenoBeneficiario()]);
}

function updateDuenoBeneficiarioRow(
  setDuenosBeneficiarios: React.Dispatch<React.SetStateAction<DuenoBeneficiarioItem[]>>,
  index: number,
  key: keyof DuenoBeneficiarioItem,
  value: DuenoBeneficiarioItem[keyof DuenoBeneficiarioItem]
) {
  setDuenosBeneficiarios((prev) =>
    prev.map((row, i) => (i === index ? { ...row, [key]: value } : row))
  );
}

function removeDuenoBeneficiarioRow(
  setDuenosBeneficiarios: React.Dispatch<React.SetStateAction<DuenoBeneficiarioItem[]>>,
  index: number
) {
  setDuenosBeneficiarios((prev) => prev.filter((_, i) => i !== index));
}


function renderRelatedDuenosList({
  relatedDuenos,
  setRelatedDuenos,
  syncLegacyFromRelated,
  errors,
}: {
  relatedDuenos: RelatedDuenoRow[];
  setRelatedDuenos: React.Dispatch<React.SetStateAction<RelatedDuenoRow[]>>;
  syncLegacyFromRelated: (next: RelatedDuenoRow[]) => void;
  errors: Errors;
}) {
  const updatePersonaField = (
    index: number,
    key: keyof RelatedDuenoRow["datos_completos"]["persona"],
    value: string
  ) => {
    setRelatedDuenos((prev) => {
      const next = prev.map((row, i) =>
        i === index
          ? {
              ...row,
              porcentaje_participacion:
                key === "porcentaje_participacion" ? value : row.porcentaje_participacion,
              nombre_entidad:
                key === "nombres" || key === "apellido_paterno" || key === "apellido_materno"
                  ? ""
                  : row.nombre_entidad,
              datos_completos: {
                ...row.datos_completos,
                persona: {
                  ...row.datos_completos.persona,
                  [key]: value,
                },
              },
            }
          : row
      ).map((row) => ({
        ...row,
        nombre_entidad: deriveRelatedDuenoNombre(row),
      }));
      syncLegacyFromRelated(next);
      return next;
    });
  };

  const updateRowField = (
    index: number,
    key: 'sin_documentacion',
    value: boolean
  ) => {
    setRelatedDuenos((prev) => {
      const next = prev.map((row, i) =>
        i === index ? { ...row, [key]: value } : row
      );
      syncLegacyFromRelated(next);
      return next;
    });
  };

  const addRow = () => {
    setRelatedDuenos((prev) => {
      const next = [...prev, createEmptyRelatedDueno()];
      syncLegacyFromRelated(next);
      return next;
    });
  };

  const removeRow = (index: number) => {
    setRelatedDuenos((prev) => {
      const next = prev.filter((_, i) => i !== index);
      syncLegacyFromRelated(next);
      return next;
    });
  };

  return (
    <div className="rounded border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Beneficiario Controlador</p>
        <button
          type="button"
          className="rounded border border-gray-300 px-3 py-1 text-sm"
          onClick={addRow}
        >
          Agregar
        </button>
      </div>

      {errors['beneficiarios_controladores'] ? (
        <p className="text-xs text-red-600">
          {errors['beneficiarios_controladores']}
        </p>
      ) : null}

      {relatedDuenos.map((row, index) => {
        const persona = row.datos_completos.persona;
        return (
          <div key={index} className="rounded border border-gray-200 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Beneficiario Controlador #{index + 1}</p>
              <button
                type="button"
                className="rounded border border-red-300 px-3 py-1 text-sm text-red-700"
                onClick={() => removeRow(index)}
              >
                Eliminar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nombres *</label>
                <input className={classInput(!!errors[`beneficiarios_controladores.${index}.nombres`])} value={safeInput(persona.nombres)} onChange={(e) => updatePersonaField(index, "nombres", e.target.value)} />
                {errText(errors[`beneficiarios_controladores.${index}.nombres`])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Apellido paterno *</label>
                <input className={classInput(!!errors[`beneficiarios_controladores.${index}.apellido_paterno`])} value={safeInput(persona.apellido_paterno)} onChange={(e) => updatePersonaField(index, "apellido_paterno", e.target.value)} />
                {errText(errors[`beneficiarios_controladores.${index}.apellido_paterno`])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Apellido materno *</label>
                <input className={classInput(!!errors[`beneficiarios_controladores.${index}.apellido_materno`])} value={safeInput(persona.apellido_materno)} onChange={(e) => updatePersonaField(index, "apellido_materno", e.target.value)} />
                {errText(errors[`beneficiarios_controladores.${index}.apellido_materno`])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Fecha nacimiento (AAAAMMDD) *</label>
                <input className={classInput(!!errors[`beneficiarios_controladores.${index}.fecha_nacimiento`])} value={safeInput(persona.fecha_nacimiento)} onChange={(e) => updatePersonaField(index, "fecha_nacimiento", onlyDigits(e.target.value).slice(0, 8))} />
                {errText(errors[`beneficiarios_controladores.${index}.fecha_nacimiento`])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Nacionalidad *</label>
                <input className={classInput(!!errors[`beneficiarios_controladores.${index}.nacionalidad`])} value={safeInput(persona.nacionalidad)} onChange={(e) => updatePersonaField(index, "nacionalidad", e.target.value)} />
                {errText(errors[`beneficiarios_controladores.${index}.nacionalidad`])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Relación con el cliente *</label>
                <input className={classInput(!!errors[`beneficiarios_controladores.${index}.relacion_con_cliente`])} value={safeInput(persona.relacion_con_cliente)} onChange={(e) => updatePersonaField(index, "relacion_con_cliente", e.target.value)} />
                {errText(errors[`beneficiarios_controladores.${index}.relacion_con_cliente`])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">RFC</label>
                <input className={classInput(!!errors[`beneficiarios_controladores.${index}.rfc`])} value={safeInput(persona.rfc)} onChange={(e) => updatePersonaField(index, "rfc", e.target.value)} />
                {errText(errors[`beneficiarios_controladores.${index}.rfc`])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">CURP</label>
                <input className={classInput(!!errors[`beneficiarios_controladores.${index}.curp`])} value={safeInput(persona.curp)} onChange={(e) => updatePersonaField(index, "curp", e.target.value)} />
                {errText(errors[`beneficiarios_controladores.${index}.curp`])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Porcentaje accionario</label>
                <input className={classInput(!!errors[`beneficiarios_controladores.${index}.porcentaje_participacion`])} value={safeInput(persona.porcentaje_participacion ?? row.porcentaje_participacion)} onChange={(e) => updatePersonaField(index, "porcentaje_participacion", e.target.value)} />
                {errText(errors[`beneficiarios_controladores.${index}.porcentaje_participacion`])}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={row.sin_documentacion}
                  onChange={(e) => updateRowField(index, 'sin_documentacion', e.target.checked)}
                />
                Sin documentación
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Page() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  // ✅ default prod actual si env no está
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://scmvp-nxtj.onrender.com';

  const token = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('token') || '';
  }, []);

  const [fatal, setFatal] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const [paises, setPaises] = useState<CatalogItem[]>([]);
  const [actividades, setActividades] = useState<CatalogItem[]>([]);
  const [giros, setGiros] = useState<CatalogItem[]>([]);

  const [tipoCliente, setTipoCliente] = useState<TipoCliente>('persona_fisica');

  const [nombreEntidad, setNombreEntidad] = useState('');
  const [pmRazonSocial, setPmRazonSocial] = useState('');
  const [fidNombre, setFidNombre] = useState('');
  const [nacionalidad, setNacionalidad] = useState('');

  // contacto básico (catálogo + obligatorios)
  const [contactoPais, setContactoPais] = useState(''); // clave catálogo (ej MEX)

  const [tipoNacionalidad, setTipoNacionalidad] = useState<TipoNacionalidad>('');

  function handleTipoNacionalidadChange(next: TipoNacionalidad) {
    setTipoNacionalidad(next);

    if (next === 'nacional') {
      setNacionalidad(MEXICO_CATALOGO_KEY);
      setContactoPais(MEXICO_CATALOGO_KEY);
    }
  }

  useEffect(() => {
    if (!tipoNacionalidad && nacionalidad) {
      setTipoNacionalidad(inferNacionalExtranjero(nacionalidad));
    }
  }, [nacionalidad, tipoNacionalidad]);

  useEffect(() => {
    let alive = true;

    loadCatalogo('sat/c_pais')
      .then((items) => {
        if (alive) setPaises(items);
      })
      .catch((e) => {
        if (alive) setFatal(e?.message || 'No se pudo cargar catálogo de países');
      });

    return () => {
      alive = false;
    };
  }, []);
  const [email, setEmail] = useState(''); // ✅ obligatorio (según decisión)
  const [telefono, setTelefono] = useState('');

  // ✅ Domicilio de contacto (manual, NO catálogo por ahora)
  const [domPais, setDomPais] = useState(''); // texto libre (ej "Mexico")
  const [domCalle, setDomCalle] = useState('');
  const [domNumero, setDomNumero] = useState('');
  const [domInterior, setDomInterior] = useState('');
  const [domColonia, setDomColonia] = useState('');
  const [domMunicipio, setDomMunicipio] = useState('');
  const [domCiudad, setDomCiudad] = useState('');
  const [domCP, setDomCP] = useState('');
  const [domEstado, setDomEstado] = useState('');

  const [codigosPostalesMx, setCodigosPostalesMx] = useState<CodigoPostalMx[]>([]);
  const [domColoniasOpciones, setDomColoniasOpciones] = useState<string[]>([]);
  const [domCpAviso, setDomCpAviso] = useState('');
  const [domInicialHidratado, setDomInicialHidratado] = useState(false);
  const [domCpFueEditado, setDomCpFueEditado] = useState(false);

  const isContactoMexico = isMexicoKey(contactoPais);

  useEffect(() => {
    let alive = true;

    loadCodigosPostalesMx()
      .then((items) => {
        if (alive) setCodigosPostalesMx(items);
      })
      .catch((e) => {
        if (alive) setDomCpAviso(e?.message || 'No se pudo cargar catálogo de códigos postales MX');
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!domInicialHidratado) return;

    if (!isContactoMexico) {
      setDomColoniasOpciones([]);
      setDomCpAviso('');
      return;
    }

    const cp = normalizeCodigoPostalMx(domCP);

    if (!cp) {
      setDomColoniasOpciones([]);
      setDomCpAviso('');
      return;
    }

    // Hidratación inicial: solo preparar opciones, sin sobrescribir domicilio persistido.
    if (!domCpFueEditado) {
      if (cp.length !== 5) {
        setDomColoniasOpciones([]);
        setDomCpAviso('');
        return;
      }

      const foundInicial = findCodigoPostalMx(codigosPostalesMx, cp);

      if (!foundInicial) {
        setDomColoniasOpciones([]);
        setDomCpAviso('');
        return;
      }

      const coloniasIniciales = foundInicial.colonias || [];

      if (coloniasIniciales.length > 1) {
        setDomColoniasOpciones(
          domColonia.trim() && !coloniasIniciales.includes(domColonia)
            ? [domColonia, ...coloniasIniciales]
            : coloniasIniciales
        );
      } else {
        setDomColoniasOpciones([]);
      }

      setDomCpAviso('');
      return;
    }

    // Cambio manual posterior de CP: aquí sí se activa la lógica inteligente.
    if (cp.length !== 5) {
      setDomColoniasOpciones([]);
      setDomCpAviso('Para México, el código postal debe tener 5 dígitos.');
      return;
    }

    const found = findCodigoPostalMx(codigosPostalesMx, cp);

    if (!found) {
      setDomColoniasOpciones([]);
      setDomCpAviso('Código postal no encontrado en catálogo local; captura manual habilitada.');
      return;
    }

    setDomCpAviso('');
    setDomEstado(found.estado);
    setDomMunicipio(found.municipio);
    setDomCiudad(found.ciudad_delegacion);

    const colonias = found.colonias || [];
    setDomColoniasOpciones(colonias);

    if (colonias.length === 1) {
      setDomColonia(colonias[0]);
    } else if (colonias.length > 1) {
      setDomColonia((prev) => (colonias.includes(prev) ? prev : ''));
    }
  }, [
    codigosPostalesMx,
    domCP,
    domColonia,
    domInicialHidratado,
    domCpFueEditado,
    isContactoMexico,
  ]);

  function handleDomCPChange(value: string) {
    setDomCpFueEditado(true);
    const next = isMexicoKey(contactoPais) ? normalizeCodigoPostalMx(value) : value;
    setDomCP(next);
  }


  // PF
  const [pfNombres, setPfNombres] = useState('');
  const [pfApellidoPaterno, setPfApellidoPaterno] = useState('');
  const [pfApellidoMaterno, setPfApellidoMaterno] = useState('');
  const [pfFechaNacimiento, setPfFechaNacimiento] = useState('');
  const [pfRfc, setPfRfc] = useState('');
  const [pfCurp, setPfCurp] = useState('');
  const [pfPaisNacimiento, setPfPaisNacimiento] = useState('');
  const [pfActividad, setPfActividad] = useState('');
  const [pfActividadOriginal, setPfActividadOriginal] = useState<any>(null);
  const [pfIdTipo, setPfIdTipo] = useState('');
  const [pfIdAutoridad, setPfIdAutoridad] = useState('');
  const [pfIdNumero, setPfIdNumero] = useState('');
  const [pfIdExpedicion, setPfIdExpedicion] = useState('');
  const [pfIdExpiracion, setPfIdExpiracion] = useState('');
  // PM
  const [pmGiro, setPmGiro] = useState('');
  const [pmGiroOriginal, setPmGiroOriginal] = useState<any>(null);

  function catalogStateValue(value: any): string {
    if (isPlainObject(value)) {
      return safeInput(value?.clave).trim() || safeInput(value?.descripcion).trim();
    }
    return safeInput(value).trim();
  }

  function catalogPayloadValue(items: CatalogItem[], value: string, originalValue?: any) {
    const key = safeInput(value).trim();
    const found = items.find((item) => item.clave === key);
    if (found) return { clave: found.clave, descripcion: found.descripcion };

    if (isPlainObject(originalValue) && catalogStateValue(originalValue) === key) {
      return {
        clave: safeInput(originalValue?.clave).trim(),
        descripcion: safeInput(originalValue?.descripcion).trim(),
      };
    }

    return key;
  }

  function catalogHasKey(items: CatalogItem[], value: string) {
    const key = safeInput(value).trim();
    return !!key && items.some((item) => item.clave === key);
  }

  // Rep (PM/FID)
  const [repNombre, setRepNombre] = useState('');
  const [repAP, setRepAP] = useState('');
  const [repAM, setRepAM] = useState('');
  const [repFechaNac, setRepFechaNac] = useState('');
  const [repRFC, setRepRFC] = useState('');
  const [repCURP, setRepCURP] = useState('');
  const [repIdTipo, setRepIdTipo] = useState('');
  const [repIdAutoridad, setRepIdAutoridad] = useState('');
  const [repIdNumero, setRepIdNumero] = useState('');
  const [repIdExpedicion, setRepIdExpedicion] = useState('');
  const [repIdExpiracion, setRepIdExpiracion] = useState('');

  // C2D-PM-ACC-FE1:
  // El bloque corresponde al mismo representante legal cuando también
  // participa como accionista.
  const [pmRepEsAccionista, setPmRepEsAccionista] = useState(false);
  const [pmAccPct, setPmAccPct] = useState('');
  const [pmAccRelacion, setPmAccRelacion] = useState('');
  const [pmAccionistaOriginal, setPmAccionistaOriginal] =
    useState<Record<string, any>>({});

  function setPmAccError(key: string, message?: string) {
    setErrors((prev: Errors) => {
      const next: Errors = { ...prev };

      if (message) {
        next[key] = message;
      } else {
        delete next[key];
      }

      return next;
    });
  }

  function validatePmAccPorcentajeOnBlur(): boolean {
    if (!pmRepEsAccionista) {
      setPmAccError('accionista.porcentaje');
      return true;
    }

    const raw = pmAccPct.trim();

    if (!raw) {
      setPmAccError(
        'accionista.porcentaje',
        'El porcentaje accionario del representante es obligatorio'
      );
      return false;
    }

    const porcentaje = Number(raw.replace(',', '.'));

    if (!Number.isFinite(porcentaje)) {
      setPmAccError(
        'accionista.porcentaje',
        'El porcentaje accionario debe ser un número válido'
      );
      return false;
    }

    if (porcentaje <= 0) {
      setPmAccError(
        'accionista.porcentaje',
        'El porcentaje accionario debe ser mayor que 0'
      );
      return false;
    }

    if (porcentaje > 100) {
      setPmAccError(
        'accionista.porcentaje',
        'El porcentaje accionario debe ser menor o igual a 100'
      );
      return false;
    }

    setPmAccError('accionista.porcentaje');
    return true;
  }

  function validatePmAccRelacionOnBlur(): boolean {
    if (!pmRepEsAccionista) {
      setPmAccError('accionista.relacion');
      return true;
    }

    if (!pmAccRelacion.trim()) {
      setPmAccError(
        'accionista.relacion',
        'La relación del representante con la sociedad es obligatoria'
      );
      return false;
    }

    setPmAccError('accionista.relacion');
    return true;
  }

  const [duenosBeneficiariosAplica, setDuenosBeneficiariosAplica] = useState(false);
  const [duenosBeneficiarios, setDuenosBeneficiarios] = useState<DuenoBeneficiarioItem[]>([]);
  const [relatedDuenosAplica, setRelatedDuenosAplica] = useState(false);
  const [relatedDuenos, setRelatedDuenos] = useState<RelatedDuenoRow[]>([]);

  function syncLegacyFromRelated(next: RelatedDuenoRow[]) {
    setDuenosBeneficiarios(next.map(projectRelatedDuenoToLegacy));
  }

  function clearBeneficiariosControladoresErrors() {
    setErrors((prev) =>
      Object.fromEntries(
        Object.entries(prev).filter(
          ([key]) => !key.startsWith('beneficiarios_controladores')
        )
      )
    );
  }

  // A2 hydrate editar cliente: carga datos existentes al abrir edición
  useEffect(() => {
    if (!id || !token) return;

    let alive = true;

    async function loadCliente() {
      setLoading(true);
      setFatal('');

      try {
        const res = await fetch(`${apiBase}/api/cliente/clientes/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data = await res.json().catch(() => ({}));

        if (!alive) return;

        if (!res.ok) {
          setFatal(data?.error || `Error al cargar cliente (${res.status})`);
          return;
        }

        const cliente = data?.cliente || {};
        const datos = cliente?.datos_completos || {};
        const personaPrincipal = datos?.persona || {};
        const empresaPrincipal = datos?.empresa || {};
        const nextPfActividadOriginal = personaPrincipal?.actividad_economica;
        const nextPmGiroOriginal = empresaPrincipal?.giro_mercantil ?? empresaPrincipal?.giro;
        const identificacionPrincipal = personaPrincipal?.identificacion || {};
        setPfNombres(safeInput(personaPrincipal?.nombres));
        setPfApellidoPaterno(safeInput(personaPrincipal?.apellido_paterno));
        setPfApellidoMaterno(safeInput(personaPrincipal?.apellido_materno));
        setPfFechaNacimiento(safeInput(personaPrincipal?.fecha_nacimiento));
        setPfRfc(safeInput(personaPrincipal?.rfc));
        setPfCurp(safeInput(personaPrincipal?.curp));
        setPfPaisNacimiento(safeInput(personaPrincipal?.pais_nacimiento));
        setPfIdTipo(safeInput(identificacionPrincipal?.tipo));
        setPfIdAutoridad(safeInput(identificacionPrincipal?.autoridad));
        setPfIdNumero(safeInput(identificacionPrincipal?.numero));
        setPfIdExpedicion(safeInput(identificacionPrincipal?.fecha_expedicion));
        setPfIdExpiracion(safeInput(identificacionPrincipal?.fecha_expiracion));
        setPfActividadOriginal(nextPfActividadOriginal);
        setPmGiroOriginal(nextPmGiroOriginal);
        setPfActividad(catalogStateValue(nextPfActividadOriginal));
        setPmGiro(catalogStateValue(nextPmGiroOriginal));
        const contacto = datos?.contacto || {};
        const domicilio = contacto?.domicilio || contacto?.domicilio_mexico || {};

        const nextTipo = (cliente?.tipo_cliente || 'persona_fisica') as TipoCliente;
        const nextNacionalidad = safeInput(cliente?.nacionalidad);
        const nextContactoPais = safeInput(contacto?.pais);

        setTipoCliente(nextTipo);
        setNombreEntidad(safeInput(cliente?.nombre_entidad));
        setNacionalidad(nextNacionalidad);
        setContactoPais(nextContactoPais);
        setTipoNacionalidad(inferNacionalExtranjero(nextNacionalidad));

        setEmail(safeInput(contacto?.email));
        setTelefono(safeInput(contacto?.telefono));

        setDomPais(safeInput(domicilio?.pais));
        setDomCalle(safeInput(domicilio?.calle));
        setDomNumero(safeInput(domicilio?.numero));
        setDomInterior(safeInput(domicilio?.interior));
        setDomColonia(safeInput(domicilio?.colonia));
        setDomMunicipio(safeInput(domicilio?.municipio));
        setDomCiudad(safeInput(domicilio?.ciudad_delegacion));
        setDomCP(safeInput(domicilio?.codigo_postal));
        setDomEstado(safeInput(domicilio?.estado));
        setDomCpFueEditado(false);
        setDomInicialHidratado(true);

        setRepIdTipo('');
        setRepIdAutoridad('');
        setRepIdNumero('');
        setRepIdExpedicion('');
        setRepIdExpiracion('');
        setPmRepEsAccionista(false);
        setPmAccPct('');
        setPmAccRelacion('');
        setPmAccionistaOriginal({});

        if (nextTipo === 'persona_moral') {
          const empresa = datos?.empresa || {};
          const representante =
            datos?.representante ||
            empresa?.representante ||
            datos?.representante_legal ||
            datos?.representanteLegal ||
            {};

          setPmRazonSocial(safeInput(empresa?.razon_social || cliente?.nombre_entidad));
          setRepNombre(safeInput(
            representante?.nombres ||
            representante?.nombre_completo ||
            representante?.nombre
          ));
          setRepAP(safeInput(representante?.apellido_paterno));
          setRepAM(safeInput(representante?.apellido_materno));
          setRepFechaNac(safeInput(representante?.fecha_nacimiento));
          setRepRFC(safeInput(representante?.rfc));
          setRepCURP(safeInput(representante?.curp));

          const accionistaTercero =
            isPlainObject(datos?.accionista_tercero)
              ? datos.accionista_tercero
              : {};

          setPmRepEsAccionista(
            datos?.representante_es_accionista === true
          );
          setPmAccPct(
            safeInput(accionistaTercero?.porcentaje_accionario)
          );
          setPmAccRelacion(
            safeInput(accionistaTercero?.relacion)
          );
          setPmAccionistaOriginal(accionistaTercero);

          const identificacion =
            representante?.identificacion ||
            empresa?.representante?.identificacion ||
            {};
          setRepIdTipo(safeInput(identificacion?.tipo));
          setRepIdAutoridad(safeInput(identificacion?.autoridad));
          setRepIdNumero(safeInput(identificacion?.numero));
          setRepIdExpedicion(safeInput(identificacion?.fecha_expedicion));
          setRepIdExpiracion(safeInput(identificacion?.fecha_expiracion));
        }

        if (nextTipo === 'fideicomiso') {
          const fideicomiso = datos?.fideicomiso || {};
          const representante = datos?.representante || {};

          setFidNombre(safeInput(
            fideicomiso?.nombre_fideicomiso ||
            fideicomiso?.fideicomiso_nombre ||
            cliente?.nombre_entidad
          ));

          const nombreCompleto = safeInput(representante?.nombre_completo);
          if (nombreCompleto) {
            setRepNombre(nombreCompleto);
          }

          setRepFechaNac(safeInput(representante?.fecha_nacimiento));
          setRepRFC(safeInput(representante?.rfc));
          setRepCURP(safeInput(representante?.curp));

          const identificacion = representante?.identificacion || {};
          setRepIdTipo(safeInput(identificacion?.tipo));
          setRepIdAutoridad(safeInput(identificacion?.autoridad));
          setRepIdNumero(safeInput(identificacion?.numero));
          setRepIdExpedicion(safeInput(identificacion?.fecha_expedicion));
          setRepIdExpiracion(safeInput(identificacion?.fecha_expiracion));
        }

        const hydrated = hydrateRelatedCollectionsFromDatos(datos);
        const duenosLegacy = hydrated.relatedDuenos.map(projectRelatedDuenoToLegacy);

        setRelatedDuenosAplica(
          nextTipo === 'persona_fisica'
            ? hydrated.relatedDuenosAplica
            : true
        );
        setRelatedDuenos(hydrated.relatedDuenos);
        setDuenosBeneficiarios(duenosLegacy);
        setDuenosBeneficiariosAplica(
          nextTipo === 'persona_fisica'
            ? hydrated.relatedDuenosAplica
            : true
        );
      } catch (e: any) {
        if (alive) setFatal(e?.message || 'Error al cargar cliente');
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadCliente();

    return () => {
      alive = false;
    };
  }, [apiBase, id, token]);


  useEffect(() => {
    if (tipoCliente === 'persona_fisica') {
      setNombreEntidad(
        [pfNombres, pfApellidoPaterno, pfApellidoMaterno]
          .map((value) => safeInput(value).trim())
          .filter(Boolean)
          .join(' ')
      );
    } else if (tipoCliente === 'persona_moral') {
      setNombreEntidad(safeInput(pmRazonSocial).trim());
    } else if (tipoCliente === 'fideicomiso') {
      setNombreEntidad(safeInput(fidNombre).trim());
    }
  }, [
    tipoCliente,
    pfNombres,
    pfApellidoPaterno,
    pfApellidoMaterno,
    pmRazonSocial,
    fidNombre,
  ]);

  // BC canónico: PM/FID siempre visible, activo y con al menos una fila.
  useEffect(() => {
    if (tipoCliente === 'persona_moral' || tipoCliente === 'fideicomiso') {
      if (!relatedDuenosAplica) setRelatedDuenosAplica(true);
      if (!duenosBeneficiariosAplica) setDuenosBeneficiariosAplica(true);
      if (relatedDuenos.length === 0) {
        const next = [createEmptyRelatedDueno()];
        setRelatedDuenos(next);
        syncLegacyFromRelated(next);
      }
    }
  }, [tipoCliente, relatedDuenosAplica, duenosBeneficiariosAplica, relatedDuenos.length]);

  function validate(): Errors {
    const e: Errors = {};
    req(e, 'nombre_entidad', 'Nombre / Razón social', nombreEntidad);
    req(e, 'nacionalidad', 'Nacionalidad', nacionalidad);

    req(e, 'contacto.pais', 'País (contacto)', contactoPais);

    req(e, 'tipoNacionalidad', 'Tipo de nacionalidad', tipoNacionalidad);

    if (tipoNacionalidad === 'nacional') {
      if (!isMexicoKey(nacionalidad)) {
        e.nacionalidad = 'Para nacional, la nacionalidad debe ser México';
      }

      if (!isMexicoKey(contactoPais)) {
        e['contacto.pais'] = 'Para nacional, el país de contacto debe ser México';
      }
    }

    if (tipoNacionalidad === 'extranjero') {
      if (!nacionalidad.trim()) {
        e.nacionalidad = 'Nacionalidad es obligatoria';
      } else if (isMexicoKey(nacionalidad)) {
        e.nacionalidad = 'Para extranjero, la nacionalidad no puede ser México';
      }

      if (!contactoPais.trim()) {
        e['contacto.pais'] = 'País (contacto) es obligatorio';
      }
    }
    reqEmail(e, 'contacto.email', 'Email', email);
    reqPhone(e, 'contacto.telefono', 'Teléfono', telefono);

    // ✅ Gate domicilio contacto (alineado a BE)
    req(e, 'contacto.domicilio.pais', 'País (domicilio contacto)', domPais);
    req(e, 'contacto.domicilio.calle', 'Calle (domicilio contacto)', domCalle);
    req(e, 'contacto.domicilio.numero', 'Número (domicilio contacto)', domNumero);
    req(e, 'contacto.domicilio.colonia', 'Colonia (domicilio contacto)', domColonia);
    req(e, 'contacto.domicilio.municipio', 'Municipio (domicilio contacto)', domMunicipio);
    req(e, 'contacto.domicilio.ciudad_delegacion', 'Ciudad/Delegación (domicilio contacto)', domCiudad);
    req(e, 'contacto.domicilio.codigo_postal', 'Código postal (domicilio contacto)', domCP);
    req(e, 'contacto.domicilio.estado', 'Estado (domicilio contacto)', domEstado);

    if (isContactoMexico && domCpFueEditado) {
      const cp = normalizeCodigoPostalMx(domCP);

      if (cp.length !== 5) {
        e['contacto.domicilio.codigo_postal'] = 'Para México, el código postal debe tener 5 dígitos';
      }

      if (domColoniasOpciones.length > 1 && !domColonia.trim()) {
        e['contacto.domicilio.colonia'] = 'Selecciona una colonia';
      }
    }

    if (tipoCliente === 'persona_fisica') {
      req(e, 'pf.nombres', 'Nombre(s)', pfNombres);
      req(e, 'pf.apellido_paterno', 'Apellido paterno', pfApellidoPaterno);
      req(e, 'pf.apellido_materno', 'Apellido materno', pfApellidoMaterno);
      reqYYYYMMDD(e, 'pf.fecha_nacimiento', 'Fecha de nacimiento', pfFechaNacimiento);
      reqRFC(e, 'pf.rfc', 'RFC', pfRfc);
      reqCURP(e, 'pf.curp', 'CURP', pfCurp);
      req(e, 'pf.actividad', 'Actividad económica', pfActividad);

      if (pfIdExpedicion.trim() && !isYYYYMMDD(pfIdExpedicion)) {
        e['pf.identificacion.fecha_expedicion'] =
          'Fecha de expedición inválida (AAAAMMDD)';
      }

      if (pfIdExpiracion.trim() && !isYYYYMMDD(pfIdExpiracion)) {
        e['pf.identificacion.fecha_expiracion'] =
          'Fecha de expiración inválida (AAAAMMDD)';
      }
    }

    if (
      tipoCliente === 'persona_moral' &&
      pmRepEsAccionista
    ) {
      const raw = pmAccPct.trim();

      if (!raw) {
        e['accionista.porcentaje'] =
          'El porcentaje accionario del representante es obligatorio';
      } else {
        const porcentaje = Number(raw.replace(',', '.'));

        if (!Number.isFinite(porcentaje)) {
          e['accionista.porcentaje'] =
            'El porcentaje accionario debe ser un número válido';
        } else if (porcentaje <= 0) {
          e['accionista.porcentaje'] =
            'El porcentaje accionario debe ser mayor que 0';
        } else if (porcentaje > 100) {
          e['accionista.porcentaje'] =
            'El porcentaje accionario debe ser menor o igual a 100';
        }
      }

      if (!pmAccRelacion.trim()) {
        e['accionista.relacion'] =
          'La relación del representante con la sociedad es obligatoria';
      }
    }

    if (tipoCliente === 'fideicomiso') {
      req(e, 'rep.nombres', 'Nombre(s) representante', repNombre);
      req(e, 'rep.apellido_paterno', 'Apellido paterno representante', repAP);
      req(e, 'rep.apellido_materno', 'Apellido materno representante', repAM);
      reqYYYYMMDD(e, 'rep.fecha_nacimiento', 'Fecha nacimiento representante', repFechaNac);
      reqRFC(e, 'rep.rfc', 'RFC representante', repRFC);
      reqCURP(e, 'rep.curp', 'CURP representante', repCURP);
    }

    const beneficiariosAplica =
      tipoCliente === 'persona_fisica' ? relatedDuenosAplica : true;
    const beneficiariosValidation = validateBeneficiariosControladores({
      tipoCliente,
      aplica: beneficiariosAplica,
      beneficiarios: beneficiariosAplica
        ? relatedDuenos.map(buildBeneficiarioControladorPayloadRow)
        : [],
      clientePfRfc: pfRfc,
      clientePfCurp: pfCurp,
    });

    Object.assign(e, beneficiariosValidation.errors);

    return e;
  }

  async function onSave() {
    setFatal('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      if (
        Object.keys(e).some((key) =>
          key.startsWith('beneficiarios_controladores')
        )
      ) {
        setFatal('Completa la sección de Beneficiario Controlador para continuar.');
      }
      return;
    }

    if (!token) {
      setFatal('No hay token en sesión. Vuelve a iniciar sesión.');
      return;
    }

    setSaving(true);
    try {
      const actividadEconomicaPrincipal = catalogPayloadValue(actividades, pfActividad, pfActividadOriginal);
      const giroMercantilPrincipal = catalogPayloadValue(giros, pmGiro, pmGiroOriginal);

      // ✅ Base: comunes + contacto (incluye email + domicilio contacto)
      const body: any = {
        nombre_entidad: nombreEntidad.trim(),
        nacionalidad: valueToCatalogKey(nacionalidad),
        datos_completos: {
          contacto: {
            pais: valueToCatalogKey(contactoPais),
            email: email.trim(),
            telefono: onlyDigits(telefono),
            domicilio_mexico: {
              pais: domPais.trim(),
              calle: domCalle.trim(),
              numero: domNumero.trim(),
              interior: domInterior.trim() || undefined,
              colonia: domColonia.trim(),
              municipio: domMunicipio.trim(),
              ciudad_delegacion: domCiudad.trim(),
              codigo_postal: domCP.trim(),
              estado: domEstado.trim()
            }
          }
        }
      };

        if (tipoCliente === 'persona_fisica') {
          body.nombre_entidad = [pfNombres, pfApellidoPaterno, pfApellidoMaterno]
            .map((value) => safeInput(value).trim())
            .filter(Boolean)
            .join(' ');
          body.datos_completos.persona = stripEmpty({
            tipo: 'persona_fisica',
            nombres: pfNombres.trim(),
            apellido_paterno: pfApellidoPaterno.trim(),
            apellido_materno: pfApellidoMaterno.trim(),
            fecha_nacimiento: onlyDigits(pfFechaNacimiento).slice(0, 8),
            rfc: normalizeUpper(pfRfc),
            curp: normalizeUpper(pfCurp),
            pais_nacimiento: valueToCatalogKey(pfPaisNacimiento),
            actividad_economica: actividadEconomicaPrincipal,
            identificacion: stripEmpty({
              tipo: pfIdTipo.trim(),
              autoridad: pfIdAutoridad.trim(),
              numero: pfIdNumero.trim(),
              fecha_expedicion: onlyDigits(pfIdExpedicion).slice(0, 8),
              fecha_expiracion: onlyDigits(pfIdExpiracion).slice(0, 8),
            }),
          });
        }
        if (tipoCliente === 'persona_moral') {
            body.nombre_entidad = safeInput(pmRazonSocial).trim();
            body.datos_completos.empresa = stripEmpty({
              giro_mercantil: giroMercantilPrincipal,
              razon_social: safeInput(pmRazonSocial).trim(),
              nombre_entidad: safeInput(pmRazonSocial).trim()
            });

          body.datos_completos.representante = stripEmpty({
            nombres: repNombre.trim(),
            apellido_paterno: repAP.trim(),
            apellido_materno: repAM.trim(),
            fecha_nacimiento: repFechaNac.trim(),
            rfc: normalizeUpper(repRFC),
            curp: normalizeUpper(repCURP),
            identificacion: stripEmpty({
              tipo: repIdTipo.trim(),
              autoridad: repIdAutoridad.trim(),
              numero: repIdNumero.trim(),
              fecha_expedicion: onlyDigits(repIdExpedicion).slice(0, 8),
              fecha_expiracion: onlyDigits(repIdExpiracion).slice(0, 8),
            })
          });

        }
        if (tipoCliente === 'fideicomiso') {
          body.datos_completos.representante = stripEmpty({
            nombre_completo: `${repNombre.trim()} ${repAP.trim()} ${repAM.trim()}`.trim(),
            fecha_nacimiento: repFechaNac.trim(),
            rfc: normalizeUpper(repRFC),
            curp: normalizeUpper(repCURP),
            identificacion: stripEmpty({
              tipo: repIdTipo.trim(),
              autoridad: repIdAutoridad.trim(),
              numero: repIdNumero.trim(),
              fecha_expedicion: onlyDigits(repIdExpedicion).slice(0, 8),
              fecha_expiracion: onlyDigits(repIdExpiracion).slice(0, 8),
            })
          });

        }

      const beneficiariosControladoresContract =
        buildBeneficiariosControladoresContract({
          tipoCliente,
          aplica:
            tipoCliente === 'persona_fisica'
              ? relatedDuenosAplica
              : true,
          beneficiarios: relatedDuenos.map(
            buildBeneficiarioControladorPayloadRow
          ),
        });

      body.datos_completos = {
        ...body.datos_completos,
        ...beneficiariosControladoresContract,
      };

      // Limpieza final para evitar mandar vacíos u objetos vacíos
      body.datos_completos = stripEmpty(body.datos_completos);

      if (tipoCliente === 'persona_moral') {
        const bodyAny = body as any;

        const accionistaTercero = pmRepEsAccionista
          ? stripEmpty({
              ...pmAccionistaOriginal,
              nombres: repNombre.trim(),
              apellido_paterno: repAP.trim(),
              apellido_materno: repAM.trim(),
              fecha_nacimiento: onlyDigits(repFechaNac).slice(0, 8),
              rfc: normalizeUpper(repRFC),
              curp: normalizeUpper(repCURP),
              actividad_giro: safeInput(pmGiro).trim(),
              porcentaje_accionario: pmAccPct.trim(),
              relacion: pmAccRelacion.trim(),
            })
          : null;

        bodyAny.datos_completos = {
          ...(isPlainObject(bodyAny.datos_completos)
            ? bodyAny.datos_completos
            : {}),
          representante_es_accionista: pmRepEsAccionista,
          accionista_tercero: accionistaTercero,
        };
      }

      const res = await fetch(`${apiBase}/api/cliente/clientes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFatal(data?.error || `Error al guardar (${res.status})`);
        return;
      }

      router.push(`/cliente/clientes/${id}`);
    } catch (e: any) {
      setFatal(e?.message || 'Error inesperado');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Editar cliente #{id}</h1>

      {fatal ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{fatal}</div>
      ) : null}

      {loading ? <div className="text-sm text-gray-600">Cargando...</div> : null}


      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2 rounded-md border border-gray-200 p-3">
          <label className="text-sm font-medium">
            Tipo de nacionalidad <span className="text-red-600">*</span>
          </label>

          <div className="flex flex-wrap gap-3 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="tipoNacionalidad"
                value="nacional"
                checked={tipoNacionalidad === 'nacional'}
                onChange={() => handleTipoNacionalidadChange('nacional')}
              />
              Nacional
            </label>

            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="tipoNacionalidad"
                value="extranjero"
                checked={tipoNacionalidad === 'extranjero'}
                onChange={() => handleTipoNacionalidadChange('extranjero')}
              />
              Extranjero
            </label>
          </div>

          {errors.tipoNacionalidad ? (
            <p className="text-xs text-red-600">{errors.tipoNacionalidad}</p>
          ) : null}

          <p className="text-xs text-gray-500">
            Nacional fija México en nacionalidad y país. Extranjero habilita selección manual.
          </p>
        </div>

        <SearchableSelect
          label="Nacionalidad"
          required
          value={nacionalidad}
          items={paises}
          placeholder="Busca país o clave..."
          error={errors.nacionalidad}
          onChange={(v) => {
            if (tipoNacionalidad !== 'nacional') setNacionalidad(v);
          }}
        />

        <SearchableSelect
          label="País (contacto)"
          required
          value={contactoPais}
          items={paises}
          placeholder="Busca país o clave..."
          error={errors['contacto.pais']}
          onChange={(v) => {
            if (tipoNacionalidad !== 'nacional') setContactoPais(v);
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">
            Email <span className="text-red-600">*</span>
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={classInput(!!errors['contacto.email'])}
            placeholder="correo@dominio.com"
          />
          {errText(errors['contacto.email'])}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">
            Teléfono <span className="text-red-600">*</span>
          </label>
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className={classInput(!!errors['contacto.telefono'])}
            placeholder="+52 5512345678"
          />
          {errText(errors['contacto.telefono'])}
        </div>
      </div>

      {/* ✅ Domicilio contacto (manual) */}
      <div className="rounded-md border p-4 space-y-3">
        <h2 className="font-semibold">Domicilio de contacto</h2>

        <div className="space-y-1">
          <label className="text-sm font-medium">
            País (domicilio contacto) <span className="text-red-600">*</span>
          </label>
          <input
            value={domPais}
            onChange={(e) => setDomPais(e.target.value)}
            className={classInput(!!errors['contacto.domicilio.pais'])}
            placeholder="Mexico"
          />
          {errText(errors['contacto.domicilio.pais'])}
          <p className="text-xs text-gray-500">Campo manual por ahora (no catálogo). No depende de “País (contacto)”.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Calle <span className="text-red-600">*</span>
            </label>
            <input
              value={domCalle}
              onChange={(e) => setDomCalle(e.target.value)}
              className={classInput(!!errors['contacto.domicilio.calle'])}
            />
            {errText(errors['contacto.domicilio.calle'])}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Número <span className="text-red-600">*</span>
              </label>
              <input
                value={domNumero}
                onChange={(e) => setDomNumero(e.target.value)}
                className={classInput(!!errors['contacto.domicilio.numero'])}
              />
              {errText(errors['contacto.domicilio.numero'])}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Interior</label>
              <input value={domInterior} onChange={(e) => setDomInterior(e.target.value)} className={classInput(false)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {isContactoMexico && domColoniasOpciones.length > 1 ? (
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Colonia <span className="text-red-600">*</span>
              </label>
              <select
                value={domColonia}
                onChange={(e) => setDomColonia(e.target.value)}
                className={classInput(!!errors['contacto.domicilio.colonia'])}
              >
                <option value="">Selecciona colonia</option>
                {domColoniasOpciones.map((colonia) => (
                  <option key={colonia} value={colonia}>
                    {colonia}
                  </option>
                ))}
              </select>
              {errText(errors['contacto.domicilio.colonia'])}
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Colonia <span className="text-red-600">*</span>
              </label>
              <input
                value={domColonia}
                onChange={(e) => setDomColonia(e.target.value)}
                className={classInput(!!errors['contacto.domicilio.colonia'])}
              />
              {errText(errors['contacto.domicilio.colonia'])}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Municipio <span className="text-red-600">*</span>
            </label>
            <input
              value={domMunicipio}
              onChange={(e) => setDomMunicipio(e.target.value)}
              className={classInput(!!errors['contacto.domicilio.municipio'])}
            />
            {errText(errors['contacto.domicilio.municipio'])}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Ciudad o Delegación <span className="text-red-600">*</span>
            </label>
            <input
              value={domCiudad}
              onChange={(e) => setDomCiudad(e.target.value)}
              className={classInput(!!errors['contacto.domicilio.ciudad_delegacion'])}
            />
            {errText(errors['contacto.domicilio.ciudad_delegacion'])}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Código Postal <span className="text-red-600">*</span>
            </label>
            <input
              value={domCP}
              onChange={(e) => handleDomCPChange(e.target.value)}
              className={classInput(!!errors['contacto.domicilio.codigo_postal'])}
              placeholder={isContactoMexico ? 'Ej. 44100' : 'Código postal'}
            />
            {errText(errors['contacto.domicilio.codigo_postal'])}
            {domCpAviso ? (
              <p className="text-xs text-amber-700">{domCpAviso}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">
            Estado <span className="text-red-600">*</span>
          </label>
          <input
            value={domEstado}
            onChange={(e) => setDomEstado(e.target.value)}
            className={classInput(!!errors['contacto.domicilio.estado'])}
          />
          {errText(errors['contacto.domicilio.estado'])}
        </div>
      </div>

      {tipoCliente === 'persona_fisica' ? (
        <div className="rounded-md border p-4 space-y-4">
          <h2 className="font-semibold">Persona física</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Nombre(s) <span className="text-red-600">*</span>
              </label>
              <input
                value={pfNombres}
                onChange={(e) => setPfNombres(e.target.value)}
                className={classInput(!!errors['pf.nombres'])}
              />
              {errText(errors['pf.nombres'])}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Apellido paterno <span className="text-red-600">*</span>
              </label>
              <input
                value={pfApellidoPaterno}
                onChange={(e) => setPfApellidoPaterno(e.target.value)}
                className={classInput(!!errors['pf.apellido_paterno'])}
              />
              {errText(errors['pf.apellido_paterno'])}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Apellido materno <span className="text-red-600">*</span>
              </label>
              <input
                value={pfApellidoMaterno}
                onChange={(e) => setPfApellidoMaterno(e.target.value)}
                className={classInput(!!errors['pf.apellido_materno'])}
              />
              {errText(errors['pf.apellido_materno'])}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Fecha de nacimiento (AAAAMMDD) <span className="text-red-600">*</span>
              </label>
              <input
                value={pfFechaNacimiento}
                onChange={(e) => setPfFechaNacimiento(onlyDigits(e.target.value).slice(0, 8))}
                className={classInput(!!errors['pf.fecha_nacimiento'])}
                placeholder="19900131"
              />
              {errText(errors['pf.fecha_nacimiento'])}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                RFC <span className="text-red-600">*</span>
              </label>
              <input
                value={pfRfc}
                onChange={(e) => setPfRfc(e.target.value.toUpperCase())}
                className={classInput(!!errors['pf.rfc'])}
              />
              {errText(errors['pf.rfc'])}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                CURP <span className="text-red-600">*</span>
              </label>
              <input
                value={pfCurp}
                onChange={(e) => setPfCurp(e.target.value.toUpperCase())}
                className={classInput(!!errors['pf.curp'])}
              />
              {errText(errors['pf.curp'])}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SearchableSelect
              label="País de nacimiento"
              value={pfPaisNacimiento}
              items={paises}
              placeholder="Busca país o clave..."
              error={errors['pf.pais_nacimiento']}
              onChange={setPfPaisNacimiento}
            />

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Actividad económica <span className="text-red-600">*</span>
              </label>
              <select
                value={pfActividad}
                onChange={(e) => setPfActividad(e.target.value)}
                className={classInput(!!errors['pf.actividad'])}
              >
                <option value="">Selecciona...</option>
                {pfActividad && !catalogHasKey(actividades, pfActividad) ? (
                  <option value={pfActividad}>Valor legacy/manual: {pfActividad}</option>
                ) : null}
                {actividades.map((a) => (
                  <option key={a.clave} value={a.clave}>
                    {a.descripcion} ({a.clave})
                  </option>
                ))}
              </select>
              {errText(errors['pf.actividad'])}
            </div>
          </div>

          <div className="border-t pt-3 space-y-3">
            <h3 className="font-medium">Identificación vigente</h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo / documento</label>
                <input
                  value={pfIdTipo}
                  onChange={(e) => setPfIdTipo(e.target.value)}
                  className={classInput(false)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Autoridad</label>
                <input
                  value={pfIdAutoridad}
                  onChange={(e) => setPfIdAutoridad(e.target.value)}
                  className={classInput(false)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Número</label>
                <input
                  value={pfIdNumero}
                  onChange={(e) => setPfIdNumero(e.target.value)}
                  className={classInput(false)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Fecha de expedición (AAAAMMDD)</label>
                <input
                  value={pfIdExpedicion}
                  onChange={(e) => setPfIdExpedicion(onlyDigits(e.target.value).slice(0, 8))}
                  className={classInput(!!errors['pf.identificacion.fecha_expedicion'])}
                />
                {errText(errors['pf.identificacion.fecha_expedicion'])}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Fecha de expiración (AAAAMMDD)</label>
                <input
                  value={pfIdExpiracion}
                  onChange={(e) => setPfIdExpiracion(onlyDigits(e.target.value).slice(0, 8))}
                  className={classInput(!!errors['pf.identificacion.fecha_expiracion'])}
                />
                {errText(errors['pf.identificacion.fecha_expiracion'])}
              </div>
            </div>
          </div>

          <div className="border-t pt-3 space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={relatedDuenosAplica}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setRelatedDuenosAplica(checked);
                  setDuenosBeneficiariosAplica(checked);
                  clearBeneficiariosControladoresErrors();
                  setFatal('');

                  if (!checked) {
                    setRelatedDuenos([]);
                    syncLegacyFromRelated([]);
                  } else if (relatedDuenos.length === 0) {
                    const next = [createEmptyRelatedDueno()];
                    setRelatedDuenos(next);
                    syncLegacyFromRelated(next);
                  }
                }}
              />
              <span>
                Manifiesto que tengo conocimiento de la existencia del dueño beneficiario.
              </span>
            </label>

            {relatedDuenosAplica
              ? renderRelatedDuenosList({
                  relatedDuenos,
                  setRelatedDuenos,
                  syncLegacyFromRelated,
                  errors,
                })
              : null}
          </div>
        </div>
      ) : null}
      {tipoCliente === 'persona_moral' ? (
        <div className="rounded-md border p-4 space-y-4">
          <h2 className="font-semibold">Persona moral</h2>

            <div className="space-y-1">
              <label className="text-sm font-medium">Razón social <span className="text-red-600">*</span></label>
              <input
                value={pmRazonSocial}
                onChange={(e) => setPmRazonSocial(e.target.value)}
                className={classInput(!!errors.nombre_entidad)}
              />
              {errText(errors.nombre_entidad)}
            </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Giro mercantil <span className="text-red-600">*</span>
            </label>
            <select
              value={pmGiro}
              onChange={(e) => setPmGiro(e.target.value)}
              className={classInput(!!errors['pm.giro'])}
            >
              <option value="">Selecciona...</option>
              {pmGiro && !catalogHasKey(giros, pmGiro) ? (
                <option value={pmGiro}>Valor legacy/manual: {pmGiro}</option>
              ) : null}
              {giros.map((g) => (
                <option key={g.clave} value={g.clave}>
                  {g.descripcion} ({g.clave})
                </option>
              ))}
            </select>
            {errText(errors['pm.giro'])}
          </div>

          <div className="border-t pt-3 space-y-3">
            <h3 className="font-semibold">Representante</h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nombre(s) *</label>
                <input
                  value={repNombre}
                  onChange={(e) => setRepNombre(e.target.value)}
                  className={classInput(!!errors['rep.nombres'])}
                />
                {errText(errors['rep.nombres'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Apellido paterno *</label>
                <input
                  value={repAP}
                  onChange={(e) => setRepAP(e.target.value)}
                  className={classInput(!!errors['rep.apellido_paterno'])}
                />
                {errText(errors['rep.apellido_paterno'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Apellido materno *</label>
                <input
                  value={repAM}
                  onChange={(e) => setRepAM(e.target.value)}
                  className={classInput(!!errors['rep.apellido_materno'])}
                />
                {errText(errors['rep.apellido_materno'])}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Fecha nac. (AAAAMMDD) *</label>
                <input
                  value={repFechaNac}
                  onChange={(e) => setRepFechaNac(onlyDigits(e.target.value).slice(0, 8))}
                  className={classInput(!!errors['rep.fecha_nacimiento'])}
                />
                {errText(errors['rep.fecha_nacimiento'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">RFC *</label>
                <input
                  value={repRFC}
                  onChange={(e) => setRepRFC(e.target.value)}
                  className={classInput(!!errors['rep.rfc'])}
                />
                {errText(errors['rep.rfc'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">CURP *</label>
                <input
                  value={repCURP}
                  onChange={(e) => setRepCURP(e.target.value)}
                  className={classInput(!!errors['rep.curp'])}
                />
                {errText(errors['rep.curp'])}
              </div>
            </div>

            <div className="border-t pt-3 space-y-3">
          <div className="rounded border border-gray-200 p-3 space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={pmRepEsAccionista}
                onChange={(event) => {
                  const checked = event.target.checked;

                  setPmRepEsAccionista(checked);

                  if (!checked) {
                    setPmAccPct('');
                    setPmAccRelacion('');
                    setPmAccError('accionista.porcentaje');
                    setPmAccError('accionista.relacion');
                  }
                }}
              />

              <span>
                El representante legal también es accionista
              </span>
            </label>

            {pmRepEsAccionista ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Porcentaje accionario del representante *
                  </label>

                  <input
                    value={pmAccPct}
                    onChange={(event) =>
                      setPmAccPct(event.target.value)
                    }
                    onBlur={validatePmAccPorcentajeOnBlur}
                    className={classInput(
                      !!errors['accionista.porcentaje']
                    )}
                    placeholder="25"
                  />

                  {errText(errors['accionista.porcentaje'])}
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium">
                    Relación del representante con la sociedad *
                  </label>

                  <input
                    value={pmAccRelacion}
                    onChange={(event) =>
                      setPmAccRelacion(event.target.value)
                    }
                    onBlur={validatePmAccRelacionOnBlur}
                    className={classInput(
                      !!errors['accionista.relacion']
                    )}
                  />

                  {errText(errors['accionista.relacion'])}
                </div>
              </div>
            ) : null}
          </div>

              <h4 className="font-medium">Identificación / Acreditación del representante legal</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Tipo / documento</label>
                  <input value={repIdTipo} onChange={(e) => setRepIdTipo(e.target.value)} className={classInput(false)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Autoridad</label>
                  <input value={repIdAutoridad} onChange={(e) => setRepIdAutoridad(e.target.value)} className={classInput(false)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Número</label>
                  <input value={repIdNumero} onChange={(e) => setRepIdNumero(e.target.value)} className={classInput(false)} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Fecha expedición (AAAAMMDD)</label>
                  <input
                    value={repIdExpedicion}
                    onChange={(e) => setRepIdExpedicion(onlyDigits(e.target.value).slice(0, 8))}
                    className={classInput(false)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Fecha expiración (AAAAMMDD)</label>
                  <input
                    value={repIdExpiracion}
                    onChange={(e) => setRepIdExpiracion(onlyDigits(e.target.value).slice(0, 8))}
                    className={classInput(false)}
                  />
                </div>
              </div>
            </div>
          </div>
            <div className="border-t pt-3 space-y-3">
              {renderRelatedDuenosList({
                relatedDuenos,
                setRelatedDuenos,
                syncLegacyFromRelated,
                errors,
              })}
            </div>
        </div>
      ) : null}
      {tipoCliente === 'fideicomiso' ? (
        <div className="rounded-md border p-4 space-y-3">
          <h2 className="font-semibold">Fideicomiso</h2>

            <div className="space-y-1">
              <label className="text-sm font-medium">Nombre del fideicomiso <span className="text-red-600">*</span></label>
              <input
                value={fidNombre}
                onChange={(e) => setFidNombre(e.target.value)}
                className={classInput(!!errors.nombre_entidad)}
              />
              {errText(errors.nombre_entidad)}
            </div>
          <div className="border-t pt-3 space-y-3">
            <h3 className="font-semibold">Representante</h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nombre(s) *</label>
                <input value={repNombre} onChange={(e) => setRepNombre(e.target.value)} className={classInput(!!errors['rep.nombres'])} />
                {errText(errors['rep.nombres'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Apellido paterno *</label>
                <input value={repAP} onChange={(e) => setRepAP(e.target.value)} className={classInput(!!errors['rep.apellido_paterno'])} />
                {errText(errors['rep.apellido_paterno'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Apellido materno *</label>
                <input value={repAM} onChange={(e) => setRepAM(e.target.value)} className={classInput(!!errors['rep.apellido_materno'])} />
                {errText(errors['rep.apellido_materno'])}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Fecha nac. (AAAAMMDD) *</label>
                <input
                  value={repFechaNac}
                  onChange={(e) => setRepFechaNac(onlyDigits(e.target.value).slice(0, 8))}
                  className={classInput(!!errors['rep.fecha_nacimiento'])}
                />
                {errText(errors['rep.fecha_nacimiento'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">RFC *</label>
                <input value={repRFC} onChange={(e) => setRepRFC(e.target.value)} className={classInput(!!errors['rep.rfc'])} />
                {errText(errors['rep.rfc'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">CURP *</label>
                <input value={repCURP} onChange={(e) => setRepCURP(e.target.value)} className={classInput(!!errors['rep.curp'])} />
                {errText(errors['rep.curp'])}
              </div>
            </div>

            <div className="border-t pt-3 space-y-3">
              <h4 className="font-medium">Identificación / Acreditación del representante legal</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Tipo / documento</label>
                  <input value={repIdTipo} onChange={(e) => setRepIdTipo(e.target.value)} className={classInput(false)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Autoridad</label>
                  <input value={repIdAutoridad} onChange={(e) => setRepIdAutoridad(e.target.value)} className={classInput(false)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Número</label>
                  <input value={repIdNumero} onChange={(e) => setRepIdNumero(e.target.value)} className={classInput(false)} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Fecha expedición (AAAAMMDD)</label>
                  <input
                    value={repIdExpedicion}
                    onChange={(e) => setRepIdExpedicion(onlyDigits(e.target.value).slice(0, 8))}
                    className={classInput(false)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Fecha expiración (AAAAMMDD)</label>
                  <input
                    value={repIdExpiracion}
                    onChange={(e) => setRepIdExpiracion(onlyDigits(e.target.value).slice(0, 8))}
                    className={classInput(false)}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-3 space-y-3">
              {renderRelatedDuenosList({
                relatedDuenos,
                setRelatedDuenos,
                syncLegacyFromRelated,
                errors,
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>

        <button type="button" className="rounded-md border px-4 py-2 text-sm" onClick={() => router.push(`/cliente/clientes/${id}`)}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
