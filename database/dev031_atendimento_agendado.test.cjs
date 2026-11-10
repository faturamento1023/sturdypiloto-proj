const assert = require('node:assert/strict');
const test = require('node:test');
const { randomUUID } = require('node:crypto');
const { criarBancoTeste } = require('./ambiente-teste.cjs');

test('abertura idempotente e fila mantêm os escopos existentes', async t => {
  const db = await criarBancoTeste();
  t.after(() => db.close());
  const [u, outra, recepcao, medico, caixa, pro, paciente, agenda, cancelada, corr] = Array.from({ length: 10 }, () => randomUUID());
  await db.query("insert into piloto.unidades (id,nome) values ($1,'Unidade Fictícia'),($2,'Outra Unidade')", [u, outra]);
  await db.query('insert into auth.users (id) values ($1),($2),($3)', [recepcao, medico, caixa]);
  await db.query(`insert into piloto_privado.vinculos (unidade_id,usuario_id,perfil)
    values ($1,$2,'recepcao'),($1,$3,'medico'),($1,$4,'financeiro')`, [u, recepcao, medico, caixa]);
  await db.query("insert into piloto.pacientes (unidade_id,id,nome) values ($1,$2,'Paciente Fictício')", [u, paciente]);
  await db.query("insert into piloto.profissionais (unidade_id,id,nome,usuario_id) values ($1,$2,'Médico Fictício',$3)", [u, pro, medico]);
  await db.query(`insert into piloto.agendamentos (unidade_id,id,paciente_id,profissional_id,inicio,fim,estado)
    values ($1,$2,$4,$5,'2030-01-03 08:00-03','2030-01-03 08:30-03','confirmado'),
      ($1,$3,$4,$5,'2030-01-03 08:30-03','2030-01-03 09:00-03','cancelado')`, [u, agenda, cancelada, paciente, pro]);
  const { rows: [{ dia }] } = await db.query("select ((now() at time zone 'America/Sao_Paulo')::date)::text as dia");
  const rpc = (usuario, sql, args, aal = 'aal2') => db.transaction(async tx => {
    await tx.exec('set local role authenticated');
    await tx.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: usuario, aal })]);
    return (await tx.query(sql, args)).rows[0].dados;
  });
  const abrir = (usuario, unidade = u, reserva = agenda, aal = 'aal2') => rpc(usuario,
    'select public.piloto_abrir_atendimento_agendado($1,$2,$3) as dados', [unidade, reserva, corr], aal);
  const fila = (usuario, unidade = u) => rpc(usuario,
    'select public.piloto_listar_fila_atendimentos($1,$2,0,$3) as dados', [unidade, dia, corr]);
  await assert.rejects(abrir(recepcao, outra), { code: '42501' });
  await assert.rejects(abrir(recepcao, u, cancelada), { code: '23514' });
  await assert.rejects(abrir(recepcao, u, agenda, 'aal1'), { code: '42501' });
  await assert.rejects(abrir(medico), { code: '42501' });
  const abertura = await abrir(recepcao);
  const { id } = abertura;
  assert.equal(abertura.dia, dia);
  assert.deepEqual(await abrir(recepcao), abertura);
  const [registro] = await fila(recepcao);
  assert.equal(registro.id, id);
  assert.equal(registro.agendamento_id, agenda);
  assert.equal(registro.paciente, 'Paciente Fictício');
  assert.deepEqual(await fila(medico), [registro]);
  assert.equal((await fila(caixa))[0].paciente, null);
  assert.equal(await fila(recepcao, outra), null);
  const { rows } = await db.query(`select operacao,registro_id from piloto_privado.auditoria
    where entidade='atendimentos' and correlacao_id=$1 and operacao='INSERT'`, [corr]);
  assert.deepEqual(rows, [{ operacao: 'INSERT', registro_id: id }]);
});
