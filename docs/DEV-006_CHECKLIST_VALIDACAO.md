# DEV-006 — Checklist de validação por perfil (v0.1)

Data: 05/11/2026. **Aceite do responsável pelo projeto registrado em 05/11/2026 para o checklist e prosseguimento da revisão documental; não representa resposta individual às 12 questões nem homologação clínica/funcional.** Base: DEV-005 v1.0, DEV-006 jornadas v0.2, revisão documental e cronograma. Não contém pacientes, imagens proprietárias ou credenciais.

Para cada item, registrar: **Confirmado / Corrigir / Indeterminado**, regra exata, papel do revisor, data e evidência não sensível. A visualização de controles no WebUltra não prova que a ação funciona.

| ID | Revisor | Questão de validação | Jornada | Situação |
|---|---|---|---|---|
| V01 | Administrativo | Quais perfis podem cadastrar/inativar profissionais, procedimentos e convênios? | UX-01 | Pendente |
| V02 | Administrativo | Preço é preenchido automaticamente? Como funcionam vigência, convênio e descontos? | UX-01/03 | Pendente; automação não comprovada |
| V03 | Recepção | Como feriados, cotas, conflito, exceção e substituição bloqueiam horários? | UX-02 | Pendente |
| V04 | Recepção | Agendamento cria atendimento ou requer ação separada? Como cancelar/remarcar? | UX-02/03 | Pendente; vínculo proposto |
| V05 | Administrativo | Como diferenciar valor de tabela, cobrado, pago, caixa e receita? | UX-03/07 | Pendente |
| V06 | Médico | Como salvar rascunho, corrigir e imprimir consulta narrativa/planilhada? | UX-04 | Pendente; gravação não testada |
| V07 | Médico e gestor | Quais dados e rotas o médico pode acessar? Quais devem retornar acesso negado? | UX-04 | Pendente |
| V08 | Médico | Quais fórmulas, unidades e limites clínicos exigem validação especializada? | UX-05 | Pendente; cálculos não homologados |
| V09 | Médico e gestor | Há editor de laudos? Quais regras de revisão, assinatura e publicação? | UX-06 | Pendente; editor não observado |
| V10 | Administrativo | Como surgem lançamentos, relatórios e NFSe? Há integração com caixa? | UX-07 | Pendente; integração proposta |
| V11 | Ambos | Quais estados de erro, duplicidade, acesso negado e recuperação são necessários? | UX-01–07 | Pendente |
| V12 | Ambos | A navegação desktop e celular atende os objetivos de cada perfil? | UX-01–07 | Pendente |

## Registro de decisão

| ID | Decisão validada | Papel responsável | Data | Evidência permitida | Passos afetados |
|---|---|---|---|---|---|
| ACEITE-01 | Responsável pelo projeto declarou «Validado» em conversa, após apresentação do checklist e do CI; aceite do documento para prosseguir, sem respostas técnicas específicas | Responsável pelo projeto | 05/11/2026 | Registro textual de aceite, sem dados clínicos | Documento DEV-006; V01–V12 permanecem pendentes de confirmação detalhada |

## Critério de saída DEV-006

- Registrar revisão dos perfis administrativo e médico, com discordâncias e pendências.
- Reconciliar decisões aprovadas com JSON e wireflows; não converter hipótese em fato observado.
- Rodar validador de UX e conferir GitHub Actions no PR #5.
- Registrar aceite documental, commit e testes antes de mesclar, encerrar Issue #4 ou iniciar DEV-007.

Bloqueios: revisão humana pendente; ADM-23, ADM-38 e MED-07 sem captura validada; cronograma Excel original com informação desatualizada sobre JPG médicos. Nenhuma alteração no WebUltra original.
