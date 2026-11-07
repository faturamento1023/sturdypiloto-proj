'use strict';
// DEV-023: adaptador puro para simulacao da grade; NAO e integracao SQL nem regra homologada.
const {resolveDay,validDate}=require('./dev023_excecoes.cjs');
function projectDay(input){
 const resolved=resolveDay(input);
 const bookings=input.bookings??[];
 // Modo estrito para integracoes: nao aceitar reservas sem escopo completo.
 // O modo legado permanece apenas para testes sinteticos anteriores.
 const strictScope=input.strictBookingScope===true;
 if(!Array.isArray(bookings))throw new TypeError('reservas invalidas');
 const intervals=bookings.filter(b=>{
  if(!b||typeof b!=='object')throw new TypeError('reserva invalida');
  // No modo estrito, escopo ausente e erro (nao assumir que pertence ao profissional).
  if(strictScope&&(typeof b.unitId!=='string'||!b.unitId||typeof b.professionalId!=='string'||!b.professionalId||!validDate(b.date)))throw new TypeError('escopo da reserva invalido');
  // Modo legado aceita registros sem escopo somente em simulacoes.
  if(strictScope&&(!Number.isInteger(b.start)||!Number.isInteger(b.end)||b.start<0||b.end>1440||b.end<=b.start))throw new TypeError('reserva invalida');
  // Mesmo reservas fora do escopo precisam ser integras no modo estrito.
  // Evita esconder dados corrompidos por filtros de unidade, profissional ou data.
  if(b.unitId!==undefined&&b.unitId!==input.unitId)return false;
  if(b.professionalId!==undefined&&b.professionalId!==input.professionalId)return false;
  if(b.date!==undefined&&b.date!==input.date)return false;
  return b.status!=='cancelado';
 }).map(b=>{
  if(!Number.isInteger(b.start)||!Number.isInteger(b.end)||b.start<0||b.end>1440||b.end<=b.start)throw new TypeError('reserva invalida');
  return {start:b.start,end:b.end};
 });
 const free=resolved.windows.flatMap(w=>{
  let parts=[w];
  for(const b of intervals)parts=parts.flatMap(p=>{
   if(b.end<=p.start||b.start>=p.end)return [p];
   const out=[];
   if(b.start>p.start)out.push({...p,end:b.start});
   if(b.end<p.end)out.push({...p,start:b.end});
   return out;
  });
  return parts;
 });
 return {status:resolved.status,free};
}
module.exports={projectDay};
