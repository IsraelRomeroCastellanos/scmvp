import type { Pool, PoolClient } from 'pg';

type DbClient = Pool | PoolClient;

export type PerfilTransaccionalV1ErrorCode =
  | 'PT_SOLICITUD_INVALIDA'
  | 'PT_RESPUESTAS_INVALIDAS'
  | 'CLIENTE_NO_ENCONTRADO'
  | 'PT_MATRIZ_NO_DISPONIBLE'
  | 'PT_CONFIGURACION_INCONSISTENTE'
  | 'PT_PERSISTENCIA_INCONSISTENTE';

const ERROR_STATUS: Record<PerfilTransaccionalV1ErrorCode, number> = {
  PT_SOLICITUD_INVALIDA: 400,
  PT_RESPUESTAS_INVALIDAS: 400,
  CLIENTE_NO_ENCONTRADO: 404,
  PT_MATRIZ_NO_DISPONIBLE: 409,
  PT_CONFIGURACION_INCONSISTENTE: 409,
  PT_PERSISTENCIA_INCONSISTENTE: 500,
};

const ERROR_MESSAGE: Record<PerfilTransaccionalV1ErrorCode, string> = {
  PT_SOLICITUD_INVALIDA: 'La solicitud de Perfil Transaccional no es valida',
  PT_RESPUESTAS_INVALIDAS: 'Las respuestas del Perfil Transaccional no son validas',
  CLIENTE_NO_ENCONTRADO: 'Cliente no encontrado',
  PT_MATRIZ_NO_DISPONIBLE: 'La empresa no tiene una matriz publicada y activa',
  PT_CONFIGURACION_INCONSISTENTE: 'La configuracion PT de la matriz activa es inconsistente',
  PT_PERSISTENCIA_INCONSISTENTE: 'No fue posible persistir integramente la evaluacion PT',
};

export class PerfilTransaccionalV1Error extends Error {
  constructor(public readonly code: PerfilTransaccionalV1ErrorCode) {
    super(ERROR_MESSAGE[code]);
    this.name = 'PerfilTransaccionalV1Error';
  }

  get status(): number {
    return ERROR_STATUS[this.code];
  }
}

export type PerfilTransaccionalV1RespuestaInput = {
  criterio_id: number;
  opcion_id: number;
};

type Cliente = { id: number; empresa_id: number; nombre: string };
type Matriz = { id: number; numero_version: number; revision: number };
type Opcion = { id: number; criterio_id: number; etiqueta: string; orden: number; puntaje: 1 | 2 | 3 };
type Criterio = {
  id: number;
  codigo: string;
  texto: string;
  orden: number;
  tipo_resolucion: string;
  tipo_parametrizacion: string;
  unidad_canonica: string | null;
  opciones: Opcion[];
};
type Resultado = {
  id: number;
  nombre: string;
  minimo: number;
  maximo: number;
  minimo_incluido: boolean;
  maximo_incluido: boolean;
  orden: number;
};
type Configuracion = { matriz: Matriz; criterios: Criterio[]; resultados: Resultado[] };

function positiveInteger(value: unknown): number {
  const normalized = typeof value === 'string' && /^[1-9]\d*$/.test(value)
    ? Number(value)
    : value;
  if (!Number.isSafeInteger(normalized) || Number(normalized) <= 0) {
    throw new PerfilTransaccionalV1Error('PT_CONFIGURACION_INCONSISTENTE');
  }
  return Number(normalized);
}

function nonEmptyString(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new PerfilTransaccionalV1Error('PT_CONFIGURACION_INCONSISTENTE');
  }
  return value;
}

function score(value: unknown): 1 | 2 | 3 {
  const normalized = Number(value);
  if (normalized !== 1 && normalized !== 2 && normalized !== 3) {
    throw new PerfilTransaccionalV1Error('PT_CONFIGURACION_INCONSISTENTE');
  }
  return normalized;
}

function isoDate(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new PerfilTransaccionalV1Error('PT_PERSISTENCIA_INCONSISTENTE');
  }
  return date.toISOString();
}

export function parsePerfilTransaccionalV1Body(
  body: unknown,
): PerfilTransaccionalV1RespuestaInput[] {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new PerfilTransaccionalV1Error('PT_SOLICITUD_INVALIDA');
  }
  const source = body as Record<string, unknown>;
  if (Object.keys(source).length !== 1 || !Object.prototype.hasOwnProperty.call(source, 'respuestas')) {
    throw new PerfilTransaccionalV1Error('PT_SOLICITUD_INVALIDA');
  }
  if (
    !Array.isArray(source.respuestas) ||
    source.respuestas.length < 3 || source.respuestas.length > 6
  ) {
    throw new PerfilTransaccionalV1Error('PT_RESPUESTAS_INVALIDAS');
  }

  return source.respuestas.map((candidate) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new PerfilTransaccionalV1Error('PT_RESPUESTAS_INVALIDAS');
    }
    const item = candidate as Record<string, unknown>;
    const keys = Object.keys(item);
    if (
      keys.length !== 2
      || !Object.prototype.hasOwnProperty.call(item, 'criterio_id')
      || !Object.prototype.hasOwnProperty.call(item, 'opcion_id')
      || !Number.isSafeInteger(item.criterio_id)
      || Number(item.criterio_id) <= 0
      || !Number.isSafeInteger(item.opcion_id)
      || Number(item.opcion_id) <= 0
    ) {
      throw new PerfilTransaccionalV1Error('PT_RESPUESTAS_INVALIDAS');
    }
    return {
      criterio_id: Number(item.criterio_id),
      opcion_id: Number(item.opcion_id),
    };
  });
}

async function loadCliente(db: DbClient, clienteId: number, lock: boolean): Promise<Cliente> {
  const result = await db.query(
    `SELECT id, empresa_id, nombre_entidad
     FROM public.clientes
     WHERE id = $1
     LIMIT 1
     ${lock ? 'FOR UPDATE' : ''}`,
    [clienteId],
  );
  if (result.rows.length === 0) {
    throw new PerfilTransaccionalV1Error('CLIENTE_NO_ENCONTRADO');
  }
  const row = result.rows[0];
  return {
    id: positiveInteger(row.id),
    empresa_id: positiveInteger(row.empresa_id),
    nombre: typeof row.nombre_entidad === 'string' ? row.nombre_entidad : '',
  };
}

async function loadConfiguracion(
  db: DbClient,
  empresaId: number,
  lock: boolean,
): Promise<Configuracion> {
  const matrixResult = await db.query(
    `SELECT id, numero_version, revision
     FROM public.matriz_empresa_version
     WHERE empresa_id = $1
       AND estado_editorial = 'PUBLICADA'
       AND activa = TRUE
     ${lock ? 'FOR SHARE' : ''}`,
    [empresaId],
  );
  if (matrixResult.rows.length === 0) {
    throw new PerfilTransaccionalV1Error('PT_MATRIZ_NO_DISPONIBLE');
  }
  if (matrixResult.rows.length !== 1) {
    throw new PerfilTransaccionalV1Error('PT_CONFIGURACION_INCONSISTENTE');
  }
  const matrixRow = matrixResult.rows[0];
  const matriz: Matriz = {
    id: positiveInteger(matrixRow.id),
    numero_version: positiveInteger(matrixRow.numero_version),
    revision: positiveInteger(matrixRow.revision),
  };

  const [criteriaResult, optionResult, resultResult] = await Promise.all([
    db.query(
      `SELECT mc.id, mc.codigo, mc.texto, mc.orden,
              cv.tipo_resolucion, cv.tipo_parametrizacion, cv.unidad_canonica
       FROM public.matriz_criterio mc
       JOIN public.catalogo_criterio_pt_version cv
         ON cv.id = mc.catalogo_criterio_pt_version_id
       WHERE mc.matriz_version_id = $1 AND mc.ambito = 'PT'
       ORDER BY mc.orden, mc.id`,
      [matriz.id],
    ),
    db.query(
      `SELECT mo.id, mo.criterio_id, mo.etiqueta, mo.orden, mo.puntaje
       FROM public.matriz_opcion mo
       JOIN public.matriz_criterio mc ON mc.id = mo.criterio_id
       WHERE mc.matriz_version_id = $1 AND mc.ambito = 'PT'
       ORDER BY mc.orden, mo.orden, mo.id`,
      [matriz.id],
    ),
    db.query(
      `SELECT id, nombre_empresarial, minimo, maximo,
              minimo_incluido, maximo_incluido, orden
       FROM public.matriz_resultado
       WHERE matriz_version_id = $1 AND ambito = 'PT'
       ORDER BY orden, id`,
      [matriz.id],
    ),
  ]);

  const optionsByCriterion = new Map<number, Opcion[]>();
  for (const row of optionResult.rows) {
    const criterionId = positiveInteger(row.criterio_id);
    const option: Opcion = {
      id: positiveInteger(row.id),
      criterio_id: criterionId,
      etiqueta: nonEmptyString(row.etiqueta),
      orden: positiveInteger(row.orden),
      puntaje: score(row.puntaje),
    };
    optionsByCriterion.set(criterionId, [...(optionsByCriterion.get(criterionId) ?? []), option]);
  }

  const criterios: Criterio[] = criteriaResult.rows.map((row) => ({
    id: positiveInteger(row.id),
    codigo: nonEmptyString(row.codigo),
    texto: nonEmptyString(row.texto),
    orden: positiveInteger(row.orden),
    tipo_resolucion: String(row.tipo_resolucion),
    tipo_parametrizacion: String(row.tipo_parametrizacion),
    unidad_canonica: row.unidad_canonica === null ? null : String(row.unidad_canonica),
    opciones: optionsByCriterion.get(positiveInteger(row.id)) ?? [],
  }));

  const resultados: Resultado[] = resultResult.rows.map((row) => ({
    id: positiveInteger(row.id),
    nombre: nonEmptyString(row.nombre_empresarial),
    minimo: Number(row.minimo),
    maximo: Number(row.maximo),
    minimo_incluido: row.minimo_incluido,
    maximo_incluido: row.maximo_incluido,
    orden: positiveInteger(row.orden),
  }));

  validateConfiguracion(criterios, resultados, optionResult.rows.length);
  return { matriz, criterios, resultados };
}

function validateConfiguracion(
  criterios: Criterio[],
  resultados: Resultado[],
  optionCount: number,
): void {
  if (criterios.length < 3 || criterios.length > 6 || optionCount !== criterios.length * 3) {
    throw new PerfilTransaccionalV1Error('PT_CONFIGURACION_INCONSISTENTE');
  }
  criterios.forEach((criterio, index) => {
    if (
      criterio.orden !== index + 1
      || criterio.tipo_resolucion !== 'CAPTURA_OPCIONES'
      || criterio.tipo_parametrizacion !== 'OPCIONES'
      || criterio.unidad_canonica !== null
      || criterio.opciones.length !== 3
      || criterio.opciones.some((option, optionIndex) => option.orden !== optionIndex + 1)
      || new Set(criterio.opciones.map((option) => option.puntaje)).size !== 3
      || new Set(criterio.opciones.map((option) => option.etiqueta.trim())).size !== 3
    ) {
      throw new PerfilTransaccionalV1Error('PT_CONFIGURACION_INCONSISTENTE');
    }
  });

  if (resultados.length !== 3) {
    throw new PerfilTransaccionalV1Error('PT_CONFIGURACION_INCONSISTENTE');
  }
  resultados.forEach((resultado, index) => {
    if (
      resultado.orden !== index + 1
      || !Number.isSafeInteger(resultado.minimo)
      || !Number.isSafeInteger(resultado.maximo)
      || resultado.minimo_incluido !== true
      || resultado.maximo_incluido !== true
      || resultado.minimo > resultado.maximo
      || (index === 0 && resultado.minimo !== criterios.length)
      || (index > 0 && resultado.minimo !== resultados[index - 1].maximo + 1)
      || (index === resultados.length - 1 && resultado.maximo !== criterios.length * 3)
    ) {
      throw new PerfilTransaccionalV1Error('PT_CONFIGURACION_INCONSISTENTE');
    }
  });
}

function validateRespuestas(
  input: PerfilTransaccionalV1RespuestaInput[],
  criterios: Criterio[],
): Array<{ criterio: Criterio; opcion: Opcion }> {
  if (
    input.length !== criterios.length ||
    new Set(input.map((item) => item.criterio_id)).size !== criterios.length
  ) {
    throw new PerfilTransaccionalV1Error('PT_RESPUESTAS_INVALIDAS');
  }
  const inputByCriterion = new Map(input.map((item) => [item.criterio_id, item.opcion_id]));
  return criterios.map((criterio) => {
    const optionId = inputByCriterion.get(criterio.id);
    const opcion = criterio.opciones.find((candidate) => candidate.id === optionId);
    if (!opcion) {
      throw new PerfilTransaccionalV1Error('PT_RESPUESTAS_INVALIDAS');
    }
    return { criterio, opcion };
  });
}

async function loadLatestEvaluation(db: DbClient, clienteId: number) {
  const result = await db.query(
    `SELECT e.id, e.numero_version, e.puntaje_total, e.creada_en,
            r.id AS resultado_id, r.nombre_empresarial AS resultado_nombre
     FROM public.cliente_pt_evaluacion e
     JOIN public.matriz_resultado r ON r.id = e.matriz_resultado_id
     WHERE e.cliente_id = $1
     ORDER BY e.numero_version DESC
     LIMIT 1`,
    [clienteId],
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: positiveInteger(row.id),
    numero_version: positiveInteger(row.numero_version),
    puntaje_total: positiveInteger(row.puntaje_total),
    resultado: { id: positiveInteger(row.resultado_id), nombre: nonEmptyString(row.resultado_nombre) },
    creada_en: isoDate(row.creada_en),
  };
}

export async function getPerfilTransaccionalV1Context(db: Pool, clienteId: number) {
  const client = await db.connect();
  let transactionStarted = false;
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    transactionStarted = true;
    const cliente = await loadCliente(client, clienteId, false);
    const configuracion = await loadConfiguracion(client, cliente.empresa_id, false);
    const ultimaEvaluacion = await loadLatestEvaluation(client, cliente.id);
    const response = {
      data: {
        cliente,
        matriz: configuracion.matriz,
        criterios: configuracion.criterios.map((criterio) => ({
          id: criterio.id,
          codigo: criterio.codigo,
          texto: criterio.texto,
          orden: criterio.orden,
          opciones: criterio.opciones.map((opcion) => ({
            id: opcion.id,
            etiqueta: opcion.etiqueta,
            orden: opcion.orden,
          })),
        })),
        resultados: configuracion.resultados.map((resultado) => ({
          id: resultado.id,
          nombre: resultado.nombre,
          minimo: resultado.minimo,
          maximo: resultado.maximo,
          orden: resultado.orden,
        })),
        ultima_evaluacion: ultimaEvaluacion,
      },
    };
    await client.query('COMMIT');
    transactionStarted = false;
    return response;
  } catch (error) {
    if (transactionStarted) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function createPerfilTransaccionalV1Evaluation(
  db: Pool,
  clienteId: number,
  actorUsuarioId: number,
  input: PerfilTransaccionalV1RespuestaInput[],
) {
  let client: PoolClient | null = null;
  let transactionStarted = false;
  try {
    client = await db.connect();
    await client.query('BEGIN');
    transactionStarted = true;

    // El lock del cliente serializa MAX(numero_version)+1 para este cliente.
    const cliente = await loadCliente(client, clienteId, true);
    const configuracion = await loadConfiguracion(client, cliente.empresa_id, true);
    const respuestas = validateRespuestas(input, configuracion.criterios);
    const puntajeTotal = respuestas.reduce((total, item) => total + item.opcion.puntaje, 0);
    const matchingResults = configuracion.resultados.filter((resultado) => (
      (resultado.minimo_incluido ? puntajeTotal >= resultado.minimo : puntajeTotal > resultado.minimo)
      && (resultado.maximo_incluido ? puntajeTotal <= resultado.maximo : puntajeTotal < resultado.maximo)
    ));
    if (matchingResults.length !== 1) {
      throw new PerfilTransaccionalV1Error('PT_CONFIGURACION_INCONSISTENTE');
    }
    const resultado = matchingResults[0];

    const versionResult = await client.query(
      `SELECT COALESCE(MAX(numero_version), 0) + 1 AS numero_version
       FROM public.cliente_pt_evaluacion
       WHERE cliente_id = $1`,
      [cliente.id],
    );
    const numeroVersion = positiveInteger(versionResult.rows[0]?.numero_version);
    const evaluationResult = await client.query(
      `INSERT INTO public.cliente_pt_evaluacion (
         cliente_id, empresa_id, matriz_version_id, numero_version,
         puntaje_total, matriz_resultado_id, creada_por
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, creada_en`,
      [
        cliente.id,
        cliente.empresa_id,
        configuracion.matriz.id,
        numeroVersion,
        puntajeTotal,
        resultado.id,
        actorUsuarioId,
      ],
    );
    if (evaluationResult.rows.length !== 1) {
      throw new PerfilTransaccionalV1Error('PT_PERSISTENCIA_INCONSISTENTE');
    }
    const evaluacionId = positiveInteger(evaluationResult.rows[0].id);

    for (const respuesta of respuestas) {
      await client.query(
        `INSERT INTO public.cliente_pt_respuesta (
           evaluacion_id, matriz_version_id, matriz_criterio_id,
           matriz_opcion_id, puntaje, orden
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          evaluacionId,
          configuracion.matriz.id,
          respuesta.criterio.id,
          respuesta.opcion.id,
          respuesta.opcion.puntaje,
          respuesta.criterio.orden,
        ],
      );
    }
    const countResult = await client.query(
      `SELECT COUNT(*)::integer AS total
       FROM public.cliente_pt_respuesta
       WHERE evaluacion_id = $1`,
      [evaluacionId],
    );
    if (countResult.rows[0]?.total !== 4) {
      throw new PerfilTransaccionalV1Error('PT_PERSISTENCIA_INCONSISTENTE');
    }

    await client.query('COMMIT');
    transactionStarted = false;
    return {
      data: {
        evaluacion: {
          id: evaluacionId,
          cliente_id: cliente.id,
          empresa_id: cliente.empresa_id,
          numero_version: numeroVersion,
          puntaje_total: puntajeTotal,
          matriz: {
            id: configuracion.matriz.id,
            numero_version: configuracion.matriz.numero_version,
          },
          resultado: {
            id: resultado.id,
            nombre: resultado.nombre,
            minimo: resultado.minimo,
            maximo: resultado.maximo,
          },
          respuestas: respuestas.map(({ criterio, opcion }) => ({
            criterio_id: criterio.id,
            criterio_codigo: criterio.codigo,
            criterio_texto: criterio.texto,
            orden: criterio.orden,
            opcion_id: opcion.id,
            opcion_etiqueta: opcion.etiqueta,
            puntaje: opcion.puntaje,
          })),
          creada_en: isoDate(evaluationResult.rows[0].creada_en),
        },
      },
    };
  } catch (error) {
    if (client && transactionStarted) {
      await client.query('ROLLBACK').catch(() => {});
    }
    throw error;
  } finally {
    client?.release();
  }
}
