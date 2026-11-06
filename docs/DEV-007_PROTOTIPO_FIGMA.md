# DEV-007 — Protótipo da Clínica DM

Concluída em 05/11/2026. O protótipo usa dados fictícios e camadas editáveis no Figma. A entrega contém 25 telas e estados por dispositivo e um modal de inclusão de procedimento por dispositivo, totalizando 52 frames.

## Abrir

- [Arquivo no Figma](https://www.figma.com/design/2htM9xhmiwhpsLXeL9U4zF)
- [Agenda desktop, 1440 × 900](https://www.figma.com/design/2htM9xhmiwhpsLXeL9U4zF?node-id=2-2)
- [Agenda celular, 390 × 844](https://www.figma.com/design/2htM9xhmiwhpsLXeL9U4zF?node-id=3-2)

Os pontos de partida **Desktop · Agenda** e **Celular · Agenda** ficam no modo de apresentação do Figma. Os botões seguem caminhos demonstrativos com exemplos fixos.

## Fluxos representados

| Fluxo | Caminho no protótipo | Referência |
|---|---|---|
| Catálogo | Procedimentos → Novo procedimento ou Editar → formulário com código, descrição, grupo e preço de referência fictício | UX-01 |
| Recepção | Agenda → Novo agendamento → Reserva criada. A abertura do atendimento é uma ação separada | UX-02 |
| Pacientes | Pacientes → Busca → Novo paciente. O exemplo A abre um prontuário | UX-02/04 |
| Atendimento | Abrir atendimento → Adicionar item → selecionar procedimento e quantidade → ver item incluído e valores separados | UX-03 |
| Médico | Prontuário → Evolução narrativa ou estruturada → Salvar rascunho → Retomar evolução | UX-04 |
| Exames | Prontuário → Exames e evolução → alternar entre registros obstétricos e ginecológicos fictícios, com cálculos desativados | UX-05 |
| Laudos | Laudos pendentes → Abrir rascunho → Enviar para revisão. Assinatura e liberação reais ficam bloqueadas | UX-06 |
| Financeiro | Financeiro → resumo de cobrado, recebido e pendente → itens do atendimento demonstrativo | UX-07 |

Há exemplos de reserva criada, conflito com campos preservados, estado vazio e acesso restrito. Os estados de carregamento, formulário inválido e confirmação de cancelamento aparecem na prancha de referência desktop. Regras clínicas, preços reais, dados assistenciais e integrações permanecem fora desta demonstração.

## Conferência da entrega

- Dois pontos de partida e 52 frames encontrados no arquivo final, incluindo os modais que abrem a partir do atendimento e retornam ao estado com item.
- Composição de agenda conferida em desktop e celular. Camadas de texto e interface editáveis em Inter.
- O responsável orientou prosseguir sem solicitar novos aceites de etapa. As questões operacionais sem resposta individual continuam registradas em `DEV-006_CHECKLIST_VALIDACAO.md`.
- Próxima tarefa do cronograma: DEV-008, formalização de tokens e componentes reutilizáveis.
