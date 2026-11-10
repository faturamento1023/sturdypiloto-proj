import test from 'node:test';
import assert from 'node:assert/strict';
import { avaliarCota } from './cotas.mjs';

const pedido = {unidadeId:'u-teste',convenioId:'c-teste',procedimentoId:'p-teste',grupoId:'g-teste',inicio:'2026-11-09T12:30:00Z'};
const regra = {id:'r-teste',unidadeId:'u-teste',limite:1,intervaloMinutos:60};

test('reserva ativa com offset positivo equivalente a UTC consome cota',()=>{
  const reserva={...pedido,inicio:'2026-11-09T09:15:00-03:00',status:'confirmada'};
  const resultado=avaliarCota({pedido,regras:[regra],reservas:[reserva]});
  assert.equal(resultado.permitido,false);
  assert.equal(resultado.detalhes[0].usados,1);
});

test('reserva ativa com offset positivo em outra janela nao consome cota',()=>{
  const reserva={...pedido,inicio:'2026-11-09T15:15:00+02:00',status:'confirmada'};
  const resultado=avaliarCota({pedido,regras:[regra],reservas:[reserva]});
  assert.equal(resultado.permitido,true);
  assert.equal(resultado.detalhes[0].usados,0);
});

test('reserva ativa sem offset continua rejeitada',()=>{
  assert.throws(()=>avaliarCota({pedido,regras:[],reservas:[{...pedido,inicio:'2026-11-09T12:15:00',status:'confirmada'}]}),TypeError);
});
