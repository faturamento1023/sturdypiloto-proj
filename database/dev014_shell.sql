-- DEV-014. Aplicar após dev013_autorizacao.sql em ambiente isolado.
begin;

-- RLS na unidade e o auxiliar DEV-013 conferem identidade, MFA e vínculos ativos.
create function public.piloto_minhas_unidades()
returns table (id uuid, nome text, perfis text[])
language sql stable security invoker set search_path = ''
as $$
  select u.id, u.nome, pg_catalog.array_agg(p.perfil order by p.perfil)
  from piloto.unidades u
  cross join lateral piloto_privado.perfis_ativos(u.id) p
  group by u.id, u.nome
  order by u.nome, u.id
$$;

revoke all on function public.piloto_minhas_unidades() from public, anon, authenticated, service_role;
grant execute on function public.piloto_minhas_unidades() to authenticated;

commit;
