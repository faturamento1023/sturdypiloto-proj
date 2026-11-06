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
| QA-09 | Parcial: bloqueia edição de finalizada | Não testa apresentação de assinatura |
| QA-10 | Unitária: impede liberação antes da revisão | Falta endpoint de publicação |
| QA-11 | Parcial: transição devolvido→rascunho | Não testa motivo persistido |
| QA-12–13 | Não implementados | Exigem identidade de revisor/assinante e autorização |
| QA-14 | Parcial: laudo liberado não muda de estado | Não testa substituição de versão |
| QA-15–17 | Unitária: cálculos em centavos | Não testa lançamentos/caixa |
| QA-18 | Unitária: autorização de desconto por papel | Falta auditoria e política operacional |
| QA-19 | Não implementado | Exige relatório consolidado |

**Importante:** arquivos de teste presentes não significam testes executados. O GitHub Actions foi configurado, mas a consulta ao commit `b449163` não retornou workflow associado. A CI deve ser conferida antes de qualquer merge. Os testes de unidade são necessários, mas insuficientes para segurança clínica ou financeira.

Próximas entregas: executar CI; criar serviço de teste com persistência sintética, controle de permissões e auditoria; expandir QA-05, QA-12, QA-13 e QA-19. DEV-006 permanece em revisão e DEV-007 não foi declarada iniciada.
