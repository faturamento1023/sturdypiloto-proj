'use server';

import { redirect } from 'next/navigation';
import { sessaoNoServidor, verificarIdentidade } from '../../auth/sessao';
import { dataValida, janelaValida } from '../../../src/agenda/tempo';
import { uuidAgenda } from './leitura';

async function clienteAgenda(unidade: string) {
  const cliente = await sessaoNoServidor(true);
  if (!cliente) redirect('/entrar?estado=indisponivel');
  const sessao = await verificarIdentidade(cliente);
  if (!sessao) redirect('/entrar');
  if (sessao.aal !== 'aal2') redirect('/verificar-acesso');
  if (!uuidAgenda.test(unidade)) redirect('/painel');
  return cliente;
}

function texto(form: FormData, campo: string) {
  const valor = form.get(campo);
  return typeof valor === 'string' ? valor.trim() : '';
}

const errosReserva: Record<string, string> = {
  '23P01': 'Este horário ficou indisponível. Volte à grade para escolher outro.',
  'P0023': 'Este horário está bloqueado na agenda.',
  'P0024': 'A cota para este convênio, procedimento ou período foi atingida.',
  '23505': 'Este envio já foi usado com outros dados. Volte à grade e inicie outra reserva.',
  '23514': 'O paciente, profissional, convênio ou procedimento está indisponível.',
  '22023': 'Confira a data e a duração da reserva.',
};

export type EstadoReserva = { chave: string; sucesso?: boolean; erro?: string };

export async function reservarHorario(unidade: string, profissional: string, inicio: string, fim: string,
  anterior: EstadoReserva, form: FormData): Promise<EstadoReserva> {
  const cliente = await clienteAgenda(unidade);
  const { chave } = anterior;
  const paciente = texto(form, 'paciente');
  const convenio = texto(form, 'convenio');
  const procedimento = texto(form, 'procedimento');
  const de = texto(form, 'inicio');
  const minutos = texto(form, 'duracao');
  const duracao = /^\d{1,4}$/.test(minutos) ? Number(minutos) : 0;
  if (![chave, paciente, profissional, convenio, procedimento].every(id => uuidAgenda.test(id))
    || !janelaValida(inicio, fim) || !janelaValida(de, fim) || Date.parse(de) < Date.parse(inicio)
    || duracao < 1 || Date.parse(de) + duracao * 60_000 > Date.parse(fim)) {
    return { chave, erro: 'Confira os dados e a duração escolhida.' };
  }
  const ate = new Date(Date.parse(de) + duracao * 60_000).toISOString();
  const { data, error } = await cliente.rpc('piloto_reservar_horario', {
    unidade, chave, paciente, profissional, convenio, procedimento, de, ate, correlacao: crypto.randomUUID(),
  });
  if (error?.code === '42501') redirect('/painel');
  if (!error && data === chave) return { chave, sucesso: true };
  return { chave, erro: error && Object.hasOwn(errosReserva, error.code) ? errosReserva[error.code]
    : 'Não foi possível confirmar a reserva. Reenvie os mesmos dados para verificar.' };
}

export async function salvarCotaAgenda(unidade: string, desativar: string | null, form: FormData) {
  const cliente = await clienteAgenda(unidade);
  const voltar = (estadoAgenda: string): never => redirect('/painel?' + new URLSearchParams({ unidade,
    modulo: 'agenda', configuracaoAgenda: 'cotas', estadoAgenda }));
  const convenio = texto(form, 'convenio') || null;
  const procedimento = texto(form, 'procedimento') || null;
  const grupo = texto(form, 'grupo') || null;
  const de = texto(form, 'de');
  const ate = texto(form, 'ate');
  const limite = texto(form, 'limite');
  if ([desativar, convenio, procedimento, grupo].some(id => id !== null && !uuidAgenda.test(id))
    || (!desativar && (!dataValida(de) || !dataValida(ate) || de >= ate || !/^\d{1,10}$/.test(limite)
      || Number(limite) > 2147483647))) voltar('invalido');
  const { error } = await cliente.rpc('piloto_salvar_cota_agenda', { unidade, desativar, convenio, procedimento, grupo,
    de: de || null, ate: ate || null, limite_cota: desativar ? null : Number(limite), correlacao: crypto.randomUUID() });
  if (error?.code === '42501') redirect('/painel');
  if (error?.code === '23505') voltar('duplicado');
  if (error?.code === '22023' || error?.code === '23503') voltar('invalido');
  voltar(error ? 'falha' : desativar ? 'desativada' : 'salva');
}
