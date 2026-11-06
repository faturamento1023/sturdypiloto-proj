-- DEV-020. Aplicar após dev019_convenios_precos.sql em ambiente isolado.
begin;

create function piloto_privado.validar_profissional_ativo()
returns trigger language plpgsql set search_path = ''
as $$
declare ativo boolean;
begin
  select p.ativo into ativo from piloto.profissionais p
  where p.unidade_id = new.unidade_id and p.id = new.profissional_id
  for share;
  if ativo is false then raise exception 'Profissional indisponível na unidade' using errcode = '23514'; end if;
  return new;
end
$$;

create trigger agenda_profissional_ativo_insercao
before insert on piloto.agendamentos
for each row when (new.estado <> 'cancelado')
execute function piloto_privado.validar_profissional_ativo();

create trigger agenda_profissional_ativo_alteracao
before update of unidade_id, profissional_id, inicio, fim, estado on piloto.agendamentos
for each row when (
  (old.unidade_id, old.profissional_id) is distinct from (new.unidade_id, new.profissional_id)
  or (new.estado in ('reservado', 'confirmado', 'remarcado')
    and (old.inicio, old.fim, old.estado) is distinct from (new.inicio, new.fim, new.estado))
)
execute function piloto_privado.validar_profissional_ativo();

create trigger atendimento_profissional_ativo_insercao
before insert on piloto.atendimentos
for each row execute function piloto_privado.validar_profissional_ativo();

create trigger atendimento_profissional_ativo_alteracao
before update of unidade_id, profissional_id on piloto.atendimentos
for each row when ((old.unidade_id, old.profissional_id) is distinct from (new.unidade_id, new.profissional_id))
execute function piloto_privado.validar_profissional_ativo();

create function piloto_privado.validar_procedimento_ativo()
returns trigger language plpgsql set search_path = ''
as $$
declare ativo boolean;
begin
  select p.ativo into ativo from piloto.procedimentos p
  where p.unidade_id = new.unidade_id and p.id = new.procedimento_id
  for share;
  if ativo is false then raise exception 'Procedimento indisponível na unidade' using errcode = '23514'; end if;
  return new;
end
$$;

create trigger item_procedimento_ativo_insercao
before insert on piloto.itens_atendimento
for each row execute function piloto_privado.validar_procedimento_ativo();

create trigger item_procedimento_ativo_alteracao
before update of unidade_id, procedimento_id on piloto.itens_atendimento
for each row when ((old.unidade_id, old.procedimento_id) is distinct from (new.unidade_id, new.procedimento_id))
execute function piloto_privado.validar_procedimento_ativo();

create view piloto.impacto_cadastros_itens with (security_invoker = true) as
select
  i.unidade_id, i.id as item_id, i.atendimento_id, i.procedimento_id, a.aberto_em,
  p.codigo as procedimento_codigo_atual, p.descricao as procedimento_descricao_atual,
  p.ativo as procedimento_ativo_atual, m.nome as profissional_nome_atual,
  m.ativo as profissional_ativo_atual, i.quantidade,
  i.valor_unitario_centavos as valor_historico_centavos,
  i.cobrado_centavos as cobrado_historico_centavos
from piloto.itens_atendimento i
join piloto.atendimentos a on a.unidade_id = i.unidade_id and a.id = i.atendimento_id
join piloto.procedimentos p on p.unidade_id = i.unidade_id and p.id = i.procedimento_id
join piloto.profissionais m on m.unidade_id = a.unidade_id and m.id = a.profissional_id;

-- A visão mantém o preço gravado no item e usa os cadastros só para rótulos e situação atuais.
revoke all on piloto.impacto_cadastros_itens from public, anon, authenticated, service_role;

create function piloto_privado.listar_historico_itens(unidade uuid, busca text, pagina integer, correlacao uuid)
returns jsonb language sql volatile security definer set search_path = ''
as $$
  with escopo as materialized (
    select piloto_privado.tem_perfil(unidade, array['recepcao','financeiro','gestao','administrador']) as permitido,
      piloto_privado.tem_perfil(unidade, array['recepcao','gestao','administrador']) as ve_profissional
  ), trilha as (
    insert into piloto_privado.auditoria (unidade_id, entidade, operacao, ator_id, resultado, correlacao_id)
    select case when e.permitido then unidade end, 'itens_atendimento', 'SELECT', ator.id,
      case when e.permitido then 'permitido' else 'negado' end, coalesce(correlacao, gen_random_uuid())
    from escopo e cross join piloto_privado.ator_auditoria() ator(id)
    where ator.id is not null
  )
  select case when e.permitido then coalesce((
    select jsonb_agg(to_jsonb(h) order by h.aberto_em desc, h.item_id)
    from (
      select i.item_id, i.aberto_em, i.procedimento_codigo_atual, i.procedimento_descricao_atual,
        i.procedimento_ativo_atual,
        case when e.ve_profissional then i.profissional_nome_atual end as profissional_nome_atual,
        case when e.ve_profissional then i.profissional_ativo_atual end as profissional_ativo_atual, i.quantidade,
        i.valor_historico_centavos, i.cobrado_historico_centavos::text as cobrado_historico_centavos
      from piloto.impacto_cadastros_itens i
      where i.unidade_id = unidade and strpos(lower(concat_ws(' ', i.procedimento_codigo_atual,
        i.procedimento_descricao_atual, case when e.ve_profissional then i.profissional_nome_atual end)), lower(left(coalesce(busca, ''), 80))) > 0
      order by i.aberto_em desc, i.item_id limit 21 offset (greatest(0, coalesce(pagina, 0))::bigint * 20)
    ) h
  ), '[]'::jsonb) end from escopo e
$$;

create function public.piloto_listar_historico_itens(unidade uuid, busca text, pagina integer, correlacao uuid)
returns jsonb language sql volatile security invoker set search_path = ''
as $$ select piloto_privado.listar_historico_itens(unidade, busca, pagina, correlacao) $$;

revoke all on function piloto_privado.validar_profissional_ativo(),
  piloto_privado.validar_procedimento_ativo(),
  piloto_privado.listar_historico_itens(uuid,text,integer,uuid),
  public.piloto_listar_historico_itens(uuid,text,integer,uuid)
  from public, anon, authenticated, service_role;
grant execute on function piloto_privado.listar_historico_itens(uuid,text,integer,uuid),
  public.piloto_listar_historico_itens(uuid,text,integer,uuid) to authenticated;

commit;
