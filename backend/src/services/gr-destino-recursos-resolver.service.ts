import type { Pool, PoolClient } from 'pg';

type DbClient = Pool | PoolClient;
type PuntajeGr = 1 | 2 | 3;
const CRITERIO_GR = 'DESTINO_RECURSOS_GR' as const;
const CRITERIO_PT = 'DESTINO_RECURSOS_PT' as const;

export type GrDestinoRecursosErrorCode =
  | 'GR_DESTINO_PT_EVALUACION_NO_ENCONTRADA'
  | 'GR_DESTINO_PT_CLIENTE_INCONSISTENTE'
  | 'GR_DESTINO_PT_EMPRESA_INCONSISTENTE'
  | 'GR_DESTINO_PT_MATRIZ_INCONSISTENTE'
  | 'GR_DESTINO_PT_NO_COMPLETADO'
  | 'GR_DESTINO_PT_CRITERIO_AUSENTE'
  | 'GR_DESTINO_PT_RESPUESTA_AUSENTE'
  | 'GR_DESTINO_PT_RESPUESTA_AMBIGUA'
  | 'GR_DESTINO_PT_OPCION_INCONSISTENTE'
  | 'GR_DESTINO_CRITERIO_AUSENTE'
  | 'GR_DESTINO_CONTRATO_GR_INCONSISTENTE'
  | 'GR_DESTINO_REGLA_AUSENTE'
  | 'GR_DESTINO_REGLA_DUPLICADA'
  | 'GR_DESTINO_PUNTAJE_GR_INVALIDO'
  | 'GR_DESTINO_CONFIGURACION_NO_DETERMINISTA';

const MENSAJES: Record<GrDestinoRecursosErrorCode,string> = {
  GR_DESTINO_PT_EVALUACION_NO_ENCONTRADA: 'La evaluacion PT indicada no existe',
  GR_DESTINO_PT_CLIENTE_INCONSISTENTE: 'La evaluacion PT no pertenece al cliente indicado',
  GR_DESTINO_PT_EMPRESA_INCONSISTENTE: 'La evaluacion PT no pertenece a la empresa indicada',
  GR_DESTINO_PT_MATRIZ_INCONSISTENTE: 'La evaluacion PT pertenece a una matriz distinta',
  GR_DESTINO_PT_NO_COMPLETADO: 'La evaluacion PT no esta completada',
  GR_DESTINO_PT_CRITERIO_AUSENTE: 'La evaluacion PT no contiene el criterio DESTINO_RECURSOS_PT',
  GR_DESTINO_PT_RESPUESTA_AUSENTE: 'La evaluacion PT no contiene respuesta de destino de recursos',
  GR_DESTINO_PT_RESPUESTA_AMBIGUA: 'La evaluacion PT contiene mas de una respuesta de destino de recursos',
  GR_DESTINO_PT_OPCION_INCONSISTENTE: 'La opcion PT de destino de recursos es inconsistente',
  GR_DESTINO_CRITERIO_AUSENTE: 'La matriz no contiene el criterio DESTINO_RECURSOS_GR',
  GR_DESTINO_CONTRATO_GR_INCONSISTENTE: 'El contrato del criterio DESTINO_RECURSOS_GR es inconsistente',
  GR_DESTINO_REGLA_AUSENTE: 'No existe una regla para el codigo de opcion PT seleccionado',
  GR_DESTINO_REGLA_DUPLICADA: 'Existe mas de una regla para el mismo codigo de opcion PT',
  GR_DESTINO_PUNTAJE_GR_INVALIDO: 'La regla contiene un puntaje GR invalido',
  GR_DESTINO_CONFIGURACION_NO_DETERMINISTA: 'La configuracion no permite resolver un resultado unico',
};

export class GrDestinoRecursosError extends Error {
  constructor(public readonly code:GrDestinoRecursosErrorCode) {
    super(MENSAJES[code]);
    this.name='GrDestinoRecursosError';
  }
}

export type ReglaDestinoRecursos = {
  id:number; codigo:string; condicion_controlada:string|null; puntaje:number|null;
  prioridad:number; alto_automatico:boolean; causa_codigo:string|null;
};
export type ReglaAplicadaDestinoRecursos = Omit<ReglaDestinoRecursos,'condicion_controlada'|'puntaje'> & {
  condicion_controlada:string; puntaje:PuntajeGr;
};
export type PtEvaluacionDestino = {
  id:string; cliente_id:number; empresa_id:number; matriz_version_id:number;
  numero_version:number; estado:'COMPLETADA'; creada_en:string;
};
export type FuentePtDestino = {
  criterio_codigo:typeof CRITERIO_PT; matriz_criterio_id:number; respuesta_id:string; evaluacion_id:string;
  matriz_opcion_id:number; opcion_codigo:string; opcion_etiqueta:string;
  opcion_orden:number; opcion_puntaje_pt:1|2|3; referencia_origen:string|null;
  puntaje_pt_original:1|2|3; respuesta_orden:number; respuesta_creada_en:string;
};
export type ResultadoDestinoRecursos = {
  criterio_codigo:typeof CRITERIO_GR; resolver_codigo:typeof CRITERIO_GR;
  matriz_criterio_id:number; puntaje:PuntajeGr; regla_aplicada:ReglaAplicadaDestinoRecursos;
  evidencia:{
    pt_evaluacion:PtEvaluacionDestino; fuente_pt:FuentePtDestino;
    match:{valor_controlado:string;campo_regla:'condicion_controlada'};
    regla_matriz_aplicada:ReglaAplicadaDestinoRecursos; puntaje_resultante:PuntajeGr;
  };
};

const integer=(v:unknown):number=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<=0)throw new GrDestinoRecursosError('GR_DESTINO_CONFIGURACION_NO_DETERMINISTA');return n;};
const bigintString=(v:unknown):string=>{const s=typeof v==='bigint'?v.toString():String(v??'');if(!/^[1-9]\d*$/.test(s))throw new GrDestinoRecursosError('GR_DESTINO_CONFIGURACION_NO_DETERMINISTA');return s;};
const text=(v:unknown):string=>{if(typeof v!=='string'||v.length===0)throw new GrDestinoRecursosError('GR_DESTINO_CONFIGURACION_NO_DETERMINISTA');return v;};
const nullable=(v:unknown):string|null=>typeof v==='string'&&v.length?v:null;
const timestamp=(v:unknown):string=>v instanceof Date&&!Number.isNaN(v.getTime())?v.toISOString():typeof v==='string'&&v.length?v:(()=>{throw new GrDestinoRecursosError('GR_DESTINO_CONFIGURACION_NO_DETERMINISTA');})();

function normalizeRule(row:Record<string,unknown>):ReglaDestinoRecursos {
  const prioridad=Number(row.prioridad);
  if(!Number.isSafeInteger(prioridad)||prioridad<0||typeof row.alto_automatico!=='boolean')
    throw new GrDestinoRecursosError('GR_DESTINO_CONFIGURACION_NO_DETERMINISTA');
  return {id:integer(row.id),codigo:text(row.codigo),condicion_controlada:nullable(row.condicion_controlada),puntaje:row.puntaje===null?null:Number(row.puntaje),prioridad,alto_automatico:row.alto_automatico,causa_codigo:nullable(row.causa_codigo)};
}

export function aplicarReglaDestinoRecursos(
  opcionCodigo:string,
  reglas:ReadonlyArray<ReglaDestinoRecursos>,
):ReglaAplicadaDestinoRecursos {
  if(!opcionCodigo) throw new GrDestinoRecursosError('GR_DESTINO_PT_OPCION_INCONSISTENTE');
  const candidatas=reglas.filter((regla)=>regla.condicion_controlada===opcionCodigo);
  if(candidatas.length===0) throw new GrDestinoRecursosError('GR_DESTINO_REGLA_AUSENTE');
  if(candidatas.length>1) throw new GrDestinoRecursosError('GR_DESTINO_REGLA_DUPLICADA');
  const regla=candidatas[0];
  if(regla.puntaje!==1&&regla.puntaje!==2&&regla.puntaje!==3)
    throw new GrDestinoRecursosError('GR_DESTINO_PUNTAJE_GR_INVALIDO');
  return {...regla,condicion_controlada:opcionCodigo,puntaje:regla.puntaje};
}

export async function resolverDestinoRecursos(
  db:DbClient,
  clienteId:number,
  empresaId:number,
  matrizVersionId:number,
  ptEvaluacionId:string|number|bigint,
):Promise<ResultadoDestinoRecursos> {
  const cliente=integer(clienteId),empresa=integer(empresaId),matriz=integer(matrizVersionId);
  const ptId=bigintString(ptEvaluacionId);
  const evaluacionResult=await db.query<Record<string,unknown>>(
    `SELECT id,cliente_id,empresa_id,matriz_version_id,ambito,numero_version,estado,creada_en
       FROM public.cliente_pt_evaluacion WHERE id=$1::bigint`,[ptId],
  );
  if(evaluacionResult.rows.length===0) throw new GrDestinoRecursosError('GR_DESTINO_PT_EVALUACION_NO_ENCONTRADA');
  if(evaluacionResult.rows.length!==1) throw new GrDestinoRecursosError('GR_DESTINO_CONFIGURACION_NO_DETERMINISTA');
  const e=evaluacionResult.rows[0];
  if(integer(e.cliente_id)!==cliente) throw new GrDestinoRecursosError('GR_DESTINO_PT_CLIENTE_INCONSISTENTE');
  if(integer(e.empresa_id)!==empresa) throw new GrDestinoRecursosError('GR_DESTINO_PT_EMPRESA_INCONSISTENTE');
  if(integer(e.matriz_version_id)!==matriz) throw new GrDestinoRecursosError('GR_DESTINO_PT_MATRIZ_INCONSISTENTE');
  if(e.ambito!=='PT'||e.estado!=='COMPLETADA') throw new GrDestinoRecursosError('GR_DESTINO_PT_NO_COMPLETADO');
  const ptEvaluacion:PtEvaluacionDestino={id:ptId,cliente_id:cliente,empresa_id:empresa,matriz_version_id:matriz,numero_version:integer(e.numero_version),estado:'COMPLETADA',creada_en:timestamp(e.creada_en)};

  const respuestaResult=await db.query<Record<string,unknown>>(
    `SELECT r.id AS respuesta_id,r.evaluacion_id,r.matriz_criterio_id,r.matriz_opcion_id,
            r.puntaje AS puntaje_pt,r.orden AS respuesta_orden,r.creada_en AS respuesta_creada_en,
            mo.id AS opcion_id,mo.codigo AS opcion_codigo,mo.etiqueta AS opcion_etiqueta,
            mo.puntaje AS opcion_puntaje,mo.orden AS opcion_orden,mo.referencia_origen
       FROM public.cliente_pt_respuesta r
       JOIN public.matriz_criterio mc
         ON mc.id=r.matriz_criterio_id AND mc.matriz_version_id=r.matriz_version_id AND mc.ambito=r.ambito
       JOIN public.catalogo_criterio_pt_version cv ON cv.id=mc.catalogo_criterio_pt_version_id
       JOIN public.catalogo_criterio_pt c ON c.id=cv.criterio_pt_id
       LEFT JOIN public.matriz_opcion mo ON mo.id=r.matriz_opcion_id AND mo.criterio_id=mc.id
      WHERE r.evaluacion_id=$1::bigint AND r.matriz_version_id=$2 AND r.ambito='PT'
        AND c.codigo_canonico=$3 AND mc.codigo=$3`,[ptId,matriz,CRITERIO_PT],
  );
  if(respuestaResult.rows.length===0) {
    const criterio=await db.query(
      `SELECT 1 FROM public.matriz_criterio mc
        JOIN public.catalogo_criterio_pt_version cv ON cv.id=mc.catalogo_criterio_pt_version_id
        JOIN public.catalogo_criterio_pt c ON c.id=cv.criterio_pt_id
       WHERE mc.matriz_version_id=$1 AND mc.ambito='PT' AND mc.codigo=$2 AND c.codigo_canonico=$2`,
      [matriz,CRITERIO_PT],
    );
    throw new GrDestinoRecursosError(criterio.rows.length?'GR_DESTINO_PT_RESPUESTA_AUSENTE':'GR_DESTINO_PT_CRITERIO_AUSENTE');
  }
  if(respuestaResult.rows.length>1) throw new GrDestinoRecursosError('GR_DESTINO_PT_RESPUESTA_AMBIGUA');
  const r=respuestaResult.rows[0];
  const puntajePt=Number(r.puntaje_pt);
  if(r.opcion_id===null||Number(r.opcion_id)!==Number(r.matriz_opcion_id)||puntajePt!==Number(r.opcion_puntaje)||!([1,2,3] as number[]).includes(puntajePt))
    throw new GrDestinoRecursosError('GR_DESTINO_PT_OPCION_INCONSISTENTE');
  const fuentePt:FuentePtDestino={criterio_codigo:CRITERIO_PT,matriz_criterio_id:integer(r.matriz_criterio_id),respuesta_id:bigintString(r.respuesta_id),evaluacion_id:bigintString(r.evaluacion_id),matriz_opcion_id:integer(r.matriz_opcion_id),opcion_codigo:text(r.opcion_codigo),opcion_etiqueta:text(r.opcion_etiqueta),opcion_orden:integer(r.opcion_orden),opcion_puntaje_pt:puntajePt as 1|2|3,referencia_origen:nullable(r.referencia_origen),puntaje_pt_original:puntajePt as 1|2|3,respuesta_orden:integer(r.respuesta_orden),respuesta_creada_en:timestamp(r.respuesta_creada_en)};

  const criterioGrResult=await db.query<Record<string,unknown>>(
    `SELECT mc.id,mc.codigo,mc.ambito,cv.tipo_resolucion,cv.resolver_codigo,
            cv.tipo_parametrizacion,cv.unidad_canonica
       FROM public.matriz_empresa_version mv
       JOIN public.matriz_criterio mc ON mc.matriz_version_id=mv.id
       JOIN public.catalogo_criterio_gr_version cv ON cv.id=mc.catalogo_criterio_gr_version_id
       JOIN public.catalogo_criterio_gr c ON c.id=cv.criterio_gr_id
      WHERE mv.id=$1 AND mv.empresa_id=$2 AND mv.estado_editorial='PUBLICADA' AND mv.activa=TRUE
        AND mc.ambito='GR' AND mc.codigo=$3 AND c.codigo_canonico=$3`,[matriz,empresa,CRITERIO_GR],
  );
  if(criterioGrResult.rows.length===0) throw new GrDestinoRecursosError('GR_DESTINO_CRITERIO_AUSENTE');
  if(criterioGrResult.rows.length!==1) throw new GrDestinoRecursosError('GR_DESTINO_CONFIGURACION_NO_DETERMINISTA');
  const cg=criterioGrResult.rows[0];
  if(cg.tipo_resolucion!=='ESTRUCTURADO'||cg.resolver_codigo!==CRITERIO_GR||cg.tipo_parametrizacion!=='NINGUNA'||cg.unidad_canonica!==null)
    throw new GrDestinoRecursosError('GR_DESTINO_CONTRATO_GR_INCONSISTENTE');
  const criterioGrId=integer(cg.id);
  const reglasResult=await db.query<Record<string,unknown>>(
    `SELECT id,codigo,condicion_controlada,puntaje,prioridad,alto_automatico,causa_codigo
       FROM public.matriz_regla WHERE matriz_version_id=$1 AND criterio_id=$2
      ORDER BY id`,[matriz,criterioGrId],
  );
  const aplicada=aplicarReglaDestinoRecursos(fuentePt.opcion_codigo,reglasResult.rows.map(normalizeRule));
  return {criterio_codigo:CRITERIO_GR,resolver_codigo:CRITERIO_GR,matriz_criterio_id:criterioGrId,puntaje:aplicada.puntaje,regla_aplicada:aplicada,evidencia:{pt_evaluacion:ptEvaluacion,fuente_pt:fuentePt,match:{valor_controlado:fuentePt.opcion_codigo,campo_regla:'condicion_controlada'},regla_matriz_aplicada:aplicada,puntaje_resultante:aplicada.puntaje}};
}
