#!/usr/bin/env bash
# DEV-024: duas conexoes independentes; apenas PostgreSQL descartavel.
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL obrigatoria para banco de teste descartavel}"
export PGCONNECT_TIMEOUT=10
psql_test() { psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }
schema="dev024_reserva_concorrente"
cleanup() { psql_test -c "DROP SCHEMA IF EXISTS $schema CASCADE" >/dev/null || true; }
trap cleanup EXIT
cleanup
psql_test <<'SQL'
CREATE SCHEMA dev024_reserva_concorrente;
CREATE TABLE dev024_reserva_concorrente.cotas (
 unidade int NOT NULL, slot int NOT NULL, limite int NOT NULL CHECK(limite>=0),
 usados int NOT NULL DEFAULT 0 CHECK(usados>=0 AND usados<=limite),
 PRIMARY KEY(unidade,slot)
);
CREATE TABLE dev024_reserva_concorrente.reservas (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 unidade int NOT NULL, slot int NOT NULL, chave text NOT NULL,
 UNIQUE(unidade,chave)
);
CREATE TABLE dev024_reserva_concorrente.auditoria (
 reserva_id bigint NOT NULL, acao text NOT NULL
);
INSERT INTO dev024_reserva_concorrente.cotas(unidade,slot,limite)
 VALUES (24,31,1),(24,32,1),(25,31,1);
CREATE FUNCTION dev024_reserva_concorrente.reservar(p_unidade int,p_slot int,p_chave text)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE v_id bigint; v_slot int;
BEGIN
 -- Serializa a mesma chave antes da verificacao de replay e do consumo da cota.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_unidade::text || ':' || p_chave, 0));
 SELECT id,slot INTO v_id,v_slot FROM dev024_reserva_concorrente.reservas
 WHERE unidade=p_unidade AND chave=p_chave;
 IF FOUND THEN
   IF v_slot<>p_slot THEN RAISE EXCEPTION 'chave reutilizada em outro slot' USING ERRCODE='23505'; END IF;
   RETURN v_id;
 END IF;
 UPDATE dev024_reserva_concorrente.cotas SET usados=usados+1
 WHERE unidade=p_unidade AND slot=p_slot AND usados<limite;
 IF NOT FOUND THEN RAISE EXCEPTION 'cota esgotada' USING ERRCODE='P0001'; END IF;
 INSERT INTO dev024_reserva_concorrente.reservas(unidade,slot,chave)
 VALUES(p_unidade,p_slot,p_chave) RETURNING id INTO v_id;
 INSERT INTO dev024_reserva_concorrente.auditoria VALUES(v_id,'criada');
 RETURN v_id;
END $$;
SQL
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"; cleanup' EXIT
# Sessao A segura lock da linha apos reservar, enquanto B disputa o mesmo slot.
(
 psql_test >"$tmp/a.log" 2>&1 <<'SQL'
BEGIN;
SELECT dev024_reserva_concorrente.reservar(24,31,'a');
SELECT pg_sleep(2);
COMMIT;
SQL
) &
pid_a=$!
# Aguarda a reserva A aparecer no log antes de iniciar a disputa B.
for i in $(seq 1 60); do
 if grep -Eq '^[[:space:]]*[0-9]+[[:space:]]*$' "$tmp/a.log" 2>/dev/null; then break; fi
 if ! kill -0 "$pid_a" 2>/dev/null; then cat "$tmp/a.log"; exit 1; fi
 sleep 0.1
done
if ! grep -Eq '^[[:space:]]*[0-9]+[[:space:]]*$' "$tmp/a.log"; then echo "Sessao A nao iniciou"; exit 1; fi
# B deve esperar o COMMIT de A e falhar, sem consumir cota ou criar reserva.
if timeout 12 psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 -c  "SELECT dev024_reserva_concorrente.reservar(24,31,'b')" >"$tmp/b.log" 2>&1; then
 echo "ERRO: duas reservas no slot de limite 1"; exit 1
fi
wait "$pid_a"
if ! grep -q 'cota esgotada' "$tmp/b.log"; then cat "$tmp/b.log"; exit 1; fi
# Repeticao da mesma chave e unidade nao cria segunda reserva neste ensaio sequencial.
psql_test <<'SQL'
DO $$
DECLARE n int; r bigint; a bigint;
BEGIN
 SELECT id INTO a FROM dev024_reserva_concorrente.reservas WHERE unidade=24 AND chave='a';
 r:=dev024_reserva_concorrente.reservar(24,31,'a');
 IF a<>r THEN RAISE EXCEPTION 'replay divergente'; END IF;
 BEGIN
   PERFORM dev024_reserva_concorrente.reservar(24,32,'a');
   RAISE EXCEPTION 'replay em slot divergente aceito';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 SELECT usados INTO n FROM dev024_reserva_concorrente.cotas WHERE unidade=24 AND slot=32;
 IF n<>0 THEN RAISE EXCEPTION 'replay divergente consumiu cota'; END IF;
 PERFORM dev024_reserva_concorrente.reservar(25,31,'c');
 SELECT count(*) INTO n FROM dev024_reserva_concorrente.reservas;
 IF n<>2 THEN RAISE EXCEPTION 'reservas incorretas %',n; END IF;
 SELECT count(*) INTO n FROM dev024_reserva_concorrente.auditoria;
 IF n<>2 THEN RAISE EXCEPTION 'auditoria incorreta %',n; END IF;
 SELECT sum(usados) INTO n FROM dev024_reserva_concorrente.cotas;
 IF n<>2 THEN RAISE EXCEPTION 'cotas incorretas %',n; END IF;
END $$;
SQL
echo "DEV-024: duas sessoes concorrentes verificadas em schema descartavel."
echo "Limites: sem agenda operacional, RLS, replay concorrente ou homologacao clinica."
