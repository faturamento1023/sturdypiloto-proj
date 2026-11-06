-- DEV-023: armazenamento inicial; aplicar depois de dev022_disponibilidade.sql.
-- Nao integra ainda a grade nem autoriza cancelamento de agendamentos.
begin;
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
alter table piloto.feriados_agenda enable row level security;
alter table piloto.excecoes_agenda enable row level security;
revoke all on piloto.feriados_agenda,piloto.excecoes_agenda from public,anon,authenticated,service_role;
grant select on piloto.feriados_agenda,piloto.excecoes_agenda to authenticated;
create policy feriados_agenda_ler on piloto.feriados_agenda for select to authenticated
using (piloto_privado.tem_perfil(unidade_id,array['recepcao','gestao','administrador'])
 or exists(select 1 from piloto.profissionais p where p.unidade_id=feriados_agenda.unidade_id and piloto_privado.e_profissional(p.unidade_id,p.id)));
create policy excecoes_agenda_ler on piloto.excecoes_agenda for select to authenticated
using (piloto_privado.tem_perfil(unidade_id,array['recepcao','gestao','administrador'])
 or (profissional_id is not null and piloto_privado.e_profissional(unidade_id,profissional_id)));
create trigger auditar_mutacao after insert or update or delete on piloto.feriados_agenda
for each row execute function piloto_privado.registrar_mutacao();
create trigger auditar_mutacao after insert or update or delete on piloto.excecoes_agenda
for each row execute function piloto_privado.registrar_mutacao();
-- Sem GRANT de escrita: comandos futuros devem usar transacoes privadas e checar reservas.
commit;
