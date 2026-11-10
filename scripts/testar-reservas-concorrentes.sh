#!/usr/bin/env bash
# Exercita os RPCs integrados em duas conexões de um PostgreSQL exclusivo de CI.
set -euo pipefail
: "${PGPORT:?porta do PostgreSQL descartável obrigatória}"
export PGCONNECT_TIMEOUT=5 PGOPTIONS='-c statement_timeout=15000 -c idle_in_transaction_session_timeout=15000'
psql_teste() { psql -h 127.0.0.1 -p "$PGPORT" -d piloto_reservas_teste -U piloto_teste -X -qAt -v ON_ERROR_STOP=1 "$@"; }
if [[ $(psql_teste -c "select to_regnamespace('piloto') is null and to_regnamespace('auth') is null") != t ]]; then
  echo 'O banco de teste precisa estar vazio.' >&2; exit 1
fi
node -e 'const { migracoes, papeisTeste } = require("./database/ambiente-teste.cjs");
const fs = require("node:fs"); console.log(papeisTeste);
for (const arquivo of migracoes) console.log(fs.readFileSync("database/" + arquivo, "utf8"));' | psql_teste

psql_teste <<'SQL'
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
insert into piloto.unidades(id,nome) values ('00000000-0000-4000-8000-000000000011','Unidade sintética');
insert into piloto_privado.vinculos(unidade_id,usuario_id,perfil) values
 ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001','recepcao'),
 ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000002','recepcao');
insert into piloto.profissionais(unidade_id,id,nome) values ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000021','Profissional sintético');
insert into piloto.pacientes(unidade_id,id,nome) values ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000031','Paciente sintético');
insert into piloto.convenios(unidade_id,id,nome) values ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000041','Convênio sintético');
insert into piloto.procedimentos(unidade_id,id,codigo,descricao) values ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000051','SINT','Procedimento sintético');
insert into piloto.janelas_agenda(unidade_id,profissional_id,periodo)
 select '00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000021',
   tstzrange((dia + time '08:00') at time zone 'UTC', (dia + time '12:00') at time zone 'UTC', '[)')
 from (values (date '2090-11-06'), (date '2090-11-07')) x(dia);
insert into piloto_privado.cotas_agenda(unidade_id,vigencia,limite)
 values ('00000000-0000-4000-8000-000000000011','[2090-11-06,2090-11-07)',1);
SQL

tmp=$(mktemp -d)
pid_a=''
pid_b=''
limpar() {
  for pid in "$pid_a" "$pid_b"; do
    if [[ -n "$pid" ]]; then kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; fi
  done
  rm -rf "$tmp"
}
trap limpar EXIT

comandos() {
  local usuario=$1 chave=$2 dia=$3 de=$4 ate=$5
  cat <<SQL
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000000${usuario}","aal":"aal2"}';
select public.piloto_reservar_horario('00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-0000000000${chave}', '00000000-0000-4000-8000-000000000031',
  '00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000041',
  '00000000-0000-4000-8000-000000000051','${dia} ${de}:00+00','${dia} ${ate}:00+00',gen_random_uuid());
SQL
}

em_espera() {
  [[ $(psql_teste -c "select exists(select 1 from pg_stat_activity b join pg_stat_activity a
    on a.pid = any(pg_blocking_pids(b.pid)) where a.application_name='reserva_a' and b.application_name='reserva_b')") == t ]]
}

disputar() {
  local dia=$1 chave_a=$2 chave_b=$3 inicio_b=$4 fim_b=$5 erro=$6
  local log_a="$tmp/$chave_a-a.log" log_b="$tmp/$chave_b-b.log" fila="$tmp/$chave_a.fifo" fd i
  mkfifo "$fila"
  (export PGAPPNAME=reserva_a; exec psql -h 127.0.0.1 -p "$PGPORT" -d piloto_reservas_teste -U piloto_teste -X -qAt -v ON_ERROR_STOP=1) <"$fila" >"$log_a" 2>&1 &
  pid_a=$!
  exec {fd}<>"$fila"
  comandos 1 "$chave_a" "$dia" 08:00 08:30 >&"$fd"
  for ((i=0; i<80; i++)); do
    if grep -Fxq "00000000-0000-4000-8000-0000000000$chave_a" "$log_a" 2>/dev/null; then break; fi
    if ! kill -0 "$pid_a" 2>/dev/null; then cat "$log_a"; return 1; fi
    sleep 0.1
  done
  if [[ "$i" == 80 ]]; then cat "$log_a"; echo 'Primeira reserva não iniciou.'; return 1; fi

  { comandos 2 "$chave_b" "$dia" "$inicio_b" "$fim_b"; printf 'commit;\n'; } >"$tmp/$chave_b.sql"
  (export PGAPPNAME=reserva_b; exec psql -h 127.0.0.1 -p "$PGPORT" -d piloto_reservas_teste -U piloto_teste -X -qAt -v ON_ERROR_STOP=1 -v VERBOSITY=verbose) <"$tmp/$chave_b.sql" >"$log_b" 2>&1 &
  pid_b=$!
  for ((i=0; i<80; i++)); do
    if em_espera; then break; fi
    if ! kill -0 "$pid_b" 2>/dev/null; then cat "$log_b"; return 1; fi
    sleep 0.1
  done
  if [[ "$i" == 80 ]]; then cat "$log_b"; echo 'Segunda reserva não esperou o bloqueio.'; return 1; fi
  printf 'commit;\n' >&"$fd"
  exec {fd}>&-
  wait "$pid_a"; pid_a=''
  if wait "$pid_b"; then cat "$log_b"; echo 'Duas reservas foram aceitas.'; return 1; fi
  pid_b=''
  if ! grep -Fq "$erro" "$log_b"; then cat "$log_b"; return 1; fi
}

disputar '2090-11-06' '61' '62' '09:00' '09:30' 'P0024:'
disputar '2090-11-07' '63' '64' '08:00' '08:30' '23P01:'
[[ $(psql_teste -c 'select count(*) from piloto.agendamentos') == 2 ]]
[[ $(psql_teste -c "select count(*) from piloto_privado.auditoria where entidade='agendamentos' and operacao='INSERT'") == 2 ]]
echo 'PostgreSQL: conflito de horário e última vaga da cota verificados em duas conexões.'
