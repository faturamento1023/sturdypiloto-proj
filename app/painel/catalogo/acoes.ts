'use server';

import { redirect } from 'next/navigation';
import { sessaoNoServidor, verificarIdentidade } from '../../auth/sessao';

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const tipos = ['consulta', 'exame', 'procedimento'];

function voltar(unidade: string, estado: string): never {
  redirect('/painel?' + new URLSearchParams({ unidade, modulo: 'catalogo', estado }).toString());
}

async function clienteCatalogo(unidade: string, id: string | null) {
  const cliente = await sessaoNoServidor(true);
  if (!cliente) redirect('/entrar?estado=indisponivel');
  const sessao = await verificarIdentidade(cliente);
  if (!sessao) redirect('/entrar');
  if (sessao.aal !== 'aal2') redirect('/verificar-acesso');
  if (!uuid.test(unidade) || (id !== null && !uuid.test(id))) redirect('/painel');
  return cliente;
}

function texto(form: FormData, campo: string) {
  const valor = form.get(campo);
  return typeof valor === 'string' ? valor.trim() : '';
}

function concluir(unidade: string, erro?: string): never {
  if (erro === '42501') redirect('/painel');
  if (erro === 'P0001') voltar(unidade, 'grupo_em_uso');
  if (erro === '23505') voltar(unidade, 'duplicado');
  if (erro === '40001') voltar(unidade, 'desatualizado');
  if (erro === '22023' || erro === '23514') voltar(unidade, 'invalido');
  voltar(unidade, erro ? 'indisponivel' : 'salvo');
}

export async function salvarGrupo(unidade: string, grupo: string | null, revisao: number | null, form: FormData) {
  const cliente = await clienteCatalogo(unidade, grupo);
  const nome = texto(form, 'nome');
  if (nome.length < 2 || nome.length > 100) voltar(unidade, 'invalido');

  const { error } = await cliente.rpc('piloto_salvar_grupo_procedimento', {
    unidade, grupo, revisao_esperada: revisao, nome_grupo: nome, ativo_grupo: form.get('ativo') === 'on',
    correlacao: crypto.randomUUID(),
  });
  concluir(unidade, error?.code);
}

export async function salvarProcedimento(unidade: string, procedimento: string | null, revisao: number | null, form: FormData) {
  const cliente = await clienteCatalogo(unidade, procedimento);
  const codigo = texto(form, 'codigo');
  const descricao = texto(form, 'descricao');
  const tuss = texto(form, 'tuss');
  const grupo = texto(form, 'grupo');
  const tipo = texto(form, 'tipo');
  const preparo = texto(form, 'preparo');
  if (!codigo || codigo.length > 40 || descricao.length < 2 || descricao.length > 160
    || (tuss && !/^\d{8}$/.test(tuss)) || (grupo && !uuid.test(grupo)) || !tipos.includes(tipo)
    || preparo.length > 2000) voltar(unidade, 'invalido');

  const { error } = await cliente.rpc('piloto_salvar_procedimento', {
    unidade, procedimento, revisao_esperada: revisao, grupo: grupo || null, codigo_interno: codigo,
    nome_procedimento: descricao, tuss: tuss || null, tipo_procedimento: tipo, instrucoes: preparo,
    consentimento: form.get('consentimento') === 'on', ativo_procedimento: form.get('ativo') === 'on',
    correlacao: crypto.randomUUID(),
  });
  concluir(unidade, error?.code);
}
