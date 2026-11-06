const assert = require('node:assert/strict');
const test = require('node:test');
const { criarBancoTeste } = require('./ambiente-teste.cjs');

const uuid = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const [a, b, recep, doctor, otherDoctor, finance, admin, revoked, doctorB] =
  [1, 2, 11, 12, 13, 14, 15, 16, 17].map(uuid);
const [pro, otherPro, proB, patient, otherPatient, patientB, procedure, payer, booking,
  canceled, encounter, otherEncounter, encounterB, item, evolution, report, payment] =
  [21, 22, 23, 31, 32, 33, 41, 42, 51, 52, 61, 62, 63, 71, 81, 82, 91].map(uuid);

test('Modelo, RLS e auditoria em PostgreSQL descartável', async t => {
  const db = await criarBancoTeste();
  t.after(() => db.close());

  const q = (sql, args = []) => db.query(sql, args);
  const deny = (sql, args, code) => assert.rejects(q(sql, args), { code });
  const visible = async (table, expected) => {
    const { rows } = await q('select id from piloto.' + table + ' order by id');
    assert.deepEqual(rows.map(row => row.id), expected);
  };
  async function as(user, work, options = {}) {
    await q("select set_config('request.jwt.claims', $1, false)", [
      JSON.stringify({ sub: user, aal: options.aal ?? 'aal2', is_anonymous: options.anonymous ?? false,
        user_metadata: { role: 'administrador' } }),
    ]);
    await db.exec(options.role === 'anon' ? 'set role anon' : 'set role authenticated');
    try {
      await work();
    } finally {
      await db.exec('reset role');
      await q("select set_config('request.jwt.claims', '{}', false)");
    }
  }

  await q('insert into piloto.unidades (id, nome) values ($1, $2), ($3, $4)', [a, 'Unidade A', b, 'Unidade B']);
  for (const [user, unit, role, active] of [
    [recep, a, 'recepcao', true], [doctor, a, 'medico', true], [otherDoctor, a, 'medico', true],
    [finance, a, 'financeiro', true], [admin, a, 'administrador', true],
    [revoked, a, 'recepcao', false], [doctorB, b, 'medico', true],
  ]) {
    await q('insert into auth.users values ($1)', [user]);
    await q('insert into piloto_privado.vinculos (unidade_id, usuario_id, perfil, ativo) values ($1,$2,$3,$4)', [unit, user, role, active]);
  }
  for (const [unit, id, user] of [[a, pro, doctor], [a, otherPro, otherDoctor], [b, proB, doctorB]]) {
    await q("insert into piloto.profissionais (unidade_id,id,usuario_id,nome) values ($1,$2,$3,'Profissional fictício')", [unit, id, user]);
  }
  for (const [unit, id] of [[a, patient], [a, otherPatient], [b, patientB]]) {
    await q("insert into piloto.pacientes (unidade_id,id,nome) values ($1,$2,'Paciente fictício')", [unit, id]);
  }
  await q("insert into piloto.procedimentos (unidade_id,id,codigo,descricao) values ($1,$2,'P001','Exame de teste')", [a, procedure]);
  await q("insert into piloto.convenios (unidade_id,id,nome) values ($1,$2,'Particular')", [a, payer]);

  const agendar = 'insert into piloto.agendamentos (unidade_id,id,paciente_id,profissional_id,inicio,fim,estado) values ($1,$2,$3,$4,$5,$6,$7)';
  const abrir = 'insert into piloto.atendimentos (unidade_id,id,paciente_id,profissional_id,agendamento_id) values ($1,$2,$3,$4,$5)';
  const precificar = 'insert into piloto.precos_procedimento (unidade_id,procedimento_id,convenio_id,vigencia,valor_centavos) values ($1,$2,$3,$4,20000)';
  const versionar = 'insert into piloto.versoes_documento (unidade_id,documento_id,tipo,versao,estado,conteudo,referencia_assinatura) values ($1,$2,$3,$4,$5,$6,$7)';
  const mover = 'insert into piloto.movimentos_financeiros (unidade_id,id,atendimento_id,tipo,valor_centavos,chave_idempotencia,movimento_origem_id) values ($1,$2,$3,$4,$5,$6,$7)';

  await t.test('agenda separada, conflito de horário, vínculo único e chaves por unidade', async () => {
    await q(agendar, [a, booking, patient, pro, '2026-11-05T08:00:00-03', '2026-11-05T09:00:00-03', 'reservado']);
    assert.equal((await q('select count(*)::int as total from piloto.atendimentos')).rows[0].total, 0);
    await deny(agendar, [a, uuid(53), patient, pro, '2026-11-05T08:30:00-03', '2026-11-05T09:10:00-03', 'reservado'], '23P01');
    await q(agendar, [a, canceled, otherPatient, pro, '2026-11-05T09:00:00-03', '2026-11-05T10:00:00-03', 'cancelado']);
    await deny(abrir, [a, encounter, otherPatient, pro, canceled], '23514');
    await deny(abrir, [a, encounter, otherPatient, pro, booking], '23503');
    await deny(abrir, [a, encounter, patientB, pro, null], '23503');
    await q(abrir, [a, encounter, patient, pro, booking]);
    await deny(abrir, [a, uuid(64), patient, pro, booking], '23505');
    await q(abrir, [a, otherEncounter, otherPatient, otherPro, null]);
    await q(abrir, [b, encounterB, patientB, proB, null]);
    await q(precificar, [a, procedure, payer, '[2026-11-01,2026-12-01)']);
    await deny(precificar, [a, procedure, payer, '[2026-11-20,2026-12-20)'], '23P01');
    await q(precificar, [a, procedure, payer, '[2026-12-01,)']);
  });

  await t.test('versões preservadas e laudo sem pular revisão ou alterar conteúdo na assinatura', async () => {
    await q('insert into piloto.itens_atendimento (unidade_id,id,atendimento_id,procedimento_id,quantidade,valor_unitario_centavos) values ($1,$2,$3,$4,2,10000)', [a, item, encounter, procedure]);
    await q("insert into piloto.documentos_clinicos (unidade_id,id,atendimento_id,autor_profissional_id,tipo,item_id) values ($1,$2,$3,$4,'evolucao_texto',null),($1,$5,$3,$4,'laudo',$6)", [a, evolution, encounter, pro, report, item]);
    const texto = '{"texto":"Conteúdo sintético"}';
    await q(versionar, [a, evolution, 'evolucao_texto', 1, 'rascunho', texto, null]);
    await deny(versionar, [a, evolution, 'evolucao_texto', 1, 'rascunho', texto, null], '23505');
    await deny(versionar, [a, evolution, 'evolucao_texto', 3, 'rascunho', texto, null], '23503');
    await q(versionar, [a, evolution, 'evolucao_texto', 2, 'finalizada', texto, null]);
    await deny(versionar, [a, evolution, 'evolucao_texto', 3, 'rascunho', texto, null], '23514');
    await deny('update piloto.versoes_documento set conteudo=conteudo where unidade_id=$1 and documento_id=$2 and versao=1', [a, evolution], '55000');
    const laudo = (v, e, c = texto, s = null) => [a, report, 'laudo', v, e, c, s];
    await deny(versionar, laudo(1, 'liberado', texto, 'teste'), '23514');
    await q(versionar, laudo(1, 'rascunho'));
    await deny(versionar, laudo(2, 'assinado', texto, 'teste'), '23514');
    await q(versionar, laudo(2, 'em_revisao'));
    await deny(versionar, laudo(3, 'devolvido_para_correcao'), '23514');
    await q(versionar, laudo(3, 'aprovado_para_assinatura'));
    await deny(versionar, laudo(4, 'assinado', '{"texto":"alterado"}', 'teste'), '23514');
    await q(versionar, laudo(4, 'assinado', texto, 'teste'));
    await deny(versionar, laudo(5, 'liberado', texto, 'outra-referencia'), '23514');
    await q(versionar, laudo(5, 'liberado', texto, 'teste'));
  });

  await t.test('recebimento parcial, estorno vinculado e idempotência', async () => {
    const saldo = async (recebido, pendente) => {
      const { rows } = await q('select cobrado_centavos::int as cobrado, recebido_liquido_centavos::int as recebido, saldo_centavos::int as pendente from piloto.saldos_atendimento where atendimento_id=$1', [encounter]);
      assert.deepEqual(rows, [{ cobrado: 20000, recebido, pendente }]);
    };
    await q(mover, [a, payment, encounter, 'recebimento', 8000, uuid(101), null]);
    await as(finance, () => saldo(8000, 12000));
    await deny(mover, [a, uuid(93), encounter, 'recebimento', 8000, uuid(101), null], '23505');
    await deny(mover, [a, uuid(93), encounter, 'estorno', 7999, uuid(102), payment], '23503');
    await deny(mover, [a, uuid(93), otherEncounter, 'estorno', 8000, uuid(102), payment], '23503');
    await q(mover, [a, uuid(92), encounter, 'recebimento', 12000, uuid(104), null]);
    await as(finance, () => saldo(20000, 0));
    await q(mover, [a, uuid(93), encounter, 'estorno', 8000, uuid(102), payment]);
    await deny(mover, [a, uuid(94), encounter, 'estorno', 8000, uuid(103), payment], '23505');
    await as(finance, () => saldo(12000, 8000));
    await deny('delete from piloto.movimentos_financeiros where id=$1', [payment], '55000');
  });

  await t.test('isolamento entre unidades, profissionais e perfis', async () => {
    await as(recep, async () => {
      await visible('pacientes', [patient, otherPatient]);
      await visible('atendimentos', [encounter, otherEncounter]);
      await visible('documentos_clinicos', []);
      await visible('movimentos_financeiros', []);
      assert.equal((await q('select count(*)::int as total from piloto.saldos_atendimento')).rows[0].total, 0);
      await deny('insert into piloto.pacientes (unidade_id,nome) values ($1,$2)', [a, 'Teste'], '42501');
      await visible('profissionais', [pro, otherPro]);
      await deny('select usuario_id from piloto.profissionais', [], '42501');
      await deny('select * from piloto_privado.vinculos', [], '42501');
    });
    await as(doctor, async () => {
      await visible('pacientes', [patient]);
      await visible('atendimentos', [encounter]);
      await visible('documentos_clinicos', [evolution, report]);
      assert.equal((await q('select count(*)::int as total from piloto.versoes_documento')).rows[0].total, 7);
      await visible('movimentos_financeiros', []);
    });
    await as(otherDoctor, async () => {
      await visible('pacientes', [otherPatient]);
      await visible('documentos_clinicos', []);
    });
    await as(doctorB, async () => {
      await visible('atendimentos', [encounterB]);
      await visible('documentos_clinicos', []);
    });
    await as(finance, async () => {
      await visible('pacientes', []);
      await visible('documentos_clinicos', []);
      await visible('movimentos_financeiros', [payment, uuid(92), uuid(93)]);
    });
    await as(admin, async () => {
      await visible('documentos_clinicos', []);
      await deny('select * from piloto_privado.auditoria', [], '42501');
    });
    await as(revoked, () => visible('unidades', []));
    await as(recep, () => visible('unidades', []), { anonymous: true });
    await as(undefined, () => deny('select * from piloto.unidades', [], '42501'), { role: 'anon' });
  });

  await t.test('MFA, consulta do próprio vínculo e revogação no mesmo contexto de sessão', async () => {
    const perfis = async (unidade, esperado) => {
      const { rows } = await q('select perfil from public.piloto_meus_perfis($1)', [unidade]);
      assert.deepEqual(rows.map(row => row.perfil), esperado);
    };
    await as(recep, async () => {
      await perfis(a, []);
      await visible('pacientes', []);
    }, { aal: 'aal1' });
    await as(recep, () => perfis(a, []), { anonymous: true });
    await as(undefined, () => deny('select * from public.piloto_meus_perfis($1)', [a], '42501'), { role: 'anon' });
    await as(recep, async () => {
      await perfis(a, ['recepcao']);
      await perfis(b, []);
      await db.exec('reset role');
      await q('update piloto_privado.vinculos set ativo=false where unidade_id=$1 and usuario_id=$2', [a, recep]);
      await db.exec('set role authenticated');
      await perfis(a, []);
      await visible('pacientes', []);
    });
    await q('update piloto_privado.vinculos set ativo=true where unidade_id=$1 and usuario_id=$2', [a, recep]);
    await q('update piloto.unidades set ativa=false where id=$1', [a]);
    await as(recep, () => perfis(a, []));
    await q('update piloto.unidades set ativa=true where id=$1', [a]);
  });

  await t.test('projeção clínica devolve apenas os itens do próprio atendimento, sem valores', async () => {
    const itens = (unidade, atendimento) => q('select * from piloto_privado.itens_clinicos($1, $2)', [unidade, atendimento]);
    await as(doctor, async () => {
      assert.deepEqual((await itens(a, encounter)).rows, [{ id: item, procedimento_id: procedure, quantidade: 2 }]);
      assert.deepEqual((await itens(a, otherEncounter)).rows, []);
      assert.deepEqual((await itens(b, encounter)).rows, []);
      assert.deepEqual((await q('select valor_unitario_centavos from piloto.itens_atendimento')).rows, []);
    });
    for (const perfil of [recep, finance, admin, otherDoctor]) {
      await as(perfil, async () => assert.deepEqual((await itens(a, encounter)).rows, []));
    }
  });

  await t.test('shell lista as próprias unidades e perfis ativos com MFA', async () => {
    const listar = () => q('select * from public.piloto_minhas_unidades()');
    await q("insert into piloto_privado.vinculos (unidade_id, usuario_id, perfil, ativo) values ($1,$2,'financeiro',true),($1,$2,'administrador',false),($3,$2,'gestao',true)", [a, recep, b]);
    await as(recep, async () => {
      assert.deepEqual((await listar()).rows, [
        { id: a, nome: 'Unidade A', perfis: ['financeiro', 'recepcao'] },
        { id: b, nome: 'Unidade B', perfis: ['gestao'] },
      ]);
    });
    await as(recep, async () => assert.deepEqual((await listar()).rows, []), { aal: 'aal1' });
    await as(recep, async () => assert.deepEqual((await listar()).rows, []), { anonymous: true });
    await as(revoked, async () => assert.deepEqual((await listar()).rows, []));
    await as(undefined, () => deny('select * from public.piloto_minhas_unidades()', [], '42501'), { role: 'anon' });
    await q('update piloto.unidades set ativa=false where id=$1', [b]);
    await as(recep, async () => assert.deepEqual((await listar()).rows.map(unidade => unidade.id), [a]));
    await q('update piloto.unidades set ativa=true where id=$1', [b]);
  });

  await t.test('trilha correlaciona leituras clínicas, consultas de perfis e bloqueios', async () => {
    const [okPerfil, negadoPerfil, painel, itensOk, itensVazios, docOk, docNegado, semMfa, anonimo] =
      [201, 202, 203, 204, 205, 206, 207, 208, 209].map(uuid);
    await as(recep, async () => {
      await q('select * from public.piloto_meus_perfis($1, $2)', [a, okPerfil]);
      assert.deepEqual((await q('select * from public.piloto_meus_perfis($1, $2)', [uuid(999), negadoPerfil])).rows, []);
      await q('select * from public.piloto_minhas_unidades($1)', [painel]);
    });
    await as(doctor, async () => {
      await q('select * from piloto_privado.itens_clinicos($1, $2, $3)', [a, encounter, itensOk]);
      const { rows } = await q('select * from piloto_privado.documento_atual_auditado($1, $2, $3)', [a, report, docOk]);
      assert.deepEqual(rows, [{
        id: report, atendimento_id: encounter, item_id: item, tipo: 'laudo',
        versao: 5, estado: 'liberado', conteudo: { texto: 'Conteúdo sintético' },
      }]);
    });
    await as(otherDoctor, async () => {
      assert.deepEqual((await q('select * from piloto_privado.itens_clinicos($1, $2, $3)', [a, otherEncounter, itensVazios])).rows, []);
      assert.deepEqual((await q('select * from piloto_privado.documento_atual_auditado($1, $2, $3)', [a, report, docNegado])).rows, []);
    });
    await as(doctor, () => q('select * from piloto_privado.documento_atual_auditado($1, $2, $3)', [a, report, semMfa]), { aal: 'aal1' });
    await as(doctor, () => q('select * from public.piloto_minhas_unidades($1)', [anonimo]), { anonymous: true });
    const { rows } = await q(`select entidade, unidade_id, registro_id, ator_id, operacao, resultado, correlacao_id
      from piloto_privado.auditoria where correlacao_id = any($1::uuid[]) order by correlacao_id`,
    [[okPerfil, negadoPerfil, painel, itensOk, itensVazios, docOk, docNegado, semMfa, anonimo]]);
    assert.deepEqual(rows.map(e => [e.correlacao_id, e.entidade, e.unidade_id, e.registro_id, e.ator_id, e.operacao, e.resultado]), [
      [okPerfil, 'acesso_unidade', a, a, recep, 'SELECT', 'permitido'],
      [negadoPerfil, 'acesso_unidade', null, null, recep, 'SELECT', 'negado'],
      [painel, 'painel_unidades', null, null, recep, 'SELECT', 'permitido'],
      [itensOk, 'itens_clinicos', a, encounter, doctor, 'SELECT', 'permitido'],
      [itensVazios, 'itens_clinicos', a, otherEncounter, otherDoctor, 'SELECT', 'permitido'],
      [docOk, 'documentos_clinicos', a, report, doctor, 'SELECT', 'permitido'],
      [docNegado, 'documentos_clinicos', null, null, otherDoctor, 'SELECT', 'negado'],
      [semMfa, 'documentos_clinicos', null, null, doctor, 'SELECT', 'negado'],
    ]);
    const trilha = await q('select * from piloto_privado.auditoria where correlacao_id = $1', [docOk]);
    assert.equal(JSON.stringify(trilha.rows).includes('Conteúdo sintético'), false);
  });

  await t.test('alteração e auditoria confirmam ou revertem juntas', async () => {
    const correlacao = uuid(210);
    const ajustar = async tx => {
      await tx.query("select set_config('request.jwt.claims', $1, true), set_config('piloto.correlacao_id', $2, true)",
        [JSON.stringify({ sub: recep, aal: 'aal2' }), correlacao]);
      await tx.query("update piloto.agendamentos set estado='remarcado' where id=$1", [booking]);
    };
    const trilha = () => q('select ator_id, operacao, resultado from piloto_privado.auditoria where correlacao_id=$1', [correlacao]);
    await assert.rejects(db.transaction(async tx => {
      await ajustar(tx);
      throw new Error('reverter a alteração de teste');
    }), /reverter a alteração de teste/);
    assert.deepEqual((await trilha()).rows, []);
    assert.equal((await q('select estado from piloto.agendamentos where id=$1', [booking])).rows[0].estado, 'reservado');
    await db.transaction(ajustar);
    assert.deepEqual((await trilha()).rows, [{ ator_id: recep, operacao: 'UPDATE', resultado: 'permitido' }]);
    assert.equal((await q('select estado from piloto.agendamentos where id=$1', [booking])).rows[0].estado, 'remarcado');
  });

  await t.test('falha de registro bloqueia leitura e alteração e a trilha resiste a reescrita', async () => {
    await q("alter table piloto_privado.auditoria add constraint teste_auditoria_indisponivel check (false) not valid");
    try {
      await as(doctor, () => deny('select * from piloto_privado.documento_atual_auditado($1, $2)', [a, report], '23514'));
      await as(recep, () => deny('select * from public.piloto_meus_perfis($1)', [a], '23514'));
      await deny("update piloto.agendamentos set estado='confirmado' where id=$1", [booking], '23514');
    } finally {
      await q('alter table piloto_privado.auditoria drop constraint teste_auditoria_indisponivel');
    }
    assert.equal((await q('select estado from piloto.agendamentos where id=$1', [booking])).rows[0].estado, 'remarcado');
    await as(admin, async () => {
      await deny('select * from piloto_privado.auditoria', [], '42501');
      await deny('delete from piloto_privado.auditoria', [], '42501');
      await deny('truncate piloto_privado.auditoria', [], '42501');
    });
    await deny('delete from piloto_privado.auditoria', [], '55000');
    await deny('truncate piloto_privado.auditoria', [], '55000');
  });

  await t.test('RLS em todas as tabelas e auditoria sem conteúdo clínico', async () => {
    const { rows } = await q(`select count(*)::int total, bool_and(c.relrowsecurity) protegidas
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname in ('piloto','piloto_privado') and c.relkind='r'`);
    assert.deepEqual(rows, [{ total: 14, protegidas: true }]);
    await q("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: recep })]);
    await q("update piloto.agendamentos set estado='confirmado' where id=$1", [booking]);
    await q("select set_config('request.jwt.claims', '{}', false)");
    const events = (await q("select * from piloto_privado.auditoria where registro_id=$1 order by id", [booking])).rows;
    assert.deepEqual(events.map(x => [x.operacao, x.ator_id]), [['INSERT', null], ['UPDATE', recep], ['UPDATE', recep]]);
    assert.deepEqual(Object.keys(events[0]).sort(), ['ator_id', 'correlacao_id', 'entidade', 'id', 'ocorrido_em', 'operacao', 'registro_id', 'resultado', 'unidade_id']);
    await deny('update piloto_privado.auditoria set ator_id=$1 where registro_id=$2', [recep, booking], '55000');
  });
});
