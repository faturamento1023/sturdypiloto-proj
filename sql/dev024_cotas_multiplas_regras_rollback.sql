-- DEV-024 — teste de atomicidade multi-regra com dados sintéticos.
-- Executar APENAS em PostgreSQL descartável, depois de
-- sql/dev024_cotas_contadores_experimental.sql.
-- Testa rollback de duas atualizações na mesma subtransação PL/pgSQL.
-- NÃO comprova concorrência entre conexões, RLS, auditoria ou integração.
BEGIN;
INSERT INTO piloto_cota_contadores
 (unidade_id, regra_id, janela_inicio, janela_fim, limite, utilizados)
VALUES
 ('00000000-0000-4000-8000-000000000024',
  '00000000-0000-4000-8000-000000000031',
  '2026-11-08 12:00+00','2026-11-08 13:00+00',2,0),
 ('00000000-0000-4000-8000-000000000024',
  '00000000-0000-4000-8000-000000000032',
  '2026-11-08 12:00+00','2026-11-08 13:00+00',0,0);
DO $dev024$
DECLARE
  alteradas integer;
  primeira integer;
  segunda integer;
  falhou boolean := false;
BEGIN
  -- O bloco EXCEPTION cria uma subtransação: se a segunda regra falhar,
  -- a primeira atualização também é revertida.
  BEGIN
    UPDATE piloto_cota_contadores SET utilizados = utilizados + 1
    WHERE unidade_id = '00000000-0000-4000-8000-000000000024'
      AND regra_id = '00000000-0000-4000-8000-000000000031'
      AND utilizados < limite;
    GET DIAGNOSTICS alteradas = ROW_COUNT;
    IF alteradas <> 1 THEN RAISE EXCEPTION 'DEV024: primeira regra falhou'; END IF;

    UPDATE piloto_cota_contadores SET utilizados = utilizados + 1
    WHERE unidade_id = '00000000-0000-4000-8000-000000000024'
      AND regra_id = '00000000-0000-4000-8000-000000000032'
      AND utilizados < limite;
    GET DIAGNOSTICS alteradas = ROW_COUNT;
    IF alteradas <> 1 THEN RAISE EXCEPTION 'DEV024: segunda regra sem vaga'; END IF;
  EXCEPTION WHEN OTHERS THEN
    falhou := true;
  END;

  IF NOT falhou THEN RAISE EXCEPTION 'DEV024: era esperado bloqueio pela segunda regra'; END IF;
  SELECT utilizados INTO primeira FROM piloto_cota_contadores
   WHERE regra_id = '00000000-0000-4000-8000-000000000031';
  SELECT utilizados INTO segunda FROM piloto_cota_contadores
   WHERE regra_id = '00000000-0000-4000-8000-000000000032';
  IF primeira <> 0 OR segunda <> 0 THEN
    RAISE EXCEPTION 'DEV024: atualização parcial detectada (% / %)', primeira, segunda;
  END IF;
END
$dev024$;

-- Caminho positivo: com capacidade em ambas as regras, ambas devem consumir
-- exatamente uma unidade na mesma transação de teste.
UPDATE piloto_cota_contadores
   SET limite = 1
 WHERE regra_id = '00000000-0000-4000-8000-000000000032';

DO $dev024_sucesso$
DECLARE
  alteradas integer;
  primeira integer;
  segunda integer;
BEGIN
  UPDATE piloto_cota_contadores SET utilizados = utilizados + 1
   WHERE unidade_id = '00000000-0000-4000-8000-000000000024'
     AND regra_id = '00000000-0000-4000-8000-000000000031'
     AND utilizados < limite;
  GET DIAGNOSTICS alteradas = ROW_COUNT;
  IF alteradas <> 1 THEN RAISE EXCEPTION 'DEV024: primeira regra nao consumida'; END IF;

  UPDATE piloto_cota_contadores SET utilizados = utilizados + 1
   WHERE unidade_id = '00000000-0000-4000-8000-000000000024'
     AND regra_id = '00000000-0000-4000-8000-000000000032'
     AND utilizados < limite;
  GET DIAGNOSTICS alteradas = ROW_COUNT;
  IF alteradas <> 1 THEN RAISE EXCEPTION 'DEV024: segunda regra nao consumida'; END IF;

  SELECT utilizados INTO primeira FROM piloto_cota_contadores
   WHERE regra_id = '00000000-0000-4000-8000-000000000031';
  SELECT utilizados INTO segunda FROM piloto_cota_contadores
   WHERE regra_id = '00000000-0000-4000-8000-000000000032';
  IF primeira <> 1 OR segunda <> 1 THEN
    RAISE EXCEPTION 'DEV024: consumo positivo inconsistente (% / %)', primeira, segunda;
  END IF;
END
$dev024_sucesso$;
ROLLBACK;
