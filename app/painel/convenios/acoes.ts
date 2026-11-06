'use server';

import { redirect } from 'next/navigation';
import { assertDate, centavosDeReais } from '../../../scripts/dev019_precos.cjs';
import { sessaoNoServidor, verificarIdentidade } from '../../auth/sessao';

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function voltar(unidade: string, estado: string): never {
  redirect('/painel?' + new URLSearchParams({ unidade, modulo: 'convenios', estado }).toString());
}

async function clienteConvenios(unidade: string, id: string | null) {
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

function concluir(unidade: string, erro: { code?: string } | null): never {
  if (erro?.code === '42501') redirect('/painel');
  if (erro?.code === '23P01') voltar(unidade, 'sobreposto');
  if (erro?.code === '23505') voltar(unidade, 'duplicado');
  if (erro?.code === '40001') voltar(unidade, 'desatualizado');
  if (['22023', '22007', '22008', '23514'].includes(erro?.code ?? '')) voltar(unidade, 'invalido');
  voltar(unidade, erro ? 'indisponivel' : 'salvo');
}

export async function salvarConvenio(unidade: string, convenio: string | null, revisao: number | null, form: FormData) {
  const cliente = await clienteConvenios(unidade, convenio);
  const nome = texto(form, 'nome');
  if (nome.length < 2 || nome.length > 120) voltar(unidade, 'invalido');

  const { error } = await cliente.rpc('piloto_salvar_convenio', {
    unidade, convenio, revisao_esperada: revisao, nome_convenio: nome,
    ativo_convenio: form.get('ativo') === 'on', correlacao: crypto.randomUUID(),
  });
  concluir(unidade, error);
}

export async function cadastrarPreco(unidade: string, form: FormData) {
  const cliente = await clienteConvenios(unidade, null);
  const convenio = texto(form, 'convenio');
  const procedimento = texto(form, 'procedimento');
  if (!uuid.test(convenio) || !uuid.test(procedimento)) voltar(unidade, 'invalido');

  let inicio: string, fim: string | null, valor: number, coparticipacao: number;
  try {
    inicio = assertDate(texto(form, 'inicio'));
    const fimInformado = texto(form, 'fim');
    fim = fimInformado ? assertDate(fimInformado) : null;
    valor = centavosDeReais(texto(form, 'valor'));
    coparticipacao = centavosDeReais(texto(form, 'coparticipacao') || '0');
  } catch {
    voltar(unidade, 'invalido');
  }
  if ((fim !== null && fim <= inicio) || coparticipacao > valor) voltar(unidade, 'invalido');
  const { error } = await cliente.rpc('piloto_cadastrar_preco', {
    unidade, convenio, procedimento, inicio, fim, valor, coparticipacao, correlacao: crypto.randomUUID(),
  });
  concluir(unidade, error);
}

export async function revisarPreco(unidade: string, preco: string, revisao: number, form: FormData) {
  const cliente = await clienteConvenios(unidade, preco);
  let fim: string | null;
  try {
    const fimInformado = texto(form, 'fim');
    fim = fimInformado ? assertDate(fimInformado) : null;
  } catch {
    voltar(unidade, 'invalido');
  }
  const { error } = await cliente.rpc('piloto_revisar_preco', {
    unidade, preco, revisao_esperada: revisao, fim,
    ativo_preco: form.get('ativo') === 'on', correlacao: crypto.randomUUID(),
  });
  concluir(unidade, error);
}
