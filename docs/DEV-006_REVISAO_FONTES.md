# DEV-006 — Revisão documental cruzada das jornadas (05/11/2026)

**Estado:** revisão de evidências concluída; **validação operacional com usuários e homologação clínica pendentes**. Esta análise não acessou nem modificou o WebUltra de produção.

## 1. Fontes efetivamente consultadas

- [Manual administrativo do WebUltra — 39 telas / 37 capturas](https://drive.google.com/file/d/1BxsC35dauQ7ByHGgG7NtBaBj6GDxIgJG/view)
- [Manual do perfil médico — 26 tópicos / 23 capturas](https://drive.google.com/file/d/1Kco9DwEOoLhtS5I9vzuonn_GSGcAgrO6/view)
- [Cronograma oficial, etapa 02: UX e arquitetura](https://docs.google.com/spreadsheets/d/1URCRm870bdDhFTwooJPgCiczzuCtqaYC/edit)
- [DEV-004: inventário estruturado](DEV-004_TELAS.json)
- [DEV-005: critérios de paridade aprovados](DEV-005_CRITERIOS_PARIDADE.md)
- [DEV-006: 7 jornadas / 53 passos](DEV-006_JORNADAS.json)

Os manuais descrevem **consulta visual sem salvar, editar, assinar ou emitir**. Um botão visível, inclusive `Salvar`, **não comprova que o comportamento foi executado ou funciona**. O campo `evidence=observado` do JSON tem apenas esse significado. A revisão acrescentou `functional_tested=false`, `action_is_proven=false`, `clinically_approved=false` e referência de seção dos manuais a cada um dos **53 passos**.

## 2. Confronto por jornada

| Jornada | Conferência com os manuais | Decisão e pendência |
|---|---|---|
| UX-01 — Configuração | Admin 17–23, 25, 38, 02 e 05 documentam profissionais, catálogo, preços, convênios e agendas. | Sequência de dependências é **proposta**; ADM-23 e ADM-38 não têm captura própria. Certificado A1/PFX não deve ser usado em teste. |
| UX-02 — Agendamento | Admin 01–06 e 15–16 documentam filtros, grade, pacientes, feriados, cotas e locais. | Marcar horário, aplicação de cota, bloqueio de feriado e prevenção de dupla reserva **não foram testados**. Confirmação de reserva é proposta. |
| UX-03 — Atendimento | Admin 13–14 mostram formulário vazio, paciente, convênio, procedimentos, pagamentos e `Salvar`. | O manual confirma **existência de controles**, não criação de atendimento nem preço automático. Pagamento parcial, concorrência e auditoria são regras novas. |
| UX-04 — Prontuário/consulta | Médico 01–02, 14–18 mostram acesso, editores Texto/Planilhada, receituário, upload e impressão. | Nenhuma consulta foi gravada; controle de versões, rascunho e RBAC server-side são propostos. Não gerar receita real. |
| UX-05 — Evolução de exames | Médico 03–13 mostra abas obstétricas/ginecológicas e gráfico. | Doppler MED-07 não tem captura validada; fórmulas, unidades e interpretação clínica não foram validadas. |
| UX-06 — Laudos | Médico 20 mostra lista de pendentes e atalho; admin 28–30 mostra modelos e frases; 37 cabeçalho. | **Editor de laudo não foi aberto** na coleta; edição, revisão, assinatura e publicação são propostas. Manter só rascunho de teste. |
| UX-07 — Financeiro | Admin 07–12, 13–14, 21, 26–27, 32–35 mostram parâmetros de relatórios, valores e lançamentos. | **Nenhum relatório foi gerado nem lançamento salvo**; vínculo entre caixa e financeiro, NFSe, recorrência e reconciliação são propostas. |

## 3. Inconsistências e riscos encontrados

1. **Ambiguidade de “observado”:** vários passos descrevem o resultado esperado de salvar/confirmar. Isso não equivale a resultado obtido no sistema de origem. A proveniência por passo agora explicita que a ação não foi comprovada.
2. **Capturas ausentes:** `ADM-23`, `ADM-38` e `MED-07` aparecem nas jornadas, mas sem imagem validada. `MED-23` e `MED-26` também faltam no inventário geral; não são usados nos passos da DEV-006. Os 10 nomes de JPG médicos divergentes devem ser conferidos pelo conteúdo, não pelo nome.
3. **Agendamento versus atendimento:** o manual administrativo afirma que os controles da agenda **não substituem** o registro de atendimento; portanto, a ligação entre reserva e atendimento não deve ser implementada como automação comprovada.
4. **Preço e recebimento:** a aplicação automática do preço é explicitamente não testada; valor de tabela, cobrado, pago, receita e saldo devem permanecer conceitos distintos.
5. **Perfil médico:** o menu visível não prova acesso às rotas administrativas; Questionário Médico exibiu acesso negado em sessão anterior. O Projeto Piloto exige política própria e testes negativos.
6. **Laudo e assinatura:** não há prova do editor, publicação, envio ou uso do certificado; PDF de demonstração não pode aparentar documento clínico assinado.
7. **Cronograma desatualizado:** a planilha ainda afirma ausência dos JPG médicos. A correção consta na DEV-002/DEV-003; **não foi alterada a planilha original** nesta revisão.

## 4. Matriz de decisões de UX para o protótipo

| Decisão | Tratamento seguro no protótipo | Validação necessária |
|---|---|---|
| Reserva de horário | Tela com estados disponível/ocupado, confirmação **simulada** | Regras de cotas, feriados e substituição |
| Paciente → atendimento | Fluxo com vínculo explícito e revisão antes de salvar | Origem do agendamento e permissões |
| Preço | Campo visível com origem de tabela e aviso se ausente | Vigência, convênio, descontos, pagamento |
| Consulta | Editor original com rascunho sintético e histórico de versões fictício | Autoria, retificação e persistência |
| Laudo | Fila e rascunho de teste, sem assinatura/publicação | Editor, papéis, modelos, versão e impressão |
| Financeiro | Resumo demonstrativo com valores e datas distintas | Conciliação, lançamentos e NFSe |
| Acesso médico | Negar por padrão rotas não autorizadas | Revisão com médico/gestor e teste server-side |

## 5. Verificação e pendências

- [x] Manuais administrativo e médico lidos e confrontados com as 7 jornadas.
- [x] Referências de seção, ausência de imagem e estado de não teste registrados em cada passo no JSON.
- [x] Decisões propostas, riscos e discrepâncias do cronograma documentados.
- [ ] Conferência conjunta com pessoas autorizadas dos perfis administrativo e médico.
- [ ] Confirmação das regras operacionais ainda inferidas.
- [ ] Aceite final do mapa para DEV-007 e merge do PR, após CI verde.

**Próxima ação:** revisar as sete jornadas com o responsável e o profissional médico, com foco nos itens da matriz acima. Sem essa revisão não declarar DEV-006 concluída, nem criar o protótipo Figma como etapa concluída.
