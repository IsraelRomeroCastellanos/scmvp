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
  estado_editorial: 'BORRADOR' | 'VALIDADA' | 'PUBLICADA';
  activa: boolean;
  revision: number;
  procedencia: string | null;
  criterios_pt: CriterioBorrador[];
  criterios_gr: CriterioBorrador[];
  resultados_pt: ResultadoMatriz[];
  resultados_gr: ResultadoMatriz[];
};

export type ResultadoMatriz = {
  id: number;
  nombre: string;
  minimo: number;
  maximo: number;
  orden: number;
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

export type ResultadosInput = {
  revision: number;
  resultados: Array<{ nombre: string; minimo: number; maximo: number }>;
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
  | 'RESULTADOS_INVALIDOS'
  | 'MATRIZ_NO_PUBLICABLE'
  | 'MATRIZ_ACTIVA_EXISTENTE'
  | 'MATRIZ_YA_ACTIVA'
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
  RESULTADOS_INVALIDOS: 400,
  MATRIZ_NO_PUBLICABLE: 400,
  MATRIZ_ACTIVA_EXISTENTE: 409,
  MATRIZ_YA_ACTIVA: 409,
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
  RESULTADOS_INVALIDOS: 'Las bandas no cubren completamente el dominio del ambito',
  MATRIZ_NO_PUBLICABLE: 'La matriz no cumple los requisitos para publicarse',
  MATRIZ_ACTIVA_EXISTENTE: 'La empresa ya tiene otra matriz activa',
  MATRIZ_YA_ACTIVA: 'La matriz ya se encuentra activa',
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

async function loadMatrixResults(
  db: Pool | PoolClient,
  matrizId: number,
  ambito: AmbitoMatriz,
): Promise<ResultadoMatriz[]> {
  const result = await db.query(
    `SELECT id, nombre_empresarial, minimo, maximo, orden,
            minimo_incluido, maximo_incluido
     FROM public.matriz_resultado
     WHERE matriz_version_id = $1 AND ambito = $2
     ORDER BY orden`,
    [matrizId, ambito],
  );
  if (result.rows.length !== 0 && result.rows.length !== 3) {
    throw new ConfiguracionMatrizError('CONFIGURACION_INCONSISTENTE');
  }
  return result.rows.map((row, index) => {
    const minimum = normalizePositiveInteger(row.minimo);
    const maximum = normalizePositiveInteger(row.maximo);
    const order = normalizePositiveInteger(row.orden);
    if (
      order !== index + 1 || minimum > maximum ||
      row.minimo_incluido !== true || row.maximo_incluido !== true ||
      typeof row.nombre_empresarial !== 'string' || !row.nombre_empresarial.trim()
    ) {
      throw new ConfiguracionMatrizError('CONFIGURACION_INCONSISTENTE');
    }
    return {
      id: normalizePositiveInteger(row.id),
      nombre: row.nombre_empresarial,
      minimo: minimum,
      maximo: maximum,
      orden: order,
    };
  });
}

async function loadMatrixConfiguration(
  client: PoolClient,
  row: any,
): Promise<BorradorConfigurable> {
  const id = normalizePositiveInteger(row.id);
  const [criteriosPt, criteriosGr, resultadosPt, resultadosGr] = await Promise.all([
    loadDraftCriteria(client, id, 'PT'),
    loadDraftCriteria(client, id, 'GR'),
    loadMatrixResults(client, id, 'PT'),
    loadMatrixResults(client, id, 'GR'),
  ]);
  await ensureAllCriteriaAreCanonical(client, id, criteriosPt.length + criteriosGr.length);
  return {
    ...row,
    id,
    empresa_id: normalizePositiveInteger(row.empresa_id),
    numero_version: normalizePositiveInteger(row.numero_version),
    revision: normalizePositiveInteger(row.revision),
    criterios_pt: criteriosPt,
    criterios_gr: criteriosGr,
    resultados_pt: resultadosPt,
    resultados_gr: resultadosGr,
  };
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
       WHERE empresa_id = $1
         AND estado_editorial IN ('BORRADOR', 'VALIDADA')
       ORDER BY numero_version DESC
       LIMIT 1
       FOR SHARE`,
      [empresaId],
    );
    if (result.rows.length === 0) {
      throw new ConfiguracionMatrizError('BORRADOR_NO_ENCONTRADO');
    }

    const response = await loadMatrixConfiguration(client, result.rows[0]);
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
    const response = await loadMatrixConfiguration(client, header.rows[0]);

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
    const response = await loadMatrixConfiguration(client, header.rows[0]);

    await client.query('COMMIT');
    return response;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

function validateFinalBands(
  bands: Array<{ minimo: number; maximo: number }>,
  criterionCount: number,
): void {
  if (criterionCount < 1 || bands.length !== 3) {
    throw new ConfiguracionMatrizError('RESULTADOS_INVALIDOS');
  }
  if (bands[0].minimo !== criterionCount || bands[2].maximo !== criterionCount * 3) {
    throw new ConfiguracionMatrizError('RESULTADOS_INVALIDOS');
  }
  for (const [index, band] of bands.entries()) {
    if (
      !Number.isSafeInteger(band.minimo) || !Number.isSafeInteger(band.maximo) ||
      band.minimo <= 0 || band.maximo <= 0 || band.minimo > band.maximo ||
      (index > 0 && bands[index - 1].maximo + 1 !== band.minimo)
    ) {
      throw new ConfiguracionMatrizError('RESULTADOS_INVALIDOS');
    }
  }
}

async function validatePublishableMatrix(
  client: PoolClient,
  matrixRow: any,
): Promise<BorradorConfigurable> {
  if (
    matrixRow.activa !== false ||
    !['CREADA_EN_SISTEMA', 'IMPORTADA_XLSX'].includes(matrixRow.procedencia)
  ) {
    throw new ConfiguracionMatrizError('MATRIZ_NO_PUBLICABLE');
  }
  const configuration = await loadMatrixConfiguration(client, matrixRow);
  if (configuration.criterios_pt.length < 1 || configuration.criterios_gr.length < 1) {
    throw new ConfiguracionMatrizError('MATRIZ_NO_PUBLICABLE');
  }

  for (const criteria of [configuration.criterios_pt, configuration.criterios_gr]) {
    const versions = new Set<number>();
    criteria.forEach((criterion, index) => {
      if (criterion.orden !== index + 1 || versions.has(criterion.catalogo_criterio_version_id)) {
        throw new ConfiguracionMatrizError('CONFIGURACION_INCONSISTENTE');
      }
      versions.add(criterion.catalogo_criterio_version_id);
    });
  }

  const [canonicalPt, canonicalGr] = await Promise.all([
    client.query(
      `SELECT mc.id, pt.estado
       FROM public.matriz_criterio mc
       JOIN public.catalogo_criterio_pt_version ptv
         ON ptv.id = mc.catalogo_criterio_pt_version_id
       JOIN public.catalogo_criterio_pt pt ON pt.id = ptv.criterio_pt_id
       WHERE mc.matriz_version_id = $1 AND mc.ambito = 'PT'
       FOR SHARE OF pt, ptv`,
      [configuration.id],
    ),
    client.query(
      `SELECT mc.id, gr.estado
       FROM public.matriz_criterio mc
       JOIN public.catalogo_criterio_gr_version grv
         ON grv.id = mc.catalogo_criterio_gr_version_id
       JOIN public.catalogo_criterio_gr gr ON gr.id = grv.criterio_gr_id
       WHERE mc.matriz_version_id = $1 AND mc.ambito = 'GR'
       FOR SHARE OF gr, grv`,
      [configuration.id],
    ),
  ]);
  if (
    canonicalPt.rows.length !== configuration.criterios_pt.length ||
    canonicalGr.rows.length !== configuration.criterios_gr.length
  ) {
    throw new ConfiguracionMatrizError('CONFIGURACION_INCONSISTENTE');
  }
  for (const row of [...canonicalPt.rows, ...canonicalGr.rows]) {
    if (row.estado !== 'ACTIVO') {
      throw new ConfiguracionMatrizError('MATRIZ_NO_PUBLICABLE');
    }
  }

  const optionRows = await client.query(
    `SELECT mo.criterio_id, mo.codigo, mo.etiqueta, mo.orden, mo.puntaje
     FROM public.matriz_opcion mo
     JOIN public.matriz_criterio mc ON mc.id = mo.criterio_id
     WHERE mc.matriz_version_id = $1
     ORDER BY mo.criterio_id, mo.orden`,
    [configuration.id],
  );
  const rangeRows = await client.query(
    `SELECT mr.criterio_id, mr.codigo, mr.unidad, mr.minimo, mr.maximo,
            mr.minimo_incluido, mr.maximo_incluido, mr.orden, mr.puntaje
     FROM public.matriz_rango mr
     JOIN public.matriz_criterio mc ON mc.id = mr.criterio_id
     WHERE mc.matriz_version_id = $1
     ORDER BY mr.criterio_id, mr.orden`,
    [configuration.id],
  );
  const optionsByCriterion = new Map<number, any[]>();
  const rangesByCriterion = new Map<number, any[]>();
  for (const row of optionRows.rows) {
    const id = normalizePositiveInteger(row.criterio_id);
    optionsByCriterion.set(id, [...(optionsByCriterion.get(id) ?? []), row]);
  }
  for (const row of rangeRows.rows) {
    const id = normalizePositiveInteger(row.criterio_id);
    rangesByCriterion.set(id, [...(rangesByCriterion.get(id) ?? []), row]);
  }

  for (const criterion of [...configuration.criterios_pt, ...configuration.criterios_gr]) {
    const options = optionsByCriterion.get(criterion.matriz_criterio_id) ?? [];
    const ranges = rangesByCriterion.get(criterion.matriz_criterio_id) ?? [];
    if (criterion.tipo_resolucion === 'CAPTURA_OPCIONES') {
      if (options.length !== 3 || ranges.length !== 0) {
        throw new ConfiguracionMatrizError('MATRIZ_NO_PUBLICABLE');
      }
      options.forEach((option, index) => {
        if (
          option.codigo !== `OP_${index + 1}` || Number(option.orden) !== index + 1 ||
          Number(option.puntaje) !== index + 1 ||
          typeof option.etiqueta !== 'string' || !option.etiqueta.trim()
        ) {
          throw new ConfiguracionMatrizError('CONFIGURACION_INCONSISTENTE');
        }
      });
    } else if (
      criterion.tipo_resolucion === 'CAPTURA_RANGO_NUMERICO' ||
      criterion.tipo_resolucion === 'KYC_RANGO'
    ) {
      if (ranges.length !== 3 || options.length !== 0) {
        throw new ConfiguracionMatrizError('MATRIZ_NO_PUBLICABLE');
      }
      ranges.forEach((range, index) => {
        const minimum = normalizeNullableNumber(range.minimo);
        const maximum = normalizeNullableNumber(range.maximo);
        if (
          range.codigo !== `RANGO_${index + 1}` || Number(range.orden) !== index + 1 ||
          Number(range.puntaje) !== index + 1 || range.unidad !== criterion.unidad_canonica ||
          (minimum === null && index !== 0) || (maximum === null && index !== 2) ||
          (minimum === null && maximum === null) ||
          (minimum !== null && maximum !== null && minimum > maximum) ||
          (minimum !== null && maximum !== null && minimum === maximum &&
            (!range.minimo_incluido || !range.maximo_incluido)) ||
          (index > 0 && (
            ranges[index - 1].maximo === null || minimum === null ||
            Number(ranges[index - 1].maximo) > minimum ||
            (Number(ranges[index - 1].maximo) === minimum &&
              ranges[index - 1].maximo_incluido && range.minimo_incluido)
          ))
        ) {
          throw new ConfiguracionMatrizError('CONFIGURACION_INCONSISTENTE');
        }
      });
    } else if (options.length !== 0 || ranges.length !== 0) {
      throw new ConfiguracionMatrizError('CONFIGURACION_INCONSISTENTE');
    }
  }

  validateFinalBands(configuration.resultados_pt, configuration.criterios_pt.length);
  validateFinalBands(configuration.resultados_gr, configuration.criterios_gr.length);
  return configuration;
}

async function lockMatrixForMutation(
  client: PoolClient,
  empresaId: number,
  matrizId: number,
  revision: number,
): Promise<any> {
  await client.query('SELECT pg_catalog.pg_advisory_xact_lock(2205, $1)', [empresaId]);
  const company = await client.query('SELECT id FROM public.empresas WHERE id = $1', [empresaId]);
  if (company.rows.length === 0) throw new ConfiguracionMatrizError('EMPRESA_NO_ENCONTRADA');
  const matrix = await client.query(
    `SELECT id, empresa_id, numero_version, estado_editorial, activa, revision,
            procedencia, validada_por, validada_en, reporte_validacion,
            publicada_por, publicada_en
     FROM public.matriz_empresa_version
     WHERE id = $1 AND empresa_id = $2
     FOR UPDATE`,
    [matrizId, empresaId],
  );
  if (matrix.rows.length === 0) throw new ConfiguracionMatrizError('BORRADOR_NO_ENCONTRADO');
  if (normalizePositiveInteger(matrix.rows[0].revision) !== revision) {
    throw new ConfiguracionMatrizError('REVISION_DESACTUALIZADA');
  }
  return matrix.rows[0];
}

export async function saveCompanyMatrixResults(
  db: Pool,
  empresaId: number,
  matrizId: number,
  ambito: AmbitoMatriz,
  actorUsuarioId: number,
  input: ResultadosInput,
): Promise<BorradorConfigurable> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const matrix = await lockMatrixForMutation(client, empresaId, matrizId, input.revision);
    if (matrix.estado_editorial !== 'BORRADOR') {
      throw new ConfiguracionMatrizError('MATRIZ_NO_EDITABLE');
    }
    const count = await client.query<{ total: string }>(
      `SELECT pg_catalog.count(*)::text AS total
       FROM public.matriz_criterio WHERE matriz_version_id = $1 AND ambito = $2`,
      [matrizId, ambito],
    );
    const criterionCount = Number(count.rows[0].total);
    validateFinalBands(input.resultados, criterionCount);

    await client.query(
      'DELETE FROM public.matriz_resultado WHERE matriz_version_id = $1 AND ambito = $2',
      [matrizId, ambito],
    );
    for (const [index, band] of input.resultados.entries()) {
      await client.query(
        `INSERT INTO public.matriz_resultado (
           matriz_version_id, codigo, ambito, orden, nombre_empresarial,
           minimo, maximo, minimo_incluido, maximo_incluido,
           referencia_nombre_origen, referencia_rango_origen
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, TRUE, NULL, NULL)`,
        [matrizId, `${ambito}_RESULTADO_${index + 1}`, ambito, index + 1,
          band.nombre, band.minimo, band.maximo],
      );
    }
    const updated = await client.query(
      `UPDATE public.matriz_empresa_version SET revision = revision + 1
       WHERE id = $1 RETURNING id, empresa_id, numero_version, estado_editorial,
       activa, revision, procedencia`,
      [matrizId],
    );
    await client.query(
      `INSERT INTO public.matriz_auditoria_evento (
         empresa_id, matriz_version_id, actor_usuario_id, accion, operacion,
         estado_anterior, estado_nuevo, activa_anterior, activa_nueva, resumen
       ) VALUES ($1,$2,$3,'RESULTADOS_GUARDADOS','GUARDAR_RESULTADOS',
                 'BORRADOR','BORRADOR',FALSE,FALSE,$4::jsonb)`,
      [empresaId, matrizId, actorUsuarioId, JSON.stringify({
        ambito, revision_anterior: input.revision,
        revision_nueva: normalizePositiveInteger(updated.rows[0].revision),
        criterios: criterionCount, minimo_teorico: criterionCount,
        maximo_teorico: criterionCount * 3,
      })],
    );
    const response = await loadMatrixConfiguration(client, updated.rows[0]);
    await client.query('COMMIT');
    return response;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

type MatrixTransition = 'VALIDAR' | 'PUBLICAR' | 'REABRIR' | 'ACTIVAR';

export async function transitionCompanyMatrix(
  db: Pool,
  empresaId: number,
  matrizId: number,
  actorUsuarioId: number,
  revision: number,
  transition: MatrixTransition,
): Promise<BorradorConfigurable> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const matrix = await lockMatrixForMutation(client, empresaId, matrizId, revision);
    let updated;
    if (transition === 'VALIDAR') {
      if (matrix.estado_editorial !== 'BORRADOR') {
        throw new ConfiguracionMatrizError('MATRIZ_NO_EDITABLE');
      }
      const configuration = await validatePublishableMatrix(client, matrix);
      const report = {
        valida: true,
        criterios_pt: configuration.criterios_pt.length,
        criterios_gr: configuration.criterios_gr.length,
        resultados_pt: 3,
        resultados_gr: 3,
      };
      updated = await client.query(
        `UPDATE public.matriz_empresa_version
         SET estado_editorial='VALIDADA', validada_por=$2, validada_en=pg_catalog.now(),
             reporte_validacion=$3::jsonb, revision=revision+1
         WHERE id=$1 RETURNING id, empresa_id, numero_version, estado_editorial,
         activa, revision, procedencia`,
        [matrizId, actorUsuarioId, JSON.stringify(report)],
      );
      await client.query(
        `INSERT INTO public.matriz_auditoria_evento (
           empresa_id,matriz_version_id,actor_usuario_id,accion,operacion,
           estado_anterior,estado_nuevo,activa_anterior,activa_nueva,resumen
         ) VALUES ($1,$2,$3,'MATRIZ_VALIDADA','VALIDAR_MATRIZ',
                   'BORRADOR','VALIDADA',FALSE,FALSE,$4::jsonb)`,
        [empresaId, matrizId, actorUsuarioId, JSON.stringify({
          revision_anterior: revision,
          revision_nueva: normalizePositiveInteger(matrix.revision) + 1,
          ...report,
        })],
      );
    } else if (transition === 'PUBLICAR') {
      if (matrix.estado_editorial !== 'VALIDADA') {
        throw new ConfiguracionMatrizError('MATRIZ_NO_EDITABLE');
      }
      if (
        matrix.validada_por === null || matrix.validada_en === null ||
        !matrix.reporte_validacion || typeof matrix.reporte_validacion !== 'object' ||
        Array.isArray(matrix.reporte_validacion) || matrix.reporte_validacion.valida !== true
      ) {
        throw new ConfiguracionMatrizError('CONFIGURACION_INCONSISTENTE');
      }
      await validatePublishableMatrix(client, matrix);
      updated = await client.query(
        `UPDATE public.matriz_empresa_version
         SET estado_editorial='PUBLICADA', publicada_por=$2,
             publicada_en=pg_catalog.now(), revision=revision+1
         WHERE id=$1 RETURNING id, empresa_id, numero_version, estado_editorial,
         activa, revision, procedencia`,
        [matrizId, actorUsuarioId],
      );
      await client.query(
        `INSERT INTO public.matriz_auditoria_evento (
           empresa_id,matriz_version_id,actor_usuario_id,accion,operacion,
           estado_anterior,estado_nuevo,activa_anterior,activa_nueva,resumen
         ) VALUES ($1,$2,$3,'MATRIZ_PUBLICADA','PUBLICAR_MATRIZ',
                   'VALIDADA','PUBLICADA',FALSE,FALSE,$4::jsonb)`,
        [empresaId, matrizId, actorUsuarioId, JSON.stringify({
          revision_anterior: revision,
          revision_nueva: normalizePositiveInteger(matrix.revision) + 1,
        })],
      );
    } else if (transition === 'REABRIR') {
      if (matrix.estado_editorial !== 'VALIDADA' || matrix.activa !== false) {
        throw new ConfiguracionMatrizError('MATRIZ_NO_EDITABLE');
      }
      updated = await client.query(
        `UPDATE public.matriz_empresa_version
         SET estado_editorial='BORRADOR', validada_por=NULL, validada_en=NULL,
             reporte_validacion=NULL, revision=revision+1
         WHERE id=$1 RETURNING id, empresa_id, numero_version, estado_editorial,
         activa, revision, procedencia`,
        [matrizId],
      );
      await client.query(
        `INSERT INTO public.matriz_auditoria_evento (
           empresa_id,matriz_version_id,actor_usuario_id,accion,operacion,
           estado_anterior,estado_nuevo,activa_anterior,activa_nueva,resumen
         ) VALUES ($1,$2,$3,'MATRIZ_REABIERTA','REABRIR_MATRIZ',
                   'VALIDADA','BORRADOR',FALSE,FALSE,$4::jsonb)`,
        [empresaId, matrizId, actorUsuarioId, JSON.stringify({
          revision_anterior: revision,
          revision_nueva: normalizePositiveInteger(matrix.revision) + 1,
          transicion: 'VALIDADA_A_BORRADOR',
        })],
      );
    } else {
      if (matrix.estado_editorial !== 'PUBLICADA') {
        throw new ConfiguracionMatrizError('MATRIZ_NO_EDITABLE');
      }
      if (matrix.activa === true) throw new ConfiguracionMatrizError('MATRIZ_YA_ACTIVA');
      const active = await client.query(
        `SELECT id FROM public.matriz_empresa_version
         WHERE empresa_id=$1 AND activa=TRUE AND id<>$2 FOR UPDATE`,
        [empresaId, matrizId],
      );
      if (active.rows.length > 0) {
        throw new ConfiguracionMatrizError('MATRIZ_ACTIVA_EXISTENTE');
      }
      updated = await client.query(
        `UPDATE public.matriz_empresa_version
         SET activa=TRUE, activada_por=$2, activada_en=pg_catalog.now(), revision=revision+1
         WHERE id=$1 RETURNING id, empresa_id, numero_version, estado_editorial,
         activa, revision, procedencia`,
        [matrizId, actorUsuarioId],
      );
      await client.query(
        `INSERT INTO public.matriz_auditoria_evento (
           empresa_id,matriz_version_id,actor_usuario_id,accion,operacion,
           estado_anterior,estado_nuevo,activa_anterior,activa_nueva,resumen
         ) VALUES ($1,$2,$3,'MATRIZ_ACTIVADA','ACTIVAR_MATRIZ',
                   'PUBLICADA','PUBLICADA',FALSE,TRUE,$4::jsonb)`,
        [empresaId, matrizId, actorUsuarioId, JSON.stringify({
          revision_anterior: revision,
          revision_nueva: normalizePositiveInteger(matrix.revision) + 1,
        })],
      );
    }
    const response = await loadMatrixConfiguration(client, updated.rows[0]);
    await client.query('COMMIT');
    return response;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
