import Link from 'next/link';
import type { sessaoNoServidor } from '../../auth/sessao';
import { dataAgenda, dataValida, deslocarDia, janelaDoDia } from '../../../src/agenda/tempo';
import { lerGradeAgenda, rotulosAgenda, uuidAgenda } from './leitura';

const primeiraData = '1900-01-01';
const ultimaData = '9999-12-30';
const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
const diaPorExtenso = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeZone: 'America/Sao_Paulo' });
const buscarNome = (valor: string) => valor.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');

export async function GradeAgenda({ cliente, unidade, data, profissional, busca, configuraAgenda }: {
  cliente: NonNullable<Awaited<ReturnType<typeof sessaoNoServidor>>>;
  unidade: string; data: string; profissional: string; busca: string; configuraAgenda: boolean;
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
  const termo = buscarNome(busca);
  const equipes = grade?.profissionais.filter(p => (!profissional || p.id === profissional.toLowerCase())
    && buscarNome(p.nome).includes(termo)) ?? [];
  const horarios = Map.groupBy([
    ...(grade?.livres ?? []).map(l => ({ ...l, id: l.inicio, estado: 'livre' as const })),
    ...(grade?.agendamentos ?? []),
  ], item => item.profissional_id);
  const url = (dia: string, filtro = profissional) => '/painel?' + new URLSearchParams({
    unidade, modulo: 'agenda', dataAgenda: dia, ...(filtro && { profissionalAgenda: filtro }),
    ...(busca && { buscaAgenda: busca }),
  }).toString();

  return (
    <section className="painel-modulos agenda-grade" aria-labelledby="agenda-grade-titulo">
      <header className="agenda-cabecalho">
        <div>
          <h2 id="agenda-grade-titulo">Grade de horários</h2>
          <p>{diaPorExtenso.format(new Date(inicio))}</p>
        </div>
        <nav className="agenda-dias" aria-label="Navegar por data">
          {dataConsulta > primeiraData && <Link href={url(deslocarDia(dataConsulta, -1))} prefetch={false}>Dia anterior</Link>}
          <Link href={url(hoje)} prefetch={false}>Hoje</Link>
          {dataConsulta < ultimaData && <Link href={url(deslocarDia(dataConsulta, 1))} prefetch={false}>Próximo dia</Link>}
        </nav>
      </header>
      {configuraAgenda && <Link className="agenda-config-link"
        href={'/painel?' + new URLSearchParams({ unidade, modulo: 'agenda', configuracaoAgenda: '1' })}
        prefetch={false}>Configurar disponibilidade</Link>}
      <form action="/painel" method="get" className="agenda-filtros" aria-label="Filtros da agenda" key={dataConsulta + profissional + busca}>
        <input type="hidden" name="unidade" value={unidade} />
        <input type="hidden" name="modulo" value="agenda" />
        <label>Data da agenda<input name="dataAgenda" type="date" defaultValue={dataConsulta} min={primeiraData} max={ultimaData} required /></label>
        <div className="agenda-campo">
          <label htmlFor="agenda-profissional-filtro">Profissional</label>
          <select id="agenda-profissional-filtro" name="profissionalAgenda" defaultValue={opcoes.length ? profissional.toLowerCase() : ''}>
            <option value="">Todas as agendas acessíveis</option>
            {opcoes.map(p => <option key={p.id} value={p.id}>{p.nome}{p.ativo ? '' : ' (inativo)'}</option>)}
          </select>
        </div>
        <label>Pesquisar profissional<input name="buscaAgenda" type="search" placeholder="Nome do profissional" maxLength={80} defaultValue={busca} /></label>
        <button type="submit" className="botao">Consultar</button>
      </form>
      <p className="agenda-contexto">Horário de Brasília. Os intervalos livres aparecem dentro da disponibilidade cadastrada.</p>
      {!grade && <p className="painel-aviso" role="alert">{leitura.status === 403
        ? 'Agenda indisponível para o profissional selecionado.'
        : leitura.status === 422 ? 'Há muitos registros para esta consulta. Selecione um profissional.'
          : 'A consulta da agenda falhou. Tente novamente em alguns instantes.'}</p>}
      {grade && !equipes.length && <p className="painel-aviso">Nenhum profissional encontrado para a consulta.</p>}
      {grade && equipes.map(p => {
        const intervalos = (horarios.get(p.id) ?? []).sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));
        return (
          <section className="agenda-profissional" key={p.id} aria-labelledby={'agenda-' + p.id}>
            <h3 id={'agenda-' + p.id}>{p.nome}{p.ativo ? '' : ' (inativo)'}</h3>
            {intervalos.length === 0 && <p>Sem disponibilidade cadastrada ou agendamentos para este dia.</p>}
            {intervalos.length > 0 && <ul aria-label="Horários">
              {intervalos.map(item => {
                const livre = item.estado === 'livre';
                const de = new Date(item.inicio);
                const ate = new Date(item.fim);
                return <li key={item.id} data-estado={item.estado}>
                  <span><time dateTime={de.toISOString()}>{hora.format(de)}</time> a <time dateTime={ate.toISOString()}>{hora.format(ate)}</time></span>
                  <span className="agenda-estado">{livre ? ['Livre', item.local_nome].filter(Boolean).join(' · ') : rotulosAgenda[item.estado]}</span>
                </li>;
              })}
            </ul>}
          </section>
        );
      })}
    </section>
  );
}
