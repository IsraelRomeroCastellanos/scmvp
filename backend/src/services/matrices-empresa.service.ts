import type { Pool, PoolClient, QueryResult } from 'pg';
import { createHash } from 'crypto';

type DbClient = Pool | PoolClient;

const CREAR_BORRADOR_OPERACION = 'CREAR_BORRADOR';
export type CrearBorradorMatrizErrorCode =
  | 'MATRIZ_EMPRESA_NO_ENCONTRADA'
  | 'MATRIZ_PENDIENTE_EXISTENTE'
  | 'MATRIZ_IDEMPOTENCIA_CONFLICTO'
  | 'MATRIZ_CONFLICTO_CONCURRENCIA'
  | 'MATRIZ_CREAR_BORRADOR_ERROR';

const ERROR_STATUS: Record<CrearBorradorMatrizErrorCode, number> = {
  MATRIZ_EMPRESA_NO_ENCONTRADA: 404,
  MATRIZ_PENDIENTE_EXISTENTE: 409,
  MATRIZ_IDEMPOTENCIA_CONFLICTO: 409,
  MATRIZ_CONFLICTO_CONCURRENCIA: 409,
  MATRIZ_CREAR_BORRADOR_ERROR: 500,
};

const ERROR_MESSAGES: Record<CrearBorradorMatrizErrorCode, string> = {
  MATRIZ_EMPRESA_NO_ENCONTRADA: 'Empresa no encontrada',
  MATRIZ_PENDIENTE_EXISTENTE: 'La empresa ya cuenta con una matriz pendiente',
  MATRIZ_IDEMPOTENCIA_CONFLICTO:
    'La Idempotency-Key ya fue utilizada con una solicitud diferente',
  MATRIZ_CONFLICTO_CONCURRENCIA:
    'No fue posible crear el borrador por un conflicto concurrente',
  MATRIZ_CREAR_BORRADOR_ERROR: 'No fue posible crear el borrador de matriz',
};

export class CrearBorradorMatrizError extends Error {
  constructor(public readonly code: CrearBorradorMatrizErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = 'CrearBorradorMatrizError';
  }

  get status(): number {
    return ERROR_STATUS[this.code];
  }
}

export type BorradorMatrizData = {
  id: number;
  empresa_id: number;
  numero_version: number;
  estado_editorial: 'BORRADOR';
  activa: false;
  revision: number;
  version_origen_id: null;
  creada_en: string;
};

export type CrearBorradorMatrizResponse = { data: BorradorMatrizData };

type BorradorMatrizDataFromDb = Omit<BorradorMatrizData, 'revision' | 'creada_en'> & {
  revision: number | string;
  creada_en: Date | string;
};

type PostgresError = Error & { code?: string; constraint?: string };

function isPostgresError(error: unknown): error is PostgresError {
  return error instanceof Error && 'code' in error;
}

export function crearBorradorRequestCanonical(
  empresaId: number,
  actorUsuarioId: number,
): string {
  return `{"operacion":"${CREAR_BORRADOR_OPERACION}","empresa_id":${empresaId},"actor_usuario_id":${actorUsuarioId}}`;
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function isConcurrencyConflict(error: unknown): boolean {
  if (!isPostgresError(error) || error.code !== '23505') return false;

  return [
    'uq_matriz_empresa_version_pendiente_empresa',
    'uq_matriz_empresa_version_empresa_numero',
    'uq_matriz_idempotencia_ambito',
  ].includes(error.constraint ?? '');
}

function normalizeBorradorMatrizData(
  data: BorradorMatrizDataFromDb,
): BorradorMatrizData {
  const revision =
    typeof data.revision === 'string' && /^[1-9]\d*$/.test(data.revision)
      ? Number(data.revision)
      : data.revision;
  if (
    typeof revision !== 'number' ||
    !Number.isSafeInteger(revision) ||
    revision <= 0
  ) {
    throw new Error('Revision de matriz invalida');
  }

  const creadaEn =
    data.creada_en instanceof Date ? data.creada_en : new Date(data.creada_en);
  if (Number.isNaN(creadaEn.getTime())) {
    throw new Error('Fecha de creacion de matriz invalida');
  }

  return {
    ...data,
    revision,
    creada_en: creadaEn.toISOString(),
  };
}

export async function createEmptyCompanyMatrixDraft(
  db: Pool,
  empresaId: number,
  actorUsuarioId: number,
  idempotencyKey: string,
): Promise<CrearBorradorMatrizResponse> {
  const keyHash = sha256Hex(idempotencyKey);
  const requestHash = sha256Hex(
    crearBorradorRequestCanonical(empresaId, actorUsuarioId),
  );
  let client: PoolClient | null = null;
  let transactionStarted = false;

  try {
    client = await db.connect();
    await client.query('BEGIN');
    transactionStarted = true;

    await client.query(
      'SELECT pg_catalog.pg_advisory_xact_lock(2205, $1)',
      [empresaId],
    );

    const company = await client.query(
      'SELECT id FROM public.empresas WHERE id = $1 LIMIT 1',
      [empresaId],
    );
    if (company.rows.length === 0) {
      throw new CrearBorradorMatrizError('MATRIZ_EMPRESA_NO_ENCONTRADA');
    }

    const idempotency = await client.query<{
      id: string;
      request_sha256: string;
      estado_ejecucion: string;
      respuesta: { data: BorradorMatrizDataFromDb } | null;
      expirada: boolean;
    }>(
      `SELECT id, request_sha256, estado_ejecucion, respuesta,
         expira_en <= pg_catalog.now() AS expirada
       FROM public.matriz_idempotencia
       WHERE empresa_id = $1
         AND actor_usuario_id = $2
         AND operacion = $3
         AND clave_sha256 = $4
       LIMIT 1`,
      [empresaId, actorUsuarioId, CREAR_BORRADOR_OPERACION, keyHash],
    );

    if (idempotency.rows.length > 0) {
      const previous = idempotency.rows[0];
      if (previous.expirada) {
        await client.query(
          `DELETE FROM public.matriz_idempotencia
           WHERE id = $1
             AND empresa_id = $2
             AND actor_usuario_id = $3
             AND operacion = $4
             AND clave_sha256 = $5`,
          [
            previous.id,
            empresaId,
            actorUsuarioId,
            CREAR_BORRADOR_OPERACION,
            keyHash,
          ],
        );
      } else {
        if (previous.request_sha256 !== requestHash) {
          throw new CrearBorradorMatrizError('MATRIZ_IDEMPOTENCIA_CONFLICTO');
        }
        if (
          previous.estado_ejecucion !== 'COMPLETADA' ||
          previous.respuesta === null
        ) {
          throw new CrearBorradorMatrizError('MATRIZ_CONFLICTO_CONCURRENCIA');
        }

        const response: CrearBorradorMatrizResponse = {
          data: normalizeBorradorMatrizData(previous.respuesta.data),
        };
        await client.query('COMMIT');
        transactionStarted = false;
        return response;
      }
    }

    await client.query(
      `INSERT INTO public.matriz_idempotencia (
         empresa_id, actor_usuario_id, operacion, clave_sha256,
         request_sha256, estado_ejecucion
       ) VALUES ($1, $2, $3, $4, $5, 'EN_PROCESO')`,
      [empresaId, actorUsuarioId, CREAR_BORRADOR_OPERACION, keyHash, requestHash],
    );

    const pending = await client.query(
      `SELECT id
       FROM public.matriz_empresa_version
       WHERE empresa_id = $1
         AND estado_editorial IN ('BORRADOR', 'VALIDADA')
       LIMIT 1`,
      [empresaId],
    );
    if (pending.rows.length > 0) {
      throw new CrearBorradorMatrizError('MATRIZ_PENDIENTE_EXISTENTE');
    }

    const nextVersion = await client.query<{ numero_version: number }>(
      `SELECT COALESCE(MAX(numero_version), 0) + 1 AS numero_version
       FROM public.matriz_empresa_version
       WHERE empresa_id = $1`,
      [empresaId],
    );

    const inserted = await client.query<BorradorMatrizDataFromDb>(
      `INSERT INTO public.matriz_empresa_version (
         empresa_id, numero_version, creada_por, procedencia
       ) VALUES ($1, $2, $3, 'CREADA_EN_SISTEMA')
       RETURNING id, empresa_id, numero_version, estado_editorial, activa,
         revision, version_origen_id, creada_en`,
      [empresaId, nextVersion.rows[0].numero_version, actorUsuarioId],
    );
    const response: CrearBorradorMatrizResponse = {
      data: normalizeBorradorMatrizData(inserted.rows[0]),
    };

    await client.query(
      `INSERT INTO public.matriz_auditoria_evento (
         empresa_id, matriz_version_id, version_origen_id, actor_usuario_id,
         accion, operacion, estado_anterior, estado_nuevo,
         activa_anterior, activa_nueva, clave_idempotencia_sha256
       ) VALUES ($1, $2, NULL, $3, 'BORRADOR_CREADO', $4, NULL, 'BORRADOR',
         NULL, FALSE, $5)`,
      [empresaId, response.data.id, actorUsuarioId, CREAR_BORRADOR_OPERACION, keyHash],
    );

    const completed = await client.query<{ id: string }>(
      `UPDATE public.matriz_idempotencia
       SET estado_ejecucion = 'COMPLETADA', codigo_http = 201,
           respuesta = $5::jsonb, matriz_version_id = $6,
           completado_en = pg_catalog.now()
       WHERE empresa_id = $1
         AND actor_usuario_id = $2
         AND operacion = $3
         AND clave_sha256 = $4
         AND estado_ejecucion = 'EN_PROCESO'
       RETURNING id`,
      [
        empresaId,
        actorUsuarioId,
        CREAR_BORRADOR_OPERACION,
        keyHash,
        JSON.stringify(response),
        response.data.id,
      ],
    );
    if (completed.rowCount !== 1) {
      throw new Error('No se completo exactamente una fila idempotente');
    }

    await client.query('COMMIT');
    transactionStarted = false;
    return response;
  } catch (error) {
    if (client && transactionStarted) {
      await client.query('ROLLBACK').catch(() => {});
      transactionStarted = false;
    }

    if (error instanceof CrearBorradorMatrizError) throw error;
    if (isConcurrencyConflict(error)) {
      throw new CrearBorradorMatrizError('MATRIZ_CONFLICTO_CONCURRENCIA');
    }
    throw new CrearBorradorMatrizError('MATRIZ_CREAR_BORRADOR_ERROR');
  } finally {
    client?.release();
  }
}

export async function hasPublishedActiveCompanyMatrix(
  db: DbClient,
  empresaId: number,
): Promise<boolean> {
  const result: QueryResult<{ has_published_active_matrix: boolean }> = await db.query(
    `SELECT EXISTS (
       SELECT 1
       FROM public.matriz_empresa_version
       WHERE empresa_id = $1
         AND estado_editorial = 'PUBLICADA'
         AND activa = TRUE
     ) AS has_published_active_matrix`,
    [empresaId],
  );

  return result.rows[0].has_published_active_matrix;
}

export async function getPublishedActiveMatrixStatusByCompanyIds(
  db: DbClient,
  empresaIds: number[],
): Promise<Map<number, boolean>> {
  const statusByCompany = new Map<number, boolean>(
    empresaIds.map((empresaId) => [empresaId, false]),
  );

  if (empresaIds.length === 0) return statusByCompany;

  const result: QueryResult<{ empresa_id: number }> = await db.query(
    `SELECT empresa_id
     FROM public.matriz_empresa_version
     WHERE empresa_id = ANY($1::int[])
       AND estado_editorial = 'PUBLICADA'
       AND activa = TRUE`,
    [empresaIds],
  );

  for (const row of result.rows) {
    statusByCompany.set(row.empresa_id, true);
  }

  return statusByCompany;
}
