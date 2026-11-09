-- DEV-024: prova integrada de reserva/cota/idempotencia em PostgreSQL DESCARTAVEL.
-- Proposta do Piloto; nao reproduz comportamento comprovado do WebUltra.
-- Nao e migracao de producao, nem valida RLS ou regras clinicas.
BEGIN;
CREATE TEMP TABLE dev024_slots (
 unidade uuid NOT NULL, slot uuid NOT NULL, disponivel boolean NOT NULL,
 PRIMARY KEY(unidade,slot)
);
CREATE TEMP TABLE dev024_cotas (
 unidade uuid NOT NULL, slot uuid NOT NULL, limite integer NOT NULL CHECK(limite>=0),
 usados integer NOT NULL DEFAULT 0 CHECK(usados>=0 AND usados<=limite),
 PRIMARY KEY(unidade,slot)
);
CREATE TEMP TABLE dev024_reservas (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 unidade uuid NOT NULL, slot uuid NOT NULL,
 UNIQUE(unidade,slot,id)
);
CREATE TEMP TABLE dev024_operacoes (
 unidade uuid NOT NULL, chave text NOT NULL, hash text NOT NULL,
 slot uuid NOT NULL, reserva_id bigint NOT NULL, PRIMARY KEY(unidade,chave)
);
CREATE TEMP TABLE dev024_auditoria (
 unidade uuid NOT NULL, reserva_id bigint NOT NULL, acao text NOT NULL,
 criado_em timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE OR REPLACE FUNCTION pg_temp.dev024_reservar(
 p_unidade uuid,p_slot uuid,p_chave text,p_hash text
) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE v_id bigint; v_hash text; v_slot uuid; v_linhas integer;
BEGIN
 IF p_unidade IS NULL OR p_slot IS NULL OR p_chave IS NULL OR
    btrim(p_chave) <> p_chave OR length(p_chave) NOT BETWEEN 1 AND 128 OR
    p_hash IS NULL OR p_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'entrada invalida' USING ERRCODE='22023';
 END IF;
 -- Serializa a mesma chave antes de consumir a cota. Hash divergente e conflito.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_unidade::text || ':' || p_chave,0));
 SELECT hash,slot,reserva_id INTO v_hash,v_slot,v_id FROM dev024_operacoes
 WHERE unidade=p_unidade AND chave=p_chave;
 IF FOUND THEN
   IF v_hash <> p_hash OR v_slot <> p_slot THEN
     RAISE EXCEPTION 'chave reutilizada com payload diferente' USING ERRCODE='23505';
   END IF;
   RETURN v_id;
 END IF;
 -- Lock do slot impede mudanca concorrente de disponibilidade neste modelo.
 PERFORM 1 FROM dev024_slots WHERE unidade=p_unidade AND slot=p_slot
 AND disponivel FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'slot indisponivel' USING ERRCODE='P0001'; END IF;
 UPDATE dev024_cotas SET usados=usados+1
 WHERE unidade=p_unidade AND slot=p_slot AND usados<limite;
 GET DIAGNOSTICS v_linhas=ROW_COUNT;
 IF v_linhas<>1 THEN RAISE EXCEPTION 'cota esgotada' USING ERRCODE='P0001'; END IF;
 INSERT INTO dev024_reservas(unidade,slot) VALUES(p_unidade,p_slot) RETURNING id INTO v_id;
 INSERT INTO dev024_operacoes VALUES(p_unidade,p_chave,p_hash,p_slot,v_id);
 INSERT INTO dev024_auditoria(unidade,reserva_id,acao) VALUES(p_unidade,v_id,'criada');
 RETURN v_id;
END $$;
INSERT INTO dev024_slots VALUES
 ('00000000-0000-4000-8000-000000000024','00000000-0000-4000-8000-000000000031',true),
 ('00000000-0000-4000-8000-000000000025','00000000-0000-4000-8000-000000000031',true),
 ('00000000-0000-4000-8000-000000000024','00000000-0000-4000-8000-000000000032',false);
INSERT INTO dev024_cotas(unidade,slot,limite) VALUES
 ('00000000-0000-4000-8000-000000000024','00000000-0000-4000-8000-000000000031',1),
 ('00000000-0000-4000-8000-000000000025','00000000-0000-4000-8000-000000000031',1),
 ('00000000-0000-4000-8000-000000000024','00000000-0000-4000-8000-000000000032',1);
DO $test$
DECLARE a bigint;b bigint; n integer;
BEGIN
 a:=pg_temp.dev024_reservar('00000000-0000-4000-8000-000000000024','00000000-0000-4000-8000-000000000031','op1',repeat('a',64));
 b:=pg_temp.dev024_reservar('00000000-0000-4000-8000-000000000024','00000000-0000-4000-8000-000000000031','op1',repeat('a',64));
 IF a<>b THEN RAISE EXCEPTION 'replay criou outra reserva'; END IF;
 -- Mesmo hash, mas slot diferente, nao pode devolver reserva do primeiro slot.
 BEGIN
  PERFORM pg_temp.dev024_reservar('00000000-0000-4000-8000-000000000024','00000000-0000-4000-8000-000000000032','op1',repeat('a',64));
  RAISE EXCEPTION 'replay com slot diferente aceito';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN
  PERFORM pg_temp.dev024_reservar('00000000-0000-4000-8000-000000000024','00000000-0000-4000-8000-000000000031','op1',repeat('b',64));
  RAISE EXCEPTION 'hash divergente aceito';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN
  PERFORM pg_temp.dev024_reservar('00000000-0000-4000-8000-000000000024','00000000-0000-4000-8000-000000000031','op2',repeat('c',64));
  RAISE EXCEPTION 'cota excedida';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='cota excedida' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM pg_temp.dev024_reservar('00000000-0000-4000-8000-000000000024','00000000-0000-4000-8000-000000000032','op3',repeat('d',64));
  RAISE EXCEPTION 'slot bloqueado aceito';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='slot bloqueado aceito' THEN RAISE; END IF;
 END;
 b:=pg_temp.dev024_reservar('00000000-0000-4000-8000-000000000025','00000000-0000-4000-8000-000000000031','op1',repeat('a',64));
 IF b=a THEN RAISE EXCEPTION 'reserva de outra unidade reutilizada'; END IF;
 SELECT count(*) INTO n FROM dev024_reservas;
 IF n<>2 THEN RAISE EXCEPTION 'numero de reservas inesperado: %',n; END IF;
 SELECT count(*) INTO n FROM dev024_auditoria;
 IF n<>2 THEN RAISE EXCEPTION 'auditoria nao corresponde a reservas'; END IF;
 SELECT sum(usados) INTO n FROM dev024_cotas;
 IF n<>2 THEN RAISE EXCEPTION 'contadores divergentes'; END IF;
END $test$;
ROLLBACK;
