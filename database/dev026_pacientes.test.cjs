const assert = require('node:assert/strict');
const test = require('node:test');
const { randomUUID } = require('node:crypto');
const { criarBancoTeste } = require('./ambiente-teste.cjs');

test('pacientes: cadastro idempotente, busca auditada e escopo por papel', async t => {
  const db = await criarBancoTeste();
  t.after(() => db.close());
  const [unidade, outra, recepcao, medico, gestor, profissional, paciente, chave, correlacao] = Array.from({ length: 9 }, () => randomUUID());
  await db.query("insert into piloto.unidades (id,nome) values ($1,'A fictícia'),($2,'B fictícia')", [unidade, outra]);
  await db.query('insert into auth.users (id) values ($1),($2),($3)', [recepcao, medico, gestor]);
  await db.query(`insert into piloto_privado.vinculos (unidade_id,usuario_id,perfil)
    values ($1,$2,'recepcao'),($1,$3,'medico'),($1,$4,'gestao')`, [unidade, recepcao, medico, gestor]);
  await db.query(`insert into piloto.pacientes (unidade_id,id,nome) values ($1,$3,'Paciente Vinculado Fictício'),($2,$3,'Paciente Outra Unidade')`,
    [unidade, outra, paciente]);
  await db.query(`insert into piloto.profissionais (unidade_id,id,nome,usuario_id) values ($1,$2,'Médico Fictício',$3)`,
    [unidade, profissional, medico]);
  await db.query(`insert into piloto.atendimentos (unidade_id,paciente_id,profissional_id) values ($1,$2,$3)`,
    [unidade, paciente, profissional]);
  const como = (usuario, sql, args, aal = 'aal2') => db.transaction(async tx => {
    await tx.exec('set local role authenticated');
    await tx.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: usuario, aal })]);
    const { rows } = await tx.query(sql, args);
    return rows[0]?.dados;
  });
  const cadastro = (usuario, u, nome = 'Paciente Júlia Fictícia', aal = 'aal2', data = '1990-04-15') => como(usuario,
    'select public.piloto_cadastrar_paciente($1,$2,$3,$4,$5,$6) as dados', [u, chave, nome, 'Iêda Sintética', data, correlacao], aal);
  const buscar = (usuario, u, termo, aal = 'aal2', pagina = 0) => como(usuario,
    'select public.piloto_buscar_pacientes($1,$2,$3,$4) as dados', [u, termo, pagina, correlacao], aal);

  assert.equal(await cadastro(recepcao, unidade), chave);
  assert.equal(await cadastro(recepcao, unidade), chave);
  await assert.rejects(cadastro(recepcao, unidade, 'Outro nome fictício'), { code: '23505' });
  await assert.rejects(cadastro(recepcao, unidade, 'Paciente Júlia Fictícia', 'aal2', '2099-01-01'), { code: '22023' });
  await assert.rejects(cadastro(recepcao, unidade, 'Paciente Júlia Fictícia', 'aal1'), { code: '42501' });
  await assert.rejects(cadastro(recepcao, outra), { code: '42501' });
  await assert.rejects(cadastro(medico, unidade), { code: '42501' });
  await assert.rejects(como(recepcao, "insert into piloto.pacientes (unidade_id,nome) values ($1,'Não permitido')", [unidade]), { code: '42501' });
  const encontrado = await buscar(recepcao, unidade, '  IEDA SINTETICA  ');
  assert.deepEqual(encontrado, [{ id: chave, nome: 'Paciente Júlia Fictícia', nome_social: 'Iêda Sintética', nascimento: '1990-04-15' }]);
  assert.deepEqual(await buscar(recepcao, unidade, 'julia'), encontrado);
  assert.deepEqual(await buscar(recepcao, unidade, 'julia', 'aal2', 1), []);
  assert.deepEqual(await buscar(recepcao, unidade, 'outra unidade'), []);
  assert.deepEqual((await buscar(medico, unidade, 'paciente')).map(p => p.id), [paciente]);
  assert.equal(await buscar(gestor, unidade, 'paciente'), null);
  assert.equal(await buscar(recepcao, outra, 'paciente'), null);
  assert.equal(await buscar(recepcao, unidade, 'paciente', 'aal1'), null);
  await assert.rejects(buscar(recepcao, unidade, 'a'), { code: '22023' });

  const { rows } = await db.query(`select operacao, unidade_id, registro_id, resultado, ator_id
    from piloto_privado.auditoria where entidade='pacientes' and correlacao_id=$1 order by id`, [correlacao]);
  assert.equal(rows.filter(r => r.operacao === 'INSERT').length, 1);
  assert.equal(rows.find(r => r.operacao === 'INSERT').registro_id, chave);
  assert.equal(rows.find(r => r.operacao === 'INSERT').ator_id, recepcao);
  assert.equal(rows.filter(r => r.resultado === 'negado').length, 3);
  assert.ok(rows.filter(r => r.resultado === 'negado').every(r => r.unidade_id === null && r.registro_id === null));
});
