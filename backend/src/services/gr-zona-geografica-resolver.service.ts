import type { Pool, PoolClient } from 'pg';

type DbClient = Pool | PoolClient;

const CRITERIO_CODIGO = 'ZONA_GEOGRAFICA' as const;
const RESOLVER_CODIGO = 'ZONA_GEOGRAFICA' as const;
const FUENTE_KYC = 'datos_completos.contacto.domicilio' as const;

export type MarcaCanonicaZonaGeografica =
  | 'GAFI_ALTO_RIESGO'
  | 'GAFI_LISTA_GRIS'
  | 'REGIMEN_FISCAL_PREFERENTE'
  | 'SIN_MARCA_PLD';

const MARCAS_PLD: ReadonlyArray<Exclude<MarcaCanonicaZonaGeografica, 'SIN_MARCA_PLD'>> = [
  'GAFI_ALTO_RIESGO',
  'GAFI_LISTA_GRIS',
  'REGIMEN_FISCAL_PREFERENTE',
];

export type GrZonaGeograficaErrorCode =
  | 'GR_ZONA_CLIENTE_NO_ENCONTRADO'
  | 'GR_ZONA_TIPO_CLIENTE_NO_SOPORTADO'
  | 'GR_ZONA_MATRIZ_NO_DISPONIBLE'
  | 'GR_ZONA_CRITERIO_NO_CONFIGURADO'
  | 'GR_ZONA_KYC_NO_RESOLVIBLE'
  | 'GR_ZONA_PAIS_AMBIGUO'
  | 'GR_ZONA_JURISDICCION_AMBIGUA'
  | 'GR_ZONA_CONFIGURACION_INCONSISTENTE'
  | 'GR_ZONA_REGLA_FALTANTE_PARA_MARCA'
  | 'GR_ZONA_PUNTAJE_REGLA_INVALIDO'
  | 'GR_ZONA_REGLA_DUPLICADA_PARA_MARCA'
  | 'GR_ZONA_EMPATE_PRIORIDAD_MAXIMA'
  | 'GR_ZONA_CONFIGURACION_NO_DETERMINISTA';

const ERROR_MESSAGES: Record<GrZonaGeograficaErrorCode, string> = {
  GR_ZONA_CLIENTE_NO_ENCONTRADO: 'Cliente no encontrado',
  GR_ZONA_TIPO_CLIENTE_NO_SOPORTADO: 'El tipo de cliente no es compatible con el resolvedor geografico',
  GR_ZONA_MATRIZ_NO_DISPONIBLE: 'La matriz indicada no esta publicada y activa para la empresa del cliente',
  GR_ZONA_CRITERIO_NO_CONFIGURADO: 'La matriz no contiene el criterio canonico ZONA_GEOGRAFICA',
  GR_ZONA_KYC_NO_RESOLVIBLE: 'No fue posible resolver de forma segura el pais o jurisdiccion del KYC',
  GR_ZONA_PAIS_AMBIGUO: 'El pais del KYC coincide con mas de un registro canonico',
  GR_ZONA_JURISDICCION_AMBIGUA: 'La jurisdiccion del KYC no tiene una resolucion canonica unica',
  GR_ZONA_CONFIGURACION_INCONSISTENTE: 'La configuracion geografica o de matriz es inconsistente',
  GR_ZONA_REGLA_FALTANTE_PARA_MARCA: 'La matriz no contiene una regla para una marca geografica detectada',
  GR_ZONA_PUNTAJE_REGLA_INVALIDO: 'La regla geografica tiene un puntaje invalido',
  GR_ZONA_REGLA_DUPLICADA_PARA_MARCA: 'La matriz contiene mas de una regla para la misma marca geografica',
  GR_ZONA_EMPATE_PRIORIDAD_MAXIMA: 'Las reglas geograficas empatan en la prioridad maxima',
  GR_ZONA_CONFIGURACION_NO_DETERMINISTA: 'La configuracion geografica no permite obtener un resultado unico',
};

export class GrZonaGeograficaError extends Error {
  constructor(
    public readonly code: GrZonaGeograficaErrorCode,
    public readonly contexto?: ZonaGeograficaContextoResuelto,
  ) {
    super(ERROR_MESSAGES[code]);
    this.name = 'GrZonaGeograficaError';
  }
}

type TipoCliente = 'persona_fisica' | 'persona_moral' | 'fideicomiso';

export type PaisCanonicoZonaGeografica = {
  id: string;
  clave: string;
  nombre: string;
};

export type JurisdiccionCanonicaZonaGeografica = {
  codigo: string;
  nombre_normalizado: string;
  tipo_entidad_geografica: 'PAIS' | 'TERRITORIO' | 'ZONA';
};

export type ClasificacionPldZonaGeografica = {
  jurisdiccion_id: string;
  version_id: string;
  tipo_clasificacion:
    | 'GAFI_ALTO_RIESGO'
    | 'GAFI_LISTA_GRIS'
    | 'REGIMEN_FISCAL_PREFERENTE';
  fuente_codigo: string;
  fuente_nombre: string;
  fuente_version: string;
  fecha_publicacion: string;
  vigente_desde: string;
  vigente_hasta: string | null;
  jurisdiccion_codigo: string;
  nombre_fuente: string;
  nombre_normalizado: string;
  tipo_entidad_geografica: 'PAIS' | 'TERRITORIO' | 'ZONA';
};

export type ReglaMatrizZonaGeografica = {
  id: number;
  codigo: string;
  marca_canonica: string | null;
  condicion_controlada: string | null;
  puntaje: number | null;
  prioridad: number;
  alto_automatico: boolean;
  causa_codigo: string | null;
};

export type ReglaAplicadaZonaGeografica = Omit<
  ReglaMatrizZonaGeografica,
  'marca_canonica' | 'puntaje'
> & {
  marca_canonica: MarcaCanonicaZonaGeografica;
  puntaje: 1 | 2 | 3;
};

export type EvidenciaZonaGeografica = {
  tipo_cliente: TipoCliente;
  fuente_kyc: typeof FUENTE_KYC;
  valor_original: {
    pais: string;
    estado: string | null;
    codigo_postal: string | null;
  };
  pais_canonico: PaisCanonicoZonaGeografica | null;
  jurisdiccion_canonica: JurisdiccionCanonicaZonaGeografica | null;
  pais_id: string | null;
  clasificaciones_pld_activas: ClasificacionPldZonaGeografica[];
  marcas_canonicas_detectadas: MarcaCanonicaZonaGeografica[];
  reglas_coincidentes: ReglaAplicadaZonaGeografica[];
  regla_matriz_aplicada: null;
  match: {
    marca_canonica: null;
    condicion_controlada: null;
  };
  puntaje_resultante: null;
};

export type ZonaGeograficaContextoResuelto = {
  criterio_codigo: typeof CRITERIO_CODIGO;
  resolver_codigo: typeof RESOLVER_CODIGO;
  matriz_criterio_id: number;
  reglas_matriz: ReglaMatrizZonaGeografica[];
  evidencia: EvidenciaZonaGeografica;
};

export type ZonaGeograficaResultado = Omit<
  ZonaGeograficaContextoResuelto,
  'reglas_matriz' | 'evidencia'
> & {
  puntaje: 1 | 2 | 3;
  regla_aplicada: ReglaAplicadaZonaGeografica;
  evidencia: Omit<
    EvidenciaZonaGeografica,
    'regla_matriz_aplicada' | 'match' | 'puntaje_resultante'
  > & {
    regla_matriz_aplicada: ReglaAplicadaZonaGeografica;
    match: {
      marca_canonica: MarcaCanonicaZonaGeografica;
      condicion_controlada: null;
    };
    puntaje_resultante: 1 | 2 | 3;
  };
};

type ClienteRow = {
  id: unknown;
  empresa_id: unknown;
  tipo_cliente: unknown;
  datos_completos: unknown;
};

type CriterioRow = {
  id: unknown;
  codigo: unknown;
  ambito: unknown;
  tipo_resolucion: unknown;
  resolver_codigo: unknown;
};

type PaisRow = { id: unknown; clave: unknown; descripcion: unknown };

type ClasificacionRow = {
  jurisdiccion_id: unknown;
  version_id: unknown;
  tipo_clasificacion: unknown;
  fuente_codigo: unknown;
  fuente_nombre: unknown;
  fuente_version: unknown;
  fecha_publicacion: unknown;
  vigente_desde: unknown;
  vigente_hasta: unknown;
  jurisdiccion_codigo: unknown;
  nombre_fuente: unknown;
  nombre_normalizado: unknown;
  tipo_entidad_geografica: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requiredPositiveInteger(value: unknown): number {
  const parsed = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isSafeInteger(parsed) || Number(parsed) <= 0) {
    throw new GrZonaGeograficaError('GR_ZONA_CONFIGURACION_INCONSISTENTE');
  }
  return Number(parsed);
}

function requiredBigintString(value: unknown): string {
  const normalized = typeof value === 'bigint' ? value.toString() : String(value ?? '');
  if (!/^[1-9]\d*$/.test(normalized)) {
    throw new GrZonaGeograficaError('GR_ZONA_CONFIGURACION_INCONSISTENTE');
  }
  return normalized;
}

function requiredString(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new GrZonaGeograficaError('GR_ZONA_CONFIGURACION_INCONSISTENTE');
  }
  return value.trim();
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function nullableDatabaseString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function dateOnly(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  throw new GrZonaGeograficaError('GR_ZONA_CONFIGURACION_INCONSISTENTE');
}

function tipoCliente(value: unknown): TipoCliente {
  if (value === 'persona_fisica' || value === 'persona_moral' || value === 'fideicomiso') {
    return value;
  }
  throw new GrZonaGeograficaError('GR_ZONA_TIPO_CLIENTE_NO_SOPORTADO');
}

function extractKycDomicilio(datosCompletos: unknown) {
  if (!isRecord(datosCompletos)) {
    throw new GrZonaGeograficaError('GR_ZONA_KYC_NO_RESOLVIBLE');
  }
  const contacto = datosCompletos.contacto;
  if (!isRecord(contacto)) {
    throw new GrZonaGeograficaError('GR_ZONA_KYC_NO_RESOLVIBLE');
  }
  const domicilio = isRecord(contacto.domicilio) ? contacto.domicilio : null;
  if (!domicilio) {
    throw new GrZonaGeograficaError('GR_ZONA_KYC_NO_RESOLVIBLE');
  }
  const pais = optionalString(domicilio.pais);
  if (!pais) {
    throw new GrZonaGeograficaError('GR_ZONA_KYC_NO_RESOLVIBLE');
  }
  return {
    pais,
    estado: optionalString(domicilio.estado),
    codigo_postal: optionalString(domicilio.codigo_postal),
  };
}

function normalizePais(row: PaisRow): PaisCanonicoZonaGeografica {
  return {
    id: requiredBigintString(row.id),
    clave: requiredString(row.clave),
    nombre: requiredString(row.descripcion),
  };
}

function normalizeClassification(row: ClasificacionRow): ClasificacionPldZonaGeografica {
  const classificationType = requiredString(row.tipo_clasificacion);
  if (
    classificationType !== 'GAFI_ALTO_RIESGO'
    && classificationType !== 'GAFI_LISTA_GRIS'
    && classificationType !== 'REGIMEN_FISCAL_PREFERENTE'
  ) {
    throw new GrZonaGeograficaError('GR_ZONA_CONFIGURACION_INCONSISTENTE');
  }
  const entityType = requiredString(row.tipo_entidad_geografica);
  if (entityType !== 'PAIS' && entityType !== 'TERRITORIO' && entityType !== 'ZONA') {
    throw new GrZonaGeograficaError('GR_ZONA_CONFIGURACION_INCONSISTENTE');
  }
  return {
    jurisdiccion_id: requiredBigintString(row.jurisdiccion_id),
    version_id: requiredBigintString(row.version_id),
    tipo_clasificacion: classificationType,
    fuente_codigo: requiredString(row.fuente_codigo),
    fuente_nombre: requiredString(row.fuente_nombre),
    fuente_version: requiredString(row.fuente_version),
    fecha_publicacion: dateOnly(row.fecha_publicacion),
    vigente_desde: dateOnly(row.vigente_desde),
    vigente_hasta: row.vigente_hasta === null ? null : dateOnly(row.vigente_hasta),
    jurisdiccion_codigo: requiredString(row.jurisdiccion_codigo),
    nombre_fuente: requiredString(row.nombre_fuente),
    nombre_normalizado: requiredString(row.nombre_normalizado),
    tipo_entidad_geografica: entityType,
  };
}

function normalizeRule(row: Record<string, unknown>): ReglaMatrizZonaGeografica {
  const rawScore = row.puntaje === null ? null : Number(row.puntaje);
  if (typeof row.alto_automatico !== 'boolean') {
    throw new GrZonaGeograficaError('GR_ZONA_CONFIGURACION_INCONSISTENTE');
  }
  const priority = Number(row.prioridad);
  if (!Number.isSafeInteger(priority) || priority < 0) {
    throw new GrZonaGeograficaError('GR_ZONA_CONFIGURACION_INCONSISTENTE');
  }
  const canonicalMark = nullableDatabaseString(row.marca_canonica);
  const controlledCondition = nullableDatabaseString(row.condicion_controlada);
  if (!canonicalMark && !controlledCondition) {
    throw new GrZonaGeograficaError('GR_ZONA_CONFIGURACION_INCONSISTENTE');
  }
  return {
    id: requiredPositiveInteger(row.id),
    codigo: requiredString(row.codigo),
    marca_canonica: canonicalMark,
    condicion_controlada: controlledCondition,
    puntaje: rawScore,
    prioridad: priority,
    alto_automatico: row.alto_automatico,
    causa_codigo: nullableDatabaseString(row.causa_codigo),
  };
}

function marcasCanonicasDetectadas(
  classifications: ClasificacionPldZonaGeografica[],
): MarcaCanonicaZonaGeografica[] {
  const detected = new Set(classifications.map((item) => item.tipo_clasificacion));
  const marks = MARCAS_PLD.filter((mark) => detected.has(mark));
  return marks.length > 0 ? marks : ['SIN_MARCA_PLD'];
}

function validMatchedRule(
  rule: ReglaMatrizZonaGeografica,
  mark: MarcaCanonicaZonaGeografica,
  contexto: ZonaGeograficaContextoResuelto,
): ReglaAplicadaZonaGeografica {
  if (rule.puntaje !== 1 && rule.puntaje !== 2 && rule.puntaje !== 3) {
    throw new GrZonaGeograficaError('GR_ZONA_PUNTAJE_REGLA_INVALIDO',contexto);
  }
  return { ...rule, marca_canonica: mark, puntaje: rule.puntaje };
}

async function loadClassifications(
  db: DbClient,
  pais: PaisCanonicoZonaGeografica | null,
  originalCountry: string,
): Promise<ClasificacionPldZonaGeografica[]> {
  const result = await db.query<ClasificacionRow>(
    `SELECT j.id AS jurisdiccion_id, v.id AS version_id,
            v.tipo_clasificacion, v.fuente_codigo, v.fuente_nombre,
            v.fuente_version, v.fecha_publicacion, v.vigente_desde,
            v.vigente_hasta, j.jurisdiccion_codigo, j.nombre_fuente,
            j.nombre_normalizado, j.tipo_entidad_geografica
       FROM public.clasificacion_geografica_pld_version v
       JOIN public.clasificacion_geografica_pld_jurisdiccion j
         ON j.version_id=v.id
      WHERE v.activa=TRUE
        AND v.vigente_desde <= CURRENT_DATE
        AND (v.vigente_hasta IS NULL OR v.vigente_hasta >= CURRENT_DATE)
        AND (
          ($1::bigint IS NOT NULL AND j.pais_id=$1::bigint)
          OR ($1::bigint IS NULL AND j.pais_id IS NULL
              AND pg_catalog.upper(pg_catalog.btrim(j.jurisdiccion_codigo))=
                  pg_catalog.upper(pg_catalog.btrim($2::text)))
        )
      ORDER BY v.tipo_clasificacion,v.id,j.id`,
    [pais?.id ?? null, originalCountry],
  );
  return result.rows.map(normalizeClassification);
}

export async function obtenerContextoZonaGeografica(
  db: DbClient,
  clienteId: number,
  matrizVersionId: number,
): Promise<ZonaGeograficaContextoResuelto> {
  if (!Number.isSafeInteger(clienteId) || clienteId <= 0
      || !Number.isSafeInteger(matrizVersionId) || matrizVersionId <= 0) {
    throw new GrZonaGeograficaError('GR_ZONA_CONFIGURACION_INCONSISTENTE');
  }

  const clientResult = await db.query<ClienteRow>(
    `SELECT id,empresa_id,tipo_cliente,datos_completos
       FROM public.clientes WHERE id=$1 LIMIT 1`,
    [clienteId],
  );
  if (clientResult.rows.length === 0) {
    throw new GrZonaGeograficaError('GR_ZONA_CLIENTE_NO_ENCONTRADO');
  }
  const client = clientResult.rows[0];
  const clientType = tipoCliente(client.tipo_cliente);
  const companyId = requiredPositiveInteger(client.empresa_id);
  const kyc = extractKycDomicilio(client.datos_completos);

  const criterionResult = await db.query<CriterioRow>(
    `SELECT mc.id,mc.codigo,mc.ambito,cgv.tipo_resolucion,cgv.resolver_codigo
       FROM public.matriz_empresa_version mv
       JOIN public.matriz_criterio mc ON mc.matriz_version_id=mv.id
       JOIN public.catalogo_criterio_gr_version cgv
         ON cgv.id=mc.catalogo_criterio_gr_version_id
       JOIN public.catalogo_criterio_gr cg ON cg.id=cgv.criterio_gr_id
      WHERE mv.id=$1 AND mv.empresa_id=$2
        AND mv.estado_editorial='PUBLICADA' AND mv.activa=TRUE
        AND mc.codigo=$3 AND mc.ambito='GR'
        AND cg.codigo_canonico=$3
        AND cgv.tipo_resolucion='CATALOGO_GLOBAL'
        AND cgv.resolver_codigo=$3`,
    [matrizVersionId, companyId, CRITERIO_CODIGO],
  );
  if (criterionResult.rows.length === 0) {
    const matrixResult = await db.query(
      `SELECT 1 FROM public.matriz_empresa_version
        WHERE id=$1 AND empresa_id=$2
          AND estado_editorial='PUBLICADA' AND activa=TRUE`,
      [matrizVersionId, companyId],
    );
    throw new GrZonaGeograficaError(
      matrixResult.rows.length === 0
        ? 'GR_ZONA_MATRIZ_NO_DISPONIBLE'
        : 'GR_ZONA_CRITERIO_NO_CONFIGURADO',
    );
  }
  if (criterionResult.rows.length !== 1) {
    throw new GrZonaGeograficaError('GR_ZONA_CONFIGURACION_INCONSISTENTE');
  }
  const criterionId = requiredPositiveInteger(criterionResult.rows[0].id);

  const countryResult = await db.query<PaisRow>(
    `SELECT id,clave,descripcion FROM public.cat_paises
      WHERE pg_catalog.upper(pg_catalog.btrim(clave))=
            pg_catalog.upper(pg_catalog.btrim($1::text))
      ORDER BY id`,
    [kyc.pais],
  );
  if (countryResult.rows.length > 1) {
    throw new GrZonaGeograficaError('GR_ZONA_PAIS_AMBIGUO');
  }
  const country = countryResult.rows.length === 1 ? normalizePais(countryResult.rows[0]) : null;
  const classifications = await loadClassifications(db, country, kyc.pais);
  if (!country && classifications.length === 0) {
    throw new GrZonaGeograficaError('GR_ZONA_KYC_NO_RESOLVIBLE');
  }

  const canonicalJurisdictions = new Map<string, JurisdiccionCanonicaZonaGeografica>();
  for (const classification of classifications) {
    const jurisdiction = {
      codigo: classification.jurisdiccion_codigo,
      nombre_normalizado: classification.nombre_normalizado,
      tipo_entidad_geografica: classification.tipo_entidad_geografica,
    };
    canonicalJurisdictions.set(JSON.stringify(jurisdiction), jurisdiction);
  }
  if (!country && canonicalJurisdictions.size !== 1) {
    throw new GrZonaGeograficaError('GR_ZONA_JURISDICCION_AMBIGUA');
  }

  const rulesResult = await db.query<Record<string, unknown>>(
    `SELECT id,codigo,marca_canonica,condicion_controlada,puntaje,
            prioridad,alto_automatico,causa_codigo
       FROM public.matriz_regla
      WHERE matriz_version_id=$1 AND criterio_id=$2
      ORDER BY prioridad DESC,id ASC`,
    [matrizVersionId, criterionId],
  );

  return {
    criterio_codigo: CRITERIO_CODIGO,
    resolver_codigo: RESOLVER_CODIGO,
    matriz_criterio_id: criterionId,
    reglas_matriz: rulesResult.rows.map(normalizeRule),
    evidencia: {
      tipo_cliente: clientType,
      fuente_kyc: FUENTE_KYC,
      valor_original: kyc,
      pais_canonico: country,
      jurisdiccion_canonica: country ? null : [...canonicalJurisdictions.values()][0],
      pais_id: country?.id ?? null,
      clasificaciones_pld_activas: classifications,
      marcas_canonicas_detectadas: marcasCanonicasDetectadas(classifications),
      reglas_coincidentes: [],
      regla_matriz_aplicada: null,
      match: { marca_canonica: null, condicion_controlada: null },
      puntaje_resultante: null,
    },
  };
}

export function aplicarReglasZonaGeografica(
  contexto: ZonaGeograficaContextoResuelto,
): ZonaGeograficaResultado {
  const matchingRules: ReglaAplicadaZonaGeografica[] = [];

  for (const mark of contexto.evidencia.marcas_canonicas_detectadas) {
    const rulesForMark = contexto.reglas_matriz.filter(
      (rule) => rule.marca_canonica === mark,
    );
    if (rulesForMark.length === 0) {
      throw new GrZonaGeograficaError('GR_ZONA_REGLA_FALTANTE_PARA_MARCA',contexto);
    }
    if (rulesForMark.length > 1) {
      throw new GrZonaGeograficaError('GR_ZONA_REGLA_DUPLICADA_PARA_MARCA',contexto);
    }
    matchingRules.push(validMatchedRule(rulesForMark[0],mark,contexto));
  }

  if (matchingRules.length === 0) {
    throw new GrZonaGeograficaError('GR_ZONA_CONFIGURACION_NO_DETERMINISTA',contexto);
  }
  const highestPriority = Math.max(...matchingRules.map((rule) => rule.prioridad));
  const winners = matchingRules.filter((rule) => rule.prioridad === highestPriority);
  if (winners.length !== 1) {
    throw new GrZonaGeograficaError('GR_ZONA_EMPATE_PRIORIDAD_MAXIMA',contexto);
  }
  const winner = winners[0];

  return {
    criterio_codigo: contexto.criterio_codigo,
    resolver_codigo: contexto.resolver_codigo,
    matriz_criterio_id: contexto.matriz_criterio_id,
    puntaje: winner.puntaje,
    regla_aplicada: winner,
    evidencia: {
      ...contexto.evidencia,
      reglas_coincidentes: matchingRules,
      regla_matriz_aplicada: winner,
      match: {
        marca_canonica: winner.marca_canonica,
        condicion_controlada: null,
      },
      puntaje_resultante: winner.puntaje,
    },
  };
}

export async function resolverZonaGeografica(
  db: DbClient,
  clienteId: number,
  matrizVersionId: number,
): Promise<ZonaGeograficaResultado> {
  const contexto = await obtenerContextoZonaGeografica(db,clienteId,matrizVersionId);
  return aplicarReglasZonaGeografica(contexto);
}
