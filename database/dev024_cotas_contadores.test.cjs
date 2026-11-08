// DEV-024: testes de integridade do contador em PostgreSQL WASM descartável.
// Não testa concorrência entre conexões, RLS, agenda ou homologação clínica.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

const schema = fs.readFileSync(path.join(__dirname, '../sql/dev024_cotas_contadores_experimental.sql'), 'utf8');
const unit = '00000000-0000-4000-8000-000000000024';
const rule = '00000000-0000-4000-8000-000000000025';
const start = '2026-11-08T10:00:00Z';
const end = '2026-11-08T11:00:00Z';

async function dbWithCounter(limit = 1) {
  const db = new PGlite();
  await db.exec(schema);
  await db.query(
    'INSERT INTO piloto_cota_contadores (unidade_id, regra_id, janela_inicio, janela_fim, limite) VALUES ($1,$2,$3,$4,$5)',
    [unit, rule, start, end, limit]
  );
  return db;
}
async function consume(db) {
  return db.query(
    'UPDATE piloto_cota_contadores SET utilizados=utilizados+1 WHERE unidade_id=$1 AND regra_id=$2 AND janela_inicio=$3 AND janela_fim=$4 AND utilizados<limite RETURNING utilizados',
    [unit, rule, start, end]
  );
}

test('DEV024: limite 1 permite um consumo e rejeita o segundo', async () => {
  const db = await dbWithCounter();
  try {
    assert.equal((await consume(db)).rows.length, 1);
    assert.equal((await consume(db)).rows.length, 0);
    const result = await db.query('SELECT utilizados, limite FROM piloto_cota_contadores');
    assert.equal(result.rows[0].utilizados, 1);
    assert.equal(result.rows[0].limite, 1);
  } finally { await db.close(); }
});

test('DEV024: limite zero bloqueia o consumo', async () => {
  const db = await dbWithCounter(0);
  try { assert.equal((await consume(db)).rows.length, 0); }
  finally { await db.close(); }
});

test('DEV024: CHECK impede ultrapassagem direta do limite', async () => {
  const db = await dbWithCounter();
  try {
    await assert.rejects(db.query('UPDATE piloto_cota_contadores SET utilizados=2'));
    assert.equal((await db.query('SELECT utilizados FROM piloto_cota_contadores')).rows[0].utilizados, 0);
  } finally { await db.close(); }
});

test('DEV024: transação revertida não consome cota', async () => {
  const db = await dbWithCounter();
  try {
    await db.exec('BEGIN');
    assert.equal((await consume(db)).rows.length, 1);
    await db.exec('ROLLBACK');
    assert.equal((await db.query('SELECT utilizados FROM piloto_cota_contadores')).rows[0].utilizados, 0);
  } finally { await db.close(); }
});

test('DEV024: janela inválida é rejeitada', async () => {
  const db = new PGlite();
  try {
    await db.exec(schema);
    await assert.rejects(db.query(
      'INSERT INTO piloto_cota_contadores (unidade_id,regra_id,janela_inicio,janela_fim,limite) VALUES ($1,$2,$3,$4,1)',
      [unit, rule, end, start]
    ));
  } finally { await db.close(); }
});
