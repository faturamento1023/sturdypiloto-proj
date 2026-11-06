-- DEV-016. Aplicar após dev015_auditoria.sql em ambiente isolado.
begin;

alter table piloto.profissionais
  add column crm text,
  add column crm_uf text,
  add column especialidade text not null default '',
  add column titulo text not null default '',
  add column revisao integer not null default 0,
  add constraint profissionais_crm_check check (
    (crm is null and crm_uf is null) or
    (crm is not null and crm_uf is not null and crm ~ '^[0-9]{1,10}$' and crm ~ '[1-9]'
      and crm_uf in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
        'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'))
  ),
  add constraint profissionais_dados_check check (
    char_length(especialidade) <= 120 and char_length(titulo) <= 120 and revisao >= 0
  );

-- Zeros à esquerda são preservados na exibição e ignorados para detectar duplicidade.
create unique index profissionais_crm_unidade_idx
on piloto.profissionais (unidade_id, crm_uf, ltrim(crm, '0')) where crm is not null;

create function piloto_privado.listar_medicos(unidade uuid, busca text, pagina integer, correlacao uuid)
returns table (id uuid, nome text, crm text, crm_uf text, especialidade text, titulo text, ativo boolean, revisao integer)
language sql volatile security definer set search_path = ''
as $$
  with escopo as materialized (
    select piloto_privado.tem_perfil(unidade, array['gestao', 'administrador']) as permitido
  ), trilha as (
    insert into piloto_privado.auditoria (unidade_id, entidade, operacao, ator_id, resultado, correlacao_id)
    select case when e.permitido then unidade end, 'profissionais', 'SELECT', ator.id,
      case when e.permitido then 'permitido' else 'negado' end, coalesce(correlacao, gen_random_uuid())
    from escopo e cross join piloto_privado.ator_auditoria() ator(id)
    where ator.id is not null
  )
  select p.id, p.nome, p.crm, p.crm_uf, p.especialidade, p.titulo, p.ativo, p.revisao
  from piloto.profissionais p cross join escopo e
  where e.permitido and p.unidade_id = unidade and (
    strpos(lower(p.nome), lower(left(coalesce(busca, ''), 80))) > 0
    or strpos(coalesce(p.crm, ''), left(coalesce(busca, ''), 80)) > 0
    or strpos(lower(p.especialidade), lower(left(coalesce(busca, ''), 80))) > 0
  )
  order by p.nome, p.id limit 21 offset (greatest(0, coalesce(pagina, 0))::bigint * 20)
$$;

create function piloto_privado.salvar_medico(
  unidade uuid, profissional uuid, revisao_esperada integer, nome_medico text,
  numero_crm text, uf_crm text, area text, titulo_medico text, ativo_medico boolean, correlacao uuid
)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  salvo uuid;
begin
  -- Mantém unidade e vínculo autorizador ativos até o fim da transação.
  perform v.id
  from piloto_privado.vinculos v
  join piloto.unidades u on u.id = v.unidade_id and u.ativa
  where v.unidade_id = unidade and v.usuario_id = piloto_privado.ator_auditoria()
    and v.ativo and v.perfil in ('gestao', 'administrador')
    and (select auth.jwt()) ->> 'aal' = 'aal2'
  for share of v, u;
  if not found then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  if nome_medico is null or char_length(btrim(nome_medico)) not between 3 and 160
    or ativo_medico is null or (numero_crm is null) <> (uf_crm is null)
    or (profissional is null and numero_crm is null)
    or (profissional is null) <> (revisao_esperada is null) then
    raise exception 'Cadastro inválido' using errcode = '22023';
  end if;
  perform set_config('piloto.correlacao_id', coalesce(correlacao, gen_random_uuid())::text, true);

  if profissional is null then
    insert into piloto.profissionais (unidade_id, nome, crm, crm_uf, especialidade, titulo, ativo)
    values (unidade, btrim(nome_medico), numero_crm, uf_crm, coalesce(btrim(area), ''),
      coalesce(btrim(titulo_medico), ''), ativo_medico)
    returning id into salvo;
  else
    update piloto.profissionais p set nome = btrim(nome_medico), crm = numero_crm, crm_uf = uf_crm,
      especialidade = coalesce(btrim(area), ''), titulo = coalesce(btrim(titulo_medico), ''),
      ativo = ativo_medico, revisao = p.revisao + 1
    where p.unidade_id = unidade and p.id = profissional and p.revisao = revisao_esperada
      and (numero_crm is not null or p.crm is null)
    returning p.id into salvo;
    if not found then
      raise exception 'Registro indisponível ou desatualizado' using errcode = '40001';
    end if;
  end if;
  return salvo;
end;
$$;

create function public.piloto_listar_medicos(unidade uuid, busca text, pagina integer, correlacao uuid)
returns table (id uuid, nome text, crm text, crm_uf text, especialidade text, titulo text, ativo boolean, revisao integer)
language sql volatile security invoker set search_path = ''
as $$
  select * from piloto_privado.listar_medicos(unidade, busca, pagina, correlacao)
$$;

create function public.piloto_salvar_medico(
  unidade uuid, profissional uuid, revisao_esperada integer, nome_medico text,
  numero_crm text, uf_crm text, area text, titulo_medico text, ativo_medico boolean, correlacao uuid
)
returns uuid
language sql volatile security invoker set search_path = ''
as $$
  select piloto_privado.salvar_medico(unidade, profissional, revisao_esperada, nome_medico,
    numero_crm, uf_crm, area, titulo_medico, ativo_medico, correlacao)
$$;

revoke all on function piloto_privado.listar_medicos(uuid, text, integer, uuid),
  piloto_privado.salvar_medico(uuid, uuid, integer, text, text, text, text, text, boolean, uuid),
  public.piloto_listar_medicos(uuid, text, integer, uuid),
  public.piloto_salvar_medico(uuid, uuid, integer, text, text, text, text, text, boolean, uuid)
  from public, anon, authenticated, service_role;

grant execute on function piloto_privado.listar_medicos(uuid, text, integer, uuid),
  piloto_privado.salvar_medico(uuid, uuid, integer, text, text, text, text, text, boolean, uuid),
  public.piloto_listar_medicos(uuid, text, integer, uuid),
  public.piloto_salvar_medico(uuid, uuid, integer, text, text, text, text, text, boolean, uuid)
  to authenticated;

commit;
