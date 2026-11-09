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
 IF h IS NOT DISTINCT FROM repeat('b',64) THEN
   RAISE EXCEPTION 'DEV024: payload divergente aceito indevidamente';
 END IF;
 -- O serviço deve transformar esta divergência em HTTP 409. Aqui só se
 -- verifica a decisão do domínio, sem simular uma API inexistente.
 IF NOT (h IS DISTINCT FROM repeat('b',64)) THEN
   RAISE EXCEPTION 'DEV024: conflito de hash nao identificado';
 END IF;
END $teste$;
-- Repetição de uma operação confirmada preserva a reserva original.
UPDATE piloto_cota_idempotencia_experimental
SET estado='confirmada', reserva_id='00000000-0000-4000-8000-000000000124'
WHERE unidade_id='00000000-0000-4000-8000-000000000024' AND chave='teste-a';
DO $teste$
DECLARE n integer; r uuid;
BEGIN
 INSERT INTO piloto_cota_idempotencia_experimental (unidade_id,chave,requisicao_hash)
 VALUES ('00000000-0000-4000-8000-000000000024','teste-a',repeat('a',64))
 ON CONFLICT (unidade_id,chave) DO NOTHING;
 GET DIAGNOSTICS n = ROW_COUNT;
 IF n <> 0 THEN RAISE EXCEPTION 'DEV024: replay confirmado duplicou operacao'; END IF;
 SELECT reserva_id INTO r FROM piloto_cota_idempotencia_experimental
 WHERE unidade_id='00000000-0000-4000-8000-000000000024' AND chave='teste-a';
 IF r IS DISTINCT FROM '00000000-0000-4000-8000-000000000124'::uuid THEN
   RAISE EXCEPTION 'DEV024: replay perdeu referencia da reserva';
 END IF;
END $teste$;
-- Regressões negativas: as restrições devem falhar no próprio PostgreSQL.
-- Cada erro esperado é capturado sem interromper o ensaio descartável.
DO $teste$
BEGIN
 BEGIN
  INSERT INTO piloto_cota_idempotencia_experimental (unidade_id,chave,requisicao_hash)
  VALUES ('00000000-0000-4000-8000-000000000024','hash-invalido','nao-e-sha256');
  RAISE EXCEPTION 'DEV024: hash malformado foi aceito';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 BEGIN
  INSERT INTO piloto_cota_idempotencia_experimental (unidade_id,chave,requisicao_hash,estado)
  VALUES ('00000000-0000-4000-8000-000000000024','confirmada-sem-reserva',repeat('c',64),'confirmada');
  RAISE EXCEPTION 'DEV024: confirmacao sem reserva foi aceita';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 BEGIN
  INSERT INTO piloto_cota_idempotencia_experimental (unidade_id,chave,requisicao_hash,estado,reserva_id)
  VALUES ('00000000-0000-4000-8000-000000000024','pendente-com-reserva',repeat('d',64),'pendente','00000000-0000-4000-8000-000000000125');
  RAISE EXCEPTION 'DEV024: reserva vinculada a estado pendente foi aceita';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 BEGIN
  INSERT INTO piloto_cota_idempotencia_experimental (unidade_id,chave,requisicao_hash)
  VALUES ('00000000-0000-4000-8000-000000000024','teste-a',repeat('a',64));
  RAISE EXCEPTION 'DEV024: duplicidade da chave por unidade foi aceita';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;
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
-- Regressões de campos obrigatórios e domínio da chave/estado.
DO $teste$
BEGIN
 BEGIN
  INSERT INTO piloto_cota_idempotencia_experimental (unidade_id,chave,requisicao_hash)
  VALUES ('00000000-0000-4000-8000-000000000024','',repeat('a',64));
  RAISE EXCEPTION 'DEV024: chave vazia foi aceita';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 BEGIN
  INSERT INTO piloto_cota_idempotencia_experimental (unidade_id,chave,requisicao_hash)
  VALUES ('00000000-0000-4000-8000-000000000024',repeat('x',129),repeat('a',64));
  RAISE EXCEPTION 'DEV024: chave acima do limite foi aceita';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 BEGIN
  INSERT INTO piloto_cota_idempotencia_experimental (unidade_id,chave,requisicao_hash,estado)
  VALUES ('00000000-0000-4000-8000-000000000024','estado-invalido',repeat('a',64),'finalizada');
  RAISE EXCEPTION 'DEV024: estado desconhecido foi aceito';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 BEGIN
  INSERT INTO piloto_cota_idempotencia_experimental (unidade_id,chave,requisicao_hash)
  VALUES (NULL,'sem-unidade',repeat('a',64));
  RAISE EXCEPTION 'DEV024: unidade nula foi aceita';
 EXCEPTION WHEN not_null_violation THEN NULL;
 END;
 BEGIN
  INSERT INTO piloto_cota_idempotencia_experimental (unidade_id,chave,requisicao_hash)
  VALUES ('00000000-0000-4000-8000-000000000024','sem-hash',NULL);
  RAISE EXCEPTION 'DEV024: hash nulo foi aceito';
 EXCEPTION WHEN not_null_violation THEN NULL;
 END;
END $teste$;
ROLLBACK;
-- Pendências: integrar reserva e auditoria na mesma transação, RLS, resposta
-- persistida, recuperação após falha e testes de duas conexões concorrentes.
