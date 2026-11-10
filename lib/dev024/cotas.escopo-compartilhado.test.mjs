import test from 'node:test';
import assert from 'node:assert/strict';
import { avaliarCota } from './cotas.mjs';
const inicio='2026-11-07T12:00:00Z';
const pedido={unidadeId:'u1',convenioId:'c2',procedimentoId:'p2',grupoId:'g2',inicio};
const reserva=(overrides={})=>({...pedido,convenioId:'c1',procedimentoId:'p1',grupoId:'g1',status:'ativa',...overrides});
const regra=(overrides={})=>({id:'r1',unidadeId:'u1',limite:1,intervaloMinutos:60,...overrides});
test('cota global inclui reservas de outros convênios, procedimentos e grupos',()=>{
 const x=avaliarCota({regras:[regra()],reservas:[reserva()],pedido});
 assert.equal(x.permitido,false);assert.equal(x.detalhes[0].usados,1);
});
test('cota por convênio inclui procedimentos e grupos diferentes',()=>{
 assert.equal(avaliarCota({regras:[regra({convenioId:'c2'})],reservas:[reserva({convenioId:'c2'})],pedido}).permitido,false);
});
test('cota por procedimento inclui convênios diferentes',()=>{
 assert.equal(avaliarCota({regras:[regra({procedimentoId:'p2'})],reservas:[reserva({procedimentoId:'p2'})],pedido}).permitido,false);
});
test('cota por grupo inclui procedimentos diferentes',()=>{
 assert.equal(avaliarCota({regras:[regra({grupoId:'g2'})],reservas:[reserva({grupoId:'g2'})],pedido}).permitido,false);
});
test('regra específica não inclui reserva de outro convênio',()=>{
 const x=avaliarCota({regras:[regra({convenioId:'c2'})],reservas:[reserva()],pedido});
 assert.equal(x.permitido,true);assert.equal(x.detalhes[0].usados,0);
});
test('outra unidade e cancelamentos não consomem cota global',()=>{
 const x=avaliarCota({regras:[regra()],reservas:[reserva({unidadeId:'u2'}),reserva({status:'cancelada'})],pedido});
 assert.equal(x.permitido,true);assert.equal(x.detalhes[0].usados,0);
});
