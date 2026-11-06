import Link from 'next/link';
import type { sessaoNoServidor } from '../../auth/sessao';
import { salvarGrupo, salvarProcedimento } from './acoes';

const nomesTipos = { consulta: 'Consulta', exame: 'Exame', procedimento: 'Procedimento' };

type Grupo = { id: string; nome: string; ativo: boolean; revisao: number };
type Procedimento = {
  id: string; codigo: string; descricao: string; codigo_tuss: string | null; grupo_id: string | null;
  tipo: keyof typeof nomesTipos; preparo: string; exige_consentimento: boolean; ativo: boolean; revisao: number;
};

function FormGrupo({ unidade, grupo }: { unidade: string; grupo?: Grupo }) {
  return (
    <form action={salvarGrupo.bind(null, unidade, grupo?.id ?? null, grupo?.revisao ?? null)}
      className="acesso-form painel-form-medico">
      <label>Nome do grupo<input name="nome" defaultValue={grupo?.nome} minLength={2} maxLength={100} required /></label>
      <label className="painel-ativo-medico"><input type="checkbox" name="ativo" defaultChecked={grupo?.ativo ?? true} /> Grupo ativo</label>
      <button type="submit" className="botao">{grupo ? 'Salvar grupo' : 'Cadastrar grupo'}</button>
    </form>
  );
}

function FormProcedimento({ unidade, grupos, item }: { unidade: string; grupos: Grupo[]; item?: Procedimento }) {
  return (
    <form action={salvarProcedimento.bind(null, unidade, item?.id ?? null, item?.revisao ?? null)}
      className="acesso-form painel-form-medico">
      <label>Descrição<input name="descricao" defaultValue={item?.descricao} minLength={2} maxLength={160} required /></label>
      <div className="painel-campos-medico">
        <label>Código interno<input name="codigo" defaultValue={item?.codigo} maxLength={40} required /></label>
        <label>Código TUSS<input name="tuss" defaultValue={item?.codigo_tuss ?? ''} pattern="[0-9]{8}" inputMode="numeric" maxLength={8} /></label>
      </div>
      <label>Tipo
        <select name="tipo" defaultValue={item?.tipo ?? 'procedimento'}>
          {Object.entries(nomesTipos).map(([valor, nome]) => <option value={valor} key={valor}>{nome}</option>)}
        </select>
      </label>
      <label>Grupo
        <select name="grupo" defaultValue={item?.grupo_id ?? ''}>
          <option value="">Sem grupo</option>
          {grupos.filter(grupo => grupo.ativo || grupo.id === item?.grupo_id).map(grupo => (
            <option value={grupo.id} key={grupo.id}>{grupo.nome}{grupo.ativo ? '' : ' (inativo)'}</option>
          ))}
        </select>
      </label>
      <label>Instruções de preparo<textarea name="preparo" defaultValue={item?.preparo} rows={3} maxLength={2000} /></label>
      <label className="painel-ativo-medico"><input type="checkbox" name="consentimento" defaultChecked={item?.exige_consentimento ?? false} /> Exige consentimento</label>
      <label className="painel-ativo-medico"><input type="checkbox" name="ativo" defaultChecked={item?.ativo ?? true} /> Procedimento ativo</label>
      <button type="submit" className="botao">{item ? 'Salvar procedimento' : 'Cadastrar procedimento'}</button>
    </form>
  );
}

const mensagens: Record<string, string> = {
  salvo: 'Cadastro salvo.',
  invalido: 'Confira os campos e a situação do grupo selecionado.',
  duplicado: 'Já existe um cadastro com esse código interno ou nome de grupo.',
  desatualizado: 'O cadastro mudou desde a abertura. Confira os dados e tente novamente.',
  grupo_em_uso: 'O grupo tem procedimentos ativos. Mova ou inative esses procedimentos primeiro.',
  indisponivel: 'O catálogo está temporariamente indisponível.',
};

export async function CadastroCatalogo({ cliente, unidade, filtro, pagina, estado }: {
  cliente: NonNullable<Awaited<ReturnType<typeof sessaoNoServidor>>>;
  unidade: string; filtro: string; pagina: number; estado: string;
}) {
  const { data, error } = await cliente.rpc('piloto_listar_catalogo', {
    unidade, busca: filtro, pagina, correlacao: crypto.randomUUID(),
  });
  if (error || !Array.isArray(data?.grupos) || !Array.isArray(data?.procedimentos)) {
    return <div className="painel-aviso" role="alert">{mensagens.indisponivel}</div>;
  }

  const gestor = data.gestor === true;
  const grupos: Grupo[] = data.grupos;
  const itens: Procedimento[] = data.procedimentos.slice(0, 20);
  const linkPagina = (indice: number) => '/painel?' + new URLSearchParams({
    unidade, modulo: 'catalogo', filtroCatalogo: filtro, pagina: String(indice),
  }).toString();

  return (
    <section className="painel-modulos" aria-label="Catálogo da unidade">
      {Object.hasOwn(mensagens, estado) && <p className="acesso-aviso" role="status">{mensagens[estado]}</p>}
      {gestor && (
        <div className="painel-catalogo-gestao">
          <details className="painel-aviso"><summary>Novo procedimento</summary>
            <FormProcedimento unidade={unidade} grupos={grupos} />
          </details>
          <details className="painel-aviso"><summary>Novo grupo</summary>
            <FormGrupo unidade={unidade} />
          </details>
          <details className="painel-aviso"><summary>Gerenciar grupos</summary>
            {grupos.length === 0 && <p>Nenhum grupo cadastrado.</p>}
            <ul className="painel-lista-medicos">
              {grupos.map(grupo => (
                <li key={grupo.id}>
                  <details className="painel-aviso" key={grupo.revisao}>
                    <summary>{grupo.nome} · {grupo.ativo ? 'Ativo' : 'Inativo'}</summary>
                    <FormGrupo unidade={unidade} grupo={grupo} />
                  </details>
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
      <form action="/painel" method="get" role="search" aria-label="Buscar procedimentos" className="painel-filtro-medico">
        <input type="hidden" name="unidade" value={unidade} />
        <input type="hidden" name="modulo" value="catalogo" />
        <input type="search" name="filtroCatalogo" aria-label="Descrição, código interno ou TUSS"
          placeholder="Descrição, código interno ou TUSS" defaultValue={filtro} key={filtro} maxLength={80} />
        <button type="submit" className="botao">Filtrar</button>
      </form>
      <h2>Procedimentos</h2>
      {itens.length === 0 && <p>Nenhum procedimento encontrado.</p>}
      <ul className="painel-lista-medicos">
        {itens.map(item => (
          <li key={item.id}>
            <details className="painel-aviso" key={item.revisao}>
              <summary>
                <strong>{item.descricao}</strong>
                <span>{item.codigo}{item.codigo_tuss ? ' · TUSS ' + item.codigo_tuss : ''} · {nomesTipos[item.tipo]} · {item.ativo ? 'Ativo' : 'Inativo'}</span>
              </summary>
              <dl className="painel-dados-catalogo">
                <dt>Grupo</dt><dd>{grupos.find(grupo => grupo.id === item.grupo_id)?.nome ?? 'Sem grupo'}</dd>
                <dt>Preparo</dt><dd>{item.preparo || 'Sem instruções cadastradas'}</dd>
                <dt>Consentimento</dt><dd>{item.exige_consentimento ? 'Exigido' : 'Sem exigência cadastrada'}</dd>
              </dl>
              {gestor && <FormProcedimento unidade={unidade} grupos={grupos} item={item} />}
            </details>
          </li>
        ))}
      </ul>
      {(pagina > 0 || data.procedimentos.length > 20) && (
        <nav aria-label="Páginas de procedimentos" className="painel-paginas-medicos">
          {pagina > 0 && <Link href={linkPagina(pagina - 1)} prefetch={false}>Página anterior</Link>}
          {data.procedimentos.length > 20 && <Link href={linkPagina(pagina + 1)} prefetch={false}>Próxima página</Link>}
        </nav>
      )}
    </section>
  );
}
