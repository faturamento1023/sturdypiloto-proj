-- DEV-021. Aplicar após DEV-020. Janelas datadas explícitas, preparadas para DEV-022.
begin;
set local search_path = pg_catalog, extensions;

create table piloto.janelas_agenda (
  unidade_id uuid not null,
  id uuid not null default gen_random_uuid(),
  profissional_id uuid not null,
  periodo tstzrange not null check (
    not isempty(periodo) and not lower_inf(periodo) and not upper_inf(periodo)
    and lower_inc(periodo) and not upper_inc(periodo)
    and isfinite(lower(periodo)) and isfinite(upper(periodo))
  ),
  primary key (unidade_id, id),
  foreign key (unidade_id, profissional_id) references piloto.profissionais (unidade_id, id),
  exclude using gist (unidade_id with =, profissional_id with =, periodo with &&)
);

alter table piloto.janelas_agenda enable row level security;
revoke all on piloto.janelas_agenda from public, anon, authenticated, service_role;
grant select on piloto.janelas_agenda to authenticated;
create policy janelas_agenda_ler on piloto.janelas_agenda for select to authenticated
using (piloto_privado.tem_perfil(unidade_id, array['recepcao', 'gestao', 'administrador'])
  or piloto_privado.e_profissional(unidade_id, profissional_id));

create trigger auditar_mutacao after insert or update or delete on piloto.janelas_agenda
for each row execute function piloto_privado.registrar_mutacao();

-- Leitura e auditoria são separadas por privilégio. O definer só registra a
-- decisão, revalidando por conta própria; a projeção executa sob as RLS.
create function piloto_privado.autorizar_grade(unidade uuid, profissional uuid, correlacao uuid)
returns boolean language sql volatile security definer set search_path = ''
as $$
  with escopo as materialized (
    select (
      piloto_privado.tem_perfil(unidade, array['recepcao', 'gestao', 'administrador'])
      and (profissional is null or exists (
        select 1 from piloto.profissionais p where p.unidade_id = unidade and p.id = profissional
      ))
    ) or (
      profissional is not null and piloto_privado.e_profissional(unidade, profissional)
    ) or (
      profissional is null and exists (
        select 1 from piloto.profissionais p where p.unidade_id = unidade
          and p.usuario_id = auth.uid() and piloto_privado.e_profissional(unidade, p.id)
      )
    ) as permitido
  ), trilha as (
    insert into piloto_privado.auditoria
      (unidade_id, entidade, registro_id, operacao, ator_id, resultado, correlacao_id)
    select case when e.permitido then unidade end, 'grade_agenda', null, 'SELECT', ator.id,
      case when e.permitido then 'permitido' else 'negado' end,
      coalesce(correlacao, pg_catalog.gen_random_uuid())
    from escopo e cross join piloto_privado.ator_auditoria() as ator(id)
    where ator.id is not null
  )
  select e.permitido from escopo e
$$;

create function public.piloto_ler_grade_agenda(
  unidade uuid, profissional uuid, de timestamptz, ate timestamptz, correlacao uuid
)
returns jsonb language plpgsql volatile security invoker set search_path = ''
as $$
declare
  intervalo tstzrange;
  resposta jsonb;
begin
  if de is null or ate is null or not isfinite(de) or not isfinite(ate)
      or de >= ate or ate - de > interval '744 hours' then
    raise exception 'Janela inválida' using errcode = '22023';
  end if;

  if not piloto_privado.autorizar_grade(unidade, profissional, correlacao) then
    return null;
  end if;

  intervalo := tstzrange(de, ate, '[)');
  with compromissos as materialized (
    select a.id, a.profissional_id, greatest(a.inicio, de) as inicio, least(a.fim, ate) as fim, a.estado
    from piloto.agendamentos a
    where a.unidade_id = unidade and (profissional is null or a.profissional_id = profissional)
      and a.inicio < ate and a.fim > de
    limit 501
  ), janelas as materialized (
    select j.profissional_id, j.periodo * intervalo as periodo
    from piloto.janelas_agenda j
    join piloto.profissionais p on p.unidade_id = j.unidade_id and p.id = j.profissional_id and p.ativo
    where j.unidade_id = unidade and (profissional is null or j.profissional_id = profissional)
      and j.periodo && intervalo
    limit 501
  ), equipe as materialized (
    select p.id, p.nome, p.ativo from piloto.profissionais p
    where p.unidade_id = unidade and (p.ativo or p.id = profissional
      or exists (select 1 from compromissos a where a.profissional_id = p.id))
    order by (p.id = profissional) desc nulls last, p.nome, p.id
    limit 501
  ), capacidade as (
    select (select count(*) from compromissos) > 500
      or (select count(*) from janelas) > 500
      or (profissional is null and (select count(*) from equipe) > 500) as excedida
  ), ocupacao as (
    select c.profissional_id, range_agg(tstzrange(c.inicio, c.fim, '[)')) as periodos
    from compromissos c where c.estado <> 'cancelado'
    group by c.profissional_id
  ), livres as (
    select j.profissional_id, lower(f.periodo) as inicio, upper(f.periodo) as fim
    from janelas j
    left join ocupacao o using (profissional_id)
    cross join lateral unnest(tstzmultirange(j.periodo) - coalesce(o.periodos, '{}'::tstzmultirange)) as f(periodo)
  )
  select jsonb_build_object('profissionais', (
    select coalesce(jsonb_agg(e order by e.nome, e.id), '[]')
    from (select * from equipe order by (id = profissional) desc nulls last, nome, id limit 500) e
  )) || case when excedida then jsonb_build_object('excedida', true) else jsonb_build_object(
    'agendamentos', (select coalesce(jsonb_agg(c order by c.inicio, c.id), '[]') from compromissos c),
    'livres', (select coalesce(jsonb_agg(l order by l.inicio, l.profissional_id), '[]') from livres l)
  ) end into resposta from capacidade;
  return resposta;
end;
$$;

revoke all on function piloto_privado.autorizar_grade(uuid,uuid,uuid),
  public.piloto_ler_grade_agenda(uuid,uuid,timestamptz,timestamptz,uuid)
  from public, anon, authenticated, service_role;
grant execute on function piloto_privado.autorizar_grade(uuid,uuid,uuid),
  public.piloto_ler_grade_agenda(uuid,uuid,timestamptz,timestamptz,uuid) to authenticated;

commit;
