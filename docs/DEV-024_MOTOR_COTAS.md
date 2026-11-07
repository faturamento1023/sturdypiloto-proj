# DEV-024 — Motor de cotas (em desenvolvimento)

Fonte do cronograma: DEV-024, etapa 05 Agendamento, prioridade P0. Restrições por convênio, procedimento, grupo e intervalo; prevenção de duplo agendamento e concorrência.

## Entrega inicial — 07/11/2026
- `lib/dev024/cotas.mjs`: avaliador puro de cotas, com escopo por unidade e dimensões opcionais por convênio/procedimento/grupo; limites por intervalo UTC e regra mais restritiva.
- `lib/dev024/cotas.test.mjs`: seis cenários sintéticos de limite, cancelamento, isolamento, precedência, borda de intervalo e entrada inválida.
- Rodar: `node --test lib/dev024/cotas.test.mjs`.

## Limites e pendências
Esta é uma **proposta de implementação**, não comportamento observado no WebUltra. Não efetua reserva, não substitui verificação de disponibilidade DEV-023 e não oferece garantia contra concorrência. Regras sem correspondência retornam permitido: isso exige política explícita de ausência de cota. A definição do fuso e da janela de cotas deve ser homologada antes da API.

Próximo passo: esquema PostgreSQL, transação atômica com bloqueio e verificação conjunta de cotas, feriados, exceções e conflito de sala; testes de concorrência, RLS e auditoria; UI e CI. Não mesclar nem encerrar DEV-024 sem essas provas.
