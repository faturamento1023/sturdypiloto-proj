'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {readGrid}=require('./dev021_leitura.cjs');
const query={unitId:'u-ficticia',professionalId:'m-ficticio',start:'2026-11-09T08:00:00-03:00',end:'2026-11-09T09:00:00-03:00'};
const actor={id:'user-ficticio',active:true,mfa:true,role:'medico',professionalId:'m-ficticio',units:['u-ficticia']};
const slot={id:'slot-ficticio',unitId:'u-ficticia',professionalId:'m-ficticio',start:query.start,end:query.end,status:'confirmado',patientId:'nao-publicar'};
function repository(){let reads=0;return {get reads(){return reads},isActiveMembership:async()=>true,readSlots:async()=>{reads++;return [slot]}};}
test('medico acessa somente propria agenda',async()=>{const r=repository();const result=await readGrid({actor,query,repository:r});assert.equal(result.status,200);assert.equal(result.slots.length,1);assert.equal(r.reads,1);assert.equal(JSON.stringify(result).includes('patientId'),false)});
test('medico sem filtro profissional e negado',async()=>{const r=repository();assert.equal((await readGrid({actor,query:{...query,professionalId:undefined},repository:r})).status,403);assert.equal(r.reads,0)});
test('medico nao consulta outro profissional',async()=>{const r=repository();assert.equal((await readGrid({actor,query:{...query,professionalId:'outro'},repository:r})).status,403);assert.equal(r.reads,0)});
test('unidade diferente e negada',async()=>{const r=repository();assert.equal((await readGrid({actor,query:{...query,unitId:'outra'},repository:r})).status,403);assert.equal(r.reads,0)});
test('MFA ausente impede consulta',async()=>{const r=repository();assert.equal((await readGrid({actor:{...actor,mfa:false},query,repository:r})).status,403);assert.equal(r.reads,0)});
test('vinculo revogado impede leitura',async()=>{const r=repository();r.isActiveMembership=async()=>false;assert.equal((await readGrid({actor,query,repository:r})).status,403);assert.equal(r.reads,0)});
test('janela invalida retorna 400 sem consultar',async()=>{const r=repository();assert.equal((await readGrid({actor,query:{...query,end:query.start},repository:r})).status,400);assert.equal(r.reads,0)});
test('recepcao vinculada pode filtrar unidade',async()=>{const r=repository();const a={...actor,role:'recepcao'};assert.equal((await readGrid({actor:a,query:{...query,professionalId:undefined},repository:r})).status,200)});
