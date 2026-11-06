import test from 'node:test';
import assert from 'node:assert/strict';
import {autorizarNoServidor, type FonteAutorizacao} from './servidor.ts';
const identidade={usuarioId:'conta-ficticia',aal:'aal2' as const};
function fonte(): FonteAutorizacao {
  return {
    sessaoAtual:async()=>identidade,
    unidadeAtiva:async()=>true,
    vinculosAtuais:async(usuarioId,unidadeId)=>[{usuarioId,unidadeId,perfil:'recepcao',ativo:true}],
    objetoNaUnidade:async()=>({unidadeId:'a'})
  };
}
const req={unidadeId:'a',recurso:'agenda' as const,acao:'ler' as const};
test('consulta identidade e vínculo a cada requisição, revogação imediata',async()=>{
  const f=fonte();let ativo=true;let chamadas=0;
  f.vinculosAtuais=async(usuarioId,unidadeId)=>{chamadas++;return [{usuarioId,unidadeId,perfil:'recepcao',ativo}]};
  assert.equal((await autorizarNoServidor(f,req)).status,200);
  ativo=false;
  assert.equal((await autorizarNoServidor(f,req)).status,403);
  assert.equal(chamadas,2);
});
test('sem sessão ou MFA não consulta vínculos',async()=>{
  const f=fonte();let consultas=0;
  f.vinculosAtuais=async()=>{consultas++;return []};
  f.sessaoAtual=async()=>null;
  assert.equal((await autorizarNoServidor(f,req)).status,401);
  f.sessaoAtual=async()=>({...identidade,aal:'aal1'});
  assert.equal((await autorizarNoServidor(f,req)).status,403);
  assert.equal(consultas,0);
});
test('objeto de outra unidade ou ausente responde 404 sem exposição',async()=>{
  const f=fonte();
  f.objetoNaUnidade=async()=>({unidadeId:'b'});
  assert.equal((await autorizarNoServidor(f,{...req,objetoId:'registro-ficticio'})).status,404);
  f.objetoNaUnidade=async()=>null;
  assert.equal((await autorizarNoServidor(f,{...req,objetoId:'registro-ficticio'})).status,404);
});
test('atribuição clínica só autoriza médico da própria identidade',async()=>{
  const f=fonte();
  f.vinculosAtuais=async(usuarioId,unidadeId)=>[{usuarioId,unidadeId,perfil:'medico',ativo:true}];
  f.objetoNaUnidade=async()=>({unidadeId:'a',profissionalUsuarioId:'outro-medico'});
  assert.equal((await autorizarNoServidor(f,{...req,recurso:'clinico',objetoId:'prontuario-ficticio'})).status,404);
  f.objetoNaUnidade=async()=>({unidadeId:'a',profissionalUsuarioId:identidade.usuarioId});
  assert.equal((await autorizarNoServidor(f,{...req,recurso:'clinico',objetoId:'prontuario-ficticio'})).status,200);
});
test('falhas de fonte são negadas sem mensagem de erro ou dados internos',async()=>{
  const f=fonte();
  f.vinculosAtuais=async()=>{throw new Error('credencial-secreta-nao-expor')};
  assert.deepEqual(await autorizarNoServidor(f,req),{autorizado:false,status:403,motivo:'verificacao_indisponivel'});
});
test('permissão não atravessa unidades nem habilita recebimentos',async()=>{
  const f=fonte();
  f.vinculosAtuais=async(usuarioId)=>[{usuarioId,unidadeId:'b',perfil:'financeiro',ativo:true}];
  assert.equal((await autorizarNoServidor(f,{...req,recurso:'financeiro'})).status,403);
  f.vinculosAtuais=async(usuarioId,unidadeId)=>[{usuarioId,unidadeId,perfil:'financeiro',ativo:true}];
  assert.equal((await autorizarNoServidor(f,{...req,recurso:'recebimento',acao:'receber'})).status,403);
});

test('entrada HTTP adulterada é negada antes de consultar objeto ou vínculos',async()=>{
  const f=fonte();let leituras=0;
  f.objetoNaUnidade=async()=>{leituras++;return {unidadeId:'a'}};
  f.vinculosAtuais=async()=>{leituras++;return []};
  for(const recurso of ['__proto__','constructor','recurso-inexistente']) {
    const resposta=await autorizarNoServidor(f,{...req,recurso:recurso as typeof req.recurso,objetoId:'id-ficticio'});
    assert.equal(resposta.status,403);
    assert.equal(resposta.motivo,'permissao_negada');
  }
  const resposta=await autorizarNoServidor(f,{...req,acao:'toString' as typeof req.acao,objetoId:'id-ficticio'});
  assert.equal(resposta.status,403);
  assert.equal(leituras,0);
});

test('perfil sem permissão recebe 403 antes da consulta de qualquer objeto', async () => {
  const f = fonte();
  f.objetoNaUnidade = async () => { assert.fail('o objeto clínico não pode ser consultado'); };
  const resposta = await autorizarNoServidor(f, { ...req, recurso: 'clinico', objetoId: 'registro' });
  assert.deepEqual(resposta, { autorizado: false, status: 403, motivo: 'permissao_negada' });
});
