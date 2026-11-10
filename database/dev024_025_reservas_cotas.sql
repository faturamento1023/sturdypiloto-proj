-- Aplicar após DEV-031. Reservas, disponibilidade e cotas usam o mesmo bloqueio por unidade.
begin;

alter table piloto.agendamentos
  add column convenio_id uuid,
  add column procedimento_id uuid,
  add column grupo_cota_id uuid,
  add foreign key (unidade_id, convenio_id) references piloto.convenios (unidade_id, id),
  add foreign key (unidade_id, procedimento_id) references piloto.procedimentos (unidade_id, id),
  add foreign key (unidade_id, grupo_cota_id) references piloto.grupos_procedimentos (unidade_id, id);

create table piloto_privado.cotas_agenda (
  unidade_id uuid not null references piloto.unidades(id),
  id uuid not null default gen_random_uuid(),
  convenio_id uuid,
  procedimento_id uuid,
  grupo_id uuid,
  vigencia daterange not null check (not isempty(vigencia) and not lower_inf(vigencia) and not upper_inf(vigencia)
    and isfinite(lower(vigencia)) and isfinite(upper(vigencia))),
  limite integer not null check (limite >= 0),
  ativa boolean not null default true,
  primary key (unidade_id, id),
  foreign key (unidade_id, convenio_id) references piloto.convenios(unidade_id,id),
  foreign key (unidade_id, procedimento_id) references piloto.procedimentos(unidade_id,id),
  foreign key (unidade_id, grupo_id) references piloto.grupos_procedimentos(unidade_id,id)
);
alter table piloto_privado.cotas_agenda enable row level security;
revoke all on piloto_privado.cotas_agenda from public, anon, authenticated, service_role;
create unique index cota_agenda_ativa_idx on piloto_privado.cotas_agenda
  (unidade_id, vigencia, convenio_id, procedimento_id, grupo_id) nulls not distinct where ativa;
create trigger auditar_mutacao after insert or update on piloto_privado.cotas_agenda
for each row execute function piloto_privado.registrar_mutacao();

create function piloto_privado.reservar_horario(unidade uuid, chave uuid, paciente uuid, profissional uuid,
  convenio uuid, procedimento uuid, de timestamptz, ate timestamptz, correlacao uuid)
returns uuid language plpgsql volatile security definer set search_path = ''
as $$
declare
  atual piloto.agendamentos%rowtype;
  ativo boolean;
  grupo uuid;
  dia date;
  grade jsonb;
  pedido tstzrange;
begin
  if not piloto_privado.tem_perfil(unidade, array['recepcao','gestao']) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  if chave is null or paciente is null or profissional is null or convenio is null or procedimento is null
    or de is null or ate is null or not isfinite(de) or not isfinite(ate) or de >= ate
    or ate - de > interval '24 hours' or date_trunc('minute', de) <> de or date_trunc('minute', ate) <> ate then
    raise exception 'Reserva inválida' using errcode = '22023';
  end if;
  dia := (de at time zone 'America/Sao_Paulo')::date;
  if dia not between date '1900-01-01' and date '9999-12-30'
    or ate > piloto_privado.hora_agenda(dia, 1440) then
    raise exception 'A reserva deve ocorrer em um único dia' using errcode = '22023';
  end if;

  -- Mesma ordem do trigger da agenda: profissional antes da unidade.
  select p.ativo into ativo from piloto.profissionais p where p.unidade_id = unidade and p.id = profissional for share;
  perform piloto_privado.travar_agenda(unidade);
  if not piloto_privado.tem_perfil(unidade, array['recepcao','gestao']) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select a.* into atual from piloto.agendamentos a where a.unidade_id = unidade and a.id = chave;
  if found then
    if (atual.paciente_id, atual.profissional_id, atual.convenio_id, atual.procedimento_id, atual.inicio, atual.fim)
      is distinct from (paciente, profissional, convenio, procedimento, de, ate) then
      raise exception 'Envio repetido com dados diferentes' using errcode = '23505';
    end if;
    return atual.id;
  end if;
  if ativo is distinct from true or de < statement_timestamp()
    or not exists (select 1 from piloto.pacientes p where p.unidade_id = unidade and p.id = paciente) then
    raise exception 'Profissional, paciente ou horário indisponível' using errcode = '23514';
  end if;
  perform c.id from piloto.convenios c where c.unidade_id = unidade and c.id = convenio and c.ativo for share;
  if not found then raise exception 'Convênio indisponível' using errcode = '23514'; end if;
  select p.grupo_id into grupo from piloto.procedimentos p
  where p.unidade_id = unidade and p.id = procedimento and p.ativo for share;
  if not found then raise exception 'Procedimento indisponível' using errcode = '23514'; end if;

  pedido := tstzrange(de, ate, '[)');
  grade := public.piloto_ler_grade_agenda(unidade, profissional, de, ate, correlacao);
  if not exists (
    select 1 from jsonb_array_elements(grade -> 'livres') as l(item)
    where (l.item ->> 'profissional_id')::uuid = profissional
      and tstzrange((l.item ->> 'inicio')::timestamptz, (l.item ->> 'fim')::timestamptz, '[)') @> pedido
  ) then
    raise exception 'Horário indisponível' using errcode = '23P01';
  end if;

  -- Qualquer regra correspondente pode barrar. Cancelamentos liberam a cota automaticamente.
  if exists (
    select 1 from piloto_privado.cotas_agenda c
    where c.unidade_id = unidade and c.ativa and c.vigencia @> dia
      and (c.convenio_id is null or c.convenio_id = convenio)
      and (c.procedimento_id is null or c.procedimento_id = procedimento)
      and (c.grupo_id is null or c.grupo_id = grupo)
      and (select count(*) from piloto.agendamentos a
        where a.unidade_id = c.unidade_id and a.estado <> 'cancelado'
          and a.inicio >= piloto_privado.hora_agenda(lower(c.vigencia), 0)
          and a.inicio < piloto_privado.hora_agenda(upper(c.vigencia), 0)
          and (c.convenio_id is null or c.convenio_id = a.convenio_id)
          and (c.procedimento_id is null or c.procedimento_id = a.procedimento_id)
          and (c.grupo_id is null or c.grupo_id = a.grupo_cota_id)) >= c.limite
  ) then
    raise exception 'Cota de agendamento esgotada' using errcode = 'P0024';
  end if;

  perform set_config('piloto.correlacao_id', coalesce(correlacao, gen_random_uuid())::text, true);
  insert into piloto.agendamentos (unidade_id, id, paciente_id, profissional_id, convenio_id, procedimento_id, grupo_cota_id, inicio, fim)
  values (unidade, chave, paciente, profissional, convenio, procedimento, grupo, de, ate);
  return chave;
end;
$$;

create function public.piloto_reservar_horario(unidade uuid, chave uuid, paciente uuid, profissional uuid,
  convenio uuid, procedimento uuid, de timestamptz, ate timestamptz, correlacao uuid)
returns uuid language sql volatile security invoker set search_path = ''
as $$ select piloto_privado.reservar_horario(unidade, chave, paciente, profissional, convenio, procedimento, de, ate, correlacao) $$;

create function piloto_privado.agenda_opcoes(unidade uuid, configuracao boolean, correlacao uuid)
returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare
  permitido boolean := piloto_privado.tem_perfil(unidade,
    case when configuracao then array['gestao','administrador'] else array['recepcao','gestao'] end);
  ator uuid := piloto_privado.ator_auditoria();
begin
  if ator is not null then
    insert into piloto_privado.auditoria (unidade_id, entidade, operacao, ator_id, resultado, correlacao_id)
    values (case when permitido then unidade end, 'opcoes_agenda', 'SELECT', ator,
      case when permitido then 'permitido' else 'negado' end, coalesce(correlacao, gen_random_uuid()));
  end if;
  if not permitido then return null; end if;
  return jsonb_build_object(
    'convenios', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'nome', c.nome) order by c.nome,c.id), '[]')
      from piloto.convenios c where c.unidade_id = unidade and c.ativo),
    'procedimentos', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.descricao) order by p.descricao,p.id), '[]')
      from piloto.procedimentos p where p.unidade_id = unidade and p.ativo)
  ) || case when configuracao then jsonb_build_object(
    'grupos', (select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'nome', g.nome) order by g.nome,g.id), '[]')
      from piloto.grupos_procedimentos g where g.unidade_id = unidade and g.ativo),
    'cotas', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'de', lower(c.vigencia), 'ate', upper(c.vigencia),
      'limite', c.limite, 'convenio', v.nome, 'procedimento', p.descricao, 'grupo', g.nome) order by lower(c.vigencia),c.id), '[]')
      from piloto_privado.cotas_agenda c
      left join piloto.convenios v on v.unidade_id = c.unidade_id and v.id = c.convenio_id
      left join piloto.procedimentos p on p.unidade_id = c.unidade_id and p.id = c.procedimento_id
      left join piloto.grupos_procedimentos g on g.unidade_id = c.unidade_id and g.id = c.grupo_id
      where c.unidade_id = unidade and c.ativa)
  ) else '{}'::jsonb end;
end;
$$;

create function public.piloto_agenda_opcoes(unidade uuid, configuracao boolean, correlacao uuid)
returns jsonb language sql volatile security invoker set search_path = ''
as $$ select piloto_privado.agenda_opcoes(unidade, configuracao, correlacao) $$;

create function piloto_privado.salvar_cota_agenda(unidade uuid, desativar uuid, convenio uuid, procedimento uuid,
  grupo uuid, de date, ate date, limite_cota integer, correlacao uuid)
returns uuid language plpgsql volatile security definer set search_path = ''
as $$
declare
  resultado uuid;
begin
  if not piloto_privado.tem_perfil(unidade, array['gestao','administrador']) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  perform piloto_privado.travar_agenda(unidade);
  if not piloto_privado.tem_perfil(unidade, array['gestao','administrador']) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  perform set_config('piloto.correlacao_id', coalesce(correlacao, gen_random_uuid())::text, true);
  if desativar is not null then
    update piloto_privado.cotas_agenda c set ativa = false
    where c.unidade_id = unidade and c.id = desativar and c.ativa returning c.id into resultado;
    if resultado is null then raise exception 'Cota indisponível' using errcode = '23503'; end if;
  else
    if de is null or ate is null or de >= ate or de < date '1900-01-01' or ate > date '9999-12-31'
      or limite_cota is null or limite_cota < 0 then
      raise exception 'Período ou limite inválido' using errcode = '22023';
    end if;
    if procedimento is not null and grupo is not null and not exists (
      select 1 from piloto.procedimentos p where p.unidade_id = unidade and p.id = procedimento and p.grupo_id = grupo
    ) then
      raise exception 'Procedimento não pertence ao grupo informado' using errcode = '22023';
    end if;
    insert into piloto_privado.cotas_agenda (unidade_id, convenio_id, procedimento_id, grupo_id, vigencia, limite)
    values (unidade, convenio, procedimento, grupo, daterange(de, ate, '[)'), limite_cota) returning id into resultado;
  end if;
  return resultado;
end;
$$;

create function public.piloto_salvar_cota_agenda(unidade uuid, desativar uuid, convenio uuid, procedimento uuid,
  grupo uuid, de date, ate date, limite_cota integer, correlacao uuid)
returns uuid language sql volatile security invoker set search_path = ''
as $$ select piloto_privado.salvar_cota_agenda(unidade, desativar, convenio, procedimento, grupo, de, ate, limite_cota, correlacao) $$;

revoke all on function piloto_privado.reservar_horario(uuid,uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,uuid),
  public.piloto_reservar_horario(uuid,uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,uuid),
  piloto_privado.agenda_opcoes(uuid,boolean,uuid), public.piloto_agenda_opcoes(uuid,boolean,uuid),
  piloto_privado.salvar_cota_agenda(uuid,uuid,uuid,uuid,uuid,date,date,integer,uuid),
  public.piloto_salvar_cota_agenda(uuid,uuid,uuid,uuid,uuid,date,date,integer,uuid) from public, anon, authenticated, service_role;
grant execute on function piloto_privado.reservar_horario(uuid,uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,uuid),
  public.piloto_reservar_horario(uuid,uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,uuid),
  piloto_privado.agenda_opcoes(uuid,boolean,uuid), public.piloto_agenda_opcoes(uuid,boolean,uuid),
  piloto_privado.salvar_cota_agenda(uuid,uuid,uuid,uuid,uuid,date,date,integer,uuid),
  public.piloto_salvar_cota_agenda(uuid,uuid,uuid,uuid,uuid,date,date,integer,uuid) to authenticated;

commit;
