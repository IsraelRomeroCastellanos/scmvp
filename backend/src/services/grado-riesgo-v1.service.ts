import type { Pool, PoolClient } from 'pg';
import { resolverActividadEconomica } from './gr-actividad-economica-resolver.service';
import { resolverZonaGeografica } from './gr-zona-geografica-resolver.service';
import { resolverDestinoRecursos } from './gr-destino-recursos-resolver.service';
import { resolverPerfilTransaccional } from './gr-perfil-transaccional-resolver.service';

const CRITERIOS = [
  'ACTIVIDAD_ECONOMICA',
  'ZONA_GEOGRAFICA',
  'DESTINO_RECURSOS_GR',
  'PERFIL_TRANSACCIONAL',
] as const;
type CriterioCodigo = typeof CRITERIOS[number];
type Puntaje = 1 | 2 | 3;

export type GradoRiesgoV1ErrorCode =
  | 'GR_CLIENTE_NO_ENCONTRADO' | 'GR_EMPRESA_INCONSISTENTE'
  | 'GR_MATRIZ_NO_ENCONTRADA' | 'GR_MATRIZ_EMPRESA_INCONSISTENTE'
  | 'GR_MATRIZ_NO_PUBLICADA' | 'GR_MATRIZ_NO_ACTIVA'
  | 'GR_PT_NO_ENCONTRADO' | 'GR_PT_INCONSISTENTE' | 'GR_PT_NO_COMPLETADO'
  | 'GR_CRITERIOS_INCOMPLETOS' | 'GR_CRITERIOS_DUPLICADOS' | 'GR_ORDENES_INVALIDOS'
  | 'GR_RESOLVER_RESULTADO_INVALIDO' | 'GR_PUNTAJE_INVALIDO'
  | 'GR_BANDA_ORDINARIA_AUSENTE' | 'GR_BANDA_ORDINARIA_DUPLICADA'
  | 'GR_BANDA_MAXIMA_AUSENTE' | 'GR_BANDA_MAXIMA_DUPLICADA'
  | 'GR_DUPLICADO_PT_INCONSISTENTE' | 'GR_PERSISTENCIA_INCOMPLETA'
  | 'GR_USUARIO_INVALIDO';

const MENSAJES: Record<GradoRiesgoV1ErrorCode,string> = {
  GR_CLIENTE_NO_ENCONTRADO:'Cliente no encontrado',
  GR_EMPRESA_INCONSISTENTE:'El cliente no pertenece a la empresa indicada',
  GR_MATRIZ_NO_ENCONTRADA:'La matriz indicada no existe',
  GR_MATRIZ_EMPRESA_INCONSISTENTE:'La matriz no pertenece a la empresa indicada',
  GR_MATRIZ_NO_PUBLICADA:'La matriz no esta publicada',
  GR_MATRIZ_NO_ACTIVA:'La matriz no esta activa',
  GR_PT_NO_ENCONTRADO:'La evaluacion PT indicada no existe',
  GR_PT_INCONSISTENTE:'La evaluacion PT no coincide con cliente, empresa, matriz o ambito',
  GR_PT_NO_COMPLETADO:'La evaluacion PT no esta completada',
  GR_CRITERIOS_INCOMPLETOS:'La matriz no contiene los cuatro criterios GR V1',
  GR_CRITERIOS_DUPLICADOS:'La matriz contiene criterios GR V1 duplicados',
  GR_ORDENES_INVALIDOS:'Los criterios GR no tienen ordenes unicos de 1 a 4',
  GR_RESOLVER_RESULTADO_INVALIDO:'Un resolvedor produjo un resultado inconsistente',
  GR_PUNTAJE_INVALIDO:'El total GR no pertenece al rango teorico 4 a 12',
  GR_BANDA_ORDINARIA_AUSENTE:'No existe banda GR para el puntaje total',
  GR_BANDA_ORDINARIA_DUPLICADA:'Mas de una banda GR contiene el puntaje total',
  GR_BANDA_MAXIMA_AUSENTE:'No existe banda GR que contenga el puntaje maximo 12',
  GR_BANDA_MAXIMA_DUPLICADA:'Mas de una banda GR contiene el puntaje maximo 12',
  GR_DUPLICADO_PT_INCONSISTENTE:'Existen evaluaciones GR inconsistentes para el mismo PT',
  GR_PERSISTENCIA_INCOMPLETA:'No fue posible persistir integramente la evaluacion GR',
  GR_USUARIO_INVALIDO:'El usuario generador no existe',
};

export class GradoRiesgoV1Error extends Error {
  constructor(public readonly code:GradoRiesgoV1ErrorCode) {
    super(MENSAJES[code]);
    this.name='GradoRiesgoV1Error';
  }
}

type ReglaComun = {
  id:number; codigo:string; puntaje:Puntaje; prioridad:number;
  alto_automatico:boolean; causa_codigo:string|null;
};
type ResolverResultado = {
  criterio_codigo:string; resolver_codigo:string; matriz_criterio_id:number;
  puntaje:Puntaje; regla_aplicada:ReglaComun; evidencia:object;
};
type CriterioMatriz = { id:number; codigo:CriterioCodigo; orden:number };
type Banda = { id:number; codigo:string; orden:number; nombre:string; minimo:number; maximo:number };
export type CausaAutomatica = {
  criterio_codigo:CriterioCodigo; resolver_codigo:string;
  regla_id:number; causa_codigo:string|null;
};
export type CriterioPersistidoGr = {
  id:string; matriz_criterio_id:number; criterio_codigo:CriterioCodigo;
  resolver_codigo:string; puntaje:Puntaje; orden:number; evidencia:unknown;
};
export type GradoRiesgoV1Resultado = {
  idempotente:boolean;
  evaluacion:{
    id:string; cliente_id:number; empresa_id:number; matriz_version_id:number;
    pt_evaluacion_id:string; numero_version:number; puntaje_total:number;
    resultado:Banda; alto_automatico:boolean; causas_automaticas:CausaAutomatica[];
    estado:'COMPLETADA'; creada_en:string; criterios:CriterioPersistidoGr[];
  };
};

const positive=(value:unknown):number=>{const n=Number(value);if(!Number.isSafeInteger(n)||n<=0)throw new GradoRiesgoV1Error('GR_PERSISTENCIA_INCOMPLETA');return n;};
const bigintString=(value:unknown):string=>{const s=typeof value==='bigint'?value.toString():String(value??'');if(!/^[1-9]\d*$/.test(s))throw new GradoRiesgoV1Error('GR_PERSISTENCIA_INCOMPLETA');return s;};
const text=(value:unknown):string=>{if(typeof value!=='string'||!value.length)throw new GradoRiesgoV1Error('GR_PERSISTENCIA_INCOMPLETA');return value;};
const iso=(value:unknown):string=>value instanceof Date&&!Number.isNaN(value.getTime())?value.toISOString():typeof value==='string'&&value.length?value:(()=>{throw new GradoRiesgoV1Error('GR_PERSISTENCIA_INCOMPLETA');})();
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const criterionCode=(value:unknown):CriterioCodigo=>{if(typeof value==='string'&&(CRITERIOS as readonly string[]).includes(value))return value as CriterioCodigo;throw new GradoRiesgoV1Error('GR_RESOLVER_RESULTADO_INVALIDO');};

function normalizeBand(row:Record<string,unknown>):Banda {
  return {id:positive(row.id),codigo:text(row.codigo),orden:positive(row.orden),nombre:text(row.nombre_empresarial),minimo:positive(row.minimo),maximo:positive(row.maximo)};
}

async function loadExisting(
  client:PoolClient, clienteId:number, empresaId:number, matrizVersionId:number,
  ptEvaluacionId:string,
):Promise<GradoRiesgoV1Resultado|null> {
  const headers=await client.query<Record<string,unknown>>(
    `SELECT e.id,e.cliente_id,e.empresa_id,e.matriz_version_id,e.pt_evaluacion_id,
            e.numero_version,e.puntaje_total,e.estado,e.creada_en,
            r.id AS resultado_id,r.codigo,r.orden,r.nombre_empresarial,r.minimo,r.maximo
       FROM public.cliente_gr_evaluacion e
       JOIN public.matriz_resultado r
         ON r.id=e.matriz_resultado_id AND r.matriz_version_id=e.matriz_version_id AND r.ambito=e.ambito
      WHERE e.pt_evaluacion_id=$1::bigint
      ORDER BY e.id`,[ptEvaluacionId],
  );
  if(headers.rows.length===0) return null;
  if(headers.rows.length!==1) throw new GradoRiesgoV1Error('GR_DUPLICADO_PT_INCONSISTENTE');
  const h=headers.rows[0];
  if(Number(h.cliente_id)!==clienteId||Number(h.empresa_id)!==empresaId||Number(h.matriz_version_id)!==matrizVersionId||bigintString(h.pt_evaluacion_id)!==ptEvaluacionId||h.estado!=='COMPLETADA')
    throw new GradoRiesgoV1Error('GR_DUPLICADO_PT_INCONSISTENTE');
  const details=await client.query<Record<string,unknown>>(
    `SELECT d.id,d.matriz_criterio_id,d.resolver_codigo,d.puntaje,d.orden,d.evidencia,mc.codigo
       FROM public.cliente_gr_criterio_resultado d
       JOIN public.matriz_criterio mc
         ON mc.id=d.matriz_criterio_id AND mc.matriz_version_id=d.matriz_version_id
        AND mc.ambito=d.ambito AND mc.orden=d.orden
      WHERE d.evaluacion_id=$1::bigint ORDER BY d.orden`,[h.id],
  );
  if(details.rows.length!==4) throw new GradoRiesgoV1Error('GR_DUPLICADO_PT_INCONSISTENTE');
  const criterios:CriterioPersistidoGr[]=details.rows.map((d)=>({id:bigintString(d.id),matriz_criterio_id:positive(d.matriz_criterio_id),criterio_codigo:criterionCode(d.codigo),resolver_codigo:text(d.resolver_codigo),puntaje:positive(d.puntaje) as Puntaje,orden:positive(d.orden),evidencia:d.evidencia}));
  if(
    new Set(criterios.map((c)=>c.criterio_codigo)).size!==4
    || new Set(criterios.map((c)=>c.matriz_criterio_id)).size!==4
    || new Set(criterios.map((c)=>c.orden)).size!==4
    || criterios.some((c)=>c.puntaje<1||c.puntaje>3||c.resolver_codigo!==c.criterio_codigo)
    || criterios.reduce((sum,c)=>sum+c.puntaje,0)!==Number(h.puntaje_total)
  )
    throw new GradoRiesgoV1Error('GR_DUPLICADO_PT_INCONSISTENTE');
  const causas:CausaAutomatica[]=[];
  for(const c of criterios) {
    if(!isRecord(c.evidencia)) continue;
    const integration=c.evidencia.integracion;
    if(isRecord(integration)&&integration.alto_automatico===true&&Array.isArray(integration.causas_automaticas)) {
      for(const cause of integration.causas_automaticas) if(isRecord(cause)&&cause.criterio_codigo===c.criterio_codigo) causas.push({criterio_codigo:c.criterio_codigo,resolver_codigo:text(cause.resolver_codigo),regla_id:positive(cause.regla_id),causa_codigo:typeof cause.causa_codigo==='string'?cause.causa_codigo:null});
    }
  }
  const uniqueCauses=[...new Map(causas.map((c)=>[`${c.criterio_codigo}:${c.regla_id}`,c])).values()];
  return {idempotente:true,evaluacion:{id:bigintString(h.id),cliente_id:clienteId,empresa_id:empresaId,matriz_version_id:matrizVersionId,pt_evaluacion_id:ptEvaluacionId,numero_version:positive(h.numero_version),puntaje_total:positive(h.puntaje_total),resultado:normalizeBand({...h,id:h.resultado_id}),alto_automatico:uniqueCauses.length>0,causas_automaticas:uniqueCauses,estado:'COMPLETADA',creada_en:iso(h.creada_en),criterios}};
}

export async function crearGradoRiesgoV1(
  db:Pool,
  clienteId:number,
  empresaId:number,
  matrizVersionId:number,
  ptEvaluacionId:string|number|bigint,
  actorUsuarioId:number,
):Promise<GradoRiesgoV1Resultado> {
  let client:PoolClient|null=null; let started=false;
  try {
    const cliente=positive(clienteId),empresa=positive(empresaId),matriz=positive(matrizVersionId),actor=positive(actorUsuarioId),ptId=bigintString(ptEvaluacionId);
    client=await db.connect(); await client.query('BEGIN'); started=true;
    const clientResult=await client.query<Record<string,unknown>>('SELECT id,empresa_id FROM public.clientes WHERE id=$1 FOR UPDATE',[cliente]);
    if(!clientResult.rows.length) throw new GradoRiesgoV1Error('GR_CLIENTE_NO_ENCONTRADO');
    if(Number(clientResult.rows[0].empresa_id)!==empresa) throw new GradoRiesgoV1Error('GR_EMPRESA_INCONSISTENTE');
    const matrixResult=await client.query<Record<string,unknown>>('SELECT id,empresa_id,estado_editorial,activa FROM public.matriz_empresa_version WHERE id=$1',[matriz]);
    if(!matrixResult.rows.length) throw new GradoRiesgoV1Error('GR_MATRIZ_NO_ENCONTRADA');
    const matrix=matrixResult.rows[0];
    if(Number(matrix.empresa_id)!==empresa) throw new GradoRiesgoV1Error('GR_MATRIZ_EMPRESA_INCONSISTENTE');
    if(matrix.estado_editorial!=='PUBLICADA') throw new GradoRiesgoV1Error('GR_MATRIZ_NO_PUBLICADA');
    if(matrix.activa!==true) throw new GradoRiesgoV1Error('GR_MATRIZ_NO_ACTIVA');
    const ptResult=await client.query<Record<string,unknown>>('SELECT cliente_id,empresa_id,matriz_version_id,ambito,estado FROM public.cliente_pt_evaluacion WHERE id=$1::bigint',[ptId]);
    if(!ptResult.rows.length) throw new GradoRiesgoV1Error('GR_PT_NO_ENCONTRADO');
    const pt=ptResult.rows[0];
    if(Number(pt.cliente_id)!==cliente||Number(pt.empresa_id)!==empresa||Number(pt.matriz_version_id)!==matriz||pt.ambito!=='PT') throw new GradoRiesgoV1Error('GR_PT_INCONSISTENTE');
    if(pt.estado!=='COMPLETADA') throw new GradoRiesgoV1Error('GR_PT_NO_COMPLETADO');
    const user=await client.query('SELECT 1 FROM public.usuarios WHERE id=$1',[actor]);
    if(!user.rows.length) throw new GradoRiesgoV1Error('GR_USUARIO_INVALIDO');
    const existing=await loadExisting(client,cliente,empresa,matriz,ptId);
    if(existing) { await client.query('COMMIT'); started=false; return existing; }

    const criteriaResult=await client.query<Record<string,unknown>>(
      `SELECT mc.id,mc.codigo,mc.orden,c.codigo_canonico
         FROM public.matriz_criterio mc
         JOIN public.catalogo_criterio_gr_version cv ON cv.id=mc.catalogo_criterio_gr_version_id
         JOIN public.catalogo_criterio_gr c ON c.id=cv.criterio_gr_id
        WHERE mc.matriz_version_id=$1 AND mc.ambito='GR'
        ORDER BY mc.orden,mc.id`,[matriz],
    );
    if(criteriaResult.rows.length<4) throw new GradoRiesgoV1Error('GR_CRITERIOS_INCOMPLETOS');
    if(criteriaResult.rows.length>4) throw new GradoRiesgoV1Error('GR_CRITERIOS_DUPLICADOS');
    const criteria:CriterioMatriz[]=criteriaResult.rows.map((r)=>({id:positive(r.id),codigo:criterionCode(r.codigo),orden:positive(r.orden)}));
    if(criteria.some((c,i)=>c.codigo!==rCode(criteriaResult.rows[i].codigo_canonico)||c.orden!==i+1)||new Set(criteria.map((c)=>c.id)).size!==4||new Set(criteria.map((c)=>c.codigo)).size!==4)
      throw new GradoRiesgoV1Error('GR_ORDENES_INVALIDOS');

    const results:ResolverResultado[]=[
      await resolverActividadEconomica(client,cliente,matriz),
      await resolverZonaGeografica(client,cliente,matriz),
      await resolverDestinoRecursos(client,cliente,empresa,matriz,ptId),
      await resolverPerfilTransaccional(client,cliente,empresa,matriz,ptId),
    ];
    if(results.length!==4||new Set(results.map((r)=>r.criterio_codigo)).size!==4||new Set(results.map((r)=>r.matriz_criterio_id)).size!==4)
      throw new GradoRiesgoV1Error('GR_RESOLVER_RESULTADO_INVALIDO');
    const byCode=new Map(results.map((r)=>[r.criterio_codigo,r]));
    for(const criterion of criteria) {
      const result=byCode.get(criterion.codigo);
      if(!result||result.resolver_codigo!==criterion.codigo||result.matriz_criterio_id!==criterion.id||!isRecord(result.evidencia)||![1,2,3].includes(result.puntaje))
        throw new GradoRiesgoV1Error('GR_RESOLVER_RESULTADO_INVALIDO');
    }
    const total=results.reduce((sum,r)=>sum+r.puntaje,0);
    if(!Number.isSafeInteger(total)||total<4||total>12) throw new GradoRiesgoV1Error('GR_PUNTAJE_INVALIDO');
    const ordinaryRows=await client.query<Record<string,unknown>>('SELECT id,codigo,orden,nombre_empresarial,minimo,maximo FROM public.matriz_resultado WHERE matriz_version_id=$1 AND ambito=\'GR\' AND minimo<=$2 AND maximo>=$2',[matriz,total]);
    if(!ordinaryRows.rows.length) throw new GradoRiesgoV1Error('GR_BANDA_ORDINARIA_AUSENTE');
    if(ordinaryRows.rows.length>1) throw new GradoRiesgoV1Error('GR_BANDA_ORDINARIA_DUPLICADA');
    const ordinary=normalizeBand(ordinaryRows.rows[0]);
    const causes:CausaAutomatica[]=results.filter((r)=>r.regla_aplicada.alto_automatico).map((r)=>({criterio_codigo:criterionCode(r.criterio_codigo),resolver_codigo:r.resolver_codigo,regla_id:r.regla_aplicada.id,causa_codigo:r.regla_aplicada.causa_codigo}));
    let finalBand=ordinary;
    if(causes.length) {
      const maximumRows=await client.query<Record<string,unknown>>('SELECT id,codigo,orden,nombre_empresarial,minimo,maximo FROM public.matriz_resultado WHERE matriz_version_id=$1 AND ambito=\'GR\' AND minimo<=12 AND maximo>=12',[matriz]);
      if(!maximumRows.rows.length) throw new GradoRiesgoV1Error('GR_BANDA_MAXIMA_AUSENTE');
      if(maximumRows.rows.length>1) throw new GradoRiesgoV1Error('GR_BANDA_MAXIMA_DUPLICADA');
      finalBand=normalizeBand(maximumRows.rows[0]);
    }
    const versionResult=await client.query<Record<string,unknown>>('SELECT COALESCE(MAX(numero_version),0)+1 AS numero_version FROM public.cliente_gr_evaluacion WHERE cliente_id=$1',[cliente]);
    const version=positive(versionResult.rows[0]?.numero_version);
    const header=await client.query<Record<string,unknown>>(`INSERT INTO public.cliente_gr_evaluacion(cliente_id,empresa_id,matriz_version_id,pt_evaluacion_id,numero_version,puntaje_total,matriz_resultado_id,creada_por) VALUES($1,$2,$3,$4::bigint,$5,$6,$7,$8) RETURNING id,estado,creada_en`,[cliente,empresa,matriz,ptId,version,total,finalBand.id,actor]);
    if(header.rows.length!==1||header.rows[0].estado!=='COMPLETADA') throw new GradoRiesgoV1Error('GR_PERSISTENCIA_INCOMPLETA');
    const evaluationId=bigintString(header.rows[0].id);
    for(const criterion of criteria) {
      const result=byCode.get(criterion.codigo)!;
      const evidence={...result.evidencia,regla_aplicada:result.regla_aplicada,integracion:{alto_automatico:causes.length>0,causas_automaticas:causes,banda_ordinaria:ordinary,banda_final:finalBand}};
      await client.query(`INSERT INTO public.cliente_gr_criterio_resultado(evaluacion_id,matriz_version_id,matriz_criterio_id,resolver_codigo,puntaje,orden,evidencia) VALUES($1::bigint,$2,$3,$4,$5,$6,$7::jsonb)`,[evaluationId,matriz,criterion.id,result.resolver_codigo,result.puntaje,criterion.orden,JSON.stringify(evidence)]);
    }
    const persisted=await client.query<Record<string,unknown>>('SELECT id,matriz_criterio_id,resolver_codigo,puntaje,orden,evidencia FROM public.cliente_gr_criterio_resultado WHERE evaluacion_id=$1::bigint ORDER BY orden',[evaluationId]);
    if(persisted.rows.length!==4) throw new GradoRiesgoV1Error('GR_PERSISTENCIA_INCOMPLETA');
    const persistedCriteria:CriterioPersistidoGr[]=persisted.rows.map((d)=>{const criterion=criteria.find((c)=>c.id===Number(d.matriz_criterio_id));if(!criterion)throw new GradoRiesgoV1Error('GR_PERSISTENCIA_INCOMPLETA');return{id:bigintString(d.id),matriz_criterio_id:criterion.id,criterio_codigo:criterion.codigo,resolver_codigo:text(d.resolver_codigo),puntaje:positive(d.puntaje) as Puntaje,orden:positive(d.orden),evidencia:d.evidencia};});
    const created:GradoRiesgoV1Resultado={idempotente:false,evaluacion:{id:evaluationId,cliente_id:cliente,empresa_id:empresa,matriz_version_id:matriz,pt_evaluacion_id:ptId,numero_version:version,puntaje_total:total,resultado:finalBand,alto_automatico:causes.length>0,causas_automaticas:causes,estado:'COMPLETADA',creada_en:iso(header.rows[0].creada_en),criterios:persistedCriteria}};
    await client.query('COMMIT'); started=false; return created;
  } catch(error) {
    if(client&&started) await client.query('ROLLBACK').catch(()=>{});
    throw error;
  } finally { client?.release(); }
}

function rCode(value:unknown):CriterioCodigo { return criterionCode(value); }
