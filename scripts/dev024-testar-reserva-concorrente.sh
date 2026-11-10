#!/usr/bin/env bash
# DEV-024: duas conexoes independentes; apenas PostgreSQL descartavel.
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL obrigatoria para banco de teste descartavel}"
export PGCONNECT_TIMEOUT=10
export PGOPTIONS="-c statement_timeout=12000 -c idle_in_transaction_session_timeout=12000"
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
 VALUES (24,31,1),(24,32,1),(24,33,1),(24,34,1),(25,31,1);
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
pid_a=''
pid_b=''
encerrar() {
  if [[ -n "$pid_a" ]]; then kill "$pid_a" 2>/dev/null || true; wait "$pid_a" 2>/dev/null || true; fi
  if [[ -n "$pid_b" ]]; then kill "$pid_b" 2>/dev/null || true; wait "$pid_b" 2>/dev/null || true; fi
  rm -rf "$tmp"
  cleanup
}
trap encerrar EXIT

bloqueada_por_a() {
  [[ $(psql_test -At -v nome_a="$1" -v nome_b="$2" <<'SQL'
SELECT EXISTS (
  SELECT 1 FROM pg_stat_activity b
  JOIN pg_stat_activity a ON a.pid = ANY(pg_blocking_pids(b.pid))
  WHERE a.application_name = :'nome_a' AND b.application_name = :'nome_b'
);
SQL
) == t ]]
}

executar_disputa() {
  local nome=$1 slot_a=$2 chave_a=$3 slot_b=$4 chave_b=$5 falha=${6:-}
  local app_a="dev024_${nome}_a" app_b="dev024_${nome}_b"
  local fifo="$tmp/$nome.sql" log_a="$tmp/$nome-a.log" log_b="$tmp/$nome-b.log"
  local entrada i pronta=false codigo_b=0
  mkfifo "$fifo"
  PGAPPNAME="$app_a" timeout 18 psql "$DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1 <"$fifo" >"$log_a" 2>&1 &
  pid_a=$!
  exec {entrada}<>"$fifo"
  printf "BEGIN;\nSELECT dev024_reserva_concorrente.reservar(24,%s,'%s');\n" "$slot_a" "$chave_a" >&"$entrada"
  for ((i=0; i<60; i++)); do
    if grep -Eq '^[0-9]+$' "$log_a" 2>/dev/null; then pronta=true; break; fi
    if ! kill -0 "$pid_a" 2>/dev/null; then break; fi
    sleep 0.1
  done
  if [[ "$pronta" != true ]]; then cat "$log_a"; echo "$nome: sessao A nao iniciou"; return 1; fi

  PGAPPNAME="$app_b" timeout 15 psql "$DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1 -v VERBOSITY=verbose \
    -c "SELECT dev024_reserva_concorrente.reservar(24,$slot_b,'$chave_b')" >"$log_b" 2>&1 &
  pid_b=$!
  pronta=false
  for ((i=0; i<60; i++)); do
    if bloqueada_por_a "$app_a" "$app_b"; then pronta=true; break; fi
    if ! kill -0 "$pid_b" 2>/dev/null; then break; fi
    sleep 0.1
  done
  if [[ "$pronta" != true ]]; then cat "$log_a" "$log_b"; echo "$nome: sessao B nao aguardou o lock de A"; return 1; fi

  printf 'COMMIT;\n' >&"$entrada"
  exec {entrada}>&-
  if ! wait "$pid_a"; then cat "$log_a"; return 1; fi
  pid_a=''
  wait "$pid_b" || codigo_b=$?
  pid_b=''
  if [[ -n "$falha" ]]; then
    if [[ "$codigo_b" == 0 ]] || ! grep -Fq "$falha" "$log_b"; then
      cat "$log_b"; echo "$nome: conflito esperado nao observado"; return 1
    fi
  elif [[ "$codigo_b" != 0 ]] || ! cmp -s "$log_a" "$log_b"; then
    cat "$log_a" "$log_b"; echo "$nome: as sessoes nao receberam o mesmo identificador"; return 1
  fi
}

# O COMMIT de A so acontece depois que o banco identifica B esperando por A.
executar_disputa cota 31 a 31 b 'P0001: cota esgotada'
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
# Replay concorrente e reutilizacao da mesma chave com slot diferente.
executar_disputa replay 32 mesma-chave 32 mesma-chave
executar_disputa divergente 33 chave-divergente 34 chave-divergente '23505: chave reutilizada em outro slot'
psql_test <<'SQL'
DO $$
BEGIN
  IF (SELECT count(*) FROM dev024_reserva_concorrente.reservas WHERE unidade=24 AND slot IN (32,33)) <> 2
    OR (SELECT sum(usados) FROM dev024_reserva_concorrente.cotas WHERE unidade=24 AND slot IN (32,33)) <> 2
    OR (SELECT usados FROM dev024_reserva_concorrente.cotas WHERE unidade=24 AND slot=34) <> 0
    OR (SELECT count(*) FROM dev024_reserva_concorrente.auditoria a
        JOIN dev024_reserva_concorrente.reservas r ON r.id=a.reserva_id
        WHERE r.unidade=24 AND r.slot IN (32,33)) <> 2
  THEN RAISE EXCEPTION 'efeitos indevidos apos replay ou conflito concorrente'; END IF;
END $$;
SQL
echo "DEV-024: disputa, replay e conflito de chave validados em duas conexoes independentes."
echo "Limites: sem agenda operacional, RLS ou homologacao clinica."
