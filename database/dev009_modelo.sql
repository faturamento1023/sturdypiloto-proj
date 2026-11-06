-- Modelo executável DEV-009, para banco descartável e dados sintéticos.
-- A autenticação (auth.users, auth.uid(), auth.jwt() e papéis) é fornecida pelo Supabase.
begin;

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
set local search_path = pg_catalog, extensions;

create schema piloto;
create schema piloto_privado;
revoke all on schema piloto, piloto_privado from public, anon, authenticated, service_role;

create table piloto.unidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (btrim(nome) <> ''),
  ativa boolean not null default true
);

create table piloto_privado.vinculos (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references piloto.unidades (id),
  usuario_id uuid not null references auth.users (id),
  perfil text not null check (perfil in ('recepcao', 'medico', 'financeiro', 'gestao', 'administrador')),
  ativo boolean not null default true,
  unique (unidade_id, usuario_id, perfil)
);
create index vinculos_usuario_idx on piloto_privado.vinculos (usuario_id, unidade_id, perfil) where ativo;

create table piloto.profissionais (
  unidade_id uuid not null references piloto.unidades (id),
  id uuid not null default gen_random_uuid(),
  usuario_id uuid references auth.users (id),
  nome text not null check (btrim(nome) <> ''),
  ativo boolean not null default true,
  primary key (unidade_id, id),
  unique (unidade_id, usuario_id)
);
create index profissionais_usuario_idx on piloto.profissionais (usuario_id) where usuario_id is not null;

create table piloto.pacientes (
  unidade_id uuid not null references piloto.unidades (id),
  id uuid not null default gen_random_uuid(),
  nome text not null check (btrim(nome) <> ''),
  nascimento date,
  primary key (unidade_id, id)
);

create table piloto.convenios (
  unidade_id uuid not null references piloto.unidades (id),
  id uuid not null default gen_random_uuid(),
  nome text not null check (btrim(nome) <> ''),
  ativo boolean not null default true,
  primary key (unidade_id, id),
  unique (unidade_id, nome)
);

create table piloto.procedimentos (
  unidade_id uuid not null references piloto.unidades (id),
  id uuid not null default gen_random_uuid(),
  codigo text not null check (btrim(codigo) <> ''),
  descricao text not null check (btrim(descricao) <> ''),
  ativo boolean not null default true,
  primary key (unidade_id, id),
  unique (unidade_id, codigo)
);

create table piloto.precos_procedimento (
  unidade_id uuid not null,
  id uuid not null default gen_random_uuid(),
  procedimento_id uuid not null,
  convenio_id uuid not null,
  vigencia daterange not null check (not isempty(vigencia) and not lower_inf(vigencia)),
  valor_centavos integer not null check (valor_centavos >= 0),
  primary key (unidade_id, id),
  foreign key (unidade_id, procedimento_id) references piloto.procedimentos (unidade_id, id),
  foreign key (unidade_id, convenio_id) references piloto.convenios (unidade_id, id),
  exclude using gist (unidade_id with =, procedimento_id with =, convenio_id with =, vigencia with &&)
);
create index precos_convenio_idx on piloto.precos_procedimento (unidade_id, convenio_id);

create table piloto.agendamentos (
  unidade_id uuid not null,
  id uuid not null default gen_random_uuid(),
  paciente_id uuid not null,
  profissional_id uuid not null,
  inicio timestamptz not null,
  fim timestamptz not null,
  estado text not null default 'reservado'
    check (estado in ('reservado', 'confirmado', 'remarcado', 'cancelado', 'realizado')),
  check (fim > inicio),
  primary key (unidade_id, id),
  unique (unidade_id, id, paciente_id, profissional_id),
  foreign key (unidade_id, paciente_id) references piloto.pacientes (unidade_id, id),
  foreign key (unidade_id, profissional_id) references piloto.profissionais (unidade_id, id),
  exclude using gist (unidade_id with =, profissional_id with =, tstzrange(inicio, fim, '[)') with &&)
    where (estado <> 'cancelado')
);
create index agenda_unidade_inicio_idx on piloto.agendamentos (unidade_id, inicio);
create index agenda_paciente_idx on piloto.agendamentos (unidade_id, paciente_id);
create index agenda_profissional_idx on piloto.agendamentos (unidade_id, profissional_id);

create table piloto.atendimentos (
  unidade_id uuid not null,
  id uuid not null default gen_random_uuid(),
  paciente_id uuid not null,
  profissional_id uuid not null,
  agendamento_id uuid,
  estado text not null default 'aberto' check (estado in ('aberto', 'encerrado', 'cancelado')),
  aberto_em timestamptz not null default now(),
  primary key (unidade_id, id),
  unique (unidade_id, agendamento_id),
  unique (unidade_id, id, profissional_id),
  foreign key (unidade_id, paciente_id) references piloto.pacientes (unidade_id, id),
  foreign key (unidade_id, profissional_id) references piloto.profissionais (unidade_id, id),
  foreign key (unidade_id, agendamento_id, paciente_id, profissional_id)
    references piloto.agendamentos (unidade_id, id, paciente_id, profissional_id)
);
create index atendimento_paciente_idx on piloto.atendimentos (unidade_id, paciente_id);
create index atendimento_profissional_idx on piloto.atendimentos (unidade_id, profissional_id);

create table piloto.itens_atendimento (
  unidade_id uuid not null,
  id uuid not null default gen_random_uuid(),
  atendimento_id uuid not null,
  procedimento_id uuid not null,
  quantidade integer not null check (quantidade > 0),
  valor_unitario_centavos integer not null check (valor_unitario_centavos >= 0),
  cobrado_centavos bigint generated always as (quantidade::bigint * valor_unitario_centavos) stored,
  primary key (unidade_id, id),
  unique (unidade_id, atendimento_id, id),
  foreign key (unidade_id, atendimento_id) references piloto.atendimentos (unidade_id, id),
  foreign key (unidade_id, procedimento_id) references piloto.procedimentos (unidade_id, id)
);
create index itens_procedimento_idx on piloto.itens_atendimento (unidade_id, procedimento_id);

create table piloto.documentos_clinicos (
  unidade_id uuid not null,
  id uuid not null default gen_random_uuid(),
  atendimento_id uuid not null,
  autor_profissional_id uuid not null,
  item_id uuid,
  tipo text not null check (tipo in ('evolucao_texto', 'evolucao_estruturada', 'evolucao_exames', 'laudo')),
  check ((tipo = 'laudo') = (item_id is not null)),
  primary key (unidade_id, id),
  unique (unidade_id, id, tipo),
  foreign key (unidade_id, atendimento_id, autor_profissional_id)
    references piloto.atendimentos (unidade_id, id, profissional_id),
  foreign key (unidade_id, atendimento_id, item_id) references piloto.itens_atendimento (unidade_id, atendimento_id, id)
);
create index documentos_atendimento_idx on piloto.documentos_clinicos (unidade_id, atendimento_id, autor_profissional_id);
create index documentos_autor_idx on piloto.documentos_clinicos (unidade_id, autor_profissional_id);

create table piloto.versoes_documento (
  unidade_id uuid not null,
  id uuid not null default gen_random_uuid(),
  documento_id uuid not null,
  tipo text not null,
  versao integer not null check (versao > 0),
  versao_anterior integer generated always as (nullif(versao - 1, 0)) stored,
  estado text not null,
  conteudo jsonb not null check (jsonb_typeof(conteudo) = 'object'),
  motivo_devolucao text,
  referencia_assinatura text,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now(),
  primary key (unidade_id, id),
  unique (unidade_id, documento_id, versao),
  foreign key (unidade_id, documento_id, tipo) references piloto.documentos_clinicos (unidade_id, id, tipo),
  foreign key (unidade_id, documento_id, versao_anterior) references piloto.versoes_documento (unidade_id, documento_id, versao),
  check (
    (tipo = 'laudo' and estado in ('rascunho', 'em_revisao', 'devolvido_para_correcao', 'aprovado_para_assinatura', 'assinado', 'liberado'))
    or (tipo <> 'laudo' and estado in ('rascunho', 'finalizada'))
  ),
  check (estado <> 'devolvido_para_correcao' or nullif(btrim(motivo_devolucao), '') is not null),
  check ((estado in ('assinado', 'liberado')) = (nullif(btrim(referencia_assinatura), '') is not null))
);

create table piloto.movimentos_financeiros (
  unidade_id uuid not null,
  id uuid not null default gen_random_uuid(),
  atendimento_id uuid not null,
  tipo text not null check (tipo in ('recebimento', 'estorno')),
  valor_centavos integer not null check (valor_centavos > 0),
  chave_idempotencia uuid not null,
  movimento_origem_id uuid,
  origem_tipo text generated always as ('recebimento'::text) stored,
  ocorrido_em timestamptz not null default now(),
  primary key (unidade_id, id),
  unique (unidade_id, chave_idempotencia),
  unique (unidade_id, movimento_origem_id),
  unique (unidade_id, atendimento_id, id, tipo, valor_centavos),
  foreign key (unidade_id, atendimento_id) references piloto.atendimentos (unidade_id, id),
  foreign key (unidade_id, atendimento_id, movimento_origem_id, origem_tipo, valor_centavos)
    references piloto.movimentos_financeiros (unidade_id, atendimento_id, id, tipo, valor_centavos),
  check ((tipo = 'estorno') = (movimento_origem_id is not null))
);

create table piloto_privado.auditoria (
  id bigint generated always as identity primary key,
  unidade_id uuid not null,
  entidade text not null,
  registro_id uuid not null,
  operacao text not null check (operacao in ('INSERT', 'UPDATE', 'DELETE')),
  ator_id uuid,
  ocorrido_em timestamptz not null default clock_timestamp()
);
create index auditoria_registro_idx on piloto_privado.auditoria (unidade_id, entidade, registro_id, ocorrido_em);

-- Os auxiliares consultam somente os vínculos da identidade corrente.
-- São chamados pelas políticas, em schema ausente da lista de exposição da Data API.
create function piloto_privado.tem_perfil(unidade uuid, perfis text[])
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null
    and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true'
    and exists (
      select 1 from piloto_privado.vinculos v
      join piloto.unidades u on u.id = v.unidade_id and u.ativa
      where v.unidade_id = unidade and v.usuario_id = (select auth.uid())
        and v.ativo and v.perfil = any(perfis)
    )
$$;

create function piloto_privado.e_profissional(unidade uuid, profissional uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select piloto_privado.tem_perfil(unidade, array['medico'])
    and exists (
      select 1 from piloto.profissionais p
      where p.unidade_id = unidade and p.id = profissional
        and p.usuario_id = (select auth.uid()) and p.ativo
    )
$$;

create function piloto_privado.validar_abertura()
returns trigger language plpgsql set search_path = ''
as $$
declare
  situacao text;
begin
  if new.agendamento_id is null then
    return new;
  end if;

  select a.estado into situacao from piloto.agendamentos a
  where a.unidade_id = new.unidade_id and a.id = new.agendamento_id
  for update;

  if situacao is null or situacao not in ('reservado', 'confirmado', 'remarcado') then
    raise exception 'Agendamento indisponível para abertura' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger verificar_abertura
before insert or update of agendamento_id, unidade_id on piloto.atendimentos
for each row execute function piloto_privado.validar_abertura();

create function piloto_privado.validar_versao()
returns trigger language plpgsql set search_path = ''
as $$
declare
  anterior piloto.versoes_documento%rowtype;
  permitida boolean;
begin
  if new.versao = 1 then
    if new.estado <> 'rascunho' then
      raise exception 'A primeira versão deve ser rascunho' using errcode = '23514';
    end if;
    return new;
  end if;

  select * into anterior from piloto.versoes_documento
  where unidade_id = new.unidade_id and documento_id = new.documento_id and versao = new.versao - 1;
  if not found then
    raise exception 'Versão anterior ausente' using errcode = '23503';
  end if;

  if new.tipo = 'laudo' then
    permitida := case anterior.estado
      when 'rascunho' then new.estado in ('rascunho', 'em_revisao')
      when 'em_revisao' then new.estado in ('devolvido_para_correcao', 'aprovado_para_assinatura')
      when 'devolvido_para_correcao' then new.estado = 'rascunho'
      when 'aprovado_para_assinatura' then new.estado = 'assinado'
      when 'assinado' then new.estado = 'liberado' and new.referencia_assinatura = anterior.referencia_assinatura
      else false
    end;
    if new.estado <> 'rascunho' and new.conteudo is distinct from anterior.conteudo then
      raise exception 'O conteúdo do laudo só muda em rascunho' using errcode = '23514';
    end if;
  else
    permitida := anterior.estado = 'rascunho' and new.estado in ('rascunho', 'finalizada');
  end if;

  if permitida is not true then
    raise exception 'Transição de versão inválida' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger verificar_versao
before insert on piloto.versoes_documento
for each row execute function piloto_privado.validar_versao();

create function piloto_privado.rejeitar_reescrita()
returns trigger language plpgsql set search_path = ''
as $$
begin
  raise exception 'Histórico de somente acréscimo' using errcode = '55000';
end;
$$;
create trigger preservar_versoes
before update or delete on piloto.versoes_documento
for each row execute function piloto_privado.rejeitar_reescrita();
create trigger preservar_movimentos
before update or delete on piloto.movimentos_financeiros
for each row execute function piloto_privado.rejeitar_reescrita();
create trigger preservar_auditoria
before update or delete on piloto_privado.auditoria
for each row execute function piloto_privado.rejeitar_reescrita();

create function piloto_privado.registrar_mutacao()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  unidade uuid;
  registro uuid;
begin
  if tg_op = 'DELETE' then
    registro := old.id;
    if tg_table_name = 'unidades' then unidade := old.id; else unidade := old.unidade_id; end if;
  else
    registro := new.id;
    if tg_table_name = 'unidades' then unidade := new.id; else unidade := new.unidade_id; end if;
  end if;
  insert into piloto_privado.auditoria (unidade_id, entidade, registro_id, operacao, ator_id)
  values (unidade, tg_table_name, registro, tg_op, (select auth.uid()));
  return null;
end;
$$;

-- Instala a mesma proteção e trilha nas tabelas do modelo, incluindo os vínculos.
do $$
declare
  tabela regclass;
begin
  for tabela in
    select c.oid::regclass from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('piloto', 'piloto_privado') and c.relkind = 'r'
  loop
    execute format('alter table %s enable row level security', tabela);
    if tabela <> 'piloto_privado.auditoria'::regclass then
      execute format(
        'create trigger auditar_mutacao after insert or update or delete on %s for each row execute function piloto_privado.registrar_mutacao()',
        tabela
      );
    end if;
  end loop;
end;
$$;

create policy unidade_ler on piloto.unidades for select to authenticated
using (piloto_privado.tem_perfil(id, array['recepcao', 'medico', 'financeiro', 'gestao', 'administrador']));

create policy profissional_ler on piloto.profissionais for select to authenticated
using (piloto_privado.tem_perfil(unidade_id, array['recepcao', 'gestao', 'administrador'])
  or piloto_privado.e_profissional(unidade_id, id));

create policy agenda_ler on piloto.agendamentos for select to authenticated
using (piloto_privado.tem_perfil(unidade_id, array['recepcao', 'gestao', 'administrador'])
  or piloto_privado.e_profissional(unidade_id, profissional_id));

create policy atendimento_ler on piloto.atendimentos for select to authenticated
using (piloto_privado.tem_perfil(unidade_id, array['recepcao', 'financeiro', 'gestao', 'administrador'])
  or piloto_privado.e_profissional(unidade_id, profissional_id));

create policy paciente_ler on piloto.pacientes for select to authenticated
using (piloto_privado.tem_perfil(unidade_id, array['recepcao'])
  or (
    piloto_privado.tem_perfil(unidade_id, array['medico'])
    and (
      exists (
        select 1 from piloto.atendimentos a where a.unidade_id = pacientes.unidade_id
          and a.paciente_id = pacientes.id and piloto_privado.e_profissional(a.unidade_id, a.profissional_id)
      )
      or exists (
        select 1 from piloto.agendamentos a where a.unidade_id = pacientes.unidade_id
          and a.paciente_id = pacientes.id and a.estado <> 'cancelado'
          and piloto_privado.e_profissional(a.unidade_id, a.profissional_id)
      )
    )
  ));

create policy convenio_ler on piloto.convenios for select to authenticated
using (piloto_privado.tem_perfil(unidade_id, array['recepcao', 'financeiro', 'gestao', 'administrador']));
create policy procedimento_ler on piloto.procedimentos for select to authenticated
using (piloto_privado.tem_perfil(unidade_id, array['recepcao', 'medico', 'financeiro', 'gestao', 'administrador']));
create policy preco_ler on piloto.precos_procedimento for select to authenticated
using (piloto_privado.tem_perfil(unidade_id, array['recepcao', 'financeiro', 'gestao', 'administrador']));

create policy item_ler on piloto.itens_atendimento for select to authenticated
using (piloto_privado.tem_perfil(unidade_id, array['recepcao', 'financeiro', 'gestao', 'administrador']));

create policy documento_ler on piloto.documentos_clinicos for select to authenticated
using (piloto_privado.e_profissional(unidade_id, autor_profissional_id));

create policy versao_ler on piloto.versoes_documento for select to authenticated
using (exists (
  select 1 from piloto.documentos_clinicos d
  where d.unidade_id = versoes_documento.unidade_id and d.id = versoes_documento.documento_id
));

create policy movimento_ler on piloto.movimentos_financeiros for select to authenticated
using (piloto_privado.tem_perfil(unidade_id, array['financeiro', 'gestao', 'administrador']));

create view piloto.saldos_atendimento with (security_invoker = true) as
select a.unidade_id, a.id as atendimento_id,
  coalesce(i.cobrado, 0) as cobrado_centavos,
  coalesce(m.recebido, 0) - coalesce(m.estornado, 0) as recebido_liquido_centavos,
  coalesce(i.cobrado, 0) - coalesce(m.recebido, 0) + coalesce(m.estornado, 0) as saldo_centavos
from piloto.atendimentos a
left join lateral (
  select sum(cobrado_centavos) as cobrado from piloto.itens_atendimento
  where unidade_id = a.unidade_id and atendimento_id = a.id
) i on true
left join lateral (
  select sum(valor_centavos) filter (where tipo = 'recebimento') as recebido,
    sum(valor_centavos) filter (where tipo = 'estorno') as estornado
  from piloto.movimentos_financeiros where unidade_id = a.unidade_id and atendimento_id = a.id
) m on true
where piloto_privado.tem_perfil(a.unidade_id, array['financeiro', 'gestao', 'administrador']);

revoke all on all tables in schema piloto, piloto_privado from public, anon, authenticated, service_role;
revoke all on all sequences in schema piloto, piloto_privado from public, anon, authenticated, service_role;
revoke all on all functions in schema piloto_privado from public, anon, authenticated, service_role;

grant usage on schema piloto, piloto_privado to authenticated;
grant execute on function piloto_privado.tem_perfil(uuid, text[]), piloto_privado.e_profissional(uuid, uuid) to authenticated;
grant select (unidade_id, id, nome, ativo) on piloto.profissionais to authenticated;
grant select on piloto.unidades, piloto.pacientes, piloto.convenios, piloto.procedimentos,
  piloto.precos_procedimento, piloto.agendamentos, piloto.atendimentos, piloto.itens_atendimento,
  piloto.documentos_clinicos, piloto.versoes_documento, piloto.movimentos_financeiros,
  piloto.saldos_atendimento to authenticated;

commit;
