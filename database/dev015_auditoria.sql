-- DEV-015. Aplicar após dev014_shell.sql em ambiente isolado.
begin;

alter table piloto_privado.auditoria
  alter column unidade_id drop not null,
  alter column registro_id drop not null,
  drop constraint auditoria_operacao_check,
  add column resultado text not null default 'permitido',
  add column correlacao_id uuid;

-- Eventos anteriores à DEV-015 mantêm correlação nula.
alter table piloto_privado.auditoria
  alter column correlacao_id set default pg_catalog.gen_random_uuid(),
  add constraint auditoria_escopo_check check (
    (operacao in ('INSERT', 'UPDATE', 'DELETE') and resultado = 'permitido'
      and unidade_id is not null and registro_id is not null)
    or
    (operacao = 'SELECT' and ator_id is not null and correlacao_id is not null
      and (resultado = 'permitido' or
        (resultado = 'negado' and unidade_id is null and registro_id is null)))
  );

create index auditoria_correlacao_idx on piloto_privado.auditoria (correlacao_id)
where correlacao_id is not null;

create trigger preservar_auditoria_truncate
before truncate on piloto_privado.auditoria
for each statement execute function piloto_privado.rejeitar_reescrita();

create function piloto_privado.ator_auditoria()
returns uuid language sql stable security invoker set search_path = ''
as $$
  select auth.uid()
  where coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'false'
$$;

create or replace function piloto_privado.registrar_mutacao()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  unidade uuid;
  registro uuid;
  correlacao uuid;
begin
  if tg_op = 'DELETE' then
    registro := old.id;
    if tg_table_name = 'unidades' then unidade := old.id; else unidade := old.unidade_id; end if;
  else
    registro := new.id;
    if tg_table_name = 'unidades' then unidade := new.id; else unidade := new.unidade_id; end if;
  end if;
  correlacao := coalesce(
    nullif(pg_catalog.current_setting('piloto.correlacao_id', true), '')::uuid,
    pg_catalog.gen_random_uuid()
  );
  insert into piloto_privado.auditoria (unidade_id, entidade, registro_id, operacao, ator_id, correlacao_id)
  values (unidade, tg_table_name, registro, tg_op, piloto_privado.ator_auditoria(), correlacao);
  return null;
end;
$$;

-- Cada consulta registra seu resultado na mesma instrução que entrega os dados.
-- As funções privadas revalidam o escopo; só elas escrevem na trilha.
create function piloto_privado.consultar_perfis_auditado(unidade uuid, correlacao uuid)
returns table (perfil text)
language sql volatile security definer set search_path = ''
as $$
  with perfis as materialized (
    select p.perfil from piloto_privado.perfis_ativos(unidade) p
  ), escopo as (
    select exists (select 1 from perfis) as permitido
  ), trilha as (
    insert into piloto_privado.auditoria
      (unidade_id, entidade, registro_id, operacao, ator_id, resultado, correlacao_id)
    select case when e.permitido then unidade end, 'acesso_unidade',
      case when e.permitido then unidade end, 'SELECT', ator.id,
      case when e.permitido then 'permitido' else 'negado' end,
      coalesce(correlacao, pg_catalog.gen_random_uuid())
    from escopo e cross join piloto_privado.ator_auditoria() as ator(id)
    where ator.id is not null
  )
  select p.perfil from perfis p order by p.perfil
$$;

create function piloto_privado.consultar_unidades_auditado(correlacao uuid)
returns table (id uuid, nome text, perfis text[])
language sql volatile security definer set search_path = ''
as $$
  with unidades as materialized (
    select u.id, u.nome, pg_catalog.array_agg(p.perfil order by p.perfil) as perfis
    from piloto.unidades u
    cross join lateral piloto_privado.perfis_ativos(u.id) p
    group by u.id, u.nome
  ), trilha as (
    insert into piloto_privado.auditoria
      (entidade, operacao, ator_id, resultado, correlacao_id)
    select 'painel_unidades', 'SELECT', ator.id,
      case when exists (select 1 from unidades) then 'permitido' else 'negado' end,
      coalesce(correlacao, pg_catalog.gen_random_uuid())
    from piloto_privado.ator_auditoria() as ator(id)
    where ator.id is not null
  )
  select u.id, u.nome, u.perfis from unidades u order by u.nome, u.id
$$;

drop function piloto_privado.itens_clinicos(uuid, uuid);
create function piloto_privado.itens_clinicos(unidade uuid, atendimento uuid, correlacao uuid default null)
returns table (id uuid, procedimento_id uuid, quantidade integer)
language sql volatile security definer set search_path = ''
as $$
  with escopo as materialized (
    select a.unidade_id, a.id
    from piloto.atendimentos a
    where a.unidade_id = unidade and a.id = atendimento
      and piloto_privado.e_profissional(a.unidade_id, a.profissional_id)
  ), trilha as (
    insert into piloto_privado.auditoria
      (unidade_id, entidade, registro_id, operacao, ator_id, resultado, correlacao_id)
    select e.unidade_id, 'itens_clinicos', e.id, 'SELECT', ator.id,
      case when e.id is not null then 'permitido' else 'negado' end,
      coalesce(correlacao, pg_catalog.gen_random_uuid())
    from piloto_privado.ator_auditoria() as ator(id)
    left join escopo e on true
    where ator.id is not null
  )
  select i.id, i.procedimento_id, i.quantidade
  from escopo e
  join piloto.itens_atendimento i on i.unidade_id = e.unidade_id and i.atendimento_id = e.id
$$;

-- Ponto de leitura para o futuro handler de prontuário. Apenas o médico
-- responsável recebe a versão atual. O conteúdo vai para a resposta autorizada.
create function piloto_privado.documento_atual_auditado(unidade uuid, documento uuid, correlacao uuid default null)
returns table (id uuid, atendimento_id uuid, item_id uuid, tipo text, versao integer, estado text, conteudo jsonb)
language sql volatile security definer set search_path = ''
as $$
  with leitura as materialized (
    select d.id, d.unidade_id, d.atendimento_id, d.item_id, d.tipo,
      v.versao, v.estado, v.conteudo
    from piloto.documentos_clinicos d
    cross join lateral (
      select v.versao, v.estado, v.conteudo
      from piloto.versoes_documento v
      where v.unidade_id = d.unidade_id and v.documento_id = d.id
      order by v.versao desc limit 1
    ) v
    where d.unidade_id = unidade and d.id = documento
      and piloto_privado.e_profissional(d.unidade_id, d.autor_profissional_id)
  ), trilha as (
    insert into piloto_privado.auditoria
      (unidade_id, entidade, registro_id, operacao, ator_id, resultado, correlacao_id)
    select l.unidade_id, 'documentos_clinicos', l.id, 'SELECT', ator.id,
      case when l.id is not null then 'permitido' else 'negado' end,
      coalesce(correlacao, pg_catalog.gen_random_uuid())
    from piloto_privado.ator_auditoria() as ator(id)
    left join leitura l on true
    where ator.id is not null
  )
  select l.id, l.atendimento_id, l.item_id, l.tipo, l.versao, l.estado, l.conteudo
  from leitura l
$$;

drop function public.piloto_meus_perfis(uuid);
create function public.piloto_meus_perfis(unidade uuid, correlacao uuid default null)
returns table (perfil text)
language sql volatile security invoker set search_path = ''
as $$
  select p.perfil from piloto_privado.consultar_perfis_auditado(unidade, correlacao) p
$$;

drop function public.piloto_minhas_unidades();
create function public.piloto_minhas_unidades(correlacao uuid default null)
returns table (id uuid, nome text, perfis text[])
language sql volatile security invoker set search_path = ''
as $$
  select u.id, u.nome, u.perfis from piloto_privado.consultar_unidades_auditado(correlacao) u
$$;

revoke all on function piloto_privado.ator_auditoria(),
  piloto_privado.consultar_perfis_auditado(uuid, uuid),
  piloto_privado.consultar_unidades_auditado(uuid),
  piloto_privado.itens_clinicos(uuid, uuid, uuid),
  piloto_privado.documento_atual_auditado(uuid, uuid, uuid),
  public.piloto_meus_perfis(uuid, uuid), public.piloto_minhas_unidades(uuid)
  from public, anon, authenticated, service_role;

grant execute on function piloto_privado.consultar_perfis_auditado(uuid, uuid),
  piloto_privado.consultar_unidades_auditado(uuid), piloto_privado.itens_clinicos(uuid, uuid, uuid),
  piloto_privado.documento_atual_auditado(uuid, uuid, uuid),
  public.piloto_meus_perfis(uuid, uuid), public.piloto_minhas_unidades(uuid)
  to authenticated;

commit;
