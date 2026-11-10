const assert = require('node:assert/strict');
const test = require('node:test');
const { randomUUID } = require('node:crypto');
const { criarBancoTeste } = require('./ambiente-teste.cjs');

test('Reserva e cotas usam a agenda, a unidade e a trilha reais', async t => {
  const db = await criarBancoTeste();
  t.after(() => db.close());
  const [u, outra, recepcao, gestao, financeiro, pro, paciente, convenio, outroConvenio, procedimento, grupo, chave, corr] =
    Array.from({ length: 13 }, () => randomUUID());
  const dia = '2090-11-06';
  const seguinte = '2090-11-07';
  const q = (sql, args = []) => db.query(sql, args);
  await q("insert into piloto.unidades(id,nome) values ($1,'Unidade Fictícia'),($2,'Outra Unidade')", [u, outra]);
  await q('insert into auth.users(id) values ($1),($2),($3)', [recepcao, gestao, financeiro]);
  await q("insert into piloto_privado.vinculos(unidade_id,usuario_id,perfil) values ($1,$2,'recepcao'),($1,$3,'gestao'),($1,$4,'financeiro')", [u, recepcao, gestao, financeiro]);
  await q("insert into piloto.profissionais(unidade_id,id,nome) values ($1,$2,'Profissional Fictício')", [u, pro]);
  await q("insert into piloto.pacientes(unidade_id,id,nome) values ($1,$2,'Paciente Fictício')", [u, paciente]);
  await q("insert into piloto.convenios(unidade_id,id,nome) values ($1,$2,'Convênio Fictício'),($1,$3,'Outro Convênio')", [u, convenio, outroConvenio]);
  await q("insert into piloto.grupos_procedimentos(unidade_id,id,nome) values ($1,$2,'Grupo Fictício')", [u, grupo]);
  await q("insert into piloto.procedimentos(unidade_id,id,grupo_id,codigo,descricao) values ($1,$2,$3,'FICT','Procedimento Fictício')", [u, procedimento, grupo]);
  for (const data of [dia, seguinte]) {
    await q("insert into piloto.janelas_agenda(unidade_id,profissional_id,periodo) values ($1,$2,tstzrange($3,$4,'[)'))",
      [u, pro, data + 'T08:00:00-03:00', data + 'T12:00:00-03:00']);
  }
  const rpc = (usuario, nome, args, aal = 'aal2') => db.transaction(async tx => {
    await tx.exec('set local role authenticated');
    await tx.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: usuario, aal })]);
    return (await tx.query('select public.' + nome + '(' + args.map((_, i) => '$' + (i + 1)).join(',') + ') as dados', args)).rows[0].dados;
  });
  const reservar = ({ usuario = recepcao, unidade = u, id = randomUUID(), conv = convenio, data = dia, de = '08:00', ate = '08:30', aal = 'aal2' } = {}) =>
    rpc(usuario, 'piloto_reservar_horario', [unidade,id,paciente,pro,conv,procedimento,data + 'T' + de + ':00-03:00',data + 'T' + ate + ':00-03:00',corr], aal);
  const cota = (usuario, desativar = null, conv = null, proc = null, gr = grupo, limite = 1) =>
    rpc(usuario,'piloto_salvar_cota_agenda',[u,desativar,conv,proc,gr,dia,seguinte,limite,corr]);

  await assert.rejects(cota(recepcao), { code: '42501' });
  const compartilhada = await cota(gestao);
  await cota(gestao, null, convenio, procedimento, null, 2);
  await assert.rejects(cota(gestao), { code: '23505' });
  assert.equal((await rpc(gestao,'piloto_agenda_opcoes',[u,true,corr])).cotas.length, 2);
  assert.equal(await rpc(recepcao,'piloto_agenda_opcoes',[u,true,corr]), null);
  assert.equal((await rpc(recepcao,'piloto_agenda_opcoes',[u,false,corr])).convenios.length, 2);
  await assert.rejects(reservar({ usuario: financeiro }), { code: '42501' });
  await assert.rejects(reservar({ unidade: outra }), { code: '42501' });
  await assert.rejects(reservar({ aal: 'aal1' }), { code: '42501' });
  await assert.rejects(reservar({ de: '07:45', ate: '08:15' }), { code: '23P01' });
  assert.equal(await reservar({ id: chave }), chave);
  assert.equal(await reservar({ id: chave }), chave);
  await assert.rejects(reservar({ id: chave, conv: outroConvenio }), { code: '23505' });
  await assert.rejects(reservar({}), { code: '23P01' });
  await assert.rejects(reservar({ de: '09:00', ate: '09:30', conv: outroConvenio }), { code: 'P0024' });
  await reservar({ data: seguinte });
  await q("update piloto.agendamentos set estado='cancelado' where unidade_id=$1 and id=$2", [u,chave]);
  await reservar({ de: '09:00', ate: '09:30', conv: outroConvenio });
  await cota(gestao, compartilhada);
  await reservar({ de: '10:00', ate: '10:30' });
  await rpc(gestao,'piloto_salvar_excecao_agenda',[u,'bloqueio',dia,null,pro,null,660,690,'',corr]);
  await assert.rejects(reservar({ de: '11:00', ate: '11:30' }), { code: '23P01' });
  const { rows } = await q("select registro_id,ator_id from piloto_privado.auditoria where entidade='agendamentos' and operacao='INSERT' and correlacao_id=$1", [corr]);
  assert.equal(rows.length, 4);
  assert.equal(rows.filter(r => r.registro_id === chave && r.ator_id === recepcao).length, 1);
});
