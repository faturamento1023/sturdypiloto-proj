# DEV-024 — Motor de cotas (em desenvolvimento)

Fonte do cronograma: DEV-024, etapa 05 Agendamento, prioridade P0. Restrições por convênio, procedimento, grupo e intervalo; prevenção de duplo agendamento e concorrência.

## Entrega inicial — 07/11/2026
- `lib/dev024/cotas.mjs`: avaliador puro de cotas, com escopo por unidade e dimensões opcionais por convênio/procedimento/grupo; limites por intervalo UTC e regra mais restritiva.
- `lib/dev024/cotas.test.mjs`: seis cenários sintéticos de limite, cancelamento, isolamento, precedência, borda de intervalo e entrada inválida.
- Rodar: `node --test lib/dev024/cotas.test.mjs`.

## Limites e pendências
Esta é uma **proposta de implementação**, não comportamento observado no WebUltra. Não efetua reserva, não substitui verificação de disponibilidade DEV-023 e não oferece garantia contra concorrência. Regras sem correspondência retornam permitido: isso exige política explícita de ausência de cota. A definição do fuso e da janela de cotas deve ser homologada antes da API.

Próximo passo: esquema PostgreSQL, transação atômica com bloqueio e verificação conjunta de cotas, feriados, exceções e conflito de sala; testes de concorrência, RLS e auditoria; UI e CI. Não mesclar nem encerrar DEV-024 sem essas provas.

## Revisão de 07/11/2026 — robustez de entradas
- Reconciliado PR #25 na branch existente antes da escrita; cronograma XLSM lido sem alterações.
- A validação agora rejeita `ativo` não booleano (incluindo a string `"false"`) e reservas ativas com data sem fuso explícito.
- Adicionados oito cenários de regressão em `lib/dev024/cotas.validacao.test.mjs` e execução dos testes DEV-024 no CI geral.
- Commits: `681d670` (correção), `c544566` (testes), `00425b3` (CI).
- CI anterior do PR #25: [42400674544](https://github.com/faturamento1023/sturdypiloto-proj/actions/runs/42400674544), sucesso, **antes** da inclusão dos novos testes; novo CI pendente de confirmação.
- A origem WebUltra documenta o domínio, mas esta política de validação é **proposta do piloto**, não comportamento comprovado do sistema original.
- Bloqueios mantidos: reserva atômica PostgreSQL, concorrência, RLS, auditoria, integração com feriados/exceções e interface; não mesclar ou homologar.

## Revisão complementar — 07/11/2026
- CI do commit `c1b6766` confirmado com sucesso: [workflow 42405401901](https://github.com/faturamento1023/sturdypiloto-proj/actions/runs/42405401901). Isso não valida as alterações posteriores.
- Corrigidos dois casos de integridade do avaliador: regras sem `id` textual não vazio são rejeitadas; intervalos cujo produto em milissegundos excede inteiro seguro também são rejeitados.
- Commits: `7e03007` (código), `10295f9` (três testes sintéticos). O padrão `lib/dev024/*.test.mjs` já está no CI. Execução desses novos testes ainda não confirmada.
- Sem transação PostgreSQL, testes de concorrência/RLS/auditoria, integração de agenda ou homologação. PR permanece em rascunho; não mesclar.

## Revisão complementar — 07/11/2026, domínio temporal
- Confirmado no GitHub Actions que o workflow [42410515390](https://github.com/faturamento1023/sturdypiloto-proj/actions/runs/42410515390) terminou com sucesso no commit `5bdc8d8`, cobrindo a bateria anterior.
- O avaliador passou a rejeitar intervalos em milissegundos maiores que o alcance temporal representável por `Date` (8,64 × 10^15 ms), mesmo quando ainda são inteiros seguros. Acrescentado teste de regressão sintético.
- Commits: `d7c4453` (correção) e `dd1cbe8` (teste). A execução remota desses commits ainda não foi confirmada.
- A planilha XLSM consultada ainda marca DEV-024 como não iniciada; prevalece o estado técnico do PR em rascunho, sem alterar a planilha de origem.
- Bloqueios inalterados: transação PostgreSQL, concorrência, RLS, auditoria, integração com agenda/feriados e validação operacional. Não mesclar nem homologar.

## Revisão adicional — 07/11/2026, limites de intervalo e escopo
- Adicionados sete testes sintéticos em `lib/dev024/cotas.limites.test.mjs` no commit `d0245b2`: equivalência de fuso, limites inclusivo/exclusivo da janela UTC, regra desativada, escopo de procedimento e ausência de regra.
- Os testes exercitam o avaliador puro existente; não constituem validação de transação, concorrência, RLS ou auditoria. Execução no GitHub Actions ainda pendente de confirmação nesta sessão.
- Política sem regra correspondente continua permissiva **provisoriamente** e exige decisão operacional; nenhuma regra clínica do WebUltra foi inferida como comprovada.
- Próxima ação: implementar e testar reserva atômica em PostgreSQL descartável, integrar disponibilidade/feriados e conferir CI. PR #25 permanece rascunho; não mesclar nem homologar.
