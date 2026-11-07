'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createException}=require('./dev023_comandos.cjs');
const actor={id:'fake',active:true,mfa:true,role:'gestao',units:['u1']};
const command={unitId:'u1',date:'2026-11-09',kind:'bloqueio',start:'08:00',end:'12:00'};
function fake(overrides={}){const events=[];let committed=0;const tx={isActiveMembership:async()=>true,hasAffectedReservations:async()=>false,hasConflictingException:async()=>false,insertException:async()=>({id:'e1'}),audit:async e=>{events.push(e);return true;},...overrides};return {events,get committed(){return committed},transaction:async fn=>{const result=await fn(tx);committed++;return result;}};}
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

test('perfil administrador do banco autorizado com MFA e vinculo',async()=>assert.equal((await createException({actor:{...actor,role:'administrador'},command,db:fake()})).status,201));
test('nome de perfil inexistente administracao rejeitado',async()=>assert.equal((await createException({actor:{...actor,role:'administracao'},command,db:fake()})).status,403));

test('ator sem id nao inicia transacao',async()=>{const d=fake();assert.equal((await createException({actor:{...actor,id:undefined},command,db:d})).status,403);assert.equal(d.committed,0);});
test('ator com id vazio nao inicia transacao',async()=>{const d=fake();assert.equal((await createException({actor:{...actor,id:'  '},command,db:d})).status,403);assert.equal(d.committed,0);});

test('data inexistente rejeitada antes de iniciar transacao',async()=>{
 const d=fake();
 assert.equal((await createException({actor,command:{...command,date:'2026-02-30'},db:d})).status,400);
 assert.equal(d.committed,0);
 assert.equal(d.events.length,0);
});
test('falha na insercao nao registra auditoria nem confirma transacao',async()=>{
 const d=fake({insertException:async()=>{throw Error('insert failure')}});
 await assert.rejects(createException({actor,command,db:d}),/insert failure/);
 assert.equal(d.committed,0);
 assert.equal(d.events.length,0);
});
test('auditoria registra identidade e unidade do ator autorizado',async()=>{
 const d=fake();
 const response=await createException({actor,command,db:d});
 assert.equal(response.status,201);
 assert.deepEqual(d.events,[{actorId:'fake',unitId:'u1',recordId:'e1',action:'excecao_criada'}]);
});

test('id persistido vazio ou apenas espacos aborta antes da auditoria',async()=>{
 for(const id of ['', '  ', null, 123]){
  const d=fake({insertException:async()=>({id})});
  await assert.rejects(createException({actor,command,db:d}),/insercao sem id valido/);
  assert.equal(d.committed,0);
  assert.equal(d.events.length,0);
 }
});

test('vinculo indefinido ou objeto nao autoriza',async()=>{
 for(const membership of [undefined,null,1,{active:true},'true']){
  const d=fake({isActiveMembership:async()=>membership});
  assert.equal((await createException({actor,command,db:d})).status,403);
  assert.equal(d.events.length,0);
 }
});
test('consulta de reservas com resposta ambigua aborta sem escrita',async()=>{
 for(const affected of [undefined,null,0,'false',{}]){
  const d=fake({hasAffectedReservations:async()=>affected});
  await assert.rejects(createException({actor,command,db:d}),/resultado invalido da consulta de agendamentos/);
  assert.equal(d.committed,0);
  assert.equal(d.events.length,0);
 }
});
test('consulta de conflitos com resposta ambigua aborta sem escrita',async()=>{
 for(const conflict of [undefined,null,0,'false',{}]){
  const d=fake({hasConflictingException:async()=>conflict});
  await assert.rejects(createException({actor,command,db:d}),/resultado invalido da consulta de conflitos/);
  assert.equal(d.committed,0);
  assert.equal(d.events.length,0);
 }
});

test('auditoria sem confirmacao explicita aborta transacao',async()=>{
 for(const answer of [undefined,null,false,0,'true',{}]){
  const d=fake({audit:async e=>{d.events.push(e);return answer;}});
  await assert.rejects(createException({actor,command,db:d}),/auditoria nao confirmada/);
  assert.equal(d.committed,0);
  assert.equal(d.events.length,1);
 }
});
