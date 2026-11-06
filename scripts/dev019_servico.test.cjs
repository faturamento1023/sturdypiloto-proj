'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const {revisePrice}=require('./dev019_servico.cjs');
const actor={id:'fake-1',active:true,mfa:true,role:'gestao',units:['u1']};
const input={unitId:'u1',agreementId:'c1',procedureId:'p1',start:'2026-11-01',end:null,cents:12000,expectedRevision:2};
function db(overrides={}){let events=[],commits=0;const tx={isActiveMembership:async()=>true,lockPrice:async()=>({id:'price-fake',revision:2}),updatePrice:async()=>true,audit:async e=>events.push(e),...overrides};return {events,get commits(){return commits},transaction:async fn=>{const result=await fn(tx);commits++;return result}};}
test('nega sem MFA',async()=>assert.equal((await revisePrice({actor:{...actor,mfa:false},input,db:null})).status,403));
test('nega recepcao',async()=>assert.equal((await revisePrice({actor:{...actor,role:'recepcao'},input,db:null})).status,403));
test('nega outra unidade',async()=>assert.equal((await revisePrice({actor,input:{...input,unitId:'u2'},db:null})).status,403));
test('nega vinculo revogado',async()=>{const d=db({isActiveMembership:async()=>false});assert.equal((await revisePrice({actor,input,db:d})).status,403);assert.equal(d.events.length,0)});
test('revisao obsoleta',async()=>{const d=db({lockPrice:async()=>({id:'price-fake',revision:3})});assert.equal((await revisePrice({actor,input,db:d})).status,412);assert.equal(d.events.length,0)});
test('centavos fracionarios',async()=>assert.equal((await revisePrice({actor,input:{...input,cents:1.2},db:null})).status,400));
test('atualiza e audita',async()=>{const d=db();assert.deepEqual(await revisePrice({actor,input,db:d}),{status:200,revision:3});assert.equal(d.events.length,1);assert.equal(d.commits,1)});
test('falha de auditoria exige rollback',async()=>{const d=db({audit:async()=>{throw Error('audit-failed')}});await assert.rejects(()=>revisePrice({actor,input,db:d}),/audit-failed/);assert.equal(d.commits,0)});

test('atualizacao usa id da linha bloqueada',async()=>{let update=null;const d=db({updatePrice:async data=>{update=data;return true;}});assert.equal((await revisePrice({actor,input,db:d})).status,200);assert.equal(update.priceId,'price-fake');assert.equal(update.unitId,'u1');assert.equal(update.expectedRevision,2);});
