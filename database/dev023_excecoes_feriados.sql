-- DEV-023: armazenamento inicial; aplicar depois de dev022_disponibilidade.sql.
-- Nao integra ainda a grade nem autoriza cancelamento de agendamentos.
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
 primary key (unidade_id,id),
 foreign key (unidade_id,profissional_id) references piloto.profissionais(unidade_id,id),
 foreign key (unidade_id,local_id) references piloto.locais_agenda(unidade_id,id),
 check (tipo <> 'substituicao' or profissional_id is not null)
);
create index excecoes_agenda_dia_idx on piloto.excecoes_agenda(unidade_id,dia,profissional_id);
-- Evita intervalos sobrepostos para o mesmo profissional no mesmo dia.
-- Bloqueios gerais da unidade sao protegidos separadamente.
-- A concorrencia com agendamentos e entre escopos distintos exige RPC transacional.
alter table piloto.excecoes_agenda add constraint excecoes_profissional_sem_sobreposicao
 exclude using gist (
  unidade_id with =, dia with =, profissional_id with =,
  int4range(inicio_minuto,fim_minuto,'[)') with &&
 ) where (profissional_id is not null);
alter table piloto.excecoes_agenda add constraint excecoes_unidade_sem_sobreposicao
 exclude using gist (
  unidade_id with =, dia with =,
  int4range(inicio_minuto,fim_minuto,'[)') with &&
 ) where (profissional_id is null);
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
-- Sem GRANT de escrita: comandos futuros devem usar transacoes privadas e checar reservas.
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
      'date',h.dia,'description',h.descricao) order by h.dia),'[]'::jsonb)
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
    where e.unidade_id=unidade and e.dia between de and ate
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

commit;
