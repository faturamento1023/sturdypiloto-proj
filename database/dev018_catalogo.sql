-- DEV-018. Aplicar após dev017_usuarios.sql em ambiente isolado.
begin;

create table piloto.grupos_procedimentos (
  unidade_id uuid not null references piloto.unidades(id),
  id uuid not null default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 2 and 100),
  ativo boolean not null default true,
  revisao integer not null default 0 check (revisao >= 0),
  primary key (unidade_id, id)
);
create unique index grupos_procedimentos_nome_idx on piloto.grupos_procedimentos (unidade_id, lower(nome));
alter table piloto.grupos_procedimentos enable row level security;
revoke all on table piloto.grupos_procedimentos from public, anon, authenticated, service_role;
create trigger auditar_mutacao after insert or update or delete on piloto.grupos_procedimentos
for each row execute function piloto_privado.registrar_mutacao();

alter table piloto.procedimentos
  add column grupo_id uuid,
  add column codigo_tuss text check (codigo_tuss ~ '^[0-9]{8}$'),
  add column tipo text not null default 'procedimento' check (tipo in ('consulta','exame','procedimento')),
  add column preparo text not null default '' check (char_length(preparo) <= 2000),
  add column exige_consentimento boolean not null default false,
  add column revisao integer not null default 0 check (revisao >= 0),
  add foreign key (unidade_id, grupo_id) references piloto.grupos_procedimentos(unidade_id, id);
create index procedimentos_grupo_idx on piloto.procedimentos (unidade_id, grupo_id) where grupo_id is not null;

create function piloto_privado.travar_catalogo(unidade uuid)
returns void language plpgsql volatile security invoker set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('piloto-catalogo-' || unidade::text, 0));
  perform v.id from piloto_privado.vinculos v
  join piloto.unidades u on u.id = v.unidade_id and u.ativa
  where v.unidade_id = unidade and v.usuario_id = piloto_privado.ator_auditoria()
    and v.ativo and v.perfil in ('gestao','administrador')
    and (select auth.jwt()) ->> 'aal' = 'aal2'
  for share of v, u;
  if not found then raise exception 'Acesso negado' using errcode = '42501'; end if;
end
$$;

create function piloto_privado.listar_catalogo(unidade uuid, busca text, pagina integer, correlacao uuid)
returns jsonb language sql volatile security definer set search_path = ''
as $$
  with escopo as materialized (
    select piloto_privado.tem_perfil(unidade, array['recepcao','medico','financeiro','gestao','administrador']) as permitido,
      piloto_privado.tem_perfil(unidade, array['gestao','administrador']) as gestor
  ), trilha as (
    insert into piloto_privado.auditoria (unidade_id, entidade, operacao, ator_id, resultado, correlacao_id)
    select case when e.permitido then unidade end, 'procedimentos', 'SELECT', ator.id,
      case when e.permitido then 'permitido' else 'negado' end, coalesce(correlacao, gen_random_uuid())
    from escopo e cross join piloto_privado.ator_auditoria() ator(id)
    where ator.id is not null
  )
  select case when e.permitido then jsonb_build_object(
    'gestor', e.gestor,
    'grupos', coalesce((
      select jsonb_agg(jsonb_build_object('id', g.id, 'nome', g.nome, 'ativo', g.ativo, 'revisao', g.revisao)
        order by g.nome, g.id)
      from piloto.grupos_procedimentos g where g.unidade_id = unidade and (g.ativo or e.gestor)
    ), '[]'::jsonb),
    'procedimentos', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.descricao, p.id)
      from (
        select x.id, x.codigo, x.descricao, x.codigo_tuss, x.grupo_id, x.tipo, x.preparo,
          x.exige_consentimento, x.ativo, x.revisao
        from piloto.procedimentos x
        where x.unidade_id = unidade and (x.ativo or e.gestor)
          and strpos(lower(concat_ws(' ', x.descricao, x.codigo, x.codigo_tuss)), lower(left(coalesce(busca, ''), 80))) > 0
        order by x.descricao, x.id limit 21 offset (greatest(0, coalesce(pagina, 0))::bigint * 20)
      ) p
    ), '[]'::jsonb)
  ) end from escopo e
$$;

create function piloto_privado.salvar_grupo_procedimento(
  unidade uuid, grupo uuid, revisao_esperada integer, nome_grupo text, ativo_grupo boolean, correlacao uuid
)
returns uuid language plpgsql volatile security definer set search_path = ''
as $$
declare salvo uuid;
begin
  perform piloto_privado.travar_catalogo(unidade);
  if nome_grupo is null or ativo_grupo is null or (grupo is null) <> (revisao_esperada is null) then
    raise exception 'Grupo inválido' using errcode = '22023';
  end if;
  perform set_config('piloto.correlacao_id', coalesce(correlacao, gen_random_uuid())::text, true);

  if grupo is null then
    insert into piloto.grupos_procedimentos (unidade_id, nome, ativo)
    values (unidade, btrim(nome_grupo), ativo_grupo) returning id into salvo;
  else
    update piloto.grupos_procedimentos g set nome = btrim(nome_grupo), ativo = ativo_grupo, revisao = g.revisao + 1
    where g.unidade_id = unidade and g.id = grupo and g.revisao = revisao_esperada
    returning g.id into salvo;
    if not found then raise exception 'Grupo indisponível ou desatualizado' using errcode = '40001'; end if;
    if not ativo_grupo and exists (select 1 from piloto.procedimentos p
      where p.unidade_id = unidade and p.grupo_id = grupo and p.ativo) then
      raise exception 'Grupo com procedimentos ativos' using errcode = 'P0001';
    end if;
  end if;
  return salvo;
end
$$;

create function piloto_privado.salvar_procedimento(
  unidade uuid, procedimento uuid, revisao_esperada integer, grupo uuid, codigo_interno text,
  nome_procedimento text, tuss text, tipo_procedimento text, instrucoes text, consentimento boolean,
  ativo_procedimento boolean, correlacao uuid
)
returns uuid language plpgsql volatile security definer set search_path = ''
as $$
declare salvo uuid;
begin
  perform piloto_privado.travar_catalogo(unidade);
  if codigo_interno is null or char_length(btrim(codigo_interno)) not between 1 and 40
    or nome_procedimento is null or char_length(btrim(nome_procedimento)) not between 2 and 160
    or tipo_procedimento is null or consentimento is null or ativo_procedimento is null
    or (procedimento is null) <> (revisao_esperada is null) then
    raise exception 'Procedimento inválido' using errcode = '22023';
  end if;
  if grupo is not null and not exists (select 1 from piloto.grupos_procedimentos g
    where g.unidade_id = unidade and g.id = grupo and (g.ativo or not ativo_procedimento)) then
    raise exception 'Grupo indisponível' using errcode = '22023';
  end if;
  perform set_config('piloto.correlacao_id', coalesce(correlacao, gen_random_uuid())::text, true);

  if procedimento is null then
    insert into piloto.procedimentos (unidade_id, grupo_id, codigo, descricao, codigo_tuss, tipo, preparo, exige_consentimento, ativo)
    values (unidade, grupo, btrim(codigo_interno), btrim(nome_procedimento), nullif(btrim(tuss), ''),
      tipo_procedimento, coalesce(btrim(instrucoes), ''), consentimento, ativo_procedimento)
    returning id into salvo;
  else
    update piloto.procedimentos p set grupo_id = grupo, codigo = btrim(codigo_interno), descricao = btrim(nome_procedimento),
      codigo_tuss = nullif(btrim(tuss), ''), tipo = tipo_procedimento, preparo = coalesce(btrim(instrucoes), ''),
      exige_consentimento = consentimento, ativo = ativo_procedimento, revisao = p.revisao + 1
    where p.unidade_id = unidade and p.id = procedimento and p.revisao = revisao_esperada
    returning p.id into salvo;
    if not found then raise exception 'Procedimento indisponível ou desatualizado' using errcode = '40001'; end if;
  end if;
  return salvo;
end
$$;

create function public.piloto_listar_catalogo(unidade uuid, busca text, pagina integer, correlacao uuid)
returns jsonb language sql volatile security invoker set search_path = ''
as $$ select piloto_privado.listar_catalogo(unidade, busca, pagina, correlacao) $$;

create function public.piloto_salvar_grupo_procedimento(
  unidade uuid, grupo uuid, revisao_esperada integer, nome_grupo text, ativo_grupo boolean, correlacao uuid
)
returns uuid language sql volatile security invoker set search_path = ''
as $$ select piloto_privado.salvar_grupo_procedimento(unidade, grupo, revisao_esperada, nome_grupo, ativo_grupo, correlacao) $$;

create function public.piloto_salvar_procedimento(
  unidade uuid, procedimento uuid, revisao_esperada integer, grupo uuid, codigo_interno text,
  nome_procedimento text, tuss text, tipo_procedimento text, instrucoes text, consentimento boolean,
  ativo_procedimento boolean, correlacao uuid
)
returns uuid language sql volatile security invoker set search_path = ''
as $$ select piloto_privado.salvar_procedimento(unidade, procedimento, revisao_esperada, grupo, codigo_interno,
  nome_procedimento, tuss, tipo_procedimento, instrucoes, consentimento, ativo_procedimento, correlacao) $$;

revoke all on function piloto_privado.travar_catalogo(uuid),
  piloto_privado.listar_catalogo(uuid, text, integer, uuid), public.piloto_listar_catalogo(uuid, text, integer, uuid),
  piloto_privado.salvar_grupo_procedimento(uuid, uuid, integer, text, boolean, uuid),
  public.piloto_salvar_grupo_procedimento(uuid, uuid, integer, text, boolean, uuid),
  piloto_privado.salvar_procedimento(uuid, uuid, integer, uuid, text, text, text, text, text, boolean, boolean, uuid),
  public.piloto_salvar_procedimento(uuid, uuid, integer, uuid, text, text, text, text, text, boolean, boolean, uuid)
  from public, anon, authenticated, service_role;

grant execute on function
  piloto_privado.listar_catalogo(uuid, text, integer, uuid), public.piloto_listar_catalogo(uuid, text, integer, uuid),
  piloto_privado.salvar_grupo_procedimento(uuid, uuid, integer, text, boolean, uuid),
  public.piloto_salvar_grupo_procedimento(uuid, uuid, integer, text, boolean, uuid),
  piloto_privado.salvar_procedimento(uuid, uuid, integer, uuid, text, text, text, text, text, boolean, boolean, uuid),
  public.piloto_salvar_procedimento(uuid, uuid, integer, uuid, text, text, text, text, text, boolean, boolean, uuid)
  to authenticated;

commit;
