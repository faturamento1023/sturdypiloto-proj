# DEV-006 — Checklist de validação por perfil (v0.2)

Data: 05/11/2026. **Aceite do responsável pelo projeto registrado em 05/11/2026 para o checklist e prosseguimento da revisão documental; não representa resposta individual às 12 questões nem homologação clínica/funcional.** Base: DEV-005 v1.0, DEV-006 jornadas v0.2, revisão documental e cronograma. Não contém pacientes, imagens proprietárias ou credenciais.

A tabela registra o resultado da revisão técnica por perspectiva. Para encerrar a etapa, o representante de cada perfil confirma ou corrige as decisões de fluxo aplicáveis, com data e sem dados de pacientes. Regras abertas de operação ou homologação podem ficar registradas como dependências se os perfis concordarem com o fluxo proposto e com o bloqueio correspondente.

| ID | Perfil | Jornada | Resultado da revisão técnica | Ponto para revisão conjunta |
|---|---|---|---|---|
| V01 | Administrativo | UX-01 | ADM-17–25 mostra cadastros e perfis. Proposta de negar gravação por padrão e liberar manutenção explicitamente. | Quem pode criar, editar e inativar cada cadastro? |
| V02 | Administrativo | UX-01/03 | ADM-14 e ADM-21 documentam valor, convênio e data de referência. Proposta de exibir a origem do preço e sinalizar tabela indisponível. | Vigência, preço automático e exceções de convênio. |
| V03 | Recepção | UX-02 | ADM-02–06 documenta agendas substitutas, feriados, locais e cotas. Reserva conflitante deve retornar ao formulário, preservando os campos. | Regras de encaixe, exceção de feriado e prioridade de cota. |
| V04 | Recepção | UX-02/03 | Separação entre reserva e atendimento aprovada. CF-01 prevê abertura explícita e manutenção do histórico. | Quem pode remarcar ou cancelar, inclusive após abrir atendimento? |
| V05 | Administrativo | UX-03/07 | Separação entre cobrado, recebido e pendente aprovada. CF-04 distingue pagamento parcial, estorno e preço de tabela. | Aprovação de descontos e conciliação com caixa. |
| V06 | Médico | UX-04 | Rascunho e retomada aprovados. MED-14–18 descreve os editores, histórico e impressão. CF-02 propõe autoria e versão. | Permissões de finalização, retificação e impressão. |
| V07 | Médico e gestor | UX-04 | MED-01–02 documenta lista de atendimentos e prontuário. Proposta de negar acesso fora da autorização do profissional. | Escopo por unidade, atendimentos e substituição de profissional. |
| V08 | Médico | UX-05 | MED-03–13 documenta abas e gráficos. O fluxo admite entrada sintética sem habilitar fórmulas clínicas. | Fórmulas, unidades e limites ficam para revisão especializada. |
| V09 | Médico e gestor | UX-06 | Revisão antes da assinatura e da liberação aprovada. MED-20 mostra a fila, com editor indeterminado no sistema de referência. | Papéis de revisor e assinante, correção e liberação. |
| V10 | Administrativo | UX-07 | ADM-07–12, ADM-27 e ADM-35 documentam relatórios, opção de NFSe e lançamentos. Proposta de conciliação explícita. | Origem de lançamentos, fechamento de caixa e integração fiscal. |
| V11 | Ambos | UX-01–07 | Wireflows cobrem vazio, carregamento, conflito, acesso negado e falha recuperável. | Revisar as mensagens, a retomada e os casos de exceção por perfil. |
| V12 | Ambos | UX-01–07 | Wireflows registram a hierarquia e variações desktop/mobile. A demonstração cobre apenas a recepção. | Confirmar menus, ordem dos campos e navegação por perfil. |

## Decisões de produto confirmadas pelo responsável em 05/11/2026

1. **Recepção:** agendamento e abertura do atendimento são operações separadas. O vínculo e as transições ainda precisam de detalhamento técnico.
2. **Médico:** permitir salvar evolução como rascunho e retomá-la posteriormente; controle de acesso e histórico de alterações ainda exigem especificação.
3. **Laudos:** exigir revisão antes da assinatura e liberação; regras de assinatura e responsáveis exigem validação clínica/operacional.
4. **Financeiro:** manter valores cobrados, recebidos e pendentes em controles distintos; conciliação e integração com caixa/NFSe ainda exigem especificação.

Essas quatro decisões são **requisitos aprovados para o Projeto Piloto**, não alegações de funcionamento comprovado no WebUltra nem aprovação de todas as questões V01–V12.

## Registro de decisão

| ID | Decisão validada | Papel responsável | Data | Evidência permitida | Passos afetados |
|---|---|---|---|---|---|
| ACEITE-01 | Responsável pelo projeto declarou «Validado» em conversa, após apresentação do checklist e do CI; aceite do documento para prosseguir, sem respostas técnicas específicas | Responsável pelo projeto | 05/11/2026 | Registro textual de aceite, sem dados clínicos | Documento DEV-006; Validação conjunta do fluxo pendente |

| ACEITE-02 | Quatro decisões de produto confirmadas explicitamente pelo responsável: agendamento separado do atendimento; rascunho de evolução; revisão de laudos antes de assinatura/liberação; controles separados de valores cobrados, recebidos e pendentes | Responsável pelo projeto | 05/11/2026 | Confirmação textual em conversa | V04 (parcial), V05 (parcial), V06 (parcial), V09 (parcial) |

## Critério de saída DEV-006

- [x] Comparar menus, hierarquia, campos e estados dos perfis administrativo e médico com os manuais. As lacunas estão registradas acima e na revisão de fontes.
- [x] Rastrear as quatro decisões de produto no JSON, nos wireflows e na matriz de contratos, mantendo separadas as observações do WebUltra e as propostas para o Piloto.
- [x] Executar localmente o validador de UX e os testes do domínio sintético.
- [ ] Confirmar a revisão conjunta com um representante de cada perfil e registrar discordâncias ou pontos encaminhados para etapa posterior.
- [ ] Conferir o GitHub Actions no commit do PR atualizado e registrar o aceite final do mapa antes de mesclar, fechar a issue #4 e iniciar DEV-007.

A revisão conjunta está pendente. As jornadas referenciam ADM-23, ADM-38 e MED-07 sem captura validada. MED-23 e MED-26 também faltam no inventário geral. O cronograma em Excel ainda exibe os status originais; o controle de execução e o PR registram o progresso técnico.
