const assert = require('node:assert/strict');
const test = require('node:test');
const { criarBancoTeste } = require('./ambiente-teste.cjs');

const uuid = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');

test('DEV-020 — inativação no cadastro e efeitos em agenda, prontuário, atendimento e saldo', async t => {
  const db = await criarBancoTeste();
  t.after(() => db.close());
  const q = (sql, args = []) => db.query(sql, args);
  const [unidade, outra, admin, medico, financeiro, recepcao, externo, profissional, paciente,
    procedimento, convenio, agenda, atendimento, item, documento, correlacao] = Array.from({ length: 16 }, (_, i) => uuid(i + 1));

  async function como(usuario, executar, aal = 'aal2') {
    return db.transaction(async tx => {
      await tx.exec('set local role authenticated');
      await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: usuario, aal })]);
      return executar((sql, args = []) => tx.query(sql, args));
    });
  }

  await q("insert into piloto.unidades (id,nome) values ($1,'Unidade A'),($2,'Unidade B')", [unidade, outra]);
  for (const [usuario, unidadeVinculo, perfil] of [
    [admin, unidade, 'administrador'], [medico, unidade, 'medico'], [financeiro, unidade, 'financeiro'],
    [recepcao, unidade, 'recepcao'], [externo, outra, 'administrador'],
  ]) {
    await q('insert into auth.users (id) values ($1)', [usuario]);
    await q('insert into piloto_privado.vinculos (unidade_id,usuario_id,perfil) values ($1,$2,$3)', [unidadeVinculo, usuario, perfil]);
  }

  await q("insert into piloto.profissionais (unidade_id,id,nome,usuario_id,crm,crm_uf) values ($1,$2,'Profissional sintético',$3,'502','GO')", [unidade, profissional, medico]);
  await q("insert into piloto.pacientes (unidade_id,id,nome) values ($1,$2,'Paciente sintético')", [unidade, paciente]);
  await q("insert into piloto.procedimentos (unidade_id,id,codigo,descricao) values ($1,$2,'HIST-020','Procedimento sintético')", [unidade, procedimento]);
  await q("insert into piloto.convenios (unidade_id,id,nome) values ($1,$2,'Convênio histórico')", [unidade, convenio]);
  const agendar = 'insert into piloto.agendamentos (unidade_id,id,paciente_id,profissional_id,inicio,fim) values ($1,$2,$3,$4,$5,$6)';
  const atender = 'insert into piloto.atendimentos (unidade_id,id,paciente_id,profissional_id,agendamento_id) values ($1,$2,$3,$4,$5)';
  const incluir = 'insert into piloto.itens_atendimento (unidade_id,id,atendimento_id,procedimento_id,quantidade,valor_unitario_centavos) values ($1,$2,$3,$4,2,12500)';
  await q(agendar, [unidade, agenda, paciente, profissional, '2030-01-05T10:00:00Z', '2030-01-05T11:00:00Z']);
  await q(atender, [unidade, atendimento, paciente, profissional, agenda]);
  await q(incluir, [unidade, item, atendimento, procedimento]);
  await q("insert into piloto.documentos_clinicos (unidade_id,id,atendimento_id,autor_profissional_id,tipo) values ($1,$2,$3,$4,'evolucao_texto')", [unidade, documento, atendimento, profissional]);
  await q("insert into piloto.versoes_documento (unidade_id,documento_id,tipo,versao,estado,conteudo) values ($1,$2,'evolucao_texto',1,'rascunho',$3)", [unidade, documento, { texto: 'Evolução sintética' }]);
  await q("insert into piloto.movimentos_financeiros (unidade_id,atendimento_id,tipo,valor_centavos,chave_idempotencia) values ($1,$2,'recebimento',8000,$3)", [unidade, atendimento, uuid(90)]);

  const historico = (sql, escopo = unidade) => sql('select public.piloto_listar_historico_itens($1,$2,0,$3) as dados', [escopo, 'HIST-020', correlacao]);
  const saldo = () => como(financeiro, sql => sql(
    'select cobrado_centavos::text, recebido_liquido_centavos::text, saldo_centavos::text from piloto.saldos_atendimento where atendimento_id=$1', [atendimento]));
  const clinico = sql => sql('select * from piloto_privado.documento_atual_auditado($1,$2,$3)', [unidade, documento, uuid(92)]);

  await t.test('valor lançado difere da tabela e histórico exige vínculo, MFA e perfil operacional', async () => {
    await como(admin, sql => sql("select public.piloto_cadastrar_preco($1,$2,$3,'2030-01-01',null,19000,0,$4)", [unidade, convenio, procedimento, uuid(93)]));
    const antes = await como(recepcao, historico);
    assert.equal(antes.rows[0].dados[0].valor_historico_centavos, 12500);
    assert.equal(antes.rows[0].dados[0].cobrado_historico_centavos, '25000');
    assert.equal(antes.rows[0].dados[0].procedimento_ativo_atual, true);
    assert.equal((await como(medico, historico)).rows[0].dados, null);
    assert.equal((await como(externo, historico)).rows[0].dados, null);
    assert.equal((await como(admin, historico, 'aal1')).rows[0].dados, null);
    assert.equal((await como(admin, sql => historico(sql, outra))).rows[0].dados, null);
    await assert.rejects(como(recepcao, sql => sql('select * from piloto.impacto_cadastros_itens')), { code: '42501' });
    const documentoVisivel = (await como(medico, clinico)).rows[0];
    assert.equal(documentoVisivel.conteudo.texto, 'Evolução sintética');
    assert.deepEqual((await saldo()).rows, [{ cobrado_centavos: '25000', recebido_liquido_centavos: '8000', saldo_centavos: '17000' }]);
  });

  await t.test('inativação pelas funções do cadastro preserva documento, item e saldo', async () => {
    await como(admin, async sql => {
      await sql("select public.piloto_salvar_medico($1,$2,0,'Profissional sintético','502','GO',null,null,false,$3)", [unidade, profissional, correlacao]);
      await sql("select public.piloto_salvar_procedimento($1,$2,0,null,'HIST-020','Procedimento sintético',null,'procedimento',null,false,false,$3)", [unidade, procedimento, correlacao]);
      await sql("select public.piloto_salvar_convenio($1,$2,1,'Convênio histórico',false,$3)", [unidade, convenio, correlacao]);
    });

    const dados = (await como(financeiro, historico)).rows[0].dados[0];
    assert.equal(dados.item_id, item);
    assert.equal(dados.profissional_ativo_atual, false);
    assert.equal(dados.procedimento_ativo_atual, false);
    assert.equal(dados.valor_historico_centavos, 12500);
    assert.equal(dados.cobrado_historico_centavos, '25000');
    assert.deepEqual((await saldo()).rows, [{ cobrado_centavos: '25000', recebido_liquido_centavos: '8000', saldo_centavos: '17000' }]);
    assert.equal((await q('select conteudo from piloto.versoes_documento where documento_id=$1', [documento])).rows[0].conteudo.texto, 'Evolução sintética');
    assert.deepEqual((await como(medico, clinico)).rows, []);
    const catalogo = await como(recepcao, sql => sql("select public.piloto_listar_catalogo($1,'HIST-020',0,$2) as dados", [unidade, uuid(94)]));
    assert.deepEqual(catalogo.rows[0].dados.procedimentos, []);
    const precos = await como(recepcao, sql => sql("select public.piloto_listar_convenios_precos($1,'HIST-020','2030-01-05',0,$2) as dados", [unidade, uuid(95)]));
    assert.deepEqual(precos.rows[0].dados.precos, []);
  });

  await t.test('bloqueia novas referências inativas e preserva cancelamento e trilha', async () => {
    await assert.rejects(q(agendar, [unidade, uuid(101), paciente, profissional, '2030-01-06T10:00:00Z', '2030-01-06T11:00:00Z']), { code: '23514' });
    await assert.rejects(q(atender, [unidade, uuid(102), paciente, profissional, null]), { code: '23514' });
    await assert.rejects(q(incluir, [unidade, uuid(103), atendimento, procedimento]), { code: '23514' });
    await assert.rejects(q("update piloto.agendamentos set estado='remarcado' where id=$1", [agenda]), { code: '23514' });
    await q("update piloto.agendamentos set estado='cancelado' where id=$1", [agenda]);
    assert.equal((await q('select estado from piloto.agendamentos where id=$1', [agenda])).rows[0].estado, 'cancelado');
    await assert.rejects(como(admin, sql => sql("select public.piloto_salvar_convenio($1,null,null,' convênio histórico ',true,$2)", [unidade, correlacao])), { code: '23505' });
    const trilha = (await q('select entidade, operacao, resultado, ator_id from piloto_privado.auditoria where correlacao_id=$1 order by id', [correlacao])).rows;
    assert.deepEqual(trilha.filter(e => e.operacao === 'UPDATE').map(e => [e.entidade, e.ator_id]),
      [['profissionais', admin], ['procedimentos', admin], ['convenios', admin]]);
    assert.equal(trilha.some(e => e.operacao === 'SELECT' && e.ator_id === medico && e.resultado === 'negado'), true);
    assert.equal(trilha.some(e => e.operacao === 'SELECT' && e.ator_id === financeiro && e.resultado === 'permitido'), true);
  });
});
