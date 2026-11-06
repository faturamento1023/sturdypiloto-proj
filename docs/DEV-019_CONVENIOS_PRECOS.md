# DEV-019 — Convênios e tabelas de preço (especificação inicial)

**Estado:** em andamento; proposta técnica, não homologação financeira. Base: DEV-005 v1.0, mapa DEV-004 (ADM-21/22/23) e esquema DEV-009. O WebUltra original não foi alterado.

## Evidência versus proposta

- **Observado/documentado:** telas de lista/cadastro de convênios, tabela de preços por convênio e data de referência, campos de situação, pagamento e coparticipação. O mapa DEV-004 registra ausência de imagem individual ADM-23 e ausência de reteste de autopreenchimento no atendimento.
- **Já existe no Piloto:** `piloto.convenios` (nome, ativo, unidade) e `piloto.precos_procedimento` (procedimento, convênio, intervalo `daterange`, valor inteiro em centavos), com chave por unidade e exclusão de sobreposição de vigências para o mesmo par.
- **Proposto para DEV-019:** CRUD de convênios e preços por gestão/administração com MFA, auditoria e revisão concorrente; preços ausentes **não** geram cobrança automática nem fallback silencioso para Particular. Campos de coparticipação, forma de pagamento e tabelas externas permanecem informativos/desabilitados até regras operacionais aprovadas.

## Regras de segurança e integridade

1. Autorizar cada operação no servidor e revalidar vínculo ativo e unidade na transação; negar por padrão. Recepção pode consultar preços ativos na unidade, mas não alterar tabelas. Médico não recebe valores financeiros na projeção clínica.
2. Preservar os convênios e preços existentes. Inativação é lógica; não excluir histórico nem referências em atendimentos. Alteração de valor vigente exige **nova vigência** ou revisão explicitamente auditada; não reprecificar itens já lançados.
3. Usar data civil da unidade para localizar preço: início inclusivo, fim exclusivo; datas adjacentes permitidas, intervalos sobrepostos proibidos. O banco já impede sobreposição para cada unidade/procedimento/convênio; acrescentar testes de fronteira.
4. Valor é inteiro em centavos, não negativo; não aceitar float como representação monetária de API. O preço exibido deve identificar convênio, procedimento, data de referência, intervalo e fonte. Ausência ou ambiguidade bloqueia preenchimento automático.
5. Conflito de revisão devolve erro sem sobrescrever alterações concorrentes. Alterações e eventos de auditoria DEV-015 devem confirmar atomicamente.
6. Nome de convênio deve ser normalizado para impedir duplicatas de espaço/caixa na mesma unidade, sem modificar silenciosamente registros legados. **Particular** é referência local, não uma regra de fallback nem valor universal.
7. Antes de ativar tabela externa, validar vigência, fonte contratual, autorização de descontos/coparticipação e regras de convênio com responsável financeiro. Nenhum contrato real, tabela de paciente ou dado proprietário no GitHub público.

## Cenários de aceite planejados

| ID | Caso | Resultado esperado |
|---|---|---|
| C19-01 | Gestão com MFA cadastra convênio na própria unidade | Sucesso, revisão e auditoria |
| C19-02 | Recepção tenta alterar preço | 403 e evento de acesso negado |
| C19-03 | Usuário vinculado a outra unidade altera tabela | 403/404, nenhuma mutação |
| C19-04 | Vigências consecutivas [01,10) e [10,20) | Permitidas; consulta de dia 10 seleciona segunda |
| C19-05 | Vigências sobrepostas para mesmo par | 409, preserva tabela anterior |
| C19-06 | Mesmo procedimento e convênio em unidades distintas | Isolamento de registros |
| C19-07 | Preço inexistente ou convênio inativo | Não preencher valor automaticamente |
| C19-08 | Edição concorrente com revisão obsoleta | 412/409, sem perda de alteração |
| C19-09 | Preço histórico após inativação | Preservado para auditoria; sem nova utilização |
| C19-10 | Alteração e auditoria na mesma transação | Rollback conjunto se auditoria falhar |
| C19-11 | Data no limite inicial/final | Inclusiva no início, exclusiva no fim |
| C19-12 | Valor decimal, negativo, NaN ou não inteiro | Rejeitado antes de persistir |

## Dependências e bloqueios

- Migração incremental e handlers ainda **não implementados**; construir sobre DEV-018/DEV-015 sem reescrever o esquema base.
- Testes PostgreSQL descartável, HTTP e navegador ainda **não executados** nesta entrega. O módulo não está concluído.
- Confirmar políticas financeiras V02/V05 e fonte contratual antes de automatizar preço de atendimento. Validação especializada não é presumida.

**Próxima ação:** criar migração reversível, handlers com autorização e auditoria, UI responsiva, testes em PGlite/HTTP e CI; só então marcar DEV-019 concluída.
