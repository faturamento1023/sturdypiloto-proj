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

  await t.test('cadastro médico restringe unidade e MFA, preserva histórico e audita revisões', async () => {
    const novo = (opcoes = {}) => [
      opcoes.unidade ?? a, opcoes.id ?? null, opcoes.revisao ?? null, 'Médico fictício',
      Object.hasOwn(opcoes, 'crm') ? opcoes.crm : '001234', Object.hasOwn(opcoes, 'uf') ? opcoes.uf : 'GO',
      'Clínica médica', '', opcoes.ativo ?? true, uuid(401),
    ];
    const sql = 'select public.piloto_salvar_medico($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) as id';
    const listar = (unidade, termo = '') => q('select * from public.piloto_listar_medicos($1,$2,0,$3)', [unidade, termo, uuid(402)]);
    await as(recep, async () => {
      await deny(sql, novo(), '42501');
      assert.deepEqual((await listar(a)).rows, []);
    });
    await as(admin, () => deny(sql, novo(), '42501'), { aal: 'aal1' });
    await as(admin, () => deny(sql, novo({ unidade: b }), '42501'));
    await as(admin, () => deny(sql, novo({ crm: '0000' }), '23514'));
    await as(admin, () => deny(sql, novo({ crm: null, uf: null }), '22023'));

    let id;
    await as(admin, async () => {
      id = (await q(sql, novo())).rows[0].id;
      assert.equal((await listar(a, '1234')).rows[0].crm, '001234');
      await deny(sql, novo({ crm: '1234' }), '23505');
      await q(sql, novo({ id, revisao: 0, ativo: false }));
      await deny(sql, novo({ id, revisao: 0 }), '40001');
      await deny(sql, novo({ id: proB, revisao: 0 }), '40001');
      await deny(sql, novo({ id, revisao: 1, crm: null, uf: null }), '40001');
      const medico = (await listar(a, 'clínica médica')).rows[0];
      assert.equal(medico.ativo, false);
      assert.equal(medico.revisao, 1);
      assert.deepEqual((await listar(b)).rows, []);
      assert.deepEqual((await listar(a, '%')).rows, []);
      await q(sql, novo({ id: otherPro, revisao: 0, crm: null, uf: null, ativo: false }));
    });
    const eventos = await q('select operacao, ator_id, correlacao_id from piloto_privado.auditoria where registro_id=$1 order by id', [id]);
    assert.deepEqual(eventos.rows, [
      { operacao: 'INSERT', ator_id: admin, correlacao_id: uuid(401) },
      { operacao: 'UPDATE', ator_id: admin, correlacao_id: uuid(401) },
    ]);
    assert.equal((await q('select usuario_id from piloto.profissionais where id=$1', [otherPro])).rows[0].usuario_id, otherDoctor);
    assert.equal((await q('select count(*)::int total from piloto.atendimentos where profissional_id=$1', [otherPro])).rows[0].total, 1);
  });

  await t.test('convites exigem e-mail verificado, MFA, validade e uso único', async () => {
    const [convidado, semConfirmacao, medicoNovo, medicoConta] = [501, 502, 503, 504].map(uuid);
    await q("insert into auth.users (id,email,email_confirmed_at) values ($1,'convite@example.com',now()),($2,'nao-confirmado@example.com',null),($3,'medico-novo@example.com',now())",
      [convidado, semConfirmacao, medicoConta]);
    await q("insert into piloto.profissionais (unidade_id,id,nome,crm,crm_uf) values ($1,$2,'Médico do convite','3456','GO')",
      [a, medicoNovo]);

    const emitir = (email, perfil, profissional = null, unidade = a) => q(
      'select public.piloto_emitir_convite($1,$2,$3,$4,$5) as codigo',
      [unidade, email, perfil, profissional, uuid(510)],
    );
    const aceitar = codigo => q('select public.piloto_aceitar_convite($1,$2) as unidade', [codigo, uuid(511)]);
    const gerir = (operacao, alvo, habilitar = null) => q(
      'select public.piloto_gerir_usuarios($1,$2,$3,$4,$5) as ok', [a, operacao, alvo, habilitar, uuid(512)],
    );
    const listar = (unidade = a) => q('select public.piloto_listar_usuarios($1,$2) as dados', [unidade, uuid(513)]);
    await as(recep, async () => {
      await assert.rejects(emitir('convite@example.com', 'recepcao'), { code: '42501' });
      assert.equal((await listar()).rows[0].dados, null);
    });
    await as(admin, () => assert.rejects(emitir('convite@example.com', 'recepcao'), { code: '42501' }), { aal: 'aal1' });

    let codigo, antigo, expirado, naoConfirmado, codigoMedico, cancelar, cancelado;
    await as(admin, async () => {
      await assert.rejects(emitir('convite@example.com', 'administrador'), { code: '22023' });
      await assert.rejects(emitir('convite@example.com', 'recepcao', null, b), { code: '42501' });
      await assert.rejects(emitir('medico-novo@example.com', 'medico', proB), { code: '22023' });
      antigo = (await emitir('convite@example.com', 'recepcao')).rows[0].codigo;
      codigo = (await emitir(' Convite@Example.com ', 'recepcao')).rows[0].codigo;
      expirado = (await emitir('convite@example.com', 'financeiro')).rows[0].codigo;
      naoConfirmado = (await emitir('nao-confirmado@example.com', 'recepcao')).rows[0].codigo;
      codigoMedico = (await emitir('medico-novo@example.com', 'medico', medicoNovo)).rows[0].codigo;
      cancelado = (await emitir('convite@example.com', 'gestao')).rows[0].codigo;
      const dados = (await listar()).rows[0].dados;
      cancelar = dados.convites.find(c => c.perfil === 'gestao').id;
      assert.equal(JSON.stringify(dados).includes(codigo), false);
      assert.equal(JSON.stringify(dados).includes('codigo_hash'), false);
      assert.equal((await gerir('cancelar', cancelar)).rows[0].ok, true);
    });
    assert.match(codigo, /^[0-9a-f]{64}$/);
    await q("update piloto_privado.convites set expira_em=clock_timestamp() - interval '1 second' where perfil='financeiro'");
    await as(convidado, async () => assert.equal((await aceitar(codigo)).rows[0].unidade, null), { aal: 'aal1' });
    await as(recep, async () => assert.equal((await aceitar(codigo)).rows[0].unidade, null));
    await as(semConfirmacao, async () => assert.equal((await aceitar(naoConfirmado)).rows[0].unidade, null));
    await as(convidado, async () => {
      for (const invalido of [antigo, expirado, cancelado]) {
        assert.equal((await aceitar(invalido)).rows[0].unidade, null);
      }
      assert.equal((await aceitar(codigo)).rows[0].unidade, a);
      assert.equal((await aceitar(codigo)).rows[0].unidade, null);
    });
    await as(medicoConta, async () => assert.equal((await aceitar(codigoMedico)).rows[0].unidade, a));
    assert.equal((await q('select usuario_id from piloto.profissionais where id=$1', [medicoNovo])).rows[0].usuario_id, medicoConta);

    await q("insert into piloto_privado.vinculos (unidade_id,usuario_id,perfil) values ($1,$3,'financeiro'),($2,$3,'recepcao')", [a, b, convidado]);
    await as(admin, async () => {
      const dados = (await listar()).rows[0].dados;
      const alvo = dados.vinculos.find(v => v.usuario_id === convidado);
      const administrador = dados.vinculos.find(v => v.usuario_id === admin && v.perfil === 'administrador');
      assert.equal((await gerir('bloquear', administrador.id)).rows[0].ok, false);
      assert.equal((await gerir('bloquear', alvo.id)).rows[0].ok, true);
      assert.equal((await gerir('perfil', alvo.id, true)).rows[0].ok, true);
      assert.equal((await listar(b)).rows[0].dados, null);
    });
    const acessos = (await q('select unidade_id,perfil,ativo from piloto_privado.vinculos where usuario_id=$1 order by unidade_id,perfil', [convidado])).rows;
    assert.equal(acessos.filter(v => v.unidade_id === a && v.ativo).length, 1);
    assert.equal(acessos.find(v => v.unidade_id === b).ativo, true);
    const trilha = (await q("select * from piloto_privado.auditoria where entidade in ('convites','vinculos') and correlacao_id=$1", [uuid(511)])).rows;
    assert.equal(trilha.length, 4);
    assert.equal(JSON.stringify(trilha).includes(codigo), false);
    assert.equal(JSON.stringify(trilha).includes('@example.com'), false);
  });

  await t.test('catálogo preserva legado e histórico, isola grupos e audita o cadastro', async () => {
    const grupoB = uuid(601);
    const correlacao = uuid(602);
    const grupoSql = 'select public.piloto_salvar_grupo_procedimento($1,$2,$3,$4,$5,$6) as id';
    const procedimentoSql = 'select public.piloto_salvar_procedimento($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) as id';
    const listar = (unidade = a, busca = '') => q('select public.piloto_listar_catalogo($1,$2,0,$3) as dados', [unidade, busca, uuid(603)]);
    const grupoArgs = (id = null, revisao = null, ativo = true, nome = 'Grupo sintético') => [a, id, revisao, nome, ativo, correlacao];
    const procArgs = (grupo, id = null, revisao = null, ativo = true, tuss = '09990001') =>
      [a, id, revisao, grupo, 'FICT-018', 'Procedimento fictício', tuss, 'exame', 'Preparo sintético', true, ativo, correlacao];
    await q("insert into piloto.grupos_procedimentos (unidade_id,id,nome) values ($1,$2,'Grupo da unidade B')", [b, grupoB]);

    await as(doctor, async () => {
      const legado = (await listar()).rows[0].dados.procedimentos.find(item => item.id === procedure);
      assert.equal(legado.codigo_tuss, null);
      assert.equal(legado.tipo, 'procedimento');
      await deny(grupoSql, grupoArgs(), '42501');
      await deny(procedimentoSql, procArgs(null), '42501');
    });
    await as(admin, async () => {
      assert.equal((await listar(b)).rows[0].dados, null);
      await deny(grupoSql, grupoArgs(), '42501');
    }, { aal: 'aal1' });

    let grupo, procedimento;
    await as(admin, async () => {
      grupo = (await q(grupoSql, grupoArgs())).rows[0].id;
      await deny(grupoSql, grupoArgs(null, null, true, 'grupo sintético'), '23505');
      await deny(procedimentoSql, procArgs(grupoB), '22023');
      await deny(procedimentoSql, procArgs(grupo, null, null, true, 'inválido'), '23514');
      procedimento = (await q(procedimentoSql, procArgs(grupo))).rows[0].id;
      await deny(procedimentoSql, procArgs(grupo), '23505');
      await deny(grupoSql, grupoArgs(grupo, 0, false), 'P0001');
    });
    await as(otherDoctor, async () => {
      const dados = (await listar(a, '09990001')).rows[0].dados;
      assert.equal(dados.gestor, false);
      assert.deepEqual(dados.grupos.map(g => g.id), [grupo]);
      assert.equal(dados.procedimentos[0].exige_consentimento, true);
      assert.equal(dados.procedimentos[0].preparo, 'Preparo sintético');
    });
    await q('insert into piloto.itens_atendimento (unidade_id,atendimento_id,procedimento_id,quantidade,valor_unitario_centavos) values ($1,$2,$3,1,0)',
      [a, encounter, procedimento]);
    await as(admin, async () => {
      await q(procedimentoSql, procArgs(grupo, procedimento, 0, false));
      await deny(procedimentoSql, procArgs(grupo, procedimento, 0, false), '40001');
      await q(grupoSql, grupoArgs(grupo, 0, false));
      await deny(procedimentoSql, procArgs(grupo, procedimento, 1), '22023');
      const dados = (await listar(a, 'FICT-018')).rows[0].dados;
      assert.equal(dados.procedimentos[0].ativo, false);
      assert.equal(dados.grupos.find(g => g.id === grupo).ativo, false);
    });
    await as(recep, async () => {
      const dados = (await listar(a, 'FICT-018')).rows[0].dados;
      assert.deepEqual(dados.procedimentos, []);
      assert.deepEqual(dados.grupos, []);
    });
    assert.equal((await q('select count(*)::int total from piloto.itens_atendimento where procedimento_id=$1', [procedimento])).rows[0].total, 1);
    const trilha = (await q('select * from piloto_privado.auditoria where correlacao_id=$1 order by id', [correlacao])).rows;
    assert.deepEqual(trilha.map(e => [e.entidade, e.operacao, e.ator_id]), [
      ['grupos_procedimentos', 'INSERT', admin], ['procedimentos', 'INSERT', admin],
      ['procedimentos', 'UPDATE', admin], ['grupos_procedimentos', 'UPDATE', admin],
    ]);
    assert.equal(JSON.stringify(trilha).includes('Preparo sintético'), false);
  });

  await t.test('convênios e preços isolam unidade, respeitam vigência e preservam valores históricos', async () => {
    const correlacao = uuid(701);
    const conv = 'select public.piloto_salvar_convenio($1,$2,$3,$4,$5,$6) as id';
    const criar = 'select public.piloto_cadastrar_preco($1,$2,$3,$4,$5,$6,$7,$8) as id';
    const revisar = 'select public.piloto_revisar_preco($1,$2,$3,$4,$5,$6) as id';
    const convArgs = (id = null, rev = null, ativo = true, nome = 'Convênio sintético') => [a, id, rev, nome, ativo, correlacao];
    const precoArgs = (convenio, inicio, fim, valor = 15000, copart = 2000) =>
      [a, convenio, procedure, inicio, fim, valor, copart, correlacao];
    const listar = (data, unidade = a, busca = 'Convênio sintético') => q(
      'select public.piloto_listar_convenios_precos($1,$2,$3,0,$4) as dados', [unidade, busca, data, uuid(702)],
    );

    await as(doctor, async () => assert.equal((await listar(null)).rows[0].dados, null));
    await as(recep, async () => await deny(conv, convArgs(), '42501'));
    await as(admin, () => deny(conv, convArgs(), '42501'), { aal: 'aal1' });
    await as(admin, () => deny(conv, [b, null, null, 'Outra unidade', true, correlacao], '42501'));
    let convenio, primeiro, segundo;
    await as(admin, async () => {
      convenio = (await q(conv, convArgs())).rows[0].id;
      await deny(conv, convArgs(null, null, true, '  convênio sintético '), '23505');
      await deny(criar, precoArgs(convenio, '2030-01-01', '2030-01-10', 200, 201), '22023');
      await deny(criar, precoArgs(convenio, '2030-01-10', '2030-01-10'), '22023');
      primeiro = (await q(criar, precoArgs(convenio, '2030-01-01', '2030-01-10'))).rows[0].id;
      segundo = (await q(criar, precoArgs(convenio, '2030-01-10', '2030-01-20', 18000, 3000))).rows[0].id;
      await deny(criar, precoArgs(convenio, '2030-01-09', '2030-01-11'), '23P01');
      await deny(revisar, [a, primeiro, 1, '2030-01-11', true, correlacao], '23P01');
      assert.equal((await listar('2030-01-01')).rows[0].dados.precos[0].id, primeiro);
      const fronteira = (await listar('2030-01-10')).rows[0].dados.precos;
      assert.deepEqual(fronteira.map(p => [p.id, p.valor_centavos, p.coparticipacao_centavos]), [[segundo, 18000, 3000]]);
      assert.deepEqual((await listar('2030-01-20')).rows[0].dados.precos, []);
      assert.deepEqual((await listar('2030-01-10', a, 'Convênio inexistente')).rows[0].dados.precos, []);
      assert.equal((await listar(null, b)).rows[0].dados, null);
    });
    await as(recep, async () => {
      await deny(criar, precoArgs(convenio, '2030-02-01', null), '42501');
      assert.equal((await listar('2030-01-10')).rows[0].dados.gestor, false);
    });
    await as(admin, async () => {
      await q(revisar, [a, segundo, 1, '2030-01-20', false, correlacao]);
      await deny(revisar, [a, segundo, 1, '2030-01-20', false, correlacao], '40001');
      const substituto = (await q(criar, precoArgs(convenio, '2030-01-10', '2030-01-20', 19000))).rows[0].id;
      assert.equal((await listar('2030-01-10')).rows[0].dados.precos[0].id, substituto);
      await deny(revisar, [a, segundo, 2, '2030-01-20', true, correlacao], '23P01');
      await q(conv, convArgs(convenio, 1, false));
      await deny(criar, precoArgs(convenio, '2030-02-01', null), '22023');
      assert.deepEqual((await listar('2030-01-10')).rows[0].dados.precos, []);
      const historico = (await listar(null)).rows[0].dados.precos;
      assert.equal(historico.length, 3);
      assert.equal(historico.find(p => p.id === segundo).valor_centavos, 18000);
      assert.equal(historico.some(p => p.disponivel), false);
    });
    await as(recep, async () => assert.deepEqual((await listar(null)).rows[0].dados.precos, []));
    assert.equal((await q('select valor_unitario_centavos from piloto.itens_atendimento where id=$1', [item])).rows[0].valor_unitario_centavos, 10000);
    const trilha = (await q('select * from piloto_privado.auditoria where correlacao_id=$1 order by id', [correlacao])).rows;
    assert.deepEqual(trilha.map(e => [e.entidade, e.operacao, e.ator_id]), [
      ['convenios', 'INSERT', admin], ['precos_procedimento', 'INSERT', admin],
      ['precos_procedimento', 'INSERT', admin], ['precos_procedimento', 'UPDATE', admin],
      ['precos_procedimento', 'INSERT', admin], ['convenios', 'UPDATE', admin],
    ]);
    assert.equal(JSON.stringify(trilha).includes('valor_centavos'), false);
  });

  await t.test('RLS em todas as tabelas e auditoria sem conteúdo clínico', async () => {
    const { rows } = await q(`select count(*)::int total, bool_and(c.relrowsecurity) protegidas
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname in ('piloto','piloto_privado') and c.relkind='r'`);
    assert.deepEqual(rows, [{ total: 17, protegidas: true }]);
    await q("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: recep })]);
    await q("update piloto.agendamentos set estado='confirmado' where id=$1", [booking]);
    await q("select set_config('request.jwt.claims', '{}', false)");
    const events = (await q("select * from piloto_privado.auditoria where registro_id=$1 order by id", [booking])).rows;
    assert.deepEqual(events.map(x => [x.operacao, x.ator_id]), [['INSERT', null], ['UPDATE', recep], ['UPDATE', recep]]);
    assert.deepEqual(Object.keys(events[0]).sort(), ['ator_id', 'correlacao_id', 'entidade', 'id', 'ocorrido_em', 'operacao', 'registro_id', 'resultado', 'unidade_id']);
    await deny('update piloto_privado.auditoria set ator_id=$1 where registro_id=$2', [recep, booking], '55000');
  });
});
