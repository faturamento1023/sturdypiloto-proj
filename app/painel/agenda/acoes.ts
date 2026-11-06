'use server';

import { redirect } from 'next/navigation';
import { dataValida } from '../../../src/agenda/tempo';
import { sessaoNoServidor, verificarIdentidade } from '../../auth/sessao';
import { uuidAgenda } from './leitura';

const horaValida = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
function minutos(hora: string) {
  return Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3));
}

export async function salvarConfiguracaoAgenda(unidade: string, operacao: 'local' | 'disponibilidade' | 'encerrar', form: FormData) {
  const cliente = await sessaoNoServidor(true);
  if (!cliente) redirect('/entrar?estado=indisponivel');
  const sessao = await verificarIdentidade(cliente);
  if (!sessao) redirect('/entrar');
  if (sessao.aal !== 'aal2') redirect('/verificar-acesso');

  function voltar(estado: string): never {
    redirect('/painel?' + new URLSearchParams({ unidade, modulo: 'agenda', configuracaoAgenda: '1', estadoAgenda: estado }));
  }

  if (!uuidAgenda.test(unidade)) voltar('invalido');
  const valor = (nome: string) => {
    const dado = form.get(nome);
    return typeof dado === 'string' ? dado.trim() : '';
  };
  const comum = { unidade, correlacao: crypto.randomUUID() };
  let codigo: string | undefined;
  if (operacao === 'local') {
    const nome = valor('nome');
    if (!nome || nome.length > 80) voltar('invalido');
    codigo = (await cliente.rpc('piloto_criar_local_agenda', { ...comum, nome_local: nome })).error?.code;
  } else if (operacao === 'disponibilidade') {
    const profissional = valor('profissional');
    const local = valor('local');
    const dia = valor('dia');
    const inicio = valor('inicio');
    const fim = valor('fim');
    const desde = valor('desde');
    if (!uuidAgenda.test(profissional) || !uuidAgenda.test(local) || !/^[1-7]$/.test(dia)
      || !horaValida.test(inicio) || !horaValida.test(fim) || inicio >= fim || !dataValida(desde)) voltar('invalido');
    codigo = (await cliente.rpc('piloto_criar_disponibilidade', {
      ...comum, profissional, local_agenda: local, dia: Number(dia),
      inicio: minutos(inicio), fim: minutos(fim), inicio_vigencia: desde,
    })).error?.code;
  } else if (operacao === 'encerrar') {
    const regra = valor('regra');
    const ate = valor('ate');
    if (!uuidAgenda.test(regra) || !dataValida(ate)) voltar('invalido');
    codigo = (await cliente.rpc('piloto_encerrar_disponibilidade', { ...comum, regra, fim_vigencia: ate })).error?.code;
  } else {
    voltar('invalido');
  }

  if (codigo === '42501') redirect('/painel');
  if (codigo === '23505') voltar('duplicado');
  if (codigo === '23P01') voltar('conflito');
  if (codigo && ['23502', '23503', '23514', '22023'].includes(codigo)) voltar('invalido');
  voltar(codigo ? 'indisponivel' : operacao === 'encerrar' ? 'encerrado' : 'salvo');
}
