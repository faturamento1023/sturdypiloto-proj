-- DEV-022. Aplicar após dev021_grade_agenda.sql.
begin;
set local search_path = pg_catalog, extensions;

create table piloto.locais_agenda (
  unidade_id uuid not null references piloto.unidades (id),
  id uuid not null default gen_random_uuid(),
  nome text not null check (nome = btrim(nome) and char_length(nome) between 1 and 80),
  primary key (unidade_id, id)
);
create unique index locais_agenda_nome_idx on piloto.locais_agenda (unidade_id, lower(nome));

create table piloto.disponibilidades_regulares (
  unidade_id uuid not null,
  id uuid not null default gen_random_uuid(),
  profissional_id uuid not null,
  local_id uuid not null,
  dia_semana smallint not null check (dia_semana between 1 and 7),
  inicio_minuto integer not null check (inicio_minuto between 0 and 1439),
  fim_minuto integer not null check (fim_minuto between 1 and 1439 and fim_minuto > inicio_minuto),
  desde date not null check (isfinite(desde)),
  ate date check (ate is null or (isfinite(ate) and ate >= desde)),
  vigencia daterange generated always as (daterange(
    desde + ((dia_semana - extract(isodow from desde)::integer + 7) % 7),
    ate + ((dia_semana - extract(isodow from ate)::integer + 7) % 7), '[)'
  )) stored,
  horario int4range generated always as (int4range(inicio_minuto, fim_minuto, '[)')) stored,
  primary key (unidade_id, id),
  foreign key (unidade_id, profissional_id) references piloto.profissionais (unidade_id, id),
  foreign key (unidade_id, local_id) references piloto.locais_agenda (unidade_id, id),
  exclude using gist (unidade_id with =, profissional_id with =, dia_semana with =, vigencia with &&, horario with &&),
  exclude using gist (unidade_id with =, local_id with =, dia_semana with =, vigencia with &&, horario with &&)
);

alter table piloto.locais_agenda enable row level security;
alter table piloto.disponibilidades_regulares enable row level security;
revoke all on piloto.locais_agenda, piloto.disponibilidades_regulares from public, anon, authenticated, service_role;
grant select on piloto.locais_agenda, piloto.disponibilidades_regulares to authenticated;

create policy locais_agenda_ler on piloto.locais_agenda for select to authenticated
using (
  piloto_privado.tem_perfil(unidade_id, array['recepcao', 'gestao', 'administrador'])
  or exists (
    select 1 from piloto.disponibilidades_regulares d
    where d.unidade_id = locais_agenda.unidade_id and d.local_id = locais_agenda.id
      and piloto_privado.e_profissional(d.unidade_id, d.profissional_id)
  )
);
create policy disponibilidade_ler on piloto.disponibilidades_regulares for select to authenticated
using (piloto_privado.tem_perfil(unidade_id, array['recepcao', 'gestao', 'administrador'])
  or piloto_privado.e_profissional(unidade_id, profissional_id));

create trigger auditar_mutacao after insert or update or delete on piloto.locais_agenda
for each row execute function piloto_privado.registrar_mutacao();
create trigger auditar_mutacao after insert or update or delete on piloto.disponibilidades_regulares
for each row execute function piloto_privado.registrar_mutacao();

-- Chamado somente pelas operações privadas de escrita. Protege a autorização
-- contra desativação concorrente de vínculo ou unidade.
create function piloto_privado.autorizar_config_agenda(unidade uuid, correlacao uuid)
returns void language plpgsql volatile security invoker set search_path = ''
as $$
begin
  perform v.id
  from piloto_privado.vinculos v
  join piloto.unidades u on u.id = v.unidade_id and u.ativa
  where v.unidade_id = unidade and v.usuario_id = piloto_privado.ator_auditoria()
    and (select auth.jwt()) ->> 'aal' = 'aal2'
    and v.ativo and v.perfil in ('gestao', 'administrador')
  for share of v, u;
  if not found then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  perform set_config('piloto.correlacao_id', coalesce(correlacao, gen_random_uuid())::text, true);
end;
$$;

create function piloto_privado.criar_local_agenda(unidade uuid, nome_local text, correlacao uuid)
returns uuid language plpgsql volatile security definer set search_path = ''
as $$
declare
  salvo uuid;
begin
  perform piloto_privado.autorizar_config_agenda(unidade, correlacao);
  insert into piloto.locais_agenda (unidade_id, nome) values (unidade, btrim(nome_local)) returning id into salvo;
  return salvo;
end;
$$;

create function piloto_privado.criar_disponibilidade(
  unidade uuid, profissional uuid, local_agenda uuid, dia integer, inicio integer, fim integer,
  inicio_vigencia date, correlacao uuid
)
returns uuid language plpgsql volatile security definer set search_path = ''
as $$
declare
  salvo uuid;
begin
  perform piloto_privado.autorizar_config_agenda(unidade, correlacao);
  if inicio_vigencia is null or not isfinite(inicio_vigencia)
      or inicio_vigencia < (statement_timestamp() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Início de vigência inválido' using errcode = '22023';
  end if;
  if dia is null or dia not between 1 and 7 or inicio is null or fim is null
      or inicio < 0 or fim > 1439 or inicio >= fim then
    raise exception 'Horário inválido' using errcode = '22023';
  end if;
  perform p.id from piloto.profissionais p
  where p.unidade_id = unidade and p.id = profissional and p.ativo
  for share;
  if not found then
    raise exception 'Profissional indisponível' using errcode = '22023';
  end if;
  insert into piloto.disponibilidades_regulares
    (unidade_id, profissional_id, local_id, dia_semana, inicio_minuto, fim_minuto, desde)
  values (unidade, profissional, local_agenda, dia, inicio, fim, inicio_vigencia)
  returning id into salvo;
  return salvo;
end;
$$;

create function piloto_privado.encerrar_disponibilidade(
  unidade uuid, regra uuid, fim_vigencia date, correlacao uuid
)
returns uuid language plpgsql volatile security definer set search_path = ''
as $$
declare
  anterior date;
begin
  perform piloto_privado.autorizar_config_agenda(unidade, correlacao);
  if fim_vigencia is null or not isfinite(fim_vigencia)
      or fim_vigencia < (statement_timestamp() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Fim de vigência inválido' using errcode = '22023';
  end if;
  select d.ate into anterior from piloto.disponibilidades_regulares d
  where d.unidade_id = unidade and d.id = regra and fim_vigencia >= d.desde
  for update;
  if not found or anterior < fim_vigencia then
    raise exception 'Regra indisponível ou encerramento inválido' using errcode = '22023';
  end if;
  if anterior is distinct from fim_vigencia then
    update piloto.disponibilidades_regulares set ate = fim_vigencia
    where unidade_id = unidade and id = regra;
  end if;
  return regra;
end;
$$;

create function public.piloto_criar_local_agenda(unidade uuid, nome_local text, correlacao uuid)
returns uuid language sql volatile security invoker set search_path = ''
as $$ select piloto_privado.criar_local_agenda(unidade, nome_local, correlacao) $$;

create function public.piloto_criar_disponibilidade(
  unidade uuid, profissional uuid, local_agenda uuid, dia integer, inicio integer, fim integer,
  inicio_vigencia date, correlacao uuid
)
returns uuid language sql volatile security invoker set search_path = ''
as $$ select piloto_privado.criar_disponibilidade(unidade, profissional, local_agenda, dia, inicio, fim, inicio_vigencia, correlacao) $$;

create function public.piloto_encerrar_disponibilidade(unidade uuid, regra uuid, fim_vigencia date, correlacao uuid)
returns uuid language sql volatile security invoker set search_path = ''
as $$ select piloto_privado.encerrar_disponibilidade(unidade, regra, fim_vigencia, correlacao) $$;

create function public.piloto_config_agenda(unidade uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object(
    'locais', (select coalesce(jsonb_agg(l order by l.nome, l.id), '[]')
      from (select id, nome from piloto.locais_agenda where unidade_id = unidade) l),
    'profissionais', (select coalesce(jsonb_agg(p order by p.nome, p.id), '[]')
      from (select id, nome, ativo from piloto.profissionais where unidade_id = unidade) p),
    'regras', (select coalesce(jsonb_agg(d order by d.dia_semana, d.inicio_minuto, d.desde, d.id), '[]')
      from (select id, profissional_id, local_id, dia_semana, inicio_minuto, fim_minuto, desde, ate
        from piloto.disponibilidades_regulares where unidade_id = unidade) d)
  )
  where piloto_privado.tem_perfil(unidade, array['gestao', 'administrador'])
$$;

-- Expande datas civis com índice de vigência e converte cada horário de São
-- Paulo em instante. A consulta da grade continua sob as políticas de cada tabela.
create function piloto_privado.janelas_regulares(unidade uuid, profissional uuid, intervalo tstzrange)
returns table (profissional_id uuid, local_nome text, periodo tstzrange)
language plpgsql stable security invoker set search_path = ''
as $$
begin
  if intervalo is null or isempty(intervalo) or lower_inf(intervalo) or upper_inf(intervalo)
      or not isfinite(lower(intervalo)) or not isfinite(upper(intervalo))
      or upper(intervalo) - lower(intervalo) > interval '744 hours' then
    return;
  end if;
  return query
  select d.profissional_id, l.nome, tstzrange(h.inicio, h.fim, '[)') * intervalo
  from piloto.disponibilidades_regulares d
  join piloto.profissionais p on p.unidade_id = d.unidade_id and p.id = d.profissional_id and p.ativo
  join piloto.locais_agenda l on l.unidade_id = d.unidade_id and l.id = d.local_id
  cross join lateral generate_series(
    0, (upper(intervalo) at time zone 'America/Sao_Paulo')::date
       - (lower(intervalo) at time zone 'America/Sao_Paulo')::date
  ) n(dias)
  cross join lateral (select (lower(intervalo) at time zone 'America/Sao_Paulo')::date + n.dias as data) b
  cross join lateral (select
    (b.data + make_interval(mins => d.inicio_minuto)) at time zone 'America/Sao_Paulo' as inicio,
    (b.data + make_interval(mins => d.fim_minuto)) at time zone 'America/Sao_Paulo' as fim
  ) h
  where d.unidade_id = unidade and (profissional is null or d.profissional_id = profissional)
    and d.dia_semana = extract(isodow from b.data)::smallint and d.vigencia @> b.data
    and h.inicio < h.fim and h.inicio < upper(intervalo) and h.fim > lower(intervalo)
  limit 501;
end;
$$;

create or replace function public.piloto_ler_grade_agenda(
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
  ), regulares as materialized (
    select * from piloto_privado.janelas_regulares(unidade, profissional, intervalo)
  ), cobertura_regular as (
    select profissional_id, range_agg(periodo) as periodos
    from regulares group by profissional_id
  ), datadas as materialized (
    select j.profissional_id, j.periodo * intervalo as periodo
    from piloto.janelas_agenda j
    join piloto.profissionais p on p.unidade_id = j.unidade_id and p.id = j.profissional_id and p.ativo
    where j.unidade_id = unidade and (profissional is null or j.profissional_id = profissional)
      and j.periodo && intervalo
    limit 501
  ), janelas as (
    select r.profissional_id, r.local_nome, r.periodo from regulares r
    union all
    select j.profissional_id, null::text, f.periodo
    from datadas j
    left join cobertura_regular r using (profissional_id)
    cross join lateral unnest(tstzmultirange(j.periodo) - coalesce(r.periodos, '{}'::tstzmultirange)) f(periodo)
  ), equipe as materialized (
    select p.id, p.nome, p.ativo from piloto.profissionais p
    where p.unidade_id = unidade and (p.ativo or p.id = profissional
      or exists (select 1 from compromissos a where a.profissional_id = p.id))
    order by (p.id = profissional) desc nulls last, p.nome, p.id
    limit 501
  ), capacidade as (
    select (select count(*) from compromissos) > 500
      or ((select count(*) from datadas) + (select count(*) from regulares)) > 500
      or (profissional is null and (select count(*) from equipe) > 500) as excedida
  ), ocupacao as (
    select c.profissional_id, range_agg(tstzrange(c.inicio, c.fim, '[)')) as periodos
    from compromissos c where c.estado <> 'cancelado'
    group by c.profissional_id
  ), livres as (
    select j.profissional_id, j.local_nome, lower(f.periodo) as inicio, upper(f.periodo) as fim
    from janelas j
    left join ocupacao o using (profissional_id)
    cross join lateral unnest(tstzmultirange(j.periodo) - coalesce(o.periodos, '{}'::tstzmultirange)) as f(periodo)
  )
  select jsonb_build_object('profissionais', (
    select coalesce(jsonb_agg(e order by e.nome, e.id), '[]')
    from (select * from equipe order by (id = profissional) desc nulls last, nome, id limit 500) e
  )) || case when excedida then jsonb_build_object('excedida', true) else jsonb_build_object(
    'agendamentos', (select coalesce(jsonb_agg(c order by c.inicio, c.id), '[]') from compromissos c),
    'livres', (select coalesce(jsonb_agg(jsonb_strip_nulls(to_jsonb(l)) order by l.inicio, l.profissional_id), '[]') from livres l)
  ) end into resposta from capacidade;
  return resposta;
end;
$$;

revoke all on function piloto_privado.autorizar_config_agenda(uuid,uuid),
  piloto_privado.criar_local_agenda(uuid,text,uuid),
  piloto_privado.criar_disponibilidade(uuid,uuid,uuid,integer,integer,integer,date,uuid),
  piloto_privado.encerrar_disponibilidade(uuid,uuid,date,uuid),
  piloto_privado.janelas_regulares(uuid,uuid,tstzrange),
  public.piloto_config_agenda(uuid),
  public.piloto_criar_local_agenda(uuid,text,uuid),
  public.piloto_criar_disponibilidade(uuid,uuid,uuid,integer,integer,integer,date,uuid),
  public.piloto_encerrar_disponibilidade(uuid,uuid,date,uuid)
  from public, anon, authenticated, service_role;
grant execute on function piloto_privado.criar_local_agenda(uuid,text,uuid),
  piloto_privado.criar_disponibilidade(uuid,uuid,uuid,integer,integer,integer,date,uuid),
  piloto_privado.encerrar_disponibilidade(uuid,uuid,date,uuid),
  piloto_privado.janelas_regulares(uuid,uuid,tstzrange),
  public.piloto_config_agenda(uuid),
  public.piloto_criar_local_agenda(uuid,text,uuid),
  public.piloto_criar_disponibilidade(uuid,uuid,uuid,integer,integer,integer,date,uuid),
  public.piloto_encerrar_disponibilidade(uuid,uuid,date,uuid)
  to authenticated;

commit;
