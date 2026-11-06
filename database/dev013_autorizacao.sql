-- DEV-013. Aplicar após dev009_modelo.sql em PostgreSQL/Supabase isolado.
begin;

-- Vínculos ficam privados. O chamador pode consultar somente os próprios perfis
-- ativos de uma unidade ativa, sempre com identidade e AAL vindos do JWT.
create function piloto_privado.perfis_ativos(unidade uuid)
returns table (perfil text)
language sql stable security definer set search_path = ''
as $$
  select v.perfil
  from piloto_privado.vinculos v
  join piloto.unidades u on u.id = v.unidade_id and u.ativa
  where v.unidade_id = unidade and v.usuario_id = (select auth.uid())
    and v.ativo and (select auth.jwt()) ->> 'aal' = 'aal2'
    and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') = 'false'
$$;

-- As políticas DEV-009 já usam este auxiliar, inclusive a atribuição médica.
create or replace function piloto_privado.tem_perfil(unidade uuid, perfis text[])
returns boolean language sql stable security invoker set search_path = ''
as $$
  select exists (
    select 1 from piloto_privado.perfis_ativos(unidade) p
    where p.perfil = any(perfis)
  )
$$;

-- A única função desta etapa exposta na Data API devolve somente perfis do titular.
create function public.piloto_meus_perfis(unidade uuid)
returns table (perfil text)
language sql stable security invoker set search_path = ''
as $$
  select p.perfil from piloto_privado.perfis_ativos(unidade) p order by p.perfil
$$;

-- Projeção clínica para uso futuro no servidor. A tabela com valores continua
-- sob a política operacional. Escopo e projeção são aplicados na mesma consulta.
create function piloto_privado.itens_clinicos(unidade uuid, atendimento uuid)
returns table (id uuid, procedimento_id uuid, quantidade integer)
language sql stable security definer set search_path = ''
as $$
  select i.id, i.procedimento_id, i.quantidade
  from piloto.atendimentos a
  join piloto.itens_atendimento i on i.unidade_id = a.unidade_id and i.atendimento_id = a.id
  where a.unidade_id = unidade and a.id = atendimento
    and piloto_privado.e_profissional(a.unidade_id, a.profissional_id)
$$;

revoke all on function piloto_privado.perfis_ativos(uuid),
  piloto_privado.itens_clinicos(uuid, uuid), public.piloto_meus_perfis(uuid)
  from public, anon, authenticated, service_role;
grant execute on function piloto_privado.perfis_ativos(uuid),
  piloto_privado.itens_clinicos(uuid, uuid), public.piloto_meus_perfis(uuid)
  to authenticated;

commit;
