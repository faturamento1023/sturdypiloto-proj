# DEV-006 — Matriz de rastreabilidade e encaminhamento técnico

Data: 05/11/2026. Revisão documental interna, sem acesso a produção. As decisões do responsável valem para o **Projeto Piloto**; não comprovam comportamento do fornecedor.

| Contrato | Jornadas | Testes planejados | Evidência documental | Decisão | Pendente antes da implementação |
|---|---|---|---|---|---|
| CF-01 Agenda separada de atendimento | UX-02, UX-03 | QA-01 a QA-05 | DEV-006_WIREFLOWS.md; DEV-006_CHECKLIST_VALIDACAO.md | Separação aprovada | Políticas de encaixe, remarcação, cotas e conflitos; concorrência de reservas |
| CF-02 Evolução em rascunho | UX-04 | QA-06 a QA-09 | DEV-006_WIREFLOWS.md; DEV-006_CHECKLIST_VALIDACAO.md | Rascunho e retomada aprovados | Controle de versão, autoria, permissões, retenção e finalização clínica |
| CF-03 Revisão antes de liberar laudo | UX-06 | QA-10 a QA-14 | DEV-006_WIREFLOWS.md; DEV-006_REVISAO_FONTES.md | Revisão prévia aprovada | Responsável pela revisão, assinatura válida, correções e liberação; editor não confirmado no sistema de referência |
| CF-04 Valores separados | UX-03, UX-07 | QA-15 a QA-19 | DEV-006_WIREFLOWS.md; DEV-006_REVISAO_FONTES.md | Cobrado, recebido e pendente separados | Desconto, estorno, caixa, conciliação e eventual NFSe |

## Resultado da revisão documental

- **Cobertura:** os quatro requisitos confirmados possuem jornadas e cenários de teste associados; não há requisito aprovado sem mapeamento.
- **Sem execução funcional:** QA-01 a QA-19 são casos de teste propostos, não resultados de testes. O validador de jornadas verifica estrutura, não operação de agenda, prontuário, laudos ou caixa.
- **Lacunas conhecidas:** ADM-23, ADM-38 e MED-07 não possuem evidência visual individual validada; isso não deve ser convertido em funcionalidade observada.
- **Sem decisões clínicas inferidas:** cálculos obstétricos, assinatura de laudos, acesso ao prontuário e responsabilidade profissional seguem sob revisão especializada.

## Política de encaminhamento sem intervenção do responsável

1. Documentar decisões técnicas reversíveis e testáveis no sandbox, sem solicitar confirmação para cada detalhe.
2. Não preencher lacunas clínicas com suposições. Marcar dependências explícitas, manter funcionalidades sensíveis bloqueadas para produção.
3. Preparar cenários automatizados com dados fictícios quando houver código de aplicação; exigir execução verde e auditoria antes de homologação.
4. Preservar PR #5 em revisão até que os critérios documentais e técnicos aplicáveis estejam satisfeitos. Não declarar DEV-006 concluída nem DEV-007 iniciada por mera autorização genérica para prosseguir.

## Próxima ação executável

Detalhar contratos de API, estados de interface e modelo de permissões **como propostas** para implementação independente, mantendo a distinção entre requisitos de produto, observação documental e testes efetivamente executados. Conferir CI da cabeça do PR antes de qualquer merge.
