'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sql=fs.readFileSync(require('node:path').join(__dirname,'dev023_excecoes_feriados.sql'),'utf8');
test('tabelas de feriados e excecoes',()=>{assert.match(sql,/create table piloto\.feriados_agenda/);assert.match(sql,/create table piloto\.excecoes_agenda/);});
test('isolamento RLS nas duas tabelas',()=>{for(const t of ['feriados_agenda','excecoes_agenda']){assert.match(sql,new RegExp('alter table piloto\\.'+t+' enable row level security'));assert.match(sql,new RegExp('create policy '+t+'_ler'));}});
test('escrita direta nao autorizada',()=>{assert.match(sql,/revoke all on piloto\.feriados_agenda,piloto\.excecoes_agenda/);assert.doesNotMatch(sql,/grant (insert|update|delete|all) on/i);});
test('auditoria em mutacoes',()=>assert.equal((sql.match(/execute function piloto_privado\.registrar_mutacao\(\)/g)||[]).length,2));
test('validacao de intervalo e profissional em substituicao',()=>{assert.match(sql,/fim_minuto > inicio_minuto/);assert.match(sql,/tipo <> 'substituicao' or profissional_id is not null/);});

test('leitura de excecoes valida janela e audita via grade',()=>{
 assert.match(sql,/create function public\.piloto_ler_excecoes_agenda/);
 assert.match(sql,/ate - de > 31/);
 assert.match(sql,/piloto_privado\.autorizar_grade\(unidade,profissional,correlacao\)/);
});
test('consulta restringe profissional e nao inclui paciente',()=>{
 assert.match(sql,/e\.profissional_id=profissional/);
 assert.doesNotMatch(sql,/paciente_id|cpf|nome_paciente/i);
});
test('medico enxerga bloqueio geral da unidade com RLS',()=>{
 assert.match(sql,/profissional_id is null and exists/);
 assert.match(sql,/piloto_privado\.e_profissional\(p\.unidade_id,p\.id\)/);
});
test('RPC nao publica acesso anonimo',()=>{
 assert.match(sql,/revoke all on function public\.piloto_ler_excecoes_agenda/);
 assert.match(sql,/to authenticated/);
});

test('RPC usa delimitadores PLpgSQL validos',()=>{
 const open=sql.indexOf('as $$');
 const close=sql.indexOf('$$;',open+5);
 assert.ok(open>=0,'abertura $$ ausente');
 assert.ok(close>open,'fechamento $$ ausente');
 assert.match(sql.slice(open,close),/declare resposta jsonb;/);
 assert.match(sql.slice(close),/revoke all on function public\\.piloto_ler_excecoes_agenda/);
});
