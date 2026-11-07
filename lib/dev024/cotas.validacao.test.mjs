import test from 'node:test';
import assert from 'node:assert/strict';
import { avaliarCota } from './cotas.mjs';

const pedido = { unidadeId:'u1', convenioId:'c1', procedimentoId:'p1', grupoId:'g1', inicio:'2026-11-09T12:30:00Z' };
const regra = { id:'r1', unidadeId:'u1', limite:2, intervaloMinutos:60 };

for (const ativo of ['false', 'true', 0, 1, null]) {
  test('estado de regra ambiguo rejeitado: '+String(ativo), () =>
    assert.throws(() => avaliarCota({ regras:[{...regra, ativo}], reservas:[], pedido }), /Estado da regra/));
}
test('regra explicitamente desativada nao consome cota', () =>
  assert.equal(avaliarCota({ regras:[{...regra, ativo:false}], reservas:[], pedido }).permitido, true));
test('reserva ativa sem fuso e rejeitada', () =>
  assert.throws(() => avaliarCota({ regras:[regra], reservas:[{...pedido, inicio:'2026-11-09T12:30:00'}], pedido }), /Data da reserva/));
test('reserva ativa com fuso explicito conta', () =>
  assert.equal(avaliarCota({ regras:[{...regra,limite:1}], reservas:[{...pedido,inicio:'2026-11-09T09:30:00-03:00'}], pedido }).permitido, false));
