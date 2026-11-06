-- DEV-019: migração incremental de convênios e preços.
-- Executar somente em PostgreSQL descartável após DEV-009; não aplica em produção.
-- Falha de unicidade em nomes legados deve ser reconciliada manualmente, nunca renomeada silenciosamente.
begin;
alter table piloto.convenios
  add column if not exists revisao integer not null default 1;
do $dev019$ begin
  if not exists (select 1 from pg_constraint where conname = 'dev019_convenios_revisao_positiva'
    and conrelid = 'piloto.convenios'::regclass) then
    alter table piloto.convenios add constraint dev019_convenios_revisao_positiva check (revisao >= 1);
  end if;
end $dev019$;
create unique index if not exists dev019_convenios_nome_normalizado
  on piloto.convenios (unidade_id, lower(btrim(nome)));
alter table piloto.precos_procedimento
  add column if not exists revisao integer not null default 1;
do $dev019$ begin
  if not exists (select 1 from pg_constraint where conname = 'dev019_precos_revisao_positiva'
    and conrelid = 'piloto.precos_procedimento'::regclass) then
    alter table piloto.precos_procedimento add constraint dev019_precos_revisao_positiva check (revisao >= 1);
  end if;
end $dev019$;
-- Preços continuam em centavos inteiros e com exclusão de sobreposição herdada da DEV-009.
-- Escritas e auditoria serão feitas em transação no servidor; esta migração não concede DML.
commit;
