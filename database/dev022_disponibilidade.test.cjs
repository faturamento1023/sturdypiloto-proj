const assert = require('node:assert/strict');
const test = require('node:test');
const { randomUUID } = require('node:crypto');
const { criarBancoTeste } = require('./ambiente-teste.cjs');

test('DEV-022 — disponibilidade semanal e locais', async t => {
  const db = await criarBancoTeste();
  t.after(() => db.close());
  const [unidade, outra, gestao, admin, recepcao, medico, iris, bento, paciente] =
    Array.from({ length: 9 }, () => randomUUID());
  const q = (sql, args = []) => db.query(sql, args);
  await q("insert into piloto.unidades (id,nome) values ($1,'Unidade A'),($2,'Unidade B')", [unidade, outra]);
  for (const [usuario, u, perfil] of [[gestao, unidade, 'gestao'], [admin, outra, 'administrador'], [recepcao, unidade, 'recepcao'], [medico, unidade, 'medico']]) {
    await q('insert into auth.users (id) values ($1)', [usuario]);
    await q('insert into piloto_privado.vinculos (unidade_id,usuario_id,perfil) values ($1,$2,$3)', [u, usuario, perfil]);
  }
  await q(`insert into piloto.profissionais (unidade_id,id,nome,usuario_id)
    values ($1,$2,'Íris sintética',$4),($1,$3,'Bento sintético',null)`, [unidade, iris, bento, medico]);
  await q("insert into piloto.pacientes (unidade_id,id,nome) values ($1,$2,'Paciente fictício')", [unidade, paciente]);

  const rpc = (usuario, nome, args, aal = 'aal2') => db.transaction(async tx => {
    await tx.exec('set local role authenticated');
    await tx.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: usuario, aal })]);
    const { rows } = await tx.query('select public.' + nome + '(' + args.map((_, i) => '$' + (i + 1)).join(',') + ') as dados', args);
    return rows[0].dados;
  });
  const criarLocal = (usuario, u, nome, aal) => rpc(usuario, 'piloto_criar_local_agenda', [u, nome, randomUUID()], aal);
  const consultar = (usuario, u = unidade) => rpc(usuario, 'piloto_config_agenda', [u]);
  const salaA = await criarLocal(gestao, unidade, '  Sala A  ');
  const salaB = await criarLocal(gestao, unidade, 'Sala B');
  const salaAlheia = await criarLocal(admin, outra, 'Sala A');
  const desde = '2090-11-07';
  const corr = randomUUID();
  const regra = (p, l, de, ate, data = desde, dia = 1, correlacao = randomUUID()) => rpc(
    gestao, 'piloto_criar_disponibilidade', [unidade,p,l,dia,de,ate,data,correlacao],
  );
  const grade = (usuario, data, pro = null) => rpc(usuario, 'piloto_ler_grade_agenda',
    [unidade, pro, data + 'T00:00:00-03:00', data + 'T23:59:00-03:00', randomUUID()]);

  await t.test('exige MFA e gestão da unidade; bloqueia local duplicado e referência alheia', async () => {
    assert.equal((await consultar(gestao)).locais[0].nome, 'Sala A');
    assert.equal(await consultar(recepcao), null);
    assert.equal(await consultar(gestao, outra), null);
    await assert.rejects(criarLocal(recepcao, unidade, 'Recepção'), { code: '42501' });
    await assert.rejects(criarLocal(gestao, unidade, 'Sem MFA', 'aal1'), { code: '42501' });
    await assert.rejects(criarLocal(gestao, unidade, 'sala a'), { code: '23505' });
    await assert.rejects(regra(iris, salaAlheia, 480, 600), { code: '23503' });
    await assert.rejects(regra(iris, salaA, 600, 480), { code: '22023' });
    await assert.rejects(regra(iris, salaA, 480, 600, '2020-01-01'), { code: '22023' });
  });

  const primeira = await regra(iris, salaA, 480, 600, desde, 1, corr);
  await t.test('bloqueia conflitos do profissional e da sala, com fronteiras adjacentes válidas', async () => {
    await assert.rejects(regra(iris, salaB, 540, 660), { code: '23P01' });
    await assert.rejects(regra(bento, salaA, 540, 660), { code: '23P01' });
    await regra(bento, salaA, 600, 660);
    await regra(bento, salaB, 480, 540);
    await regra(iris, salaA, 480, 600, desde, 2);
  });

  await t.test('projeta apenas dias vigentes e reserva ocupa a janela; legado sem duplicação', async () => {
    assert.equal((await grade(gestao, '2090-11-06')).livres.length, 0);
    assert.equal((await grade(gestao, '2090-11-08')).livres.length, 0);
    await q(`insert into piloto.janelas_agenda (unidade_id,profissional_id,periodo)
      values ($1,$2,tstzrange('2090-11-13T07:30:00-03','2090-11-13T08:30:00-03','[)'))`, [unidade, iris]);
    await q(`insert into piloto.agendamentos (unidade_id,profissional_id,paciente_id,inicio,fim,estado)
      values ($1,$2,$3,'2090-11-13T09:00:00-03','2090-11-13T09:30:00-03','confirmado')`, [unidade, iris, paciente]);
    const leitura = await grade(medico, '2090-11-13');
    assert.deepEqual(leitura.livres.map(l => [Date.parse(l.inicio), Date.parse(l.fim), l.local_nome]), [
      [Date.parse('2090-11-13T07:30:00-03:00'), Date.parse('2090-11-13T08:00:00-03:00'), undefined],
      [Date.parse('2090-11-13T08:00:00-03:00'), Date.parse('2090-11-13T09:00:00-03:00'), 'Sala A'],
      [Date.parse('2090-11-13T09:30:00-03:00'), Date.parse('2090-11-13T10:00:00-03:00'), 'Sala A'],
    ]);
    assert.equal(await grade(medico, '2090-11-13', bento), null);
    assert.ok((await grade(recepcao, '2090-11-13')).livres.some(l => l.profissional_id === bento));
  });

  await t.test('encerramento preserva data anterior, permite substituição e deixa trilha', async () => {
    const fim = '2090-11-20';
    const encerrar = data => rpc(gestao, 'piloto_encerrar_disponibilidade', [unidade, primeira, data, corr]);
    await encerrar(fim);
    await encerrar(fim);
    await assert.rejects(encerrar('2090-11-27'), { code: '22023' });
    assert.ok((await grade(gestao, '2090-11-13', iris)).livres.some(l => l.local_nome === 'Sala A'));
    assert.equal((await grade(gestao, fim, iris)).livres.length, 0);
    // 14–19 não tem segunda-feira; a substituta pode começar na terça.
    await regra(iris, salaA, 480, 600, '2090-11-14');
    assert.equal((await grade(gestao, fim, iris)).livres.length, 1);
    const { rows } = await q(`select operacao, registro_id, ator_id from piloto_privado.auditoria
      where correlacao_id = $1 order by id`, [corr]);
    assert.deepEqual(rows, ['INSERT','UPDATE'].map(operacao => ({ operacao, registro_id: primeira, ator_id: gestao })));
  });
});
