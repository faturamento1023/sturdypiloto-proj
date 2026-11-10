import Link from 'next/link';
import type { sessaoNoServidor } from '../../auth/sessao';
import { ImprimirPainel, JanelaPesquisa } from '../controles';

type ItemHistorico = {
  item_id: string; aberto_em: string; procedimento_codigo_atual: string; procedimento_descricao_atual: string;
  procedimento_ativo_atual: boolean; profissional_nome_atual: string | null; profissional_ativo_atual: boolean | null;
  quantidade: number; valor_historico_centavos: number; cobrado_historico_centavos: string;
};

const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatoData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' });

function dataAtendimento(valor: string) {
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? valor : formatoData.format(data);
}

function moeda(centavos: number | string) {
  const total = BigInt(centavos);
  const fracao = (total % 100n).toString().padStart(2, '0');
  return formatoMoeda.formatToParts(total / 100n).map(parte => parte.type === 'fraction' ? fracao : parte.value).join('');
}

export async function HistoricoAtendimentos({ cliente, unidade, filtro, pagina }: {
  cliente: NonNullable<Awaited<ReturnType<typeof sessaoNoServidor>>>;
  unidade: string; filtro: string; pagina: number;
}) {
  const { data, error } = await cliente.rpc('piloto_listar_historico_itens', {
    unidade, busca: filtro, pagina, correlacao: crypto.randomUUID(),
  });
  if (error || !Array.isArray(data)) {
    return <p className="painel-aviso" role="alert">O histórico está temporariamente indisponível.</p>;
  }

  const itens: ItemHistorico[] = data.slice(0, 20);
  const linkPagina = (indice: number, termo = filtro) => '/painel?' + new URLSearchParams({
    unidade, modulo: 'atendimentos', filtroHistorico: termo, pagina: String(indice),
  }).toString();

  return (
    <section className="painel-modulos historico-itens" aria-labelledby="historico-itens-titulo">
      <h2 id="historico-itens-titulo">Histórico de itens</h2>
      <p>Os valores são os registrados no atendimento. A situação do procedimento e do profissional é a do cadastro atual.</p>
      <div className="painel-barra painel-barra-busca">
        <ImprimirPainel />
        <JanelaPesquisa titulo="Pesquisar no histórico" key={filtro}>
          <form action="/painel" method="get" role="search" aria-label="Buscar no histórico" className="agenda-formulario">
            <input type="hidden" name="unidade" value={unidade} />
            <input type="hidden" name="modulo" value="atendimentos" />
            <label>Procedimento, código ou profissional<input type="search" name="filtroHistorico" defaultValue={filtro} maxLength={80} /></label>
            <button type="submit" className="painel-controle painel-controle-confirmar">Aplicar filtros</button>
          </form>
        </JanelaPesquisa>
        {filtro && <Link className="painel-controle" href={linkPagina(0, '')}
          prefetch={false}>Limpar pesquisa</Link>}
      </div>
      {itens.length === 0 ? <p>Nenhum item encontrado no histórico.</p> : (
        <div className="painel-tabela-rolagem" tabIndex={0} role="region" aria-label="Tabela de itens registrados">
          <table className="painel-tabela">
            <thead><tr>
              <th scope="col">Data</th><th scope="col">Procedimento</th><th scope="col">Situação no cadastro</th>
              <th scope="col">Profissional</th><th scope="col">Qtd.</th><th scope="col">Valor unitário</th><th scope="col">Total registrado</th>
            </tr></thead>
            <tbody>
              {itens.map(item => (
                <tr key={item.item_id}>
                  <td className="painel-numero">{dataAtendimento(item.aberto_em)}</td>
                  <th scope="row">{item.procedimento_descricao_atual}<small>{item.procedimento_codigo_atual}</small></th>
                  <td><span className="painel-estado" data-estado={item.procedimento_ativo_atual ? 'ativo' : 'inativo'}>
                    {item.procedimento_ativo_atual ? 'Ativo' : 'Inativo'}
                  </span></td>
                  <td>{item.profissional_nome_atual === null ? '—' : <>{item.profissional_nome_atual}
                    <small>{item.profissional_ativo_atual ? 'Ativo' : 'Inativo'}</small></>}</td>
                  <td className="painel-numero">{item.quantidade}</td>
                  <td className="painel-numero">{moeda(item.valor_historico_centavos)}</td>
                  <td className="painel-numero">{moeda(item.cobrado_historico_centavos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(pagina > 0 || data.length > 20) && (
        <nav aria-label="Páginas de histórico" className="painel-paginas-medicos">
          {pagina > 0 && <Link href={linkPagina(pagina - 1)} prefetch={false}>Página anterior</Link>}
          {data.length > 20 && <Link href={linkPagina(pagina + 1)} prefetch={false}>Próxima página</Link>}
        </nav>
      )}
    </section>
  );
}
