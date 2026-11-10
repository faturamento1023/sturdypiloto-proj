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
   WHERE unidade_id = '00000000-0000-4000-8000-000000000024'
   AND regra_id = '00000000-0000-4000-8000-000000000031';
  SELECT utilizados INTO segunda FROM piloto_cota_contadores
   WHERE unidade_id = '00000000-0000-4000-8000-000000000024'
   AND regra_id = '00000000-0000-4000-8000-000000000032';
  IF primeira <> 0 OR segunda <> 0 THEN
    RAISE EXCEPTION 'DEV024: atualização parcial detectada (% / %)', primeira, segunda;
  END IF;
END
$dev024$;

-- Caminho positivo: com capacidade em ambas as regras, ambas devem consumir
-- exatamente uma unidade na mesma transação de teste.
UPDATE piloto_cota_contadores
   SET limite = 1
 WHERE unidade_id = '00000000-0000-4000-8000-000000000024'
   AND regra_id = '00000000-0000-4000-8000-000000000032';

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
   WHERE unidade_id = '00000000-0000-4000-8000-000000000024'
   AND regra_id = '00000000-0000-4000-8000-000000000031';
  SELECT utilizados INTO segunda FROM piloto_cota_contadores
   WHERE unidade_id = '00000000-0000-4000-8000-000000000024'
   AND regra_id = '00000000-0000-4000-8000-000000000032';
  IF primeira <> 1 OR segunda <> 1 THEN
    RAISE EXCEPTION 'DEV024: consumo positivo inconsistente (% / %)', primeira, segunda;
  END IF;
END
$dev024_sucesso$;

-- Caminho de saturacao: repetir a operacao deve falhar sem alterar
-- qualquer contador, inclusive quando uma regra ainda possui capacidade.
DO $dev024_saturacao$
DECLARE
  alteradas integer;
  primeira integer;
  segunda integer;
  bloqueou boolean := false;
BEGIN
  BEGIN
    UPDATE piloto_cota_contadores SET utilizados = utilizados + 1
     WHERE unidade_id = '00000000-0000-4000-8000-000000000024'
   AND regra_id = '00000000-0000-4000-8000-000000000031'
       AND utilizados < limite;
    GET DIAGNOSTICS alteradas = ROW_COUNT;
    IF alteradas <> 1 THEN RAISE EXCEPTION 'DEV024: primeira regra deveria ter capacidade'; END IF;

    UPDATE piloto_cota_contadores SET utilizados = utilizados + 1
     WHERE unidade_id = '00000000-0000-4000-8000-000000000024'
   AND regra_id = '00000000-0000-4000-8000-000000000032'
       AND utilizados < limite;
    GET DIAGNOSTICS alteradas = ROW_COUNT;
    IF alteradas <> 1 THEN RAISE EXCEPTION 'DEV024: segunda regra saturada'; END IF;
  EXCEPTION WHEN OTHERS THEN
    bloqueou := true;
  END;
  IF NOT bloqueou THEN RAISE EXCEPTION 'DEV024: saturacao nao bloqueou nova reserva'; END IF;
  SELECT utilizados INTO primeira FROM piloto_cota_contadores
   WHERE unidade_id = '00000000-0000-4000-8000-000000000024'
   AND regra_id = '00000000-0000-4000-8000-000000000031';
  SELECT utilizados INTO segunda FROM piloto_cota_contadores
   WHERE unidade_id = '00000000-0000-4000-8000-000000000024'
   AND regra_id = '00000000-0000-4000-8000-000000000032';
  IF primeira IS DISTINCT FROM 1 OR segunda IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'DEV024: saturacao alterou contadores (% / %)', primeira, segunda;
  END IF;
END
$dev024_saturacao$;
-- Regressao de isolamento: mesma regra e janela em outra unidade.
-- Um UPDATE sem unidade_id poderia consumir cota de outra unidade.
INSERT INTO piloto_cota_contadores
 (unidade_id, regra_id, janela_inicio, janela_fim, limite, utilizados)
VALUES
 ('00000000-0000-4000-8000-000000000025',
  '00000000-0000-4000-8000-000000000031',
  '2026-11-08 12:00+00','2026-11-08 13:00+00',5,0);

DO $dev024_outra_unidade$
DECLARE
  outra integer;
  local_atual integer;
BEGIN
  UPDATE piloto_cota_contadores SET utilizados = utilizados + 1
   WHERE unidade_id = '00000000-0000-4000-8000-000000000024'
     AND regra_id = '00000000-0000-4000-8000-000000000031'
     AND utilizados < limite;
  SELECT utilizados INTO outra FROM piloto_cota_contadores
   WHERE unidade_id = '00000000-0000-4000-8000-000000000025'
     AND regra_id = '00000000-0000-4000-8000-000000000031';
  SELECT utilizados INTO local_atual FROM piloto_cota_contadores
   WHERE unidade_id = '00000000-0000-4000-8000-000000000024'
     AND regra_id = '00000000-0000-4000-8000-000000000031';
  IF outra IS DISTINCT FROM 0 OR local_atual IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'DEV024: vazamento entre unidades (% / %)', outra, local_atual;
  END IF;
END
$dev024_outra_unidade$;

-- Regressao inversa: consumo autorizado na outra unidade nao altera a local.
-- Usa a mesma regra e janela para exercitar a chave composta.
DO $dev024_isolamento_inverso$
DECLARE
  alteradas integer;
  outra integer;
  local_atual integer;
BEGIN
  UPDATE piloto_cota_contadores SET utilizados = utilizados + 1
   WHERE unidade_id = '00000000-0000-4000-8000-000000000025'
     AND regra_id = '00000000-0000-4000-8000-000000000031'
     AND utilizados < limite;
  GET DIAGNOSTICS alteradas = ROW_COUNT;
  IF alteradas <> 1 THEN
    RAISE EXCEPTION 'DEV024: consumo da outra unidade nao foi unico (%)', alteradas;
  END IF;
  SELECT utilizados INTO outra FROM piloto_cota_contadores
   WHERE unidade_id = '00000000-0000-4000-8000-000000000025'
     AND regra_id = '00000000-0000-4000-8000-000000000031';
  SELECT utilizados INTO local_atual FROM piloto_cota_contadores
   WHERE unidade_id = '00000000-0000-4000-8000-000000000024'
     AND regra_id = '00000000-0000-4000-8000-000000000031';
  IF outra IS DISTINCT FROM 1 OR local_atual IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'DEV024: isolamento inverso falhou (% / %)', outra, local_atual;
  END IF;
END
$dev024_isolamento_inverso$;

-- Regressao temporal: mesma unidade e regra, mas janelas distintas.
-- O identificador da regra sozinho nao identifica um contador.
INSERT INTO piloto_cota_contadores
 (unidade_id, regra_id, janela_inicio, janela_fim, limite, utilizados)
VALUES
 ('00000000-0000-4000-8000-000000000025',
  '00000000-0000-4000-8000-000000000031',
  '2026-11-08 13:00+00','2026-11-08 14:00+00',5,0);
DO $dev024_isolamento_janela$
DECLARE
  alteradas integer;
  janela_original integer;
  janela_seguinte integer;
BEGIN
  UPDATE piloto_cota_contadores SET utilizados = utilizados + 1
   WHERE unidade_id = '00000000-0000-4000-8000-000000000025'
     AND regra_id = '00000000-0000-4000-8000-000000000031'
     AND janela_inicio = '2026-11-08 13:00+00'::timestamptz
     AND janela_fim = '2026-11-08 14:00+00'::timestamptz
     AND utilizados < limite;
  GET DIAGNOSTICS alteradas = ROW_COUNT;
  IF alteradas <> 1 THEN
    RAISE EXCEPTION 'DEV024: janela alvo nao foi atualizada uma unica vez (%)', alteradas;
  END IF;
  SELECT utilizados INTO janela_original FROM piloto_cota_contadores
   WHERE unidade_id = '00000000-0000-4000-8000-000000000025'
     AND regra_id = '00000000-0000-4000-8000-000000000031'
     AND janela_inicio = '2026-11-08 12:00+00'::timestamptz;
  SELECT utilizados INTO janela_seguinte FROM piloto_cota_contadores
   WHERE unidade_id = '00000000-0000-4000-8000-000000000025'
     AND regra_id = '00000000-0000-4000-8000-000000000031'
     AND janela_inicio = '2026-11-08 13:00+00'::timestamptz;
  IF janela_original IS DISTINCT FROM 1 OR janela_seguinte IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'DEV024: vazamento entre janelas (% / %)', janela_original, janela_seguinte;
  END IF;
END
$dev024_isolamento_janela$;
ROLLBACK;
