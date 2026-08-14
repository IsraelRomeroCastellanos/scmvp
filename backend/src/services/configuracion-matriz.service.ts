import type { Pool, PoolClient } from 'pg';

export type AmbitoMatriz = 'PT' | 'GR';

export type CriterioCatalogoSeleccionable = {
  id: number;
  codigo: string;
  nombre_visible_global: string;
  ambito: AmbitoMatriz;
  version_vigente_id: number;
  version_contrato: number;
  tipo_resolucion: string;
  parametrizacion: string;
  unidad_canonica: string | null;
};

export type CriterioBorrador = {
  matriz_criterio_id: number;
  catalogo_criterio_version_id: number;
  codigo: string;
  texto: string;
  orden: number;
  tipo_resolucion: string;
  parametrizacion: string;
  unidad_canonica: string | null;
  opciones: OpcionBorrador[];
  rangos: RangoBorrador[];
};

export type OpcionBorrador = {
  id: number;
  etiqueta: string;
  orden: number;
  puntaje: 1 | 2 | 3;
};

export type RangoBorrador = {
  id: number;
  minimo: number | null;
  maximo: number | null;
  incluye_minimo: boolean;
  incluye_maximo: boolean;
  unidad: string;
  orden: number;
  puntaje: 1 | 2 | 3;
};

export type BorradorConfigurable = {
  id: number;
  empresa_id: number;
  numero_version: number;
  estado_editorial: string;
  activa: boolean;
  revision: number;
  procedencia: string | null;
  criterios_pt: CriterioBorrador[];
  criterios_gr: CriterioBorrador[];
};

export type CriterioComposicionInput = {
  catalogo_criterio_version_id: number;
  texto: string;
};

export type ReemplazarComposicionInput = {
  revision: number;
  criterios_pt: CriterioComposicionInput[];
  criterios_gr: CriterioComposicionInput[];
};

export type ParametrizacionInput =
  | { revision: number; tipo: 'OPCIONES'; opciones: Array<{ etiqueta: string }> }
  | {
      revision: number;
      tipo: 'RANGOS';
      rangos: Array<{
        minimo: number | null;
        maximo: number | null;
        incluye_minimo: boolean;
        incluye_maximo: boolean;
      }>;
    };

export type ConfiguracionMatrizErrorCode =
  | 'AMBITO_INVALIDO'
  | 'EMPRESA_NO_ENCONTRADA'
  | 'BORRADOR_NO_ENCONTRADO'
  | 'MATRIZ_NO_EDITABLE'
  | 'REVISION_DESACTUALIZADA'
  | 'VERSION_CANONICA_NO_ENCONTRADA'
  | 'CRITERIO_NO_DISPONIBLE'
  | 'CRITERIO_NO_ENCONTRADO'
  | 'PARAMETRIZACION_NO_PERMITIDA'
  | 'UNIDAD_CANONICA_INCOMPATIBLE'
  | 'CONFIGURACION_INCONSISTENTE';

const ERROR_STATUS: Record<ConfiguracionMatrizErrorCode, number> = {
  AMBITO_INVALIDO: 400,
  EMPRESA_NO_ENCONTRADA: 404,
  BORRADOR_NO_ENCONTRADO: 404,
  MATRIZ_NO_EDITABLE: 409,
  REVISION_DESACTUALIZADA: 409,
  VERSION_CANONICA_NO_ENCONTRADA: 404,
  CRITERIO_NO_DISPONIBLE: 409,
  CRITERIO_NO_ENCONTRADO: 404,
  PARAMETRIZACION_NO_PERMITIDA: 409,
  UNIDAD_CANONICA_INCOMPATIBLE: 409,
  CONFIGURACION_INCONSISTENTE: 409,
};

const ERROR_MESSAGE: Record<ConfiguracionMatrizErrorCode, string> = {
  AMBITO_INVALIDO: 'Ambito de matriz invalido',
  EMPRESA_NO_ENCONTRADA: 'Empresa no encontrada',
  BORRADOR_NO_ENCONTRADO: 'Borrador de matriz no encontrado',
  MATRIZ_NO_EDITABLE: 'La matriz ya no se encuentra en estado BORRADOR',
  REVISION_DESACTUALIZADA: 'La matriz fue modificada por otro usuario',
  VERSION_CANONICA_NO_ENCONTRADA: 'Una version canonica no existe',
  CRITERIO_NO_DISPONIBLE: 'Un criterio seleccionado ya no esta disponible',
  CRITERIO_NO_ENCONTRADO: 'Criterio de matriz no encontrado',
  PARAMETRIZACION_NO_PERMITIDA: 'El criterio no admite esta parametrizacion',
  UNIDAD_CANONICA_INCOMPATIBLE: 'La unidad canonica no es compatible con los rangos',
  CONFIGURACION_INCONSISTENTE: 'La composicion almacenada no es valida',
};

export class ConfiguracionMatrizError extends Error {
  constructor(public readonly code: ConfiguracionMatrizErrorCode) {
    super(ERROR_MESSAGE[code]);
    this.name = 'ConfiguracionMatrizError';
  }

  get status(): number {
    return ERROR_STATUS[this.code];
  }
}

function normalizePositiveInteger(value: number | string): number {
  const normalized = typeof value === 'string' && /^[1-9]\d*$/.test(value)
    ? Number(value)
    : value;
  if (!Number.isSafeInteger(normalized) || Number(normalized) <= 0) {
    throw new ConfiguracionMatrizError('CONFIGURACION_INCONSISTENTE');
  }
  return Number(normalized);
}

function normalizeScore(value: number | string): 1 | 2 | 3 {
  const score = Number(value);
  if (score !== 1 && score !== 2 && score !== 3) {
    throw new ConfiguracionMatrizError('CONFIGURACION_INCONSISTENTE');
  }
  return score;
}

function normalizeNullableNumber(value: number | string | null): number | null {
  if (value === null) return null;
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    throw new ConfiguracionMatrizError('CONFIGURACION_INCONSISTENTE');
  }
  return normalized;
}

export async function listSelectableMatrixCriteria(
  db: Pool,
  ambito: AmbitoMatriz,
): Promise<CriterioCatalogoSeleccionable[]> {
  if (ambito === 'PT') {
    const result = await db.query(
      `SELECT c.id, c.codigo_canonico AS codigo, c.nombre_visible_global,
              'PT'::text AS ambito, v.id AS version_vigente_id,
              v.version_contrato, v.tipo_resolucion,
              v.tipo_parametrizacion AS parametrizacion, v.unidad_canonica
       FROM public.catalogo_criterio_pt c
       JOIN public.catalogo_criterio_pt_version v
         ON v.id = c.version_vigente_id AND v.criterio_pt_id = c.id
       WHERE c.estado = 'ACTIVO'
         AND c.version_vigente_id IS NOT NULL
       ORDER BY c.nombre_visible_global, c.codigo_canonico`,
    );
    return result.rows.map((row) => ({
      ...row,
      id: normalizePositiveInteger(row.id),
      version_vigente_id: normalizePositiveInteger(row.version_vigente_id),
      version_contrato: normalizePositiveInteger(row.version_contrato),
    }));
  }

  const result = await db.query(
    `SELECT c.id, c.codigo_canonico AS codigo, c.nombre_visible_global,
            'GR'::text AS ambito, v.id AS version_vigente_id,
            v.version_contrato, v.tipo_resolucion,
            v.tipo_parametrizacion AS parametrizacion, v.unidad_canonica
     FROM public.catalogo_criterio_gr c
     JOIN public.catalogo_criterio_gr_version v
       ON v.id = c.version_vigente_id AND v.criterio_gr_id = c.id
     WHERE c.estado = 'ACTIVO'
       AND c.version_vigente_id IS NOT NULL
     ORDER BY c.nombre_visible_global, c.codigo_canonico`,
  );
  return result.rows.map((row) => ({
    ...row,
    id: normalizePositiveInteger(row.id),
    version_vigente_id: normalizePositiveInteger(row.version_vigente_id),
    version_contrato: normalizePositiveInteger(row.version_contrato),
  }));
}

async function loadDraftCriteria(
  db: Pool | PoolClient,
  matrizId: number,
  ambito: AmbitoMatriz,
): Promise<CriterioBorrador[]> {
  const isPt = ambito === 'PT';
  const result = await db.query(
    isPt
      ? `SELECT mc.id AS matriz_criterio_id,
                mc.catalogo_criterio_pt_version_id AS catalogo_criterio_version_id,
                c.codigo_canonico AS codigo, mc.texto, mc.orden,
                v.tipo_resolucion, v.tipo_parametrizacion AS parametrizacion,
                v.unidad_canonica
         FROM public.matriz_criterio mc
         JOIN public.catalogo_criterio_pt_version v
           ON v.id = mc.catalogo_criterio_pt_version_id
         JOIN public.catalogo_criterio_pt c ON c.id = v.criterio_pt_id
         WHERE mc.matriz_version_id = $1 AND mc.ambito = 'PT'
         ORDER BY mc.orden`
      : `SELECT mc.id AS matriz_criterio_id,
                mc.catalogo_criterio_gr_version_id AS catalogo_criterio_version_id,
                c.codigo_canonico AS codigo, mc.texto, mc.orden,
                v.tipo_resolucion, v.tipo_parametrizacion AS parametrizacion,
                v.unidad_canonica
         FROM public.matriz_criterio mc
         JOIN public.catalogo_criterio_gr_version v
           ON v.id = mc.catalogo_criterio_gr_version_id
         JOIN public.catalogo_criterio_gr c ON c.id = v.criterio_gr_id
         WHERE mc.matriz_version_id = $1 AND mc.ambito = 'GR'
         ORDER BY mc.orden`,
    [matrizId],
  );
  const criterioIds = result.rows.map((row) => normalizePositiveInteger(row.matriz_criterio_id));
  if (criterioIds.length === 0) return [];

  const [optionsResult, rangesResult] = await Promise.all([
    db.query(
      `SELECT id, criterio_id, etiqueta, orden, puntaje
       FROM public.matriz_opcion
       WHERE criterio_id = ANY($1::integer[])
       ORDER BY criterio_id, orden`,
      [criterioIds],
    ),
    db.query(
      `SELECT id, criterio_id, minimo, maximo,
              minimo_incluido AS incluye_minimo,
              maximo_incluido AS incluye_maximo,
              unidad, orden, puntaje
       FROM public.matriz_rango
       WHERE criterio_id = ANY($1::integer[])
       ORDER BY criterio_id, orden`,
      [criterioIds],
    ),
  ]);
  const optionsByCriterion = new Map<number, OpcionBorrador[]>();
  for (const option of optionsResult.rows) {
    const criterionId = normalizePositiveInteger(option.criterio_id);
    const options = optionsByCriterion.get(criterionId) ?? [];
    options.push({
      id: normalizePositiveInteger(option.id),
      etiqueta: option.etiqueta,
      orden: normalizePositiveInteger(option.orden),
      puntaje: normalizeScore(option.puntaje),
    });
    optionsByCriterion.set(criterionId, options);
  }
  const rangesByCriterion = new Map<number, RangoBorrador[]>();
  for (const range of rangesResult.rows) {
    const criterionId = normalizePositiveInteger(range.criterio_id);
    const ranges = rangesByCriterion.get(criterionId) ?? [];
    ranges.push({
      id: normalizePositiveInteger(range.id),
      minimo: normalizeNullableNumber(range.minimo),
      maximo: normalizeNullableNumber(range.maximo),
      incluye_minimo: range.incluye_minimo,
      incluye_maximo: range.incluye_maximo,
      unidad: range.unidad,
      orden: normalizePositiveInteger(range.orden),
      puntaje: normalizeScore(range.puntaje),
    });
    rangesByCriterion.set(criterionId, ranges);
  }

  return result.rows.map((row) => {
    const criterionId = normalizePositiveInteger(row.matriz_criterio_id);
    const options = optionsByCriterion.get(criterionId) ?? [];
    const ranges = rangesByCriterion.get(criterionId) ?? [];
    const isOptionsCriterion =
      ambito === 'PT' &&
      row.tipo_resolucion === 'CAPTURA_OPCIONES' &&
      row.parametrizacion === 'OPCIONES';
    const isRangeCriterion =
      ((ambito === 'PT' && row.tipo_resolucion === 'CAPTURA_RANGO_NUMERICO') ||
        (ambito === 'GR' && row.tipo_resolucion === 'KYC_RANGO')) &&
      row.parametrizacion === 'RANGOS_NUMERICOS';
    const isAutomaticCriterion =
      ambito === 'GR' &&
      ['CATALOGO_GLOBAL', 'DERIVADO', 'ESTRUCTURADO'].includes(row.tipo_resolucion) &&
      row.parametrizacion === 'NINGUNA';

    if (
      (!isOptionsCriterion && !isRangeCriterion && !isAutomaticCriterion) ||
      (isOptionsCriterion && ranges.length > 0) ||
      (isRangeCriterion && options.length > 0) ||
      (isAutomaticCriterion && (options.length > 0 || ranges.length > 0))
    ) {
      throw new ConfiguracionMatrizError('CONFIGURACION_INCONSISTENTE');
    }

    return {
      ...row,
      matriz_criterio_id: criterionId,
      catalogo_criterio_version_id: normalizePositiveInteger(
        row.catalogo_criterio_version_id,
      ),
      orden: normalizePositiveInteger(row.orden),
      opciones: options,
      rangos: ranges,
    };
  });
}

async function ensureAllCriteriaAreCanonical(
  db: Pool | PoolClient,
  matrizId: number,
  expectedCount: number,
): Promise<void> {
  const result = await db.query<{ total: string }>(
    `SELECT pg_catalog.count(*)::text AS total
     FROM public.matriz_criterio
     WHERE matriz_version_id = $1`,
    [matrizId],
  );
  if (Number(result.rows[0].total) !== expectedCount) {
    throw new ConfiguracionMatrizError('CONFIGURACION_INCONSISTENTE');
  }
}

export async function getEditableCompanyMatrixDraft(
  db: Pool,
  empresaId: number,
): Promise<BorradorConfigurable> {
  const client = await db.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');

    const company = await client.query(
      'SELECT id FROM public.empresas WHERE id = $1 LIMIT 1',
      [empresaId],
    );
    if (company.rows.length === 0) {
      throw new ConfiguracionMatrizError('EMPRESA_NO_ENCONTRADA');
    }

    const result = await client.query(
      `SELECT id, empresa_id, numero_version, estado_editorial, activa,
              revision, procedencia
       FROM public.matriz_empresa_version
       WHERE empresa_id = $1 AND estado_editorial = 'BORRADOR'
       LIMIT 1
       FOR SHARE`,
      [empresaId],
    );
    if (result.rows.length === 0) {
      throw new ConfiguracionMatrizError('BORRADOR_NO_ENCONTRADO');
    }

    const row = result.rows[0];
    const id = normalizePositiveInteger(row.id);
    const criteriosPt = await loadDraftCriteria(client, id, 'PT');
    const criteriosGr = await loadDraftCriteria(client, id, 'GR');
    await ensureAllCriteriaAreCanonical(
      client,
      id,
      criteriosPt.length + criteriosGr.length,
    );

    const response: BorradorConfigurable = {
      ...row,
      id,
      empresa_id: normalizePositiveInteger(row.empresa_id),
      numero_version: normalizePositiveInteger(row.numero_version),
      revision: normalizePositiveInteger(row.revision),
      criterios_pt: criteriosPt,
      criterios_gr: criteriosGr,
    };
    await client.query('COMMIT');
    return response;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function resolveSelectableVersions(
  client: PoolClient,
  ambito: AmbitoMatriz,
  ids: number[],
): Promise<Map<number, { codigo: string; nombre: string }>> {
  if (ids.length === 0) return new Map();
  const result = await client.query(
    ambito === 'PT'
      ? `SELECT v.id, c.codigo_canonico AS codigo,
                c.nombre_visible_global AS nombre, c.estado,
                c.version_vigente_id
         FROM public.catalogo_criterio_pt_version v
         JOIN public.catalogo_criterio_pt c
           ON c.id = v.criterio_pt_id
         WHERE v.id = ANY($1::integer[])
         FOR SHARE OF c, v`
      : `SELECT v.id, c.codigo_canonico AS codigo,
                c.nombre_visible_global AS nombre, c.estado,
                c.version_vigente_id
         FROM public.catalogo_criterio_gr_version v
         JOIN public.catalogo_criterio_gr c
           ON c.id = v.criterio_gr_id
         WHERE v.id = ANY($1::integer[])
         FOR SHARE OF c, v`,
    [ids],
  );
  if (result.rows.length !== ids.length) {
    throw new ConfiguracionMatrizError('VERSION_CANONICA_NO_ENCONTRADA');
  }
  if (
    result.rows.some(
      (row) => row.estado !== 'ACTIVO' || Number(row.version_vigente_id) !== Number(row.id),
    )
  ) {
    throw new ConfiguracionMatrizError('CRITERIO_NO_DISPONIBLE');
  }
  return new Map(
    result.rows.map((row) => [normalizePositiveInteger(row.id), {
      codigo: row.codigo,
      nombre: row.nombre,
    }]),
  );
}

export async function replaceCompanyMatrixDraftComposition(
  db: Pool,
  empresaId: number,
  matrizId: number,
  actorUsuarioId: number,
  input: ReemplazarComposicionInput,
): Promise<BorradorConfigurable> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_catalog.pg_advisory_xact_lock(2205, $1)', [empresaId]);

    const company = await client.query(
      'SELECT id FROM public.empresas WHERE id = $1 LIMIT 1',
      [empresaId],
    );
    if (company.rows.length === 0) {
      throw new ConfiguracionMatrizError('EMPRESA_NO_ENCONTRADA');
    }

    const matrix = await client.query(
      `SELECT id, estado_editorial, revision
       FROM public.matriz_empresa_version
       WHERE id = $1 AND empresa_id = $2
       FOR UPDATE`,
      [matrizId, empresaId],
    );
    if (matrix.rows.length === 0) {
      throw new ConfiguracionMatrizError('BORRADOR_NO_ENCONTRADO');
    }
    if (matrix.rows[0].estado_editorial !== 'BORRADOR') {
      throw new ConfiguracionMatrizError('MATRIZ_NO_EDITABLE');
    }
    if (normalizePositiveInteger(matrix.rows[0].revision) !== input.revision) {
      throw new ConfiguracionMatrizError('REVISION_DESACTUALIZADA');
    }

    const ptIds = input.criterios_pt.map((item) => item.catalogo_criterio_version_id);
    const grIds = input.criterios_gr.map((item) => item.catalogo_criterio_version_id);
    const [ptVersions, grVersions] = await Promise.all([
      resolveSelectableVersions(client, 'PT', ptIds),
      resolveSelectableVersions(client, 'GR', grIds),
    ]);

    const existingResult = await client.query(
      `SELECT id, ambito, orden, catalogo_criterio_pt_version_id,
              catalogo_criterio_gr_version_id
       FROM public.matriz_criterio
       WHERE matriz_version_id = $1
       ORDER BY ambito, orden
       FOR UPDATE`,
      [matrizId],
    );
    const existingByVersion = new Map<string, { id: number; orden: number }>();
    for (const row of existingResult.rows) {
      const versionId = row.ambito === 'PT'
        ? row.catalogo_criterio_pt_version_id
        : row.ambito === 'GR'
          ? row.catalogo_criterio_gr_version_id
          : null;
      if (versionId === null) {
        throw new ConfiguracionMatrizError('CONFIGURACION_INCONSISTENTE');
      }
      const key = `${row.ambito}:${normalizePositiveInteger(versionId)}`;
      if (existingByVersion.has(key)) {
        throw new ConfiguracionMatrizError('CONFIGURACION_INCONSISTENTE');
      }
      existingByVersion.set(key, {
        id: normalizePositiveInteger(row.id),
        orden: normalizePositiveInteger(row.orden),
      });
    }

    const selectedKeys = new Set([
      ...ptIds.map((id) => `PT:${id}`),
      ...grIds.map((id) => `GR:${id}`),
    ]);
    const removedIds = [...existingByVersion.entries()]
      .filter(([key]) => !selectedKeys.has(key))
      .map(([, value]) => value.id);
    if (removedIds.length > 0) {
      await client.query(
        `DELETE FROM public.matriz_criterio
         WHERE matriz_version_id = $1 AND id = ANY($2::integer[])`,
        [matrizId, removedIds],
      );
    }

    const maxOrder = existingResult.rows.reduce(
      (maximum, row) => Math.max(maximum, normalizePositiveInteger(row.orden)),
      0,
    );
    const temporaryOffset = maxOrder + ptIds.length + grIds.length + 1;
    if (maxOrder + temporaryOffset > 2147483647) {
      throw new ConfiguracionMatrizError('CONFIGURACION_INCONSISTENTE');
    }
    if (existingResult.rows.length > removedIds.length) {
      await client.query(
        `UPDATE public.matriz_criterio
         SET orden = orden + $2
         WHERE matriz_version_id = $1`,
        [matrizId, temporaryOffset],
      );
    }

    for (const [index, item] of input.criterios_pt.entries()) {
      const catalog = ptVersions.get(item.catalogo_criterio_version_id)!;
      const existing = existingByVersion.get(`PT:${item.catalogo_criterio_version_id}`);
      if (existing) {
        await client.query(
          `UPDATE public.matriz_criterio
           SET texto = $1, orden = $2
           WHERE id = $3 AND matriz_version_id = $4`,
          [item.texto, index + 1, existing.id, matrizId],
        );
      } else {
        await client.query(
          `INSERT INTO public.matriz_criterio (
             matriz_version_id, codigo, ambito, texto, orden,
             fuente_dato, suma_perfil, catalogo_criterio_pt_version_id,
             catalogo_criterio_gr_version_id
           ) VALUES ($1, $2, 'PT', $3, $4, NULL, FALSE, $5, NULL)`,
          [matrizId, catalog.codigo, item.texto, index + 1, item.catalogo_criterio_version_id],
        );
      }
    }
    for (const [index, item] of input.criterios_gr.entries()) {
      const catalog = grVersions.get(item.catalogo_criterio_version_id)!;
      const existing = existingByVersion.get(`GR:${item.catalogo_criterio_version_id}`);
      if (existing) {
        await client.query(
          `UPDATE public.matriz_criterio
           SET texto = $1, orden = $2
           WHERE id = $3 AND matriz_version_id = $4`,
          [item.texto, index + 1, existing.id, matrizId],
        );
      } else {
        await client.query(
          `INSERT INTO public.matriz_criterio (
             matriz_version_id, codigo, ambito, texto, orden,
             fuente_dato, suma_perfil, catalogo_criterio_pt_version_id,
             catalogo_criterio_gr_version_id
           ) VALUES ($1, $2, 'GR', $3, $4, NULL, FALSE, NULL, $5)`,
          [matrizId, catalog.codigo, item.texto, index + 1, item.catalogo_criterio_version_id],
        );
      }
    }

    const updated = await client.query<{ revision: string }>(
      `UPDATE public.matriz_empresa_version
       SET revision = revision + 1
       WHERE id = $1 AND empresa_id = $2 AND estado_editorial = 'BORRADOR'
       RETURNING revision::text`,
      [matrizId, empresaId],
    );
    if (updated.rowCount !== 1) {
      throw new ConfiguracionMatrizError('MATRIZ_NO_EDITABLE');
    }

    await client.query(
      `INSERT INTO public.matriz_auditoria_evento (
         empresa_id, matriz_version_id, actor_usuario_id,
         accion, operacion, estado_anterior, estado_nuevo,
         activa_anterior, activa_nueva, resumen
       ) VALUES ($1, $2, $3, 'COMPOSICION_GUARDADA', 'GUARDAR_COMPOSICION',
                 'BORRADOR', 'BORRADOR', FALSE, FALSE, $4::jsonb)`,
      [
        empresaId,
        matrizId,
        actorUsuarioId,
        JSON.stringify({
          revision_anterior: input.revision,
          revision_nueva: normalizePositiveInteger(updated.rows[0].revision),
          criterios_pt_antes: existingResult.rows.filter((row) => row.ambito === 'PT').length,
          criterios_gr_antes: existingResult.rows.filter((row) => row.ambito === 'GR').length,
          criterios_pt: input.criterios_pt.length,
          criterios_gr: input.criterios_gr.length,
          cantidad_eliminados: removedIds.length,
        }),
      ],
    );

    const header = await client.query(
      `SELECT id, empresa_id, numero_version, estado_editorial, activa,
              revision, procedencia
       FROM public.matriz_empresa_version
       WHERE id = $1 AND empresa_id = $2`,
      [matrizId, empresaId],
    );
    const [criteriosPt, criteriosGr] = await Promise.all([
      loadDraftCriteria(client, matrizId, 'PT'),
      loadDraftCriteria(client, matrizId, 'GR'),
    ]);
    const row = header.rows[0];
    const response: BorradorConfigurable = {
      ...row,
      id: normalizePositiveInteger(row.id),
      empresa_id: normalizePositiveInteger(row.empresa_id),
      numero_version: normalizePositiveInteger(row.numero_version),
      revision: normalizePositiveInteger(row.revision),
      criterios_pt: criteriosPt,
      criterios_gr: criteriosGr,
    };

    await client.query('COMMIT');
    return response;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

const RANGE_UNITS = new Set([
  'EDAD_ANIOS',
  'ANTIGUEDAD_MESES',
  'MONTO',
  'PUNTAJE',
  'OTRA',
]);

export async function saveCompanyMatrixCriterionParameters(
  db: Pool,
  empresaId: number,
  matrizId: number,
  criterioId: number,
  actorUsuarioId: number,
  input: ParametrizacionInput,
): Promise<BorradorConfigurable> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_catalog.pg_advisory_xact_lock(2205, $1)', [empresaId]);

    const company = await client.query(
      'SELECT id FROM public.empresas WHERE id = $1 LIMIT 1',
      [empresaId],
    );
    if (company.rows.length === 0) {
      throw new ConfiguracionMatrizError('EMPRESA_NO_ENCONTRADA');
    }

    const matrix = await client.query(
      `SELECT id, estado_editorial, revision
       FROM public.matriz_empresa_version
       WHERE id = $1 AND empresa_id = $2
       FOR UPDATE`,
      [matrizId, empresaId],
    );
    if (matrix.rows.length === 0) {
      throw new ConfiguracionMatrizError('BORRADOR_NO_ENCONTRADO');
    }
    if (matrix.rows[0].estado_editorial !== 'BORRADOR') {
      throw new ConfiguracionMatrizError('MATRIZ_NO_EDITABLE');
    }
    if (normalizePositiveInteger(matrix.rows[0].revision) !== input.revision) {
      throw new ConfiguracionMatrizError('REVISION_DESACTUALIZADA');
    }

    const criterion = await client.query(
      `SELECT id, ambito, catalogo_criterio_pt_version_id,
              catalogo_criterio_gr_version_id
       FROM public.matriz_criterio
       WHERE id = $1 AND matriz_version_id = $2
       FOR UPDATE`,
      [criterioId, matrizId],
    );
    if (criterion.rows.length === 0) {
      throw new ConfiguracionMatrizError('CRITERIO_NO_ENCONTRADO');
    }

    const criterionRow = criterion.rows[0];
    const isPt = criterionRow.ambito === 'PT';
    const versionId = isPt
      ? criterionRow.catalogo_criterio_pt_version_id
      : criterionRow.ambito === 'GR'
        ? criterionRow.catalogo_criterio_gr_version_id
        : null;
    if (versionId === null) {
      throw new ConfiguracionMatrizError('CONFIGURACION_INCONSISTENTE');
    }

    const contract = await client.query(
      isPt
        ? `SELECT v.tipo_resolucion, v.tipo_parametrizacion, v.unidad_canonica,
                  c.estado, c.version_vigente_id
           FROM public.catalogo_criterio_pt_version v
           JOIN public.catalogo_criterio_pt c ON c.id = v.criterio_pt_id
           WHERE v.id = $1
           FOR SHARE OF c, v`
        : `SELECT v.tipo_resolucion, v.tipo_parametrizacion, v.unidad_canonica,
                  c.estado, c.version_vigente_id
           FROM public.catalogo_criterio_gr_version v
           JOIN public.catalogo_criterio_gr c ON c.id = v.criterio_gr_id
           WHERE v.id = $1
           FOR SHARE OF c, v`,
      [versionId],
    );
    if (contract.rows.length === 0) {
      throw new ConfiguracionMatrizError('VERSION_CANONICA_NO_ENCONTRADA');
    }
    const contractRow = contract.rows[0];
    if (
      contractRow.estado !== 'ACTIVO' ||
      Number(contractRow.version_vigente_id) !== Number(versionId)
    ) {
      throw new ConfiguracionMatrizError('CRITERIO_NO_DISPONIBLE');
    }

    const expectsOptions = isPt && contractRow.tipo_resolucion === 'CAPTURA_OPCIONES';
    const expectsRanges =
      (isPt && contractRow.tipo_resolucion === 'CAPTURA_RANGO_NUMERICO') ||
      (!isPt && contractRow.tipo_resolucion === 'KYC_RANGO');
    if (
      (input.tipo === 'OPCIONES' && !expectsOptions) ||
      (input.tipo === 'RANGOS' && !expectsRanges)
    ) {
      throw new ConfiguracionMatrizError('PARAMETRIZACION_NO_PERMITIDA');
    }

    const incompatibleChildren = await client.query<{ total: string }>(
      input.tipo === 'OPCIONES'
        ? `SELECT pg_catalog.count(*)::text AS total
           FROM public.matriz_rango WHERE criterio_id = $1`
        : `SELECT pg_catalog.count(*)::text AS total
           FROM public.matriz_opcion WHERE criterio_id = $1`,
      [criterioId],
    );
    if (Number(incompatibleChildren.rows[0].total) !== 0) {
      throw new ConfiguracionMatrizError('CONFIGURACION_INCONSISTENTE');
    }

    if (input.tipo === 'OPCIONES') {
      await client.query('DELETE FROM public.matriz_opcion WHERE criterio_id = $1', [criterioId]);
      for (const [index, option] of input.opciones.entries()) {
        await client.query(
          `INSERT INTO public.matriz_opcion (
             criterio_id, codigo, etiqueta, puntaje, orden, referencia_origen
           ) VALUES ($1, $2, $3, $4, $4, NULL)`,
          [criterioId, `OP_${index + 1}`, option.etiqueta, index + 1],
        );
      }
    } else {
      const unit = contractRow.unidad_canonica;
      if (typeof unit !== 'string' || !RANGE_UNITS.has(unit)) {
        throw new ConfiguracionMatrizError('UNIDAD_CANONICA_INCOMPATIBLE');
      }
      await client.query('DELETE FROM public.matriz_rango WHERE criterio_id = $1', [criterioId]);
      for (const [index, range] of input.rangos.entries()) {
        await client.query(
          `INSERT INTO public.matriz_rango (
             criterio_id, codigo, unidad, minimo, maximo,
             minimo_incluido, maximo_incluido, puntaje,
             resultado_codigo, orden, referencia_origen
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, $8, NULL)`,
          [
            criterioId,
            `RANGO_${index + 1}`,
            unit,
            range.minimo,
            range.maximo,
            range.incluye_minimo,
            range.incluye_maximo,
            index + 1,
          ],
        );
      }
    }

    const updated = await client.query<{ revision: string }>(
      `UPDATE public.matriz_empresa_version
       SET revision = revision + 1
       WHERE id = $1 AND empresa_id = $2 AND estado_editorial = 'BORRADOR'
       RETURNING revision::text`,
      [matrizId, empresaId],
    );
    if (updated.rowCount !== 1) {
      throw new ConfiguracionMatrizError('MATRIZ_NO_EDITABLE');
    }
    const newRevision = normalizePositiveInteger(updated.rows[0].revision);

    await client.query(
      `INSERT INTO public.matriz_auditoria_evento (
         empresa_id, matriz_version_id, actor_usuario_id,
         accion, operacion, estado_anterior, estado_nuevo,
         activa_anterior, activa_nueva, resumen
       ) VALUES ($1, $2, $3, 'PARAMETRIZACION_GUARDADA',
                 'GUARDAR_PARAMETRIZACION', 'BORRADOR', 'BORRADOR',
                 FALSE, FALSE, $4::jsonb)`,
      [
        empresaId,
        matrizId,
        actorUsuarioId,
        JSON.stringify({
          criterio_id: criterioId,
          ambito: criterionRow.ambito,
          revision_anterior: input.revision,
          revision_nueva: newRevision,
          tipo_parametrizacion: input.tipo,
        }),
      ],
    );

    const header = await client.query(
      `SELECT id, empresa_id, numero_version, estado_editorial, activa,
              revision, procedencia
       FROM public.matriz_empresa_version
       WHERE id = $1 AND empresa_id = $2`,
      [matrizId, empresaId],
    );
    const criteriosPt = await loadDraftCriteria(client, matrizId, 'PT');
    const criteriosGr = await loadDraftCriteria(client, matrizId, 'GR');
    const row = header.rows[0];
    const response: BorradorConfigurable = {
      ...row,
      id: normalizePositiveInteger(row.id),
      empresa_id: normalizePositiveInteger(row.empresa_id),
      numero_version: normalizePositiveInteger(row.numero_version),
      revision: normalizePositiveInteger(row.revision),
      criterios_pt: criteriosPt,
      criterios_gr: criteriosGr,
    };

    await client.query('COMMIT');
    return response;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
