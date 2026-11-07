'use strict';
// DEV-023: adaptador puro para simulacao da grade; NAO e integracao SQL nem regra homologada.
const {resolveDay}=require('./dev023_excecoes.cjs');
function projectDay(input){
 const resolved=resolveDay(input);
 const bookings=input.bookings??[];
 if(!Array.isArray(bookings))throw new TypeError('reservas invalidas');
 const intervals=bookings.filter(b=>b&&b.status!=='cancelado').map(b=>{
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
