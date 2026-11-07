import Link from 'next/link';
import { dataAgenda, dataValida } from '../../../src/agenda/tempo';
import type { sessaoNoServidor } from '../../auth/sessao';
import { salvarExcecaoAgenda } from './excecoes-acoes';

const mensagens = {
  salvo: 'Alteração salva.',
  atualizado: 'O registro já foi atualizado. Confira a lista.',
  agendamentos: 'A alteração afeta agendamentos pendentes. Resolva os compromissos antes de alterar a agenda.',
  conflito: 'Já existe um bloqueio sobreposto, um substituto para o dia ou uma disponibilidade nessa sala.',
  invalido: 'Confira a data, o horário e o escopo selecionados.',
  concorrencia: 'A agenda mudou enquanto você salvava. Confira a grade e tente novamente.',
  indisponivel: 'A alteração não pôde ser salva.',
};

type Opcao = { id: string; nome: string };
type Excecao = { id: string; kind: 'bloqueio' | 'substituicao'; professionalId: string | null; startMinute: number; endMinute: number; roomId: string | null };
const hora = (min: number) => [Math.floor(min / 60), min % 60].map(n => String(n).padStart(2, '0')).join(':');

function Profissional({ id, opcoes, geral = false }: { id: string; opcoes: Opcao[]; geral?: boolean }) {
  return (
    <div className="agenda-campo">
      <label htmlFor={id}>Profissional</label>
      <select id={id} name="profissional" required={!geral} defaultValue="">
        <option value="" disabled={!geral}>{geral ? 'Toda a unidade' : 'Selecione'}</option>
        {opcoes.map(p => <option value={p.id} key={p.id}>{p.nome}</option>)}
      </select>
    </div>
  );
}

function Horarios() {
  return <>
    <label>Horário inicial<input name="inicio" type="time" required /></label>
    <label>Horário final<input name="fim" placeholder="HH:MM" maxLength={5} required /></label>
  </>;
}

export async function ExcecoesAgenda({ cliente, unidade, data, estado }: {
  cliente: NonNullable<Awaited<ReturnType<typeof sessaoNoServidor>>>; unidade: string; data: string; estado: string;
}) {
  const hoje = dataAgenda(new Date());
  const dia = dataValida(data) ? data : hoje;
  const [config, agenda] = await Promise.all([
    cliente.rpc('piloto_config_agenda', { unidade }),
    cliente.rpc('piloto_ler_excecoes_agenda', { unidade, profissional: null, de: dia, ate: dia, correlacao: crypto.randomUUID() }),
  ]);
  if (config.error || agenda.error || !config.data || !agenda.data) {
    return <p className="painel-aviso" role="alert">Exceções da agenda indisponíveis.</p>;
  }
  const { locais, profissionais } = config.data as { locais: Opcao[]; profissionais: (Opcao & { ativo: boolean })[] };
  const { feriados, excecoes } = agenda.data as { feriados: { id: string; description: string }[]; excecoes: Excecao[] };
  const ativos = profissionais.filter(p => p.ativo);
  const nomes = new Map(profissionais.map(p => [p.id, p.nome]));
  const salas = new Map(locais.map(p => [p.id, p.nome]));
  const aviso = Object.hasOwn(mensagens, estado) ? mensagens[estado as keyof typeof mensagens] : null;
  const diaOculto = <input type="hidden" name="dia" value={dia} />;
  return (
    <section className="painel-modulos" aria-labelledby="agenda-excecoes-titulo">
      <header className="agenda-cabecalho">
        <h2 id="agenda-excecoes-titulo">Exceções e feriados</h2>
        <Link href={'/painel?' + new URLSearchParams({ unidade, modulo: 'agenda', dataAgenda: dia })} prefetch={false}>Voltar à grade</Link>
      </header>
      <p>Escolha a data. O feriado fecha a unidade. O horário substituto troca a agenda regular do profissional naquele dia, e os bloqueios retiram intervalos.</p>
      <form action="/painel" method="get" className="agenda-formulario">
        <input type="hidden" name="unidade" value={unidade} />
        <input type="hidden" name="modulo" value="agenda" />
        <input type="hidden" name="configuracaoAgenda" value="excecoes" />
        <label>Data da exceção<input name="dataAgenda" type="date" defaultValue={dia} key={dia} required /></label>
        <button type="submit" className="botao">Consultar data</button>
      </form>
      {aviso && <p className="painel-aviso" role={estado === 'salvo' || estado === 'atualizado' ? 'status' : 'alert'}>{aviso}</p>}
      {dia < hoje && <p>Data anterior disponível para consulta.</p>}

      <section className="agenda-profissional" aria-labelledby="agenda-excecoes-lista">
        <h3 id="agenda-excecoes-lista">Registros ativos na data</h3>
        {feriados.length === 0 && excecoes.length === 0 && <p>Nenhuma exceção nesta data.</p>}
        {feriados.map(f => (
          <article className="agenda-regra" key={f.id}>
            <h4>Feriado · {f.description}</h4>
            {dia >= hoje && <form action={salvarExcecaoAgenda.bind(null, unidade, 'liberar_feriado')}>
              {diaOculto}<input type="hidden" name="registro" value={f.id} />
              <button type="submit" className="botao">Liberar dia</button>
            </form>}
          </article>
        ))}
        {excecoes.map(e => (
          <article className="agenda-regra" key={e.id}>
            <h4>{e.kind === 'bloqueio' ? 'Bloqueio' : 'Horário substituto'} · {e.professionalId ? nomes.get(e.professionalId) : 'Toda a unidade'}</h4>
            <p>{hora(e.startMinute)} a {hora(e.endMinute)}{e.roomId && ' · ' + salas.get(e.roomId)}</p>
            {dia >= hoje && <form action={salvarExcecaoAgenda.bind(null, unidade, 'remover_excecao')}>
              {diaOculto}<input type="hidden" name="registro" value={e.id} />
              <button type="submit" className="botao">Retirar da agenda</button>
            </form>}
          </article>
        ))}
      </section>

      {dia >= hoje && <>
        {feriados.length === 0 && <section className="agenda-profissional" aria-labelledby="agenda-feriado-form">
          <h3 id="agenda-feriado-form">Feriado da unidade</h3>
          <form action={salvarExcecaoAgenda.bind(null, unidade, 'feriado')} className="agenda-formulario">
            {diaOculto}
            <label>Nome do feriado<input name="descricao" maxLength={120} required /></label>
            <button type="submit" className="botao">Cadastrar feriado</button>
          </form>
        </section>}
        <section className="agenda-profissional" aria-labelledby="agenda-bloqueio-form">
          <h3 id="agenda-bloqueio-form">Bloqueio de horário</h3>
          <p>Para bloquear até o fim do dia, informe 24:00 no horário final.</p>
          <form action={salvarExcecaoAgenda.bind(null, unidade, 'bloqueio')} className="agenda-formulario">
            {diaOculto}<Profissional id="bloqueio-profissional" opcoes={ativos} geral /><Horarios />
            <button type="submit" className="botao">Salvar bloqueio</button>
          </form>
        </section>
        <section className="agenda-profissional" aria-labelledby="agenda-substituicao-form">
          <h3 id="agenda-substituicao-form">Horário substituto</h3>
          {ativos.length === 0 || locais.length === 0 ? <p>Cadastre um profissional ativo e uma sala para substituir o horário.</p> : (
            <form action={salvarExcecaoAgenda.bind(null, unidade, 'substituicao')} className="agenda-formulario">
              {diaOculto}<Profissional id="substituicao-profissional" opcoes={ativos} /><Horarios />
              <div className="agenda-campo">
                <label htmlFor="substituicao-local">Local</label>
                <select id="substituicao-local" name="local" required defaultValue="">
                  <option value="" disabled>Selecione</option>
                  {locais.map(l => <option value={l.id} key={l.id}>{l.nome}</option>)}
                </select>
              </div>
              <button type="submit" className="botao">Salvar substituição</button>
            </form>
          )}
        </section>
      </>}
    </section>
  );
}
