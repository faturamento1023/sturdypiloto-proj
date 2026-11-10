-- Abertura idempotente a partir de agendamento e consulta da fila operacional.
begin;

create function piloto_privado.abrir_atendimento_agendado(unidade uuid, agenda uuid, correlacao uuid)
returns uuid language plpgsql volatile security definer set search_path = ''
as $$
declare
  reserva piloto.agendamentos%rowtype;
  atendimento uuid;
begin
  if not piloto_privado.tem_perfil(unidade, array['recepcao','gestao']) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  select a.* into reserva from piloto.agendamentos a
  where a.unidade_id = unidade and a.id = agenda for update;
  if not found then raise exception 'Agendamento indisponível' using errcode = '23503'; end if;

  select a.id into atendimento from piloto.atendimentos a where a.unidade_id = unidade and a.agendamento_id = agenda;
  if found then return atendimento; end if;
  if reserva.estado not in ('reservado','confirmado','remarcado') then
    raise exception 'Agendamento indisponível para abertura' using errcode = '23514';
  end if;

  perform set_config('piloto.correlacao_id', coalesce(correlacao, gen_random_uuid())::text, true);
  insert into piloto.atendimentos (unidade_id, agendamento_id, paciente_id, profissional_id)
  values (unidade, agenda, reserva.paciente_id, reserva.profissional_id) returning id into atendimento;
  return atendimento;
end;
$$;

create function public.piloto_abrir_atendimento_agendado(unidade uuid, agenda uuid, correlacao uuid)
returns uuid language sql volatile security invoker set search_path = ''
as $$ select piloto_privado.abrir_atendimento_agendado(unidade, agenda, correlacao) $$;

create function piloto_privado.auditar_fila_atendimentos(unidade uuid, correlacao uuid)
returns boolean language plpgsql volatile security definer set search_path = ''
as $$
declare
  ator uuid := piloto_privado.ator_auditoria();
  permitido boolean := piloto_privado.tem_perfil(unidade, array['recepcao','medico','financeiro','gestao','administrador']);
begin
  if ator is not null then
    insert into piloto_privado.auditoria (unidade_id, entidade, operacao, ator_id, resultado, correlacao_id)
    values (case when permitido then unidade end, 'atendimentos', 'SELECT', ator,
      case when permitido then 'permitido' else 'negado' end, coalesce(correlacao, gen_random_uuid()));
  end if;
  return permitido;
end;
$$;

create function public.piloto_listar_fila_atendimentos(unidade uuid, dia date, pagina integer, correlacao uuid)
returns jsonb language plpgsql volatile security invoker set search_path = ''
as $$
begin
  if not piloto_privado.auditar_fila_atendimentos(unidade, correlacao) then return null; end if;
  if dia is null or not isfinite(dia) or dia not between date '1900-01-01' and date '9999-12-30'
    or pagina is null or pagina not between 0 and 9999 then
    raise exception 'Consulta inválida' using errcode = '22023';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(a) order by a.aberto_em desc, a.id desc)
    from (
      select a.id, a.agendamento_id, a.aberto_em, a.estado,
        coalesce(p.nome_social, p.nome) as paciente, m.nome as profissional
      from piloto.atendimentos a
      left join piloto.pacientes p on p.unidade_id = a.unidade_id and p.id = a.paciente_id
      left join piloto.profissionais m on m.unidade_id = a.unidade_id and m.id = a.profissional_id
      where a.unidade_id = unidade and a.aberto_em >= (dia::timestamp at time zone 'America/Sao_Paulo')
        and a.aberto_em < ((dia + 1)::timestamp at time zone 'America/Sao_Paulo')
      order by a.aberto_em desc, a.id desc limit 21 offset (pagina * 20)
    ) a
  ), '[]'::jsonb);
end;
$$;

create index atendimentos_unidade_abertura_idx on piloto.atendimentos (unidade_id, aberto_em desc, id desc);

revoke all on function piloto_privado.abrir_atendimento_agendado(uuid,uuid,uuid),
  public.piloto_abrir_atendimento_agendado(uuid,uuid,uuid), piloto_privado.auditar_fila_atendimentos(uuid,uuid),
  public.piloto_listar_fila_atendimentos(uuid,date,integer,uuid) from public, anon, authenticated, service_role;
grant execute on function piloto_privado.abrir_atendimento_agendado(uuid,uuid,uuid),
  public.piloto_abrir_atendimento_agendado(uuid,uuid,uuid), piloto_privado.auditar_fila_atendimentos(uuid,uuid),
  public.piloto_listar_fila_atendimentos(uuid,date,integer,uuid) to authenticated;

commit;
