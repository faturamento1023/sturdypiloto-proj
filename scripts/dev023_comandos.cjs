'use strict';
const {validDate,window}=require('./dev023_excecoes.cjs');
function validate(c){
 if(!c||typeof c.unitId!=='string'||!c.unitId||!validDate(c.date)||!['bloqueio','substituicao'].includes(c.kind))throw Error('comando invalido');
 if(c.kind==='substituicao'&&!c.professionalId)throw Error('profissional obrigatorio');
 window(c);return c;
}
async function createException({actor,command,db}){
 if(!actor||!actor.active||!actor.mfa||!['gestao','administracao'].includes(actor.role)||!actor.units?.includes(command?.unitId))return {status:403};
 let data;try{data=validate(command);}catch{return {status:400};}
 return db.transaction(async tx=>{
  if(!await tx.isActiveMembership(actor.id,data.unitId))return {status:403};
  if(await tx.hasAffectedReservations(data))return {status:409,error:'agendamentos_existentes'};
  if(await tx.hasConflictingException(data))return {status:409,error:'excecao_conflitante'};
  const record=await tx.insertException(data);
  await tx.audit({actorId:actor.id,unitId:data.unitId,recordId:record.id,action:'excecao_criada'});
  return {status:201,id:record.id};
 });
}
module.exports={validate,createException};
