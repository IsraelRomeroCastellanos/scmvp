import type { Pool, PoolClient, QueryResult } from 'pg';
import { createHash } from 'crypto';

type DbClient = Pool | PoolClient;

const CREAR_BORRADOR_OPERACION = 'CREAR_BORRADOR';
const NUEVA_DESDE_HISTORICA_OPERACION = 'NUEVA_DESDE_HISTORICA';
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

export type NuevaVersionHistoricaData = Omit<BorradorMatrizData, 'version_origen_id'> & {
  version_origen_id: number;
};

export type NuevaVersionHistoricaResponse = { data: NuevaVersionHistoricaData };

export type MatrizPublicadaFuente = {
  id: number;
  numero_version: number;
  revision: number;
  activa: boolean;
};

export type NuevaVersionHistoricaErrorCode =
  | 'MATRIZ_EMPRESA_NO_ENCONTRADA'
  | 'MATRIZ_ORIGEN_NO_ENCONTRADA'
  | 'MATRIZ_ORIGEN_NO_PUBLICADA'
  | 'MATRIZ_PENDIENTE_EXISTENTE'
  | 'MATRIZ_PRECONDICION_REQUERIDA'
  | 'MATRIZ_PRECONDICION_FALLIDA'
  | 'MATRIZ_IDEMPOTENCIA_CONFLICTO'
  | 'MATRIZ_CONFLICTO_CONCURRENCIA'
  | 'MATRIZ_NUEVA_DESDE_HISTORICA_ERROR';

const NUEVA_VERSION_ERROR_STATUS: Record<NuevaVersionHistoricaErrorCode, number> = {
  MATRIZ_EMPRESA_NO_ENCONTRADA: 404,
  MATRIZ_ORIGEN_NO_ENCONTRADA: 404,
  MATRIZ_ORIGEN_NO_PUBLICADA: 409,
  MATRIZ_PENDIENTE_EXISTENTE: 409,
  MATRIZ_PRECONDICION_REQUERIDA: 428,
  MATRIZ_PRECONDICION_FALLIDA: 412,
  MATRIZ_IDEMPOTENCIA_CONFLICTO: 409,
  MATRIZ_CONFLICTO_CONCURRENCIA: 409,
  MATRIZ_NUEVA_DESDE_HISTORICA_ERROR: 500,
};

const NUEVA_VERSION_ERROR_MESSAGES: Record<NuevaVersionHistoricaErrorCode, string> = {
  MATRIZ_EMPRESA_NO_ENCONTRADA: 'Empresa no encontrada',
  MATRIZ_ORIGEN_NO_ENCONTRADA: 'Matriz de origen no encontrada',
  MATRIZ_ORIGEN_NO_PUBLICADA: 'La matriz de origen debe estar publicada',
  MATRIZ_PENDIENTE_EXISTENTE: 'La empresa ya cuenta con una matriz pendiente',
  MATRIZ_PRECONDICION_REQUERIDA: 'If-Match es obligatorio',
  MATRIZ_PRECONDICION_FALLIDA: 'La revision de la matriz de origen no coincide',
  MATRIZ_IDEMPOTENCIA_CONFLICTO:
    'La Idempotency-Key ya fue utilizada con una solicitud diferente',
  MATRIZ_CONFLICTO_CONCURRENCIA:
    'No fue posible crear la nueva version por un conflicto concurrente',
  MATRIZ_NUEVA_DESDE_HISTORICA_ERROR:
    'No fue posible crear la nueva version desde la matriz historica',
};

export class NuevaVersionHistoricaError extends Error {
  constructor(public readonly code: NuevaVersionHistoricaErrorCode) {
    super(NUEVA_VERSION_ERROR_MESSAGES[code]);
    this.name = 'NuevaVersionHistoricaError';
  }

  get status(): number {
    return NUEVA_VERSION_ERROR_STATUS[this.code];
  }
}

export type CrearBorradorMatrizResponse = { data: BorradorMatrizData };

type BorradorMatrizDataFromDb = Omit<BorradorMatrizData, 'revision' | 'creada_en'> & {
  revision: number | string;
  creada_en: Date | string;
};

type NuevaVersionHistoricaDataFromDb = Omit<
  NuevaVersionHistoricaData,
  'revision' | 'creada_en'
> & {
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

function normalizeNuevaVersionHistoricaData(
  data: NuevaVersionHistoricaDataFromDb,
): NuevaVersionHistoricaData {
  const normalized = normalizeBorradorMatrizData({
    ...data,
    version_origen_id: null,
  });
  if (!Number.isSafeInteger(data.version_origen_id) || data.version_origen_id <= 0) {
    throw new Error('Version de origen invalida');
  }
  return { ...normalized, version_origen_id: data.version_origen_id };
}

export function nuevaVersionHistoricaRequestCanonical(
  empresaId: number,
  versionOrigenId: number,
  actorUsuarioId: number,
  revisionOrigen: number,
  motivo: string,
): string {
  return JSON.stringify({
    operacion: NUEVA_DESDE_HISTORICA_OPERACION,
    empresa_id: empresaId,
    version_origen_id: versionOrigenId,
    actor_usuario_id: actorUsuarioId,
    revision_origen: revisionOrigen,
    motivo,
  });
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

export async function createCompanyMatrixVersionFromHistory(
  db: Pool,
  empresaId: number,
  versionOrigenId: number,
  actorUsuarioId: number,
  revisionOrigen: number,
  motivo: string,
  idempotencyKey: string,
): Promise<NuevaVersionHistoricaResponse> {
  const keyHash = sha256Hex(idempotencyKey);
  const requestHash = sha256Hex(
    nuevaVersionHistoricaRequestCanonical(
      empresaId,
      versionOrigenId,
      actorUsuarioId,
      revisionOrigen,
      motivo,
    ),
  );
  let client: PoolClient | null = null;
  let transactionStarted = false;

  try {
    client = await db.connect();
    await client.query('BEGIN');
    transactionStarted = true;
    await client.query('SELECT pg_catalog.pg_advisory_xact_lock(2205, $1)', [empresaId]);

    const company = await client.query(
      'SELECT id FROM public.empresas WHERE id = $1 LIMIT 1',
      [empresaId],
    );
    if (company.rows.length === 0) {
      throw new NuevaVersionHistoricaError('MATRIZ_EMPRESA_NO_ENCONTRADA');
    }

    const idempotency = await client.query<{
      id: string;
      request_sha256: string;
      estado_ejecucion: string;
      respuesta: { data: NuevaVersionHistoricaDataFromDb } | null;
      expirada: boolean;
    }>(
      `SELECT id, request_sha256, estado_ejecucion, respuesta,
         expira_en <= pg_catalog.now() AS expirada
       FROM public.matriz_idempotencia
       WHERE empresa_id = $1 AND actor_usuario_id = $2
         AND operacion = $3 AND clave_sha256 = $4
       LIMIT 1`,
      [empresaId, actorUsuarioId, NUEVA_DESDE_HISTORICA_OPERACION, keyHash],
    );

    if (idempotency.rows.length > 0) {
      const previous = idempotency.rows[0];
      if (previous.expirada) {
        await client.query(
          `DELETE FROM public.matriz_idempotencia
           WHERE id = $1 AND empresa_id = $2 AND actor_usuario_id = $3
             AND operacion = $4 AND clave_sha256 = $5`,
          [previous.id, empresaId, actorUsuarioId, NUEVA_DESDE_HISTORICA_OPERACION, keyHash],
        );
      } else {
        if (previous.request_sha256 !== requestHash) {
          throw new NuevaVersionHistoricaError('MATRIZ_IDEMPOTENCIA_CONFLICTO');
        }
        if (previous.estado_ejecucion !== 'COMPLETADA' || previous.respuesta === null) {
          throw new NuevaVersionHistoricaError('MATRIZ_CONFLICTO_CONCURRENCIA');
        }
        const response: NuevaVersionHistoricaResponse = {
          data: normalizeNuevaVersionHistoricaData(previous.respuesta.data),
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
      [
        empresaId,
        actorUsuarioId,
        NUEVA_DESDE_HISTORICA_OPERACION,
        keyHash,
        requestHash,
      ],
    );

    const versions = await client.query(
      `SELECT id, empresa_id, numero_version, estado_editorial, activa,
              revision, procedencia
       FROM public.matriz_empresa_version
       WHERE empresa_id = $1
       ORDER BY id
       FOR UPDATE`,
      [empresaId],
    );
    const source = versions.rows.find((row) => Number(row.id) === versionOrigenId);
    if (!source) {
      throw new NuevaVersionHistoricaError('MATRIZ_ORIGEN_NO_ENCONTRADA');
    }
    if (source.estado_editorial !== 'PUBLICADA') {
      throw new NuevaVersionHistoricaError('MATRIZ_ORIGEN_NO_PUBLICADA');
    }
    const sourceRevision = Number(source.revision);
    if (!Number.isSafeInteger(sourceRevision) || sourceRevision !== revisionOrigen) {
      throw new NuevaVersionHistoricaError('MATRIZ_PRECONDICION_FALLIDA');
    }
    if (
      versions.rows.some((row) =>
        row.estado_editorial === 'BORRADOR' || row.estado_editorial === 'VALIDADA')
    ) {
      throw new NuevaVersionHistoricaError('MATRIZ_PENDIENTE_EXISTENTE');
    }

    const numeroVersion = versions.rows.reduce(
      (maximum, row) => Math.max(maximum, Number(row.numero_version)),
      0,
    ) + 1;
    if (!Number.isSafeInteger(numeroVersion) || numeroVersion <= 0) {
      throw new Error('Numero de version invalido');
    }

    const inserted = await client.query<NuevaVersionHistoricaDataFromDb>(
      `INSERT INTO public.matriz_empresa_version (
         empresa_id, numero_version, creada_por, version_origen_id,
         version_origen_empresa_id, motivo_nueva_version, procedencia
       ) VALUES ($1, $2, $3, $4, $1, $5, $6)
       RETURNING id, empresa_id, numero_version, estado_editorial, activa,
                 revision, version_origen_id, creada_en`,
      [
        empresaId,
        numeroVersion,
        actorUsuarioId,
        versionOrigenId,
        motivo,
        source.procedencia,
      ],
    );
    const response: NuevaVersionHistoricaResponse = {
      data: normalizeNuevaVersionHistoricaData(inserted.rows[0]),
    };

    const sourceCriteria = await client.query(
      `SELECT id, codigo, ambito, texto, orden, fuente_dato, suma_perfil,
              catalogo_criterio_pt_version_id, catalogo_criterio_gr_version_id
       FROM public.matriz_criterio
       WHERE matriz_version_id = $1
       ORDER BY id`,
      [versionOrigenId],
    );
    const criterionIdMap = new Map<number, number>();
    for (const criterion of sourceCriteria.rows) {
      const copied = await client.query<{ id: number }>(
        `INSERT INTO public.matriz_criterio (
           matriz_version_id, codigo, ambito, texto, orden, fuente_dato,
           suma_perfil, catalogo_criterio_pt_version_id,
           catalogo_criterio_gr_version_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id`,
        [
          response.data.id,
          criterion.codigo,
          criterion.ambito,
          criterion.texto,
          criterion.orden,
          criterion.fuente_dato,
          criterion.suma_perfil,
          criterion.catalogo_criterio_pt_version_id,
          criterion.catalogo_criterio_gr_version_id,
        ],
      );
      criterionIdMap.set(Number(criterion.id), Number(copied.rows[0].id));
    }

    const sourceOptions = await client.query(
      `SELECT mo.criterio_id, mo.codigo, mo.etiqueta, mo.puntaje,
              mo.orden, mo.referencia_origen
       FROM public.matriz_opcion mo
       JOIN public.matriz_criterio mc ON mc.id = mo.criterio_id
       WHERE mc.matriz_version_id = $1
       ORDER BY mo.id`,
      [versionOrigenId],
    );
    for (const option of sourceOptions.rows) {
      const newCriterionId = criterionIdMap.get(Number(option.criterio_id));
      if (newCriterionId === undefined) throw new Error('Criterio de opcion no remapeado');
      await client.query(
        `INSERT INTO public.matriz_opcion (
           criterio_id, codigo, etiqueta, puntaje, orden, referencia_origen
         ) VALUES ($1,$2,$3,$4,$5,$6)`,
        [newCriterionId, option.codigo, option.etiqueta, option.puntaje,
          option.orden, option.referencia_origen],
      );
    }

    const sourceRanges = await client.query(
      `SELECT mr.criterio_id, mr.codigo, mr.unidad, mr.minimo, mr.maximo,
              mr.minimo_incluido, mr.maximo_incluido, mr.puntaje,
              mr.resultado_codigo, mr.orden, mr.referencia_origen
       FROM public.matriz_rango mr
       JOIN public.matriz_criterio mc ON mc.id = mr.criterio_id
       WHERE mc.matriz_version_id = $1
       ORDER BY mr.id`,
      [versionOrigenId],
    );
    for (const range of sourceRanges.rows) {
      const newCriterionId = criterionIdMap.get(Number(range.criterio_id));
      if (newCriterionId === undefined) throw new Error('Criterio de rango no remapeado');
      await client.query(
        `INSERT INTO public.matriz_rango (
           criterio_id, codigo, unidad, minimo, maximo, minimo_incluido,
           maximo_incluido, puntaje, resultado_codigo, orden, referencia_origen
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [newCriterionId, range.codigo, range.unidad, range.minimo, range.maximo,
          range.minimo_incluido, range.maximo_incluido, range.puntaje,
          range.resultado_codigo, range.orden, range.referencia_origen],
      );
    }

    const copiedResults = await client.query(
      `INSERT INTO public.matriz_resultado (
         matriz_version_id, codigo, ambito, orden, nombre_empresarial,
         minimo, maximo, minimo_incluido, maximo_incluido,
         referencia_nombre_origen, referencia_rango_origen
       )
       SELECT $1, codigo, ambito, orden, nombre_empresarial, minimo, maximo,
              minimo_incluido, maximo_incluido, referencia_nombre_origen,
              referencia_rango_origen
       FROM public.matriz_resultado
       WHERE matriz_version_id = $2
       ORDER BY id`,
      [response.data.id, versionOrigenId],
    );

    const sourceRules = await client.query(
      `SELECT criterio_id, codigo, marca_canonica, condicion_controlada,
              puntaje, prioridad, alto_automatico, causa_codigo
       FROM public.matriz_regla
       WHERE matriz_version_id = $1
       ORDER BY id`,
      [versionOrigenId],
    );
    for (const rule of sourceRules.rows) {
      const newCriterionId = rule.criterio_id === null
        ? null
        : criterionIdMap.get(Number(rule.criterio_id));
      if (rule.criterio_id !== null && newCriterionId === undefined) {
        throw new Error('Criterio de regla no remapeado');
      }
      await client.query(
        `INSERT INTO public.matriz_regla (
           matriz_version_id, criterio_id, codigo, marca_canonica,
           condicion_controlada, puntaje, prioridad, alto_automatico, causa_codigo
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [response.data.id, newCriterionId, rule.codigo, rule.marca_canonica,
          rule.condicion_controlada, rule.puntaje, rule.prioridad,
          rule.alto_automatico, rule.causa_codigo],
      );
    }

    const sourceFile = await client.query(
      `SELECT nombre_original, mime_detectado, tamano_bytes, sha256,
              referencia_contenido, cargado_por, cargado_en, contenido
       FROM public.matriz_archivo_fuente
       WHERE matriz_version_id = $1`,
      [versionOrigenId],
    );
    if (sourceFile.rows.length > 1) throw new Error('Archivo fuente duplicado');
    const file = sourceFile.rows[0] ?? null;
    if (file) {
      await client.query(
        `INSERT INTO public.matriz_archivo_fuente (
           matriz_version_id, nombre_original, mime_detectado, tamano_bytes,
           sha256, referencia_contenido, cargado_por, cargado_en, contenido
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [response.data.id, file.nombre_original, file.mime_detectado,
          file.tamano_bytes, file.sha256, file.referencia_contenido,
          file.cargado_por, file.cargado_en, file.contenido],
      );
    }

    await client.query(
      `INSERT INTO public.matriz_auditoria_evento (
         empresa_id, matriz_version_id, version_origen_id, actor_usuario_id,
         accion, operacion, estado_anterior, estado_nuevo,
         activa_anterior, activa_nueva, motivo,
         archivo_nombre_original, archivo_mime_detectado,
         archivo_tamano_bytes, archivo_sha256,
         clave_idempotencia_sha256, resumen
       ) VALUES ($1,$2,$3,$4,$5,$5,'PUBLICADA','BORRADOR',$6,FALSE,$7,
                 $8,$9,$10,$11,$12,$13::jsonb)`,
      [
        empresaId,
        response.data.id,
        versionOrigenId,
        actorUsuarioId,
        NUEVA_DESDE_HISTORICA_OPERACION,
        source.activa,
        motivo,
        file?.nombre_original ?? null,
        file?.mime_detectado ?? null,
        file?.tamano_bytes ?? null,
        file?.sha256 ?? null,
        keyHash,
        JSON.stringify({
          version_origen_id: versionOrigenId,
          numero_version_origen: Number(source.numero_version),
          numero_version_nueva: response.data.numero_version,
          criterios: sourceCriteria.rows.length,
          opciones: sourceOptions.rows.length,
          rangos: sourceRanges.rows.length,
          resultados: copiedResults.rowCount ?? 0,
          reglas: sourceRules.rows.length,
          archivo_copiado: file !== null,
        }),
      ],
    );

    const completed = await client.query<{ id: string }>(
      `UPDATE public.matriz_idempotencia
       SET estado_ejecucion = 'COMPLETADA', codigo_http = 201,
           respuesta = $5::jsonb, matriz_version_id = $6,
           completado_en = pg_catalog.now()
       WHERE empresa_id = $1 AND actor_usuario_id = $2
         AND operacion = $3 AND clave_sha256 = $4
         AND estado_ejecucion = 'EN_PROCESO'
       RETURNING id`,
      [empresaId, actorUsuarioId, NUEVA_DESDE_HISTORICA_OPERACION,
        keyHash, JSON.stringify(response), response.data.id],
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
    if (error instanceof NuevaVersionHistoricaError) throw error;
    if (isConcurrencyConflict(error)) {
      throw new NuevaVersionHistoricaError('MATRIZ_CONFLICTO_CONCURRENCIA');
    }
    throw new NuevaVersionHistoricaError('MATRIZ_NUEVA_DESDE_HISTORICA_ERROR');
  } finally {
    client?.release();
  }
}

export async function getLatestPublishedCompanyMatrix(
  db: DbClient,
  empresaId: number,
): Promise<MatrizPublicadaFuente | null> {
  const result = await db.query(
    `SELECT id, numero_version, revision, activa
     FROM public.matriz_empresa_version
     WHERE empresa_id = $1 AND estado_editorial = 'PUBLICADA'
     ORDER BY activa DESC, numero_version DESC
     LIMIT 1`,
    [empresaId],
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  const id = Number(row.id);
  const numeroVersion = Number(row.numero_version);
  const revision = Number(row.revision);
  if (
    !Number.isSafeInteger(id) || id <= 0 ||
    !Number.isSafeInteger(numeroVersion) || numeroVersion <= 0 ||
    !Number.isSafeInteger(revision) || revision <= 0 ||
    typeof row.activa !== 'boolean'
  ) {
    throw new Error('Matriz publicada invalida');
  }
  return { id, numero_version: numeroVersion, revision, activa: row.activa };
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
