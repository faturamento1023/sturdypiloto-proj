# DEV-024 — Ensaio de integridade de cotas em PGlite — 08/11/2026

## Estado consultado antes da alteração
- Controle em main: DEV-001 a DEV-023 concluídas; DEV-024 em andamento.
- DEV-006: Issue #4 encerrada e PR #5 mesclado, com aceite documental limitado; revisão operacional especializada ainda é pendência.
- PR #25: aberto, branch `dev-024-motor-cotas`, head inicial desta sessão `15f9a6cc4d4707860cd26de9bbf4743bdf7fff28`.
- Cronograma original XLSM na pasta Web Ultra, preservado sem edição.
- DEV-005 v1.0: escopo aprovado, não homologação clínica.

## Entrega
Arquivo `database/dev024_cotas_contadores.test.cjs` no commit `56d86ec674933c260d9e8279e9d6142a3889ad9f`, incluído no padrão `node --test database/*.test.cjs` do repositório. Cinco cenários com dados fictícios: consumo único, limite zero, restrição CHECK, rollback e janela inválida. O teste usa PGlite isolado e carrega o SQL experimental já existente.

## Verificações e limites
- Foi verificado que o workflow anterior no commit `15f9a6c` concluiu com sucesso: https://github.com/faturamento1023/sturdypiloto-proj/actions/runs/42454556103
- **Não foi confirmada a execução do novo teste no GitHub Actions** nesta sessão. Nenhum resultado de teste novo deve ser anunciado como aprovado antes da execução.
- PGlite não demonstra concorrência real entre duas conexões independentes. O protocolo manual de PostgreSQL permanece não executado.
- Não há comprovação de RLS, auditoria, idempotência, cancelamento exatamente uma vez ou integração transacional à agenda.
- Este ensaio é proposta do Projeto Piloto, não observação do comportamento do WebUltra.

## Próxima ação
Confirmar o CI do commit novo; executar o protocolo de duas conexões em PostgreSQL descartável; depois implementar transação de reserva + contador + auditoria com autorização/RLS, mantendo o PR em rascunho até a validação necessária.
