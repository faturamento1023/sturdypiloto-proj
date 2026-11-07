'use strict';
// DEV-023: ponte de dados sintéticos da RPC para o motor puro. Não consulta o banco.
const {validDate}=require('./dev023_excecoes.cjs');
const {projectDay}=require('./dev023_projecao_grade.cjs');
function time(n){
 if(!Number.isInteger(n)||n<0||n>1440)throw new TypeError('minuto invalido');
 if(n===1440)return '24:00'; // A função pura não aceita 24:00; rejeitar abaixo explicitamente.
 return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
}
function adaptRpcDay({date,unitId,professionalId,regular=[],bookings=[],rpc}){
 if(!validDate(date)||typeof unitId!=='string'||!unitId.trim()||typeof professionalId!=='string'||!professionalId.trim())throw new TypeError('contexto invalido');
 if(!rpc||typeof rpc!=='object'||Array.isArray(rpc)||!Array.isArray(rpc.feriados)||!Array.isArray(rpc.excecoes))throw new TypeError('resposta RPC invalida');
 const holidays=rpc.feriados.map(h=>{
  if(!h||typeof h!=='object'||!validDate(h.date))throw new TypeError('feriado RPC invalido');
  return {date:h.date,unitId,active:true};
 });
 const exceptions=rpc.excecoes.map(e=>{
  if(!e||typeof e!=='object'||!validDate(e.date)||!['bloqueio','substituicao'].includes(e.kind)||!Number.isInteger(e.startMinute)||!Number.isInteger(e.endMinute)||e.startMinute<0||e.endMinute>1440||e.endMinute<=e.startMinute)throw new TypeError('excecao RPC invalida');
  if(e.endMinute===1440)throw new TypeError('fim 24:00 requer suporte explicito no motor puro');
  if(e.professionalId!==null&&(typeof e.professionalId!=='string'||!e.professionalId.trim()))throw new TypeError('profissional RPC invalido');
  if(e.roomId!=null&&(typeof e.roomId!=='string'||!e.roomId.trim()))throw new TypeError('sala RPC invalida');
  return {date:e.date,unitId,professionalId:e.professionalId,kind:e.kind,start:time(e.startMinute),end:time(e.endMinute),roomId:e.roomId??null};
 });
 return projectDay({date,unitId,professionalId,regular,bookings,holidays,exceptions,strictBookingScope:true});
}
module.exports={adaptRpcDay};
