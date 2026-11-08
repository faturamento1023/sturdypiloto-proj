#!/usr/bin/env bash
# DEV-024: ensaio automatizado de duas conexões reais PostgreSQL.
# APENAS banco descartável; nunca executar em produção/Supabase hospedado.
set -euo pipefail
: "${DATABASE_URL:?Defina DATABASE_URL para um PostgreSQL LOCAL DESCARTÁVEL}"
command -v psql >/dev/null || { echo "psql não instalado" >&2; exit 2; }
command -v timeout >/dev/null || { echo "timeout não instalado" >&2; exit 2; }
# Exigir URI PostgreSQL sem parâmetros que possam sobrescrever host/porta.
# Procurar apenas a substring "localhost" não é seguro: um host remoto
# como localhost.exemplo.org também passaria nessa verificação.
if [[ ! "$DATABASE_URL" =~ ^postgres(ql)?://([^/?#@]+@)?(localhost|127\\.0\\.0\\.1)(:[0-9]{1,5})?/[^/?#]+$ ]]; then
  echo "Segurança: use URI postgres:// ou postgresql:// para localhost/127.0.0.1, com banco explícito e sem query/fragmento" >&2
  exit 2
fi
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp="$(mktemp -d)"
schema="dev024_concorrencia_${RANDOM}_$$"
psql_run() { psql "$DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1 "$@"; }
cleanup() {
  psql_run -c "DROP SCHEMA IF EXISTS $schema CASCADE" >/dev/null 2>&1 || true
  rm -rf "$tmp"
}
trap cleanup EXIT
psql_run -c "CREATE SCHEMA $schema" >/dev/null
PGOPTIONS="-c search_path=$schema,public -c statement_timeout=12000" \
  psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 -f "$root/sql/dev024_cotas_contadores_experimental.sql" >/dev/null
key="'00000000-0000-4000-8000-000000000024','00000000-0000-4000-8000-000000000099','2026-11-08 10:00+00','2026-11-08 11:00+00'"
for mode in commit rollback; do
  psql_run -c "SET search_path TO $schema; TRUNCATE piloto_cota_contadores; INSERT INTO piloto_cota_contadores(unidade_id,regra_id,janela_inicio,janela_fim,limite,utilizados) VALUES ($key,1,0);" >/dev/null
  cat > "$tmp/a.sql" <<SQL
SET search_path TO $schema;
BEGIN;
UPDATE piloto_cota_contadores SET utilizados=utilizados+1 WHERE regra_id='00000000-0000-4000-8000-000000000099' AND utilizados<limite RETURNING utilizados;
SELECT pg_sleep(3);
$( [[ "$mode" == commit ]] && echo COMMIT || echo ROLLBACK );
SQL
  cat > "$tmp/b.sql" <<SQL
SET search_path TO $schema;
BEGIN;
UPDATE piloto_cota_contadores SET utilizados=utilizados+1 WHERE regra_id='00000000-0000-4000-8000-000000000099' AND utilizados<limite RETURNING utilizados;
COMMIT;
SQL
  timeout 15 psql "$DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1 -f "$tmp/a.sql" >"$tmp/a.out" 2>"$tmp/a.err" &
  pid_a=$!
  sleep 1
  timeout 15 psql "$DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1 -f "$tmp/b.sql" >"$tmp/b.out" 2>"$tmp/b.err" &
  pid_b=$!
  wait "$pid_a" || { cat "$tmp/a.err" >&2; exit 1; }
  wait "$pid_b" || { cat "$tmp/b.err" >&2; exit 1; }
  first="$(grep -xc '1' "$tmp/a.out" || true)"
  second="$(grep -xc '1' "$tmp/b.out" || true)"
  final="$(psql_run -c "SET search_path TO $schema; SELECT utilizados FROM piloto_cota_contadores WHERE regra_id='00000000-0000-4000-8000-000000000099'")"
  [[ "$first" == 1 && "$final" == 1 ]] || { echo "FALHA $mode: A=$first final=$final" >&2; exit 1; }
  if [[ "$mode" == commit ]]; then
    [[ "$second" == 0 ]] || { echo "FALHA: segunda reserva aceita após COMMIT" >&2; exit 1; }
  else
    [[ "$second" == 1 ]] || { echo "FALHA: segunda reserva não assumiu vaga após ROLLBACK" >&2; exit 1; }
  fi
  echo "OK: $mode; A=$first B=$second utilizados=$final"
done
echo "PASSOU: duas sessões PostgreSQL reais; apenas contador, não reserva clínica."
