import type { Pool, PoolClient, QueryResult } from 'pg';

type DbClient = Pool | PoolClient;
type KeyKind = 'actividad' | 'operacion';
type OrigenSeleccion = 'automatica' | 'manual' | 'regularizacion';

type ActividadRow = {
  id?: number;
  empresa_id?: number;
  empresa_actividad_vulnerable_id?: number;
  clave: string;
  nombre: string;
  fraccion: string | null;
  descripcion: string | null;
};

type OperacionRow = {
  actividad_id?: number;
  id?: number;
  actividad_operacion_id?: number;
  clave: string | null;
  nombre: string | null;
  descripcion: string | null;
};

type SeleccionRow = {
  id: number;
  cliente_id: number;
  empresa_id: number;
  empresa_actividad_vulnerable_id: number;
  actividad_operacion_id: number;
  origen_seleccion: OrigenSeleccion;
  vigente_desde: Date | string;
  actividad_id: number;
  actividad_clave: string;
  actividad_nombre: string;
  actividad_fraccion: string | null;
  actividad_descripcion: string | null;
  operacion_id: number;
  operacion_clave: string;
  operacion_nombre: string;
  operacion_descripcion: string | null;
};

export type ActividadGeneralPublica = {
  clave: string;
  nombre: string;
  fraccion: string | null;
  descripcion: string | null;
};

export type OperacionVulnerablePublica = {
  clave: string;
  nombre: string;
  descripcion: string | null;
};

type ActividadEmpresaInterna = ActividadGeneralPublica & {
  id: number;
  empresa_actividad_vulnerable_id: number;
};

type OperacionInterna = OperacionVulnerablePublica & {
  id: number;
  actividad_operacion_id: number;
};

export type ConfiguracionPldPublica = {
  estado: 'completa' | 'pendiente';
  actividad: ActividadGeneralPublica | null;
  operacion: OperacionVulnerablePublica | null;
  origen_seleccion: OrigenSeleccion | null;
  vigente_desde: string | null;
};

export type PropiedadClaveNormalizada = {
  present: boolean;
  value: string | null;
};

export type PropiedadClavesNormalizada = {
  present: boolean;
  keys: string[];
};

export class ActividadesVulnerablesError extends Error {
  constructor(
    public readonly status: 400 | 403 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'ActividadesVulnerablesError';
  }
}

const ACTIVIDAD_REGEX = /^AVG_[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;
const OPERACION_REGEX = /^AV_[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

export function hasOwnProperty(value: unknown, property: string): boolean {
  return Boolean(
    value
      && typeof value === 'object'
      && Object.prototype.hasOwnProperty.call(value, property),
  );
}

export function normalizePublicKey(value: unknown, kind: KeyKind): string {
  if (typeof value !== 'string') {
    throw new ActividadesVulnerablesError(
      400,
      `${kind === 'actividad' ? 'actividad vulnerable' : 'operación vulnerable'} debe ser string`,
    );
  }

  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    throw new ActividadesVulnerablesError(
      400,
      `${kind === 'actividad' ? 'actividad vulnerable' : 'operación vulnerable'} no puede estar vacía`,
    );
  }

  const regex = kind === 'actividad' ? ACTIVIDAD_REGEX : OPERACION_REGEX;
  if (!regex.test(normalized)) {
    throw new ActividadesVulnerablesError(
      400,
      `${kind === 'actividad' ? 'actividad vulnerable' : 'operación vulnerable'} tiene formato inválido`,
    );
  }

  return normalized;
}

export function normalizeKeyProperty(
  body: unknown,
  property: string,
  kind: KeyKind,
): PropiedadClaveNormalizada {
  if (!hasOwnProperty(body, property)) return { present: false, value: null };

  const value = (body as Record<string, unknown>)[property];
  return {
    present: true,
    value: normalizePublicKey(value, kind),
  };
}

export function normalizeKeyArrayProperty(
  body: unknown,
  property = 'actividades_vulnerables',
): PropiedadClavesNormalizada {
  if (!hasOwnProperty(body, property)) return { present: false, keys: [] };

  const value = (body as Record<string, unknown>)[property];
  if (!Array.isArray(value)) {
    throw new ActividadesVulnerablesError(400, `${property} debe ser un arreglo`);
  }

  const keys = value.map((item) => normalizePublicKey(item, 'actividad'));
  const uniqueKeys = new Set(keys);
  if (uniqueKeys.size !== keys.length) {
    throw new ActividadesVulnerablesError(
      400,
      `${property} contiene claves duplicadas`,
    );
  }

  return { present: true, keys };
}

function toActividadPublica(row: ActividadRow): ActividadGeneralPublica {
  return {
    clave: String(row.clave),
    nombre: String(row.nombre),
    fraccion: row.fraccion ?? null,
    descripcion: row.descripcion ?? null,
  };
}

function toOperacionPublica(row: OperacionRow): OperacionVulnerablePublica {
  return {
    clave: String(row.clave),
    nombre: String(row.nombre),
    descripcion: row.descripcion ?? null,
  };
}

export async function getActiveActivitiesCatalog(
  db: DbClient,
): Promise<ActividadGeneralPublica[]> {
  const result: QueryResult<ActividadRow> = await db.query(
    `SELECT clave, nombre, fraccion, descripcion
     FROM public.cat_actividades_vulnerables_generales
     WHERE activo = TRUE
     ORDER BY nombre, clave`,
  );
  return result.rows.map(toActividadPublica);
}

export async function resolveActiveActivitiesByKeys(
  client: PoolClient,
  keys: string[],
): Promise<Array<ActividadGeneralPublica & { id: number }>> {
  if (keys.length === 0) return [];

  const result = await client.query<ActividadRow>(
    `SELECT id, clave, nombre, fraccion, descripcion
     FROM public.cat_actividades_vulnerables_generales
     WHERE activo = TRUE
       AND clave = ANY($1::text[])`,
    [keys],
  );

  const byKey = new Map(
    result.rows.map((row) => [String(row.clave), { ...toActividadPublica(row), id: Number(row.id) }]),
  );
  const missing = keys.filter((key) => !byKey.has(key));
  if (missing.length > 0) {
    throw new ActividadesVulnerablesError(
      400,
      `Actividades vulnerables inexistentes o inactivas: ${missing.join(', ')}`,
    );
  }

  return keys.map((key) => byKey.get(key)!);
}

export async function getActiveCompanyActivities(
  db: DbClient,
  empresaId: number,
  lock = false,
): Promise<ActividadEmpresaInterna[]> {
  const result: QueryResult<ActividadRow> = await db.query(
    `SELECT
       actividad.id,
       relacion.id AS empresa_actividad_vulnerable_id,
       actividad.clave,
       actividad.nombre,
       actividad.fraccion,
       actividad.descripcion
     FROM public.empresa_actividades_vulnerables relacion
     JOIN public.cat_actividades_vulnerables_generales actividad
       ON actividad.id = relacion.actividad_vulnerable_id
     WHERE relacion.empresa_id = $1
       AND relacion.activo = TRUE
       AND actividad.activo = TRUE
     ORDER BY actividad.nombre, actividad.clave
     ${lock ? 'FOR UPDATE OF relacion' : ''}`,
    [empresaId],
  );

  return result.rows.map((row) => ({
    ...toActividadPublica(row),
    id: Number(row.id),
    empresa_actividad_vulnerable_id: Number(row.empresa_actividad_vulnerable_id),
  }));
}

export async function getActiveActivitiesByCompanyIds(
  db: DbClient,
  empresaIds: number[],
): Promise<Map<number, ActividadGeneralPublica[]>> {
  const grouped = new Map<number, ActividadGeneralPublica[]>();
  for (const empresaId of empresaIds) grouped.set(empresaId, []);
  if (empresaIds.length === 0) return grouped;

  const result: QueryResult<ActividadRow> = await db.query(
    `SELECT
       relacion.empresa_id,
       actividad.clave,
       actividad.nombre,
       actividad.fraccion,
       actividad.descripcion
     FROM public.empresa_actividades_vulnerables relacion
     JOIN public.cat_actividades_vulnerables_generales actividad
       ON actividad.id = relacion.actividad_vulnerable_id
     WHERE relacion.empresa_id = ANY($1::int[])
       AND relacion.activo = TRUE
       AND actividad.activo = TRUE
     ORDER BY relacion.empresa_id, actividad.nombre, actividad.clave`,
    [empresaIds],
  );

  for (const row of result.rows) {
    const empresaId = Number(row.empresa_id);
    const activities = grouped.get(empresaId) ?? [];
    activities.push(toActividadPublica(row));
    grouped.set(empresaId, activities);
  }
  return grouped;
}

export async function reconcileCompanyActivities(
  client: PoolClient,
  empresaId: number,
  activities: Array<ActividadGeneralPublica & { id: number }>,
): Promise<void> {
  const ids = activities.map((activity) => activity.id);

  await client.query(
    `SELECT id
     FROM public.empresa_actividades_vulnerables
     WHERE empresa_id = $1
     ORDER BY id
     FOR UPDATE`,
    [empresaId],
  );

  await client.query(
    `UPDATE public.empresa_actividades_vulnerables
     SET activo = FALSE,
         actualizado_en = NOW()
     WHERE empresa_id = $1
       AND activo = TRUE
       AND NOT (actividad_vulnerable_id = ANY($2::int[]))`,
    [empresaId, ids],
  );

  for (const activity of activities) {
    await client.query(
      `INSERT INTO public.empresa_actividades_vulnerables (
         empresa_id,
         actividad_vulnerable_id,
         activo
       )
       VALUES ($1, $2, TRUE)
       ON CONFLICT (empresa_id, actividad_vulnerable_id)
       DO UPDATE
       SET activo = TRUE,
           actualizado_en = NOW()`,
      [empresaId, activity.id],
    );
  }
}

export async function getActiveOperationsByActivityKey(
  db: DbClient,
  actividadClave: string,
): Promise<OperacionVulnerablePublica[]> {
  const result: QueryResult<OperacionRow> = await db.query(
    `SELECT
       actividad.id AS actividad_id,
       operacion.clave,
       operacion.nombre,
       operacion.descripcion
     FROM public.cat_actividades_vulnerables_generales actividad
     LEFT JOIN public.actividad_vulnerable_operaciones relacion
       ON relacion.actividad_vulnerable_id = actividad.id
      AND relacion.activo = TRUE
     LEFT JOIN public.cat_operaciones_vulnerables operacion
       ON operacion.id = relacion.operacion_vulnerable_id
      AND operacion.activo = TRUE
     WHERE actividad.clave = $1
       AND actividad.activo = TRUE
     ORDER BY operacion.nombre NULLS LAST, operacion.clave NULLS LAST`,
    [actividadClave],
  );
  if (result.rows.length === 0) {
    throw new ActividadesVulnerablesError(
      404,
      'Actividad vulnerable inexistente o inactiva',
    );
  }

  return result.rows
    .filter(
      (row): row is OperacionRow & { clave: string; nombre: string } =>
        row.clave !== null && row.nombre !== null,
    )
    .map(toOperacionPublica);
}

async function resolveActiveOperationForActivity(
  client: PoolClient,
  actividadId: number,
  operacionClave: string,
): Promise<OperacionInterna> {
  const result = await client.query<OperacionRow>(
    `SELECT
       operacion.id,
       relacion.id AS actividad_operacion_id,
       operacion.clave,
       operacion.nombre,
       operacion.descripcion
     FROM public.actividad_vulnerable_operaciones relacion
     JOIN public.cat_operaciones_vulnerables operacion
       ON operacion.id = relacion.operacion_vulnerable_id
     WHERE relacion.actividad_vulnerable_id = $1
       AND operacion.clave = $2
       AND relacion.activo = TRUE
       AND operacion.activo = TRUE
     LIMIT 1`,
    [actividadId, operacionClave],
  );
  if (result.rows.length === 0) {
    throw new ActividadesVulnerablesError(
      400,
      'La operación vulnerable no pertenece a la actividad o está inactiva',
    );
  }

  const row = result.rows[0];
  return {
    ...toOperacionPublica(row),
    id: Number(row.id),
    actividad_operacion_id: Number(row.actividad_operacion_id),
  };
}

function pendingConfiguration(): ConfiguracionPldPublica {
  return {
    estado: 'pendiente',
    actividad: null,
    operacion: null,
    origen_seleccion: null,
    vigente_desde: null,
  };
}

function selectionRowToConfiguration(
  row: SeleccionRow | null | undefined,
): ConfiguracionPldPublica {
  if (!row) return pendingConfiguration();
  return {
    estado: 'completa',
    actividad: {
      clave: String(row.actividad_clave),
      nombre: String(row.actividad_nombre),
      fraccion: row.actividad_fraccion ?? null,
      descripcion: row.actividad_descripcion ?? null,
    },
    operacion: {
      clave: String(row.operacion_clave),
      nombre: String(row.operacion_nombre),
      descripcion: row.operacion_descripcion ?? null,
    },
    origen_seleccion: row.origen_seleccion,
    vigente_desde: row.vigente_desde
      ? new Date(row.vigente_desde).toISOString()
      : null,
  };
}

const HISTORICAL_SELECTION_SELECT = `
  SELECT
    seleccion.id,
    seleccion.cliente_id,
    seleccion.empresa_id,
    seleccion.empresa_actividad_vulnerable_id,
    seleccion.actividad_operacion_id,
    seleccion.origen_seleccion,
    seleccion.vigente_desde,
    actividad.id AS actividad_id,
    actividad.clave AS actividad_clave,
    actividad.nombre AS actividad_nombre,
    actividad.fraccion AS actividad_fraccion,
    actividad.descripcion AS actividad_descripcion,
    operacion.id AS operacion_id,
    operacion.clave AS operacion_clave,
    operacion.nombre AS operacion_nombre,
    operacion.descripcion AS operacion_descripcion
  FROM public.cliente_selecciones_pld seleccion
  JOIN public.clientes cliente
    ON cliente.id = seleccion.cliente_id
   AND cliente.empresa_id = seleccion.empresa_id
  JOIN public.empresa_actividades_vulnerables empresa_actividad
    ON empresa_actividad.id = seleccion.empresa_actividad_vulnerable_id
   AND empresa_actividad.empresa_id = seleccion.empresa_id
  JOIN public.actividad_vulnerable_operaciones actividad_operacion
    ON actividad_operacion.id = seleccion.actividad_operacion_id
   AND actividad_operacion.actividad_vulnerable_id =
       empresa_actividad.actividad_vulnerable_id
  JOIN public.cat_actividades_vulnerables_generales actividad
    ON actividad.id = actividad_operacion.actividad_vulnerable_id
  JOIN public.cat_operaciones_vulnerables operacion
    ON operacion.id = actividad_operacion.operacion_vulnerable_id
`;

export async function getCurrentClientPldSelection(
  db: DbClient,
  clienteId: number,
): Promise<SeleccionRow | null> {
  const result: QueryResult<SeleccionRow> = await db.query(
    `${HISTORICAL_SELECTION_SELECT}
     WHERE seleccion.cliente_id = $1
       AND seleccion.activo = TRUE
       AND seleccion.vigente_hasta IS NULL
       AND empresa_actividad.activo = TRUE
       AND actividad_operacion.activo = TRUE
       AND actividad.activo = TRUE
       AND operacion.activo = TRUE
     ORDER BY seleccion.id DESC
     LIMIT 1`,
    [clienteId],
  );
  return result.rows[0] ?? null;
}

export async function getClientPldConfiguration(
  db: DbClient,
  clienteId: number,
): Promise<ConfiguracionPldPublica> {
  return selectionRowToConfiguration(
    await getCurrentClientPldSelection(db, clienteId),
  );
}

export async function getProfilePldContext(
  db: DbClient,
  seleccionId: number | null,
): Promise<{
  contexto_pld: {
    actividad: { clave: string; nombre: string };
    operacion: { clave: string; nombre: string };
    origen_seleccion: string;
    vigente_desde: string | null;
  } | null;
  contexto_pld_pendiente: boolean;
}> {
  if (!seleccionId) {
    return { contexto_pld: null, contexto_pld_pendiente: true };
  }

  const result: QueryResult<SeleccionRow> = await db.query(
    `${HISTORICAL_SELECTION_SELECT}
     WHERE seleccion.id = $1
     LIMIT 1`,
    [seleccionId],
  );
  if (result.rows.length === 0) {
    return { contexto_pld: null, contexto_pld_pendiente: true };
  }

  const row = result.rows[0];
  return {
    contexto_pld: {
      actividad: {
        clave: String(row.actividad_clave),
        nombre: String(row.actividad_nombre),
      },
      operacion: {
        clave: String(row.operacion_clave),
        nombre: String(row.operacion_nombre),
      },
      origen_seleccion: String(row.origen_seleccion),
      vigente_desde: row.vigente_desde
        ? new Date(row.vigente_desde).toISOString()
        : null,
    },
    contexto_pld_pendiente: false,
  };
}

type ApplySelectionOptions = {
  mode: 'post' | 'put';
  actividad: PropiedadClaveNormalizada;
  operacion: PropiedadClaveNormalizada;
};

async function lockActiveSelectionForClient(
  client: PoolClient,
  clienteId: number,
): Promise<{ id: number } | null> {
  const result = await client.query<{ id: number }>(
    `SELECT id
     FROM public.cliente_selecciones_pld
     WHERE cliente_id = $1
       AND activo = TRUE
       AND vigente_hasta IS NULL
     ORDER BY id DESC
     LIMIT 1
     FOR UPDATE`,
    [clienteId],
  );
  return result.rows[0] ?? null;
}

async function getUsableSelectionById(
  client: PoolClient,
  selectionId: number,
): Promise<SeleccionRow | null> {
  const result = await client.query<SeleccionRow>(
    `${HISTORICAL_SELECTION_SELECT}
     WHERE seleccion.id = $1
       AND seleccion.activo = TRUE
       AND seleccion.vigente_hasta IS NULL
       AND empresa_actividad.activo = TRUE
       AND actividad_operacion.activo = TRUE
       AND actividad.activo = TRUE
       AND operacion.activo = TRUE
     LIMIT 1`,
    [selectionId],
  );
  return result.rows[0] ?? null;
}

export async function applyClientPldSelection(
  client: PoolClient,
  clienteId: number,
  empresaId: number,
  options: ApplySelectionOptions,
): Promise<ConfiguracionPldPublica> {
  const clientResult = await client.query(
    `SELECT empresa_id
     FROM public.clientes
     WHERE id = $1
     LIMIT 1`,
    [clienteId],
  );
  if (clientResult.rows.length === 0) {
    throw new ActividadesVulnerablesError(404, 'Cliente no encontrado');
  }
  if (Number(clientResult.rows[0].empresa_id) !== empresaId) {
    throw new ActividadesVulnerablesError(
      403,
      'El cliente no pertenece a la empresa indicada',
    );
  }

  const activeSelection = await lockActiveSelectionForClient(client, clienteId);
  const current = activeSelection
    ? await getUsableSelectionById(client, activeSelection.id)
    : null;
  const { actividad, operacion, mode } = options;

  if (!actividad.present && !operacion.present) {
    return selectionRowToConfiguration(current);
  }

  const activities = await getActiveCompanyActivities(client, empresaId, true);

  if (activities.length === 0) {
    throw new ActividadesVulnerablesError(
      400,
      'La empresa no tiene actividades vulnerables activas',
    );
  }

  let selectedActivity: ActividadEmpresaInterna;
  if (activities.length === 1) {
    selectedActivity = activities[0];
    if (actividad.present && actividad.value !== selectedActivity.clave) {
      throw new ActividadesVulnerablesError(
        400,
        'La actividad vulnerable no está asignada a la empresa',
      );
    }
    if (!operacion.present) {
      if (mode === 'put' && actividad.present) {
        throw new ActividadesVulnerablesError(
          400,
          'operacion_vulnerable_clave es obligatoria cuando se envía actividad_vulnerable_clave',
        );
      }
      return selectionRowToConfiguration(current);
    }
  } else {
    if (actividad.present !== operacion.present) {
      throw new ActividadesVulnerablesError(
        400,
        'actividad_vulnerable_clave y operacion_vulnerable_clave deben enviarse juntas',
      );
    }
    selectedActivity = activities.find(
      (item) => item.clave === actividad.value,
    ) as ActividadEmpresaInterna;
    if (!selectedActivity) {
      throw new ActividadesVulnerablesError(
        400,
        'La actividad vulnerable no está asignada a la empresa',
      );
    }
  }

  if (!operacion.value) {
    return selectionRowToConfiguration(current);
  }

  const selectedOperation = await resolveActiveOperationForActivity(
    client,
    selectedActivity.id,
    operacion.value,
  );

  if (
    current
    && Number(current.empresa_id) === empresaId
    && String(current.actividad_clave) === selectedActivity.clave
    && String(current.operacion_clave) === selectedOperation.clave
  ) {
    return selectionRowToConfiguration(current);
  }

  const origin: OrigenSeleccion =
    mode === 'put' && !current
      ? 'regularizacion'
      : activities.length === 1
        ? 'automatica'
        : 'manual';

  if (activeSelection) {
    await client.query(
      `UPDATE public.cliente_selecciones_pld
       SET activo = FALSE,
           vigente_hasta = NOW(),
           actualizado_en = NOW()
       WHERE id = $1`,
      [activeSelection.id],
    );
  }

  const inserted = await client.query(
    `INSERT INTO public.cliente_selecciones_pld (
       cliente_id,
       empresa_id,
       empresa_actividad_vulnerable_id,
       actividad_operacion_id,
       origen_seleccion
     )
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      clienteId,
      empresaId,
      selectedActivity.empresa_actividad_vulnerable_id,
      selectedOperation.actividad_operacion_id,
      origin,
    ],
  );

  const result = await client.query<SeleccionRow>(
    `${HISTORICAL_SELECTION_SELECT}
     WHERE seleccion.id = $1
     LIMIT 1`,
    [inserted.rows[0].id],
  );
  return selectionRowToConfiguration(result.rows[0]);
}

export async function assertCurrentSelectionIsUsable(
  client: PoolClient,
  clienteId: number,
  empresaId: number,
): Promise<SeleccionRow> {
  const selectionResult = await client.query<{
    id: number;
    empresa_actividad_vulnerable_id: number;
    actividad_operacion_id: number;
  }>(
    `SELECT
       id,
       empresa_actividad_vulnerable_id,
       actividad_operacion_id
     FROM public.cliente_selecciones_pld
     WHERE cliente_id = $1
       AND empresa_id = $2
       AND activo = TRUE
       AND vigente_hasta IS NULL
     ORDER BY id DESC
     LIMIT 1
     FOR UPDATE`,
    [clienteId, empresaId],
  );
  if (selectionResult.rows.length === 0) {
    throw new ActividadesVulnerablesError(409, 'Configuración PLD pendiente');
  }

  const selection = selectionResult.rows[0];
  const companyActivityResult = await client.query<{
    actividad_vulnerable_id: number;
  }>(
    `SELECT empresa_actividad.actividad_vulnerable_id
     FROM public.empresa_actividades_vulnerables empresa_actividad
     JOIN public.cat_actividades_vulnerables_generales actividad
       ON actividad.id = empresa_actividad.actividad_vulnerable_id
      AND actividad.activo = TRUE
     WHERE empresa_actividad.id = $1
       AND empresa_actividad.empresa_id = $2
       AND empresa_actividad.activo = TRUE
     FOR SHARE OF empresa_actividad, actividad`,
    [selection.empresa_actividad_vulnerable_id, empresaId],
  );
  if (companyActivityResult.rows.length === 0) {
    throw new ActividadesVulnerablesError(409, 'Configuración PLD pendiente');
  }

  const activityId = Number(
    companyActivityResult.rows[0].actividad_vulnerable_id,
  );
  const activityOperationResult = await client.query(
    `SELECT actividad_operacion.id
     FROM public.actividad_vulnerable_operaciones actividad_operacion
     JOIN public.cat_operaciones_vulnerables operacion
       ON operacion.id = actividad_operacion.operacion_vulnerable_id
      AND operacion.activo = TRUE
     WHERE actividad_operacion.id = $1
       AND actividad_operacion.actividad_vulnerable_id = $2
       AND actividad_operacion.activo = TRUE
     FOR SHARE OF actividad_operacion, operacion`,
    [selection.actividad_operacion_id, activityId],
  );
  if (activityOperationResult.rows.length === 0) {
    throw new ActividadesVulnerablesError(409, 'Configuración PLD pendiente');
  }

  const result = await client.query<SeleccionRow>(
    `${HISTORICAL_SELECTION_SELECT}
     WHERE seleccion.id = $1
     LIMIT 1`,
    [selection.id],
  );
  if (result.rows.length === 0) {
    throw new ActividadesVulnerablesError(409, 'Configuración PLD pendiente');
  }
  return result.rows[0];
}
