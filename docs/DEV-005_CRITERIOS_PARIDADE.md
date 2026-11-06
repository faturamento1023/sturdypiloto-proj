# DEV-005 — Proposta de paridade funcional e critérios de aprovação

**Projeto:** Projeto Piloto • **Data:** 05/11/2026 • **Versão:** 1.0 (proposta) • **Status:** **APROVADO PELO RESPONSÁVEL em 05/11/2026** — aprovação do escopo funcional/visual v1.0, não homologação clínica.

Este documento e [DEV-005_CRITERIOS_POR_TELA.json](DEV-005_CRITERIOS_POR_TELA.json) definem **o que será construído**, como será testado e em qual fase. A proposta foi baseada nos manuais, no [mapa DEV-004](DEV-004_MAPA_FUNCIONAL.md) e na [matriz visual DEV-002](DEV-002_MATRIZ_VISUAL.md). Nenhum módulo está implementado ou homologado.

## 1. O que significa “o mais igual possível”

**Paridade funcional e estrutural**, não cópia literal do sistema de origem:

- Preservar os **módulos de negócio**, fluxos de navegação, tipo de tela (lista, formulário, relatório, editor), agrupamento de informações, nomenclaturas técnicas necessárias, controles documentados e ações essenciais.
- No desktop, usar menu lateral e cabeçalho com área de filtros e tabela/formulário, apresentando as mesmas **classes de informação** e permitindo os mesmos **objetivos de trabalho** comprovados.
- Construir identidade gráfica **própria**, com componentes originais. Não copiar logotipos, marca do fornecedor, HTML, CSS, JavaScript, bibliotecas privadas, textos de licença, ícones/artes exclusivas ou imagens de pacientes.
- No celular, **não exigir reprodução pixel a pixel do layout desktop**: adaptar formulários para uma coluna, menus recolhíveis e tabelas com leitura/scroll controlado.
- Onde uma ação do WebUltra não foi testada, definir seu comportamento **para o Projeto Piloto** e submetê-lo à validação; não anunciar compatibilidade que não esteja comprovada.
- Páginas sem captura própria serão prototipadas com base no inventário textual e sinalizadas como **pendentes de comparação visual**.

### Limites mensuráveis gerais — critérios de QA propostos

| Categoria | Teste de aceitação para cada tela elegível | Não aceito |
|---|---|---|
| Correspondência com a documentação | 100% dos campos e ações **aprovados** listados em DEV-005 presentes; divergências registradas | Botão inerte aparentando funcionar |
| Navegação | Menu → página → ação → retorno sem perda indevida de estado; navegação por teclado, foco visível | Tela inacessível pelo menu autorizado |
| Desktop | Conferência em **1440 × 900** e **1366 × 768**; título, filtros e área principal visíveis e utilizáveis | Elementos sobrepostos ou cortados |
| Celular | Conferência em **375 × 812** e **390 × 844**; sem overflow horizontal da página; tabela pode ter scroll interno sinalizado | Controles fora de alcance |
| Listas e formulários | Busca, filtro, ordenação onde aplicável, carregando, vazio, erro, campo obrigatório e feedback de sucesso | Dados salvos sem confirmação/erro |
| Autorização | Testar acesso legítimo e proibido para cada perfil; acesso indevido rejeitado **no servidor**, com registro de auditoria | Apenas esconder botão no frontend |
| Dados e integridade | CRUD com dados **fictícios**; validação servidor; restrições de identidade e relacionamento; transações quando necessárias | Alterar registro de outro paciente/usuário |
| Auditoria | Operações críticas com autor, data, objeto e ação; nunca registrar senha, token, PFX ou conteúdo sensível indevido | Mudança clínica sem autoria |
| Documentos e laudos | Prévia, impressão e estados de rascunho claros; assinatura e publicação reais bloqueadas até homologação | PDF de teste apresentado como assinado |
| Relatórios | Totais reconciliados contra dataset sintético conhecido; separar tabela/cobrado/pago/financeiro | Somatórios sem critério descrito |
| Clínica | Cálculos obstétricos, ginecológicos e calculadoras desativados ou marcados como **não validados** até revisão especializada | Cálculo apresentado como laudo clínico validado |
| Automação e CI | Teste automatizado por fluxo crítico + lint/build; falhas impedem merge em branch estável | Merge de código com teste essencial falhando |

**Indicadores de aceite de sprint (propostos):** 100% dos itens críticos da sprint com casos QA executados e aprovados; **zero** falha crítica de segurança ou perda de dados; resultados documentados com link de commit/PR e screenshot gerado com dados sintéticos; aprovação humana para mudanças clínicas, financeiras irreversíveis ou de produção. Metas de desempenho detalhadas serão calibradas em ambiente de homologação; não há benchmarks medidos ainda.

## 2. Fases e prioridade de entrega

A separação abaixo **não elimina telas do produto final**. Serve para lançar primeiro um núcleo de teste e reduzir riscos.

| Pacote | Quantidade de itens | Objetivo | O que NÃO significa |
|---|---:|---|---|
| **MVP** | **24** | Estrutura de usuário, cadastros principais, agenda, atendimentos, consultas em texto e planilhadas, fila de laudos em modo rascunho | Não autoriza uso clínico em produção ou assinatura real |
| **Versão 1** | **37** | Relatórios, caixa/financeiro, documentos, receituário, evoluções ginecológicas/obstétricas, modelos e configurações | Não valida automaticamente fórmulas, fiscais ou integrações |
| **Fase futura** | **4** | Cálculos clínicos e módulos com fontes insuficientes ou restrições de acesso, incluindo Doppler e questionários | Não é abandono: precisa de especificação/validação adicional |
| **Total** | **65** | **39 administrativos + 26 médicos**, sem eliminar os 5 tópicos sem imagem | Tópicos podem compartilhar páginas/componentes |

**MVP inicialmente utiliza apenas dados sintéticos.** Pagamentos podem ser representados em campo/rubrica de atendimento, mas não haverá transferência, emissão fiscal ou alteração contábil real. Laudos e receitas são rascunhos de homologação, não documentos médicos oficiais.

### Distribuição por módulo

- **Admin / Agendamento:** 6 tópicos (MVP 3, V1 3, futura 0)
- **Admin / Relatórios:** 6 tópicos (MVP 0, V1 6, futura 0)
- **Admin / Atendimentos:** 2 tópicos (MVP 2, V1 0, futura 0)
- **Admin / Pacientes:** 2 tópicos (MVP 2, V1 0, futura 0)
- **Admin / Médicos:** 2 tópicos (MVP 2, V1 0, futura 0)
- **Admin / Procedimentos:** 3 tópicos (MVP 3, V1 0, futura 0)
- **Admin / Preços:** 1 tópicos (MVP 1, V1 0, futura 0)
- **Admin / Convênios:** 2 tópicos (MVP 2, V1 0, futura 0)
- **Admin / Usuários e perfis:** 2 tópicos (MVP 2, V1 0, futura 0)
- **Admin / Formas de pagamento:** 2 tópicos (MVP 0, V1 2, futura 0)
- **Admin / Textos de laudo:** 3 tópicos (MVP 0, V1 3, futura 0)
- **Admin / Documentos e consentimentos:** 2 tópicos (MVP 0, V1 2, futura 0)
- **Admin / Financeiro:** 4 tópicos (MVP 0, V1 4, futura 0)
- **Admin / Institucional e configuração:** 2 tópicos (MVP 0, V1 1, futura 1)
- **Médico / Atendimento e prontuário:** 3 tópicos (MVP 2, V1 1, futura 0)
- **Médico / Obstetrícia:** 4 tópicos (MVP 0, V1 3, futura 1)
- **Médico / Ginecologia:** 5 tópicos (MVP 0, V1 5, futura 0)
- **Médico / Gráficos:** 1 tópicos (MVP 0, V1 1, futura 0)
- **Médico / Consulta:** 2 tópicos (MVP 2, V1 0, futura 0)
- **Médico / Receituário:** 1 tópicos (MVP 0, V1 1, futura 0)
- **Médico / Anexos e impressão:** 2 tópicos (MVP 0, V1 2, futura 0)
- **Médico / Calculadoras:** 1 tópicos (MVP 0, V1 0, futura 1)
- **Médico / Laudos:** 1 tópicos (MVP 1, V1 0, futura 0)
- **Médico / Agenda:** 1 tópicos (MVP 1, V1 0, futura 0)
- **Médico / Pacientes:** 1 tópicos (MVP 1, V1 0, futura 0)
- **Médico / Relatórios:** 1 tópicos (MVP 0, V1 1, futura 0)
- **Médico / Médicos:** 1 tópicos (MVP 0, V1 1, futura 0)
- **Médico / Configuração:** 2 tópicos (MVP 0, V1 1, futura 1)

## 3. Regras de acesso (PROPOSTAS; não copiadas da fonte)

| Perfil | Permitido na proposta | Negado por padrão |
|---|---|---|
| **Recepção** | Consulta e cadastro de pacientes, agenda e abertura de atendimentos na unidade autorizada | Prescrição, edição de evolução, publicação de laudo e gestão de permissões |
| **Médico** | Consulta de pacientes e atendimentos sob sua autorização, evolução, rascunhos de laudo, impressão de teste | Alteração global de convênio/preço/usuário, acesso indiscriminado a prontuários |
| **Gestão** | Cadastros profissionais, catálogos, convênios, agendas, financeiro e relatórios de sua unidade | Autenticar-se como médico e assinar documento clínico sem competência |
| **Administrador** | Configuração técnica, contas, papéis e integrações conforme política | Acesso irrestrito e automático ao conteúdo médico sem justificativa/controle |

Esta é **política inicial de menor privilégio**, a confirmar. O menu observado no WebUltra não prova autorização funcional.

## 4. Normas de segurança, dados e direitos

- GitHub atual é **público**: usar apenas código original, diagramas próprios e dados sintéticos. Nenhum print identificável, laudo real, CPF, telefone, senha, token, PFX, documento de paciente ou dump será commitado.
- Dados pessoais e clínicos: criptografia em trânsito, controle de acesso por escopo, trilha de auditoria, backup/retensão e verificação LGPD antes de entrada em produção.
- Imagens originais do WebUltra ficam no Drive como **referência interna**, sem republicação no repositório ou no site.
- Interfaces de NFSe, PACS, DICOM, Feegow, WhatsApp, IA e assinatura digital entram somente após validação de contratos, dados, responsabilidade e credenciais adequadas.
- Documentos médicos e regras clínicas exigem revisão do profissional responsável. Nada deve operar clinicamente em ambiente real por padrão.

## 5. Critérios por tela — checklist para desenvolvimento e homologação

O registro JSON contém, **para cada um dos 65 tópicos**, os campos essenciais, ações, permissões propostas, estados de erro, requisito mobile/desktop, teste principal, pendências e status de aceite. Esta tabela é a visão resumida do checklist:

| ID | Perfil | Tela | Entrega | Evidência visual | Aceite principal |
|---|---|---|---|---|---|
| ADM-01 | Admin | Agenda | MVP | Conferida | Agenda configurada e dados sintéticos renderizados na data certa; lista vazia e conflito de horário tratados |
| ADM-02 | Admin | Configuração dos Agendamentos | MVP | Conferida | Agenda cadastrada no sandbox reaparece na lista com horários e estado |
| ADM-03 | Admin | Agenda Substituta | V1 | Conferida | Período de exceção não se sobrepõe sem confirmação e aparece na consulta |
| ADM-04 | Admin | Feriados | V1 | Conferida | Feriado com data válida é registrado; data inválida gera mensagem |
| ADM-05 | Admin | Locais | MVP | Conferida | Local fictício é recuperado na pesquisa e associável a agenda |
| ADM-06 | Admin | Cotas | V1 | Conferida | Regra fictícia aceita limites positivos e rejeita quantidade negativa |
| ADM-07 | Admin | Relatório Analítico Detalhado | V1 | Conferida | Com registros artificiais, exportação inclui apenas linhas do período e filtros |
| ADM-08 | Admin | Relatório Analítico Resumo | V1 | Conferida | Soma e quantidades conferem com conjunto de atendimentos fictícios |
| ADM-09 | Admin | Relatório Faturamento | V1 | Conferida | Resultados por convênio/período são reproduzíveis e não confundem pago com cobrado |
| ADM-10 | Admin | Relatório Caixa (Pgtos) | V1 | Conferida | Total do caixa corresponde a pagamentos de teste autorizados |
| ADM-11 | Admin | Relatório Detalhado Caixa | V1 | Conferida | Filtra médico sem misturar registros de profissionais distintos |
| ADM-12 | Admin | Relatório Solicitantes | V1 | Conferida | Listagem de solicitantes refere-se ao período de teste selecionado |
| ADM-13 | Admin | Atendimentos | MVP | Conferida | Linhas seguem status fictícios; ações sensíveis exigem permissão e auditoria |
| ADM-14 | Admin | Novo atendimento (formulário vazio) | MVP | Conferida | Atendimento artificial salva sem misturar itens, totais ou profissional; campos inválidos bloqueiam |
| ADM-15 | Admin | Listar pacientes | MVP | Conferida | Busca de paciente fictício retorna registro correto e respeita acesso |
| ADM-16 | Admin | Cadastrar paciente | MVP | Conferida | Validação de CPF fictício e campos obrigatórios; histórico auditável; sem CPF real |
| ADM-17 | Admin | Listar Medico | MVP | Conferida | Profissional fictício com CRM/UF aparece em lista e pode ser vinculado à agenda |
| ADM-18 | Admin | Cadastrar Medico | MVP | Conferida | Cadastro administrativo grava sem exigir PFX real; segredo não registrado em logs |
| ADM-19 | Admin | Procedimentos | MVP | Conferida | Catálogo de teste pesquisa pelo nome e exibe códigos e grupo |
| ADM-20 | Admin | Grupo Procedimentos | MVP | Conferida | Grupo criado com dado fictício relaciona-se a procedimento sem duplicar |
| ADM-21 | Admin | Preço Procedimentos | MVP | Conferida | Preço aplicável por data/convênio segue regra aprovada; valores negativos rejeitados |
| ADM-22 | Admin | Convênios | MVP | Conferida | Convênio fictício aparece na lista com tabela vinculada |
| ADM-23 | Admin | Cadastrar Convênio | MVP | Sem captura | Convênio com coparticipação válida salva; imagem original ausente, layout exige validação |
| ADM-24 | Admin | Lista Usuários | MVP | Conferida | Perfil e vínculo médico aplicam bloqueios no servidor em ambiente de teste |
| ADM-25 | Admin | Perfil Usuário | MVP | Conferida | Negar acesso fora da política RBAC; perfil não concede direitos implícitos |
| ADM-26 | Admin | Forma Pgto | V1 | Conferida | Forma de teste aparece com flag fiscal sem emitir documento real |
| ADM-27 | Admin | Cadastrar Forma Pgto | V1 | Conferida | Configuração persiste e emissão fiscal fica bloqueada em ambiente de teste |
| ADM-28 | Admin | Rel. Patológicos (Textos ou Frases Padrões) | V1 | Conferida | Texto fictício entra no editor apropriado sem alterar laudo de terceiros |
| ADM-29 | Admin | Rel. Modelos Padrões (Laudo Normal) | V1 | Conferida | Modelo fictício recarrega sem duplicar e sanitiza HTML do editor |
| ADM-30 | Admin | Substituir Palavras Laudo | V1 | Conferida | Pré-visualização não modifica texto assinado; substituições são previsíveis |
| ADM-31 | Admin | Impressões e/ou Consentimentos Pacientes | V1 | Conferida | Template teste pode ser selecionado para procedimento sem acesso a outro paciente |
| ADM-32 | Admin | Grupo Despesa | V1 | Conferida | Categoria fictícia só é usada por lançamentos de teste |
| ADM-33 | Admin | Grupo Receitas | V1 | Conferida | Categoria fictícia aparece em filtros e não altera caixa automaticamente |
| ADM-34 | Admin | Despesas Recorrentes | V1 | Conferida | Próxima ocorrência é simulada; geração real depende de aprovação |
| ADM-35 | Admin | Financeiro | V1 | Conferida | Total separa previsão de pago e não contabiliza entradas duplicadas |
| ADM-36 | Admin | Termos de Uso | Futura | Conferida | Texto é original e aceite, se exigido, é auditado; não copiar licença do fornecedor |
| ADM-37 | Admin | Configuração | V1 | Conferida | Prévia impressa corresponde à configuração de teste; abas adicionais não presumidas |
| ADM-38 | Admin | Cadastro de procedimento | MVP | Sem captura | Cadastro usa regra aprovada e exibe informação clara apesar da captura ausente |
| ADM-39 | Admin | Cadastro de termo | V1 | Conferida | Modelo substitui marcadores permitidos sem trazer dados de outro paciente |
| MED-01 | Médico | Atendimentos | MVP | Conferida | Médico vê somente registros autorizados; ações negadas não expõem dados |
| MED-02 | Médico | Dados e Histórico do prontuário | MVP | Conferida | Dados aparecem com autoria e data; salvar não altera paciente diferente |
| MED-03 | Médico | Exames Evolução | V1 | Conferida | Evoluções sintéticas separadas por data/tipo; ações de edição auditadas |
| MED-04 | Médico | Dados obstétricos — Dados | V1 | Conferida | Cálculo de idade gestacional fica bloqueado ou validado clinicamente antes de uso |
| MED-05 | Médico | Dados obstétricos — Biometria | V1 | Conferida | Unidades e fórmulas exigem validação clínica e testes de referência |
| MED-06 | Médico | Dados obstétricos — 1º Trimestre | V1 | Conferida | Faixas, unidades e fórmulas validadas com especialista antes de habilitar cálculo |
| MED-07 | Médico | Dados obstétricos — Doppler | Futura | Sem captura | Sem captura própria: interface e cálculos precisam de homologação obstétrica |
| MED-08 | Médico | Dados ginecológicos — Dados | V1 | Conferida | Registro sintético não é salvo por engano ao cancelar |
| MED-09 | Médico | Dados ginecológicos — Medidas | V1 | Conferida | Cálculo de volume validado e tolerância definida antes de uso clínico |
| MED-10 | Médico | Dados ginecológicos — Miomas | V1 | Conferida | Múltiplos miomas registrados sem sobrescrita e com identificação |
| MED-11 | Médico | Dados ginecológicos — Massas Anexiais | V1 | Conferida | Sem inferir escore IOTA; dados estruturados separados da avaliação clínica |
| MED-12 | Médico | Dados ginecológicos — Folículos | V1 | Conferida | Somas por ovário conferem com contagens fictícias |
| MED-13 | Médico | Análises/Gráfico | V1 | Conferida | Curva corresponde aos dados sintéticos, sem alegar referência clínica validada |
| MED-14 | Médico | Consulta Texto | MVP | Conferida | Salvamento com autoria, auditoria, controle de conflito e texto sanitizado |
| MED-15 | Médico | Consulta Planilhada | MVP | Conferida | Valores mantêm tipos e histórico sem misturar texto livre com planilhado |
| MED-16 | Médico | Receituário | V1 | Conferida | Prescrição não é liberada ou assinada sem credencial/validação autorizada |
| MED-17 | Médico | Upload no prontuário | V1 | Conferida | Bloqueia arquivo indevido, acesso de outro paciente e arquivo grande |
| MED-18 | Médico | Impressão | V1 | Conferida | Documento fictício sinalizado TESTE; assinatura real depende de homologação |
| MED-19 | Médico | Calculadoras | Futura | Conferida | Nenhum cálculo de risco clínico liberado sem revisão de fórmula, versão e referência |
| MED-20 | Médico | Laudos Pendentes | MVP | Conferida | Somente médico autorizado acessa laudo; publicação/assinatura separadas de rascunho |
| MED-21 | Médico | Agenda | MVP | Conferida | A agenda médica respeita profissional logado e não expõe agendas proibidas |
| MED-22 | Médico | Lista de pacientes | MVP | Conferida | Médico só vê pacientes permitidos, sem endpoint público irrestrito |
| MED-23 | Médico | Relatório Analítico Detalhado | V1 | Sem captura | Sem print próprio: layout precisa de aprovação e escopo de dados limitado |
| MED-24 | Médico | Lista de médicos | V1 | Conferida | Lista sem dados de credencial ou acesso à edição administrativa |
| MED-25 | Médico | Configuração — Cabeçalho | V1 | Conferida | Não permitir configuração global por perfil médico sem política aprovada |
| MED-26 | Médico | Configurações Consultas | Futura | Sem captura | Ausência de captura e acesso negado prévios; não prometer recurso sem autorização |

## 6. Pontos que dependem de uma decisão sua

| Decisão | Proposta padrão | Alternativa |
|---|---|---|
| **Fidelidade visual** | Reproduzir hierarquia de menus, tipos de telas e campos, mas com visual e código próprios | Ajustar o estilo após protótipo |
| **Primeira entrega** | MVP com **24 tópicos**, incluindo recepção, cadastros, consultas médicas e laudos em rascunho | Alterar a ordem dos módulos |
| **Relatórios/financeiro** | Versão 1, após atendimento com dados sintéticos | Antecipar módulo que você usar primeiro |
| **Documentos médicos assinados** | Bloqueados até assinatura e regras clínicas serem homologadas | Alterar prioridade, mantendo critérios de segurança |
| **Integrações (NFSe, PACS, Feegow etc.)** | Só implementar quando APIs e permissões forem conhecidas | Antecipar descoberta técnica, não ativação real |
| **Papel do administrador** | Sem leitura clínica irrestrita; perfis mínimos | Aprovar exceções auditadas |

### Texto de aprovação sugerido

> **Aprovo a proposta DEV-005 — Critérios de Paridade, versão 1.0**, incluindo distribuição MVP/V1/Futuro, identidade visual própria e validação clínica/financeira antes de uso real. Autorizo seguir para DEV-006 e para a construção dos protótipos em ambiente de testes, sem dados de pacientes.

Se houver ressalvas, ajustar este documento antes de encerrar a DEV-005. **Decisão registrada:** o responsável aprovou explicitamente a proposta DEV-005 v1.0 em 05/11/2026 e autorizou seguir para DEV-006. A aprovação não habilita uso assistencial, assinatura real ou produção.

## 7. Rastreabilidade e próximos passos

- [x] Preparados critérios para as **65** telas/tópicos com testes e dados exibidos.
- [x] Proposta de fases MVP / V1 / Futura e papéis de acesso.
- [x] Padrões de qualidade, visual, segurança e checklist mensurável.
- [x] Itens não validados identificados sem presumir funcionamento.
- [x] **Aprovação explícita do responsável** recebida em conversa em 05/11/2026, sem ressalvas.
- [x] Encerramento da issue DEV-005 autorizado pelo responsável.
- [x] Autorizado iniciar DEV-006 — mapeamento detalhado de jornadas completas, conforme cronograma.

**Fontes:** [Pasta Drive](https://drive.google.com/drive/folders/197rL9plJRd9hQYHAzOEOHR8xY-Q-XXE8), [manuais](https://drive.google.com/file/d/1BxsC35dauQ7ByHGgG7NtBaBj6GDxIgJG/view) [médico](https://drive.google.com/file/d/1Kco9DwEOoLhtS5I9vzuonn_GSGcAgrO6/view), [DEV-002](DEV-002_MATRIZ_VISUAL.md), [DEV-004](DEV-004_MAPA_FUNCIONAL.md), [inventário DEV-004](DEV-004_TELAS.json).
