'use strict';
// DEV-021: projeção pura da grade, somente dados sintéticos ou previamente autorizados.
// Datas ISO com deslocamento obrigatório; janela [inicio,fim).
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
function timestamp(value){if(typeof value!=='string'||!ISO.test(value))throw new TypeError('instante ISO com fuso obrigatorio');const n=Date.parse(value);if(!Number.isFinite(n))throw new TypeError('instante invalido');return n;}
function windowBounds(start,end){const a=timestamp(start),b=timestamp(end);if(b<=a||b-a>31*86400000)throw new RangeError('janela deve ter ate 31 dias');return {a,b};}
function overlaps(start,end,a,b){return start<b&&end>a;}
function projectGrid(rows,{start,end,professionalId,unitId}){
 const {a,b}=windowBounds(start,end);
 if(typeof unitId!=='string'||!unitId.trim())throw new TypeError('unidade obrigatoria');
 if(!Array.isArray(rows))throw new TypeError('linhas invalidas');
 const slots=[];
 for(const r of rows){
  if(!r||r.unitId!==unitId||professionalId&&r.professionalId!==professionalId)continue;
  if(!['reservado','confirmado','remarcado','cancelado','realizado'].includes(r.status))throw new TypeError('estado invalido');
  const from=timestamp(r.start),to=timestamp(r.end);
  if(to<=from)throw new RangeError('intervalo invalido');
  if(!overlaps(from,to,a,b))continue;
  slots.push({id:r.id,professionalId:r.professionalId,start:r.start,end:r.end,status:r.status});
 }
 slots.sort((x,y)=>timestamp(x.start)-timestamp(y.start)||String(x.id).localeCompare(String(y.id)));
 return slots;
}
module.exports={timestamp,windowBounds,overlaps,projectGrid};
