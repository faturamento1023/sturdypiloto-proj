'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {projectDay}=require('./dev023_projecao_grade.cjs');
const base={date:'2026-11-09',unitId:'u1',professionalId:'p1',regular:[{start:'08:00',end:'12:00',roomId:'s1'}]};
test('sem excecao mostra horario livre',()=>assert.deepEqual(projectDay(base).free,[{start:480,end:720,roomId:'s1'}]));
test('reserva divide horario livre',()=>assert.deepEqual(projectDay({...base,bookings:[{start:540,end:600}]}).free,[{start:480,end:540,roomId:'s1'},{start:600,end:720,roomId:'s1'}]));
test('cancelamento nao ocupa horario',()=>assert.equal(projectDay({...base,bookings:[{start:480,end:720,status:'cancelado'}]}).free.length,1));
test('bloqueio parcial e reserva compoem corretamente',()=>assert.deepEqual(projectDay({...base,exceptions:[{date:base.date,unitId:'u1',kind:'bloqueio',start:'09:00',end:'10:00'}],bookings:[{start:630,end:660}]}).free,[{start:480,end:540,roomId:'s1'},{start:600,end:630,roomId:'s1'},{start:660,end:720,roomId:'s1'}]));
test('feriado fecha grade mesmo com reservas',()=>assert.deepEqual(projectDay({...base,holidays:[{date:base.date,unitId:'u1'}],bookings:[{start:540,end:600}]}).free,[]));
test('substituicao altera janela da grade',()=>assert.deepEqual(projectDay({...base,exceptions:[{date:base.date,unitId:'u1',professionalId:'p1',kind:'substituicao',start:'13:00',end:'15:00'}]}).free,[{start:780,end:900,roomId:null}]));
test('reserva malformada rejeitada',()=>assert.throws(()=>projectDay({...base,bookings:[{start:700,end:600}]}),/reserva invalida/));

test('reserva de outra unidade nao bloqueia agenda',()=>assert.equal(projectDay({...base,bookings:[{unitId:'u2',professionalId:'p1',date:base.date,start:480,end:720}]}).free.length,1));
test('reserva de outro profissional nao bloqueia agenda',()=>assert.equal(projectDay({...base,bookings:[{unitId:'u1',professionalId:'p2',date:base.date,start:480,end:720}]}).free.length,1));
test('reserva de outra data nao bloqueia agenda',()=>assert.equal(projectDay({...base,bookings:[{unitId:'u1',professionalId:'p1',date:'2026-11-10',start:480,end:720}]}).free.length,1));
test('reserva no escopo correto bloqueia agenda',()=>assert.deepEqual(projectDay({...base,bookings:[{unitId:'u1',professionalId:'p1',date:base.date,start:480,end:720}]}).free,[]));
test('entrada nula de reserva rejeitada',()=>assert.throws(()=>projectDay({...base,bookings:[null]}),/reserva invalida/));

test('modo estrito rejeita reserva sem escopo',()=>assert.throws(()=>projectDay({...base,strictBookingScope:true,bookings:[{start:480,end:540}]}),/escopo da reserva invalido/));
test('modo estrito rejeita escopo parcial',()=>assert.throws(()=>projectDay({...base,strictBookingScope:true,bookings:[{unitId:'u1',professionalId:'p1',start:480,end:540}]}),/escopo da reserva invalido/));
test('modo estrito aceita reserva totalmente identificada',()=>assert.deepEqual(projectDay({...base,strictBookingScope:true,bookings:[{unitId:'u1',professionalId:'p1',date:base.date,start:480,end:720}]}).free,[]));
test('modo estrito ignora reserva de outra unidade com escopo completo',()=>assert.equal(projectDay({...base,strictBookingScope:true,bookings:[{unitId:'u2',professionalId:'p1',date:base.date,start:480,end:720}]}).free.length,1));

test('modo estrito rejeita dia inexistente',()=>assert.throws(()=>projectDay({...base,strictBookingScope:true,bookings:[{unitId:'u1',professionalId:'p1',date:'2026-02-30',start:480,end:540}]}),/escopo da reserva invalido/));
test('modo estrito rejeita mes inexistente',()=>assert.throws(()=>projectDay({...base,strictBookingScope:true,bookings:[{unitId:'u1',professionalId:'p1',date:'2026-13-09',start:480,end:540}]}),/escopo da reserva invalido/));
test('modo estrito aceita data bissexta valida de outro dia',()=>assert.equal(projectDay({...base,strictBookingScope:true,bookings:[{unitId:'u1',professionalId:'p1',date:'2028-02-29',start:480,end:540}]}).free.length,1));

// Regressao: filtro de escopo nao pode mascarar intervalos corrompidos no modo estrito.
test('modo estrito rejeita intervalo invalido de outra unidade',()=>assert.throws(()=>projectDay({...base,strictBookingScope:true,bookings:[{unitId:'u2',professionalId:'p1',date:base.date,start:700,end:600}]}),/reserva invalida/));
test('modo estrito rejeita horario fora do dia de outro profissional',()=>assert.throws(()=>projectDay({...base,strictBookingScope:true,bookings:[{unitId:'u1',professionalId:'p2',date:base.date,start:-1,end:600}]}),/reserva invalida/));
test('modo estrito rejeita intervalo fracionario de outra data',()=>assert.throws(()=>projectDay({...base,strictBookingScope:true,bookings:[{unitId:'u1',professionalId:'p1',date:'2026-11-10',start:480.5,end:600}]}),/reserva invalida/));
