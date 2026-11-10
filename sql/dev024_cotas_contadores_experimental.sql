-- DEV-024: esquema experimental de contadores de cota.
-- NÃO executar em produção. Proposta isolada, ainda sem RLS/auditoria integradas.
-- Cada chave representa unidade + regra + janela UTC. O contador é atualizado
-- na mesma transação que cria/cancela a reserva; nunca em transação separada.
CREATE TABLE IF NOT EXISTS piloto_cota_contadores (
  unidade_id uuid NOT NULL,
  regra_id uuid NOT NULL,
  janela_inicio timestamptz NOT NULL,
  janela_fim timestamptz NOT NULL,
  limite integer NOT NULL CHECK (limite >= 0),
  utilizados integer NOT NULL DEFAULT 0 CHECK (utilizados >= 0),
  CONSTRAINT piloto_cota_janela_valida CHECK (janela_inicio < janela_fim),
  CONSTRAINT piloto_cota_limite_respeitado CHECK (utilizados <= limite),
  PRIMARY KEY (unidade_id, regra_id, janela_inicio, janela_fim)
);

-- Pré-condições obrigatórias no serviço chamador:
-- 1) autenticar usuário e autorizar unidade no servidor/RLS;
-- 2) validar disponibilidade, feriados, exceções e conflito de sala;
-- 3) garantir que regra/limite/janela sejam carregados de fonte autorizada,
--    nunca de payload fornecido pelo cliente;
-- 4) inserir a reserva e sua auditoria na MESMA transação.
--
-- UPDATE atômico sob lock de linha: uma segunda transação concorrente aguarda
-- a primeira e reavalia utilizados < limite sobre a versão confirmada.
-- Retornar zero linhas significa cota esgotada (ROLLBACK da reserva).
--
-- UPDATE piloto_cota_contadores
--    SET utilizados = utilizados + 1
--  WHERE unidade_id = $1 AND regra_id = $2
--    AND janela_inicio = $3 AND janela_fim = $4
--    AND utilizados < limite
-- RETURNING utilizados, limite;
--
-- Para uma reserva afetada por MÚLTIPLAS regras, bloquear todas as chaves
-- em ordem determinística, na mesma transação, e só então atualizar TODAS.
-- Se qualquer regra falhar, ROLLBACK completo. Não usar esta tabela
-- isoladamente para decidir agendamentos.
--
-- Pendências: política RLS com escopo por unidade, trilha de auditoria,
-- idempotência, cancelamento exatamente uma vez, alteração de limite,
-- recomputação/reconciliação e testes reais de concorrência PostgreSQL.
