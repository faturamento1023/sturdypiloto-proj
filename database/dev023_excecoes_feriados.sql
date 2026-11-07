-- DEV-023. Aplicar após dev022_disponibilidade.sql.
begin;
-- Fixar resolucao de funcoes e operadores durante a migracao, como na DEV-022.
set local search_path = pg_catalog, extensions;
create table piloto.feriados_agenda (
 unidade_id uuid not null references piloto.unidades(id),
 id uuid not null default gen_random_uuid(),
 dia date not null check (isfinite(dia)),
 descricao text not null check (char_length(btrim(descricao)) between 1 and 120),
 ativo boolean not null default true,
 primary key (unidade_id,id),
 unique (unidade_id,dia)
);
create table piloto.excecoes_agenda (
 unidade_id uuid not null references piloto.unidades(id),
 id uuid not null default gen_random_uuid(),
 profissional_id uuid,
 dia date not null check (isfinite(dia)),
 tipo text not null check (tipo in ('bloqueio','substituicao')),
 inicio_minuto integer not null check (inicio_minuto between 0 and 1439),
 fim_minuto integer not null check (fim_minuto between 1 and 1440 and fim_minuto > inicio_minuto),
 local_id uuid,
 ativo boolean not null default true,
 primary key (unidade_id,id),
 foreign key (unidade_id,profissional_id) references piloto.profissionais(unidade_id,id),
 foreign key (unidade_id,local_id) references piloto.locais_agenda(unidade_id,id),
 check ((tipo = 'substituicao' and profissional_id is not null and local_id is not null)
   or (tipo = 'bloqueio' and local_id is null))
);
create index excecoes_agenda_dia_idx on piloto.excecoes_agenda(unidade_id,dia,profissional_id);
-- Evita intervalos sobrepostos para o mesmo profissional no mesmo dia.
-- Bloqueios gerais da unidade sao protegidos separadamente.
-- Bloqueios gerais e individuais podem coexistir. A grade subtrai sua união.
alter table piloto.excecoes_agenda add constraint excecoes_profissional_sem_sobreposicao
 exclude using gist (
  unidade_id with =, dia with =, profissional_id with =,
  int4range(inicio_minuto,fim_minuto,'[)') with &&
 ) where (ativo and tipo = 'bloqueio' and profissional_id is not null);
alter table piloto.excecoes_agenda add constraint excecoes_unidade_sem_sobreposicao
 exclude using gist (
  unidade_id with =, dia with =,
  int4range(inicio_minuto,fim_minuto,'[)') with &&
 ) where (ativo and profissional_id is null);
create unique index excecoes_substituicao_dia_idx
  on piloto.excecoes_agenda (unidade_id,dia,profissional_id) where ativo and tipo = 'substituicao';
alter table piloto.excecoes_agenda add constraint excecoes_sala_sem_sobreposicao
  exclude using gist (unidade_id with =, dia with =, local_id with =,
    int4range(inicio_minuto,fim_minuto,'[)') with &&) where (ativo and tipo = 'substituicao');
alter table piloto.feriados_agenda enable row level security;
alter table piloto.excecoes_agenda enable row level security;
revoke all on piloto.feriados_agenda,piloto.excecoes_agenda from public,anon,authenticated,service_role;
grant select on piloto.feriados_agenda,piloto.excecoes_agenda to authenticated;
create policy feriados_agenda_ler on piloto.feriados_agenda for select to authenticated
using (piloto_privado.tem_perfil(unidade_id,array['recepcao','gestao','administrador'])
 or exists(select 1 from piloto.profissionais p where p.unidade_id=feriados_agenda.unidade_id and piloto_privado.e_profissional(p.unidade_id,p.id)));
create policy excecoes_agenda_ler on piloto.excecoes_agenda for select to authenticated
using (piloto_privado.tem_perfil(unidade_id,array['recepcao','gestao','administrador'])
 or (profissional_id is not null and piloto_privado.e_profissional(unidade_id,profissional_id))
 or (profissional_id is null and exists (
   select 1 from piloto.profissionais p where p.unidade_id=excecoes_agenda.unidade_id
     and piloto_privado.e_profissional(p.unidade_id,p.id)
 )));
create trigger auditar_mutacao after insert or update or delete on piloto.feriados_agenda
for each row execute function piloto_privado.registrar_mutacao();
create trigger auditar_mutacao after insert or update or delete on piloto.excecoes_agenda
for each row execute function piloto_privado.registrar_mutacao();
-- A escrita passa pelas operações transacionais privadas.
-- Leitura auditada e sem dados de pacientes. Filtro de profissional obrigatório
-- na projeção para médicos; a RLS também restringe a leitura linha a linha.
create function public.piloto_ler_excecoes_agenda(
 unidade uuid, profissional uuid, de date, ate date, correlacao uuid
)
returns jsonb language plpgsql volatile security invoker set search_path = ''
as $$
declare resposta jsonb;
begin
 if de is null or ate is null or not isfinite(de) or not isfinite(ate)
    or ate < de or ate - de > 30 then
   raise exception 'Janela invalida' using errcode='22023';
 end if;
 if not piloto_privado.autorizar_grade(unidade,profissional,correlacao) then
   return null;
 end if;
 select pg_catalog.jsonb_build_object(
  'feriados',(
    select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'id',h.id,'date',h.dia,'description',h.descricao) order by h.dia),'[]'::jsonb)
    from piloto.feriados_agenda h
    where h.unidade_id=unidade and h.dia between de and ate and h.ativo
  ),
  'excecoes',(
    select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'id',e.id,'date',e.dia,'professionalId',e.profissional_id,
      'kind',e.tipo,'startMinute',e.inicio_minuto,
      'endMinute',e.fim_minuto,'roomId',e.local_id)
      order by e.dia,e.inicio_minuto,e.id),'[]'::jsonb)
    from piloto.excecoes_agenda e
    where e.unidade_id=unidade and e.ativo and e.dia between de and ate
      and (profissional is null or e.profissional_id is null or e.profissional_id=profissional)
      and (
        piloto_privado.tem_perfil(unidade,array['recepcao','gestao','administrador'])
        or (e.profissional_id is null or piloto_privado.e_profissional(unidade,e.profissional_id))
      )
  )
 ) into resposta;
 return resposta;
end;
$$;
revoke all on function public.piloto_ler_excecoes_agenda(uuid,uuid,date,date,uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.piloto_ler_excecoes_agenda(uuid,uuid,date,date,uuid)
 to authenticated;

-- Serializa apenas alterações da agenda de uma unidade. A versão materializada
-- força falha de serialização se uma transação com snapshot fixo estiver obsoleta.
create table piloto_privado.revisao_agenda (
  unidade_id uuid primary key references piloto.unidades(id),
  versao bigint not null default 1
);
alter table piloto_privado.revisao_agenda enable row level security;
revoke all on piloto_privado.revisao_agenda from public, anon, authenticated, service_role;

create function piloto_privado.travar_agenda(unidade uuid)
returns void language sql volatile security invoker set search_path = ''
as $$
  insert into piloto_privado.revisao_agenda as r (unidade_id) values (unidade)
  on conflict (unidade_id) do update set versao = r.versao + 1
$$;

create function piloto_privado.hora_agenda(dia date, minuto integer)
returns timestamptz language sql stable security invoker set search_path = ''
as $$ select (dia + make_interval(mins => minuto)) at time zone 'America/Sao_Paulo' $$;

-- Profissional exclusivamente médico pode ver a sala de sua agenda substituta.
alter policy locais_agenda_ler on piloto.locais_agenda using (
  piloto_privado.tem_perfil(unidade_id, array['recepcao', 'gestao', 'administrador'])
  or exists (select 1 from piloto.disponibilidades_regulares d
    where d.unidade_id = locais_agenda.unidade_id and d.local_id = locais_agenda.id
      and piloto_privado.e_profissional(d.unidade_id, d.profissional_id))
  or exists (select 1 from piloto.excecoes_agenda e
    where e.unidade_id = locais_agenda.unidade_id and e.local_id = locais_agenda.id and e.ativo
      and piloto_privado.e_profissional(e.unidade_id, e.profissional_id))
);

create function piloto_privado.salvar_excecao_agenda(
  unidade uuid, acao text, dia_agenda date, registro uuid, profissional uuid,
  local_agenda uuid, inicio integer, fim integer, descricao_feriado text, correlacao uuid
)
returns uuid language plpgsql volatile security definer set search_path = ''
as $$
declare
  salvo uuid;
  dia_inicio timestamptz;
  dia_fim timestamptz;
  de timestamptz;
  ate timestamptz;
  anterior piloto.excecoes_agenda%rowtype;
begin
  perform piloto_privado.autorizar_config_agenda(unidade, correlacao);
  if acao is null or acao not in ('feriado','bloqueio','substituicao','liberar_feriado','remover_excecao')
      or dia_agenda is null or not isfinite(dia_agenda)
      or dia_agenda < (statement_timestamp() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Data ou ação inválida' using errcode = '22023';
  end if;
  dia_inicio := piloto_privado.hora_agenda(dia_agenda, 0);
  dia_fim := piloto_privado.hora_agenda(dia_agenda, 1440);
  if acao in ('bloqueio','substituicao') then
    if inicio is null or fim is null or inicio < 0 or fim > 1440 or inicio >= fim
        or (acao = 'substituicao' and (profissional is null or local_agenda is null))
        or (acao = 'bloqueio' and local_agenda is not null) then
      raise exception 'Escopo ou horário inválido' using errcode = '22023';
    end if;
    de := piloto_privado.hora_agenda(dia_agenda, inicio);
    ate := piloto_privado.hora_agenda(dia_agenda, fim);
    if de >= ate then
      raise exception 'Intervalo inválido no fuso da unidade' using errcode = '22023';
    end if;
    -- A mesma ordem dos gatilhos da agenda, profissional antes do lock da unidade.
    if profissional is not null then
      perform p.id from piloto.profissionais p
        where p.unidade_id = unidade and p.id = profissional and p.ativo for share;
      if not found then
        raise exception 'Profissional indisponível' using errcode = '22023';
      end if;
    end if;
  end if;

  perform piloto_privado.travar_agenda(unidade);
  if acao = 'liberar_feriado' then
    update piloto.feriados_agenda set ativo = false
      where unidade_id = unidade and id = registro and dia = dia_agenda and ativo returning id into salvo;
    return salvo;
  elsif acao = 'remover_excecao' then
    select e.* into anterior from piloto.excecoes_agenda e
      where e.unidade_id = unidade and e.id = registro and e.dia = dia_agenda and e.ativo;
    if not found then return null; end if;
  end if;

  -- Um bloqueio nunca modifica nem cancela reservas. Na substituição, a janela
  -- nova deve conter integralmente os compromissos pendentes do profissional.
  if exists (
    select 1 from piloto.agendamentos a
    where a.unidade_id = unidade and a.estado in ('reservado','confirmado','remarcado')
      and a.inicio < dia_fim and a.fim > dia_inicio
      and case acao
        when 'feriado' then true
        when 'bloqueio' then (profissional is null or a.profissional_id = profissional) and a.inicio < ate and a.fim > de
        when 'substituicao' then a.profissional_id = profissional and (a.inicio < de or a.fim > ate)
        when 'remover_excecao' then anterior.tipo = 'substituicao' and a.profissional_id = anterior.profissional_id
        else false
      end
  ) then
    raise exception 'A alteração afeta agendamentos pendentes' using errcode = 'P0023';
  end if;

  if acao = 'substituicao' and exists (
    select 1 from piloto.disponibilidades_regulares d
    where d.unidade_id = unidade and d.local_id = local_agenda and d.profissional_id <> profissional
      and d.dia_semana = extract(isodow from dia_agenda)::smallint and d.vigencia @> dia_agenda
      and d.horario && int4range(inicio, fim, '[)')
  ) then
    raise exception 'Sala ocupada por disponibilidade regular' using errcode = '23P01';
  end if;

  case acao
    when 'remover_excecao' then
      update piloto.excecoes_agenda set ativo = false
        where unidade_id = unidade and id = anterior.id returning id into salvo;
    when 'feriado' then
      insert into piloto.feriados_agenda (unidade_id, dia, descricao)
      values (unidade, dia_agenda, btrim(descricao_feriado))
      on conflict (unidade_id,dia) do update set ativo = true, descricao = excluded.descricao
      returning id into salvo;
    else
      insert into piloto.excecoes_agenda (unidade_id,dia,tipo,profissional_id,local_id,inicio_minuto,fim_minuto)
      values (unidade,dia_agenda,acao,profissional,local_agenda,inicio,fim)
      returning id into salvo;
  end case;
  return salvo;
end;
$$;

create function public.piloto_salvar_excecao_agenda(
  unidade uuid, acao text, dia_agenda date, registro uuid, profissional uuid,
  local_agenda uuid, inicio integer, fim integer, descricao_feriado text, correlacao uuid
)
returns uuid language sql volatile security invoker set search_path = ''
as $$
  select piloto_privado.salvar_excecao_agenda(unidade, acao, dia_agenda, registro,
    profissional, local_agenda, inicio, fim, descricao_feriado, correlacao)
$$;

create function piloto_privado.validar_reserva_excecao()
returns trigger language plpgsql volatile security definer set search_path = ''
as $$
declare
  dia_inicio date;
  dia_fim date;
begin
  if new.estado not in ('reservado','confirmado','remarcado') then return new; end if;
  if tg_op = 'UPDATE' and old.estado in ('reservado','confirmado','remarcado')
      and (old.unidade_id,old.profissional_id,old.inicio,old.fim) =
          (new.unidade_id,new.profissional_id,new.inicio,new.fim) then
    return new;
  end if;

  perform piloto_privado.travar_agenda(new.unidade_id);
  dia_inicio := (new.inicio at time zone 'America/Sao_Paulo')::date;
  dia_fim := (new.fim at time zone 'America/Sao_Paulo')::date;
  if exists (
    select 1 from piloto.feriados_agenda h
    where h.unidade_id = new.unidade_id and h.ativo and h.dia between dia_inicio and dia_fim
      and new.fim > piloto_privado.hora_agenda(h.dia, 0)
  ) or exists (
    select 1 from piloto.excecoes_agenda e
    where e.unidade_id = new.unidade_id and e.ativo and e.dia between dia_inicio and dia_fim
      and (e.profissional_id is null or e.profissional_id = new.profissional_id)
      and (
        (e.tipo = 'bloqueio' and new.inicio < piloto_privado.hora_agenda(e.dia, e.fim_minuto)
          and new.fim > piloto_privado.hora_agenda(e.dia, e.inicio_minuto))
        or
        (e.tipo = 'substituicao' and new.fim > piloto_privado.hora_agenda(e.dia, 0)
          and (new.inicio < piloto_privado.hora_agenda(e.dia, e.inicio_minuto)
            or new.fim > piloto_privado.hora_agenda(e.dia, e.fim_minuto)))
      )
  ) then
    raise exception 'Horário indisponível pela agenda da data' using errcode = 'P0023';
  end if;
  return new;
end;
$$;

-- Ordena depois de agenda_profissional_ativo para compartilhar a ordem de locks.
create trigger agenda_validar_excecao before insert or update of unidade_id, profissional_id, inicio, fim, estado
on piloto.agendamentos for each row execute function piloto_privado.validar_reserva_excecao();

create function piloto_privado.validar_sala_substituta()
returns trigger language plpgsql volatile security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (old.unidade_id,old.local_id,old.profissional_id,old.dia_semana,
       old.inicio_minuto,old.fim_minuto,old.desde) = (new.unidade_id,new.local_id,new.profissional_id,
       new.dia_semana,new.inicio_minuto,new.fim_minuto,new.desde)
       and new.ate is not null and (old.ate is null or new.ate <= old.ate) then
    return new;
  end if;
  perform piloto_privado.travar_agenda(new.unidade_id);
  if exists (
    select 1 from piloto.excecoes_agenda e
    where e.unidade_id = new.unidade_id and e.local_id = new.local_id and e.profissional_id <> new.profissional_id
      and e.ativo and e.tipo = 'substituicao' and extract(isodow from e.dia)::smallint = new.dia_semana
      and e.dia >= new.desde and (new.ate is null or e.dia < new.ate)
      and e.inicio_minuto < new.fim_minuto and e.fim_minuto > new.inicio_minuto
  ) then
    raise exception 'Sala ocupada por horário substituto' using errcode = '23P01';
  end if;
  return new;
end;
$$;
create trigger validar_sala_substituta before insert or update on piloto.disponibilidades_regulares
for each row execute function piloto_privado.validar_sala_substituta();

revoke all on function piloto_privado.travar_agenda(uuid),
  piloto_privado.hora_agenda(date,integer), piloto_privado.validar_reserva_excecao(),
  piloto_privado.validar_sala_substituta(),
  piloto_privado.salvar_excecao_agenda(uuid,text,date,uuid,uuid,uuid,integer,integer,text,uuid),
  public.piloto_salvar_excecao_agenda(uuid,text,date,uuid,uuid,uuid,integer,integer,text,uuid)
  from public, anon, authenticated, service_role;
grant execute on function piloto_privado.hora_agenda(date,integer),
  piloto_privado.salvar_excecao_agenda(uuid,text,date,uuid,uuid,uuid,integer,integer,text,uuid),
  public.piloto_salvar_excecao_agenda(uuid,text,date,uuid,uuid,uuid,integer,integer,text,uuid)
  to authenticated;

create or replace function public.piloto_ler_grade_agenda(
  unidade uuid, profissional uuid, de timestamptz, ate timestamptz, correlacao uuid
)
returns jsonb language plpgsql volatile security invoker set search_path = ''
as $$
declare
  intervalo tstzrange;
  resposta jsonb;
  dia_de date;
  dia_ate date;
begin
  if de is null or ate is null or not isfinite(de) or not isfinite(ate)
      or de >= ate or ate - de > interval '744 hours' then
    raise exception 'Janela inválida' using errcode = '22023';
  end if;

  if not piloto_privado.autorizar_grade(unidade, profissional, correlacao) then
    return null;
  end if;

  intervalo := tstzrange(de, ate, '[)');
  dia_de := (de at time zone 'America/Sao_Paulo')::date;
  dia_ate := (ate at time zone 'America/Sao_Paulo')::date;
  with feriados as materialized (
    select h.descricao, tstzrange(piloto_privado.hora_agenda(h.dia, 0),
      piloto_privado.hora_agenda(h.dia, 1440), '[)') as periodo
    from piloto.feriados_agenda h
    where h.unidade_id = unidade and h.ativo and h.dia between dia_de and dia_ate
  ), excecoes as materialized (
    select e.profissional_id, e.tipo, l.nome as local_nome,
      tstzrange(piloto_privado.hora_agenda(e.dia, e.inicio_minuto),
        piloto_privado.hora_agenda(e.dia, e.fim_minuto), '[)') as periodo,
      tstzrange(piloto_privado.hora_agenda(e.dia, 0),
        piloto_privado.hora_agenda(e.dia, 1440), '[)') as dia
    from piloto.excecoes_agenda e
    left join piloto.profissionais p on p.unidade_id = e.unidade_id and p.id = e.profissional_id
    left join piloto.locais_agenda l on l.unidade_id = e.unidade_id and l.id = e.local_id
    where e.unidade_id = unidade and e.ativo and e.dia between dia_de and dia_ate
      and (e.profissional_id is null or (p.ativo and (profissional is null or e.profissional_id = profissional)))
    limit 501
  ), bloqueio_unidade as (
    select range_agg(b.periodo) as periodos from (
      select periodo from feriados
      union all select periodo from excecoes where tipo = 'bloqueio' and profissional_id is null
    ) b
  ), bloqueio_profissional as (
    select profissional_id, range_agg(periodo) as periodos
    from excecoes where tipo = 'bloqueio' and profissional_id is not null group by profissional_id
  ), dias_substituidos as (
    select profissional_id, range_agg(dia) as periodos
    from excecoes where tipo = 'substituicao' group by profissional_id
  ), avisos as (
    select null::uuid as profissional_id, 'feriado'::text as tipo, descricao, periodo from feriados
    union all
    select e.profissional_id, e.tipo, null, e.periodo from excecoes e
    where not exists (select 1 from feriados h where h.periodo && e.dia)
  ), compromissos as materialized (
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
  ), base_regular as (
    select r.profissional_id, r.local_nome, r.periodo from regulares r
    union all
    select j.profissional_id, null::text, f.periodo
    from datadas j
    left join cobertura_regular r using (profissional_id)
    cross join lateral unnest(tstzmultirange(j.periodo) - coalesce(r.periodos, '{}'::tstzmultirange)) f(periodo)
  ), janelas as (
    select j.profissional_id, j.local_nome, f.periodo from base_regular j
    left join dias_substituidos s using (profissional_id)
    cross join lateral unnest(tstzmultirange(j.periodo) - coalesce(s.periodos, '{}'::tstzmultirange)) f(periodo)
    union all
    select e.profissional_id, e.local_nome, e.periodo * intervalo from excecoes e
    where e.tipo = 'substituicao' and e.periodo && intervalo
  ), equipe as materialized (
    select p.id, p.nome, p.ativo from piloto.profissionais p
    where p.unidade_id = unidade and (p.ativo or p.id = profissional
      or exists (select 1 from compromissos a where a.profissional_id = p.id))
    order by (p.id = profissional) desc nulls last, p.nome, p.id
    limit 501
  ), capacidade as (
    select (select count(*) from compromissos) > 500
      or (select count(*) from excecoes) > 500
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
    left join bloqueio_profissional b using (profissional_id)
    cross join bloqueio_unidade u
    cross join lateral unnest(tstzmultirange(j.periodo)
      - coalesce(u.periodos, '{}'::tstzmultirange)
      - coalesce(b.periodos, '{}'::tstzmultirange)
      - coalesce(o.periodos, '{}'::tstzmultirange)) as f(periodo)
  )
  select jsonb_build_object('profissionais', (
    select coalesce(jsonb_agg(e order by e.nome, e.id), '[]')
    from (select * from equipe order by (id = profissional) desc nulls last, nome, id limit 500) e
  )) || case when excedida then jsonb_build_object('excedida', true) else jsonb_build_object(
    'agendamentos', (select coalesce(jsonb_agg(c order by c.inicio, c.id), '[]') from compromissos c),
    'avisos', (select coalesce(jsonb_agg(jsonb_strip_nulls(to_jsonb(a)) order by a.inicio, a.tipo, a.profissional_id), '[]') from (
      select v.tipo, v.profissional_id, v.descricao, lower(v.periodo * intervalo) as inicio,
        upper(v.periodo * intervalo) as fim from avisos v where v.periodo && intervalo
    ) a),
    'livres', (select coalesce(jsonb_agg(jsonb_strip_nulls(to_jsonb(l)) order by l.inicio, l.profissional_id), '[]') from livres l)
  ) end into resposta from capacidade;
  return resposta;
end;
$$;

commit;
