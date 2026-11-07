'use server';

import { redirect } from 'next/navigation';
import { dataValida } from '../../../src/agenda/tempo';
import { sessaoNoServidor, verificarIdentidade } from '../../auth/sessao';
import { uuidAgenda } from './leitura';

type Acao = 'feriado' | 'bloqueio' | 'substituicao' | 'liberar_feriado' | 'remover_excecao';
const hora = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const minutos = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));

export async function salvarExcecaoAgenda(unidade: string, acao: Acao, form: FormData) {
  const cliente = await sessaoNoServidor(true);
  if (!cliente) redirect('/entrar?estado=indisponivel');
  const sessao = await verificarIdentidade(cliente);
  if (!sessao) redirect('/entrar');
  if (sessao.aal !== 'aal2') redirect('/verificar-acesso');

  function texto(campo: string) {
    const dado = form.get(campo);
    return typeof dado === 'string' ? dado.trim() : '';
  }

  const dia = texto('dia');
  function voltar(estado: string): never {
    redirect('/painel?' + new URLSearchParams({
      unidade, modulo: 'agenda', configuracaoAgenda: 'excecoes', dataAgenda: dia, estadoAgenda: estado,
    }));
  }

  if (!uuidAgenda.test(unidade) || !dataValida(dia)) voltar('invalido');
  const id = texto('registro');
  const profissional = texto('profissional');
  const local = texto('local');
  const inicio = texto('inicio');
  const fim = texto('fim');
  const descricao = texto('descricao');
  const intervalo = acao === 'bloqueio' || acao === 'substituicao';
  if ((profissional && !uuidAgenda.test(profissional)) || (local && !uuidAgenda.test(local))
      || ((acao === 'liberar_feriado' || acao === 'remover_excecao') && !uuidAgenda.test(id))
      || (acao === 'feriado' && (!descricao || descricao.length > 120))
      || (acao === 'substituicao' && (!profissional || !local))
      || (intervalo && (!hora.test(inicio) || (!hora.test(fim) && fim !== '24:00') || inicio >= fim))) {
    voltar('invalido');
  }

  const { data, error } = await cliente.rpc('piloto_salvar_excecao_agenda', {
    unidade, acao, dia_agenda: dia, registro: id || null, profissional: profissional || null,
    local_agenda: local || null, inicio: intervalo ? minutos(inicio) : null,
    fim: intervalo ? minutos(fim) : null, descricao_feriado: descricao || null, correlacao: crypto.randomUUID(),
  });
  if (error?.code === '42501') redirect('/painel');
  if (error?.code === 'P0023') voltar('agendamentos');
  if (error?.code === '23505' || error?.code === '23P01') voltar('conflito');
  if (error?.code === '40001' || error?.code === '40P01') voltar('concorrencia');
  if (error && ['23502', '23503', '23514', '22023'].includes(error.code)) voltar('invalido');
  voltar(error ? 'indisponivel' : data ? 'salvo' : 'atualizado');
}
