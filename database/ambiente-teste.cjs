const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { btree_gist } = require('@electric-sql/pglite/contrib/btree_gist');

async function criarBancoTeste() {
  const db = await PGlite.create({ extensions: { btree_gist } });
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
      create function auth.jwt() returns jsonb language sql stable as
        $$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
      grant usage on schema auth to authenticated;
    `);
    for (const arquivo of ['dev009_modelo.sql', 'dev013_autorizacao.sql', 'dev014_shell.sql', 'dev015_auditoria.sql', 'dev016_medicos.sql', 'dev017_usuarios.sql']) {
      await db.exec(readFileSync(join(__dirname, arquivo), 'utf8'));
    }
    return db;
  } catch (erro) {
    await db.close();
    throw erro;
  }
}

module.exports = { criarBancoTeste };
