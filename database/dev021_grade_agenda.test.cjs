const assert = require('node:assert/strict');
const test = require('node:test');
const { randomUUID } = require('node:crypto');
const { criarBancoTeste } = require('./ambiente-teste.cjs');

test('DEV-021 — grade RLS e cálculo de intervalos em PostgreSQL', async t => {
  const db = await criarBancoTeste();
  t.after(() => db.close());
  const [unidade, outra, recepcao, medico, financeiro, semCadastro, iris, bento, paciente] =
    Array.from({ length: 9 }, () => randomUUID());
  const dia = (hora, deslocamento = '-03:00') => '2030-11-06T' + hora + ':00' + deslocamento;
  const limites = [dia('00:00'), '2030-11-07T00:00:00-03:00'];
  const q = (sql, args = []) => db.query(sql, args);

  await q("insert into piloto.unidades (id,nome) values ($1,'Unidade A'),($2,'Unidade B')", [unidade, outra]);
  for (const [usuario, perfil] of [[recepcao, 'recepcao'], [medico, 'medico'], [financeiro, 'financeiro'], [semCadastro, 'medico']]) {
    await q('insert into auth.users (id) values ($1)', [usuario]);
    await q('insert into piloto_privado.vinculos (unidade_id,usuario_id,perfil) values ($1,$2,$3)', [unidade, usuario, perfil]);
  }
  await q(`insert into piloto.profissionais (unidade_id,id,nome,usuario_id) values
    ($1,$3,'Íris sintética',$5),($1,$4,'Bento sintético',null),($2,$3,'Outro escopo',null)`, [unidade, outra, iris, bento, medico]);
  await q("insert into piloto.pacientes (unidade_id,id,nome) values ($1,$3,'Paciente A'),($2,$3,'Paciente B')", [unidade, outra, paciente]);

  const incluirJanela = (u, p, de, ate) => q(`insert into piloto.janelas_agenda (unidade_id,profissional_id,periodo)
    values ($1,$2,tstzrange($3,$4,'[)'))`, [u,p,de,ate]);
  const agendar = (u, p, de, ate, estado = 'confirmado') => q(`insert into piloto.agendamentos
    (unidade_id,profissional_id,paciente_id,inicio,fim,estado) values ($1,$2,$3,$4,$5,$6)`, [u,p,paciente,de,ate,estado]);
  await incluirJanela(unidade, iris, dia('08:00'), dia('12:00'));
  await incluirJanela(outra, iris, dia('08:00'), dia('12:00'));
  await agendar(unidade, iris, dia('09:00'), dia('09:30'));
  await agendar(unidade, iris, dia('10:00'), dia('10:30'), 'cancelado');
  await agendar(unidade, bento, '2030-11-05T23:30:00-03:00', dia('00:15'));
  await agendar(unidade, bento, '2030-11-05T23:30:00-03:00', dia('00:00'), 'cancelado');
  await agendar(unidade, bento, limites[1], '2030-11-07T01:00:00-03:00');
  await agendar(outra, iris, dia('08:00'), dia('08:30'));
  const asUser = (usuario, executar, { aal = 'aal2', role = 'authenticated' } = {}) => db.transaction(async tx => {
    await tx.exec(role === 'anon' ? 'set local role anon' : 'set local role authenticated');
    await tx.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: usuario, aal })]);
    return executar(tx);
  });
  const consultar = (usuario, { u = unidade, profissional = null, de = limites[0], ate = limites[1], corr = randomUUID(), aal, role } = {}) =>
    asUser(usuario, async tx => (await tx.query('select public.piloto_ler_grade_agenda($1,$2,$3,$4,$5) as grade',
      [u,profissional,de,ate,corr])).rows[0].grade, { aal, role });

  await t.test('subtrai somente ocupações e respeita fronteiras e privacidade', async () => {
    const grade = await consultar(recepcao);
    assert.deepEqual(grade.profissionais.map(p => p.id), [bento, iris]);
    assert.deepEqual(grade.agendamentos.map(a => a.estado), ['confirmado', 'confirmado', 'cancelado']);
    assert.equal(Date.parse(grade.agendamentos[0].inicio), Date.parse(limites[0]));
    assert.deepEqual(Object.keys(grade.agendamentos[0]).sort(), ['estado','fim','id','inicio','profissional_id']);
    assert.deepEqual(grade.livres.map(l => [l.profissional_id,Date.parse(l.inicio),Date.parse(l.fim)]), [
      [iris,Date.parse(dia('08:00')),Date.parse(dia('09:00'))],
      [iris,Date.parse(dia('09:30')),Date.parse(dia('12:00'))],
    ]);
    await assert.rejects(agendar(unidade, iris, dia('09:15'), dia('10:00')), { code: '23P01' });
    await assert.rejects(incluirJanela(unidade, iris, dia('11:30'), dia('12:30')), { code: '23P01' });
  });

  await t.test('escopo médico, filtro, vínculo e auditoria', async () => {
    const corr = randomUUID();
    const propria = await consultar(medico, { corr });
    assert.deepEqual(propria.profissionais.map(p => p.id), [iris]);
    assert.ok(propria.agendamentos.every(a => a.profissional_id === iris));
    assert.deepEqual((await consultar(recepcao, { profissional: bento })).agendamentos.map(a => a.profissional_id), [bento]);
    assert.equal(await consultar(medico, { profissional: bento }), null);
    assert.equal(await consultar(recepcao, { u: outra, corr }), null);
    assert.equal(await consultar(financeiro), null);
    assert.equal(await consultar(semCadastro), null);
    assert.equal(await consultar(medico, { aal: 'aal1' }), null);
    await assert.rejects(consultar(null, { role: 'anon' }), { code: '42501' });
    await assert.rejects(asUser(recepcao, tx => tx.query('delete from piloto.janelas_agenda')), { code: '42501' });
    assert.deepEqual((await q(`select unidade_id,resultado from piloto_privado.auditoria
      where correlacao_id=$1 and entidade='grade_agenda' order by id`, [corr])).rows, [
      { unidade_id: unidade, resultado: 'permitido' }, { unidade_id: null, resultado: 'negado' },
    ]);
  });

  await t.test('valida janela e preserva compromisso de profissional inativo sem indicar vaga', async () => {
    await assert.rejects(consultar(recepcao, { ate: limites[0] }), { code: '22023' });
    await assert.rejects(consultar(recepcao, { ate: '2030-12-10T00:00:00Z' }), { code: '22023' });
    await q('update piloto.profissionais set ativo=false where unidade_id=$1 and id=$2', [unidade, iris]);
    const historico = await consultar(recepcao, { profissional: iris });
    assert.equal(historico.profissionais.find(p => p.id === iris).ativo, false);
    assert.equal(historico.agendamentos.length, 2);
    assert.deepEqual(historico.livres, []);
    assert.equal(await consultar(medico), null);
  });

  await t.test('capacidade excedida não devolve uma grade parcial', async () => {
    await q(`insert into piloto.agendamentos (unidade_id, profissional_id, paciente_id, inicio, fim, estado)
      select $1,$2,$3,'2030-11-06T09:00:00Z','2030-11-06T09:01:00Z','cancelado'
      from generate_series(1,501)`, [unidade,bento,paciente]);
    const leitura = await consultar(recepcao);
    assert.equal(leitura.excedida, true);
    assert.ok(leitura.profissionais.some(p => p.id === bento));
    assert.equal(leitura.agendamentos, undefined);
    assert.equal(leitura.livres, undefined);
  });
});
