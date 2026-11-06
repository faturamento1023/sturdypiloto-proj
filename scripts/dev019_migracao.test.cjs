'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sql = fs.readFileSync(path.join(__dirname, '../database/dev019_convenios_precos.sql'), 'utf8');
test('migração usa transação explicita', () => {
  assert.match(sql, /\bbegin\s*;/i);
  assert.match(sql, /\bcommit\s*;/i);
});
test('blocos DO possuem delimitadores validos', () => {
  assert.doesNotMatch(sql, /\bdo\s+\$\s+begin/i);
  assert.doesNotMatch(sql, /\bend\s+\$\s*;/i);
  assert.equal((sql.match(/\bdo\s+\$dev019\$/gi) || []).length, 2);
  assert.equal((sql.match(/\bend\s+\$dev019\$;/gi) || []).length, 2);
});
test('migração nao apaga tabelas ou linhas', () => {
  assert.doesNotMatch(sql, /\b(drop|truncate|delete)\s+(table|from|piloto\.)/i);
});
test('revisao e unicidade por unidade presentes', () => {
  assert.match(sql, /add column if not exists revisao integer not null default 1/gi);
  assert.match(sql, /on piloto\.convenios \(unidade_id, lower\(btrim\(nome\)\)\)/i);
});
