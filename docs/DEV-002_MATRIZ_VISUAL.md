# DEV-002 — Matriz de verificação visual das telas

**Inspeção visual:** 05/11/2026. **Projeto:** Projeto Piloto. **Status da tarefa:** concluída quanto ao cotejo tela × imagem; funcionalidade, cálculos e permissões **não homologados**.

## Método de conferência

Foram lidos os dois manuais e abertos visualmente os 37 JPG do pacote administrativo, os 23 JPG do pacote médico e o JPG adicional de laudos pendentes. Foram usadas pranchas de quatro capturas por vez, conservando título, menu e corpo principal da tela. A inspeção confirma a **identificação visual do módulo** e coerência geral com o tópico; **não** confirma a legibilidade de todos os campos de formulários longos, regras de negócio, ações executadas ou conteúdo de prontuários. Nenhuma captura foi copiada para o repositório público.

**Inventário fechado:** 39 tópicos administrativos, dos quais 37 com captura; 26 tópicos médicos, dos quais 23 com captura; 1 JPG complementar de laudos pendentes. **Total: 61 JPG, com 61 hashes SHA-256 distintos**. O complementar mostra o mesmo módulo que o tópico médico 20, mas é outro arquivo; não representa tela adicional.

## Matriz administrativa

| Tela | Identificação funcional do manual | Evidência (no ZIP administrativo) | Conferência visual |
|---|---|---|---|
| ADM-01 | Agenda | `prints/01_showagenda.jpg` | Módulo/controles principais compatíveis. Captura parcial, com foco em cabeçalho/lista. |
| ADM-02 | Configuração dos Agendamentos | `prints/02_configuracao_agendas.jpg` | Módulo/controles principais compatíveis. |
| ADM-03 | Agenda Substituta | `prints/03_agenda_substituta.jpg` | Módulo/controles principais compatíveis. |
| ADM-04 | Feriados | `prints/04_feriados.jpg` | Módulo/controles principais compatíveis. |
| ADM-05 | Locais | `prints/05_locais.jpg` | Módulo/controles principais compatíveis. |
| ADM-06 | Cotas | `prints/06_cotas.jpg` | Módulo/controles principais compatíveis. |
| ADM-07 | Relatório Analítico Detalhado | `prints/07_relatorio_analitico.jpg` | Módulo/controles principais compatíveis. |
| ADM-08 | Relatório Analítico Resumo | `prints/08_relatorio_resumo.jpg` | Módulo/controles principais compatíveis. |
| ADM-09 | Relatório Faturamento | `prints/09_relatorio_faturamento.jpg` | Módulo/controles principais compatíveis. |
| ADM-10 | Relatório Caixa (Pgtos) | `prints/10_relatorio_caixa.jpg` | Módulo/controles principais compatíveis. |
| ADM-11 | Relatório Detalhado Caixa | `prints/11_relatorio_caixa_detalhado.jpg` | Módulo/controles principais compatíveis. |
| ADM-12 | Relatório Solicitantes | `prints/12_relatorio_solicitantes.jpg` | Módulo/controles principais compatíveis. |
| ADM-13 | Atendimentos | `prints/13_atendimentos.jpg` | Módulo/controles principais compatíveis. |
| ADM-14 | Novo atendimento (formulário vazio) | `prints/14_novo_atendimento.jpg` | Módulo/controles principais compatíveis. Tela longa: revisão detalhada dos campos permanece pendente. |
| ADM-15 | Listar pacientes | `prints/15_lista_pacientes.jpg` | Módulo/controles principais compatíveis. Captura parcial, com foco em cabeçalho/lista. |
| ADM-16 | Cadastrar paciente | `prints/16_cadastro_paciente.jpg` | Módulo/controles principais compatíveis. Tela longa: revisão detalhada dos campos permanece pendente. |
| ADM-17 | Listar Medico | `prints/17_lista_medicos.jpg` | Módulo/controles principais compatíveis. |
| ADM-18 | Cadastrar Medico | `prints/18_cadastro_medico.jpg` | Módulo/controles principais compatíveis. Tela longa: revisão detalhada dos campos permanece pendente. |
| ADM-19 | Procedimentos | `prints/19_procedimentos.jpg` | Módulo/controles principais compatíveis. |
| ADM-20 | Grupo Procedimentos | `prints/20_grupo_procedimentos.jpg` | Módulo/controles principais compatíveis. Captura parcial, com foco em cabeçalho/lista. |
| ADM-21 | Preço Procedimentos | `prints/21_preco_procedimentos.jpg` | Módulo/controles principais compatíveis. |
| ADM-22 | Convênios | `prints/22_convenios.jpg` | Módulo/controles principais compatíveis. Captura parcial, com foco em cabeçalho/lista. |
| ADM-23 | Cadastrar Convênio | **Sem captura** | Sem imagem no pacote; documentado apenas em texto. |
| ADM-24 | Lista Usuários | `prints/24_usuarios.jpg` | Módulo/controles principais compatíveis. Captura parcial, com foco em cabeçalho/lista. |
| ADM-25 | Perfil Usuário | `prints/25_perfis.jpg` | Módulo/controles principais compatíveis. |
| ADM-26 | Forma Pgto | `prints/26_formas_pagamento.jpg` | Módulo/controles principais compatíveis. |
| ADM-27 | Cadastrar Forma Pgto | `prints/27_cadastro_forma_pagamento.jpg` | Módulo/controles principais compatíveis. |
| ADM-28 | Rel. Patológicos (Textos ou Frases Padrões) | `prints/28_frases_padrao.jpg` | Módulo/controles principais compatíveis. |
| ADM-29 | Rel. Modelos Padrões (Laudo Normal) | `prints/29_modelos_laudo.jpg` | Módulo/controles principais compatíveis. Tela longa: revisão detalhada dos campos permanece pendente. |
| ADM-30 | Substituir Palavras Laudo | `prints/30_substituir_palavras.jpg` | Módulo/controles principais compatíveis. |
| ADM-31 | Impressões e/ou Consentimentos Pacientes | `prints/31_documentos_pacientes.jpg` | Módulo/controles principais compatíveis. Captura parcial, com foco em cabeçalho/lista. |
| ADM-32 | Grupo Despesa | `prints/32_grupo_despesas.jpg` | Módulo/controles principais compatíveis. |
| ADM-33 | Grupo Receitas | `prints/33_grupo_receitas.jpg` | Módulo/controles principais compatíveis. |
| ADM-34 | Despesas Recorrentes | `prints/34_despesas_recorrentes.jpg` | Módulo/controles principais compatíveis. |
| ADM-35 | Financeiro | `prints/35_financeiro.jpg` | Módulo/controles principais compatíveis. |
| ADM-36 | Termos de Uso | `prints/36_termos_de_uso.jpg` | Módulo/controles principais compatíveis. Tela longa: revisão detalhada dos campos permanece pendente. |
| ADM-37 | Configuração | `prints/37_configuracao_geral.jpg` | Módulo/controles principais compatíveis. Tela longa: revisão detalhada dos campos permanece pendente. |
| ADM-38 | Cadastro de procedimento | **Sem captura** | Sem imagem no pacote; documentado apenas em texto. |
| ADM-39 | Cadastro de termo | `prints/39_cadastro_documento.jpg` | Módulo/controles principais compatíveis. |

**Lacunas administrativas:** ADM-23 (Cadastrar Convênio) e ADM-38 (Cadastro de procedimento) não possuem JPG nos pacotes revisados. Os atalhos de dashboards e Gerar Link, indicados como rotas 40–42 no inventário técnico, não foram abertos nesta execução e não integram as 39 telas capturadas.

## Matriz do perfil médico

| Tópico | Assunto apresentado | Arquivo JPG no ZIP médico | Validação visual |
|---|---|---|---|
| MED-01 | Atendimentos | `prints/01_01_atendimentos.jpg` | Tela correspondente confirmada. |
| MED-02 | Dados e Histórico do prontuário | `prints/02_02_prontuario.jpg` | Tela correspondente confirmada. |
| MED-03 | Exames Evolução | `prints/03_03_evolucao.jpg` | Tela correspondente confirmada. |
| MED-04 | Dados obstétricos — Dados | `prints/04_04_adicionar_dados.jpg` | Tela correspondente confirmada. |
| MED-05 | Dados obstétricos — Biometria | `prints/05_08_primeiro_trimestre.jpg` | **Nome herdado divergente:** Arquivo aponta para 'primeiro_trimestre', mas a imagem mostra os campos de BIOMETRIA (DBP, CC, CA, CF e ILA). |
| MED-06 | Dados obstétricos — 1º Trimestre | `prints/06_09_doppler.jpg` | **Nome herdado divergente:** Arquivo aponta para 'doppler', mas a imagem mostra a aba 1º TRIMESTRE (saco gestacional, CCN e TN). |
| MED-07 | Dados obstétricos — Doppler | **Sem captura** | **Captura não disponível**. Abas foram exibidas no modal, porém os campos Doppler não aparecem em captura própria. |
| MED-08 | Dados ginecológicos — Dados | `prints/08_11_medidas.jpg` | **Nome herdado divergente:** Arquivo aponta para 'medidas', mas a imagem mostra a aba DADOS ginecológicos. |
| MED-09 | Dados ginecológicos — Medidas | `prints/09_12_miomas.jpg` | **Nome herdado divergente:** Arquivo aponta para 'miomas', mas a imagem mostra a aba MEDIDAS ginecológicas. |
| MED-10 | Dados ginecológicos — Miomas | `prints/10_13_massas_anexiais.jpg` | **Nome herdado divergente:** Arquivo aponta para 'massas_anexiais', mas a imagem mostra a aba MIOMAS. |
| MED-11 | Dados ginecológicos — Massas Anexiais | `prints/11_14_foliculos.jpg` | **Nome herdado divergente:** Arquivo aponta para 'foliculos', mas a imagem mostra a aba MASSAS ANEXIAIS. |
| MED-12 | Dados ginecológicos — Folículos | `prints/12_17_impressao.jpg` | **Nome herdado divergente:** Arquivo aponta para 'impressao', mas a imagem mostra a aba FOLÍCULOS. |
| MED-13 | Análises/Gráfico | `prints/13_27_modal_evolucao.jpg` | Tela correspondente confirmada. |
| MED-14 | Consulta Texto | `prints/14_05_consulta_texto.jpg` | Tela correspondente confirmada. |
| MED-15 | Consulta Planilhada | `prints/15_06_consulta_planilhada.jpg` | Tela correspondente confirmada. |
| MED-16 | Receituário | `prints/16_15_receituario.jpg` | Tela correspondente confirmada. |
| MED-17 | Upload no prontuário | `prints/17_16_upload.jpg` | Tela correspondente confirmada. |
| MED-18 | Impressão | `prints/18_18_calculadoras_L.jpg` | **Nome herdado divergente:** Arquivo aponta para 'calculadoras_L', mas a imagem mostra a tela de IMPRESSÃO / atestado. |
| MED-19 | Calculadoras | `prints/19_18_calculadoras_R.jpg` | Tela correspondente confirmada. |
| MED-20 | Laudos Pendentes | `prints/20_prev.jpg` | Tela correspondente confirmada. Apenas cabeçalho/filtros de laudos pendentes, sem grade completa. |
| MED-21 | Agenda | `prints/21_21_agenda.jpg` | Tela correspondente confirmada. |
| MED-22 | Lista de pacientes | `prints/22_23_cadastro_paciente.jpg` | **Nome herdado divergente:** Arquivo aponta para 'cadastro_paciente', mas a imagem mostra a LISTA de pacientes. |
| MED-23 | Relatório Analítico Detalhado | **Sem captura** | **Captura não disponível**. |
| MED-24 | Lista de médicos | `prints/24_25_medicos.jpg` | Tela correspondente confirmada. |
| MED-25 | Configuração — Cabeçalho | `prints/25_26_termos.jpg` | **Nome herdado divergente:** Arquivo aponta para 'termos', mas a imagem mostra CONFIGURAÇÃO, aba Cabeçalho. |
| MED-26 | Configurações Consultas | **Sem captura** | **Captura não disponível**. |

**JPG adicional:** `Webultra_Medico_Laudos_Pendentes.jpg` mostra a barra/filtros de laudos pendentes, associada a MED-20. É um arquivo **distinto**, mas não acrescenta o editor de laudo nem evidência sobre assinatura/publicação.

## Correções importantes para a fase de UI/UX

1. **Usar o conteúdo da imagem como verdade sobre o assunto da captura, não o nome antigo do JPG.** Há **10 nomes herdados divergentes** no conjunto médico (MED-05, 06, 08, 09, 10, 11, 12, 18, 22 e 25). Manter os arquivos originais intocados no Drive; esta tabela é a relação corrigida.
2. Para o fluxo médico, separar **Dados e Histórico**, **Consulta Texto**, **Consulta Planilhada**, **Receituário**, **Impressão**, **Exames Evolução** e **Laudos Pendentes**. São ferramentas distintas, ainda que compartilhem um cabeçalho de prontuário.
3. Para dados de evolução, usar grupos de abas obstétricas (**Dados, Biometria, 1º Trimestre, Doppler**) e ginecológicas (**Dados, Medidas, Miomas, Massas Anexiais, Folículos**). Não presumir cálculos médicos validados pela presença de campos.
4. Para recepção/administração, preservar separação entre **agenda regular**, **agenda substituta**, **cotas**, **paciente**, **novo atendimento**, **listagem de atendimentos**, **modelos de laudo**, **pagamentos** e **financeiro**.
5. Configuração — apenas a aba **Cabeçalho** foi capturada. Permanecem sem inspeção funcional: Agendamento, Textos Atendimento, Local Senha, Patologias, NFSe, PACS, Integração Pleno, Integração Feegow, API WebUltra e Servidor Dicom Web.
6. Antes de homologação: verificar permissões de usuário/perfil, fluxos de salvamento, impressão, NFSe, assinatura, emissão, integração Feegow/PACS/DICOM e o editor completo de laudo. Não testar no sistema de produção com pacientes reais.

## Referências e segurança

- [Manual e imagens administrativos — ZIP](https://drive.google.com/file/d/1RuKj5nrzq5PZ0Yg_RSh3whZiB-37oeT4/view)
- [Manual e imagens do perfil médico — ZIP](https://drive.google.com/file/d/1YJFTi5DIiHQeU6S7Z-AcUFQ5VjbTGUv6/view)
- [Perfil médico — ZIP complementar](https://drive.google.com/file/d/1auuxTkiDQ-z6Ong-IRko2oPwdzCEAIjx/view)
- [Manual administrativo (TXT)](https://drive.google.com/file/d/1BxsC35dauQ7ByHGgG7NtBaBj6GDxIgJG/view)
- [Manual médico (TXT)](https://drive.google.com/file/d/1Kco9DwEOoLhtS5I9vzuonn_GSGcAgrO6/view)

O objetivo é uma implementação **original** inspirada em fluxos identificados; **não copiar** HTML, imagens do fornecedor, textos proprietários, prontuários, certificados, dados pessoais ou credenciais para este GitHub público.