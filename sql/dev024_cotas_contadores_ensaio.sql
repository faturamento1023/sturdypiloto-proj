-- DEV-024 — ensaio transacional isolado (dados inteiramente fictícios).
-- Executar SOMENTE em PostgreSQL descartável, após
-- sql/dev024_cotas_contadores_experimental.sql.
-- Não habilita RLS nem substitui testes de concorrência em sessões distintas.
BEGIN;
INSERT INTO piloto_cota_contadores
 (unidade_id, regra_id, janela_inicio, janela_fim, limite, utilizados)
VALUES
 ('00000000-0000-4000-8000-000000000024',
  '00000000-0000-4000-8000-000000000025',
  '2026-11-08 10:00:00+00', '2026-11-08 11:00:00+00', 1, 0);
DO $dev024$
DECLARE
  n integer;
  usado integer;
BEGIN
  UPDATE piloto_cota_contadores SET utilizados = utilizados + 1
   WHERE unidade_id = '00000000-0000-4000-8000-000000000024'
     AND regra_id = '00000000-0000-4000-8000-000000000025'
     AND janela_inicio = '2026-11-08 10:00:00+00'
     AND janela_fim = '2026-11-08 11:00:00+00'
     AND utilizados < limite;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'DEV024: primeira reserva deveria consumir uma vaga'; END IF;

  UPDATE piloto_cota_contadores SET utilizados = utilizados + 1
   WHERE unidade_id = '00000000-0000-4000-8000-000000000024'
     AND regra_id = '00000000-0000-4000-8000-000000000025'
     AND janela_inicio = '2026-11-08 10:00:00+00'
     AND janela_fim = '2026-11-08 11:00:00+00'
     AND utilizados < limite;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'DEV024: ultrapassagem de cota permitida'; END IF;

  SELECT utilizados INTO usado FROM piloto_cota_contadores
   WHERE unidade_id = '00000000-0000-4000-8000-000000000024'
     AND regra_id = '00000000-0000-4000-8000-000000000025'
     AND janela_inicio = '2026-11-08 10:00:00+00'
     AND janela_fim = '2026-11-08 11:00:00+00';
  IF usado <> 1 THEN RAISE EXCEPTION 'DEV024: contador inconsistente'; END IF;
END
$dev024$;
-- ROLLBACK deliberado: o ensaio não persiste nem seus dados fictícios.
ROLLBACK;
