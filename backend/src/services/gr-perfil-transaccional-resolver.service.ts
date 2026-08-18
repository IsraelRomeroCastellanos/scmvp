import type { Pool, PoolClient } from 'pg';

type DbClient = Pool | PoolClient;
type PuntajeGr = 1 | 2 | 3;
const CODIGO = 'PERFIL_TRANSACCIONAL' as const;

export type GrPerfilTransaccionalErrorCode =
  | 'GR_PERFIL_PT_EVALUACION_NO_ENCONTRADA'
  | 'GR_PERFIL_PT_CLIENTE_INCONSISTENTE'
  | 'GR_PERFIL_PT_EMPRESA_INCONSISTENTE'
  | 'GR_PERFIL_PT_MATRIZ_INCONSISTENTE'
  | 'GR_PERFIL_PT_AMBITO_INVALIDO'
  | 'GR_PERFIL_PT_NO_COMPLETADO'
  | 'GR_PERFIL_PT_RESULTADO_AUSENTE'
  | 'GR_PERFIL_PT_RESULTADO_INCONSISTENTE'
  | 'GR_PERFIL_PT_RESULTADO_MATRIZ_INCONSISTENTE'
  | 'GR_PERFIL_CRITERIO_AUSENTE'
  | 'GR_PERFIL_CONTRATO_DERIVADO_INVALIDO'
  | 'GR_PERFIL_REGLA_AUSENTE'
  | 'GR_PERFIL_REGLA_DUPLICADA'
  | 'GR_PERFIL_PUNTAJE_GR_INVALIDO'
  | 'GR_PERFIL_CONFIGURACION_NO_DETERMINISTA';

const MENSAJES: Record<GrPerfilTransaccionalErrorCode,string> = {
  GR_PERFIL_PT_EVALUACION_NO_ENCONTRADA: 'La evaluacion PT indicada no existe',
  GR_PERFIL_PT_CLIENTE_INCONSISTENTE: 'La evaluacion PT no pertenece al cliente indicado',
  GR_PERFIL_PT_EMPRESA_INCONSISTENTE: 'La evaluacion PT no pertenece a la empresa indicada',
  GR_PERFIL_PT_MATRIZ_INCONSISTENTE: 'La evaluacion PT pertenece a una matriz distinta',
  GR_PERFIL_PT_AMBITO_INVALIDO: 'La evaluacion indicada no pertenece al ambito PT',
  GR_PERFIL_PT_NO_COMPLETADO: 'La evaluacion PT no esta completada',
  GR_PERFIL_PT_RESULTADO_AUSENTE: 'La evaluacion PT no tiene un resultado persistido',
  GR_PERFIL_PT_RESULTADO_INCONSISTENTE: 'El resultado PT persistido es inconsistente',
  GR_PERFIL_PT_RESULTADO_MATRIZ_INCONSISTENTE: 'El resultado PT pertenece a otra matriz o ambito',
  GR_PERFIL_CRITERIO_AUSENTE: 'La matriz no contiene el criterio PERFIL_TRANSACCIONAL',
  GR_PERFIL_CONTRATO_DERIVADO_INVALIDO: 'El contrato DERIVADO de PERFIL_TRANSACCIONAL es invalido',
  GR_PERFIL_REGLA_AUSENTE: 'No existe una regla para el codigo de resultado PT',
  GR_PERFIL_REGLA_DUPLICADA: 'Existe mas de una regla para el mismo codigo de resultado PT',
  GR_PERFIL_PUNTAJE_GR_INVALIDO: 'La regla contiene un puntaje GR invalido',
  GR_PERFIL_CONFIGURACION_NO_DETERMINISTA: 'La configuracion no permite resolver un resultado unico',
};

export class GrPerfilTransaccionalError extends Error {
  constructor(public readonly code:GrPerfilTransaccionalErrorCode) {
    super(MENSAJES[code]);
    this.name='GrPerfilTransaccionalError';
  }
}

export type ReglaPerfilTransaccional = {
  id:number;
  codigo:string;
  condicion_controlada:string|null;
  puntaje:number|null;
  prioridad:number;
  alto_automatico:boolean;
  causa_codigo:string|null;
};

export type ReglaAplicadaPerfilTransaccional = Omit<
  ReglaPerfilTransaccional,
  'condicion_controlada'|'puntaje'
> & { condicion_controlada:string; puntaje:PuntajeGr };

export type ResultadoResolverPerfilTransaccional = {
  criterio_codigo:typeof CODIGO;
  resolver_codigo:typeof CODIGO;
  matriz_criterio_id:number;
  puntaje:PuntajeGr;
  regla_aplicada:ReglaAplicadaPerfilTransaccional;
  evidencia:{
    pt_evaluacion:{
      id:string;
      cliente_id:number;
      empresa_id:number;
      matriz_version_id:number;
      numero_version:number;
      puntaje_total:number;
      matriz_resultado_id:number;
      estado:'COMPLETADA';
      creada_en:string;
    };
    resultado_pt:{
      id:number;
      codigo:string;
      orden:number;
      nombre_empresarial:string;
      minimo:number;
      maximo:number;
      referencia_nombre_origen:string|null;
      referencia_rango_origen:string|null;
    };
    match:{valor_controlado:string;campo_regla:'condicion_controlada'};
    regla_matriz_aplicada:ReglaAplicadaPerfilTransaccional;
    puntaje_resultante:PuntajeGr;
  };
};

const enteroPositivo=(value:unknown):number=>{
  const parsed=Number(value);
  if(!Number.isSafeInteger(parsed)||parsed<=0)
    throw new GrPerfilTransaccionalError('GR_PERFIL_CONFIGURACION_NO_DETERMINISTA');
  return parsed;
};
const entero=(value:unknown):number=>{
  const parsed=Number(value);
  if(!Number.isSafeInteger(parsed))
    throw new GrPerfilTransaccionalError('GR_PERFIL_PT_RESULTADO_INCONSISTENTE');
  return parsed;
};
const bigintString=(value:unknown):string=>{
  const normalized=typeof value==='bigint'?value.toString():String(value??'');
  if(!/^[1-9]\d*$/.test(normalized))
    throw new GrPerfilTransaccionalError('GR_PERFIL_CONFIGURACION_NO_DETERMINISTA');
  return normalized;
};
const textoExacto=(value:unknown):string=>{
  if(typeof value!=='string'||value.length===0)
    throw new GrPerfilTransaccionalError('GR_PERFIL_CONFIGURACION_NO_DETERMINISTA');
  return value;
};
const textoNullable=(value:unknown):string|null=>typeof value==='string'&&value.length>0?value:null;
const fechaIso=(value:unknown):string=>{
  if(value instanceof Date&&!Number.isNaN(value.getTime())) return value.toISOString();
  if(typeof value==='string'&&value.length>0) return value;
  throw new GrPerfilTransaccionalError('GR_PERFIL_CONFIGURACION_NO_DETERMINISTA');
};

function normalizarRegla(row:Record<string,unknown>):ReglaPerfilTransaccional {
  const prioridad=Number(row.prioridad);
  if(!Number.isSafeInteger(prioridad)||prioridad<0||typeof row.alto_automatico!=='boolean')
    throw new GrPerfilTransaccionalError('GR_PERFIL_CONFIGURACION_NO_DETERMINISTA');
  return {
    id:enteroPositivo(row.id),
    codigo:textoExacto(row.codigo),
    condicion_controlada:textoNullable(row.condicion_controlada),
    puntaje:row.puntaje===null?null:Number(row.puntaje),
    prioridad,
    alto_automatico:row.alto_automatico,
    causa_codigo:textoNullable(row.causa_codigo),
  };
}

export function aplicarReglaPerfilTransaccional(
  resultadoCodigo:string,
  reglas:ReadonlyArray<ReglaPerfilTransaccional>,
):ReglaAplicadaPerfilTransaccional {
  if(!resultadoCodigo)
    throw new GrPerfilTransaccionalError('GR_PERFIL_PT_RESULTADO_INCONSISTENTE');
  const candidatas=reglas.filter((regla)=>regla.condicion_controlada===resultadoCodigo);
  if(candidatas.length===0) throw new GrPerfilTransaccionalError('GR_PERFIL_REGLA_AUSENTE');
  if(candidatas.length>1) throw new GrPerfilTransaccionalError('GR_PERFIL_REGLA_DUPLICADA');
  const regla=candidatas[0];
  if(regla.puntaje!==1&&regla.puntaje!==2&&regla.puntaje!==3)
    throw new GrPerfilTransaccionalError('GR_PERFIL_PUNTAJE_GR_INVALIDO');
  return {...regla,condicion_controlada:resultadoCodigo,puntaje:regla.puntaje};
}

export async function resolverPerfilTransaccional(
  db:DbClient,
  clienteId:number,
  empresaId:number,
  matrizVersionId:number,
  ptEvaluacionId:string|number|bigint,
):Promise<ResultadoResolverPerfilTransaccional> {
  const cliente=enteroPositivo(clienteId);
  const empresa=enteroPositivo(empresaId);
  const matriz=enteroPositivo(matrizVersionId);
  const ptId=bigintString(ptEvaluacionId);

  const evaluacionResult=await db.query<Record<string,unknown>>(
    `SELECT id,cliente_id,empresa_id,matriz_version_id,ambito,numero_version,
            puntaje_total,matriz_resultado_id,estado,creada_en
       FROM public.cliente_pt_evaluacion
      WHERE id=$1::bigint`,
    [ptId],
  );
  if(evaluacionResult.rows.length===0)
    throw new GrPerfilTransaccionalError('GR_PERFIL_PT_EVALUACION_NO_ENCONTRADA');
  if(evaluacionResult.rows.length!==1)
    throw new GrPerfilTransaccionalError('GR_PERFIL_CONFIGURACION_NO_DETERMINISTA');
  const evaluacion=evaluacionResult.rows[0];
  if(enteroPositivo(evaluacion.cliente_id)!==cliente)
    throw new GrPerfilTransaccionalError('GR_PERFIL_PT_CLIENTE_INCONSISTENTE');
  if(enteroPositivo(evaluacion.empresa_id)!==empresa)
    throw new GrPerfilTransaccionalError('GR_PERFIL_PT_EMPRESA_INCONSISTENTE');
  if(enteroPositivo(evaluacion.matriz_version_id)!==matriz)
    throw new GrPerfilTransaccionalError('GR_PERFIL_PT_MATRIZ_INCONSISTENTE');
  if(evaluacion.ambito!=='PT')
    throw new GrPerfilTransaccionalError('GR_PERFIL_PT_AMBITO_INVALIDO');
  if(evaluacion.estado!=='COMPLETADA')
    throw new GrPerfilTransaccionalError('GR_PERFIL_PT_NO_COMPLETADO');
  if(evaluacion.matriz_resultado_id===null||evaluacion.matriz_resultado_id===undefined)
    throw new GrPerfilTransaccionalError('GR_PERFIL_PT_RESULTADO_AUSENTE');

  const resultadoId=enteroPositivo(evaluacion.matriz_resultado_id);
  const resultadoResult=await db.query<Record<string,unknown>>(
    `SELECT id,matriz_version_id,codigo,ambito,orden,nombre_empresarial,minimo,maximo,
            referencia_nombre_origen,referencia_rango_origen
       FROM public.matriz_resultado
      WHERE id=$1`,
    [resultadoId],
  );
  if(resultadoResult.rows.length===0)
    throw new GrPerfilTransaccionalError('GR_PERFIL_PT_RESULTADO_AUSENTE');
  if(resultadoResult.rows.length!==1)
    throw new GrPerfilTransaccionalError('GR_PERFIL_PT_RESULTADO_INCONSISTENTE');
  const resultado=resultadoResult.rows[0];
  if(enteroPositivo(resultado.matriz_version_id)!==matriz||resultado.ambito!=='PT')
    throw new GrPerfilTransaccionalError('GR_PERFIL_PT_RESULTADO_MATRIZ_INCONSISTENTE');
  if(enteroPositivo(resultado.id)!==resultadoId)
    throw new GrPerfilTransaccionalError('GR_PERFIL_PT_RESULTADO_INCONSISTENTE');
  const resultadoCodigo=textoExacto(resultado.codigo);

  const criterioResult=await db.query<Record<string,unknown>>(
    `SELECT mc.id,mc.codigo,mc.ambito,cv.tipo_resolucion,cv.resolver_codigo,
            cv.tipo_parametrizacion,cv.unidad_canonica
       FROM public.matriz_empresa_version mv
       JOIN public.matriz_criterio mc ON mc.matriz_version_id=mv.id
       JOIN public.catalogo_criterio_gr_version cv ON cv.id=mc.catalogo_criterio_gr_version_id
       JOIN public.catalogo_criterio_gr c ON c.id=cv.criterio_gr_id
      WHERE mv.id=$1 AND mv.empresa_id=$2
        AND mv.estado_editorial='PUBLICADA' AND mv.activa=TRUE
        AND mc.ambito='GR' AND mc.codigo=$3 AND c.codigo_canonico=$3`,
    [matriz,empresa,CODIGO],
  );
  if(criterioResult.rows.length===0)
    throw new GrPerfilTransaccionalError('GR_PERFIL_CRITERIO_AUSENTE');
  if(criterioResult.rows.length!==1)
    throw new GrPerfilTransaccionalError('GR_PERFIL_CONFIGURACION_NO_DETERMINISTA');
  const criterio=criterioResult.rows[0];
  if(
    criterio.tipo_resolucion!=='DERIVADO'
    || criterio.resolver_codigo!==CODIGO
    || criterio.tipo_parametrizacion!=='NINGUNA'
    || criterio.unidad_canonica!==null
  ) throw new GrPerfilTransaccionalError('GR_PERFIL_CONTRATO_DERIVADO_INVALIDO');
  const criterioId=enteroPositivo(criterio.id);

  const reglasResult=await db.query<Record<string,unknown>>(
    `SELECT id,codigo,condicion_controlada,puntaje,prioridad,alto_automatico,causa_codigo
       FROM public.matriz_regla
      WHERE matriz_version_id=$1 AND criterio_id=$2
      ORDER BY id`,
    [matriz,criterioId],
  );
  const aplicada=aplicarReglaPerfilTransaccional(
    resultadoCodigo,
    reglasResult.rows.map(normalizarRegla),
  );

  return {
    criterio_codigo:CODIGO,
    resolver_codigo:CODIGO,
    matriz_criterio_id:criterioId,
    puntaje:aplicada.puntaje,
    regla_aplicada:aplicada,
    evidencia:{
      pt_evaluacion:{
        id:ptId,
        cliente_id:cliente,
        empresa_id:empresa,
        matriz_version_id:matriz,
        numero_version:enteroPositivo(evaluacion.numero_version),
        puntaje_total:enteroPositivo(evaluacion.puntaje_total),
        matriz_resultado_id:resultadoId,
        estado:'COMPLETADA',
        creada_en:fechaIso(evaluacion.creada_en),
      },
      resultado_pt:{
        id:resultadoId,
        codigo:resultadoCodigo,
        orden:enteroPositivo(resultado.orden),
        nombre_empresarial:textoExacto(resultado.nombre_empresarial),
        minimo:entero(resultado.minimo),
        maximo:entero(resultado.maximo),
        referencia_nombre_origen:textoNullable(resultado.referencia_nombre_origen),
        referencia_rango_origen:textoNullable(resultado.referencia_rango_origen),
      },
      match:{valor_controlado:resultadoCodigo,campo_regla:'condicion_controlada'},
      regla_matriz_aplicada:aplicada,
      puntaje_resultante:aplicada.puntaje,
    },
  };
}
