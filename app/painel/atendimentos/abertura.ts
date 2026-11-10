'use server';

import { redirect } from 'next/navigation';
import { sessaoNoServidor, verificarIdentidade } from '../../auth/sessao';
import { dataValida } from '../../../src/agenda/tempo';
import { uuidAgenda } from '../agenda/leitura';

export async function abrirAtendimentoAgendado(unidade: string, agenda: string, data: string) {
  const cliente = await sessaoNoServidor(true);
  if (!cliente) redirect('/entrar?estado=indisponivel');
  const sessao = await verificarIdentidade(cliente);
  if (!sessao) redirect('/entrar');
  if (sessao.aal !== 'aal2') redirect('/verificar-acesso');
  if (!uuidAgenda.test(unidade) || !uuidAgenda.test(agenda) || !dataValida(data)) redirect('/painel');

  const { data: atendimento, error } = await cliente.rpc('piloto_abrir_atendimento_agendado', {
    unidade, agenda, correlacao: crypto.randomUUID(),
  });
  if (error?.code === '42501') redirect('/painel');
  if (typeof atendimento === 'string' && uuidAgenda.test(atendimento) && !error) {
    redirect('/painel?' + new URLSearchParams({ unidade, modulo: 'atendimentos', atendimento }));
  }
  redirect('/painel?' + new URLSearchParams({ unidade, modulo: 'agenda', dataAgenda: data,
    abertura: ['23503', '23514'].includes(error?.code ?? '') ? 'indisponivel' : 'falha' }));
}
