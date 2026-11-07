'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {resolveDay}=require('./dev023_excecoes.cjs');
const ctx={date:'2026-11-09',unitId:'u1',professionalId:'m1',regular:[{start:'08:00',end:'12:00',roomId:'s1'}]};
const run=extra=>resolveDay({...ctx,...extra});
test('regular sem excecao',()=>assert.deepEqual(run({}).windows,[{start:480,end:720,roomId:'s1'}]));
test('feriado bloqueia mesmo com substituicao',()=>assert.deepEqual(run({holidays:[{date:ctx.date,unitId:'u1'}],exceptions:[{date:ctx.date,unitId:'u1',professionalId:'m1',kind:'substituicao',start:'13:00',end:'15:00'}]}),{status:'feriado',windows:[]}));
test('feriado de outra unidade nao afeta',()=>assert.equal(run({holidays:[{date:ctx.date,unitId:'u2'}]}).windows.length,1));
test('substituicao substitui integralmente janela regular',()=>assert.deepEqual(run({exceptions:[{date:ctx.date,unitId:'u1',professionalId:'m1',kind:'substituicao',start:'13:00',end:'15:00',roomId:'s2'}]}).windows,[{start:780,end:900,roomId:'s2'}]));
test('bloqueio parcial divide janela',()=>assert.deepEqual(run({exceptions:[{date:ctx.date,unitId:'u1',professionalId:'m1',kind:'bloqueio',start:'09:00',end:'10:00'}]}).windows,[{start:480,end:540,roomId:'s1'},{start:600,end:720,roomId:'s1'}]));
test('bloqueio de unidade atinge profissional',()=>assert.deepEqual(run({exceptions:[{date:ctx.date,unitId:'u1',kind:'bloqueio',start:'08:00',end:'12:00'}]}).windows,[]));
test('excecao de outro medico ignorada',()=>assert.equal(run({exceptions:[{date:ctx.date,unitId:'u1',professionalId:'m2',kind:'bloqueio',start:'08:00',end:'12:00'}]}).windows.length,1));
test('excecao de outra unidade ignorada',()=>assert.equal(run({exceptions:[{date:ctx.date,unitId:'u2',professionalId:'m1',kind:'bloqueio',start:'08:00',end:'12:00'}]}).windows.length,1));
test('intervalo adjacente nao bloqueia',()=>assert.equal(run({exceptions:[{date:ctx.date,unitId:'u1',kind:'bloqueio',start:'12:00',end:'13:00'}]}).windows.length,1));
test('substituicoes sobrepostas sao rejeitadas',()=>assert.throws(()=>run({exceptions:[{date:ctx.date,unitId:'u1',professionalId:'m1',kind:'substituicao',start:'13:00',end:'15:00'},{date:ctx.date,unitId:'u1',professionalId:'m1',kind:'substituicao',start:'14:00',end:'16:00'}]}),/sobrepostas/));
test('datas impossiveis rejeitadas',()=>assert.throws(()=>run({date:'2026-02-30'}),/contexto/));
test('substituicao de toda unidade rejeitada',()=>assert.throws(()=>run({exceptions:[{date:ctx.date,unitId:'u1',kind:'substituicao',start:'08:00',end:'09:00'}]}),/requer profissional/));

test('feriado com estado ambiguo e rejeitado sem assumir bloqueio',()=>assert.throws(()=>run({holidays:[{date:ctx.date,unitId:'u1',active:'false'}]}),/estado de feriado invalido/));
test('feriado explicitamente inativo preserva janela regular',()=>assert.equal(run({holidays:[{date:ctx.date,unitId:'u1',active:false}]}).windows.length,1));
test('estado invalido de feriado de outra unidade nao afeta consulta',()=>assert.equal(run({holidays:[{date:ctx.date,unitId:'u2',active:'false'}]}).windows.length,1));

// Identificadores com espacos nao representam unidade ou profissional valido.
test('escopo com identificadores em branco e rejeitado',()=>{
 assert.throws(()=>run({unitId:'   '}),/contexto invalido/);
 assert.throws(()=>run({professionalId:'  '}),/contexto invalido/);
});

// Regressao: payloads malformados devem falhar fechados antes de calcular disponibilidade.
test('colecoes ausentes sao opcionais, mas colecoes malformadas sao rejeitadas',()=>{
 assert.equal(run({}).status,'regular');
 for(const field of ['regular','exceptions','holidays']){
  for(const value of [null,{},'invalido',false]){
   assert.throws(()=>run({[field]:value}),/colecoes de agenda invalidas/);
  }
 }
});
