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

| 2026-11-05 | DEV-007 — Criar protótipo no Figma | **Concluída** | [Protótipo editável](DEV-007_PROTOTIPO_FIGMA.md) com 52 frames em desktop e celular, navegação por módulo e modal de inclusão de procedimento no atendimento. | DEV-008 — Formalizar tokens e componentes reutilizáveis. |

| 2026-11-05 | DEV-008 — Definir design system original | **Concluída** | [Design system editável](DEV-008_DESIGN_SYSTEM.md), com 64 variáveis, 9 estilos de texto, 6 famílias de componentes, 8 ícones e tokens CSS. | DEV-009 — Modelar banco de dados, permissões e auditoria. |

| 2026-11-05 | DEV-009 — Modelar banco de dados | **Concluída** | [Modelo PostgreSQL executável](DEV-009_MODELO_DADOS.md) com 14 tabelas, vínculos por unidade, versões, movimentações, políticas de leitura e trilha de mutações. Cinco grupos de cenários passaram em banco descartável. | DEV-010 — Definir endpoints, filtros, paginação e contratos de API. |

| 2026-11-05 | DEV-010 — Definir API e limites | **Concluída** | [OpenAPI e contrato de API](DEV-010_CONTRATOS_API.md) com 24 operações, paginação, filtros, escopo por perfil, idempotência e revisão por ETag. | DEV-011 — Preparar infraestrutura, checks e ambientes. |

| 2026-11-05 | DEV-011 — Preparar infraestrutura e CI/CD | **Concluída** | [Base Next.js, CI e homologação](DEV-011_INFRAESTRUTURA.md). Build autônomo, checks de banco e navegador e pacote validado por checksum. | DEV-012 — Implementar login, redefinição e sessão. |

| 2026-11-06 | DEV-012 — Implementar autenticação | **Concluída em ambiente simulado** | [Login, recuperação, sessão e MFA TOTP](DEV-012_AUTENTICACAO.md). Conta protegida por AAL2 no servidor, com fluxo testável em desktop e celular. | DEV-013 — Autorizar perfis e vínculos por unidade. |

| 2026-11-06 | DEV-013 — Implementar autorização | **Concluída em ambiente descartável** | [Matriz, RLS, consulta HTTP de acesso e projeção médica](DEV-013_MATRIZ_AUTORIZACAO.md). | DEV-014 — Desenhar o shell do sistema. |

| 2026-11-06 | DEV-014 — Desenhar o shell do sistema | **Concluída em ambiente descartável** | [Painel responsivo e navegação por unidade e perfil](DEV-014_SHELL_SISTEMA.md). | DEV-015 — Implementar auditoria central. |

| 2026-11-06 | DEV-015 — Implementar auditoria central | **Concluída em ambiente descartável** | [Trilha de consultas, bloqueios e alterações](DEV-015_AUDITORIA_CENTRAL.md). | DEV-016 — Cadastro de médicos. |

| 2026-11-06 | DEV-016 — Cadastro de médicos | **Concluída em ambiente descartável** | [Listagem, criação, edição, inativação e auditoria](DEV-016_CADASTRO_MEDICOS.md). | DEV-017 — Cadastro de usuários e perfis. |

| 2026-11-06 | DEV-017 — Cadastro de usuários e perfis | **Concluída em ambiente descartável** | [Convites, vínculos, permissões e bloqueio por unidade](DEV-017_USUARIOS_PERFIS.md). | DEV-018 — Cadastro de procedimentos e grupos. |

| 2026-11-06 | DEV-018 — Cadastro de procedimentos e grupos | **Concluída em ambiente descartável** | [Catálogo, categorias, preparo, TUSS e indicação de consentimento](DEV-018_PROCEDIMENTOS_GRUPOS.md). | DEV-019 — Cadastro de convênios e preços. |

| 2026-11-06 | DEV-019 — Cadastro de convênios e preços | **Concluída em ambiente descartável** | [Convênios, tabelas por procedimento, vigências e coparticipação](DEV-019_CONVENIOS_PRECOS.md). | DEV-020 — Testar impacto cadastral. |

## Regras para próximas execuções

1. Consultar a planilha de cronograma no Drive, este arquivo e Issues/PRs já existentes antes de escolher a próxima tarefa.
2. Uma tarefa pode envolver várias execuções; não declará-la concluída sem entregar artefato verificável e testes pertinentes.
3. Para código, preferir branch de trabalho e PR; nunca aplicar modificações diretamente em ambiente clínico real.
4. Revisar `docs/INVENTARIO_EVIDENCIAS.md` quando surgirem novas provas ou regras.
5. Registros de sessões devem conter data, tarefa, arquivos alterados, testes realizados, problemas e próxima ação.
6. Manter documentação sem dados pessoais de pacientes, segredos ou arquivos proprietários.

## Estado geral

- Fase do cronograma: **04 — Cadastros mestres** (cadastros mestres iniciados pelo cadastro de médicos).
- Tarefas concluídas: **DEV-001 a DEV-019**.
- Próxima tarefa: **DEV-020 — Testar impacto cadastral**.
- Etapa 02 — UX e arquitetura concluída. A etapa 03 começou com DEV-011.
- Base web de desenvolvimento e homologação inicial disponível com dados fictícios. A aplicação clínica será implementada nas etapas seguintes.
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

## Sessão de 05/11/2026 — protótipo DEV-007

- Criado o protótipo editável no Figma com duas entradas (desktop e celular), catálogo e inclusão de procedimentos, recepção, pacientes, atendimentos, prontuário, exames, laudos e financeiro. O [registro da entrega](DEV-007_PROTOTIPO_FIGMA.md) contém links e cobertura.
- Conferidas a estrutura final, a ligação do modal de procedimentos e a composição da agenda nos dois dispositivos. A interface usa exemplos fictícios.
- O responsável autorizou seguir o desenvolvimento sem pedir novos aceites de etapa. Próxima ação: DEV-008.

## Sessão de 05/11/2026 — design system DEV-008

- Criadas as fundações, os componentes com variantes e a prancha de referência no Figma. O [registro da entrega](DEV-008_DESIGN_SYSTEM.md) descreve os usos e referencia os tokens CSS.
- Conferidos os vínculos entre variáveis, estilos e componentes, o encaixe da prancha e a correspondência dos tokens Web.
- Próxima ação: DEV-009.

## Sessão de 05/11/2026 — modelo de dados DEV-009

- Modeladas as entidades de cadastro, agenda, atendimento, prontuário, financeiro e auditoria. O [registro técnico](DEV-009_MODELO_DADOS.md) descreve as chaves, a matriz de acesso e os limites desta fase.
- O SQL foi executado somente em PostgreSQL descartável com dados sintéticos. Cinco grupos de cenários passaram. Autenticação integrada, comandos de escrita e auditoria de leitura pertencem às próximas etapas.
- Próxima ação: DEV-010.


## Sessão de 05/11/2026 — início DEV-010 (contratos de API)

- Antes de escrever, conferidos controle da branch principal, Issue #4, PRs #5–#8 e cronograma XLSX do Drive. O estado atualizado registra DEV-001 a DEV-009 concluídas; a próxima tarefa é DEV-010.
- Conferida a fonte da pasta Web Ultra (somente leitura) e o SQL da DEV-009. A planilha de cronograma permanece inalterada.
- Criada a branch `dev-010-contratos-api`, o documento [DEV-010_CONTRATOS_API.md](DEV-010_CONTRATOS_API.md) e o [PR #9](https://github.com/faturamento1023/sturdypiloto-proj/pull/9) em rascunho.
- Entrega: proposta de 15 rotas para agenda, pacientes, atendimentos, catálogo, documentos e financeiro, com RBAC, limites, paginação, erros, idempotência e bloqueios explícitos.
- Testes: **não executados nesta sessão**; documento técnico não é endpoint implementado. Nenhum dado real, credencial ou código proprietário foi publicado.
- Bloqueios: decisões V01–V12, especificação OpenAPI formal, testes automatizados de contrato e autorização; DEV-010 permanece em andamento. Próxima ação: criar OpenAPI validado e cenários negativos.

## Sessão de 05/11/2026 — conclusão DEV-010

- Especificação OpenAPI adicionada ao PR #9, com 24 operações e exemplos sintéticos. O [contrato](DEV-010_CONTRATOS_API.md) registra as permissões e as dependências das etapas de implementação.
- Lint do OpenAPI, 45 exemplos e 15 entradas indevidas verificados. Foi adicionado um check de PR específico para o contrato.
- Próxima ação: DEV-011.

## Sessão de 05/11/2026 — infraestrutura DEV-011

- Base Next.js adicionada com ambiente identificado no servidor e rota de saúde. O [guia técnico](DEV-011_INFRAESTRUTURA.md) registra os comandos de desenvolvimento e homologação.
- GitHub Actions executa build, banco de teste e Playwright. A entrega de homologação em `main` verifica e inicia o pacote extraído. O projeto Vercel isolado foi pausado após o primeiro envio receber o destino de produção. O [PR #10](https://github.com/faturamento1023/sturdypiloto-proj/pull/10) registra a situação.
- Próxima ação: DEV-012.

## Sessão de 06/11/2026 — autenticação DEV-012

- Implementados login, recuperação por código de e-mail, renovação e saída da sessão. O [guia técnico](DEV-012_AUTENTICACAO.md) registra a configuração do provedor.
- A conta exige MFA TOTP. Para evitar acesso só com senha antes da DEV-013, o piloto aplica essa exigência a todos os usuários. A recuperação preserva o segundo fator nas contas que já o têm.
- Testes automatizados usam um provedor simulado em loopback e contas fictícias. A entrega de e-mail e a configuração de um projeto Supabase isolado ficam pendentes de homologação operacional.
- Próxima ação: DEV-013.

## Sessão de 06/11/2026 — autorização DEV-013

- Retomado o PR #14 da execução agendada e reconciliado com a autenticação da `main`.
- Integrados sessão AAL2, consulta HTTP dos próprios perfis por unidade, vínculos atualizados no PostgreSQL e RLS. A projeção médica do próprio atendimento usa uma função privada com três campos sem valores.
- Testes cobrem negação por padrão, revogação durante a sessão, isolamento entre unidades, tentativas de acesso clínico indevido e integração da consulta HTTP com o banco descartável.
- A aplicação dos SQLs em Supabase hospedado e o envio real de e-mails continuam pendentes de homologação operacional. Operações clínicas e financeiras do OpenAPI serão implementadas nos módulos correspondentes.
- Próxima ação: DEV-014.

## Sessão de 06/11/2026 — shell DEV-014

- Adicionado painel responsivo em `/painel`, com seletor de unidade, menu por perfil, cabeçalho, caminho de navegação e busca de módulos.
- A consulta de unidades usa a sessão com MFA e as políticas do PostgreSQL. A troca de unidade recalcula permissões, e a navegação direta aplica as mesmas verificações.
- Homologação usa contas fictícias, provedor de identidade simulado e PostgreSQL descartável. A busca cobre módulos e os destinos indicam as áreas ainda em preparação.
- Próxima ação: DEV-015.

## Sessão de 06/11/2026 — auditoria DEV-015

- A trilha privada passou a registrar consultas permitidas e negadas no banco, com metadados e correlação. A consulta HTTP de perfis e a listagem de unidades do painel usam a trilha.
- Testados a leitura clínica no banco, a proteção dos eventos contra reescrita e o vínculo transacional entre auditoria e alteração.
- Base legal, retenção, responsáveis pela consulta da trilha e homologação com Supabase hospedado permanecem pendentes de validação institucional.
- A próxima etapa é a DEV-016, cadastro de médicos.

## Sessão de 06/11/2026 — início DEV-016 (cadastro de médicos)

- Conferidos controle da `main`, PRs/Issues, cronograma XLSX do Drive e manual administrativo da pasta Web Ultra. A `main` registra DEV-001 a DEV-015 concluídas; a próxima etapa é DEV-016. Não foi reutilizada a branch antiga DEV-013, que está defasada.
- Branch `dev-016-cadastro-medicos`: validador de cadastro sintético, cinco grupos de testes, workflow específico e [documentação](DEV-016_CADASTRO_MEDICOS.md).
- A fonte original documenta telas 17/18, mas não comprova persistência nem validação do conselho. Não há upload de certificado, assinatura ou dados clínicos.
- Testes: adicionados ao CI, **resultado ainda não confirmado**. Não afirmar conclusão de DEV-016.
- Próxima tarefa: executar CI, revisar os testes, criar migração incremental e handlers com autorização/auditoria, construir telas e testar no PostgreSQL descartável e no navegador.

## Sessão de 06/11/2026 — entrega DEV-016

- O PR #17 passou da validação preliminar para o cadastro operacional em homologação, com pesquisa, edição e inativação lógica.
- Gestão e administração com MFA podem gerenciar o cadastro na unidade vinculada. CRM/UF é único por unidade e alterações usam revisão e auditoria transacional.
- Testes usam cadastro fictício, PostgreSQL descartável e identidade simulada. A próxima etapa é a DEV-017, cadastro de usuários e perfis.

## Sessão de 06/11/2026 — usuários e perfis DEV-017

- Implementados gestão de perfis por unidade, emissão e aceite de convites com validade, vínculo médico, cancelamento e bloqueio auditado.
- Administração exige MFA e vínculo ativo. O aceite exige e-mail confirmado e consome o código uma única vez.
- O piloto usa contas previamente provisionadas e entrega manual do código. Homologação em Supabase hospedado e e-mails automáticos seguem pendentes.
- A próxima etapa é a DEV-018, cadastro de procedimentos e grupos.

## Sessão de 06/11/2026 — catálogo DEV-018

- Implementados catálogo da unidade, pesquisa, cadastro e inativação de procedimentos e grupos, com TUSS, tipo, preparo e exigência de consentimento.
- Escrita restrita a gestão e administração com MFA. Testes cobrem revisão, auditoria, preservação do legado e bloqueio de grupo em uso.
- A validação usa dados fictícios. A próxima etapa é a DEV-019, convênios e preços.

## Sessão de 06/11/2026 — convênios e preços DEV-019

- O PR #20 consolidou o trabalho inicial da automação e integrou cadastro, consulta por data, revisão e inativação.
- O banco impede sobreposição de preços ativos, mantém os preços anteriores e registra auditoria. Coparticipação é registrada como valor fixo por preço nesta etapa.
- Os testes usam dados fictícios. A próxima etapa é a DEV-020, impacto dos cadastros nas demais telas e nos registros históricos.

## Sessão de 06/11/2026 — início DEV-020 (impacto de cadastros)

- Antes de escrever, consultados controle da `main` (DEV-019 registrada como concluída), buscas de Issues/PRs abertos (nenhum retornado), critérios DEV-005, cronograma XLSX e pasta Web Ultra no Drive. O cronograma ainda apresenta status de planejamento e não foi alterado.
- Criada branch `dev-020-impacto-cadastros` a partir da `main`; [PR #21](https://github.com/faturamento1023/sturdypiloto-proj/pull/21) aberto em rascunho.
- Criada visão SQL `piloto.impacto_cadastros_itens` com `security_invoker`, preservando valores de itens de atendimento e apresentando separadamente o estado atual do procedimento (commit `5d10876`).
- Adicionado teste sintético de preservação após inativação de procedimento (commit `e254720`), documentação de impacto (commit `b9493b5`) e workflow PGlite (commit `1cf3ad8`).
- **Teste PGlite e CI ainda não executados/confirmados nesta sessão**: clone direto indisponível por falha de resolução DNS do GitHub no ambiente local. A visão e a autorização por RLS ainda precisam de validação real.
- DEV-020 em andamento. Próximos passos: confirmar CI, testar RLS por perfil/unidade, verificar impacto nos demais cadastros e construir API/UI de histórico. Sem alteração no WebUltra ou produção; sem dados reais.
