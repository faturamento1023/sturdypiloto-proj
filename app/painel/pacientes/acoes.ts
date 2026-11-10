'use server';

import { redirect } from 'next/navigation';
import { sessaoNoServidor, verificarIdentidade } from '../../auth/sessao';
import { dataValida } from '../../../src/agenda/tempo';

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

type Paciente = { id: string; nome: string; nome_social: string | null; nascimento: string | null };
export type BuscaPacientes = { pacientes: Paciente[]; termo: string; pagina: number; temProxima: boolean; erro?: string };
export type EstadoCadastroPaciente = { chave: string; estado?: 'salvo' | 'invalido' | 'conflito' | 'indisponivel' };

async function clientePaciente(unidade: string) {
  const cliente = await sessaoNoServidor(true);
  if (!cliente) redirect('/entrar?estado=indisponivel');
  const sessao = await verificarIdentidade(cliente);
  if (!sessao) redirect('/entrar');
  if (sessao.aal !== 'aal2') redirect('/verificar-acesso');
  if (!uuid.test(unidade)) redirect('/painel');
  return cliente;
}

function texto(form: FormData, campo: string) {
  const valor = form.get(campo);
  return typeof valor === 'string' ? valor.trim() : '';
}

export async function buscarPacientes(unidade: string, _anterior: BuscaPacientes | null, form: FormData): Promise<BuscaPacientes> {
  const cliente = await clientePaciente(unidade);
  const termo = texto(form, 'termo');
  const indice = texto(form, 'pagina');
  const pagina = /^\d{1,4}$/.test(indice) ? Number(indice) : 0;
  const base = { pacientes: [], termo, pagina, temProxima: false };
  if (termo.length < 2 || termo.length > 80) return { ...base, termo: '', erro: 'Digite de 2 a 80 caracteres.' };
  const { data, error } = await cliente.rpc('piloto_buscar_pacientes', { unidade, busca: termo, pagina, correlacao: crypto.randomUUID() });
  if (error || !Array.isArray(data)) return { ...base, erro: 'A busca de pacientes está indisponível para esta unidade.' };
  return { ...base, pacientes: data.slice(0, 20), temProxima: pagina < 9999 && data.length > 20 };
}

export async function cadastrarPaciente(unidade: string, anterior: EstadoCadastroPaciente, form: FormData): Promise<EstadoCadastroPaciente> {
  const cliente = await clientePaciente(unidade);
  const { chave } = anterior;
  const nome = texto(form, 'nome');
  const social = texto(form, 'nome_social');
  const nascimento = texto(form, 'nascimento');
  if (!uuid.test(chave) || nome.length < 2 || nome.length > 160 || social.length > 160 || (nascimento && !dataValida(nascimento))) {
    return { chave, estado: 'invalido' };
  }
  const { error } = await cliente.rpc('piloto_cadastrar_paciente', { unidade, chave, nome_paciente: nome,
    nome_social_paciente: social || null, data_nascimento: nascimento || null, correlacao: crypto.randomUUID() });
  if (error?.code === '42501') redirect('/painel');
  if (error?.code === '22023') return { chave, estado: 'invalido' };
  if (error?.code === '23505') return { chave: crypto.randomUUID(), estado: 'conflito' };
  if (error) return { chave, estado: 'indisponivel' };
  return { chave: crypto.randomUUID(), estado: 'salvo' };
}
