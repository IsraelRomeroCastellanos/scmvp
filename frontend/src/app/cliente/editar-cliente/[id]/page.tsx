// frontend/src/app/cliente/editar-cliente/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { loadCatalogo, type CatalogItem } from '@/lib/catalogos';

type TipoCliente = 'persona_fisica' | 'persona_moral' | 'fideicomiso';
type Errors = Record<string, string>;

type RecursoTerceroItem = {
  tipo_tercero: string;
  nombre_razon_social: string;
  relacion_con_cliente: string;
  actividad_giro: string;
  nacionalidad: string;
  sin_documentacion: boolean;
  rfc: string;
  curp: string;
  fecha_nacimiento: string;
  observaciones: string;
};

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

type RelatedRecursoRow = {
  tipo_entidad: RelatedTipoEntidad;
  nombre_entidad: string;
  nacionalidad: string;
  relacion_con_cliente: string;
  sin_documentacion: boolean;
  observaciones: string;
  datos_completos: RelatedPFData | RelatedPMData | RelatedFIDData;
};

type RelatedDuenoRow = {
  tipo_entidad: 'persona_fisica';
  nombre_entidad: string;
  nacionalidad: string;
  relacion_con_cliente: string;
  porcentaje_participacion: string;
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

function hydrateRelatedRecursoRow(row: any): RelatedRecursoRow {
  if (!isPlainObject(row)) {
    const datos_completos = createEmptyRelatedPFData();
    return {
      tipo_entidad: 'persona_fisica',
      nombre_entidad: '',
      nacionalidad: 'MEX',
      relacion_con_cliente: '',
      sin_documentacion: false,
      observaciones: '',
      datos_completos,
    };
  }

  const tipo_entidad = detectRelatedTipoEntidad(row);
  const legacy = !isPlainObject(row?.datos_completos) && ('tipo_tercero' in row || 'nombre_razon_social' in row);

  let datos_completos: RelatedPFData | RelatedPMData | RelatedFIDData;
  if (legacy) {
    if (tipo_entidad === 'persona_moral') {
      datos_completos = hydrateRelatedPMData({
        contacto: { pais: row?.nacionalidad || 'MEX', email: '', telefono: '', domicilio: {} },
        empresa: {
          nombre_entidad: row?.nombre_razon_social,
          razon_social: row?.nombre_razon_social,
          rfc: row?.rfc,
          fecha_constitucion: '',
          giro_mercantil: row?.actividad_giro,
        },
        representante: {},
      });
    } else if (tipo_entidad === 'fideicomiso') {
      datos_completos = hydrateRelatedFIDData({
        contacto: { pais: row?.nacionalidad || 'MEX', email: '', telefono: '', domicilio: {} },
        fideicomiso: {
          nombre_entidad: row?.nombre_razon_social,
          denominacion: row?.nombre_razon_social,
          nombre_fideicomiso: row?.nombre_razon_social,
        },
        representante: {},
      });
    } else {
      datos_completos = hydrateRelatedPFData({
        contacto: { pais: row?.nacionalidad || 'MEX', email: '', telefono: '', domicilio: {} },
        persona: {
          nombres: row?.nombre_razon_social,
          apellido_paterno: '',
          apellido_materno: '',
          fecha_nacimiento: row?.fecha_nacimiento,
          rfc: row?.rfc,
          curp: row?.curp,
          actividad_economica: row?.actividad_giro,
        },
      });
    }
  } else {
    datos_completos =
      tipo_entidad === 'persona_fisica'
        ? hydrateRelatedPFData(row?.datos_completos)
        : tipo_entidad === 'persona_moral'
          ? hydrateRelatedPMData(row?.datos_completos)
          : hydrateRelatedFIDData(row?.datos_completos);
  }

  return {
    tipo_entidad,
    nombre_entidad: deriveRelatedNombreEntidad(tipo_entidad, datos_completos) || safeInput(row?.nombre_entidad).trim(),
    nacionalidad: safeInput(row?.nacionalidad || 'MEX').trim() || 'MEX',
    relacion_con_cliente: safeInput(row?.relacion_con_cliente).trim(),
    sin_documentacion: !!row?.sin_documentacion,
    observaciones: safeInput(row?.observaciones).trim(),
    datos_completos,
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
    porcentaje_participacion: safeInput(row?.porcentaje_participacion).trim(),
    observaciones: safeInput(row?.observaciones).trim(),
    datos_completos,
  };
}

function hydrateRelatedCollectionsFromDatos(datos: any) {
  const safeDatos = isPlainObject(datos) ? datos : {};

  const recursosRaw = Array.isArray(safeDatos?.recursos_terceros) ? safeDatos.recursos_terceros : [];
  const duenosRaw = Array.isArray(safeDatos?.duenos_beneficiarios) ? safeDatos.duenos_beneficiarios : [];

  const relatedRecursos = recursosRaw.map(hydrateRelatedRecursoRow);
  const relatedDuenos = duenosRaw.map(hydrateRelatedDuenoRow);

  return {
    relatedRecursosAplica: !!safeDatos?.recursos_terceros_aplica || relatedRecursos.length > 0,
    relatedRecursos,
    relatedDuenosAplica: !!safeDatos?.duenos_beneficiarios_aplica || relatedDuenos.length > 0,
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

function createEmptyRecursoTercero(): RecursoTerceroItem {
  return {
    tipo_tercero: 'persona_fisica',
    nombre_razon_social: '',
    relacion_con_cliente: '',
    actividad_giro: '',
    nacionalidad: 'MEX',
    sin_documentacion: false,
    rfc: '',
    curp: '',
    fecha_nacimiento: '',
    observaciones: ''
  };
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

function normalizeRecursoTerceroRow(row: any): RecursoTerceroItem {
  return {
    tipo_tercero: safeInput(row?.tipo_tercero || 'persona_fisica'),
    nombre_razon_social: safeInput(row?.nombre_razon_social ?? row?.nombre_completo),
    relacion_con_cliente: safeInput(row?.relacion_con_cliente ?? row?.relacion),
    actividad_giro: safeInput(row?.actividad_giro),
    nacionalidad: safeInput(row?.nacionalidad || 'MEX'),
    sin_documentacion: safeBool(row?.sin_documentacion),
    rfc: safeInput(row?.rfc),
    curp: safeInput(row?.curp),
    fecha_nacimiento: safeInput(row?.fecha_nacimiento),
    observaciones: safeInput(row?.observaciones)
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

function addRecursoTerceroRow(
  setRecursosTerceros: React.Dispatch<React.SetStateAction<RecursoTerceroItem[]>>
) {
  setRecursosTerceros((prev) => [...prev, createEmptyRecursoTercero()]);
}

function updateRecursoTerceroRow(
  setRecursosTerceros: React.Dispatch<React.SetStateAction<RecursoTerceroItem[]>>,
  index: number,
  key: keyof RecursoTerceroItem,
  value: RecursoTerceroItem[keyof RecursoTerceroItem]
) {
  setRecursosTerceros((prev) =>
    prev.map((row, i) => (i === index ? { ...row, [key]: value } : row))
  );
}

function removeRecursoTerceroRow(
  setRecursosTerceros: React.Dispatch<React.SetStateAction<RecursoTerceroItem[]>>,
  index: number
) {
  setRecursosTerceros((prev) => prev.filter((_, i) => i !== index));
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
}: {
  relatedDuenos: RelatedDuenoRow[];
  setRelatedDuenos: React.Dispatch<React.SetStateAction<RelatedDuenoRow[]>>;
  syncLegacyFromRelated: (next: RelatedDuenoRow[]) => void;
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
                <label className="text-sm font-medium">Nombres</label>
                <input className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={persona.nombres} onChange={(e) => updatePersonaField(index, "nombres", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Apellido paterno</label>
                <input className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={persona.apellido_paterno} onChange={(e) => updatePersonaField(index, "apellido_paterno", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Apellido materno</label>
                <input className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={persona.apellido_materno} onChange={(e) => updatePersonaField(index, "apellido_materno", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Fecha nacimiento</label>
                <input className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={persona.fecha_nacimiento} onChange={(e) => updatePersonaField(index, "fecha_nacimiento", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Nacionalidad</label>
                <input className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={persona.nacionalidad} onChange={(e) => updatePersonaField(index, "nacionalidad", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Relación con el cliente</label>
                <input className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={persona.relacion_con_cliente} onChange={(e) => updatePersonaField(index, "relacion_con_cliente", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">RFC</label>
                <input className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={persona.rfc} onChange={(e) => updatePersonaField(index, "rfc", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">CURP</label>
                <input className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={persona.curp} onChange={(e) => updatePersonaField(index, "curp", e.target.value)} />
              </div>
              <div className="space-y-1 md:col-span-3">
                <label className="text-sm font-medium">Observaciones</label>
                <input className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={persona.observaciones} onChange={(e) => updatePersonaField(index, "observaciones", e.target.value)} />
              </div>
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

  // PF
  const [pfActividad, setPfActividad] = useState('');
  // PM
  const [pmGiro, setPmGiro] = useState('');
  // Rep (PM/FID)
  const [repNombre, setRepNombre] = useState('');
  const [repAP, setRepAP] = useState('');
  const [repAM, setRepAM] = useState('');
  const [repFechaNac, setRepFechaNac] = useState('');
  const [repRFC, setRepRFC] = useState('');
  const [repCURP, setRepCURP] = useState('');

  const [recursosTercerosAplica, setRecursosTercerosAplica] = useState(false);
  const [recursosTerceros, setRecursosTerceros] = useState<RecursoTerceroItem[]>([]);
  const [duenosBeneficiariosAplica, setDuenosBeneficiariosAplica] = useState(false);
  const [duenosBeneficiarios, setDuenosBeneficiarios] = useState<DuenoBeneficiarioItem[]>([]);
  const [relatedRecursosAplica, setRelatedRecursosAplica] = useState(false);
  const [relatedRecursos, setRelatedRecursos] = useState<RelatedRecursoRow[]>([]);
  const [relatedDuenosAplica, setRelatedDuenosAplica] = useState(false);
  const [relatedDuenos, setRelatedDuenos] = useState<RelatedDuenoRow[]>([]);

  function syncLegacyFromRelated(next: RelatedDuenoRow[]) {
    setDuenosBeneficiarios(next.map(projectRelatedDuenoToLegacy));
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

        if (nextTipo === 'persona_moral') {
          const empresa = datos?.empresa || {};
          setPmRazonSocial(safeInput(empresa?.razon_social || cliente?.nombre_entidad));
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
        }

        const hydrated = hydrateRelatedCollectionsFromDatos(datos);
        const recursosLegacy = Array.isArray(datos?.recursos_terceros)
          ? datos.recursos_terceros.map(normalizeRecursoTerceroRow)
          : [];
        const duenosLegacy = hydrated.relatedDuenos.map(projectRelatedDuenoToLegacy);

        setRelatedRecursosAplica(hydrated.relatedRecursosAplica);
        setRelatedRecursos(hydrated.relatedRecursos);
        setRelatedDuenosAplica(hydrated.relatedDuenosAplica);
        setRelatedDuenos(hydrated.relatedDuenos);
        setRecursosTerceros(recursosLegacy);
        setRecursosTercerosAplica(recursosLegacy.length > 0);
        setDuenosBeneficiarios(duenosLegacy);
        setDuenosBeneficiariosAplica(duenosLegacy.length > 0);
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
    if (tipoCliente === 'persona_moral') {
      setNombreEntidad(safeInput(pmRazonSocial).trim());
    } else if (tipoCliente === 'fideicomiso') {
      setNombreEntidad(safeInput(fidNombre).trim());
    }
  }, [tipoCliente, pmRazonSocial, fidNombre]);

  // P4: PM editar fijo en sí, visible y abierto
  useEffect(() => {
    if (tipoCliente === 'persona_moral') {
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

    if (tipoCliente === 'fideicomiso') {
      req(e, 'rep.nombres', 'Nombre(s) representante', repNombre);
      req(e, 'rep.apellido_paterno', 'Apellido paterno representante', repAP);
      req(e, 'rep.apellido_materno', 'Apellido materno representante', repAM);
      reqYYYYMMDD(e, 'rep.fecha_nacimiento', 'Fecha nacimiento representante', repFechaNac);
      reqRFC(e, 'rep.rfc', 'RFC representante', repRFC);
      reqCURP(e, 'rep.curp', 'CURP representante', repCURP);
    }

    return e;
  }

  async function onSave() {
    setFatal('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    if (!token) {
      setFatal('No hay token en sesión. Vuelve a iniciar sesión.');
      return;
    }

    setSaving(true);
    try {
      const act = actividades.find((x) => x.clave === pfActividad) || null;
      const giro = giros.find((x) => x.clave === pmGiro) || null;

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
          body.datos_completos.persona = stripEmpty({
            tipo: 'persona_fisica',
            actividad_economica: act ? { clave: act.clave, descripcion: act.descripcion } : pfActividad
          });

          body.datos_completos.recursos_terceros_aplica = recursosTercerosAplica;

          body.datos_completos.recursos_terceros = recursosTercerosAplica
            ? recursosTerceros.map((row) => ({
                tipo_tercero: row.tipo_tercero || 'persona_fisica',
                nombre_razon_social: row.nombre_razon_social.trim(),
                relacion_con_cliente: row.relacion_con_cliente.trim(),
                actividad_giro: row.actividad_giro.trim(),
                nacionalidad: row.nacionalidad || 'MEX',
                sin_documentacion: !!row.sin_documentacion,
                rfc: row.sin_documentacion ? '' : normalizeUpper(row.rfc),
                curp: row.sin_documentacion ? '' : normalizeUpper(row.curp),
                fecha_nacimiento: row.sin_documentacion ? '' : onlyDigits(row.fecha_nacimiento).slice(0, 8),
                observaciones: row.observaciones.trim()
              }))
            : [];
        }
        if (tipoCliente === 'persona_moral') {
            body.nombre_entidad = safeInput(pmRazonSocial).trim();
            body.datos_completos.empresa = stripEmpty({
              giro: giro ? giro.descripcion : undefined,
              razon_social: safeInput(pmRazonSocial).trim(),
              nombre_entidad: safeInput(pmRazonSocial).trim()
            });

            body.nombre_entidad = safeInput(fidNombre).trim();
            body.datos_completos.fideicomiso = stripEmpty({
              ...(body.datos_completos.fideicomiso || {}),
              nombre_fideicomiso: safeInput(fidNombre).trim(),
              nombre_entidad: safeInput(fidNombre).trim()
            });
          body.datos_completos.representante = stripEmpty({
            nombres: repNombre.trim(),
            apellido_paterno: repAP.trim(),
            apellido_materno: repAM.trim(),
            fecha_nacimiento: repFechaNac.trim(),
            rfc: normalizeUpper(repRFC),
            curp: normalizeUpper(repCURP)
          });

          body.datos_completos.duenos_beneficiarios_aplica = duenosBeneficiariosAplica;

          body.datos_completos.duenos_beneficiarios = duenosBeneficiariosAplica
            ? duenosBeneficiarios.map((row) => ({
                nombres: row.nombres.trim(),
                apellido_paterno: row.apellido_paterno.trim(),
                apellido_materno: row.apellido_materno.trim(),
                fecha_nacimiento: onlyDigits(row.fecha_nacimiento).slice(0, 8),
                nacionalidad: row.nacionalidad || 'MEX',
                relacion_con_cliente: row.relacion_con_cliente.trim(),
                rfc: normalizeUpper(row.rfc),
                curp: normalizeUpper(row.curp),
                porcentaje_participacion: row.porcentaje_participacion.trim(),
                observaciones: row.observaciones.trim()
              }))
            : [];
        }
        if (tipoCliente === 'fideicomiso') {
          body.datos_completos.representante = stripEmpty({
            nombre_completo: `${repNombre.trim()} ${repAP.trim()} ${repAM.trim()}`.trim(),
            fecha_nacimiento: repFechaNac.trim(),
            rfc: normalizeUpper(repRFC),
            curp: normalizeUpper(repCURP)
          });

          body.datos_completos.duenos_beneficiarios_aplica = duenosBeneficiariosAplica;

          body.datos_completos.duenos_beneficiarios = duenosBeneficiariosAplica
            ? duenosBeneficiarios.map((row) => ({
                nombres: row.nombres.trim(),
                apellido_paterno: row.apellido_paterno.trim(),
                apellido_materno: row.apellido_materno.trim(),
                fecha_nacimiento: onlyDigits(row.fecha_nacimiento).slice(0, 8),
                nacionalidad: row.nacionalidad || 'MEX',
                relacion_con_cliente: row.relacion_con_cliente.trim(),
                rfc: normalizeUpper(row.rfc),
                curp: normalizeUpper(row.curp),
                porcentaje_participacion: row.porcentaje_participacion.trim(),
                observaciones: row.observaciones.trim()
              }))
            : [];
        }
      // Limpieza final para evitar mandar vacíos u objetos vacíos
      body.datos_completos = stripEmpty(body.datos_completos);

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
        <h2 className="font-semibold">Domicilio de contacto (México)</h2>

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
              onChange={(e) => setDomCP(e.target.value)}
              className={classInput(!!errors['contacto.domicilio.codigo_postal'])}
            />
            {errText(errors['contacto.domicilio.codigo_postal'])}
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
              {actividades.map((a) => (
                <option key={a.clave} value={a.clave}>
                  {a.descripcion} ({a.clave})
                </option>
              ))}
            </select>
            {errText(errors['pf.actividad'])}
          </div>

          <div className="border-t pt-3 space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={recursosTercerosAplica}
                onChange={(e) => {
                  const v = e.target.checked;
                  setRecursosTercerosAplica(v);
                  if (!v) {
                    setRecursosTerceros([]);
                  } else if (recursosTerceros.length === 0) {
                    setRecursosTerceros([createEmptyRecursoTercero()]);
                  }
                }}
              />
              <span>¿Aplica recursos de terceros?</span>
            </label>

            {recursosTercerosAplica ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Recursos de terceros</h3>
                  <button
                    type="button"
                    onClick={() => addRecursoTerceroRow(setRecursosTerceros)}
                    className="rounded border px-3 py-1 text-sm"
                  >
                    Agregar
                  </button>
                </div>

                {recursosTerceros.map((row, index) => (
                  <div key={index} className="rounded border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Tercero #{index + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeRecursoTerceroRow(setRecursosTerceros, index)}
                        className="rounded border px-3 py-1 text-sm text-red-700"
                      >
                        Eliminar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Nombre / razón social</label>
                        <input
                          value={row.nombre_razon_social}
                          onChange={(e) =>
                            updateRecursoTerceroRow(
                              setRecursosTerceros,
                              index,
                              'nombre_razon_social',
                              e.target.value
                            )
                          }
                          className={classInput(false)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">Relación con el cliente</label>
                        <input
                          value={row.relacion_con_cliente}
                          onChange={(e) =>
                            updateRecursoTerceroRow(
                              setRecursosTerceros,
                              index,
                              'relacion_con_cliente',
                              e.target.value
                            )
                          }
                          className={classInput(false)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">Actividad / giro</label>
                        <input
                          value={row.actividad_giro}
                          onChange={(e) =>
                            updateRecursoTerceroRow(
                              setRecursosTerceros,
                              index,
                              'actividad_giro',
                              e.target.value
                            )
                          }
                          className={classInput(false)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">RFC</label>
                        <input
                          value={row.rfc}
                          onChange={(e) =>
                            updateRecursoTerceroRow(
                              setRecursosTerceros,
                              index,
                              'rfc',
                              e.target.value
                            )
                          }
                          className={classInput(false)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">CURP</label>
                        <input
                          value={row.curp}
                          onChange={(e) =>
                            updateRecursoTerceroRow(
                              setRecursosTerceros,
                              index,
                              'curp',
                              e.target.value
                            )
                          }
                          className={classInput(false)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">Fecha nac. (AAAAMMDD)</label>
                        <input
                          value={row.fecha_nacimiento}
                          onChange={(e) =>
                            updateRecursoTerceroRow(
                              setRecursosTerceros,
                              index,
                              'fecha_nacimiento',
                              onlyDigits(e.target.value).slice(0, 8)
                            )
                          }
                          className={classInput(false)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
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
          </div>
            <div className="border-t pt-3 space-y-3">
              {renderRelatedDuenosList({
                relatedDuenos,
                setRelatedDuenos,
                syncLegacyFromRelated,
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
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={relatedDuenosAplica}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setRelatedDuenosAplica(v);
                    setDuenosBeneficiariosAplica(v);

                    if (!v) {
                      setRelatedDuenos([]);
                      syncLegacyFromRelated([]);
                    } else if (relatedDuenos.length === 0) {
                      const next = [createEmptyRelatedDueno()];
                      setRelatedDuenos(next);
                      syncLegacyFromRelated(next);
                    }
                  }}
                />
                <span>¿Aplica Beneficiario Controlador?</span>
              </label>

              {relatedDuenosAplica ? renderRelatedDuenosList({
                relatedDuenos,
                setRelatedDuenos,
                syncLegacyFromRelated,
              }) : null}
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
