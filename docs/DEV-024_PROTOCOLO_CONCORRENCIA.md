# DEV-024 — Protocolo de concorrência PostgreSQL (duas sessões)

**Estado:** roteiro de teste proposto, **não executado**. Somente banco PostgreSQL **descartável**, sem dados reais. Não executar em Supabase hospedado, produção ou WebUltra. Este roteiro testa exclusivamente a atualização condicional do contador, **não** a reserva completa, RLS, auditoria ou integração à agenda.

## Preparação

1. Criar banco PostgreSQL descartável e aplicar `sql/dev024_cotas_contadores_experimental.sql`.
2. Abrir **duas conexões independentes** ao mesmo banco (A e B). Desabilitar execução automática paralela de outros ensaios no mesmo banco.
3. Na sessão A, executar:

```sql
INSERT INTO piloto_cota_contadores
 (unidade_id, regra_id, janela_inicio, janela_fim, limite, utilizados)
VALUES ('00000000-0000-4000-8000-000000000024',
        '00000000-0000-4000-8000-000000000099',
        '2026-11-08 10:00+00', '2026-11-08 11:00+00', 1, 0);
BEGIN;
UPDATE piloto_cota_contadores SET utilizados = utilizados + 1
 WHERE unidade_id='00000000-0000-4000-8000-000000000024'
   AND regra_id='00000000-0000-4000-8000-000000000099'
   AND janela_inicio='2026-11-08 10:00+00'
   AND janela_fim='2026-11-08 11:00+00'
   AND utilizados < limite RETURNING utilizados;
-- Esperado: uma linha com utilizados=1. NÃO confirmar ainda.
```

4. Na sessão B, executar `BEGIN;` e a **mesma instrução UPDATE** acima. Esperado: B fica aguardando o lock de A. Se não aguardar, interromper o ensaio e investigar a conexão e o isolamento.
5. Na sessão A, executar `COMMIT;`. Esperado: B desbloqueia e retorna **zero linhas** (não ultrapassa limite). Na sessão B, executar `COMMIT;`.
6. Consultar `SELECT limite, utilizados FROM piloto_cota_contadores WHERE regra_id='00000000-0000-4000-8000-000000000099';`. Esperado: `limite=1, utilizados=1`.
7. Limpar o banco descartável após registrar evidências sem informações sensíveis.

## Ensaio de rollback

Recriar o contador com `utilizados=0` em banco limpo. Repetir os passos 3 e 4, mas executar `ROLLBACK;` em A em vez de `COMMIT;`. Esperado: B desbloqueia, retorna uma linha com `utilizados=1` e, após seu `COMMIT;`, o contador final é 1. Este cenário distingue liberação correta de lock de perda de atualização.

## Critérios de aceite e limites

- Registrar versão do PostgreSQL, nível de isolamento, horário, duas sessões independentes, resultado de cada UPDATE e estado final. Não registrar credenciais, identificadores reais ou dados de pacientes.
- Qualquer valor `utilizados > limite`, duas reservas aceitas para limite 1, bloqueio permanente ou erro inesperado **reprova** o ensaio.
- Este teste **não** demonstra prevenção de dupla reserva em tabelas de agenda; requer transação única de reserva + contador + auditoria, ordem determinística para múltiplas regras, idempotência, autorização e RLS.
- Não inferir paridade com o WebUltra. O comportamento é **proposta do Projeto Piloto**.
