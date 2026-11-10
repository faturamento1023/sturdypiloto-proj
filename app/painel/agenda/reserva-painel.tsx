import Link from 'next/link';
import type { sessaoNoServidor } from '../../auth/sessao';
import { dataAgenda, janelaValida } from '../../../src/agenda/tempo';
import { uuidAgenda } from './leitura';
import { FormularioReserva, type OpcaoReserva } from './reserva';
import { salvarCotaAgenda } from './reserva-acoes';

type Cliente = NonNullable<Awaited<ReturnType<typeof sessaoNoServidor>>>;
type Opcoes = { convenios: OpcaoReserva[]; procedimentos: OpcaoReserva[] };
type Cota = { id: string; de: string; ate: string; limite: number; convenio: string | null; procedimento: string | null; grupo: string | null };
const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
const dataBR = (data: string) => data.split('-').reverse().join('/');
const grade = (unidade: string, dataAgenda?: string) => '/painel?' + new URLSearchParams({ unidade, modulo: 'agenda', ...(dataAgenda && { dataAgenda }) });

export async function ReservaAgenda({ cliente, unidade, profissional, inicio, fim, podeBuscar }: {
  cliente: Cliente; unidade: string; profissional: string; inicio: string; fim: string; podeBuscar: boolean;
}) {
  const valida = uuidAgenda.test(profissional) && janelaValida(inicio, fim)
    && Date.parse(fim) - Date.parse(inicio) >= 60_000 && Date.parse(fim) - Date.parse(inicio) <= 24 * 3_600_000;
  const data = valida ? dataAgenda(new Date(inicio)) : '';
  const { data: opcoes, error } = valida ? await cliente.rpc('piloto_agenda_opcoes', { unidade, configuracao: false, correlacao: crypto.randomUUID() }) : { data: null };
  const lista = opcoes as Opcoes | null;
  return (
    <section className="painel-modulos" aria-labelledby="nova-reserva-titulo">
      <header className="agenda-cabecalho"><h2 id="nova-reserva-titulo">Nova reserva</h2><Link href={grade(unidade, data)} prefetch={false}>Voltar à grade</Link></header>
      {!valida ? <p className="painel-aviso" role="alert">Selecione um horário livre na grade.</p> : error || !lista ?
        <p className="painel-aviso" role="alert">As opções de reserva estão temporariamente indisponíveis.</p> : <>
          <p>Janela selecionada em {dataBR(data)}. Das {hora.format(new Date(inicio))} às {hora.format(new Date(fim))}.</p>
          <FormularioReserva unidade={unidade} profissional={profissional} inicio={new Date(inicio).toISOString()}
            fim={new Date(fim).toISOString()} chave={crypto.randomUUID()} podeBuscar={podeBuscar}
            convenios={lista.convenios} procedimentos={lista.procedimentos} />
        </>}
    </section>
  );
}

const avisos = {
  salva: 'Cota cadastrada.', desativada: 'Cota desativada.', invalido: 'Confira o período, o limite e os filtros da cota.',
  duplicado: 'Já existe uma cota ativa com o mesmo período e filtros.', falha: 'A operação está temporariamente indisponível.',
};

function FiltroCota({ campo, rotulo, opcoes }: { campo: string; rotulo: string; opcoes: OpcaoReserva[] }) {
  const id = 'cota-' + campo;
  return <div className="agenda-campo"><label htmlFor={id}>{rotulo}</label><select id={id} name={campo}>
    <option value="">Todos</option>{opcoes.map(o => <option value={o.id} key={o.id}>{o.nome}</option>)}
  </select></div>;
}

export async function CotasAgenda({ cliente, unidade, estado }: { cliente: Cliente; unidade: string; estado: string }) {
  const { data, error } = await cliente.rpc('piloto_agenda_opcoes', { unidade, configuracao: true, correlacao: crypto.randomUUID() });
  const aviso = Object.hasOwn(avisos, estado) ? avisos[estado as keyof typeof avisos] : null;
  if (error || !data) return <p className="painel-aviso" role="alert">A configuração de cotas está temporariamente indisponível.</p>;
  const { convenios, procedimentos, grupos, cotas } = data as Opcoes & { grupos: OpcaoReserva[]; cotas: Cota[] };
  return (
    <section className="painel-modulos" aria-labelledby="cotas-agenda-titulo">
      <header className="agenda-cabecalho"><h2 id="cotas-agenda-titulo">Cotas de agendamento</h2><Link href={grade(unidade)} prefetch={false}>Voltar à grade</Link></header>
      <p>A cota vale do primeiro dia até a véspera do fim. Todas as cotas correspondentes são verificadas a cada reserva.</p>
      {aviso && <p className="painel-aviso" role={['salva', 'desativada'].includes(estado) ? 'status' : 'alert'}>{aviso}</p>}
      <form className="agenda-formulario" action={salvarCotaAgenda.bind(null, unidade, null)} aria-label="Nova cota">
        <FiltroCota campo="convenio" rotulo="Convênio" opcoes={convenios} />
        <FiltroCota campo="procedimento" rotulo="Procedimento" opcoes={procedimentos} />
        <FiltroCota campo="grupo" rotulo="Grupo" opcoes={grupos} />
        <label>Primeiro dia<input name="de" type="date" min="1900-01-01" required /></label>
        <label>Fim do período (exclusivo)<input name="ate" type="date" max="9999-12-31" required /></label>
        <label>Limite de reservas<input name="limite" type="number" min={0} max={2147483647} required /></label>
        <button className="painel-controle painel-controle-confirmar">Cadastrar cota</button>
      </form>
      <h3>Cotas ativas</h3>
      {cotas.length === 0 && <p>Nenhuma cota ativa.</p>}
      {cotas.map(c => <article className="agenda-regra" key={c.id}>
        <h4>{[c.convenio, c.procedimento, c.grupo].filter(Boolean).join(' · ') || 'Todos os agendamentos'}</h4>
        <p>{dataBR(c.de)} até {dataBR(c.ate)} (exclusivo) · Limite: {c.limite}</p>
        <form action={salvarCotaAgenda.bind(null, unidade, c.id)}><button className="painel-controle">Desativar cota</button></form>
      </article>)}
    </section>
  );
}
