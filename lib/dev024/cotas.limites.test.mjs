import test from 'node:test';
import assert from 'node:assert/strict';
import { avaliarCota } from './cotas.mjs';

// Casos exclusivamente sintéticos. Não representam regras homologadas do WebUltra.
const pedido = { unidadeId:'unidade-ficticia', convenioId:'convenio-ficticio', procedimentoId:'procedimento-ficticio', grupoId:'grupo-ficticio', inicio:'2026-11-09T12:30:00Z' };
const regra = { id:'cota-ficticia', unidadeId:pedido.unidadeId, limite:1, intervaloMinutos:60 };
const avaliar = (regras, reservas=[], p=pedido) => avaliarCota({regras,reservas,pedido:p});

test('a mesma hora com offset diferente ocupa a cota', () => {
  const reserva = {...pedido, inicio:'2026-11-09T09:30:00-03:00'};
  assert.equal(avaliar([regra],[reserva]).permitido,false);
});
test('reserva de intervalo UTC anterior não ocupa a janela atual', () => {
  const reserva = {...pedido, inicio:'2026-11-09T11:59:59Z'};
  assert.equal(avaliar([regra],[reserva]).permitido,true);
});
test('reserva no início inclusivo da janela ocupa a cota', () => {
  const reserva = {...pedido, inicio:'2026-11-09T12:00:00Z'};
  assert.equal(avaliar([regra],[reserva]).permitido,false);
});
test('regra desativada não bloqueia mesmo com limite zero', () => {
  assert.equal(avaliar([{...regra,limite:0,ativo:false}]).permitido,true);
});
test('escopo de procedimento não conta outro procedimento', () => {
  const especifica = {...regra,procedimentoId:pedido.procedimentoId};
  const reserva = {...pedido,procedimentoId:'outro-procedimento-ficticio'};
  assert.equal(avaliar([especifica],[reserva]).permitido,true);
});
test('regra global da unidade conta procedimentos distintos', () => {
  const reserva = {...pedido,procedimentoId:'outro-procedimento-ficticio'};
  assert.equal(avaliar([regra],[reserva]).permitido,false);
});
test('nenhuma regra correspondente resulta em permitido, conforme política provisória', () => {
  assert.deepEqual(avaliar([{...regra,unidadeId:'outra-unidade-ficticia'}]),{permitido:true,detalhes:[]});
});
