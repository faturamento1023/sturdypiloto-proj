# Controle de execução — Projeto Piloto

Este arquivo é o registro operacional para evitar que sessões manuais e execuções agendadas repitam tarefas. A planilha do Drive contém o cronograma completo; o GitHub registra a evidência técnica.

## Registros

| Data | Tarefa | Estado | Entrega verificável | Pendência seguinte |
|---|---|---|---|---|
| 2026-11-05 | DEV-001 — Conferir arquivos e versões do Drive | **Concluída (inventário documental)** | README e `docs/INVENTARIO_EVIDENCIAS.md` com referência aos manuais, PDFs/HTML/TXT, 37 capturas administrativas, pacote ZIP médico de 23 capturas e outro ZIP com 1 captura | DEV-002 — Abrir e verificar individualmente as capturas |
| 2026-11-05 | DEV-002 — Validar screenshots existentes | **Concluída (paridade visual de módulos)** | `docs/DEV-002_MATRIZ_VISUAL.md`: 61 JPG conferidos visualmente, 10 nomes médicos divergentes, 5 tópicos sem captura individual e lacunas documentadas | DEV-003 — Confirmar disponibilidade dos JPG médicos |
| 2026-11-05 | DEV-003 — Confirmar disponibilidade dos JPG médicos | **Concluída (ausência refutada)** | 23 imagens médicas identificadas e conferidas no ZIP do manual, mais um JPG complementar distinto; sem necessidade de solicitação | DEV-004 — Mapear lacunas e fluxos |

| 2026-11-05 | DEV-004 — Mapear lacunas e fluxos | **Concluída (especificação funcional)** | `docs/DEV-004_MAPA_FUNCIONAL.md`: 39 telas admin + 26 tópicos médicos, 3 fluxos Mermaid, 12 lacunas, 16 casos QA; `docs/DEV-004_TELAS.json`: inventário de 65 telas conferido | DEV-005 — Definir critérios de paridade por perfil e obter aprovação |

| 2026-11-05 | DEV-005 — Definir critérios de paridade | **Concluída (escopo aprovado pelo responsável em 05/11/2026)** | `docs/DEV-005_CRITERIOS_PARIDADE.md` e `docs/DEV-005_CRITERIOS_POR_TELA.json` com 65 critérios (MVP 24, V1 37, futura 4), validação estrutural e status sem testes | DEV-006 — Mapear jornadas completas |

| 2026-11-05 | DEV-006 — Mapear jornadas completas | **Concluída. Mapa aceito pelo responsável pelo projeto** | 7 jornadas e 53 passos, 4 requisitos de produto aprovados e 20 testes unitários do domínio sintético. Aceite final no [checklist](DEV-006_CHECKLIST_VALIDACAO.md#registro-de-decisão). | DEV-007 — Criar protótipo no Figma com dados fictícios e manter as regras operacionais abertas sinalizadas. |

## Regras para próximas execuções

1. Consultar a planilha de cronograma no Drive, este arquivo e Issues/PRs já existentes antes de escolher a próxima tarefa.
2. Uma tarefa pode envolver várias execuções; não declará-la concluída sem entregar artefato verificável e testes pertinentes.
3. Para código, preferir branch de trabalho e PR; nunca aplicar modificações diretamente em ambiente clínico real.
4. Revisar `docs/INVENTARIO_EVIDENCIAS.md` quando surgirem novas provas ou regras.
5. Registros de sessões devem conter data, tarefa, arquivos alterados, testes realizados, problemas e próxima ação.
6. Manter documentação sem dados pessoais de pacientes, segredos ou arquivos proprietários.

## Estado geral

- Fase do cronograma: **02 — UX e arquitetura** (mapa da DEV-006 aceito).
- Tarefas concluídas: **DEV-001 a DEV-006**.
- Próxima tarefa: **DEV-007 — Criar protótipo no Figma**. A tarefa ainda não foi iniciada.
- Etapa 02 — UX e arquitetura: iniciada com DEV-006; etapas 03–14 não iniciadas.
- Aplicação web de produção ainda não iniciada. O PR inclui demonstração HTML de recepção e funções de domínio em memória, com dados fictícios.
- **Não confundir** inspeção visual com teste funcional das telas ou homologação de regras clínicas.
- A planilha Excel de cronograma no Drive ainda contém texto inicial que afirmava ausência dos JPG médicos; o documento `docs/DEV-002_MATRIZ_VISUAL.md` prevalece até a atualização controlada da planilha.

## Sessão de 05/11/2026 — preparação da revisão conjunta

Registro histórico anterior ao aceite final.

- Conferidos controle da branch, DEV-005, checklist, contratos, revisão de fontes, PR #5 e Issue #4; nenhuma revisão formal, thread ou comentário de revisão encontrado no PR/Issue.
- Confirmado no Drive que o cronograma é `Plano_Desenvolvimento_Sistema_DM_Ultra_2026-2027.xlsx` (XLSX), na pasta Web Ultra; fonte preservada, sem edição.
- Criado `docs/DEV-006_PACOTE_REVISAO_CONJUNTA.md` no commit `13f7977`: pauta de decisões V01–V12, propostas conservadoras, responsáveis, bloqueios e critérios de aceite.
- Testes: não foram executados novamente nesta sessão; há registro anterior de 20 testes unitários locais aprovados. Consulta de workflow do commit anterior `0753ccf` retornou lista vazia; **CI do PR atualizado não confirmada**.
- Bloqueio: faltam revisão conjunta administrativa/médica e aceite final; DEV-006 continua aberta. **Não mesclar PR #5, fechar Issue #4 ou iniciar DEV-007.**
- Próxima ação: registrar decisões dos responsáveis por perfil, conferir CI atual e sanar ressalvas com alterações rastreáveis.

## Sessão de 05/11/2026 — aceite final do mapa

- Em resposta à solicitação de aceite para encerramento, o responsável pelo projeto confirmou «Está aceito». O [checklist](DEV-006_CHECKLIST_VALIDACAO.md#registro-de-decisão) registra a confirmação e as questões operacionais sem resposta individual.
- O commit técnico `b3bef24` passou na [validação das jornadas](https://github.com/faturamento1023/sturdypiloto-proj/actions/runs/42142832609) e nos [testes de domínio](https://github.com/faturamento1023/sturdypiloto-proj/actions/runs/42142832572). O aceite fecha o desenho das jornadas. A revisão especializada de regras clínicas e operacionais e a verificação da demonstração no navegador seguem pendentes.
- Próxima ação: DEV-007 com jornadas aceitas, dados fictícios e estados para as regras que exigem validação posterior.

## Sessão de 05/11/2026 — início da DEV-007 e bloqueio Figma

- Consultado controle atualizado da branch e conferidos PRs/Issues abertos: nenhuma ocorrência aberta retornada; o controle registra DEV-006 concluída e aceite do mapa.
- Criado arquivo Figma vazio **Projeto Piloto — DEV-007 — Protótipo UX**: https://www.figma.com/design/2oMmyZKXEbkFLJmzA3ex5R (fileKey `2oMmyZKXEbkFLJmzA3ex5R`).
- **Bloqueio:** ao consultar bibliotecas de design, Figma retornou limite de chamadas MCP do plano Starter. Não foi possível inserir ou verificar telas editáveis; não declarar protótipo concluído.
- Testes: nenhuma execução de testes de código nesta sessão; nenhuma alteração no WebUltra original ou dados de pacientes.
- Próxima tarefa: após liberação de chamadas Figma, descobrir bibliotecas/componentes, construir telas desktop/mobile das jornadas aprovadas, revisar capturas e registrar IDs de frames e evidências. DEV-007 permanece **em andamento/bloqueada**.
