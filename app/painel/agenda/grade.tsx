import Link from 'next/link';
import type { sessaoNoServidor } from '../../auth/sessao';
import { dataAgenda, dataValida, deslocarDia, janelaDoDia } from '../../../src/agenda/tempo';
import { lerGradeAgenda, rotulosAgenda, uuidAgenda } from './leitura';
import { DataAgenda, ImprimirAgenda } from './controles';

const primeiraData = '1900-01-01';
const ultimaData = '9999-12-30';
const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
const diaPorExtenso = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeZone: 'America/Sao_Paulo' });
const situacoes = [
  ['todos', 'Todos os horários'], ['livres', 'Livres'], ['ocupados', 'Ocupados'], ['cancelados', 'Cancelados'],
] as const;

const buscarNome = (valor: string) => valor.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');

export async function GradeAgenda({ cliente, unidade, data, profissional, busca, configuraAgenda, situacao }: {
  cliente: NonNullable<Awaited<ReturnType<typeof sessaoNoServidor>>>;
  unidade: string; data: string; profissional: string; busca: string; configuraAgenda: boolean; situacao?: string;
}) {
  const hoje = dataAgenda(new Date());
  const dataConsulta = dataValida(data) && data >= primeiraData && data <= ultimaData ? data : hoje;
  const profissionalValido = !profissional || uuidAgenda.test(profissional);
  const { inicio, fim } = janelaDoDia(dataConsulta);
  const leitura = profissionalValido
    ? await lerGradeAgenda(cliente, unidade, profissional || null, inicio, fim, crypto.randomUUID())
    : { status: 403 } as const;

  const grade = leitura.status === 200 ? leitura.grade : null;
  const opcoes = grade?.profissionais ?? (leitura.status === 422 ? leitura.profissionais : []);
  const nomes = new Map(opcoes.map(p => [p.id, p.nome]));
  const termo = buscarNome(busca);
  const equipes = grade?.profissionais.filter(p => (!profissional || p.id === profissional.toLowerCase())
    && buscarNome(p.nome).includes(termo)) ?? [];
  const horarios = Map.groupBy([
    ...(grade?.livres ?? []).map(l => ({ ...l, id: l.inicio, estado: 'livre' as const })),
    ...(grade?.agendamentos ?? []),
  ], item => item.profissional_id);
  const filtroSituacao = situacoes.find(([id]) => id === situacao)?.[0] ?? 'todos';
  const url = (dia: string, estado = filtroSituacao) => '/painel?' + new URLSearchParams({
    unidade, modulo: 'agenda', dataAgenda: dia, ...(profissional && { profissionalAgenda: profissional }),
    ...(busca && { buscaAgenda: busca }), ...(estado !== 'todos' && { situacaoAgenda: estado }),
  }).toString();

  return (
    <section className="painel-modulos agenda-grade" aria-labelledby="agenda-grade-titulo">
      <header className="agenda-cabecalho">
        <h2 id="agenda-grade-titulo">Grade de horários</h2>
        <p>{diaPorExtenso.format(new Date(inicio))}</p>
      </header>
      <div className="painel-barra">
        <div className="agenda-dias">
          <Link className="painel-controle painel-controle-destaque" href={url(dataConsulta, filtroSituacao === 'livres' ? 'todos' : 'livres')}
            prefetch={false}>{filtroSituacao === 'livres' ? 'Mostrar todos' : 'Horários livres'}</Link>
          <ImprimirAgenda />
          <nav className="agenda-dias" aria-label="Navegar por data">
            {dataConsulta > primeiraData && <Link className="painel-controle" href={url(deslocarDia(dataConsulta, -1))} prefetch={false}>Dia anterior</Link>}
            <Link className="painel-controle" href={url(hoje)} prefetch={false}>Hoje</Link>
            {dataConsulta < ultimaData && <Link className="painel-controle" href={url(deslocarDia(dataConsulta, 1))} prefetch={false}>Próximo dia</Link>}
          </nav>
        </div>
        <form action="/painel" method="get" className="agenda-filtros" aria-label="Filtros da agenda"
          key={JSON.stringify([dataConsulta, profissional, busca, filtroSituacao])}>
          <input type="hidden" name="unidade" value={unidade} />
          <input type="hidden" name="modulo" value="agenda" />
          <DataAgenda data={dataConsulta} min={primeiraData} max={ultimaData} />
          <div className="agenda-campo">
            <label htmlFor="agenda-profissional-filtro">Profissional</label>
            <select id="agenda-profissional-filtro" name="profissionalAgenda" defaultValue={opcoes.length ? profissional.toLowerCase() : ''}>
              <option value="">Todas as agendas acessíveis</option>
              {opcoes.map(p => <option key={p.id} value={p.id}>{p.nome}{p.ativo ? '' : ' (inativo)'}</option>)}
            </select>
          </div>
          <div className="agenda-campo">
            <label htmlFor="agenda-situacao-filtro">Situação</label>
            <select id="agenda-situacao-filtro" name="situacaoAgenda" defaultValue={filtroSituacao}>
              {situacoes.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
            </select>
          </div>
          <label>Pesquisar profissional<input name="buscaAgenda" type="search" placeholder="Nome do profissional" maxLength={80} defaultValue={busca} /></label>
          <button type="submit" className="painel-controle painel-controle-confirmar">Consultar</button>
        </form>
        {configuraAgenda && <nav className="agenda-dias" aria-label="Configurações da agenda">
          <Link className="painel-controle" href={'/painel?' + new URLSearchParams({ unidade, modulo: 'agenda', configuracaoAgenda: '1' })}
            prefetch={false}>Configurar disponibilidade</Link>
          <Link className="painel-controle" href={'/painel?' + new URLSearchParams({
            unidade, modulo: 'agenda', dataAgenda: dataConsulta, configuracaoAgenda: 'excecoes',
          })} prefetch={false}>Exceções e feriados</Link>
        </nav>}
      </div>
      <p className="agenda-contexto">Horário de Brasília. As vagas exibidas seguem a disponibilidade cadastrada.</p>
      {!!grade?.avisos?.length && <aside className="painel-aviso" aria-label="Avisos da data">
        {grade.avisos.map(a => <p key={[a.tipo, a.inicio, a.fim, a.profissional_id].join(':')}>
          {a.tipo === 'feriado' ? 'Feriado · ' + a.descricao : [
            a.tipo === 'bloqueio' ? 'Bloqueio' : 'Horário substituto',
            a.profissional_id ? nomes.get(a.profissional_id) ?? 'Profissional' : 'Toda a unidade',
            hora.format(new Date(a.inicio)) + ' a ' + (Date.parse(a.fim) === Date.parse(fim) ? '24:00' : hora.format(new Date(a.fim))),
          ].join(' · ')}
        </p>)}
      </aside>}
      {!grade && <p className="painel-aviso" role="alert">{leitura.status === 403
        ? 'Agenda indisponível para o profissional selecionado.'
        : leitura.status === 422 ? 'Há muitos registros para esta consulta. Selecione um profissional.'
          : 'A consulta da agenda falhou. Tente novamente em alguns instantes.'}</p>}
      {grade && !equipes.length && <p className="painel-aviso">Nenhum profissional encontrado para a consulta.</p>}
      {grade && equipes.map(p => {
        const todos = horarios.get(p.id) ?? [];
        const intervalos = todos.filter(item => {
          if (filtroSituacao === 'livres') return item.estado === 'livre';
          if (filtroSituacao === 'cancelados') return item.estado === 'cancelado';
          if (filtroSituacao === 'ocupados') return item.estado !== 'livre' && item.estado !== 'cancelado';
          return true;
        }).sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));
        return (
          <section className="agenda-grupo" key={p.id} aria-labelledby={'agenda-' + p.id}>
            <h3 id={'agenda-' + p.id}>{p.nome}{p.ativo ? '' : ' (inativo)'}</h3>
            {intervalos.length === 0 ? (
              <p>{todos.length > 0 ? 'Nenhum horário corresponde ao filtro.'
                : 'Sem disponibilidade cadastrada ou agendamentos para este dia.'}</p>
            ) : (
              <table className="painel-tabela">
                <thead><tr><th scope="col">Horário</th><th scope="col">Situação</th><th scope="col">Local</th></tr></thead>
                <tbody>{intervalos.map(item => {
                  const livre = item.estado === 'livre';
                  const de = new Date(item.inicio);
                  const ate = new Date(item.fim);
                  return <tr key={item.id}>
                    <td className="painel-numero"><time dateTime={de.toISOString()}>{hora.format(de)}</time> a <time dateTime={ate.toISOString()}>{Date.parse(item.fim) === Date.parse(fim) ? '24:00' : hora.format(ate)}</time></td>
                    <td><span className="painel-estado" data-estado={item.estado}>{livre ? 'Livre' : rotulosAgenda[item.estado]}</span></td>
                    <td>{livre ? item.local_nome ?? '—' : '—'}</td>
                  </tr>;
                })}</tbody>
              </table>
            )}
          </section>
        );
      })}
    </section>
  );
}
