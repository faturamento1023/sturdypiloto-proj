'use strict';
const {validDate,window}=require('./dev023_excecoes.cjs');
function validate(c){
 if(!c||typeof c!=='object'||Array.isArray(c)||typeof c.unitId!=='string'||!c.unitId.trim()||!validDate(c.date)||!['bloqueio','substituicao'].includes(c.kind))throw Error('comando invalido');
 if(c.professionalId!=null&&(typeof c.professionalId!=='string'||!c.professionalId.trim()))throw Error('profissional invalido');
 if(c.kind==='substituicao'&&!c.professionalId)throw Error('profissional obrigatorio');
 if(c.roomId!=null&&(typeof c.roomId!=='string'||!c.roomId.trim()))throw Error('sala invalida');
 window(c);
 return {unitId:c.unitId,date:c.date,kind:c.kind,professionalId:c.professionalId??null,roomId:c.roomId??null,start:c.start,end:c.end};
}
async function createException({actor,command,db}){
 if(!actor||typeof actor.id!=='string'||!actor.id.trim()||actor.active!==true||actor.mfa!==true||!['gestao','administrador'].includes(actor.role)||!Array.isArray(actor.units)||!actor.units.includes(command?.unitId))return {status:403};
 let data;try{data=validate(command);}catch{return {status:400};}
 if(!db||typeof db.transaction!=='function')throw Error('adaptador transacional obrigatorio');
 return db.transaction(async tx=>{
  // Falhar fechado: adaptadores devem retornar booleanos reais, nao objetos truthy/falsy.
  const membership=await tx.isActiveMembership(actor.id,data.unitId);
  if(membership!==true)return {status:403};
  const affected=await tx.hasAffectedReservations(data);
  if(affected!==false){
   if(affected===true)return {status:409,error:'agendamentos_existentes'};
   throw Error('resultado invalido da consulta de agendamentos');
  }
  const conflict=await tx.hasConflictingException(data);
  if(conflict!==false){
   if(conflict===true)return {status:409,error:'excecao_conflitante'};
   throw Error('resultado invalido da consulta de conflitos');
  }
  const record=await tx.insertException(data);
  if(!record||typeof record.id!=='string'||!record.id.trim())throw Error('insercao sem id valido');
  const audited=await tx.audit({actorId:actor.id,unitId:data.unitId,recordId:record.id,action:'excecao_criada'});
  if(audited!==true)throw Error('auditoria nao confirmada');
  return {status:201,id:record.id};
 });
}
module.exports={validate,createException};
