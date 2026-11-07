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
