# DEV-020 — Impacto de cadastros nos fluxos e registros históricos

**Estado:** em desenvolvimento; não homologado. Referência: critérios DEV-005 v1.0, esquema DEV-009, cadastros DEV-016 a DEV-019 e cronograma XLSX no Drive (planejamento original, ainda marcado como planejado).

## Evidência e regra proposta

- **Modelo já existente no Piloto:** `piloto.itens_atendimento` grava `valor_unitario_centavos` e calcula `cobrado_centavos` a partir da quantidade. O procedimento é vinculado por unidade. Isso permite preservar o valor efetivamente lançado, mesmo que a tabela de convênios ou preços mude.
- **Proposta DEV-020:** a tela de histórico mostra valor gravado no item e a situação **atual** do procedimento, sem recalcular o histórico com preços vigentes. Inativação não apaga referências de atendimentos, documentos ou movimentos.
- **Não observado nem homologado:** comportamento exato de todas as telas WebUltra ao inativar cadastro, regras de reabertura e tratamento de coparticipação histórica. Dependem de validação operacional, não devem ser inferidos do desenho.

## Entrega inicial

- `database/dev020_impacto_cadastros.sql`: visão de leitura `piloto.impacto_cadastros_itens` com `security_invoker=true`, junção limitada por `unidade_id` e sem concessões novas. Expõe identificadores internos, situação atual do procedimento e valor histórico já registrado. **Não** consulta preço corrente nem recalcula cobrança.
- `database/dev020_impacto_cadastros.test.cjs`: cenário sintético que insere atendimento, procedimento e item; verifica valor histórico antes/depois da inativação.
- A visão não é endpoint nem interface pronta. Aplicar apenas em PostgreSQL descartável após DEV-019. Exige PostgreSQL com suporte a `security_invoker` em views.

## Próximas verificações

1. Executar teste com PGlite descartável e verificar permissões RLS da view por recepção, médico, financeiro e usuário de outra unidade.
2. Verificar impacto de inativação de convênio, profissional e grupo em agenda, atendimento, prontuário e caixa; separar estado histórico de estado atual.
3. Criar contratos de API e UI de histórico com estados explícitos, sem expor valores ao perfil médico quando não autorizado.
4. Revisar critérios com operação e financeiro, especialmente coparticipação e itens já faturados; não publicar produção.

**Sem dados de pacientes reais, capturas proprietárias ou alteração no WebUltra.**
