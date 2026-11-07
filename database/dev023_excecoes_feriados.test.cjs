const assert = require('node:assert/strict');
const test = require('node:test');
const { randomUUID } = require('node:crypto');
const { criarBancoTeste } = require('./ambiente-teste.cjs');

test('DEV-023 — feriados e exceções transacionais', async t => {
  const db = await criarBancoTeste();
  t.after(() => db.close());
  const [unidade, outra, gestao, recepcao, medico, iris, bento, sala, outraSala, paciente] =
    Array.from({ length: 10 }, () => randomUUID());
  const data = '2091-11-07';
  const diaSeguinte = '2091-11-08';
  const diaComReserva = '2091-11-14';
  const q = (sql, args = []) => db.query(sql, args);
  await q("insert into piloto.unidades (id,nome) values ($1,'Unidade A'),($2,'Unidade B')", [unidade, outra]);
  for (const [usuario, perfil] of [[gestao, 'gestao'], [recepcao, 'recepcao'], [medico, 'medico']]) {
    await q('insert into auth.users (id) values ($1)', [usuario]);
    await q('insert into piloto_privado.vinculos (unidade_id,usuario_id,perfil) values ($1,$2,$3)', [unidade, usuario, perfil]);
  }
  await q(`insert into piloto.profissionais (unidade_id,id,nome,usuario_id)
    values ($1,$2,'Íris sintética',$4),($1,$3,'Bento sintético',null)`, [unidade, iris, bento, medico]);
  await q("insert into piloto.locais_agenda (unidade_id,id,nome) values ($1,$2,'Sala base'),($1,$3,'Sala substituta')",
    [unidade, sala, outraSala]);
  await q("insert into piloto.pacientes (unidade_id,id,nome) values ($1,$2,'Paciente fictício')", [unidade, paciente]);
  await q(`insert into piloto.disponibilidades_regulares
    (unidade_id,profissional_id,local_id,dia_semana,inicio_minuto,fim_minuto,desde)
    values ($1,$2,$4,3,480,720,$5),($1,$3,$6,3,480,720,$5)`, [unidade, iris, bento, sala, data, outraSala]);

  const rpc = (usuario, nome, args, aal = 'aal2') => db.transaction(async tx => {
    await tx.exec('set local role authenticated');
    await tx.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: usuario, aal })]);
    const { rows } = await tx.query('select public.' + nome + '(' + args.map((_, i) => '$' + (i + 1)).join(',') + ') as dados', args);
    return rows[0].dados;
  });
  const salvar = (acao, {
    u = unidade, dia = data, id = null, pro = null, local = null, inicio = null, fim = null, nome = null,
    usuario = gestao, aal = 'aal2', corr = randomUUID(),
  } = {}) => rpc(usuario, 'piloto_salvar_excecao_agenda', [u,acao,dia,id,pro,local,inicio,fim,nome,corr], aal);
  const grade = (usuario, pro = null, de = data + 'T00:00:00-03:00', ate = diaSeguinte + 'T00:00:00-03:00') =>
    rpc(usuario, 'piloto_ler_grade_agenda', [unidade, pro, de, ate, randomUUID()]);
  const ler = (usuario, pro = null, u = unidade, ate = data) =>
    rpc(usuario, 'piloto_ler_excecoes_agenda', [u,pro,data,ate,randomUUID()]);
  const agendar = async (pro, de, ate, estado = 'confirmado') => (await q(`insert into piloto.agendamentos
    (unidade_id,profissional_id,paciente_id,inicio,fim,estado) values ($1,$2,$3,$4,$5,$6) returning id`,
  [unidade,pro,paciente,de,ate,estado])).rows[0].id;

  await t.test('isola unidade e perfil, exige MFA e valida dados', async () => {
    await assert.rejects(salvar('feriado', { nome: 'Feriado', usuario: recepcao }), { code: '42501' });
    await assert.rejects(salvar('feriado', { nome: 'Feriado', aal: 'aal1' }), { code: '42501' });
    await assert.rejects(salvar('feriado', { nome: 'Feriado', u: outra }), { code: '42501' });
    await assert.rejects(salvar('feriado', { nome: 'Antigo', dia: '2020-01-01' }), { code: '22023' });
    await assert.rejects(salvar('bloqueio', { inicio: 600, fim: 600 }), { code: '22023' });
    await assert.rejects(salvar('substituicao', { inicio: 600, fim: 660, pro: iris }), { code: '22023' });
    assert.equal(await ler(gestao, null, outra), null);
    await assert.rejects(ler(gestao, null, unidade, '2091-12-08'), { code: '22023' });
  });

  const substituicao = { pro: iris, local: outraSala, inicio: 780, fim: 1020 };
  const corr = randomUUID();
  const gradeHoras = leitura => leitura.livres.map(l => [new Date(l.inicio).toISOString().slice(11,16),
    new Date(l.fim).toISOString().slice(11,16),l.local_nome]);

  await t.test('preserva precedência e salas, inclusive quando a consulta recorta o dia', async () => {
    await assert.rejects(salvar('substituicao', { ...substituicao, inicio: 540 }), { code: '23P01' });
    await salvar('substituicao', { ...substituicao, corr });
    await assert.rejects(salvar('substituicao', substituicao), { code: '23505' });
    await assert.rejects(salvar('substituicao', { ...substituicao, pro: bento }), { code: '23P01' });
    await assert.rejects(rpc(gestao, 'piloto_criar_disponibilidade',
      [unidade,bento,outraSala,3,810,840,data,randomUUID()]), { code: '23P01' });
    await salvar('bloqueio', { pro: iris, inicio: 840, fim: 870 });
    await salvar('bloqueio', { inicio: 855, fim: 900 });
    await salvar('bloqueio', { pro: bento, inicio: 480, fim: 510 });
    const leitura = await grade(medico);
    assert.deepEqual(gradeHoras(leitura), [['16:00','17:00','Sala substituta'],['18:00','20:00','Sala substituta']]);
    assert.ok(leitura.avisos.every(a => !a.profissional_id || a.profissional_id === iris));
    assert.equal(await ler(medico, bento), null);
    assert.equal((await grade(gestao, iris, data + 'T08:00:00-03', data + 'T10:00:00-03')).livres.length, 0);
    const feriado = await salvar('feriado', { nome: 'Feriado fictício', corr });
    assert.equal((await grade(medico)).livres.length, 0);
    assert.equal((await grade(recepcao)).avisos.find(a => a.tipo === 'feriado').descricao, 'Feriado fictício');
    await assert.rejects(agendar(iris, data + 'T15:30:00-03', data + 'T16:00:00-03'), { code: 'P0023' });
    await salvar('liberar_feriado', { id: feriado, corr });
    assert.equal((await grade(medico)).livres.length, 2);
    const trilha = await q(`select operacao, ator_id from piloto_privado.auditoria
      where correlacao_id = $1 order by id`, [corr]);
    assert.deepEqual(trilha.rows, ['INSERT','INSERT','UPDATE'].map(operacao => ({ operacao, ator_id: gestao })));
  });

  await t.test('protege compromisso anterior e valida reservas e remarcações posteriores', async () => {
    const id = await agendar(iris, diaComReserva + 'T09:00:00-03', diaComReserva + 'T09:30:00-03');
    await assert.rejects(salvar('feriado', { dia: diaComReserva, nome: 'Feriado' }), { code: 'P0023' });
    await assert.rejects(salvar('bloqueio', { dia: diaComReserva, inicio: 540, fim: 600 }), { code: 'P0023' });
    await assert.rejects(salvar('substituicao', { ...substituicao, dia: diaComReserva }), { code: 'P0023' });
    assert.deepEqual((await q('select estado from piloto.agendamentos where id=$1', [id])).rows, [{ estado: 'confirmado' }]);
    await assert.rejects(q('update piloto.agendamentos set inicio=$1,fim=$2 where id=$3',
      [data + 'T08:00:00-03', data + 'T09:00:00-03',id]), { code: 'P0023' });
    await agendar(iris, data + 'T13:00:00-03', data + 'T14:00:00-03');
    await agendar(iris, data + 'T14:00:00-03', data + 'T14:30:00-03', 'cancelado');
    const { excecoes } = await ler(gestao);
    const idSub = excecoes.find(e => e.kind === 'substituicao').id;
    await assert.rejects(salvar('remover_excecao', { id: idSub }), { code: 'P0023' });
  });

  await t.test('fim 24:00 bloqueia a data sem bloquear a manhã seguinte', async () => {
    await salvar('bloqueio', { dia: diaSeguinte, inicio: 0, fim: 1440 });
    await assert.rejects(agendar(iris, diaSeguinte + 'T23:30:00-03', '2091-11-09T00:15:00-03'), { code: 'P0023' });
    await agendar(iris, '2091-11-09T00:00:00-03', '2091-11-09T00:15:00-03');
  });
});
