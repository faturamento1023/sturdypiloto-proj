-- DEV-020: projeção de impacto dos cadastros sobre itens históricos.
-- Aplicar somente em banco descartável após DEV-019.
-- View SECURITY INVOKER: respeita RLS do usuário; nenhuma permissão adicional é concedida.
begin;
create or replace view piloto.impacto_cadastros_itens
with (security_invoker = true)
as
select
  i.unidade_id,
  i.id as item_id,
  i.atendimento_id,
  i.procedimento_id,
  p.ativo as procedimento_ativo_atual,
  i.quantidade,
  i.valor_unitario_centavos as valor_historico_centavos,
  i.cobrado_centavos as cobrado_historico_centavos
from piloto.itens_atendimento i
join piloto.procedimentos p
  on p.unidade_id = i.unidade_id and p.id = i.procedimento_id;
-- Intencionalmente sem JOIN a precos_procedimento: preço atual nunca reprecifica itens históricos.
revoke all on piloto.impacto_cadastros_itens from public;
commit;
