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

| 2026-11-05 | DEV-006 — Mapear jornadas completas | **Em andamento** | Fluxos detalhados de recepção, médico, laudos e financeiro em preparação; issue a abrir | Revisão de início/fim, estados e exceções |

## Regras para próximas execuções

1. Consultar a planilha de cronograma no Drive, este arquivo e Issues/PRs já existentes antes de escolher a próxima tarefa.
2. Uma tarefa pode envolver várias execuções; não declará-la concluída sem entregar artefato verificável e testes pertinentes.
3. Para código, preferir branch de trabalho e PR; nunca aplicar modificações diretamente em ambiente clínico real.
4. Revisar `docs/INVENTARIO_EVIDENCIAS.md` quando surgirem novas provas ou regras.
5. Registros de sessões devem conter data, tarefa, arquivos alterados, testes realizados, problemas e próxima ação.
6. Manter documentação sem dados pessoais de pacientes, segredos ou arquivos proprietários.

## Estado geral

- Fase do cronograma: **01 — Inventário e paridade**.
- Tarefas concluídas: **DEV-001, DEV-002, DEV-003, DEV-004 e DEV-005** (a DEV-005 recebeu aprovação expressa do escopo v1.0; sem implementação funcional).
- Tarefa atual: **DEV-006 — Mapear jornadas completas** (iniciada após aprovação da DEV-005).
- Etapa 02 — UX e arquitetura: iniciada com DEV-006; etapas 03–14 não iniciadas.
- Aplicação web: ainda não iniciada; não há link de homologação.
- **Não confundir** inspeção visual com teste funcional das telas ou homologação de regras clínicas.
- A planilha Excel de cronograma no Drive ainda contém texto inicial que afirmava ausência dos JPG médicos; o documento `docs/DEV-002_MATRIZ_VISUAL.md` prevalece até a atualização controlada da planilha.
