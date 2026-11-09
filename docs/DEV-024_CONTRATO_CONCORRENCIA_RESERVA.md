# DEV-024 — Contrato de concorrência para reserva integrada (revisão técnica)

**Data:** 09/11/2026. **Estado:** proposta técnica do Projeto Piloto, sem homologação clínica.  
**Base conferida:** `docs/CONTROLE_EXECUCOES.md` (DEV-001 a DEV-023 concluídas), DEV-005 v1.0, PR #25, `sql/dev024_reserva_integrada_experimental.sql`, workflow PostgreSQL e cronograma XLSM da pasta Web Ultra. O sistema WebUltra original não foi alterado.

## Diagnóstico do ensaio atual

O arquivo `sql/dev024_reserva_integrada_experimental.sql` usa tabelas **TEMP** e executa todas as chamadas de reserva na **mesma sessão** dentro de `BEGIN ... ROLLBACK`. Ele cobre replay de chave, divergência de hash/slot, cota esgotada, slot indisponível, isolamento por unidade e auditoria sintética. **Não demonstra concorrência de duas conexões na reserva integrada**, pois tabelas temporárias não são compartilhadas entre sessões.

O script `scripts/dev024-testar-concorrencia.sh` e os ensaios de contadores são evidências separadas; seu resultado não deve ser apresentado como prova de concorrência da operação completa de reserva.

## Contrato proposto (não atribuir ao WebUltra)

1. **Escopo da unidade:** toda chave de idempotência e reserva deve pertencer a uma unidade; o mesmo identificador em unidades diferentes não pode compartilhar resultado.
2. **Atomicidade:** validação do slot, consumo da cota, gravação da reserva, idempotência e auditoria devem ocorrer na mesma transação. Falha em qualquer etapa não pode deixar efeitos parciais.
3. **Concorrência:** duas conexões competindo pela última vaga devem produzir exatamente um sucesso e um conflito explícito. Se a cota permitir duas vagas, ambas podem concluir sem ultrapassar o limite.
4. **Replay:** mesma unidade + mesma chave + mesmo payload canônico deve devolver o mesmo ID, sem novo consumo ou nova auditoria de criação. Mesma chave com payload diferente deve gerar conflito.
5. **Disponibilidade:** bloqueios, feriados, substituições, conflitos de sala e compromisso existente devem ser verificados na mesma transação que cria a reserva, usando bloqueios/constraints apropriados.
6. **Segurança:** servidor deve validar vínculo à unidade e papel autorizado, inclusive RLS; não confiar apenas em controles da interface. A auditoria não deve conter segredos ou dados clínicos desnecessários.
7. **Falhas e retries:** timeout após COMMIT exige consulta por chave para resolver resultado incerto. Retry não pode criar reserva duplicada.

## Matriz de aceitação em PostgreSQL descartável

| ID | Cenário | Critério observável |
|---|---|---|
| C01 | Conexões A/B, mesma unidade/slot, cota 1, chaves distintas | 1 reserva, 1 consumo, 1 evento de criação; a outra operação recebe conflito |
| C02 | A/B, mesma chave e mesmo payload, cota 1 | Ambas recebem o mesmo ID; 1 reserva, 1 consumo, 1 evento de criação |
| C03 | A/B, mesma chave e payload diferente | 1 sucesso e 1 conflito de idempotência; sem reserva extra |
| C04 | A/B, unidades diferentes, mesmo slot/chave | Resultados independentes por unidade |
| C05 | A cria reserva enquanto B bloqueia slot | Serialização consistente; não permitir reserva em slot efetivamente bloqueado |
| C06 | Falha induzida após consumo e antes de inserir auditoria | Rollback integral de cota, reserva e operação |
| C07 | Concorrência com cota 2 e 3 solicitações | Exatamente 2 sucessos, nunca `usados > limite` |
| C08 | Operação sem vínculo/autorização para unidade | Negação no servidor, sem efeitos, com auditoria de tentativa conforme política |
| C09 | Retry após resultado de COMMIT desconhecido | Resposta recuperada por chave, sem segunda reserva |
| C10 | Feriado, exceção, sala ocupada e horário substituto | Cada bloqueio validado na integração com a agenda operacional |

## Procedimento de teste necessário

Criar **tabelas compartilhadas em schema exclusivo de teste** (não TEMP), abrir duas ou mais conexões `psql` independentes e sincronizar o início com barreiras determinísticas. Executar os casos em transações separadas, consultar o estado final por terceira conexão e remover o schema de teste em `trap`, inclusive após erro. Não depender apenas de `sleep` para garantir a disputa; configurar `lock_timeout` e `statement_timeout` para impedir CI preso. Usar apenas UUIDs e registros sintéticos.

A função testada deve ser a **mesma implementação transacional** chamada pela aplicação, e não uma cópia divergente. Até existir integração com o motor de disponibilidade DEV-021–023, identificar C05/C08/C10 como **pendentes**, não aprovados.

## Portão de conclusão da DEV-024

- Testes C01–C04, C06, C07 e C09 aprovados no CI, com links dos runs e SHA exato.
- C05, C08 e C10 aprovados após integração real de agenda, autorização/RLS e auditoria.
- Evidência de execução em navegador/API com dados fictícios e revisão de regras inferidas.
- PR #25 revisado, controle de execuções atualizado, sem publicação em produção ou alegação de homologação clínica.

**Próxima ação técnica:** implementar o harness de múltiplas conexões e ligar sua execução ao workflow `dev024-postgres-concorrencia.yml`, antes de declarar a reserva integrada concorrente.
