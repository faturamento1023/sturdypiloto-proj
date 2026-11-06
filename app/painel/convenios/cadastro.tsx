import Link from 'next/link';
import { assertDate } from '../../../scripts/dev019_precos.cjs';
import type { sessaoNoServidor } from '../../auth/sessao';
import { cadastrarPreco, revisarPreco, salvarConvenio } from './acoes';

type Convenio = { id: string; nome: string; ativo: boolean; revisao: number };
type Procedimento = { id: string; codigo: string; descricao: string };
type Preco = {
  id: string; convenio: string; procedimento: string; inicio: string; fim: string | null;
  valor_centavos: number; coparticipacao_centavos: number; ativo: boolean; disponivel: boolean; revisao: number;
};

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function dataCivil(valor: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor.split('-').reverse().join('/') : valor;
}

function FormConvenio({ unidade, convenio }: { unidade: string; convenio?: Convenio }) {
  return (
    <form action={salvarConvenio.bind(null, unidade, convenio?.id ?? null, convenio?.revisao ?? null)}
      className="acesso-form painel-form-medico">
      <label>Nome do convênio<input name="nome" defaultValue={convenio?.nome} minLength={2} maxLength={120} required /></label>
      <label className="painel-ativo-medico"><input type="checkbox" name="ativo" defaultChecked={convenio?.ativo ?? true} /> Convênio ativo</label>
      <button type="submit" className="botao">{convenio ? 'Salvar convênio' : 'Cadastrar convênio'}</button>
    </form>
  );
}

function FormPreco({ unidade, convenios, procedimentos }: { unidade: string; convenios: Convenio[]; procedimentos: Procedimento[] }) {
  const ativos = convenios.filter(convenio => convenio.ativo);
  if (ativos.length === 0 || procedimentos.length === 0) return <p>Cadastre um convênio e um procedimento ativos para definir o preço.</p>;

  return (
    <form action={cadastrarPreco.bind(null, unidade)} className="acesso-form painel-form-medico">
      <label>Convênio
        <select name="convenio" aria-label="Convênio" required defaultValue="">
          <option value="">Selecione</option>
          {ativos.map(convenio => <option key={convenio.id} value={convenio.id}>{convenio.nome}</option>)}
        </select>
      </label>
      <label>Procedimento
        <select name="procedimento" aria-label="Procedimento" required defaultValue="">
          <option value="">Selecione</option>
          {procedimentos.map(p => <option key={p.id} value={p.id}>{p.descricao} · {p.codigo}</option>)}
        </select>
      </label>
      <label>Início da vigência<input name="inicio" type="date" required /></label>
      <label>Fim da vigência (exclusivo)<input name="fim" type="date" /></label>
      <label>Valor em reais<input name="valor" inputMode="decimal" placeholder="120,00" maxLength={11} required /></label>
      <label>Coparticipação em reais<input name="coparticipacao" inputMode="decimal" placeholder="0,00" maxLength={11} /></label>
      <button type="submit" className="botao">Cadastrar preço</button>
    </form>
  );
}

const mensagens: Record<string, string> = {
  salvo: 'Cadastro salvo.',
  invalido: 'Confira os campos, a vigência e a situação do convênio e do procedimento.',
  duplicado: 'Já existe um convênio com esse nome na unidade.',
  sobreposto: 'Já existe um preço ativo com vigência sobreposta para esse convênio e procedimento.',
  desatualizado: 'O cadastro mudou desde a abertura. Confira os dados e tente novamente.',
  indisponivel: 'A tabela está temporariamente indisponível.',
};

export async function CadastroConvenios({ cliente, unidade, filtro, referencia, pagina, estado }: {
  cliente: NonNullable<Awaited<ReturnType<typeof sessaoNoServidor>>>;
  unidade: string; filtro: string; referencia: string; pagina: number; estado: string;
}) {
  let dataValida: string | null = null;
  if (referencia) {
    try {
      dataValida = assertDate(referencia);
    } catch {
      return <p className="acesso-aviso" role="alert">A data de referência é inválida. <Link href={'/painel?' + new URLSearchParams({ unidade, modulo: 'convenios' })}>Voltar à tabela</Link></p>;
    }
  }
  const { data, error } = await cliente.rpc('piloto_listar_convenios_precos', {
    unidade, busca: filtro, referencia: dataValida, pagina, correlacao: crypto.randomUUID(),
  });
  if (error || !Array.isArray(data?.convenios) || !Array.isArray(data?.procedimentos) || !Array.isArray(data?.precos)) {
    return <div className="painel-aviso" role="alert">{mensagens.indisponivel}</div>;
  }

  const gestor = data.gestor === true;
  const convenios: Convenio[] = data.convenios;
  const precos: Preco[] = data.precos.slice(0, 20);
  const linkPagina = (indice: number) => '/painel?' + new URLSearchParams({
    unidade, modulo: 'convenios', filtroConvenios: filtro, referencia, pagina: String(indice),
  }).toString();

  return (
    <section className="painel-modulos" aria-label="Convênios e preços da unidade">
      {Object.hasOwn(mensagens, estado) && <p className="acesso-aviso" role="status">{mensagens[estado]}</p>}
      {gestor && (
        <div className="painel-catalogo-gestao">
          <details className="painel-aviso"><summary>Novo convênio</summary><FormConvenio unidade={unidade} /></details>
          <details className="painel-aviso"><summary>Novo preço</summary>
            <FormPreco unidade={unidade} convenios={convenios} procedimentos={data.procedimentos} />
          </details>
          <details className="painel-aviso"><summary>Gerenciar convênios</summary>
            {convenios.length === 0 && <p>Nenhum convênio cadastrado.</p>}
            <ul className="painel-lista-medicos">
              {convenios.map(convenio => (
                <li key={convenio.id}>
                  <details className="painel-aviso" key={convenio.revisao}>
                    <summary>{convenio.nome} · {convenio.ativo ? 'Ativo' : 'Inativo'}</summary>
                    <FormConvenio unidade={unidade} convenio={convenio} />
                  </details>
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
      <form action="/painel" method="get" role="search" aria-label="Buscar preços" className="acesso-form painel-form-medico">
        <input type="hidden" name="unidade" value={unidade} />
        <input type="hidden" name="modulo" value="convenios" />
        <label>Convênio, procedimento ou código
          <input type="search" name="filtroConvenios" defaultValue={filtro} key={filtro} maxLength={80} />
        </label>
        <label>Data de referência<input type="date" name="referencia" defaultValue={referencia} key={referencia} /></label>
        <button type="submit" className="botao">Filtrar preços</button>
      </form>
      <h2>{dataValida ? 'Preços em ' + dataCivil(dataValida) : 'Tabela de preços'}</h2>
      {precos.length === 0 && <p>Nenhum preço encontrado para os filtros informados.</p>}
      <ul className="painel-lista-medicos">
        {precos.map(preco => (
          <li key={preco.id}>
            <details className="painel-aviso" key={preco.revisao}>
              <summary>
                <strong>{preco.procedimento} · {preco.convenio}</strong>
                <span>{moeda.format(preco.valor_centavos / 100)} · {preco.disponivel ? 'Ativo' : 'Indisponível'}</span>
              </summary>
              <dl className="painel-dados-catalogo">
                <dt>Início da vigência</dt><dd>{dataCivil(preco.inicio)}</dd>
                <dt>Fim da vigência (exclusivo)</dt><dd>{preco.fim ? dataCivil(preco.fim) : 'Sem data final'}</dd>
                <dt>Coparticipação cadastrada</dt><dd>{moeda.format(preco.coparticipacao_centavos / 100)}</dd>
              </dl>
              {gestor && (
                <form action={revisarPreco.bind(null, unidade, preco.id, preco.revisao)} className="acesso-form painel-form-medico">
                  <label>Novo fim da vigência (exclusivo)<input name="fim" type="date" defaultValue={preco.fim ?? ''} /></label>
                  <label className="painel-ativo-medico"><input type="checkbox" name="ativo" defaultChecked={preco.ativo} /> Preço ativo</label>
                  <button type="submit" className="botao">Salvar vigência e situação</button>
                </form>
              )}
            </details>
          </li>
        ))}
      </ul>
      {(pagina > 0 || data.precos.length > 20) && (
        <nav aria-label="Páginas de preços" className="painel-paginas-medicos">
          {pagina > 0 && <Link href={linkPagina(pagina - 1)} prefetch={false}>Página anterior</Link>}
          {data.precos.length > 20 && <Link href={linkPagina(pagina + 1)} prefetch={false}>Próxima página</Link>}
        </nav>
      )}
    </section>
  );
}
