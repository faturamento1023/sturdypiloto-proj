import Link from 'next/link';
import type { sessaoNoServidor } from '../../auth/sessao';

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
  const linkPagina = (indice: number) => '/painel?' + new URLSearchParams({
    unidade, modulo: 'atendimentos', filtroHistorico: filtro, pagina: String(indice),
  }).toString();

  return (
    <section className="painel-modulos" aria-labelledby="historico-itens-titulo">
      <h2 id="historico-itens-titulo">Histórico de itens</h2>
      <p>Os valores são os registrados no atendimento. A situação do procedimento e do profissional é a do cadastro atual.</p>
      <form action="/painel" method="get" role="search" aria-label="Buscar no histórico" className="painel-filtro-medico">
        <input type="hidden" name="unidade" value={unidade} />
        <input type="hidden" name="modulo" value="atendimentos" />
        <input type="search" name="filtroHistorico" aria-label="Procedimento, código ou profissional"
          placeholder="Procedimento, código ou profissional" defaultValue={filtro} key={filtro} maxLength={80} />
        <button type="submit" className="botao">Filtrar</button>
      </form>
      {itens.length === 0 && <p>Nenhum item encontrado no histórico.</p>}
      <ul className="painel-lista-medicos">
        {itens.map(item => (
          <li className="painel-aviso" key={item.item_id}>
            <strong>{item.procedimento_descricao_atual} · {item.procedimento_codigo_atual}</strong>
            <dl className="painel-dados-catalogo">
              <dt>Abertura do atendimento</dt><dd>{dataAtendimento(item.aberto_em)}</dd>
              <dt>Procedimento no cadastro</dt><dd>{item.procedimento_ativo_atual ? 'Ativo' : 'Inativo'}</dd>
              {item.profissional_nome_atual !== null && (
                <><dt>Profissional no cadastro</dt><dd>{item.profissional_nome_atual} · {item.profissional_ativo_atual ? 'Ativo' : 'Inativo'}</dd></>
              )}
              <dt>Quantidade</dt><dd>{item.quantidade}</dd>
              <dt>Valor unitário registrado</dt><dd>{moeda(item.valor_historico_centavos)}</dd>
              <dt>Total registrado</dt><dd>{moeda(item.cobrado_historico_centavos)}</dd>
            </dl>
          </li>
        ))}
      </ul>
      {(pagina > 0 || data.length > 20) && (
        <nav aria-label="Páginas de histórico" className="painel-paginas-medicos">
          {pagina > 0 && <Link href={linkPagina(pagina - 1)} prefetch={false}>Página anterior</Link>}
          {data.length > 20 && <Link href={linkPagina(pagina + 1)} prefetch={false}>Próxima página</Link>}
        </nav>
      )}
    </section>
  );
}
