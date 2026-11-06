'use strict';
const {projectGrid,windowBounds}=require('./dev021_grade.cjs');
const ROLES=new Set(['recepcao','medico','gestao','administracao']);
function authorized(actor,unitId,professionalId){
 if(!actor||actor.active!==true||actor.mfa!==true||!ROLES.has(actor.role)||!Array.isArray(actor.units)||!actor.units.includes(unitId))return false;
 if(actor.role==='medico'&&(!professionalId||professionalId!==actor.professionalId))return false;
 return true;
}
// O repositório de leitura deve aplicar filtro de unidade e vínculo no servidor;
// a projeção é uma segunda camada de defesa, nunca substitui RLS.
async function readGrid({actor,query,repository}){
 if(!query||typeof query!=='object'||Array.isArray(query))return {status:400,error:'consulta_invalida'};
 const {unitId,professionalId,start,end}=query;
 if(typeof unitId!=='string'||!unitId.trim()||professionalId!=null&&(typeof professionalId!=='string'||!professionalId.trim()))return {status:400,error:'consulta_invalida'};
 try{windowBounds(start,end);}catch{return {status:400,error:'janela_invalida'};}
 if(!authorized(actor,unitId,professionalId))return {status:403,error:'acesso_negado'};
 if(!repository||typeof repository.readSlots!=='function'||typeof repository.isActiveMembership!=='function')throw new TypeError('repositorio obrigatorio');
 if(!await repository.isActiveMembership(actor.id,unitId,actor.role))return {status:403,error:'acesso_negado'};
 const rows=await repository.readSlots({unitId,professionalId,start,end,actorId:actor.id});
 return {status:200,slots:projectGrid(rows,{unitId,professionalId,start,end})};
}
module.exports={authorized,readGrid};
