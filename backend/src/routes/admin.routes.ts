// backend/src/routes/admin.routes.ts
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import type { PoolClient } from 'pg';
import pool from '../db';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';
import {
  ActividadesVulnerablesError,
  getActiveActivitiesByCompanyIds,
  getActiveCompanyActivities,
  normalizeKeyArrayProperty,
  reconcileCompanyActivities,
  resolveActiveActivitiesByKeys,
} from '../services/actividades-vulnerables.service';
import {
  CrearBorradorMatrizError,
  NuevaVersionHistoricaError,
  createCompanyMatrixVersionFromHistory,
  createEmptyCompanyMatrixDraft,
  getLatestPublishedCompanyMatrix,
  getPublishedActiveMatrixStatusByCompanyIds,
  hasPublishedActiveCompanyMatrix,
} from '../services/matrices-empresa.service';
import {
  ConfiguracionMatrizError,
  getEditableCompanyMatrixDraft,
  listSelectableMatrixCriteria,
  replaceCompanyMatrixDraftComposition,
  replaceCompanyMatrixCriterionRules,
  saveCompanyMatrixCriterionParameters,
  saveCompanyMatrixResults,
  transitionCompanyMatrix,
  type CriterioGrComposicionInput,
  type CriterioPtComposicionInput,
  type ParametrizacionInput,
  type ResultadosInput,
  type ReglasCriterioInput,
} from '../services/configuracion-matriz.service';

const router = Router();

function matrizError(
  res: any,
  status: number,
  codigo: string,
  mensaje: string,
  detalles: string[] = [],
) {
  return res.status(status).json({
    error: { codigo, mensaje, detalles },
  });
}

function parsePositiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

function parsePtCompositionItems(value: unknown): CriterioPtComposicionInput[] | null {
  if (!Array.isArray(value)) return null;
  const ids = new Set<number>();
  const parsed: CriterioPtComposicionInput[] = [];

  for (const raw of value) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const item = raw as Record<string, unknown>;
    if (Object.keys(item).length !== 1 || !('catalogo_criterio_version_id' in item)) return null;
    const id = parsePositiveInteger(item.catalogo_criterio_version_id);
    if (id === null || ids.has(id)) return null;
    ids.add(id);
    parsed.push({ catalogo_criterio_version_id: id });
  }

  return parsed;
}

function parseGrCompositionItems(value: unknown): CriterioGrComposicionInput[] | null {
  if (!Array.isArray(value)) return null;
  const ids = new Set<number>();
  const parsed: CriterioGrComposicionInput[] = [];

  for (const raw of value) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const item = raw as Record<string, unknown>;
    if (
      Object.keys(item).length !== 2 ||
      Object.keys(item).some(
        (key) => !['catalogo_criterio_version_id', 'texto'].includes(key),
      )
    ) return null;
    const id = parsePositiveInteger(item.catalogo_criterio_version_id);
    const texto = typeof item.texto === 'string' ? item.texto.trim() : '';
    if (id === null || !texto || ids.has(id)) return null;
    ids.add(id);
    parsed.push({ catalogo_criterio_version_id: id, texto });
  }

  return parsed;
}

function parseParameterizationBody(body: unknown): ParametrizacionInput | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const raw = body as Record<string, unknown>;
  const revision = parsePositiveInteger(raw.revision);
  if (revision === null) return null;

  if (
    Object.keys(raw).length === 4 &&
    Object.keys(raw).every((key) => ['revision', 'unidad', 'corte_1', 'corte_2'].includes(key)) &&
    (raw.unidad === 'UMA' || raw.unidad === 'PESOS') &&
    typeof raw.corte_1 === 'number' && Number.isFinite(raw.corte_1) &&
    typeof raw.corte_2 === 'number' && Number.isFinite(raw.corte_2) &&
    raw.corte_1 < raw.corte_2
  ) {
    return {
      revision,
      tipo: 'MONTO_CORTES',
      unidad: raw.unidad,
      corte_1: raw.corte_1,
      corte_2: raw.corte_2,
    };
  }

  if (Array.isArray(raw.opciones)) {
    if (
      Object.keys(raw).some((key) => !['revision', 'opciones'].includes(key)) ||
      raw.opciones.length !== 3
    ) {
      return null;
    }
    const labels: string[] = [];
    for (const value of raw.opciones) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
      const option = value as Record<string, unknown>;
      if (Object.keys(option).some((key) => key !== 'etiqueta')) return null;
      const label = typeof option.etiqueta === 'string' ? option.etiqueta.trim() : '';
      if (!label || labels.includes(label)) return null;
      labels.push(label);
    }
    return { revision, tipo: 'OPCIONES', opciones: labels.map((etiqueta) => ({ etiqueta })) };
  }

  if (Array.isArray(raw.rangos)) {
    if (
      Object.keys(raw).some((key) => !['revision', 'rangos'].includes(key)) ||
      raw.rangos.length !== 3
    ) {
      return null;
    }
    const ranges: Extract<ParametrizacionInput, { tipo: 'RANGOS' }>['rangos'] = [];
    for (const [index, value] of raw.rangos.entries()) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
      const range = value as Record<string, unknown>;
      if (
        Object.keys(range).some(
          (key) => !['minimo', 'maximo', 'incluye_minimo', 'incluye_maximo'].includes(key),
        ) ||
        (range.minimo !== null && (typeof range.minimo !== 'number' || !Number.isFinite(range.minimo))) ||
        (range.maximo !== null && (typeof range.maximo !== 'number' || !Number.isFinite(range.maximo))) ||
        typeof range.incluye_minimo !== 'boolean' ||
        typeof range.incluye_maximo !== 'boolean'
      ) {
        return null;
      }
      const minimum = range.minimo as number | null;
      const maximum = range.maximo as number | null;
      if (
        (minimum === null && index !== 0) ||
        (maximum === null && index !== 2) ||
        (minimum === null && maximum === null) ||
        (minimum !== null && maximum !== null && minimum > maximum) ||
        (minimum !== null && maximum !== null && minimum === maximum &&
          (!range.incluye_minimo || !range.incluye_maximo))
      ) {
        return null;
      }
      ranges.push({
        minimo: minimum,
        maximo: maximum,
        incluye_minimo: range.incluye_minimo,
        incluye_maximo: range.incluye_maximo,
      });
    }
    for (let index = 1; index < ranges.length; index += 1) {
      const previous = ranges[index - 1];
      const current = ranges[index];
      if (
        previous.maximo === null || current.minimo === null ||
        previous.maximo > current.minimo ||
        (previous.maximo === current.minimo &&
          previous.incluye_maximo && current.incluye_minimo)
      ) {
        return null;
      }
    }
    return { revision, tipo: 'RANGOS', rangos: ranges };
  }

  return null;
}

function parseResultsBody(body: unknown): ResultadosInput | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const raw = body as Record<string, unknown>;
  if (Object.keys(raw).some((key) => !['revision', 'resultados'].includes(key))) return null;
  const revision = parsePositiveInteger(raw.revision);
  if (revision === null || !Array.isArray(raw.resultados) || raw.resultados.length !== 3) {
    return null;
  }
  const resultados: ResultadosInput['resultados'] = [];
  for (const value of raw.resultados) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const item = value as Record<string, unknown>;
    if (Object.keys(item).some((key) => !['nombre', 'minimo', 'maximo'].includes(key))) return null;
    const nombre = typeof item.nombre === 'string' ? item.nombre.trim() : '';
    if (
      !nombre || nombre.length > 150 ||
      !Number.isSafeInteger(item.minimo) || Number(item.minimo) <= 0 || Number(item.minimo) > 2147483647 ||
      !Number.isSafeInteger(item.maximo) || Number(item.maximo) <= 0 || Number(item.maximo) > 2147483647
    ) return null;
    resultados.push({ nombre, minimo: Number(item.minimo), maximo: Number(item.maximo) });
  }
  return { revision, resultados };
}

function parseRulesBody(body: unknown): ReglasCriterioInput | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const raw = body as Record<string, unknown>;
  if (Object.keys(raw).length !== 1 || !Array.isArray(raw.reglas)) return null;
  const rules: ReglasCriterioInput['reglas'] = [];
  for (const value of raw.reglas) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const rule = value as Record<string, unknown>;
    if (
      Object.keys(rule).length !== 2 ||
      Object.keys(rule).some((key) => !['clave', 'puntaje'].includes(key))
    ) return null;
    if (
      typeof rule.clave !== 'string' || !rule.clave || rule.clave !== rule.clave.trim() ||
      rule.clave.length > 100 || !Number.isSafeInteger(rule.puntaje) ||
      ![1, 2, 3].includes(Number(rule.puntaje))
    ) return null;
    rules.push({
      clave: rule.clave,
      puntaje: Number(rule.puntaje) as 1 | 2 | 3,
    });
  }
  return { reglas: rules };
}

function parseRevisionBody(body: unknown): number | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const raw = body as Record<string, unknown>;
  if (Object.keys(raw).some((key) => key !== 'revision')) return null;
  return parsePositiveInteger(raw.revision);
}

function parseDiscardMatrixBody(body: unknown): { revision: number; motivo: string } | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const raw = body as Record<string, unknown>;
  if (
    Object.keys(raw).length !== 2 ||
    Object.keys(raw).some((key) => !['revision', 'motivo'].includes(key))
  ) return null;
  const revision = parsePositiveInteger(raw.revision);
  if (revision === null || typeof raw.motivo !== 'string') return null;
  const motivo = raw.motivo.trim();
  if (!motivo || [...motivo].length > 500) return null;
  return { revision, motivo };
}

function parseHistoricalVersionBody(body: unknown): { motivo: string } | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const raw = body as Record<string, unknown>;
  if (Object.keys(raw).length !== 1 || Object.keys(raw)[0] !== 'motivo') return null;
  if (typeof raw.motivo !== 'string') return null;
  const motivo = raw.motivo.trim();
  if (!motivo || [...motivo].length > 500) return null;
  return { motivo };
}

// ==========================================
// CATALOGO CANONICO SELECCIONABLE (ADMIN)
// ==========================================
router.get(
  '/catalogos-criterios-matriz',
  authenticate,
  authorizeRoles('admin'),
  async (req, res) => {
    const ambito = req.query.ambito;
    if (ambito !== 'PT' && ambito !== 'GR') {
      return matrizError(res, 400, 'AMBITO_INVALIDO', 'Ambito de matriz invalido');
    }

    try {
      const criterios = await listSelectableMatrixCriteria(pool, ambito);
      return res.json({ criterios });
    } catch (error) {
      console.error('Error al listar criterios de matriz:', error);
      return matrizError(
        res,
        500,
        'CATALOGO_CRITERIOS_ERROR',
        'No fue posible consultar el catalogo de criterios',
      );
    }
  },
);

// ==========================================
// CONSULTAR BORRADOR CONFIGURABLE (ADMIN)
// ==========================================
router.get(
  '/empresas/:empresaId/matrices/borrador',
  authenticate,
  authorizeRoles('admin'),
  async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    if (!Number.isSafeInteger(empresaId) || empresaId <= 0) {
      return matrizError(res, 404, 'EMPRESA_NO_ENCONTRADA', 'Empresa no encontrada');
    }

    try {
      const data = await getEditableCompanyMatrixDraft(pool, empresaId);
      return res.json({ data });
    } catch (error) {
      if (error instanceof ConfiguracionMatrizError) {
        return matrizError(res, error.status, error.code, error.message);
      }
      console.error('Error al consultar borrador de matriz:', error);
      return matrizError(
        res,
        500,
        'BORRADOR_CONSULTA_ERROR',
        'No fue posible consultar el borrador de matriz',
      );
    }
  },
);

// ==========================================
// REEMPLAZAR COMPOSICION DE BORRADOR (ADMIN)
// ==========================================
router.put(
  '/empresas/:empresaId/matrices/:matrizId/criterios',
  authenticate,
  authorizeRoles('admin'),
  async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    const matrizId = Number(req.params.matrizId);
    const actorUsuarioId = req.user?.id;
    const body = req.body as Record<string, unknown> | null;
    if (
      !Number.isSafeInteger(empresaId) || empresaId <= 0 ||
      !Number.isSafeInteger(matrizId) || matrizId <= 0 ||
      !Number.isSafeInteger(actorUsuarioId) || (actorUsuarioId ?? 0) <= 0
    ) {
      return matrizError(res, 404, 'BORRADOR_NO_ENCONTRADO', 'Borrador de matriz no encontrado');
    }
    if (
      !body || Array.isArray(body) ||
      Object.keys(body).some(
        (key) => !['revision', 'criterios_pt', 'criterios_gr'].includes(key),
      )
    ) {
      return matrizError(res, 400, 'COMPOSICION_INVALIDA', 'Body de composicion invalido');
    }

    const revision = parsePositiveInteger(body.revision);
    const criteriosPt = parsePtCompositionItems(body.criterios_pt);
    const criteriosGr = parseGrCompositionItems(body.criterios_gr);
    if (revision === null || criteriosPt === null || criteriosGr === null) {
      return matrizError(res, 400, 'COMPOSICION_INVALIDA', 'Composicion de matriz invalida');
    }

    try {
      const data = await replaceCompanyMatrixDraftComposition(
        pool,
        empresaId,
        matrizId,
        actorUsuarioId!,
        { revision, criterios_pt: criteriosPt, criterios_gr: criteriosGr },
      );
      return res.json({ data });
    } catch (error) {
      if (error instanceof ConfiguracionMatrizError) {
        return matrizError(res, error.status, error.code, error.message);
      }
      console.error('Error al guardar composicion de matriz:', error);
      return matrizError(
        res,
        500,
        'COMPOSICION_GUARDAR_ERROR',
        'No fue posible guardar la composicion de matriz',
      );
    }
  },
);

// ==========================================
// PARAMETRIZAR CRITERIO DE BORRADOR (ADMIN)
// ==========================================
router.put(
  '/empresas/:empresaId/matrices/:matrizId/criterios/:criterioId/parametrizacion',
  authenticate,
  authorizeRoles('admin'),
  async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    const matrizId = Number(req.params.matrizId);
    const criterioId = Number(req.params.criterioId);
    const actorUsuarioId = req.user?.id;
    if (
      !Number.isSafeInteger(empresaId) || empresaId <= 0 ||
      !Number.isSafeInteger(matrizId) || matrizId <= 0 ||
      !Number.isSafeInteger(criterioId) || criterioId <= 0 ||
      !Number.isSafeInteger(actorUsuarioId) || (actorUsuarioId ?? 0) <= 0
    ) {
      return matrizError(res, 404, 'CRITERIO_NO_ENCONTRADO', 'Criterio de matriz no encontrado');
    }

    const input = parseParameterizationBody(req.body);
    if (input === null) {
      return matrizError(res, 400, 'PARAMETRIZACION_INVALIDA', 'Parametrizacion invalida');
    }

    try {
      const data = await saveCompanyMatrixCriterionParameters(
        pool,
        empresaId,
        matrizId,
        criterioId,
        actorUsuarioId!,
        input,
      );
      return res.json({ data });
    } catch (error) {
      if (error instanceof ConfiguracionMatrizError) {
        return matrizError(res, error.status, error.code, error.message);
      }
      console.error('Error al guardar parametrizacion de criterio:', error);
      return matrizError(
        res,
        500,
        'PARAMETRIZACION_GUARDAR_ERROR',
        'No fue posible guardar la parametrizacion',
      );
    }
  },
);

// ==========================================
// REEMPLAZAR REGLAS GR DE CRITERIO (ADMIN)
// ==========================================
router.put(
  '/empresas/:empresaId/matrices/:matrizId/criterios/:criterioId/reglas',
  authenticate,
  authorizeRoles('admin'),
  async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    const matrizId = Number(req.params.matrizId);
    const criterioId = Number(req.params.criterioId);
    const actorUsuarioId = req.user?.id;
    if (
      !Number.isSafeInteger(empresaId) || empresaId <= 0 ||
      !Number.isSafeInteger(matrizId) || matrizId <= 0 ||
      !Number.isSafeInteger(criterioId) || criterioId <= 0 ||
      !Number.isSafeInteger(actorUsuarioId) || (actorUsuarioId ?? 0) <= 0
    ) {
      return matrizError(res, 404, 'CRITERIO_NO_ENCONTRADO', 'Criterio de matriz no encontrado');
    }
    const input = parseRulesBody(req.body);
    if (input === null) {
      return matrizError(res, 400, 'REGLAS_INVALIDAS', 'Body de reglas GR invalido');
    }
    try {
      const data = await replaceCompanyMatrixCriterionRules(
        pool,
        empresaId,
        matrizId,
        criterioId,
        actorUsuarioId!,
        input,
      );
      return res.json({ data });
    } catch (error) {
      if (error instanceof ConfiguracionMatrizError) {
        return matrizError(res, error.status, error.code, error.message, error.details);
      }
      console.error('Error al guardar reglas GR:', error);
      return matrizError(
        res,
        500,
        'REGLAS_GUARDAR_ERROR',
        'No fue posible guardar las reglas GR',
      );
    }
  },
);

router.put(
  '/empresas/:empresaId/matrices/:matrizId/resultados/:ambito',
  authenticate,
  authorizeRoles('admin'),
  async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    const matrizId = Number(req.params.matrizId);
    const actorUsuarioId = req.user?.id;
    const ambito = req.params.ambito;
    const input = parseResultsBody(req.body);
    if (
      !Number.isSafeInteger(empresaId) || empresaId <= 0 ||
      !Number.isSafeInteger(matrizId) || matrizId <= 0 ||
      !Number.isSafeInteger(actorUsuarioId) || (actorUsuarioId ?? 0) <= 0
    ) return matrizError(res, 404, 'BORRADOR_NO_ENCONTRADO', 'Borrador de matriz no encontrado');
    if ((ambito !== 'PT' && ambito !== 'GR') || input === null) {
      return matrizError(res, 400, 'RESULTADOS_INVALIDOS', 'Bandas finales invalidas');
    }
    try {
      const data = await saveCompanyMatrixResults(
        pool, empresaId, matrizId, ambito, actorUsuarioId!, input,
      );
      return res.json({ data });
    } catch (error) {
      if (error instanceof ConfiguracionMatrizError) {
        return matrizError(res, error.status, error.code, error.message);
      }
      console.error('Error al guardar resultados de matriz:', error);
      return matrizError(res, 500, 'RESULTADOS_GUARDAR_ERROR', 'No fue posible guardar las bandas');
    }
  },
);

for (const [path, transition] of [
  ['validar', 'VALIDAR'],
  ['publicar', 'PUBLICAR'],
  ['reabrir', 'REABRIR'],
  ['descartar', 'DESCARTAR'],
  ['activar', 'ACTIVAR'],
] as const) {
  router.post(
    `/empresas/:empresaId/matrices/:matrizId/${path}`,
    authenticate,
    authorizeRoles('admin'),
    async (req, res) => {
      const empresaId = Number(req.params.empresaId);
      const matrizId = Number(req.params.matrizId);
      const actorUsuarioId = req.user?.id;
      const discardBody = transition === 'DESCARTAR' ? parseDiscardMatrixBody(req.body) : null;
      const revision = transition === 'DESCARTAR' ? discardBody?.revision ?? null : parseRevisionBody(req.body);
      if (
        !Number.isSafeInteger(empresaId) || empresaId <= 0 ||
        !Number.isSafeInteger(matrizId) || matrizId <= 0 ||
        !Number.isSafeInteger(actorUsuarioId) || (actorUsuarioId ?? 0) <= 0
      ) return matrizError(res, 404, 'BORRADOR_NO_ENCONTRADO', 'Matriz no encontrada');
      if (revision === null) {
        return transition === 'DESCARTAR'
          ? matrizError(
            res,
            400,
            'MOTIVO_DESCARTE_INVALIDO',
            'Body invalido: revision positiva y motivo obligatorio de hasta 500 caracteres',
          )
          : matrizError(res, 400, 'REVISION_INVALIDA', 'Revision invalida');
      }
      try {
        const data = await transitionCompanyMatrix(
          pool, empresaId, matrizId, actorUsuarioId!, revision, transition,
          discardBody?.motivo,
        );
        return res.json({ data });
      } catch (error) {
        if (error instanceof ConfiguracionMatrizError) {
          return matrizError(res, error.status, error.code, error.message, error.details);
        }
        console.error(`Error al ${path} matriz:`, error);
        return matrizError(res, 500, 'TRANSICION_MATRIZ_ERROR', 'No fue posible cambiar el estado');
      }
    },
  );
}

// ===============================
// CREAR BORRADOR DE MATRIZ (ADMIN)
// ===============================
router.post(
  '/empresas/:empresaId/matrices',
  authenticate,
  authorizeRoles('admin'),
  async (req, res) => {
    const idempotencyKey = req.get('Idempotency-Key');
    if (idempotencyKey === undefined) {
      return matrizError(
        res,
        400,
        'MATRIZ_IDEMPOTENCY_KEY_REQUERIDA',
        'Idempotency-Key es obligatorio',
      );
    }
    if (!/^[\x21-\x7e]{16,128}$/.test(idempotencyKey)) {
      return matrizError(
        res,
        400,
        'MATRIZ_IDEMPOTENCY_KEY_INVALIDA',
        'Idempotency-Key debe tener entre 16 y 128 caracteres ASCII visibles',
      );
    }

    const empresaId = Number(req.params.empresaId);
    const actorUsuarioId = req.user?.id;
    if (
      !Number.isInteger(empresaId) ||
      empresaId <= 0 ||
      !Number.isInteger(actorUsuarioId) ||
      (actorUsuarioId ?? 0) <= 0
    ) {
      return matrizError(
        res,
        404,
        'MATRIZ_EMPRESA_NO_ENCONTRADA',
        'Empresa no encontrada',
      );
    }

    try {
      const response = await createEmptyCompanyMatrixDraft(
        pool,
        empresaId,
        actorUsuarioId!,
        idempotencyKey,
      );
      return res.status(201).json(response);
    } catch (error) {
      if (error instanceof CrearBorradorMatrizError) {
        if (error.status === 500) {
          console.error('Error al crear borrador de matriz:', error);
        }
        return matrizError(res, error.status, error.code, error.message);
      }

      console.error('Error inesperado al crear borrador de matriz:', error);
      return matrizError(
        res,
        500,
        'MATRIZ_CREAR_BORRADOR_ERROR',
        'No fue posible crear el borrador de matriz',
      );
    }
  },
);

// ==================================================
// CREAR NUEVA VERSION DESDE UNA HISTORICA (ADMIN)
// ==================================================
router.post(
  '/empresas/:empresaId/matrices/:versionId/nueva-version',
  authenticate,
  authorizeRoles('admin'),
  async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    const versionId = Number(req.params.versionId);
    const actorUsuarioId = req.user?.id;
    if (
      !Number.isSafeInteger(empresaId) || empresaId <= 0 ||
      !Number.isSafeInteger(actorUsuarioId) || (actorUsuarioId ?? 0) <= 0
    ) {
      return matrizError(res, 404, 'MATRIZ_EMPRESA_NO_ENCONTRADA', 'Empresa no encontrada');
    }
    if (!Number.isSafeInteger(versionId) || versionId <= 0) {
      return matrizError(res, 404, 'MATRIZ_ORIGEN_NO_ENCONTRADA', 'Matriz de origen no encontrada');
    }

    const ifMatch = req.get('If-Match');
    if (ifMatch === undefined) {
      return matrizError(
        res,
        428,
        'MATRIZ_PRECONDICION_REQUERIDA',
        'If-Match es obligatorio',
      );
    }
    const etagMatch = /^"mve-([1-9]\d*)-r([1-9]\d*)"$/.exec(ifMatch);
    const etagVersionId = etagMatch ? Number(etagMatch[1]) : null;
    const revisionOrigen = etagMatch ? Number(etagMatch[2]) : null;
    if (
      etagVersionId !== versionId ||
      !Number.isSafeInteger(revisionOrigen) || (revisionOrigen ?? 0) <= 0
    ) {
      return matrizError(
        res,
        412,
        'MATRIZ_PRECONDICION_FALLIDA',
        'La revision de la matriz de origen no coincide',
      );
    }

    const idempotencyKey = req.get('Idempotency-Key');
    if (idempotencyKey === undefined) {
      return matrizError(
        res,
        400,
        'MATRIZ_IDEMPOTENCY_KEY_REQUERIDA',
        'Idempotency-Key es obligatorio',
      );
    }
    if (!/^[\x21-\x7e]{16,128}$/.test(idempotencyKey)) {
      return matrizError(
        res,
        400,
        'MATRIZ_IDEMPOTENCY_KEY_INVALIDA',
        'Idempotency-Key debe tener entre 16 y 128 caracteres ASCII visibles',
      );
    }

    const body = parseHistoricalVersionBody(req.body);
    if (body === null) {
      return matrizError(
        res,
        400,
        'MATRIZ_MOTIVO_INVALIDO',
        'Motivo obligatorio de hasta 500 caracteres',
      );
    }

    try {
      const response = await createCompanyMatrixVersionFromHistory(
        pool,
        empresaId,
        versionId,
        actorUsuarioId!,
        revisionOrigen!,
        body.motivo,
        idempotencyKey,
      );
      return res.status(201).json(response);
    } catch (error) {
      if (error instanceof NuevaVersionHistoricaError) {
        if (error.status === 500) {
          console.error('Error al crear version desde historica:', error);
        }
        return matrizError(res, error.status, error.code, error.message);
      }
      console.error('Error inesperado al crear version desde historica:', error);
      return matrizError(
        res,
        500,
        'MATRIZ_NUEVA_DESDE_HISTORICA_ERROR',
        'No fue posible crear la nueva version desde la matriz historica',
      );
    }
  },
);

/**
 * ===============================
 * DEBUG — confirmar que el router carga (PROTEGIDO)
 * ===============================
 *
 * Antes estaba público y respondía 200 sin token.
 * Ahora requiere token válido y rol admin.
 */
router.get('/__debug', authenticate, authorizeRoles('admin'), (_req, res) => {
  res.json({ ok: true, router: 'admin' });
});

// ===============================
// LISTAR USUARIOS (ADMIN)
// ===============================
router.get(
  '/usuarios',
  authenticate,
  authorizeRoles('admin'),
  async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          id,
          email,
          nombre_completo,
          rol,
          empresa_id,
          activo
        FROM usuarios
        ORDER BY id ASC
      `);

      res.json({ usuarios: result.rows });
    } catch (error) {
      console.error('Error al listar usuarios:', error);
      res.status(500).json({ error: 'Error al listar usuarios' });
    }
  }
);

// ===============================
// CREAR USUARIO (ADMIN)
// ===============================
router.post(
  '/usuarios',
  authenticate,
  authorizeRoles('admin'),
  async (req, res) => {
    try {
      const email = String(req.body?.email ?? '').trim().toLowerCase();
      const password = String(req.body?.password ?? '');
      const nombre_completo = String(req.body?.nombre_completo ?? '').trim();
      const rol = String(req.body?.rol ?? '').trim().toLowerCase();
      const empresaIdRaw = req.body?.empresa_id;
      const activoRaw = req.body?.activo;

      const rolesPermitidos = ['admin', 'consultor', 'cliente'];

      if (!email) {
        return res.status(400).json({ error: 'email es obligatorio' });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'email invalido' });
      }

      if (!password) {
        return res.status(400).json({ error: 'password es obligatorio' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'password debe tener al menos 8 caracteres' });
      }

      if (!nombre_completo) {
        return res.status(400).json({ error: 'nombre_completo es obligatorio' });
      }

      if (!rolesPermitidos.includes(rol)) {
        return res.status(400).json({ error: 'rol invalido' });
      }

      let empresa_id: number | null = null;

      if (rol === 'admin') {
        if (empresaIdRaw !== undefined && empresaIdRaw !== null) {
          return res.status(400).json({ error: 'empresa_id debe ser null para rol admin' });
        }
      } else {
        if (
          typeof empresaIdRaw !== 'number' ||
          !Number.isInteger(empresaIdRaw) ||
          empresaIdRaw <= 0
        ) {
          return res.status(400).json({ error: 'empresa_id invalido' });
        }

        empresa_id = empresaIdRaw;
      }

      let activo = true;

      if (activoRaw !== undefined) {
        if (typeof activoRaw !== 'boolean') {
          return res.status(400).json({ error: 'activo debe ser boolean' });
        }

        activo = activoRaw;
      }

      if (empresa_id !== null) {
        const empresaResult = await pool.query(
          'SELECT id FROM empresas WHERE id = $1 LIMIT 1',
          [empresa_id]
        );

        if (empresaResult.rows.length === 0) {
          return res.status(400).json({ error: 'empresa_id no existe' });
        }
      }

      const existingUser = await pool.query(
        'SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: 'email ya registrado' });
      }

      const password_hash = await bcrypt.hash(password, 10);

      const result = await pool.query(
        `
        INSERT INTO usuarios (
          email,
          password_hash,
          nombre_completo,
          rol,
          empresa_id,
          activo
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          email,
          nombre_completo,
          rol,
          empresa_id,
          activo
        `,
        [email, password_hash, nombre_completo, rol, empresa_id, activo]
      );

      return res.status(201).json({ usuario: result.rows[0] });
    } catch (error) {
      console.error('Error al crear usuario:', error);
      return res.status(500).json({ error: 'Error al crear usuario' });
    }
  }
);



// ===============================
// EDITAR USUARIO MINIMO (ADMIN)
// ===============================
router.patch(
  '/usuarios/:id',
  authenticate,
  authorizeRoles('admin'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const nombre_completo = String(req.body?.nombre_completo ?? '').trim();
      const rol = String(req.body?.rol ?? '').trim().toLowerCase();
      const empresaIdRaw = req.body?.empresa_id;

      const rolesPermitidos = ['admin', 'consultor', 'cliente'];
      const camposProhibidos = ['email', 'password', 'password_hash', 'activo'];

      for (const campo of camposProhibidos) {
        if (Object.prototype.hasOwnProperty.call(req.body ?? {}, campo)) {
          return res.status(400).json({ error: `${campo} no puede modificarse en este endpoint` });
        }
      }

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'id invalido' });
      }

      if (!nombre_completo) {
        return res.status(400).json({ error: 'nombre_completo es obligatorio' });
      }

      if (!rolesPermitidos.includes(rol)) {
        return res.status(400).json({ error: 'rol invalido' });
      }

      let empresa_id: number | null = null;

      if (rol === 'admin') {
        if (empresaIdRaw !== undefined && empresaIdRaw !== null) {
          return res.status(400).json({ error: 'empresa_id debe ser null para rol admin' });
        }
      } else {
        if (
          typeof empresaIdRaw !== 'number' ||
          !Number.isInteger(empresaIdRaw) ||
          empresaIdRaw <= 0
        ) {
          return res.status(400).json({ error: 'empresa_id invalido' });
        }

        empresa_id = empresaIdRaw;
      }

      const existingUser = await pool.query(
        'SELECT id, rol FROM usuarios WHERE id = $1 LIMIT 1',
        [id]
      );

      if (existingUser.rows.length === 0) {
        return res.status(404).json({ error: 'usuario no encontrado' });
      }

      const authenticatedUserId = Number((req as any).user?.id);

      if (
        Number.isInteger(authenticatedUserId) &&
        authenticatedUserId === id &&
        existingUser.rows[0].rol === 'admin' &&
        rol !== 'admin'
      ) {
        return res.status(400).json({ error: 'no puedes cambiar tu propio rol fuera de admin' });
      }

      if (empresa_id !== null) {
        const empresaResult = await pool.query(
          'SELECT id FROM empresas WHERE id = $1 LIMIT 1',
          [empresa_id]
        );

        if (empresaResult.rows.length === 0) {
          return res.status(400).json({ error: 'empresa_id no existe' });
        }
      }

      const result = await pool.query(
        `
        UPDATE usuarios
        SET
          nombre_completo = $1,
          rol = $2,
          empresa_id = $3
        WHERE id = $4
        RETURNING
          id,
          email,
          nombre_completo,
          rol,
          empresa_id,
          activo
        `,
        [nombre_completo, rol, empresa_id, id]
      );

      return res.json({ usuario: result.rows[0] });
    } catch (error) {
      console.error('Error al editar usuario:', error);
      return res.status(500).json({ error: 'Error al editar usuario' });
    }
  }
);


// ===============================
// ACTIVAR / DESACTIVAR USUARIO (ADMIN)
// ===============================
router.patch(
  '/usuarios/:id/activo',
  authenticate,
  authorizeRoles('admin'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const activo = req.body?.activo;

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'id invalido' });
      }

      if (typeof activo !== 'boolean') {
        return res.status(400).json({ error: 'activo debe ser boolean' });
      }

      const authenticatedUserId = Number((req as any).user?.id);

      if (
        Number.isInteger(authenticatedUserId) &&
        authenticatedUserId === id &&
        activo === false
      ) {
        return res.status(400).json({ error: 'no puedes desactivar tu propio usuario' });
      }

      const result = await pool.query(
        `
        UPDATE usuarios
        SET activo = $1
        WHERE id = $2
        RETURNING
          id,
          email,
          nombre_completo,
          rol,
          empresa_id,
          activo
        `,
        [activo, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'usuario no encontrado' });
      }

      return res.json({ usuario: result.rows[0] });
    } catch (error) {
      console.error('Error al cambiar estado de usuario:', error);
      return res.status(500).json({ error: 'Error al cambiar estado de usuario' });
    }
  }
);

/**
 * ===============================
 * LISTAR EMPRESAS
 * ===============================
 */
router.get(
  '/empresas',
  authenticate,
  authorizeRoles('admin', 'consultor'),
  async (req, res) => {
    try {
      const empresaId = req.user?.rol === 'consultor' ? req.user.empresa_id : null;
      const result = await pool.query(`
        SELECT
          id,
          nombre_legal,
          rfc,
          tipo_entidad,
          estado,
          entidad,
          municipio,
          codigo_postal
        FROM empresas
        ${empresaId === null ? '' : 'WHERE id = $1'}
        ORDER BY nombre_legal
      `, empresaId === null ? [] : [empresaId]);

      const empresaIds = result.rows.map((row) => Number(row.id));
      const [activitiesByCompany, matrixStatusByCompany] = await Promise.all([
        getActiveActivitiesByCompanyIds(pool, empresaIds),
        getPublishedActiveMatrixStatusByCompanyIds(pool, empresaIds),
      ]);
      const empresas = result.rows.map((empresa) => {
        const actividades_vulnerables =
          activitiesByCompany.get(Number(empresa.id)) ?? [];
        return {
          ...empresa,
          actividades_vulnerables,
          configuracion_pld_pendiente: actividades_vulnerables.length === 0,
          tiene_matriz_publicada_activa:
            matrixStatusByCompany.get(Number(empresa.id)) ?? false,
        };
      });

      res.json({ empresas });
    } catch (error) {
      console.error('Error al listar empresas:', error);
      res.status(500).json({ error: 'Error al listar empresas' });
    }
  }
);

const EMPRESA_SELECT_FIELDS = `
  id,
  nombre_legal,
  rfc,
  tipo_entidad,
  pais,
  domicilio,
  estado,
  entidad,
  municipio,
  colonia,
  codigo_postal,
  calle,
  numero,
  ciudad_delegacion,
  estado_provincia
`;

const TIPOS_ENTIDAD_EMPRESA = ['persona_fisica', 'persona_moral'];
const ESTADOS_EMPRESA = ['activo', 'suspendido', 'inactivo'];

function normalizarTextoEmpresa(value: unknown): string | null {
  if (value === undefined || value === null) return null;

  const normalized = String(value).trim();
  return normalized || null;
}

function normalizarEmpresaBody(body: any, estadoPorDefecto: string) {
  const nombre_legal = normalizarTextoEmpresa(body?.nombre_legal);
  const rfcNormalizado = normalizarTextoEmpresa(body?.rfc);
  const tipo_entidad = normalizarTextoEmpresa(body?.tipo_entidad);
  const estadoRecibido = normalizarTextoEmpresa(body?.estado);

  return {
    nombre_legal,
    rfc: rfcNormalizado ? rfcNormalizado.toUpperCase() : null,
    tipo_entidad,
    pais: normalizarTextoEmpresa(body?.pais),
    domicilio: normalizarTextoEmpresa(body?.domicilio),
    estado: estadoRecibido ?? estadoPorDefecto,
    entidad: normalizarTextoEmpresa(body?.entidad),
    municipio: normalizarTextoEmpresa(body?.municipio),
    colonia: normalizarTextoEmpresa(body?.colonia),
    codigo_postal: normalizarTextoEmpresa(body?.codigo_postal),
    calle: normalizarTextoEmpresa(body?.calle),
    numero: normalizarTextoEmpresa(body?.numero),
    ciudad_delegacion: normalizarTextoEmpresa(body?.ciudad_delegacion),
    estado_provincia: normalizarTextoEmpresa(body?.estado_provincia)
  };
}

function validarEmpresaBody(
  res: any,
  empresa: ReturnType<typeof normalizarEmpresaBody>
): boolean {
  if (!empresa.nombre_legal) {
    res.status(400).json({ error: 'nombre_legal es obligatorio' });
    return false;
  }

  if (!empresa.tipo_entidad || !TIPOS_ENTIDAD_EMPRESA.includes(empresa.tipo_entidad)) {
    res.status(400).json({ error: 'tipo_entidad invalido' });
    return false;
  }

  if (!ESTADOS_EMPRESA.includes(empresa.estado)) {
    res.status(400).json({ error: 'estado invalido' });
    return false;
  }

  return true;
}

type PostgresError = Error & {
  code?: string;
  constraint?: string;
};

function isPostgresError(error: unknown): error is PostgresError {
  return error instanceof Error && 'code' in error;
}

function responderConflictoEmpresa(res: any, error: unknown) {
  if (!isPostgresError(error) || error.code !== '23505') return false;

  if (error.constraint === 'idx_empresas_nombre') {
    res.status(409).json({ error: 'nombre_legal ya registrado' });
    return true;
  }

  if (error.constraint === 'idx_empresas_rfc') {
    res.status(409).json({ error: 'rfc ya registrado' });
    return true;
  }

  return false;
}

function responderErrorActividadesVulnerables(res: any, error: unknown) {
  if (!(error instanceof ActividadesVulnerablesError)) return false;
  res.status(error.status).json({ error: error.message });
  return true;
}

// ===============================
// CONSULTAR EMPRESA (ADMIN / CONSULTOR)
// ===============================
router.get(
  '/empresas/:id',
  authenticate,
  authorizeRoles('admin', 'consultor'),
  async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'id invalido' });
    }

    if (req.user?.rol === 'consultor' && req.user.empresa_id !== id) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    try {
      const result = await pool.query(
        `SELECT ${EMPRESA_SELECT_FIELDS} FROM public.empresas WHERE id = $1 LIMIT 1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }

      const [activities, tieneMatrizPublicadaActiva, matrizPublicadaFuente] = await Promise.all([
        getActiveCompanyActivities(pool, id),
        hasPublishedActiveCompanyMatrix(pool, id),
        getLatestPublishedCompanyMatrix(pool, id),
      ]);
      return res.json({
        empresa: {
          ...result.rows[0],
          actividades_vulnerables: activities.map((activity) => ({
            clave: activity.clave,
            nombre: activity.nombre,
            fraccion: activity.fraccion,
            descripcion: activity.descripcion,
          })),
          configuracion_pld_pendiente: activities.length === 0,
          tiene_matriz_publicada_activa: tieneMatrizPublicadaActiva,
          matriz_publicada_fuente: matrizPublicadaFuente,
        },
      });
    } catch (error) {
      console.error('Error al consultar empresa:', error);
      return res.status(500).json({ error: 'Error al consultar empresa' });
    }
  }
);

// ===============================
// CREAR EMPRESA (ADMIN)
// ===============================
router.post(
  '/empresas',
  authenticate,
  authorizeRoles('admin'),
  async (req, res) => {
    const empresa = normalizarEmpresaBody(req.body, 'activo');
    if (!validarEmpresaBody(res, empresa)) return;

    let activitiesProperty;
    try {
      activitiesProperty = normalizeKeyArrayProperty(req.body);
      if (!activitiesProperty.present || activitiesProperty.keys.length === 0) {
        return res.status(400).json({
          error: 'actividades_vulnerables es obligatorio y no puede estar vacío',
        });
      }
    } catch (error) {
      if (responderErrorActividadesVulnerables(res, error)) return;
      console.error('Error al validar actividades vulnerables:', error);
      return res.status(500).json({ error: 'Error al validar actividades vulnerables' });
    }

    let client: PoolClient | null = null;
    let transactionStarted = false;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      transactionStarted = true;

      const duplicateResult = await client.query(
        `SELECT nombre_legal, rfc
         FROM public.empresas
         WHERE LOWER(nombre_legal) = LOWER($1)
            OR ($2::text IS NOT NULL AND UPPER(rfc) = $2)
         LIMIT 1`,
        [empresa.nombre_legal, empresa.rfc]
      );

      if (duplicateResult.rows.length > 0) {
        const duplicate = duplicateResult.rows[0];
        await client.query('ROLLBACK');
        transactionStarted = false;
        if (String(duplicate.nombre_legal).toLowerCase() === empresa.nombre_legal!.toLowerCase()) {
          return res.status(409).json({ error: 'nombre_legal ya registrado' });
        }

        return res.status(409).json({ error: 'rfc ya registrado' });
      }

      const activities = await resolveActiveActivitiesByKeys(
        client,
        activitiesProperty.keys,
      );

      const result = await client.query(
        `INSERT INTO public.empresas (
          nombre_legal, rfc, tipo_entidad, pais, domicilio, estado, entidad,
          municipio, colonia, codigo_postal, calle, numero, ciudad_delegacion,
          estado_provincia
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING ${EMPRESA_SELECT_FIELDS}`,
        [
          empresa.nombre_legal,
          empresa.rfc,
          empresa.tipo_entidad,
          empresa.pais,
          empresa.domicilio,
          empresa.estado,
          empresa.entidad,
          empresa.municipio,
          empresa.colonia,
          empresa.codigo_postal,
          empresa.calle,
          empresa.numero,
          empresa.ciudad_delegacion,
          empresa.estado_provincia
        ]
      );

      await reconcileCompanyActivities(client, Number(result.rows[0].id), activities);
      const assignedActivities = await getActiveCompanyActivities(
        client,
        Number(result.rows[0].id),
      );

      await client.query('COMMIT');
      transactionStarted = false;
      return res.status(201).json({
        empresa: {
          ...result.rows[0],
          actividades_vulnerables: assignedActivities.map((activity) => ({
            clave: activity.clave,
            nombre: activity.nombre,
            fraccion: activity.fraccion,
            descripcion: activity.descripcion,
          })),
          configuracion_pld_pendiente: false,
        },
      });
    } catch (error) {
      if (client && transactionStarted) {
        await client.query('ROLLBACK').catch(() => {});
        transactionStarted = false;
      }
      if (responderErrorActividadesVulnerables(res, error)) return;
      if (responderConflictoEmpresa(res, error)) return;

      console.error('Error al crear empresa:', error);
      return res.status(500).json({ error: 'Error al crear empresa' });
    } finally {
      client?.release();
    }
  }
);

// ===============================
// EDITAR EMPRESA (ADMIN)
// ===============================
router.put(
  '/empresas/:id',
  authenticate,
  authorizeRoles('admin'),
  async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'id invalido' });
    }

    let activitiesProperty;
    try {
      activitiesProperty = normalizeKeyArrayProperty(req.body);
      if (activitiesProperty.present && activitiesProperty.keys.length === 0) {
        return res.status(400).json({
          error: 'actividades_vulnerables no puede estar vacío',
        });
      }
    } catch (error) {
      if (responderErrorActividadesVulnerables(res, error)) return;
      console.error('Error al validar actividades vulnerables:', error);
      return res.status(500).json({ error: 'Error al validar actividades vulnerables' });
    }

    let client: PoolClient | null = null;
    let transactionStarted = false;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      transactionStarted = true;

      const existingResult = await client.query(
        'SELECT id, estado FROM public.empresas WHERE id = $1 LIMIT 1 FOR UPDATE',
        [id]
      );

      if (existingResult.rows.length === 0) {
        await client.query('ROLLBACK');
        transactionStarted = false;
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }

      const empresa = normalizarEmpresaBody(req.body, existingResult.rows[0].estado);
      if (!validarEmpresaBody(res, empresa)) {
        await client.query('ROLLBACK');
        transactionStarted = false;
        return;
      }

      const duplicateResult = await client.query(
        `SELECT nombre_legal, rfc
         FROM public.empresas
         WHERE id <> $1
           AND (
             LOWER(nombre_legal) = LOWER($2)
             OR ($3::text IS NOT NULL AND UPPER(rfc) = $3)
           )
         LIMIT 1`,
        [id, empresa.nombre_legal, empresa.rfc]
      );

      if (duplicateResult.rows.length > 0) {
        const duplicate = duplicateResult.rows[0];
        await client.query('ROLLBACK');
        transactionStarted = false;
        if (String(duplicate.nombre_legal).toLowerCase() === empresa.nombre_legal!.toLowerCase()) {
          return res.status(409).json({ error: 'nombre_legal ya registrado' });
        }

        return res.status(409).json({ error: 'rfc ya registrado' });
      }

      const activities = activitiesProperty.present
        ? await resolveActiveActivitiesByKeys(client, activitiesProperty.keys)
        : null;

      const result = await client.query(
        `UPDATE public.empresas
         SET nombre_legal = $1,
             rfc = $2,
             tipo_entidad = $3,
             pais = $4,
             domicilio = $5,
             estado = $6,
             entidad = $7,
             municipio = $8,
             colonia = $9,
             codigo_postal = $10,
             calle = $11,
             numero = $12,
             ciudad_delegacion = $13,
             estado_provincia = $14,
             actualizado_en = NOW()
         WHERE id = $15
         RETURNING ${EMPRESA_SELECT_FIELDS}`,
        [
          empresa.nombre_legal,
          empresa.rfc,
          empresa.tipo_entidad,
          empresa.pais,
          empresa.domicilio,
          empresa.estado,
          empresa.entidad,
          empresa.municipio,
          empresa.colonia,
          empresa.codigo_postal,
          empresa.calle,
          empresa.numero,
          empresa.ciudad_delegacion,
          empresa.estado_provincia,
          id
        ]
      );

      if (activities) {
        await reconcileCompanyActivities(client, id, activities);
      }
      const assignedActivities = await getActiveCompanyActivities(client, id);

      await client.query('COMMIT');
      transactionStarted = false;
      return res.json({
        empresa: {
          ...result.rows[0],
          actividades_vulnerables: assignedActivities.map((activity) => ({
            clave: activity.clave,
            nombre: activity.nombre,
            fraccion: activity.fraccion,
            descripcion: activity.descripcion,
          })),
          configuracion_pld_pendiente: assignedActivities.length === 0,
        },
      });
    } catch (error) {
      if (client && transactionStarted) {
        await client.query('ROLLBACK').catch(() => {});
        transactionStarted = false;
      }
      if (responderErrorActividadesVulnerables(res, error)) return;
      if (responderConflictoEmpresa(res, error)) return;

      console.error('Error al editar empresa:', error);
      return res.status(500).json({ error: 'Error al editar empresa' });
    } finally {
      client?.release();
    }
  }
);

export default router;
