'use strict';
// DEV-023: regra proposta para o Piloto; nao representa comportamento confirmado do WebUltra.
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const TIME=/^([01]\d|2[0-3]):[0-5]\d$/;
function validDate(v){if(typeof v!=='string'||!DATE.test(v))return false;const d=new Date(v+'T00:00:00Z');return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===v;}
function minutes(v){if(typeof v!=='string'||!TIME.test(v))throw new TypeError('horario invalido');return Number(v.slice(0,2))*60+Number(v.slice(3));}
function window(w){if(!w||typeof w!=='object')throw new TypeError('janela invalida');const start=minutes(w.start),end=minutes(w.end);if(end<=start)throw new RangeError('intervalo invalido');return {start,end,roomId:w.roomId??null};}
function merge(windows){const ordered=windows.slice().sort((a,b)=>a.start-b.start||a.end-b.end);const out=[];for(const w of ordered){const last=out[out.length-1];if(last&&w.start<last.end)throw new RangeError('janelas sobrepostas');out.push(w);}return out;}
function subtract(windows,blocks){let result=windows.slice();for(const block of blocks){result=result.flatMap(w=>{if(block.end<=w.start||block.start>=w.end)return [w];const pieces=[];if(block.start>w.start)pieces.push({...w,end:block.start});if(block.end<w.end)pieces.push({...w,start:block.end});return pieces;});}return result;}
function resolveDay({date,unitId,professionalId,regular=[],exceptions=[],holidays=[]}){
 if(!validDate(date)||typeof unitId!=='string'||!unitId||typeof professionalId!=='string'||!professionalId)throw new TypeError('contexto invalido');
 const selected=exceptions.filter(e=>e&&e.date===date&&e.unitId===unitId&&(e.professionalId===professionalId||e.professionalId==null));
 for(const e of selected){if(!['bloqueio','substituicao'].includes(e.kind))throw new TypeError('tipo invalido');if(e.professionalId==null&&e.kind==='substituicao')throw new TypeError('substituicao requer profissional');window(e);}
 const holiday=holidays.some(h=>h&&h.date===date&&h.unitId===unitId&&h.active!==false);
 // Feriado prevalece: liberar feriado exige fluxo futuro de aprovacao explicita.
 if(holiday)return {status:'feriado',windows:[]};
 const replacements=selected.filter(e=>e.kind==='substituicao');
 const base=replacements.length?replacements.map(window):regular.map(window);
 const blocks=selected.filter(e=>e.kind==='bloqueio').map(window);
 return {status:replacements.length?'substituicao':'regular',windows:subtract(merge(base),blocks)};
}
module.exports={validDate,minutes,window,resolveDay};
