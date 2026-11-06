import test from 'node:test';
import assert from 'node:assert/strict';
import {avaliarAutorizacao} from './politica.ts';
const id={usuarioId:'u1',aal:'aal2' as const};
const v=(perfil:'recepcao'|'medico'|'financeiro'|'gestao'|'administrador',unidadeId='a',ativo=true)=>({usuarioId:'u1',unidadeId,perfil,ativo});
const base={identidade:id,unidadeId:'a',unidadeAtiva:true,vinculos:[v('recepcao')],recurso:'agenda' as const,acao:'ler' as const};
test('AUTHZ-01/02: sessão e MFA exigidos',()=>{assert.equal(avaliarAutorizacao({...base,identidade:null}).status,401);assert.equal(avaliarAutorizacao({...base,identidade:{...id,aal:'aal1'}}).status,403)});
test('AUTHZ-03/04/15: vínculos ativos e unidade corrente',()=>{assert.equal(avaliarAutorizacao({...base,vinculos:[v('recepcao','a',false)]}).status,403);assert.equal(avaliarAutorizacao({...base,vinculos:[v('recepcao','b')]}).status,403);assert.equal(avaliarAutorizacao({...base,unidadeAtiva:false}).status,403)});
test('AUTHZ-05/06: médico precisa atribuição do objeto',()=>{const b={...base,vinculos:[v('medico')],recurso:'clinico' as const,objeto:{unidadeId:'a',profissionalUsuarioId:'u2'}};assert.equal(avaliarAutorizacao(b).status,404);assert.equal(avaliarAutorizacao({...b,objeto:{unidadeId:'a',profissionalUsuarioId:'u1'}}).status,200)});
test('AUTHZ-07/08/09: não médicos não acessam texto clínico',()=>{for(const perfil of ['recepcao','financeiro','gestao'] as const)assert.equal(avaliarAutorizacao({...base,vinculos:[v(perfil)],recurso:'clinico'}).status,403)});
test('AUTHZ-10/11: recebimento e estorno bloqueados',()=>{for(const perfil of ['medico','financeiro','gestao','administrador'] as const)for(const acao of ['receber','estornar'] as const)assert.equal(avaliarAutorizacao({...base,vinculos:[v(perfil)],recurso:'recebimento',acao}).status,403)});
test('AUTHZ-12: união de papéis só na mesma unidade',()=>{assert.equal(avaliarAutorizacao({...base,vinculos:[v('recepcao'),v('financeiro','b')],recurso:'financeiro'}).status,403);assert.equal(avaliarAutorizacao({...base,vinculos:[v('recepcao'),v('financeiro')],recurso:'financeiro'}).status,200)});
test('AUTHZ-13/14: ID conhecido de outra unidade não autoriza',()=>{assert.equal(avaliarAutorizacao({...base,objeto:{unidadeId:'b'}}).status,404);assert.equal(avaliarAutorizacao({...base,recurso:'auditoria'}).status,403)});
test('Falha fechada para operações sem política e objetos clínicos sem atribuição',()=>{assert.equal(avaliarAutorizacao({...base,recurso:'vinculo',acao:'alterar'}).status,403);assert.equal(avaliarAutorizacao({...base,vinculos:[v('medico')],recurso:'clinico',objeto:{unidadeId:'a'}}).status,404)});

test('Entradas HTTP malformadas não podem acessar propriedades herdadas da política',()=>{
  for(const recurso of ['__proto__','constructor','toString','nao_existe']){
    const resultado=avaliarAutorizacao({...base,recurso:recurso as typeof base.recurso});
    assert.deepEqual(resultado,{autorizado:false,status:403,motivo:'permissao_negada'});
  }
  for(const acao of ['__proto__','constructor','toString','nao_existe']){
    const resultado=avaliarAutorizacao({...base,acao:acao as typeof base.acao});
    assert.equal(resultado.status,403);
  }
});
test('Vínculo de outra identidade nunca herda permissão',()=>{
  assert.equal(avaliarAutorizacao({...base,vinculos:[{...v('recepcao'),usuarioId:'outra-conta'}]}).status,403);
});
test('Perfil operacional adicional não autoriza conteúdo clínico',()=>{
  const resultado=avaliarAutorizacao({...base,vinculos:[v('medico'),v('recepcao')],recurso:'clinico',objeto:{unidadeId:'a',profissionalUsuarioId:'u2'}});
  assert.equal(resultado.status,404);
});
