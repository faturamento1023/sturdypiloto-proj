'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sessaoNoServidor, verificarIdentidade } from '../../auth/sessao';

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const perfis = ['recepcao', 'medico', 'financeiro', 'gestao'];

async function clienteComMfa() {
  const cliente = await sessaoNoServidor(true);
  if (!cliente) redirect('/entrar?estado=indisponivel');
  const sessao = await verificarIdentidade(cliente);
  if (!sessao) redirect('/entrar');
  if (sessao.aal !== 'aal2') redirect('/verificar-acesso');
  return cliente;
}

export type EstadoConvite = { mensagem?: string; codigo?: string };

export async function emitirConvite(unidade: string, _estado: EstadoConvite, form: FormData): Promise<EstadoConvite> {
  const cliente = await clienteComMfa();
  const email = String(form.get('email') ?? '').trim();
  const perfil = String(form.get('perfil') ?? '');
  const profissional = perfil === 'medico' ? String(form.get('profissional') ?? '') : null;
  if (!uuid.test(unidade) || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || !perfis.includes(perfil) || (profissional !== null && !uuid.test(profissional))) {
    return { mensagem: 'Confira o e-mail, o perfil e o profissional selecionado.' };
  }

  const { data, error } = await cliente.rpc('piloto_emitir_convite', {
    unidade, email_convidado: email, perfil_convidado: perfil, profissional, correlacao: crypto.randomUUID(),
  });
  if (error?.code === '42501') redirect('/painel');
  if (error?.code === '22023') return { mensagem: 'Confira o perfil e o vínculo com o profissional selecionado.' };
  if (error || typeof data !== 'string') return { mensagem: 'Não foi possível gerar o convite.' };

  revalidatePath('/painel');
  return { codigo: data, mensagem: 'Convite gerado. Copie o código agora. Ele vale por 48 horas.' };
}

export async function gerirUsuarios(unidade: string, operacao: string, alvo: string, habilitar: boolean | null) {
  const cliente = await clienteComMfa();
  if (!uuid.test(unidade) || !uuid.test(alvo) || !['cancelar', 'perfil', 'bloquear'].includes(operacao)) {
    redirect('/painel');
  }
  const { data, error } = await cliente.rpc('piloto_gerir_usuarios', {
    unidade, operacao, alvo, habilitar, correlacao: crypto.randomUUID(),
  });
  if (error?.code === '42501') redirect('/painel');
  redirect('/painel?' + new URLSearchParams({
    unidade, modulo: 'usuarios', estado: !error && data === true ? 'salvo' : 'indisponivel',
  }).toString());
}

export async function aceitarConvite(form: FormData) {
  const cliente = await clienteComMfa();
  const codigo = String(form.get('codigo') ?? '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(codigo)) redirect('/convite?estado=invalido');
  const { data, error } = await cliente.rpc('piloto_aceitar_convite', {
    codigo, correlacao: crypto.randomUUID(),
  });
  if (error) redirect('/convite?estado=indisponivel');
  if (typeof data !== 'string' || !uuid.test(data)) redirect('/convite?estado=invalido');
  redirect('/convite?estado=aceito');
}
