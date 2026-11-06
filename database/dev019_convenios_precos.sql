-- DEV-019: migração incremental de convênios e preços.
-- Aplicar após dev018_catalogo.sql em ambiente isolado.
-- Falha de unicidade em nomes legados deve ser reconciliada manualmente, nunca renomeada silenciosamente.
begin;
set local search_path = pg_catalog, extensions;
alter table piloto.convenios
  add column if not exists revisao integer not null default 1;
do $dev019$ begin
  if not exists (select 1 from pg_constraint where conname = 'dev019_convenios_revisao_positiva'
    and conrelid = 'piloto.convenios'::regclass) then
    alter table piloto.convenios add constraint dev019_convenios_revisao_positiva check (revisao >= 1);
  end if;
end $dev019$;
create unique index if not exists dev019_convenios_nome_normalizado
  on piloto.convenios (unidade_id, lower(btrim(nome)));
alter table piloto.precos_procedimento
  add column if not exists revisao integer not null default 1;
do $dev019$ begin
  if not exists (select 1 from pg_constraint where conname = 'dev019_precos_revisao_positiva'
    and conrelid = 'piloto.precos_procedimento'::regclass) then
    alter table piloto.precos_procedimento add constraint dev019_precos_revisao_positiva check (revisao >= 1);
  end if;
end $dev019$;

alter table piloto.precos_procedimento
  add column ativo boolean not null default true,
  add column coparticipacao_centavos integer not null default 0
    check (coparticipacao_centavos between 0 and valor_centavos);

-- Vigências ativas continuam sem sobreposição. Preços inativados ficam no histórico.
do $dev019_exclusao$
declare anterior name;
begin
  select conname into strict anterior from pg_constraint
  where conrelid = 'piloto.precos_procedimento'::regclass and contype = 'x';
  execute format('alter table piloto.precos_procedimento drop constraint %I', anterior);
end
$dev019_exclusao$;
alter table piloto.precos_procedimento
  add constraint dev019_precos_vigencia_exclusiva exclude using gist
  (unidade_id with =, procedimento_id with =, convenio_id with =, vigencia with &&) where (ativo);

create function piloto_privado.listar_convenios_precos(unidade uuid, busca text, referencia date, pagina integer, correlacao uuid)
returns jsonb language sql volatile security definer set search_path = ''
as $$
  with escopo as materialized (
    select piloto_privado.tem_perfil(unidade, array['recepcao','financeiro','gestao','administrador']) as permitido,
      piloto_privado.tem_perfil(unidade, array['gestao','administrador']) as gestor
  ), trilha as (
    insert into piloto_privado.auditoria (unidade_id, entidade, operacao, ator_id, resultado, correlacao_id)
    select case when e.permitido then unidade end, 'precos_procedimento', 'SELECT', ator.id,
      case when e.permitido then 'permitido' else 'negado' end, coalesce(correlacao, gen_random_uuid())
    from escopo e cross join piloto_privado.ator_auditoria() ator(id)
    where ator.id is not null
  )
  select case when e.permitido then jsonb_build_object(
    'gestor', e.gestor,
    'convenios', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'nome', c.nome, 'ativo', c.ativo, 'revisao', c.revisao)
        order by c.nome, c.id)
      from piloto.convenios c where c.unidade_id = unidade and (c.ativo or e.gestor)
    ), '[]'::jsonb),
    'procedimentos', case when e.gestor then coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'descricao', p.descricao, 'codigo', p.codigo) order by p.descricao, p.id)
      from piloto.procedimentos p where p.unidade_id = unidade and p.ativo
    ), '[]'::jsonb) else '[]'::jsonb end,
    'precos', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.inicio desc, p.id)
      from (
        select x.id, x.convenio_id, x.procedimento_id, c.nome as convenio, p.descricao as procedimento,
          lower(x.vigencia) as inicio, upper(x.vigencia) as fim, x.valor_centavos, x.coparticipacao_centavos,
          x.ativo, c.ativo and p.ativo and x.ativo as disponivel, x.revisao
        from piloto.precos_procedimento x
        join piloto.convenios c on c.unidade_id = x.unidade_id and c.id = x.convenio_id
        join piloto.procedimentos p on p.unidade_id = x.unidade_id and p.id = x.procedimento_id
        where x.unidade_id = unidade and (e.gestor or (x.ativo and c.ativo and p.ativo))
          and (referencia is null or (x.ativo and c.ativo and p.ativo and x.vigencia @> referencia))
          and strpos(lower(concat_ws(' ', c.nome, p.descricao, p.codigo)), lower(left(coalesce(busca, ''), 80))) > 0
        order by lower(x.vigencia) desc, x.id limit 21 offset (greatest(0, coalesce(pagina, 0))::bigint * 20)
      ) p
    ), '[]'::jsonb)
  ) end from escopo e
$$;

-- O bloqueio usado pelo catálogo também serializa convênios e preços da unidade.
create function piloto_privado.salvar_convenio(
  unidade uuid, convenio uuid, revisao_esperada integer, nome_convenio text, ativo_convenio boolean, correlacao uuid
)
returns uuid language plpgsql volatile security definer set search_path = ''
as $$
declare salvo uuid;
begin
  perform piloto_privado.travar_catalogo(unidade);
  if nome_convenio is null or char_length(btrim(nome_convenio)) not between 2 and 120
    or ativo_convenio is null or (convenio is null) <> (revisao_esperada is null) then
    raise exception 'Convênio inválido' using errcode = '22023';
  end if;
  perform set_config('piloto.correlacao_id', coalesce(correlacao, gen_random_uuid())::text, true);

  if convenio is null then
    insert into piloto.convenios (unidade_id, nome, ativo)
    values (unidade, btrim(nome_convenio), ativo_convenio) returning id into salvo;
  else
    update piloto.convenios c set nome = btrim(nome_convenio), ativo = ativo_convenio, revisao = c.revisao + 1
    where c.unidade_id = unidade and c.id = convenio and c.revisao = revisao_esperada
    returning c.id into salvo;
    if not found then raise exception 'Convênio indisponível ou desatualizado' using errcode = '40001'; end if;
  end if;
  return salvo;
end
$$;

create function piloto_privado.cadastrar_preco(
  unidade uuid, convenio uuid, procedimento uuid, inicio date, fim date,
  valor integer, coparticipacao integer, correlacao uuid
)
returns uuid language plpgsql volatile security definer set search_path = ''
as $$
declare salvo uuid;
begin
  perform piloto_privado.travar_catalogo(unidade);
  if inicio is null or not isfinite(inicio) or inicio < date '0001-01-01'
    or (fim is not null and (not isfinite(fim) or fim <= inicio))
    or valor is null or valor < 0 or coparticipacao is null or coparticipacao not between 0 and valor
    or not exists (select 1 from piloto.convenios c where c.unidade_id = unidade and c.id = convenio and c.ativo)
    or not exists (select 1 from piloto.procedimentos p where p.unidade_id = unidade and p.id = procedimento and p.ativo) then
    raise exception 'Preço inválido ou cadastro inativo' using errcode = '22023';
  end if;
  perform set_config('piloto.correlacao_id', coalesce(correlacao, gen_random_uuid())::text, true);
  insert into piloto.precos_procedimento (unidade_id, convenio_id, procedimento_id, vigencia, valor_centavos, coparticipacao_centavos)
  values (unidade, convenio, procedimento, daterange(inicio, fim, '[)'), valor, coparticipacao)
  returning id into salvo;
  return salvo;
end
$$;

create function piloto_privado.revisar_preco(
  unidade uuid, preco uuid, revisao_esperada integer, fim date, ativo_preco boolean, correlacao uuid
)
returns uuid language plpgsql volatile security definer set search_path = ''
as $$
declare atual piloto.precos_procedimento%rowtype;
begin
  perform piloto_privado.travar_catalogo(unidade);
  select p.* into atual from piloto.precos_procedimento p
  where p.unidade_id = unidade and p.id = preco and p.revisao = revisao_esperada for update;
  if not found then raise exception 'Preço indisponível ou desatualizado' using errcode = '40001'; end if;
  if ativo_preco is null or (fim is not null and (not isfinite(fim) or fim <= lower(atual.vigencia)))
    or (ativo_preco and (
      not exists (select 1 from piloto.convenios c where c.unidade_id = unidade and c.id = atual.convenio_id and c.ativo)
      or not exists (select 1 from piloto.procedimentos p where p.unidade_id = unidade and p.id = atual.procedimento_id and p.ativo)
    )) then
    raise exception 'Vigência inválida ou cadastro inativo' using errcode = '22023';
  end if;
  perform set_config('piloto.correlacao_id', coalesce(correlacao, gen_random_uuid())::text, true);
  update piloto.precos_procedimento p set vigencia = daterange(lower(atual.vigencia), fim, '[)'),
    ativo = ativo_preco, revisao = p.revisao + 1 where p.unidade_id = unidade and p.id = atual.id;
  return atual.id;
end
$$;

create function public.piloto_listar_convenios_precos(unidade uuid, busca text, referencia date, pagina integer, correlacao uuid)
returns jsonb language sql volatile security invoker set search_path = ''
as $$ select piloto_privado.listar_convenios_precos(unidade, busca, referencia, pagina, correlacao) $$;

create function public.piloto_salvar_convenio(
  unidade uuid, convenio uuid, revisao_esperada integer, nome_convenio text, ativo_convenio boolean, correlacao uuid
)
returns uuid language sql volatile security invoker set search_path = ''
as $$ select piloto_privado.salvar_convenio(unidade, convenio, revisao_esperada, nome_convenio, ativo_convenio, correlacao) $$;

create function public.piloto_cadastrar_preco(
  unidade uuid, convenio uuid, procedimento uuid, inicio date, fim date, valor integer, coparticipacao integer, correlacao uuid
)
returns uuid language sql volatile security invoker set search_path = ''
as $$ select piloto_privado.cadastrar_preco(unidade, convenio, procedimento, inicio, fim, valor, coparticipacao, correlacao) $$;

create function public.piloto_revisar_preco(
  unidade uuid, preco uuid, revisao_esperada integer, fim date, ativo_preco boolean, correlacao uuid
)
returns uuid language sql volatile security invoker set search_path = ''
as $$ select piloto_privado.revisar_preco(unidade, preco, revisao_esperada, fim, ativo_preco, correlacao) $$;

revoke all on function
  piloto_privado.listar_convenios_precos(uuid,text,date,integer,uuid), public.piloto_listar_convenios_precos(uuid,text,date,integer,uuid),
  piloto_privado.salvar_convenio(uuid,uuid,integer,text,boolean,uuid), public.piloto_salvar_convenio(uuid,uuid,integer,text,boolean,uuid),
  piloto_privado.cadastrar_preco(uuid,uuid,uuid,date,date,integer,integer,uuid), public.piloto_cadastrar_preco(uuid,uuid,uuid,date,date,integer,integer,uuid),
  piloto_privado.revisar_preco(uuid,uuid,integer,date,boolean,uuid), public.piloto_revisar_preco(uuid,uuid,integer,date,boolean,uuid)
  from public, anon, authenticated, service_role;

grant execute on function
  piloto_privado.listar_convenios_precos(uuid,text,date,integer,uuid), public.piloto_listar_convenios_precos(uuid,text,date,integer,uuid),
  piloto_privado.salvar_convenio(uuid,uuid,integer,text,boolean,uuid), public.piloto_salvar_convenio(uuid,uuid,integer,text,boolean,uuid),
  piloto_privado.cadastrar_preco(uuid,uuid,uuid,date,date,integer,integer,uuid), public.piloto_cadastrar_preco(uuid,uuid,uuid,date,date,integer,integer,uuid),
  piloto_privado.revisar_preco(uuid,uuid,integer,date,boolean,uuid), public.piloto_revisar_preco(uuid,uuid,integer,date,boolean,uuid)
  to authenticated;

commit;
