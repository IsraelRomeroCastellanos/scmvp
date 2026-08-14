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

export type ConfiguracionMatrizErrorCode =
  | 'AMBITO_INVALIDO'
  | 'EMPRESA_NO_ENCONTRADA'
  | 'BORRADOR_NO_ENCONTRADO'
  | 'MATRIZ_NO_EDITABLE'
  | 'REVISION_DESACTUALIZADA'
  | 'VERSION_CANONICA_NO_ENCONTRADA'
  | 'CRITERIO_NO_DISPONIBLE'
  | 'CONFIGURACION_INCONSISTENTE';

const ERROR_STATUS: Record<ConfiguracionMatrizErrorCode, number> = {
  AMBITO_INVALIDO: 400,
  EMPRESA_NO_ENCONTRADA: 404,
  BORRADOR_NO_ENCONTRADO: 404,
  MATRIZ_NO_EDITABLE: 409,
  REVISION_DESACTUALIZADA: 409,
  VERSION_CANONICA_NO_ENCONTRADA: 404,
  CRITERIO_NO_DISPONIBLE: 409,
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
  return result.rows.map((row) => ({
    ...row,
    matriz_criterio_id: normalizePositiveInteger(row.matriz_criterio_id),
    catalogo_criterio_version_id: normalizePositiveInteger(
      row.catalogo_criterio_version_id,
    ),
    orden: normalizePositiveInteger(row.orden),
  }));
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
    await client.query('DELETE FROM public.matriz_criterio WHERE matriz_version_id = $1', [
      matrizId,
    ]);

    for (const [index, item] of input.criterios_pt.entries()) {
      const catalog = ptVersions.get(item.catalogo_criterio_version_id)!;
      await client.query(
        `INSERT INTO public.matriz_criterio (
           matriz_version_id, codigo, ambito, texto, orden,
           fuente_dato, suma_perfil, catalogo_criterio_pt_version_id,
           catalogo_criterio_gr_version_id
         ) VALUES ($1, $2, 'PT', $3, $4, NULL, FALSE, $5, NULL)`,
        [matrizId, catalog.codigo, item.texto, index + 1, item.catalogo_criterio_version_id],
      );
    }
    for (const [index, item] of input.criterios_gr.entries()) {
      const catalog = grVersions.get(item.catalogo_criterio_version_id)!;
      await client.query(
        `INSERT INTO public.matriz_criterio (
           matriz_version_id, codigo, ambito, texto, orden,
           fuente_dato, suma_perfil, catalogo_criterio_pt_version_id,
           catalogo_criterio_gr_version_id
         ) VALUES ($1, $2, 'GR', $3, $4, NULL, FALSE, NULL, $5)`,
        [matrizId, catalog.codigo, item.texto, index + 1, item.catalogo_criterio_version_id],
      );
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
          criterios_pt: input.criterios_pt.length,
          criterios_gr: input.criterios_gr.length,
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
