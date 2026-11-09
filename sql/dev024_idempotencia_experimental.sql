-- DEV-024: ensaio isolado de idempotência, SOMENTE banco descartável.
-- Proposta do Piloto, não comportamento observado no WebUltra.
-- Não é migração nem fluxo de reserva pronto. Não contém dados reais.
BEGIN;
CREATE TABLE piloto_cota_idempotencia_experimental (
 unidade_id uuid NOT NULL,
 chave text NOT NULL CHECK (length(chave) BETWEEN 1 AND 128),
 requisicao_hash text NOT NULL CHECK (requisicao_hash ~ '^[0-9a-f]{64}$'),
 estado text NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente','confirmada','rejeitada')),
 reserva_id uuid,
 criado_em timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (unidade_id, chave),
 CHECK ((estado = 'confirmada') = (reserva_id IS NOT NULL))
);
-- O INSERT concorrente com mesma chave aguarda o índice UNIQUE; o serviço
-- deve comparar o hash e obter a resposta original, nunca consumir cota de novo.
INSERT INTO piloto_cota_idempotencia_experimental (unidade_id,chave,requisicao_hash)
VALUES ('00000000-0000-4000-8000-000000000024','teste-a',repeat('a',64));
DO $teste$
DECLARE n integer; h text;
BEGIN
 INSERT INTO piloto_cota_idempotencia_experimental (unidade_id,chave,requisicao_hash)
 VALUES ('00000000-0000-4000-8000-000000000024','teste-a',repeat('a',64))
 ON CONFLICT (unidade_id,chave) DO NOTHING;
 GET DIAGNOSTICS n = ROW_COUNT;
 IF n <> 0 THEN RAISE EXCEPTION 'DEV024: repeticao criou nova operacao'; END IF;
 SELECT requisicao_hash INTO h FROM piloto_cota_idempotencia_experimental
 WHERE unidade_id='00000000-0000-4000-8000-000000000024' AND chave='teste-a';
 IF h IS DISTINCT FROM repeat('a',64) THEN RAISE EXCEPTION 'DEV024: hash inesperado'; END IF;
 -- Mesmo token com payload diferente é conflito (409), não repetição válida.
 IF h = repeat('b',64) THEN RAISE EXCEPTION 'DEV024: conflito nao detectado'; END IF;
END $teste$;
-- Mesma chave em outra unidade é independente.
INSERT INTO piloto_cota_idempotencia_experimental (unidade_id,chave,requisicao_hash)
VALUES ('00000000-0000-4000-8000-000000000025','teste-a',repeat('b',64));
DO $teste$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM piloto_cota_idempotencia_experimental WHERE chave='teste-a';
 IF n <> 2 THEN RAISE EXCEPTION 'DEV024: isolamento por unidade falhou'; END IF;
END $teste$;
ROLLBACK;
-- Pendências: integrar reserva e auditoria na mesma transação, RLS, resposta
-- persistida, recuperação após falha e testes de duas conexões concorrentes.
