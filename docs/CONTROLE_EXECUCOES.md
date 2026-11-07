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

| 2026-11-06 | DEV-020 — Testar impacto cadastral | **Concluída em ambiente descartável** | [Histórico de itens, inativação e testes de integração](DEV-020_IMPACTO_CADASTROS.md). | DEV-021 — Desenhar grade de agenda. |

| 2026-11-06 | DEV-021 — Desenhar grade de agenda | **Concluída em ambiente descartável** | [Grade por dia e profissional, consulta auditada e intervalos livres](DEV-021_GRADE_AGENDA.md). | DEV-022 — Configurar disponibilidade regular. |

| 2026-11-06 | DEV-022 — Configurar disponibilidade regular | **Concluída em ambiente descartável** | [Janelas semanais por profissional e sala](DEV-022_DISPONIBILIDADE_REGULAR.md). | DEV-023 — Criar exceções e feriados. |

## Regras para próximas execuções

1. Consultar a planilha de cronograma no Drive, este arquivo e Issues/PRs já existentes antes de escolher a próxima tarefa.
2. Uma tarefa pode envolver várias execuções; não declará-la concluída sem entregar artefato verificável e testes pertinentes.
3. Para código, preferir branch de trabalho e PR; nunca aplicar modificações diretamente em ambiente clínico real.
4. Revisar `docs/INVENTARIO_EVIDENCIAS.md` quando surgirem novas provas ou regras.
5. Registros de sessões devem conter data, tarefa, arquivos alterados, testes realizados, problemas e próxima ação.
6. Manter documentação sem dados pessoais de pacientes, segredos ou arquivos proprietários.

## Estado geral

- Fase do cronograma: **05 — Agendamento** (grade de agenda integrada).
- Tarefas concluídas: **DEV-001 a DEV-022**.
- Próxima tarefa: **DEV-023 — Criar exceções e feriados**.
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

## Sessão de 06/11/2026 — impacto cadastral DEV-020

- O PR #21 aproveitou a projeção inicial da automação e conectou o histórico de itens ao painel de atendimentos, com acesso auditado.
- A regressão cobre bloqueio de novas referências a cadastros inativos, preservação do histórico e do saldo, isolamento e MFA. A inativação também é exercitada no navegador.
- Os testes usam dados fictícios. A próxima etapa é a DEV-021, grade de agenda.

## Sessão de 06/11/2026 — início DEV-021, grade de agenda

- Antes de escrever, consultados controle na `main` (DEV-001 a DEV-020 registradas como concluídas), PRs/Issues abertos (nenhum), DEV-005 v1.0, cronograma XLSX do Drive e metadados da pasta Web Ultra. O cronograma ainda contém status original de planejamento e não foi modificado.
- Criada a branch `dev-021-grade-agenda` e [PR #22](https://github.com/faturamento1023/sturdypiloto-proj/pull/22) em rascunho, sem reutilizar branches antigas.
- Projeção pura da grade com intervalo [início, fim), janela até 31 dias, fuso obrigatório, filtragem por unidade/profissional e ausência de dados de paciente: `scripts/dev021_grade.cjs` (commit `5151322`).
- Oito testes unitários sintéticos escritos em `scripts/dev021_grade.test.cjs` (commit `64debbe`), workflow Node 22 (commit `a1f6442`) e documentação de evidência versus proposta (commit `ec49fd2`).
- **Testes não executados nesta sessão:** tentativa de baixar branch para execução local falhou por resolução DNS de `raw.githubusercontent.com`. CI remoto ainda não confirmado. Não afirmar que DEV-021 está concluída.
- Próxima tarefa: implementar consulta HTTP com MFA, vínculo ativo e auditoria, grade responsiva, integração PostgreSQL descartável e testes de navegador; revisar regras de agenda com responsáveis. Nenhum dado real, WebUltra original ou produção alterados.

## Sessão de 06/11/2026 — DEV-021 leitura autorizada da grade

- Antes de alterar: consultados `main` e controle (até DEV-020 concluída), PRs abertos (PR #22), Issues abertas (nenhuma), critérios DEV-005 e metadados do cronograma XLSM e pasta Web Ultra no Drive. O conteúdo da planilha não foi reprocessado nesta sessão.
- Na branch `dev-021-grade-agenda`, adicionados contrato de leitura autorizada `scripts/dev021_leitura.cjs` (commit `cc384bd`), oito testes sintéticos de perfil, MFA e escopo (commit `e4fe15f`), inclusão no CI (commit `dc0360a`) e documentação (commit `2b5c93a`).
- **Testes novos escritos, mas não executados/confirmados no CI**. Nenhuma migração ou consulta PostgreSQL real foi executada. Não houve acesso a pacientes, edição do WebUltra ou publicação em produção.
- DEV-021 permanece aberta. Próxima tarefa: repositório SQL com RLS e teste de isolamento em PostgreSQL descartável, HTTP e UI responsiva; conferir regras operacionais inferidas antes de homologar.

## Sessão de 06/11/2026 — grade de agenda no painel DEV-021

- Continuidade no [PR #22](https://github.com/faturamento1023/sturdypiloto-proj/pull/22) após a DEV-020. Os protótipos Node do rascunho foram substituídos pela implementação integrada e pelos testes no CI principal.
- Entregue grade diária com filtros, intervalos livres calculados a partir de janelas explícitas, compromissos e cancelamentos. A leitura SQL respeita RLS e registra a decisão de acesso.
- Cobertura de MFA, isolamento por unidade e profissional, virada de dia, cancelamento e proteção de dados de paciente. PostgreSQL e navegador usam dados fictícios. A próxima etapa é a DEV-022.

## Sessão de 06/11/2026 — disponibilidade regular DEV-022

- Entregue cadastro de salas e regras semanais com vigência, encerramento e proteção contra sobreposição por profissional ou sala. A grade mostra a disponibilidade calculada e o nome da sala.
- Os testes cobrem autorização, isolamento, vigência, colisões e integração da configuração com a grade. Banco e navegador usam dados fictícios. A próxima etapa é DEV-023.

## Sessão de 06/11/2026 — início DEV-023 (exceções e feriados)

- Antes de escrever: conferidos `main` (DEV-001 a DEV-022 registradas como concluídas), Issues/PRs abertos (nenhum), DEV-005 v1.0, planilha original XLSM no Drive e inventário da pasta Web Ultra. Na planilha, DEV-023 = "Criar exceções e feriados", sequência 05/03, estado original "Planejado"; a planilha não foi alterada.
- Branch `dev-023-excecoes-feriados` criada da `main`; [PR #24](https://github.com/faturamento1023/sturdypiloto-proj/pull/24) em rascunho.
- Implementado resolvedor puro de janelas, bloqueios e substituições, com isolamento por unidade/profissional, datas civis válidas e precedência proposta de feriado bloqueante. Código `scripts/dev023_excecoes.cjs` (commit `9a5d035`).
- Criados 12 cenários unitários fictícios em `scripts/dev023_excecoes.test.cjs` (commit `5b9198a`), documento de evidência/proposta em `docs/DEV-023_EXCECOES_FERIADOS.md` (commit `8938ef2`) e workflow Node 24 (commit `42b3f28`).
- **Testes ainda não confirmados:** tentativa local de baixar arquivos do GitHub falhou por DNS `raw.githubusercontent.com`; consulta dos workflows do commit `42b3f28` retornou lista vazia. Não afirmar execução ou conclusão.
- **Bloqueios:** persistência SQL, RLS/MFA/auditoria, integração à grade DEV-021/022, testes HTTP/PostgreSQL/navegador e aprovação operacional da precedência. Feriado prevalecer sobre substituição é proposta, não comportamento comprovado do WebUltra.
- Próxima ação: executar CI, implementar migração e endpoints transacionais com testes descartáveis e revisar regras inferidas. DEV-023 continua aberta. Sem alteração de pacientes, WebUltra ou produção.

## Sessão de 06/11/2026 — comandos DEV-023 e proteção de reservas

- Conferidos antes das alterações: controle da main, PRs abertos (PR #24), Issues abertas (nenhuma) e estado da branch DEV-023. Não foi avançada a DEV-024.
- Registradas salvaguardas operacionais em `docs/DEV-023_NOTAS_VALIDACAO.md` (commit `c208a76`).
- Criado contrato de comando `scripts/dev023_comandos.cjs` (commit `3fa9c81`): MFA, gestão/administração, unidade vinculada, revalidação de vínculo no adaptador transacional, impedimento de exceções que afetem reservas e auditoria obrigatória.
- Criados nove testes sintéticos de autorização, isolamento, reservas, conflito e auditoria em `scripts/dev023_comandos.test.cjs` (commit `bbacd5f`).
- Atualizado workflow para incluir os testes de comandos (commit `223c3a4`).
- **Testes escritos, não executados nesta sessão; CI não confirmado.** A transação depende de adaptador real que implemente rollback. Ainda não há persistência PostgreSQL, endpoint ou UI de exceções.
- Feriado bloqueante permanece regra proposta não homologada. Próxima tarefa: integrar banco e grade, executar testes PostgreSQL/HTTP/navegador com dados fictícios e validar precedência com responsáveis.

## Sessão de 06/11/2026 — persistência inicial DEV-023

- Conferidos PR #24, controle da branch e esquema anterior DEV-022 antes da migração.
- Criado `database/dev023_excecoes_feriados.sql` (commit `9ce4d71`): tabelas de feriados e exceções, chaves de unidade, integridade referencial, RLS para leitura e gatilhos de auditoria. Escrita direta revogada até existir operação privada transacional.
- Criados cinco testes estáticos da migração `database/dev023_excecoes_feriados.test.cjs` (commit `6dc0122`) e adicionados ao workflow DEV-023 (commit `0807afa`).
- **Não executado/confirmado:** migração em PostgreSQL, testes Node e CI remoto. Testes estáticos não substituem testes de RLS e concorrência em banco.
- **Pendente:** operação SQL segura com rechecagem de reservas e auditoria, leitura integrada na grade, endpoints/UI, testes PostgreSQL/navegador, homologação operacional da precedência dos feriados. DEV-023 permanece aberta e PR #24 não deve ser mesclado ainda.

## Sessão de 06/11/2026 — endurecimento do contrato DEV-023

- Conferidos controle da main, PR #24 aberto, Issues abertas (nenhuma), cronograma do Drive (DEV-023: exceções e feriados, status original Planejado) e pasta Web Ultra antes das alterações.
- `scripts/dev023_comandos.cjs` corrigido para aceitar somente campos conhecidos na persistência, rejeitar vínculos malformados e profissional/sala vazios e exigir identificador após inserção (commit `08c4551`).
- Adicionados cinco testes sintéticos de campos extras, formatos inválidos e inserção sem identificador (commit `6629e62`).
- Tentativa de obter código via git local falhou por DNS; consulta de workflow para o commit retornou lista vazia. **Testes não executados/CI não confirmado**. Não houve alteração de produção ou de dados reais.
- DEV-023 ainda em andamento; pendências: executar testes, aplicar migração em PostgreSQL descartável, transação com concorrência e checagem de reservas, grade e interface, homologação operacional de feriados.

## Sessão de 06/11/2026 — correção de autorização DEV-023

- Antes de escrever: conferidos controle atualizado da branch, PR #24 aberto, Issues abertas (nenhuma), critérios DEV-005 e metadados do cronograma XLSM e da pasta Web Ultra no Drive. Não foi alterado o cronograma.
- Detectada divergência entre o papel `administracao` usado no serviço inicial e `administrador` empregado pelas políticas e operações SQL de DEV-022. Corrigido o serviço `scripts/dev023_comandos.cjs` (commit `734bc55`).
- Adicionados dois testes de regressão que autorizam `administrador` com MFA/vínculo e rejeitam o perfil inexistente `administracao` (commit `2ca76bb`).
- **Testes não executados nesta sessão:** `git ls-remote` falhou por DNS de github.com. CI não confirmado. Não houve aplicação da migração em banco nem testes em navegador.
- DEV-023 permanece em andamento; falta adaptador SQL transacional real, integração de exceções à grade e homologação da regra de feriados. Sem dados reais ou alterações em produção.

## Sessão de 06/11/2026 — leitura segura DEV-023

- Consultados antes da escrita: controle `main` e branch DEV-023, PR #24 aberto, Issues abertas (nenhuma), metadados atuais do cronograma XLSM (modificado em 06/11/2026) e pasta Web Ultra no Drive; critérios DEV-005 e migrações DEV-021/022 como referência. Cronograma não editado.
- Implementada RPC de leitura de feriados e exceções por período de até 31 dias, com auditoria de acesso e isolamento por unidade/profissional; política RLS permite ao médico ver bloqueios gerais da unidade sem abrir exceções de outros profissionais (commit `9f2b4c3`).
- Quatro testes estáticos adicionados (commit `43974ba`) e documentação atualizada (commit `1deb325`).
- **Sem execução confirmada:** testes Node, migração PostgreSQL, CI e navegador. Git local ainda não acessa GitHub por falha DNS; alterações realizadas pela integração GitHub. Não marcar DEV-023 concluída.
- **Próxima tarefa:** operação transacional SQL de gravação com checagem concorrente de reservas, integração efetiva ao cálculo da grade, testes de RLS/HTTP/UX em ambiente descartável, validação operacional da precedência. Nenhum dado real ou produção alterados.

## Sessão de 06/11/2026 — correção de sintaxe da migração DEV-023

- Antes de escrever: conferidos controle `main` e branch ativa, PR #24 aberto, Issues abertas (nenhuma), critérios DEV-005 v1.0, cronograma XLSM original do Drive (abas Painel, Cronograma e Backlog 70 Tarefas) e metadados da pasta Web Ultra. A planilha continua com status original de planejamento, não reflete automaticamente os commits e não foi modificada.
- Detectado defeito concreto em `database/dev023_excecoes_feriados.sql`: a função `public.piloto_ler_excecoes_agenda` usava delimitador PL/pgSQL `$` em vez de `$$`, impedindo execução da migração. Corrigido na branch (commit `944705a`; tentativa anterior `13edaf3` foi substituída).
- Adicionado teste estático de regressão para abertura e fechamento dos delimitadores (commit `493c930`).
- **Validação pendente:** sem execução de migração PostgreSQL ou teste Node nesta sessão; acesso git local continua bloqueado por DNS e consulta de workflow do commit retornou lista vazia. Os testes estruturais não equivalem a validação real do banco.
- DEV-023 permanece em andamento. Próximo: executar migração em banco descartável, conferir RLS/RPC, implementar gravação transacional com bloqueio concorrente e integração da grade; validar regra proposta de feriados com responsáveis.

## Sessão de 06/11/2026 — regressão de testes DEV-023

- Conferidos previamente controle atualizado na main e na branch, PR #24 aberto, Issues abertas (nenhuma), DEV-005 v1.0, cronograma XLSM do Drive e inventário da pasta Web Ultra. O cronograma é um arquivo Excel macro-enabled, não uma planilha nativa do Sheets; nenhuma célula foi alterada.
- Corrigido defeito verificável no teste estático de delimitadores PL/pgSQL: a expressão regular anterior continha barras escapadas em excesso e falharia mesmo diante de `as $$ ... $$;` correto. O teste agora procura abertura/fechamento e corpo da função (commit `9ee15f3`).
- **Validação:** conferência lógica do padrão; execução integral dos testes, CI e migração PostgreSQL continuam não confirmadas. Não declarar aprovação clínica nem conclusão da DEV-023.
- Próximo: executar a suíte no CI, aplicar migração em PostgreSQL descartável, integrar escrita transacional e grade, testar isolamento e concorrência. PR #24 segue em revisão. Nenhum dado real ou produção alterados.

## Sessão de 06/11/2026 — validação pontual do teste DEV-023

- Antes de escrever: conferidos controle da main e da branch, PR #24 aberto, Issues abertas (nenhuma), DEV-005 v1.0, cronograma XLSM do Drive e inventário da pasta Web Ultra. O cronograma confirma DEV-023 como exceções e feriados; não foi alterado.
- Corrigido outro defeito real na expressão regular de `database/dev023_excecoes_feriados.test.cjs`: `public\\.piloto` no literal regex procurava uma barra invertida antes de qualquer caractere, não o ponto literal. Usada classe `[.]` inequívoca (commit `fe3192d`).
- Executada localmente com Node uma prova isolada da expressão corrigida sobre trecho sintético `as $$ ... $$; revoke all on function public.piloto_ler_excecoes_agenda`: PASSOU. **Não equivale a executar o arquivo de teste completo, GitHub Actions ou PostgreSQL.**
- DEV-023 continua aberta. Pendências: validar migração em banco descartável, integrar gravação transacional e grade, testes RLS/HTTP/navegador, revisar precedência de feriados com a operação. Sem publicação, pacientes ou mudanças no WebUltra.

## Sessão de 06/11/2026 — limite de período da leitura DEV-023

- Antes de escrever: consultados controle atualizado em main e branch, PR #24 aberto, Issues abertas (nenhuma), DEV-005 v1.0, cronograma original XLSM do Drive e pasta Web Ultra. O backlog mantém DEV-023 como `Planejado` na planilha histórica; a situação técnica efetiva permanece em andamento no GitHub.
- Detectado erro de limite inclusivo: a condição `ate - de > 31` permitia consultar 32 datas civis (diferença de 31 dias). Corrigido para `> 30` em `database/dev023_excecoes_feriados.sql` (commit `e1a5306`), restringindo a no máximo 31 datas.
- Atualizado teste estrutural e acrescentada regressão do limite inclusivo em `database/dev023_excecoes_feriados.test.cjs` (commit `d9e2776`).
- **Teste efetivamente executado:** prova isolada em Node v22.16.0 com quatro verificações sintéticas de diferenças de 30/31 dias, PASSOU. **Não executados:** arquivo completo de testes, CI, migração PostgreSQL, RLS e navegador. Git local continua sem resolver github.com; commits feitos pela integração GitHub.
- DEV-023 continua aberta e não homologada. Próxima tarefa: transação SQL com bloqueio concorrente e proteção de reservas, integração da grade e testes PostgreSQL/navegador; validar precedência de feriados com a operação. Nenhum paciente ou sistema original alterado.

## Sessão de 06/11/2026 — integridade de exceções concorrentes DEV-023

- Consultados antes das alterações: controle `main` e branch, PRs (PR #24 aberto), Issues (nenhuma aberta), critérios DEV-005 v1.0, arquivo de cronograma do Drive e metadados da pasta Web Ultra. O cronograma é planejamento histórico; o controle GitHub é a fonte do estado atual.
- Adicionadas duas restrições de exclusão GiST em `database/dev023_excecoes_feriados.sql` (commit `3ea65ed`) para impedir intervalos sobrepostos do mesmo profissional e bloqueios gerais sobrepostos na mesma unidade/dia, inclusive sob concorrência de inserts no PostgreSQL.
- Acrescentado teste estático em `database/dev023_excecoes_feriados.test.cjs` (commit `3854720`).
- **Limitação expressa:** as restrições não impedem conflitos entre bloqueio geral e individual, nem garantem preservação de agendamentos existentes. A futura RPC de escrita deve bloquear/revalidar reservas e escopos distintos transacionalmente. A migração depende da extensão btree_gist já utilizada em DEV-022.
- **Não executados nesta sessão:** suíte Node, CI, migração PostgreSQL e testes navegador. Git local segue indisponível por DNS. Nenhuma aprovação operacional/clinica ou publicação em produção. DEV-023 e PR #24 permanecem abertos.
- Próximo: RPC transacional e testes de concorrência em PostgreSQL descartável, integração da grade e UI; validar precedência de feriados com operação.

## Sessão de 06/11/2026 — projeção pura da grade DEV-023

- Antes de escrever: consultados controle `main`, PRs (somente #24 aberto), Issues (nenhuma aberta), critérios DEV-005 v1.0 e planilha original `Plano_Desenvolvimento_Sistema_DM_Ultra_2026-2027.xlsm` no Drive; DEV-023 permanece 'Planejado' na planilha, que não foi modificada. Consultado inventário da pasta Web Ultra, sem republicar arquivos.
- Criado `scripts/dev023_projecao_grade.cjs` (commit `c95c396`) para compor janelas regulares, feriados, exceções e reservas em memória, sem pacientes. Reserva cancelada não ocupa; horários são tratados como intervalos [início, fim).
- Criados sete cenários sintéticos `scripts/dev023_projecao_grade.test.cjs` (commit `82b0e4a`); incluídos no workflow (commit `7ac36ff`).
- **Testes escritos, não executados ou confirmados em CI nesta sessão.** A projeção é protótipo puro, não conectada à RPC PostgreSQL nem à UI. Regra de feriado bloqueante segue proposta operacional não homologada.
- **Próxima tarefa:** integração da projeção com leitura PostgreSQL autorizada e grade DEV-022, RPC transacional de escrita com travas de reservas, testes em banco descartável e navegador. Não mesclar PR #24 antes disso.
