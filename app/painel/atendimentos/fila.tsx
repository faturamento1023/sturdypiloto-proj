import Link from 'next/link';
import type { sessaoNoServidor } from '../../auth/sessao';
import { dataAgenda, dataValida } from '../../../src/agenda/tempo';

type Atendimento = { id: string; paciente: string | null; profissional: string | null; aberto_em: string;
  estado: 'aberto' | 'encerrado' | 'cancelado' };
const rotulos = { aberto: 'Aberto', encerrado: 'Encerrado', cancelado: 'Cancelado' };
const horario = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

export async function FilaAtendimentos({ cliente, unidade, data, pagina, atendimento }: {
  cliente: NonNullable<Awaited<ReturnType<typeof sessaoNoServidor>>>;
  unidade: string; data: string; pagina: number; atendimento: string;
}) {
  const dia = dataValida(data) && data >= '1900-01-01' && data <= '9999-12-30' ? data : dataAgenda(new Date());
  const { data: resposta, error } = await cliente.rpc('piloto_listar_fila_atendimentos', {
    unidade, dia, pagina, correlacao: crypto.randomUUID(),
  });
  const registros: Atendimento[] = !error && Array.isArray(resposta) ? resposta : [];
  const url = (indice: number) => '/painel?' + new URLSearchParams({ unidade, modulo: 'atendimentos', dataFila: dia, paginaFila: String(indice) });
  return (
    <section className="painel-modulos historico-itens" aria-labelledby="fila-atendimentos-titulo">
      <h2 id="fila-atendimentos-titulo">Fila de atendimentos</h2>
      {registros.some(item => item.id === atendimento) && <p className="painel-aviso" role="status">Atendimento localizado na fila.</p>}
      <form action="/painel" method="get" className="painel-barra painel-barra-busca" aria-label="Filtrar fila por data">
        <input type="hidden" name="unidade" value={unidade} />
        <input type="hidden" name="modulo" value="atendimentos" />
        <label>Data da fila <input type="date" name="dataFila" min="1900-01-01" max="9999-12-30" defaultValue={dia} key={dia} required /></label>
        <button type="submit" className="painel-controle painel-controle-destaque">Consultar fila</button>
      </form>
      {error || !Array.isArray(resposta) ? <p className="painel-aviso" role="alert">A fila está temporariamente indisponível.</p> : registros.length === 0 ?
        <p>Nenhum atendimento para esta data.</p> : <div className="painel-tabela-rolagem" role="region" tabIndex={0} aria-label="Tabela da fila de atendimentos">
          <table className="painel-tabela">
            <thead><tr><th scope="col">Hora</th><th scope="col">Paciente</th><th scope="col">Profissional</th><th scope="col">Situação</th></tr></thead>
            <tbody>{registros.slice(0, 20).map(item => <tr key={item.id}>
              <td className="painel-numero">{horario.format(new Date(item.aberto_em))}</td><td>{item.paciente ?? '—'}</td>
              <td>{item.profissional ?? '—'}</td><td><span className="painel-estado" data-estado={item.estado}>{rotulos[item.estado]}</span></td>
            </tr>)}</tbody>
          </table>
        </div>}
      {(pagina > 0 || (registros.length > 20 && pagina < 9999)) && <nav aria-label="Páginas da fila" className="painel-paginas-medicos">
        {pagina > 0 && <Link href={url(pagina - 1)} prefetch={false}>Fila anterior</Link>}
        {registros.length > 20 && pagina < 9999 && <Link href={url(pagina + 1)} prefetch={false}>Próxima página da fila</Link>}
      </nav>}
    </section>
  );
}
