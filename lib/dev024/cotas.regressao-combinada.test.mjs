import test from 'node:test';
import assert from 'node:assert/strict';
import { avaliarCota } from './cotas.mjs';

// Regressões com dados exclusivamente fictícios; não simulam transações.
const pedido={unidadeId:'u-ficticia',convenioId:'c-ficticio',procedimentoId:'p-ficticio',grupoId:'g-ficticio',inicio:'2026-11-09T12:30:00Z'};
const regra={id:'r-ficticia',unidadeId:pedido.unidadeId,limite:1,intervaloMinutos:60};
const reserva={...pedido,status:'confirmada',inicio:'2026-11-09T12:05:00Z'};
const avaliar=(regras,reservas=[],p=pedido)=>avaliarCota({regras,reservas,pedido:p});

test('limite zero bloqueia mesmo sem reservas',()=>{
  const r=avaliar([{...regra,limite:0}]);
  assert.equal(r.permitido,false);
  assert.deepEqual(r.detalhes[0],{regraId:regra.id,limite:0,usados:0,disponiveis:0,permitido:false});
});
test('regra mais restritiva prevalece mesmo quando outra permite',()=>{
  const r=avaliar([{...regra,id:'ampla',limite:2},{...regra,id:'estrita',limite:1}],[reserva]);
  assert.equal(r.permitido,false);
  assert.deepEqual(r.detalhes.map(x=>x.permitido),[true,false]);
});
test('cancelamento não consome cota e reserva ativa consome',()=>{
  assert.equal(avaliar([regra],[{...reserva,status:'cancelada'}]).permitido,true);
  assert.equal(avaliar([regra],[reserva]).permitido,false);
});
test('reserva de outra unidade não consome cota da unidade corrente',()=>{
  assert.equal(avaliar([regra],[{...reserva,unidadeId:'outra-unidade-ficticia'}]).permitido,true);
});
test('instante no limite final exclusivo não consome janela anterior',()=>{
  assert.equal(avaliar([regra],[{...reserva,inicio:'2026-11-09T13:00:00Z'}]).permitido,true);
});
