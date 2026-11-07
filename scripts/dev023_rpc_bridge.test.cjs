'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {adaptRpcDay}=require('./dev023_rpc_bridge.cjs');
const base={date:'2026-11-09',unitId:'u1',professionalId:'p1',regular:[{start:'08:00',end:'12:00'}],bookings:[],rpc:{feriados:[],excecoes:[]}};
const run=x=>adaptRpcDay({...base,...x});
test('RPC vazia preserva janela regular',()=>assert.deepEqual(run({}).free,[{start:480,end:720,roomId:null}]));
test('bloqueio da unidade vindo da RPC reduz a grade',()=>assert.deepEqual(run({rpc:{feriados:[],excecoes:[{date:base.date,professionalId:null,kind:'bloqueio',startMinute:540,endMinute:600,roomId:null}]}}).free,[{start:480,end:540,roomId:null},{start:600,end:720,roomId:null}]));
test('feriado ativo da RPC fecha dia (regra proposta)',()=>assert.equal(run({rpc:{feriados:[{date:base.date}],excecoes:[]}}).free.length,0));
test('não permite resposta RPC incompleta nem tipos ambíguos',()=>{
 for(const rpc of [null,{}, {feriados:[],excecoes:null},{feriados:'x',excecoes:[]}]){
  assert.throws(()=>run({rpc}),/resposta RPC invalida/);
 }
});
test('rejeita intervalo inválido e limite 24:00 não suportado pelo motor puro',()=>{
 for(const [startMinute,endMinute] of [[600,600],[-1,600],[600,1440],[600,1500],[600.5,700]]){
  assert.throws(()=>run({rpc:{feriados:[],excecoes:[{date:base.date,professionalId:'p1',kind:'bloqueio',startMinute,endMinute}]}}),/excecao RPC invalida|24:00/);
 }
});
test('não permite reserva sem escopo na ponte RPC',()=>assert.throws(()=>run({bookings:[{start:540,end:600}]}),/escopo da reserva invalido/));
test('reserva sintética com escopo reduz a janela',()=>assert.deepEqual(run({bookings:[{unitId:'u1',professionalId:'p1',date:base.date,start:540,end:600,status:'confirmado'}]}).free,[{start:480,end:540,roomId:null},{start:600,end:720,roomId:null}]));
test('rejeita profissional e sala de tipo incorreto',()=>{
 for(const field of ['professionalId','roomId']){
  const e={date:base.date,professionalId:'p1',kind:'bloqueio',startMinute:540,endMinute:600,roomId:null,[field]:42};
  assert.throws(()=>run({rpc:{feriados:[],excecoes:[e]}}),/RPC invalido|RPC invalida/);
 }
});
