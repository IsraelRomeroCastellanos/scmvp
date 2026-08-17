import type { Pool, PoolClient } from 'pg';

type DbClient = Pool | PoolClient;
const CODIGO = 'ACTIVIDAD_ECONOMICA' as const;

export type MarcaActividad = 'AV' | 'HUACHICOL' | 'DOBLE_USO' | 'PEP' | 'PEP_EXTRANJERO' | 'OSFL' | 'SIN_MARCA_ACTIVIDAD';
type TipoCliente = 'persona_fisica' | 'persona_moral';
type TipoCatalogo = 'ACTIVIDAD_ECONOMICA_PF' | 'GIRO_MERCANTIL_PM';
type Puntaje = 1 | 2 | 3;

export type GrActividadEconomicaErrorCode =
  | 'GR_ACTIVIDAD_CLIENTE_NO_ENCONTRADO' | 'GR_ACTIVIDAD_TIPO_CLIENTE_NO_SOPORTADO'
  | 'GR_ACTIVIDAD_MATRIZ_NO_DISPONIBLE' | 'GR_ACTIVIDAD_CRITERIO_NO_CONFIGURADO'
  | 'GR_ACTIVIDAD_CONTRATO_INCONSISTENTE' | 'GR_ACTIVIDAD_KYC_AUSENTE'
  | 'GR_ACTIVIDAD_KYC_NO_RESOLVIBLE' | 'GR_ACTIVIDAD_CLAVE_CATALOGO_INVALIDA'
  | 'GR_ACTIVIDAD_VERSION_GLOBAL_AUSENTE' | 'GR_ACTIVIDAD_VERSION_GLOBAL_AMBIGUA'
  | 'GR_ACTIVIDAD_REGLA_FALTANTE_PARA_MARCA' | 'GR_ACTIVIDAD_REGLA_DUPLICADA_PARA_MARCA'
  | 'GR_ACTIVIDAD_PUNTAJE_REGLA_INVALIDO' | 'GR_ACTIVIDAD_EMPATE_PRIORIDAD_MAXIMA'
  | 'GR_ACTIVIDAD_CONFIGURACION_NO_DETERMINISTA';

const MENSAJES: Record<GrActividadEconomicaErrorCode,string> = {
  GR_ACTIVIDAD_CLIENTE_NO_ENCONTRADO: 'Cliente no encontrado',
  GR_ACTIVIDAD_TIPO_CLIENTE_NO_SOPORTADO: 'El tipo de cliente no tiene un catalogo de actividad aprobado',
  GR_ACTIVIDAD_MATRIZ_NO_DISPONIBLE: 'La matriz indicada no esta publicada y activa para la empresa',
  GR_ACTIVIDAD_CRITERIO_NO_CONFIGURADO: 'La matriz no contiene el criterio ACTIVIDAD_ECONOMICA',
  GR_ACTIVIDAD_CONTRATO_INCONSISTENTE: 'La configuracion del criterio ACTIVIDAD_ECONOMICA es inconsistente',
  GR_ACTIVIDAD_KYC_AUSENTE: 'El KYC no contiene actividad economica o giro mercantil',
  GR_ACTIVIDAD_KYC_NO_RESOLVIBLE: 'La actividad economica o giro no contiene una clave canonica resolvible',
  GR_ACTIVIDAD_CLAVE_CATALOGO_INVALIDA: 'La clave no existe o no esta activa en el catalogo maestro',
  GR_ACTIVIDAD_VERSION_GLOBAL_AUSENTE: 'No existe una clasificacion global activa y vigente',
  GR_ACTIVIDAD_VERSION_GLOBAL_AMBIGUA: 'Existe mas de una clasificacion global activa y vigente',
  GR_ACTIVIDAD_REGLA_FALTANTE_PARA_MARCA: 'La matriz no contiene una regla para una marca detectada',
  GR_ACTIVIDAD_REGLA_DUPLICADA_PARA_MARCA: 'La matriz contiene reglas duplicadas para una marca',
  GR_ACTIVIDAD_PUNTAJE_REGLA_INVALIDO: 'Una regla contiene un puntaje invalido',
  GR_ACTIVIDAD_EMPATE_PRIORIDAD_MAXIMA: 'Las reglas empatan en la prioridad maxima',
  GR_ACTIVIDAD_CONFIGURACION_NO_DETERMINISTA: 'La configuracion no permite obtener un resultado unico',
};

export class GrActividadEconomicaError extends Error {
  constructor(public readonly code: GrActividadEconomicaErrorCode) { super(MENSAJES[code]); this.name='GrActividadEconomicaError'; }
}

export type ReglaMatrizActividad = { id:number; codigo:string; marca_canonica:string|null; puntaje:number|null; prioridad:number; alto_automatico:boolean; causa_codigo:string|null; };
export type ReglaAplicadaActividad = Omit<ReglaMatrizActividad,'marca_canonica'|'puntaje'> & { marca_canonica:MarcaActividad; puntaje:Puntaje };
export type ClasificacionActividad = { version_id:string; tipo_catalogo:TipoCatalogo; fuente_codigo:string; fuente_nombre:string; fuente_version:string; fecha_publicacion:string|null; vigente_desde:string; vigente_hasta:string|null; item_id:string; marca_canonica:Exclude<MarcaActividad,'SIN_MARCA_ACTIVIDAD'>; categoria_fuente:string|null; descripcion_fuente:string; observacion:string|null; };
export type EvidenciaActividad = {
  tipo_cliente:TipoCliente; fuente_kyc:'datos_completos.persona.actividad_economica'|'datos_completos.empresa.giro_mercantil'|'datos_completos.empresa.giro';
  valor_original:{ clave:string; descripcion:string|null; formato:'objeto'|'string' };
  catalogo_tipo:TipoCatalogo; catalogo_item:{ id:string; clave:string; descripcion:string };
  clasificaciones_pld_activas:ClasificacionActividad[]; marcas_canonicas_detectadas:MarcaActividad[];
  reglas_coincidentes:ReglaAplicadaActividad[]; regla_matriz_aplicada:ReglaAplicadaActividad;
  match:{ marca_canonica:MarcaActividad; condicion_controlada:null }; puntaje_resultante:Puntaje;
};
export type ResultadoActividad = { criterio_codigo:typeof CODIGO; resolver_codigo:typeof CODIGO; matriz_criterio_id:number; puntaje:Puntaje; regla_aplicada:ReglaAplicadaActividad; evidencia:EvidenciaActividad };
export type ContextoMatchingActividad = Omit<ResultadoActividad,'puntaje'|'regla_aplicada'|'evidencia'> & { reglas_matriz:ReglaMatrizActividad[]; evidencia:Omit<EvidenciaActividad,'reglas_coincidentes'|'regla_matriz_aplicada'|'match'|'puntaje_resultante'> };

const record = (v:unknown): v is Record<string,unknown> => Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
const str = (v:unknown):string => { if(typeof v!=='string'||!v.trim()) throw new GrActividadEconomicaError('GR_ACTIVIDAD_CONTRATO_INCONSISTENTE'); return v.trim(); };
const nullable = (v:unknown):string|null => typeof v==='string'&&v.length>0?v:null;
const positive = (v:unknown):number => { const n=Number(v); if(!Number.isSafeInteger(n)||n<=0) throw new GrActividadEconomicaError('GR_ACTIVIDAD_CONTRATO_INCONSISTENTE'); return n; };
const bigintString = (v:unknown):string => { const s=typeof v==='bigint'?v.toString():String(v??''); if(!/^[1-9]\d*$/.test(s)) throw new GrActividadEconomicaError('GR_ACTIVIDAD_CONTRATO_INCONSISTENTE'); return s; };
const date = (v:unknown):string => v instanceof Date&&!Number.isNaN(v.getTime())?v.toISOString().slice(0,10):typeof v==='string'&&/^\d{4}-\d{2}-\d{2}/.test(v)?v.slice(0,10):(()=>{throw new GrActividadEconomicaError('GR_ACTIVIDAD_CONTRATO_INCONSISTENTE');})();

function kyc(datos:unknown,tipo:unknown) {
  if(!record(datos)) throw new GrActividadEconomicaError('GR_ACTIVIDAD_KYC_AUSENTE');
  let valor:unknown; let fuente:EvidenciaActividad['fuente_kyc']; let catalogo:TipoCatalogo; let tabla:string;
  if(tipo==='persona_fisica') { valor=record(datos.persona)?datos.persona.actividad_economica:undefined; fuente='datos_completos.persona.actividad_economica'; catalogo='ACTIVIDAD_ECONOMICA_PF'; tabla='cat_actividades_economicas'; }
  else if(tipo==='persona_moral') { const e=record(datos.empresa)?datos.empresa:null; valor=e?.giro_mercantil??e?.giro; fuente=e?.giro_mercantil!==undefined?'datos_completos.empresa.giro_mercantil':'datos_completos.empresa.giro'; catalogo='GIRO_MERCANTIL_PM'; tabla='cat_giros_mercantiles'; }
  else throw new GrActividadEconomicaError('GR_ACTIVIDAD_TIPO_CLIENTE_NO_SOPORTADO');
  if(valor===undefined||valor===null||valor==='') throw new GrActividadEconomicaError('GR_ACTIVIDAD_KYC_AUSENTE');
  if(typeof valor==='string') { const clave=valor.trim(); if(!clave) throw new GrActividadEconomicaError('GR_ACTIVIDAD_KYC_NO_RESOLVIBLE'); return {tipo:tipo as TipoCliente,fuente,catalogo,tabla,original:{clave,descripcion:null,formato:'string' as const}}; }
  if(record(valor)&&typeof valor.clave==='string'&&valor.clave.trim()) return {tipo:tipo as TipoCliente,fuente,catalogo,tabla,original:{clave:valor.clave.trim(),descripcion:typeof valor.descripcion==='string'&&valor.descripcion.trim()?valor.descripcion.trim():null,formato:'objeto' as const}};
  throw new GrActividadEconomicaError('GR_ACTIVIDAD_KYC_NO_RESOLVIBLE');
}

function regla(row:Record<string,unknown>):ReglaMatrizActividad { const prioridad=Number(row.prioridad); if(!Number.isSafeInteger(prioridad)||prioridad<0||typeof row.alto_automatico!=='boolean') throw new GrActividadEconomicaError('GR_ACTIVIDAD_CONTRATO_INCONSISTENTE'); return {id:positive(row.id),codigo:str(row.codigo),marca_canonica:nullable(row.marca_canonica),puntaje:row.puntaje===null?null:Number(row.puntaje),prioridad,alto_automatico:row.alto_automatico,causa_codigo:nullable(row.causa_codigo)}; }

export function aplicarReglasActividadEconomica(contexto:ContextoMatchingActividad):ResultadoActividad {
  const coincidentes:ReglaAplicadaActividad[]=[];
  for(const marca of contexto.evidencia.marcas_canonicas_detectadas) {
    const candidatas=contexto.reglas_matriz.filter(r=>r.marca_canonica===marca);
    if(candidatas.length===0) throw new GrActividadEconomicaError('GR_ACTIVIDAD_REGLA_FALTANTE_PARA_MARCA');
    if(candidatas.length>1) throw new GrActividadEconomicaError('GR_ACTIVIDAD_REGLA_DUPLICADA_PARA_MARCA');
    const r=candidatas[0]; if(r.puntaje!==1&&r.puntaje!==2&&r.puntaje!==3) throw new GrActividadEconomicaError('GR_ACTIVIDAD_PUNTAJE_REGLA_INVALIDO');
    coincidentes.push({...r,marca_canonica:marca,puntaje:r.puntaje});
  }
  if(!coincidentes.length) throw new GrActividadEconomicaError('GR_ACTIVIDAD_CONFIGURACION_NO_DETERMINISTA');
  const maxima=Math.max(...coincidentes.map(r=>r.prioridad)); const ganadoras=coincidentes.filter(r=>r.prioridad===maxima);
  if(ganadoras.length!==1) throw new GrActividadEconomicaError('GR_ACTIVIDAD_EMPATE_PRIORIDAD_MAXIMA');
  const aplicada=ganadoras[0];
  return {...contexto,puntaje:aplicada.puntaje,regla_aplicada:aplicada,evidencia:{...contexto.evidencia,reglas_coincidentes:coincidentes,regla_matriz_aplicada:aplicada,match:{marca_canonica:aplicada.marca_canonica,condicion_controlada:null},puntaje_resultante:aplicada.puntaje}};
}

export async function resolverActividadEconomica(db:DbClient,clienteId:number,matrizVersionId:number):Promise<ResultadoActividad> {
  if(!Number.isSafeInteger(clienteId)||clienteId<=0||!Number.isSafeInteger(matrizVersionId)||matrizVersionId<=0) throw new GrActividadEconomicaError('GR_ACTIVIDAD_CONTRATO_INCONSISTENTE');
  const cr=await db.query<Record<string,unknown>>('SELECT empresa_id,tipo_cliente,datos_completos FROM public.clientes WHERE id=$1 LIMIT 1',[clienteId]);
  if(!cr.rows.length) throw new GrActividadEconomicaError('GR_ACTIVIDAD_CLIENTE_NO_ENCONTRADO');
  const c=cr.rows[0], empresa=positive(c.empresa_id), fuente=kyc(c.datos_completos,c.tipo_cliente);
  const mr=await db.query<Record<string,unknown>>(`SELECT mc.id FROM public.matriz_empresa_version mv JOIN public.matriz_criterio mc ON mc.matriz_version_id=mv.id JOIN public.catalogo_criterio_gr_version cgv ON cgv.id=mc.catalogo_criterio_gr_version_id JOIN public.catalogo_criterio_gr cg ON cg.id=cgv.criterio_gr_id WHERE mv.id=$1 AND mv.empresa_id=$2 AND mv.estado_editorial='PUBLICADA' AND mv.activa=TRUE AND mc.codigo=$3 AND mc.ambito='GR' AND cg.codigo_canonico=$3 AND cgv.tipo_resolucion='CATALOGO_GLOBAL' AND cgv.resolver_codigo=$3`,[matrizVersionId,empresa,CODIGO]);
  if(mr.rows.length!==1) { const m=await db.query('SELECT 1 FROM public.matriz_empresa_version WHERE id=$1 AND empresa_id=$2 AND estado_editorial=\'PUBLICADA\' AND activa=TRUE',[matrizVersionId,empresa]); if(!m.rows.length) throw new GrActividadEconomicaError('GR_ACTIVIDAD_MATRIZ_NO_DISPONIBLE'); if(!mr.rows.length) throw new GrActividadEconomicaError('GR_ACTIVIDAD_CRITERIO_NO_CONFIGURADO'); throw new GrActividadEconomicaError('GR_ACTIVIDAD_CONTRATO_INCONSISTENTE'); }
  const criterio=positive(mr.rows[0].id);
  const catalogo=await db.query<Record<string,unknown>>(`SELECT id,clave,descripcion FROM public.${fuente.tabla} WHERE clave::text=$1 AND activo=TRUE ORDER BY id`,[fuente.original.clave]);
  if(catalogo.rows.length!==1) {
    if(catalogo.rows.length>1) throw new GrActividadEconomicaError('GR_ACTIVIDAD_CONTRATO_INCONSISTENTE');
    throw new GrActividadEconomicaError(
      fuente.original.formato==='string'
        ? 'GR_ACTIVIDAD_KYC_NO_RESOLVIBLE'
        : 'GR_ACTIVIDAD_CLAVE_CATALOGO_INVALIDA',
    );
  }
  const item={id:bigintString(catalogo.rows[0].id),clave:str(catalogo.rows[0].clave),descripcion:str(catalogo.rows[0].descripcion)};
  const vr=await db.query<Record<string,unknown>>(`SELECT id,tipo_catalogo,fuente_codigo,fuente_nombre,fuente_version,fecha_publicacion,vigente_desde,vigente_hasta FROM public.clasificacion_actividad_pld_version WHERE activa=TRUE AND tipo_catalogo=$1 AND vigente_desde<=CURRENT_DATE AND (vigente_hasta IS NULL OR vigente_hasta>=CURRENT_DATE) ORDER BY id`,[fuente.catalogo]);
  if(vr.rows.length===0) throw new GrActividadEconomicaError('GR_ACTIVIDAD_VERSION_GLOBAL_AUSENTE'); if(vr.rows.length>1) throw new GrActividadEconomicaError('GR_ACTIVIDAD_VERSION_GLOBAL_AMBIGUA');
  const v=vr.rows[0], versionId=bigintString(v.id);
  const ir=await db.query<Record<string,unknown>>('SELECT id,marca_canonica,categoria_fuente,descripcion_fuente,observacion FROM public.clasificacion_actividad_pld_item WHERE version_id=$1 AND tipo_catalogo=$2 AND clave_catalogo=$3 ORDER BY marca_canonica,id',[versionId,fuente.catalogo,item.clave]);
  const permitidas=['AV','HUACHICOL','DOBLE_USO','PEP','PEP_EXTRANJERO','OSFL'] as const;
  const clasificaciones=ir.rows.map(row=>{ const marca=str(row.marca_canonica); if(!(permitidas as readonly string[]).includes(marca)) throw new GrActividadEconomicaError('GR_ACTIVIDAD_CONTRATO_INCONSISTENTE'); return {version_id:versionId,tipo_catalogo:fuente.catalogo,fuente_codigo:str(v.fuente_codigo),fuente_nombre:str(v.fuente_nombre),fuente_version:str(v.fuente_version),fecha_publicacion:v.fecha_publicacion===null?null:date(v.fecha_publicacion),vigente_desde:date(v.vigente_desde),vigente_hasta:v.vigente_hasta===null?null:date(v.vigente_hasta),item_id:bigintString(row.id),marca_canonica:marca as Exclude<MarcaActividad,'SIN_MARCA_ACTIVIDAD'>,categoria_fuente:nullable(row.categoria_fuente),descripcion_fuente:str(row.descripcion_fuente),observacion:nullable(row.observacion)}; });
  const marcas=[...new Set(clasificaciones.map(x=>x.marca_canonica))]; const detectadas:MarcaActividad[]=marcas.length?marcas:['SIN_MARCA_ACTIVIDAD'];
  const rr=await db.query<Record<string,unknown>>('SELECT id,codigo,marca_canonica,puntaje,prioridad,alto_automatico,causa_codigo FROM public.matriz_regla WHERE matriz_version_id=$1 AND criterio_id=$2 ORDER BY prioridad DESC,id',[matrizVersionId,criterio]);
  return aplicarReglasActividadEconomica({criterio_codigo:CODIGO,resolver_codigo:CODIGO,matriz_criterio_id:criterio,reglas_matriz:rr.rows.map(regla),evidencia:{tipo_cliente:fuente.tipo,fuente_kyc:fuente.fuente,valor_original:fuente.original,catalogo_tipo:fuente.catalogo,catalogo_item:item,clasificaciones_pld_activas:clasificaciones,marcas_canonicas_detectadas:detectadas}});
}
