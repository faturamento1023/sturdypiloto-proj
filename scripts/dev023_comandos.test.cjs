'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createException}=require('./dev023_comandos.cjs');
const actor={id:'fake',active:true,mfa:true,role:'gestao',units:['u1']};
const command={unitId:'u1',date:'2026-11-09',kind:'bloqueio',start:'08:00',end:'12:00'};
function fake(overrides={}){const events=[];let committed=0;const tx={isActiveMembership:async()=>true,hasAffectedReservations:async()=>false,hasConflictingException:async()=>false,insertException:async()=>({id:'e1'}),audit:async e=>events.push(e),...overrides};return {events,get committed(){return committed},transaction:async fn=>{const result=await fn(tx);committed++;return result;}};}
test('MFA exigido',async()=>assert.equal((await createException({actor:{...actor,mfa:false},command})).status,403));
test('isolamento por unidade',async()=>assert.equal((await createException({actor,command:{...command,unitId:'u2'}})).status,403));
test('recepcao nao altera',async()=>assert.equal((await createException({actor:{...actor,role:'recepcao'},command})).status,403));
test('vinculo revogado bloqueia',async()=>assert.equal((await createException({actor,command,db:fake({isActiveMembership:async()=>false})})).status,403));
test('reserva existente bloqueia',async()=>{const d=fake({hasAffectedReservations:async()=>true});assert.equal((await createException({actor,command,db:d})).status,409);assert.equal(d.events.length,0);});
test('conflito bloqueia',async()=>assert.equal((await createException({actor,command,db:fake({hasConflictingException:async()=>true})})).status,409));
test('sucesso audita',async()=>{const d=fake();assert.equal((await createException({actor,command,db:d})).status,201);assert.equal(d.events.length,1);});
test('auditoria falha aborta transacao',async()=>{const d=fake({audit:async()=>{throw Error('audit failure')}});await assert.rejects(createException({actor,command,db:d}),/audit failure/);assert.equal(d.committed,0);});
test('substituicao sem profissional invalida',async()=>assert.equal((await createException({actor,command:{...command,kind:'substituicao'},db:fake()})).status,400));

test('campos arbitrarios nao sao enviados para persistencia',async()=>{
 let inserted;const d=fake({insertException:async c=>{inserted=c;return {id:'e1'};}});
 assert.equal((await createException({actor,command:{...command,patientId:'SEGREDO-FICTICIO',role:'administracao'},db:d})).status,201);
 assert.equal(Object.hasOwn(inserted,'patientId'),false);
 assert.equal(Object.hasOwn(inserted,'role'),false);
});
test('unidades nao-array nao autorizam',async()=>assert.equal((await createException({actor:{...actor,units:'u1'},command})).status,403));
test('profissional vazio rejeitado',async()=>assert.equal((await createException({actor,command:{...command,professionalId:'  '},db:fake()})).status,400));
test('sala vazia rejeitada',async()=>assert.equal((await createException({actor,command:{...command,roomId:' '},db:fake()})).status,400));
test('id ausente aborta auditoria',async()=>{const d=fake({insertException:async()=>({})});await assert.rejects(createException({actor,command,db:d}),/insercao sem id/);assert.equal(d.events.length,0);});
