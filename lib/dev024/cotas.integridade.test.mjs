import test from 'node:test';
import assert from 'node:assert/strict';
import { avaliarCota } from './cotas.mjs';
const pedido = { unidadeId:'u1', convenioId:'c1', procedimentoId:'p1', grupoId:'g1', inicio:'2026-11-09T12:30:00Z' };
const regra = { id:'r1', unidadeId:'u1', limite:1, intervaloMinutos:60 };
test('regra sem identificador auditavel e rejeitada', () => assert.throws(() => avaliarCota({regras:[{...regra,id:'  '}],reservas:[],pedido}), /Regra inválida/));
test('intervalo em minutos seguro mas milissegundos com overflow e rejeitado', () => assert.throws(() => avaliarCota({regras:[{...regra,intervaloMinutos:Number.MAX_SAFE_INTEGER}],reservas:[],pedido}), /Intervalo em milissegundos inválido/));
test('regra válida preserva a avaliação', () => assert.equal(avaliarCota({regras:[regra],reservas:[],pedido}).permitido,true));

test('intervalo superior ao domínio temporal do Date é rejeitado mesmo com milissegundos seguros', () => assert.throws(() => avaliarCota({regras:[{...regra,intervaloMinutos:144000000001}],reservas:[],pedido}), /Intervalo em milissegundos inválido/));
