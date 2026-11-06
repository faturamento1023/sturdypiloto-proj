# DEV-006 — Contratos funcionais propostos e cenários de QA

Data: 05/11/2026. Base: quatro decisões do responsável registradas em DEV-006_CHECKLIST_VALIDACAO.md. **Especificação de comportamento do Projeto Piloto, não evidência de comportamento no WebUltra e não homologação clínica.** Usar somente dados fictícios. Os cenários abaixo especificam o QA de ponta a ponta. A [cobertura dos testes locais](DEV-006_COBERTURA_TESTES.md) registra o que foi verificado de forma isolada.

## CF-01 — Agendamento separado de atendimento
- Entidades: `agendamento` e `atendimento` possuem IDs e ciclos de vida distintos; ligação opcional `atendimento.agendamento_id`.
- Agendamento pode ser criado sem abrir atendimento. Abrir atendimento exige ação explícita e autorização.
- Remarcação altera a reserva, não cria nova evolução. Cancelamento não exclui histórico nem atendimento existente.
- Conflitos de horário, encaixe e cotas precisam de política operacional antes de implementação definitiva.
- Cenários: QA-01 reserva criada sem atendimento; QA-02 abertura explícita vincula IDs; QA-03 cancelamento preserva auditoria; QA-04 tentativa de dupla reserva retorna conflito; QA-05 usuário sem permissão recebe 403.

## CF-02 — Evolução médica em rascunho
- Estados propostos: `rascunho` → `finalizada`. Alterações preservam autoria, data e histórico. Finalização exige permissão do profissional autorizado.
- Rascunho não equivale a documento assinado; não exibir como finalizado.
- Evitar perda de dados por concorrência com versão/controle otimista; tempo de sessão expirado exige recuperação segura.
- Cenários: QA-06 salvar e reabrir rascunho; QA-07 impedir edição por usuário não autorizado; QA-08 conflito de versão não sobrescreve conteúdo; QA-09 documento não finalizado não aparece como assinado.

## CF-03 — Revisão de laudo antes de liberação
- Estados propostos: `rascunho` → `em_revisao` → `aprovado_para_assinatura` → `assinado` → `liberado`; `devolvido_para_correcao` retorna ao rascunho com justificativa auditável.
- Não permitir assinatura ou liberação a partir de rascunho; segregação de papéis, responsabilidade técnica e validade de assinatura exigem revisão especializada.
- Nenhuma assinatura ICP-Brasil real ou publicação a pacientes no sandbox.
- Cenários: QA-10 bloquear liberação sem revisão; QA-11 devolver com motivo; QA-12 registrar revisor e autor; QA-13 impedir assinatura por perfil sem permissão; QA-14 bloquear publicação de versão substituída.

## CF-04 — Financeiro com valores distintos
- `valor_cobrado`: obrigação registrada; `valor_recebido`: soma de recebimentos efetivados; `saldo_pendente`: diferença após ajustes autorizados, sem confundir com preço de tabela.
- Recebimentos parciais não encerram saldo. Estornos são lançamentos reversos auditáveis, nunca exclusão silenciosa.
- Desconto e conciliação de caixa exigem política de aprovação. Integração com NFSe não presumida.
- Cenários: QA-15 cobrança 200 e recebimento 80 deixam saldo 120; QA-16 dois recebimentos de 80 e 120 quitam 200; QA-17 estorno de 80 reabre saldo 80; QA-18 desconto sem permissão é recusado; QA-19 relatório não soma preço de tabela como caixa recebido.

## Critérios transversais
- Autorização validada no servidor; trilha de auditoria sem registrar dados clínicos sensíveis em logs de aplicação.
- Interfaces desktop/mobile exibem estados: vazio, carregando, conflito, sem permissão e falha recuperável.
- Dados sintéticos para QA; sem alterar WebUltra ou emitir documento fiscal real.
- Regras clínicas, assinatura, retenção e acesso devem ser revisadas por responsáveis antes de produção.

## Status
- Requisitos CF-01 a CF-04: **aprovados conceitualmente pelo responsável**, detalhamento técnico acima **proposto e pendente de revisão**.
- QA-01 a QA-19: **cenários especificados**. A execução de ponta a ponta depende da implementação e do ambiente de testes.
- DEV-006 permanece em revisão; PR #5 não deve ser mesclado nem DEV-007 declarada iniciada até os critérios de aceite aplicáveis.
