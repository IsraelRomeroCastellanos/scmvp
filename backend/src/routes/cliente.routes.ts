// backend/src/routes/cliente.routes.ts
import { Router, Request, Response } from 'express';
import { PoolClient } from 'pg';
import pool from '../db';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * Helpers de validación
 */
function isNonEmptyString(v: any): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function badRequest(res: Response, msg: string) {
  return res.status(400).json({ error: msg });
}

function conflict(res: Response, msg: string) {
  return res.status(409).json({ error: msg });
}

function parsePositiveInt(v: any): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// RFC genérico (no perfecto, pero suficiente para validación básica)
function isRFC(v: any): boolean {
  if (!isNonEmptyString(v)) return false;
  const s = v.trim().toUpperCase();
  return /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(s);
}

// CURP genérico (validación básica)
function isCURP(v: any): boolean {
  if (!isNonEmptyString(v)) return false;
  const s = v.trim().toUpperCase();
  return /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(s);
}

// Email (validación básica, suficiente para gate)
function isEmail(v: any): boolean {
  if (!isNonEmptyString(v)) return false;
  const s = v.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

// Fecha AAAAMMDD
function isYYYYMMDD(v: any): boolean {
  if (!isNonEmptyString(v)) return false;
  const s = v.trim();
  if (!/^\d{8}$/.test(s)) return false;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4, 6));
  const d = Number(s.slice(6, 8));
  if (y < 1900 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Deep merge: permite PUT parcial de datos_completos sin perder campos existentes.
 * - No mezcla arrays.
 * - Ignora keys con undefined.
 */
function isPlainObject(v: any): v is Record<string, any> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(base: any, patch: any): any {
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch;
  const out: Record<string, any> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (isPlainObject(v) && isPlainObject(out[k])) out[k] = deepMerge(out[k], v);
    else out[k] = v;
  }
  return out;
}

function hasOwn(obj: any, key: string): boolean {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function parseBooleanLike(v: any): boolean | null {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['true', '1', 'si', 'sí', 'yes'].includes(s)) return true;
    if (['false', '0', 'no'].includes(s)) return false;
  }
  return null;
}

function trimOrNull(v: any): string | null {
  return isNonEmptyString(v) ? v.trim() : null;
}

function upperOrNull(v: any): string | null {
  return isNonEmptyString(v) ? v.trim().toUpperCase() : null;
}

function numberOrNull(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function extractRfcPrincipal(tipo: any, datos_completos: any): string | null {
  const t = String(tipo || '').trim();
  const dc = datos_completos ?? {};
  let rfc: any = null;

  if (t === 'persona_fisica') rfc = dc?.persona?.rfc;
  else if (t === 'persona_moral') rfc = dc?.empresa?.rfc;
  else if (t === 'fideicomiso') rfc = null; // pendiente definir gate para FID

  if (!isNonEmptyString(rfc)) return null;
  return rfc.trim().toUpperCase();
}

function normalizeDuenoBeneficiarioItem(item: any) {
  return {
    nombres: trimOrNull(item?.nombres),
    apellido_paterno: trimOrNull(item?.apellido_paterno),
    apellido_materno: trimOrNull(item?.apellido_materno),
    fecha_nacimiento: trimOrNull(item?.fecha_nacimiento),
    nacionalidad: trimOrNull(item?.nacionalidad),
    relacion_con_cliente: trimOrNull(item?.relacion_con_cliente ?? item?.relacion),
    rfc: upperOrNull(item?.rfc),
    curp: upperOrNull(item?.curp),
    porcentaje_participacion: numberOrNull(item?.porcentaje_participacion),
    observaciones: trimOrNull(item?.observaciones),
  };
}

function normalizeRecursoTerceroCanonical(item: any) {
  return {
    tipo_tercero: trimOrNull(item?.tipo_tercero),
    nombre_razon_social: trimOrNull(item?.nombre_razon_social),
    relacion_con_cliente: trimOrNull(item?.relacion_con_cliente),
    actividad_giro: trimOrNull(item?.actividad_giro),
    nacionalidad: trimOrNull(item?.nacionalidad),
    sin_documentacion: parseBooleanLike(item?.sin_documentacion),
    rfc: upperOrNull(item?.rfc),
    curp: upperOrNull(item?.curp),
    fecha_nacimiento: trimOrNull(item?.fecha_nacimiento),
    observaciones: trimOrNull(item?.observaciones),
  };
}

function normalizeRecursoTerceroLegacy(item: any) {
  return {
    tipo_tercero: 'persona_fisica',
    nombre_razon_social: trimOrNull(item?.nombre_razon_social ?? item?.nombre_completo),
    relacion_con_cliente: trimOrNull(item?.relacion_con_cliente ?? item?.relacion),
    actividad_giro: trimOrNull(item?.actividad_giro),
    nacionalidad: trimOrNull(item?.nacionalidad),
    sin_documentacion: parseBooleanLike(item?.sin_documentacion),
    rfc: upperOrNull(item?.rfc),
    curp: upperOrNull(item?.curp),
    fecha_nacimiento: trimOrNull(item?.fecha_nacimiento),
    observaciones: trimOrNull(item?.observaciones),
  };
}

function extractChildState(tipo: string, datos_completos: any) {
  const dc = datos_completos ?? {};

  let duenosAplica: boolean | null = null;
  let recursosAplica: boolean | null = null;
  let duenosSource: 'canonical' | 'legacy' | 'none' = 'none';
  let recursosSource: 'canonical' | 'legacy' | 'none' = 'none';

  let duenosBeneficiarios: any[] = [];
  let recursosTerceros: any[] = [];

  if (tipo === 'persona_fisica') {
    if (Array.isArray(dc?.recursos_terceros)) {
      recursosSource = 'canonical';
      recursosTerceros = dc.recursos_terceros.map(normalizeRecursoTerceroCanonical);
    } else if (Array.isArray(dc?.terceros)) {
      recursosSource = 'legacy';
      recursosTerceros = dc.terceros.map(normalizeRecursoTerceroLegacy);
    }

    recursosAplica =
      parseBooleanLike(dc?.recursos_terceros_aplica) ??
      parseBooleanLike(dc?.terceros_info?.manifiesta);

    if (recursosAplica === null && recursosTerceros.length > 0) recursosAplica = true;
  }

  if (tipo === 'persona_moral' || tipo === 'fideicomiso') {
    if (Array.isArray(dc?.duenos_beneficiarios)) {
      duenosSource = 'canonical';
      duenosBeneficiarios = dc.duenos_beneficiarios.map(normalizeDuenoBeneficiarioItem);
    } else if (Array.isArray(dc?.beneficiarios_controladores)) {
      duenosSource = 'legacy';
      duenosBeneficiarios = dc.beneficiarios_controladores.map(normalizeDuenoBeneficiarioItem);
    }

    duenosAplica =
      parseBooleanLike(dc?.duenos_beneficiarios_aplica) ??
      parseBooleanLike(dc?.BeneficiarioControlador);

    if (duenosAplica === null && duenosBeneficiarios.length > 0) duenosAplica = true;
  }

  return {
    duenosAplica,
    recursosAplica,
    duenosSource,
    recursosSource,
    duenosBeneficiarios,
    recursosTerceros,
  };
}

function validateDuenoBeneficiarioOr400(
  res: Response,
  item: any,
  idx: number,
  mode: 'canonical' | 'legacy',
): boolean {
  const prefix = `duenos_beneficiarios[${idx}]`;

  if (!isNonEmptyString(item?.nombres)) return (badRequest(res, `${prefix}.nombres es obligatorio`), false);
  if (!isNonEmptyString(item?.apellido_paterno))
    return (badRequest(res, `${prefix}.apellido_paterno es obligatorio`), false);
  if (!isNonEmptyString(item?.apellido_materno))
    return (badRequest(res, `${prefix}.apellido_materno es obligatorio`), false);

  if (mode === 'canonical') {
    if (!isNonEmptyString(item?.fecha_nacimiento))
      return (badRequest(res, `${prefix}.fecha_nacimiento es obligatoria`), false);
    if (!isYYYYMMDD(item?.fecha_nacimiento))
      return (badRequest(res, `${prefix}.fecha_nacimiento inválida (AAAAMMDD)`), false);
    if (!isNonEmptyString(item?.nacionalidad))
      return (badRequest(res, `${prefix}.nacionalidad es obligatoria`), false);
    if (!isNonEmptyString(item?.relacion_con_cliente))
      return (badRequest(res, `${prefix}.relacion_con_cliente es obligatoria`), false);
  } else {
    if (isNonEmptyString(item?.fecha_nacimiento) && !isYYYYMMDD(item?.fecha_nacimiento))
      return (badRequest(res, `${prefix}.fecha_nacimiento inválida (AAAAMMDD)`), false);
    if (item?.relacion_con_cliente && !isNonEmptyString(item?.relacion_con_cliente))
      return (badRequest(res, `${prefix}.relacion_con_cliente inválida`), false);
  }

  if (isNonEmptyString(item?.rfc) && !isRFC(item?.rfc))
    return (badRequest(res, `${prefix}.rfc inválido`), false);

  if (isNonEmptyString(item?.curp) && !isCURP(item?.curp))
    return (badRequest(res, `${prefix}.curp inválido`), false);

  if (item?.porcentaje_participacion !== null && item?.porcentaje_participacion !== undefined) {
    const n = Number(item?.porcentaje_participacion);
    if (!Number.isFinite(n) || n <= 0 || n > 100)
      return (badRequest(res, `${prefix}.porcentaje_participacion inválido`), false);
  }

  return true;
}

function validateRecursoTerceroOr400(
  res: Response,
  item: any,
  idx: number,
  mode: 'canonical' | 'legacy',
): boolean {
  const prefix = `recursos_terceros[${idx}]`;

  if (mode === 'canonical') {
    if (!isNonEmptyString(item?.tipo_tercero))
      return (badRequest(res, `${prefix}.tipo_tercero es obligatorio`), false);
    if (!['persona_fisica', 'persona_moral'].includes(String(item?.tipo_tercero)))
      return (badRequest(res, `${prefix}.tipo_tercero inválido`), false);
    if (!isNonEmptyString(item?.nombre_razon_social))
      return (badRequest(res, `${prefix}.nombre_razon_social es obligatorio`), false);
    if (!isNonEmptyString(item?.relacion_con_cliente))
      return (badRequest(res, `${prefix}.relacion_con_cliente es obligatoria`), false);
    if (!isNonEmptyString(item?.actividad_giro))
      return (badRequest(res, `${prefix}.actividad_giro es obligatorio`), false);
    if (!isNonEmptyString(item?.nacionalidad))
      return (badRequest(res, `${prefix}.nacionalidad es obligatoria`), false);

    const sinDoc = parseBooleanLike(item?.sin_documentacion);
    if (sinDoc === null) return (badRequest(res, `${prefix}.sin_documentacion es obligatorio`), false);

    if (!sinDoc && item?.tipo_tercero === 'persona_fisica') {
      if (!isNonEmptyString(item?.rfc)) return (badRequest(res, `${prefix}.rfc es obligatorio`), false);
      if (!isRFC(item?.rfc)) return (badRequest(res, `${prefix}.rfc inválido`), false);
      if (!isNonEmptyString(item?.curp)) return (badRequest(res, `${prefix}.curp es obligatorio`), false);
      if (!isCURP(item?.curp)) return (badRequest(res, `${prefix}.curp inválido`), false);
      if (!isNonEmptyString(item?.fecha_nacimiento))
        return (badRequest(res, `${prefix}.fecha_nacimiento es obligatoria`), false);
      if (!isYYYYMMDD(item?.fecha_nacimiento))
        return (badRequest(res, `${prefix}.fecha_nacimiento inválida (AAAAMMDD)`), false);
    }

    if (!sinDoc && item?.tipo_tercero === 'persona_moral') {
      if (!isNonEmptyString(item?.rfc)) return (badRequest(res, `${prefix}.rfc es obligatorio`), false);
      if (!isRFC(item?.rfc)) return (badRequest(res, `${prefix}.rfc inválido`), false);
    }

    return true;
  }

  if (!isNonEmptyString(item?.nombre_razon_social))
    return (badRequest(res, `${prefix}.nombre_razon_social es obligatorio`), false);
  if (!isNonEmptyString(item?.relacion_con_cliente))
    return (badRequest(res, `${prefix}.relacion_con_cliente es obligatoria`), false);
  if (!isNonEmptyString(item?.actividad_giro))
    return (badRequest(res, `${prefix}.actividad_giro es obligatorio`), false);

  const sinDoc = parseBooleanLike(item?.sin_documentacion);
  if (sinDoc === null) return (badRequest(res, `${prefix}.sin_documentacion es obligatorio`), false);

  if (!sinDoc) {
    if (!isNonEmptyString(item?.rfc)) return (badRequest(res, `${prefix}.rfc es obligatorio`), false);
    if (!isRFC(item?.rfc)) return (badRequest(res, `${prefix}.rfc inválido`), false);
    if (!isNonEmptyString(item?.curp)) return (badRequest(res, `${prefix}.curp es obligatorio`), false);
    if (!isCURP(item?.curp)) return (badRequest(res, `${prefix}.curp inválido`), false);
    if (!isNonEmptyString(item?.fecha_nacimiento))
      return (badRequest(res, `${prefix}.fecha_nacimiento es obligatoria`), false);
    if (!isYYYYMMDD(item?.fecha_nacimiento))
      return (badRequest(res, `${prefix}.fecha_nacimiento inválida (AAAAMMDD)`), false);
  }

  if (isNonEmptyString(item?.rfc) && !isRFC(item?.rfc))
    return (badRequest(res, `${prefix}.rfc inválido`), false);
  if (isNonEmptyString(item?.curp) && !isCURP(item?.curp))
    return (badRequest(res, `${prefix}.curp inválido`), false);
  if (isNonEmptyString(item?.fecha_nacimiento) && !isYYYYMMDD(item?.fecha_nacimiento))
    return (badRequest(res, `${prefix}.fecha_nacimiento inválida (AAAAMMDD)`), false);

  return true;
}

function validateChildListsOr400(res: Response, tipo: string, datos_completos: any): boolean {
  const childState = extractChildState(tipo, datos_completos);

  if (tipo === 'persona_fisica') {
    const effectiveAplica = childState.recursosAplica === true || childState.recursosTerceros.length > 0;
    if (effectiveAplica && childState.recursosTerceros.length < 1)
      return (badRequest(res, 'recursos_terceros requiere al menos un registro'), false);

    for (let i = 0; i < childState.recursosTerceros.length; i += 1) {
      const ok = validateRecursoTerceroOr400(
        res,
        childState.recursosTerceros[i],
        i,
        childState.recursosSource === 'canonical' ? 'canonical' : 'legacy',
      );
      if (!ok) return false;
    }
  }

  if (tipo === 'persona_moral' || tipo === 'fideicomiso') {
    const effectiveAplica = childState.duenosAplica === true || childState.duenosBeneficiarios.length > 0;
    if (effectiveAplica && childState.duenosBeneficiarios.length < 1)
      return (badRequest(res, 'duenos_beneficiarios requiere al menos un registro'), false);

    for (let i = 0; i < childState.duenosBeneficiarios.length; i += 1) {
      const ok = validateDuenoBeneficiarioOr400(
        res,
        childState.duenosBeneficiarios[i],
        i,
        childState.duenosSource === 'canonical' ? 'canonical' : 'legacy',
      );
      if (!ok) return false;
    }
  }

  return true;
}

function hasChildPatchForTipo(tipo: string, patchDatos: any): boolean {
  if (!isPlainObject(patchDatos)) return false;

  if (tipo === 'persona_fisica') {
    return (
      hasOwn(patchDatos, 'recursos_terceros_aplica') ||
      hasOwn(patchDatos, 'recursos_terceros') ||
      hasOwn(patchDatos, 'terceros') ||
      hasOwn(patchDatos, 'terceros_info')
    );
  }

  if (tipo === 'persona_moral' || tipo === 'fideicomiso') {
    return (
      hasOwn(patchDatos, 'duenos_beneficiarios_aplica') ||
      hasOwn(patchDatos, 'duenos_beneficiarios') ||
      hasOwn(patchDatos, 'BeneficiarioControlador') ||
      hasOwn(patchDatos, 'beneficiarios_controladores')
    );
  }

  return false;
}

function buildPersistableDuenoRows(datos_completos: any) {
  const childState = extractChildState('persona_moral', datos_completos);
  const effectiveAplica = childState.duenosAplica === true || childState.duenosBeneficiarios.length > 0;
  if (!effectiveAplica) return [];

  return childState.duenosBeneficiarios
    .filter((item) =>
      isNonEmptyString(item?.nombres) &&
      isNonEmptyString(item?.apellido_paterno) &&
      isNonEmptyString(item?.apellido_materno) &&
      isNonEmptyString(item?.fecha_nacimiento) &&
      isNonEmptyString(item?.nacionalidad) &&
      isNonEmptyString(item?.relacion_con_cliente),
    )
    .map((item, idx) => ({
      orden: idx + 1,
      activo: true,
      ...item,
    }));
}

function buildPersistableRecursoRows(datos_completos: any) {
  const childState = extractChildState('persona_fisica', datos_completos);
  const effectiveAplica = childState.recursosAplica === true || childState.recursosTerceros.length > 0;
  if (!effectiveAplica) return [];

  return childState.recursosTerceros
    .filter((item) =>
      isNonEmptyString(item?.tipo_tercero) &&
      isNonEmptyString(item?.nombre_razon_social) &&
      isNonEmptyString(item?.relacion_con_cliente) &&
      isNonEmptyString(item?.actividad_giro) &&
      parseBooleanLike(item?.sin_documentacion) !== null,
    )
    .map((item, idx) => ({
      orden: idx + 1,
      activo: true,
      ...item,
      sin_documentacion: parseBooleanLike(item?.sin_documentacion) === true,
    }));
}

function buildRelacionadoNombreEntidadDueno(item: any): string | null {
  const partes = [item?.nombres, item?.apellido_paterno, item?.apellido_materno]
    .map((v) => trimOrNull(v))
    .filter((v): v is string => !!v);
  return partes.length > 0 ? partes.join(' ') : null;
}

function stripEmbeddedChildCollections(tipo: string, datos_completos: any) {
  const base = isPlainObject(datos_completos) ? { ...datos_completos } : {};
  if (tipo === 'persona_fisica') {
    delete base.recursos_terceros;
  }
  if (tipo === 'persona_moral' || tipo === 'fideicomiso') {
    delete base.duenos_beneficiarios;
  }
  return base;
}

function buildRelacionadosRecursoRows(datos_completos: any) {
  const childState = extractChildState('persona_fisica', datos_completos);
  const effectiveAplica = childState.recursosAplica === true || childState.recursosTerceros.length > 0;
  if (!effectiveAplica) return [];

  return childState.recursosTerceros
    .filter(
      (item) =>
        isNonEmptyString(item?.tipo_tercero) &&
        isNonEmptyString(item?.nombre_razon_social) &&
        isNonEmptyString(item?.relacion_con_cliente) &&
        isNonEmptyString(item?.actividad_giro) &&
        isNonEmptyString(item?.nacionalidad) &&
        parseBooleanLike(item?.sin_documentacion) !== null,
    )
    .map((item, idx) => {
      const sin_documentacion = parseBooleanLike(item?.sin_documentacion) === true;
      const normalized = {
        tipo_tercero: item.tipo_tercero,
        nombre_razon_social: item.nombre_razon_social,
        relacion_con_cliente: item.relacion_con_cliente,
        actividad_giro: item.actividad_giro,
        nacionalidad: item.nacionalidad,
        sin_documentacion,
        rfc: item.rfc,
        curp: item.curp,
        fecha_nacimiento: item.fecha_nacimiento,
        observaciones: item.observaciones,
      };

      return {
        categoria_relacion: 'recurso_tercero',
        tipo_entidad: item.tipo_tercero,
        nombre_entidad: item.nombre_razon_social,
        nacionalidad: item.nacionalidad,
        relacion_con_cliente: item.relacion_con_cliente,
        porcentaje_participacion: null,
        sin_documentacion,
        observaciones: item.observaciones,
        datos_completos: normalized,
        orden: idx + 1,
        activo: true,
      };
    });
}

function buildRelacionadosDuenoRows(datos_completos: any) {
  const childState = extractChildState('persona_moral', datos_completos);
  const effectiveAplica = childState.duenosAplica === true || childState.duenosBeneficiarios.length > 0;
  if (!effectiveAplica) return [];

  return childState.duenosBeneficiarios
    .filter(
      (item) =>
        isNonEmptyString(item?.nombres) &&
        isNonEmptyString(item?.apellido_paterno) &&
        isNonEmptyString(item?.apellido_materno) &&
        isNonEmptyString(item?.fecha_nacimiento) &&
        isNonEmptyString(item?.nacionalidad) &&
        isNonEmptyString(item?.relacion_con_cliente),
    )
    .map((item, idx) => ({
      categoria_relacion: 'dueno_beneficiario',
      tipo_entidad: 'persona_fisica',
      nombre_entidad: buildRelacionadoNombreEntidadDueno(item),
      nacionalidad: item.nacionalidad,
      relacion_con_cliente: item.relacion_con_cliente,
      porcentaje_participacion: item.porcentaje_participacion,
      sin_documentacion: false,
      observaciones: item.observaciones,
      datos_completos: {
        nombres: item.nombres,
        apellido_paterno: item.apellido_paterno,
        apellido_materno: item.apellido_materno,
        fecha_nacimiento: item.fecha_nacimiento,
        nacionalidad: item.nacionalidad,
        relacion_con_cliente: item.relacion_con_cliente,
        rfc: item.rfc,
        curp: item.curp,
        porcentaje_participacion: item.porcentaje_participacion,
        observaciones: item.observaciones,
      },
      orden: idx + 1,
      activo: true,
    }));
}

async function replaceRelacionadosByCategoria(
  client: PoolClient,
  clienteId: number,
  categoria: 'recurso_tercero' | 'dueno_beneficiario',
  rows: Array<{
    categoria_relacion: string;
    tipo_entidad: string;
    nombre_entidad: string | null;
    nacionalidad: string | null;
    relacion_con_cliente: string | null;
    porcentaje_participacion: number | null;
    sin_documentacion: boolean;
    observaciones: string | null;
    datos_completos: Record<string, any>;
    orden: number;
    activo: boolean;
  }>,
): Promise<number> {
  await client.query(
    `DELETE FROM public.cliente_relacionados WHERE cliente_id=$1 AND categoria_relacion=$2`,
    [clienteId, categoria],
  );

  let inserted = 0;

  for (const row of rows) {
    await client.query(
      `INSERT INTO public.cliente_relacionados
        (cliente_id, categoria_relacion, tipo_entidad, nombre_entidad, nacionalidad, relacion_con_cliente, porcentaje_participacion, sin_documentacion, observaciones, datos_completos, orden, activo)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        clienteId,
        row.categoria_relacion,
        row.tipo_entidad,
        row.nombre_entidad,
        row.nacionalidad,
        row.relacion_con_cliente,
        row.porcentaje_participacion,
        row.sin_documentacion,
        row.observaciones,
        row.datos_completos,
        row.orden,
        row.activo,
      ],
    );
    inserted += 1;
  }

  return inserted;
}

function materializeRecursoRelacionadoRow(row: any) {
  const dc = isPlainObject(row?.datos_completos) ? row.datos_completos : {};
  return {
    orden: row.orden,
    activo: row.activo,
    tipo_tercero: row.tipo_entidad,
    nombre_razon_social: row.nombre_entidad,
    relacion_con_cliente: row.relacion_con_cliente,
    actividad_giro: dc?.actividad_giro ?? null,
    nacionalidad: row.nacionalidad,
    sin_documentacion: row.sin_documentacion,
    rfc: dc?.rfc ?? null,
    curp: dc?.curp ?? null,
    fecha_nacimiento: dc?.fecha_nacimiento ?? null,
    observaciones: row.observaciones ?? dc?.observaciones ?? null,
  };
}

function materializeDuenoRelacionadoRow(row: any) {
  const dc = isPlainObject(row?.datos_completos) ? row.datos_completos : {};
  return {
    orden: row.orden,
    activo: row.activo,
    nombres: dc?.nombres ?? null,
    apellido_paterno: dc?.apellido_paterno ?? null,
    apellido_materno: dc?.apellido_materno ?? null,
    fecha_nacimiento: dc?.fecha_nacimiento ?? null,
    nacionalidad: row.nacionalidad,
    relacion_con_cliente: row.relacion_con_cliente,
    rfc: dc?.rfc ?? null,
    curp: dc?.curp ?? null,
    porcentaje_participacion: row.porcentaje_participacion,
    observaciones: row.observaciones ?? dc?.observaciones ?? null,
  };
}

async function replaceChildCollectionsForTipo(
  client: PoolClient,
  clienteId: number,
  tipo: string,
  datos_completos: any,
): Promise<{ recurso_tercero: number; dueno_beneficiario: number }> {
  const summary = { recurso_tercero: 0, dueno_beneficiario: 0 };

  if (tipo === 'persona_fisica') {
    await client.query(`DELETE FROM public.cliente_recursos_terceros WHERE cliente_id=$1`, [clienteId]);
    const rows = buildPersistableRecursoRows(datos_completos);
    for (const row of rows) {
      await client.query(
        `INSERT INTO public.cliente_recursos_terceros
          (cliente_id, orden, activo, tipo_tercero, nombre_razon_social, relacion_con_cliente, actividad_giro, nacionalidad, sin_documentacion, rfc, curp, fecha_nacimiento, observaciones)
         VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          clienteId,
          row.orden,
          row.activo,
          row.tipo_tercero,
          row.nombre_razon_social,
          row.relacion_con_cliente,
          row.actividad_giro,
          row.nacionalidad,
          row.sin_documentacion,
          row.rfc,
          row.curp,
          row.fecha_nacimiento,
          row.observaciones,
        ],
      );
    }

    summary.recurso_tercero = await replaceRelacionadosByCategoria(
      client,
      clienteId,
      'recurso_tercero',
      buildRelacionadosRecursoRows(datos_completos),
    );
  }

  if (tipo === 'persona_moral' || tipo === 'fideicomiso') {
    await client.query(`DELETE FROM public.cliente_duenos_beneficiarios WHERE cliente_id=$1`, [clienteId]);
    const rows = buildPersistableDuenoRows(datos_completos);
    for (const row of rows) {
      await client.query(
        `INSERT INTO public.cliente_duenos_beneficiarios
          (cliente_id, orden, activo, nombres, apellido_paterno, apellido_materno, fecha_nacimiento, nacionalidad, relacion_con_cliente, rfc, curp, porcentaje_participacion, observaciones)
         VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          clienteId,
          row.orden,
          row.activo,
          row.nombres,
          row.apellido_paterno,
          row.apellido_materno,
          row.fecha_nacimiento,
          row.nacionalidad,
          row.relacion_con_cliente,
          row.rfc,
          row.curp,
          row.porcentaje_participacion,
          row.observaciones,
        ],
      );
    }

    summary.dueno_beneficiario = await replaceRelacionadosByCategoria(
      client,
      clienteId,
      'dueno_beneficiario',
      buildRelacionadosDuenoRows(datos_completos),
    );
  }

  return summary;
}

async function assertRelacionadosPersistedForTipo(
  client: PoolClient,
  clienteId: number,
  tipo: string,
  datos_completos: any,
  summary: { recurso_tercero: number; dueno_beneficiario: number },
) {
  if (tipo === 'persona_fisica') {
    const expected = buildRelacionadosRecursoRows(datos_completos).length;
    if (expected > 0 && summary.recurso_tercero !== expected) {
      throw new Error(`Persistencia incompleta en cliente_relacionados (recurso_tercero): expected=${expected} inserted=${summary.recurso_tercero}`);
    }
    return;
  }

  if (tipo === 'persona_moral' || tipo === 'fideicomiso') {
    const expected = buildRelacionadosDuenoRows(datos_completos).length;
    if (expected > 0 && summary.dueno_beneficiario !== expected) {
      throw new Error(`Persistencia incompleta en cliente_relacionados (dueno_beneficiario): expected=${expected} inserted=${summary.dueno_beneficiario}`);
    }
  }
}

async function materializeChildren(clienteId: number, tipo: string, datos_completos: any) {
  const baseDatos = isPlainObject(datos_completos) ? { ...datos_completos } : {};

  if (tipo === 'persona_fisica') {
    const related = await pool.query(
      `SELECT orden, activo, tipo_entidad, nombre_entidad, nacionalidad, relacion_con_cliente, sin_documentacion, observaciones, datos_completos
       FROM public.cliente_relacionados
       WHERE cliente_id=$1 AND categoria_relacion='recurso_tercero'
       ORDER BY orden ASC, id ASC`,
      [clienteId],
    );

    if (related.rows.length > 0) {
      return {
        ...baseDatos,
        recursos_terceros_aplica: true,
        recursos_terceros: related.rows.map(materializeRecursoRelacionadoRow),
      };
    }

    const rows = await pool.query(
      `SELECT orden, activo, tipo_tercero, nombre_razon_social, relacion_con_cliente, actividad_giro, nacionalidad, sin_documentacion, rfc, curp, fecha_nacimiento, observaciones
       FROM public.cliente_recursos_terceros
       WHERE cliente_id=$1
       ORDER BY orden ASC, id ASC`,
      [clienteId],
    );

    return {
      ...baseDatos,
      recursos_terceros_aplica:
        rows.rows.length > 0
          ? true
          : (parseBooleanLike(baseDatos?.recursos_terceros_aplica) ??
            parseBooleanLike(baseDatos?.terceros_info?.manifiesta) ??
            false),
      recursos_terceros: rows.rows,
    };
  }

  if (tipo === 'persona_moral' || tipo === 'fideicomiso') {
    const related = await pool.query(
      `SELECT orden, activo, tipo_entidad, nombre_entidad, nacionalidad, relacion_con_cliente, porcentaje_participacion, observaciones, datos_completos
       FROM public.cliente_relacionados
       WHERE cliente_id=$1 AND categoria_relacion='dueno_beneficiario'
       ORDER BY orden ASC, id ASC`,
      [clienteId],
    );

    if (related.rows.length > 0) {
      return {
        ...baseDatos,
        duenos_beneficiarios_aplica: true,
        duenos_beneficiarios: related.rows.map(materializeDuenoRelacionadoRow),
      };
    }

    const rows = await pool.query(
      `SELECT orden, activo, nombres, apellido_paterno, apellido_materno, fecha_nacimiento, nacionalidad, relacion_con_cliente, rfc, curp, porcentaje_participacion, observaciones
       FROM public.cliente_duenos_beneficiarios
       WHERE cliente_id=$1
       ORDER BY orden ASC, id ASC`,
      [clienteId],
    );

    return {
      ...baseDatos,
      duenos_beneficiarios_aplica:
        rows.rows.length > 0
          ? true
          : (parseBooleanLike(baseDatos?.duenos_beneficiarios_aplica) ??
            parseBooleanLike(baseDatos?.BeneficiarioControlador) ??
            false),
      duenos_beneficiarios: rows.rows,
    };
  }

  return baseDatos;
}

/**
 * Validación por tipo (reusada por POST y PUT)
 */
function validateDatosCompletosOr400(res: Response, tipo: any, datos_completos: any): boolean {
  // contacto común
  const contacto = datos_completos?.contacto ?? {};
  if (!isNonEmptyString(contacto?.pais)) return (badRequest(res, 'contacto.pais es obligatorio'), false);

  const contactoPaisKey = String(contacto?.pais ?? '').trim().toLowerCase();
  const contactoPaisEsMexico = contactoPaisKey === 'mexico-mx' || contactoPaisKey === 'mex';

  if (!isNonEmptyString(contacto?.email)) return (badRequest(res, 'contacto.email es obligatorio'), false);
  if (!isEmail(contacto?.email)) return (badRequest(res, 'contacto.email inválido'), false);

  if (!isNonEmptyString(contacto?.telefono)) return (badRequest(res, 'contacto.telefono es obligatorio'), false);

  // domicilio (contacto) - México (captura manual por ahora)
  const dom = contacto?.domicilio_mexico ?? contacto?.domicilio ?? {};
  if (!isNonEmptyString(dom?.calle)) return (badRequest(res, 'contacto.domicilio.calle es obligatoria'), false);
  if (!isNonEmptyString(dom?.numero)) return (badRequest(res, 'contacto.domicilio.numero es obligatorio'), false);
  if (!isNonEmptyString(dom?.colonia)) return (badRequest(res, 'contacto.domicilio.colonia es obligatoria'), false);
  if (!isNonEmptyString(dom?.municipio)) return (badRequest(res, 'contacto.domicilio.municipio es obligatorio'), false);
  if (!isNonEmptyString(dom?.ciudad_delegacion))
    return (badRequest(res, 'contacto.domicilio.ciudad_delegacion es obligatoria'), false);
  if (!isNonEmptyString(dom?.codigo_postal)) return (badRequest(res, 'contacto.domicilio.codigo_postal es obligatorio'), false);
  if (contactoPaisEsMexico && !/^\d{5}$/.test(String(dom?.codigo_postal).trim()))
    return (badRequest(res, 'contacto.domicilio.codigo_postal inválido'), false);
  if (!isNonEmptyString(dom?.estado)) return (badRequest(res, 'contacto.domicilio.estado es obligatorio'), false);
  if (!isNonEmptyString(dom?.pais)) return (badRequest(res, 'contacto.domicilio.pais es obligatorio'), false);

  // Validaciones por tipo
  if (tipo === 'persona_fisica') {
    const persona = datos_completos?.persona ?? {};

    if (!isNonEmptyString(persona?.nombres)) return (badRequest(res, 'persona.nombres es obligatorio'), false);
    if (!isNonEmptyString(persona?.apellido_paterno)) return (badRequest(res, 'persona.apellido_paterno es obligatorio'), false);
    if (!isNonEmptyString(persona?.apellido_materno)) return (badRequest(res, 'persona.apellido_materno es obligatorio'), false);

    if (!isNonEmptyString(persona?.rfc)) return (badRequest(res, 'persona.rfc es obligatorio'), false);
    if (!isRFC(persona?.rfc)) return (badRequest(res, 'persona.rfc inválido'), false);

    if (!isNonEmptyString(persona?.curp)) return (badRequest(res, 'persona.curp es obligatorio'), false);
    if (!isCURP(persona?.curp)) return (badRequest(res, 'persona.curp inválido'), false);

    if (!isNonEmptyString(persona?.fecha_nacimiento)) return (badRequest(res, 'persona.fecha_nacimiento es obligatoria'), false);
    if (!isYYYYMMDD(persona?.fecha_nacimiento))
      return (badRequest(res, 'persona.fecha_nacimiento inválida (AAAAMMDD)'), false);

    const act = persona?.actividad_economica;
    const actOk =
      (act && typeof act === 'object' && isNonEmptyString((act as any).clave) && isNonEmptyString((act as any).descripcion)) ||
      isNonEmptyString(act);
    if (!actOk) return (badRequest(res, 'persona.actividad_economica es obligatoria'), false);
  }

  if (tipo === 'persona_moral') {
    const empresa = datos_completos?.empresa ?? {};
    if (!isNonEmptyString(empresa?.rfc)) return (badRequest(res, 'empresa.rfc es obligatorio'), false);
    if (!isRFC(empresa?.rfc)) return (badRequest(res, 'empresa.rfc inválido'), false);
    if (!isNonEmptyString(empresa?.fecha_constitucion)) return (badRequest(res, 'empresa.fecha_constitucion es obligatoria'), false);
    if (!isYYYYMMDD(empresa?.fecha_constitucion))
      return (badRequest(res, 'empresa.fecha_constitucion inválida (AAAAMMDD)'), false);

    const giro = empresa?.giro_mercantil ?? empresa?.giro;
    const giroOk =
      (giro && typeof giro === 'object' && isNonEmptyString((giro as any).clave) && isNonEmptyString((giro as any).descripcion)) ||
      isNonEmptyString(giro);
    if (!giroOk) return (badRequest(res, 'empresa.giro_mercantil es obligatorio'), false);

    const rep = datos_completos?.representante ?? {};
    if (!isNonEmptyString(rep?.nombre_completo) && !isNonEmptyString(rep?.nombres)) {
      if (tipo === 'fideicomiso') return (badRequest(res, 'representante.nombre_completo es obligatorio'), false);
    }
  }

  if (tipo === 'fideicomiso') {
    const fide = datos_completos?.fideicomiso ?? {};
    if (!isNonEmptyString(fide?.fideicomiso_nombre))
      return (badRequest(res, 'fideicomiso.fideicomiso_nombre es obligatorio'), false);

    if (!isNonEmptyString(fide?.identificador)) return (badRequest(res, 'fideicomiso.identificador es obligatorio'), false);

    if (!isNonEmptyString(fide?.denominacion_fiduciario))
      return (badRequest(res, 'fideicomiso.denominacion_fiduciario es obligatorio'), false);

    if (!isNonEmptyString(fide?.rfc_fiduciario)) return (badRequest(res, 'fideicomiso.rfc_fiduciario es obligatorio'), false);
    if (!isRFC(fide?.rfc_fiduciario)) return (badRequest(res, 'fideicomiso.rfc_fiduciario inválido'), false);

    const rep = datos_completos?.representante ?? {};
    if (tipo === 'fideicomiso' && !isNonEmptyString(rep?.nombre_completo)) return (badRequest(res, 'representante.nombre_completo es obligatorio'), false);
    if (!isNonEmptyString(rep?.rfc)) return (badRequest(res, 'representante.rfc es obligatorio'), false);
    if (!isRFC(rep?.rfc)) return (badRequest(res, 'representante.rfc inválido'), false);
    if (!isNonEmptyString(rep?.curp)) return (badRequest(res, 'representante.curp es obligatorio'), false);
    if (!isCURP(rep?.curp)) return (badRequest(res, 'representante.curp inválido'), false);
    if (!isNonEmptyString(rep?.fecha_nacimiento))
      return (badRequest(res, 'representante.fecha_nacimiento es obligatoria'), false);
    if (!isYYYYMMDD(rep?.fecha_nacimiento))
      return (badRequest(res, 'representante.fecha_nacimiento inválida (AAAAMMDD)'), false);
  }

  return validateChildListsOr400(res, tipo, datos_completos);
}

/**
 * ===============================
 * LISTAR CLIENTES
 * ===============================
 */
router.get('/clientes', authenticate, async (req: Request, res: Response) => {
  try {
    const empresa_id = parsePositiveInt(req.query.empresa_id);
    if (!empresa_id) return badRequest(res, 'empresa_id inválido');

    const result = await pool.query(
      `SELECT id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en
       FROM clientes
       WHERE empresa_id=$1
       ORDER BY id DESC`,
      [empresa_id]
    );

    return res.json({ clientes: result.rows });
  } catch (error) {
    console.error('Error al listar clientes:', error);
    return res.status(500).json({ error: 'Error al listar clientes' });
  }
});

/**
 * ===============================
 * OBTENER CLIENTE POR ID
 * ===============================
 */
router.get('/clientes/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return badRequest(res, 'id inválido');

    const result = await pool.query(
      `SELECT id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en, datos_completos
       FROM clientes
       WHERE id=$1
       LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

    const row = result.rows[0];
    row.datos_completos = await materializeChildren(
      row.id,
      row.tipo_cliente,
      stripEmbeddedChildCollections(row.tipo_cliente, row.datos_completos),
    );

    return res.json({ cliente: row });
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    return res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

/**
 * ===============================
 * REGISTRAR CLIENTE (Contrato Único)
 * ===============================
 */
router.post('/registrar-cliente', authenticate, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const empresa_id = parsePositiveInt(req.body.empresa_id);
    const tipo = req.body.tipo_cliente;
    const nombre_entidad = req.body.nombre_entidad;
    const nacionalidad = req.body.nacionalidad;
    const datos_completos = req.body.datos_completos;

    if (!empresa_id) return badRequest(res, 'empresa_id inválido');
    if (!isNonEmptyString(tipo)) return badRequest(res, 'tipo_cliente es obligatorio');
    if (!isNonEmptyString(nombre_entidad)) return badRequest(res, 'nombre_entidad es obligatorio');
    if (!isNonEmptyString(nacionalidad)) return badRequest(res, 'nacionalidad es obligatoria');

    if (!validateDatosCompletosOr400(res, tipo, datos_completos)) return;

    const rfc_principal = extractRfcPrincipal(tipo, datos_completos);

    await client.query('BEGIN');

    if (rfc_principal) {
      const dupRfc = await client.query(
        `SELECT id FROM clientes WHERE empresa_id=$1 AND rfc_principal=$2 LIMIT 1`,
        [empresa_id, rfc_principal]
      );
      if (dupRfc.rows.length > 0) {
        await client.query('ROLLBACK');
        return conflict(res, 'RFC ya existe en el registro');
      }
    }

    const dupName = await client.query(
      `SELECT id FROM clientes WHERE empresa_id=$1 AND nombre_entidad=$2 LIMIT 1`,
      [empresa_id, nombre_entidad]
    );
    if (dupName.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Cliente duplicado para esa empresa' });
    }

    const storedDatos = stripEmbeddedChildCollections(tipo, datos_completos);

    const insert = await client.query(
      `INSERT INTO clientes (empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, datos_completos, rfc_principal)
       VALUES ($1, $2, $3, $4, 'activo', $5, $6)
       RETURNING id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en`,
      [empresa_id, nombre_entidad, tipo, nacionalidad, storedDatos, rfc_principal]
    );

    const childSync = await replaceChildCollectionsForTipo(client, insert.rows[0].id, tipo, datos_completos);
    await assertRelacionadosPersistedForTipo(client, insert.rows[0].id, tipo, datos_completos, childSync);

    await client.query('COMMIT');
    return res.status(201).json({ ok: true, cliente: insert.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error al registrar cliente:', error);
    return res.status(500).json({ error: 'Error al registrar cliente' });
  } finally {
    client.release();
  }
});

/**
 * ===============================
 * EDITAR CLIENTE (PUT endurecido)
 * - merge de datos_completos
 * - valida por tipo si se intenta actualizar datos_completos
 * - mantiene rfc_principal y bloquea duplicados por empresa (PF/PM)
 * - replace-all temporal para listas hijas
 * ===============================
 */
router.put('/clientes/:id', authenticate, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return badRequest(res, 'id inválido');

    await client.query('BEGIN');

    const current = await client.query(
      `SELECT id, empresa_id, tipo_cliente, datos_completos
       FROM clientes
       WHERE id=$1
       LIMIT 1`,
      [id]
    );
    if (current.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const empresa_id = current.rows[0].empresa_id;
    const tipo = current.rows[0].tipo_cliente;
    const currentDatos = current.rows[0].datos_completos ?? {};

    const { nombre_entidad, nacionalidad, estado } = req.body;

    let nextDatos: any = null;
    let nextRfcPrincipal: string | null = null;

    if (req.body.datos_completos !== undefined) {
      nextDatos = deepMerge(currentDatos, req.body.datos_completos);
      if (!validateDatosCompletosOr400(res, tipo, nextDatos)) {
        await client.query('ROLLBACK');
        return;
      }

      nextRfcPrincipal = extractRfcPrincipal(tipo, nextDatos);
      if (nextRfcPrincipal) {
        const dupRfc = await client.query(
          `SELECT id FROM clientes WHERE empresa_id=$1 AND rfc_principal=$2 AND id<>$3 LIMIT 1`,
          [empresa_id, nextRfcPrincipal, id]
        );
        if (dupRfc.rows.length > 0) {
          await client.query('ROLLBACK');
          return conflict(res, 'RFC ya existe en el registro');
        }
      }
    }

    const storedNextDatos = nextDatos === null ? null : stripEmbeddedChildCollections(tipo, nextDatos);

    const result = await client.query(
      `UPDATE clientes
       SET nombre_entidad = COALESCE($1, nombre_entidad),
           nacionalidad = COALESCE($2, nacionalidad),
           datos_completos = COALESCE($3, datos_completos),
           estado = COALESCE($4, estado),
           rfc_principal = COALESCE($5, rfc_principal),
           actualizado_en = NOW()
       WHERE id=$6
       RETURNING id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en`,
      [nombre_entidad, nacionalidad, storedNextDatos, estado, nextRfcPrincipal, id]
    );

    if (req.body.datos_completos !== undefined && hasChildPatchForTipo(tipo, req.body.datos_completos)) {
      const childSync = await replaceChildCollectionsForTipo(client, id, tipo, nextDatos);
      await assertRelacionadosPersistedForTipo(client, id, tipo, nextDatos, childSync);
    }

    await client.query('COMMIT');
    return res.json({ ok: true, cliente: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error al editar cliente:', error);
    return res.status(500).json({ error: 'Error al editar cliente' });
  } finally {
    client.release();
  }
});

export default router;
