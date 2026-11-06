'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {assertDate,validatePriceCents,centavosDeReais,overlaps,selectPrice}=require('./dev019_precos.cjs');
test('vigencias adjacentes nao se sobrepoem',()=>assert.equal(overlaps({start:'2026-01-01',end:'2026-01-10'},{start:'2026-01-10',end:'2026-01-20'}),false));
test('vigencias sobrepostas sao identificadas',()=>assert.equal(overlaps({start:'2026-01-01',end:'2026-01-11'},{start:'2026-01-10',end:null}),true));
test('vigencia vazia e invalida',()=>assert.throws(()=>overlaps({start:'2026-01-10',end:'2026-01-10'},{start:'2026-01-10',end:null})));
test('data civil invalida e rejeitada',()=>assert.throws(()=>assertDate('2026-02-30')));
test('valor nao inteiro ou negativo e rejeitado',()=>{for(const v of [-1,1.2,NaN,Infinity,'100',2147483648]) assert.throws(()=>validatePriceCents(v));});
test('fronteira da vigencia seleciona segundo preco',()=>{const rows=[{unitId:'u',procedureId:'p',agreementId:'c',active:true,start:'2026-01-01',end:'2026-01-10',cents:100},{unitId:'u',procedureId:'p',agreementId:'c',active:true,start:'2026-01-10',end:'2026-01-20',cents:200}];assert.equal(selectPrice(rows,{unitId:'u',procedureId:'p',agreementId:'c',date:'2026-01-10'}).cents,200);assert.equal(selectPrice(rows,{unitId:'u',procedureId:'p',agreementId:'c',date:'2026-01-20'}),null);});
test('nao ha fallback entre unidades ou convenios',()=>{const rows=[{unitId:'u1',procedureId:'p',agreementId:'particular',active:true,start:'2026-01-01',end:null,cents:100}];assert.equal(selectPrice(rows,{unitId:'u2',procedureId:'p',agreementId:'particular',date:'2026-01-10'}),null);assert.equal(selectPrice(rows,{unitId:'u1',procedureId:'p',agreementId:'outro',date:'2026-01-10'}),null);});
test('precos ambiguos ou inativos nao sao aplicados',()=>{const row={unitId:'u',procedureId:'p',agreementId:'c',active:true,start:'2026-01-01',end:null,cents:100};const key={unitId:'u',procedureId:'p',agreementId:'c',date:'2026-01-10'};assert.equal(selectPrice([row,row],key),null);assert.equal(selectPrice([{...row,active:false}],key),null);});

test('chave incompleta nao consulta tabela',()=>{const rows=[{unitId:'u',procedureId:'p',agreementId:'c',active:true,start:'2026-01-01',end:null,cents:100}];assert.throws(()=>selectPrice(rows,{unitId:'u',procedureId:'p',agreementId:'',date:'2026-01-02'}));});
test('linha nula nao quebra busca de preco',()=>assert.equal(selectPrice([null],{unitId:'u',procedureId:'p',agreementId:'c',date:'2026-01-02'}),null));
test('valor de preco no limite inteiro e valido',()=>assert.equal(validatePriceCents(2147483647),2147483647));
test('intervalo aberto sobrepoe data posterior',()=>assert.equal(overlaps({start:'2026-01-01',end:null},{start:'2027-01-01',end:null}),true));

test('converte reais para centavos exatos e aceita vírgula ou ponto decimal', () => {
  assert.equal(centavosDeReais('0,09'), 9);
  assert.equal(centavosDeReais('120.5'), 12050);
  assert.equal(centavosDeReais('21474836,47'), 2147483647);
  for (const valor of ['-1', '1.234,56', '1e4', '0,001', '21474836,48', '']) {
    assert.throws(() => centavosDeReais(valor));
  }
});
