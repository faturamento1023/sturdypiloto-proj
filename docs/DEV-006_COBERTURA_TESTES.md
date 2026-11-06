# DEV-006 — Cobertura de testes do domínio (protótipo)

Data: 05/11/2026. Branch `dev-006-jornadas-ux`. Escopo isolado, sem paciente, sem assinatura e sem persistência.

| Cenário | Cobertura atual | Limitação |
|---|---|---|
| QA-01 | Parcial: objeto de reserva sem atendimento | Não há repositório persistente |
| QA-02 | Unitária: vinculação explícita | Falta autorização em servidor |
| QA-03 | Parcial: bloqueia abertura de reserva cancelada | Não testa auditoria histórica |
| QA-04 | Unitária: detecta sobreposição | Falta bloqueio transacional em banco |
| QA-05 | Não implementado | Exige autenticação/autorização HTTP |
| QA-06 | Parcial: edição de rascunho autorizada | Não testa salvar/reabrir em banco |
| QA-07 | Unitária: bloqueio de edição por autor divergente | Falta controle de rota e escopo da unidade |
| QA-08 | Unitária: rejeita versão obsoleta | Falta transação persistente |
| QA-09 | Indireta: bloqueia edição de finalizada | A exibição de assinatura de rascunho continua sem teste |
| QA-10 | Unitária: impede liberação antes da revisão | Falta endpoint de publicação |
| QA-11 | Parcial: transição devolvido→rascunho | Não testa motivo persistido |
| QA-12–13 | Não implementados | Exigem identidade de revisor/assinante e autorização |
| QA-14 | Indireta: laudo liberado não muda de estado | A rejeição de publicação de versão substituída continua sem teste |
| QA-15–17 | Unitária: cálculos em centavos | Não testa lançamentos/caixa |
| QA-18 | Unitária: autorização de desconto por papel | Falta auditoria e política operacional |
| QA-19 | Não implementado | Exige relatório consolidado |

## Execução local em 05/11/2026

- `node scripts/validate-ux.mjs` passou com 65 referências de tela, 7 jornadas, 53 passos e 17 passos propostos.
- `node --test prototype/contracts/domain.test.ts` passou com 20 testes unitários. A tabela distingue cobertura unitária, parcial, indireta e pendente. O domínio usa dados sintéticos e funções em memória.
- Exercício local do JavaScript da recepção em DOM simulado. A versão anterior fechava o formulário ao detectar conflito. Na versão corrigida, foram verificados abertura e fechamento do formulário, preservação dos campos, reserva separada, abertura explícita, cancelamento, reutilização de horário cancelado, pesquisa e filtros. Layout e renderização ainda requerem verificação em navegador.
- QA operacional dos perfis, persistência, autorização HTTP, assinatura, auditoria, relatórios e integração financeira permanecem como escopos de teste posteriores. A conferência do GitHub Actions deve usar o commit atualizado do PR.

O [aceite do mapa da DEV-006](DEV-006_CHECKLIST_VALIDACAO.md#registro-de-decisão) encerra a etapa documental. A matriz de validação separa as decisões técnicas de protótipo das questões operacionais abertas.
