# Inventário documental e matriz de evidências — Projeto Piloto

**Data-base:** 05/11/2026 • **Tarefa:** DEV-001 (conciliação documental) • **Origem:** pasta Web Ultra no Google Drive.

## Referências verificadas

| Fonte | Evidência | Observação |
|---|---|---|
| [Inventário técnico](https://drive.google.com/file/d/1m9Ph8nWxSbfEegFhZJzNxOPwtarbOt9u/view) | Rotas e controles de 39 telas administrativas, 3 rotas problemáticas | É coleta de interface, não código-fonte |
| [Manual visual administrativo](https://drive.google.com/file/d/1BxsC35dauQ7ByHGgG7NtBaBj6GDxIgJG/view) | 39 tópicos descritos | Capturas 23 e 38 não confirmadas no conjunto avulso |
| [Manual visual administrativo HTML](https://drive.google.com/file/d/15LCksfK-B44JEU4zHzGB8LiS9w4XwD6_/view) | Estrutura de manual e caminhos relativos | Manter organização `prints/` em exportações |
| [Guia de operação DM](https://drive.google.com/file/d/1Aqp6rbzvGJsKCaZrHZagCAwov76-WRRn/view) | Fluxos e contexto histórico | Valores/configurações históricas não comprovam comportamento atual |
| [Manual médico](https://drive.google.com/file/d/1Kco9DwEOoLhtS5I9vzuonn_GSGcAgrO6/view) | 26 tópicos clínicos e 23 referências de imagem | Identificação de pacientes ocultada na coleta original |
| [Pacote visual médico](https://drive.google.com/file/d/1YJFTi5DIiHQeU6S7Z-AcUFQ5VjbTGUv6/view) | ZIP com HTML, TXT e **23 JPG** em `prints/` | **LOCALIZADO**: as imagens não estavam ausentes, só compactadas |
| [Pacote clínico adicional](https://drive.google.com/file/d/1auuxTkiDQ-z6Ong-IRko2oPwdzCEAIjx/view) | ZIP com 1 TXT e 1 JPG da tela de laudos pendentes | Evidência complementar, comportamento não testado |
| [Planilha de cronograma](https://docs.google.com/spreadsheets/d/1URCRm870bdDhFTwooJPgCiczzuCtqaYC/edit) | 14 fases, 70 tarefas, 39 telas administrativas, 26 tópicos médicos | Fonte do controle de execução |

## Cobertura administrativa

**39 telas documentadas e 37 JPEGs visivelmente conferidos no ZIP administrativo.**

| Grupo | Itens descritos | Função |
|---|---|---|
| Agenda | 01–06 | Visualização, configuração, substitutas, feriados, locais, cotas |
| Relatórios | 07–12 | Analítico, resumo, faturamento, caixa, caixa detalhado, solicitantes |
| Atendimentos | 13–14 | Lista e novo atendimento |
| Pacientes | 15–16 | Lista e cadastro |
| Médicos | 17–18 | Lista e cadastro |
| Procedimentos | 19–21 e 38 | Lista, grupos, preços e formulário de procedimento |
| Convênios | 22–23 | Lista e cadastro |
| Usuários e acesso | 24–25 | Usuários e perfis |
| Pagamento | 26–27 | Lista e cadastro de formas de pagamento |
| Conteúdo clínico | 28–31 e 39 | Textos, modelos de laudo, substituições, documentos, cadastro de termo |
| Financeiro | 32–35 | Grupos, recorrências e painel financeiro |
| Configurações | 36–37 | Termos de uso e configurações gerais |

**Pendências:** imagens não confirmadas para cadastro de convênio (23) e cadastro de procedimento (38). O inventário inclui três rotas de acesso problemático: Gráficos Agendamento (40), Dashboard Agendamentos (41) e Gerar Link (42). Seu funcionamento não está homologado.

## Cobertura médica

**26 tópicos documentados, 23 imagens JPG recuperadas e conferidas visualmente no ZIP médico e 1 captura complementar de laudos pendentes.** Os tópicos incluem:

- Atendimentos, Dados e Histórico do prontuário, Exames Evolução;
- Dados obstétricos: Dados, Biometria, 1º Trimestre e Doppler;
- Dados ginecológicos: Dados, Medidas, Miomas, Massas Anexiais e Folículos;
- Gráficos clínicos, Consulta Texto, Consulta Planilhada e Receituário;
- Upload, Impressão, Calculadoras, Laudos Pendentes, Agenda, Pacientes, Médicos e Configuração.

**Não confundir presença de imagem com funcionalidade validada.** A aba Doppler obstétrico, a abertura do editor de laudos, emissão/assinatura, recursos de IA e várias configurações continuam sem teste. Foi verificada a divergência entre o nome herdado e o conteúdo visual de **10 imagens médicas**; a tabela de correção está em [DEV-002 — Matriz visual](DEV-002_MATRIZ_VISUAL.md).

## Etiquetas obrigatórias de evidência

- **Documentado:** texto do manual descreve a função.
- **Capturado:** arquivo de imagem existe e foi relacionado ao tópico.
- **Inspecionado:** imagem individual foi aberta e comparada com o manual.
- **Testado:** ação executada de modo controlado, sem dados reais.
- **Homologado:** comportamento e permissões aprovados pelo responsável.

## Resultado da revisão visual — DEV-002\n\nA revisão identificou **61 JPG distintos**, sendo 37 administrativos, 23 médicos e 1 complementar de laudos pendentes. **Dez nomes de arquivos médicos são enganosos** quanto à tela exibida; o mapeamento correto está em [docs/DEV-002_MATRIZ_VISUAL.md](DEV-002_MATRIZ_VISUAL.md). Permanecem lacunas visuais para ADM-23, ADM-38, MED-07, MED-23 e MED-26. Não foram executados testes de salvamento, impressão, assinatura, integrações ou regras clínicas.\n\n## Checklist da tarefa DEV-002

- [ ] Conferir visualmente os 37 JPG administrativos e corrigir divergências de nome/tela.
- [ ] Conferir visualmente os 23 JPG do ZIP médico e capturas adicionais.
- [ ] Validar imagens das telas ADM-23 e ADM-38; registrar falta se não houver.
- [ ] Documentar as abas internas de Configuração ainda não inspecionadas.
- [ ] Não copiar dados, imagens identificáveis ou arquivos do fornecedor para repositório público.

**Regra:** as funcionalidades do Projeto Piloto deverão ser implementadas de forma original, sem reproduzir código e ativos proprietários. Este documento lista fatos de documentação, não testes funcionais do WebUltra.
