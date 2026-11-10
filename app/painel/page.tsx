import Link from 'next/link';
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { buscarModulos, modulosPorPerfil, rotuloPerfil } from '../../src/navegacao/modulos';
import { TelaAcesso } from '../auth/interface';
import { sessaoNoServidor, verificarIdentidade } from '../auth/sessao';
import { consultarUnidades, type UnidadePainel } from './unidades';
import { CadastroMedicos } from './medicos/cadastro';
import { CadastroUsuarios } from './usuarios/cadastro';
import { CadastroCatalogo } from './catalogo/cadastro';
import { CadastroConvenios } from './convenios/cadastro';
import { HistoricoAtendimentos } from './atendimentos/historico';
import { GradeAgenda } from './agenda/grade';
import { ConfiguracaoAgenda } from './agenda/configuracao';
import { ExcecoesAgenda } from './agenda/excecoes';
import { perfisDaOperacao } from '../../src/autorizacao/politica';
import './painel.css';

export const dynamic = 'force-dynamic';

const icones: Record<string, string> = {
  inicio: 'M3 10.5 12 3l9 7.5M5 9v12h14V9m-9 12v-7h4v7',
  agenda: 'M8 3v4m8-4v4M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2 8h2m4 0h2m-8 4h2',
  pacientes: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m16 0v-2a4 4 0 0 0-3-3.9M14 4.1a4 4 0 0 1 0 7.8M14 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  atendimentos: 'M9 5H5v16h14V5h-4M9 3h6v4H9zM9 14h6m-3-3v6',
  prontuario: 'M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6',
  catalogo: 'M3 4h7v7H3zm11 0h7v7h-7zM3 15h7v6H3zm11 0h7v6h-7z',
  usuarios: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m16 0v-2a4 4 0 0 0-3-3.9M14 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  medicos: 'M3 7h18v13H3zM9 7V4h6v3m-3 3v7m-3-3.5h6',
  convenios: 'M3 6h18v13H3zM3 10h18m-13 5h4m4 0h2',
  financeiro: 'M4 7h16v12H4zM4 11h16m-12 4h3M7 4h10',
  conta: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  busca: 'M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Zm-2 4 5 5',
  menu: 'M4 6h16M4 12h16M4 18h16',
  seta: 'M5 12h14m-6-6 6 6-6 6',
  unidade: 'M4 21h16M6 21V8l6-5 6 5v13M10 21v-5h4v5M9 10h1m4 0h1',
};

function Icone({ nome }: { nome: string }) {
  return (
    <svg className="painel-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={icones[nome]} />
    </svg>
  );
}

function urlPainel(unidade: string, modulo?: string) {
  const params = new URLSearchParams({ unidade });
  if (modulo) params.set('modulo', modulo);
  return '/painel?' + params.toString();
}

function UnidadeAtual({ unidade, unidades }: { unidade: UnidadePainel; unidades: UnidadePainel[] }) {
  if (unidades.length === 1) {
    return <span className="painel-seletor"><Icone nome="unidade" />{unidade.nome}</span>;
  }
  return (
    <details className="painel-unidades">
      <summary className="painel-seletor" aria-label={'Trocar unidade. Unidade atual ' + unidade.nome}>
        <Icone nome="unidade" /><span>{unidade.nome}</span>
      </summary>
      <ul aria-label="Unidades disponíveis">
        {unidades.map(item => (
          <li key={item.id}>
            <Link href={urlPainel(item.id)} prefetch={false} aria-current={item.id === unidade.id ? 'true' : undefined}>
              {item.nome}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

type Parametros = Promise<{
  unidade?: string | string[]; modulo?: string | string[]; busca?: string | string[];
  dataAgenda?: string; profissionalAgenda?: string; buscaAgenda?: string; situacaoAgenda?: string;
  configuracaoAgenda?: string; estadoAgenda?: string;
  filtroMedico?: string; filtroCatalogo?: string; filtroConvenios?: string; filtroHistorico?: string; referencia?: string; pagina?: string; estado?: string;
}>;

export default async function PaginaPainel({ searchParams }: { searchParams: Parametros }) {
  const cliente = await sessaoNoServidor();
  if (!cliente) redirect('/entrar?estado=indisponivel');
  const sessao = await verificarIdentidade(cliente);
  if (!sessao) redirect('/entrar');
  if (sessao.aal !== 'aal2') redirect('/verificar-acesso');

  const unidades = await consultarUnidades(cliente);
  if (!unidades?.length) {
    return (
      <TelaAcesso
        titulo={unidades ? 'Sem unidade vinculada' : 'Painel indisponível'}
        descricao={unidades
          ? 'Sua conta precisa de um vínculo ativo para abrir uma unidade do piloto.'
          : 'A consulta de unidades falhou. Tente novamente em alguns instantes.'}
      >
        <Link href="/conta" className="botao" prefetch={false}>Minha conta</Link>
      </TelaAcesso>
    );
  }

  const parametros = await searchParams;
  if ([parametros.unidade, parametros.modulo, parametros.busca].some(Array.isArray)) notFound();
  const unidade = parametros.unidade === undefined
    ? unidades[0]
    : unidades.find(item => item.id === parametros.unidade);
  if (!unidade) notFound();

  const modulos = modulosPorPerfil(unidade.perfis);
  const atual = modulos.find(modulo => modulo.id === parametros.modulo);
  if (parametros.modulo !== undefined && !atual) notFound();

  const busca = typeof parametros.busca === 'string' ? parametros.busca.trim().slice(0, 80) : '';
  const resultados = busca ? buscarModulos(modulos, busca) : modulos;
  const historicoPermitido = perfisDaOperacao('item', 'ler').some(perfil => unidade.perfis.includes(perfil));
  const configuraAgenda = perfisDaOperacao('configuracaoAgenda', 'ler').some(perfil => unidade.perfis.includes(perfil));
  const abreConfiguracao = atual?.id === 'agenda' && !busca ? parametros.configuracaoAgenda : undefined;
  if ((abreConfiguracao === '1' || abreConfiguracao === 'excecoes') && !configuraAgenda) notFound();
  const inicio = urlPainel(unidade.id);
  const atalhos = ['pacientes', 'agenda', 'atendimentos'].flatMap(id => modulos.filter(modulo => modulo.id === id));
  const titulo = busca ? 'Resultados da busca' : atual?.nome ?? 'Painel da unidade';

  const menu = (
    <nav aria-label="Menu principal" className="painel-menu">
      <span className="painel-rotulo">ÁREA DE TRABALHO</span>
      <Link href={inicio} prefetch={false} aria-current={!atual && !busca ? 'page' : undefined}>
        <Icone nome="inicio" /> Visão geral
      </Link>
      <span className="painel-rotulo">MÓDULOS</span>
      {modulos.map(modulo => (
        <Link key={modulo.id} href={urlPainel(unidade.id, modulo.id)} prefetch={false}
          aria-current={atual?.id === modulo.id && !busca ? 'page' : undefined}>
          <Icone nome={modulo.id} /> {modulo.nome}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="painel-app">
      <a className="painel-pular" href="#conteudo-painel">Ir para o conteúdo</a>
      <header className="painel-topo">
        <Link href={inicio} prefetch={false} className="painel-topo-marca">
          <span className="painel-simbolo" aria-hidden="true">DM</span><span>DM Medicina Diagnóstica</span>
        </Link>
        <details className="painel-menu-mobile" key={unidade.id + ':' + titulo}>
          <summary className="painel-controle painel-controle-destaque" aria-label="Menu de navegação"><Icone nome="menu" /> Menu</summary>
          {menu}
        </details>
        <UnidadeAtual key={unidade.id} unidade={unidade} unidades={unidades} />
        {atalhos.length > 0 && <nav className="painel-atalhos" aria-label="Atalhos de trabalho">
          {atalhos.map(modulo => (
            <Link key={modulo.id} href={urlPainel(unidade.id, modulo.id)} prefetch={false} aria-label={modulo.nome}
              title={modulo.nome} aria-current={atual?.id === modulo.id && !busca ? 'page' : undefined}>
              <Icone nome={modulo.id} />
            </Link>
          ))}
        </nav>}
        <form action="/painel" method="get" role="search" aria-label="Buscar módulos" className="painel-busca">
          <input type="hidden" name="unidade" value={unidade.id} />
          <input type="search" name="busca" aria-label="Buscar módulo" placeholder="Buscar módulo…" maxLength={80}
            key={busca} defaultValue={busca} />
          <button type="submit" aria-label="Pesquisar módulos"><Icone nome="busca" /></button>
        </form>
        <Link href="/conta" prefetch={false} className="painel-conta" aria-label="Minha conta"><Icone nome="conta" /> <span>Minha conta</span></Link>
      </header>
      <aside className="painel-lateral">
        <Link href={inicio} prefetch={false} className="painel-marca">
          Clínica DM<small>Sistema de atendimento</small>
        </Link>
        {menu}
      </aside>
      <div className="painel-corpo">
        <main className="painel-conteudo" id="conteudo-painel" tabIndex={-1}>
          <nav className="painel-caminho" aria-label="Você está em">
            <ol>
              <li>{atual || busca ? <Link href={inicio} prefetch={false}>Painel</Link> : <span aria-current="page">Painel</span>}</li>
              {(atual || busca) && <li aria-current="page">{busca ? 'Busca' : atual?.nome}</li>}
            </ol>
          </nav>
          <header className="painel-intro">
            <h1>{titulo}</h1>
            {(atual?.id !== 'agenda' || busca) && <p>{busca ? 'Módulos disponíveis para “' + busca + '”.' :
              atual?.descricao ?? 'Acesse os módulos habilitados para sua conta nesta unidade.'}</p>}
          </header>
          {abreConfiguracao === 'excecoes' ? (
            <ExcecoesAgenda cliente={cliente} unidade={unidade.id}
              data={typeof parametros.dataAgenda === 'string' ? parametros.dataAgenda : ''}
              estado={typeof parametros.estadoAgenda === 'string' ? parametros.estadoAgenda : ''} />
          ) : abreConfiguracao === '1' ? (
            <ConfiguracaoAgenda cliente={cliente} unidade={unidade.id}
              estado={typeof parametros.estadoAgenda === 'string' ? parametros.estadoAgenda : ''} />
          ) : atual?.id === 'agenda' && !busca ? (
            <Suspense fallback={<p className="painel-aviso" role="status">Carregando a agenda…</p>}>
              <GradeAgenda cliente={cliente} unidade={unidade.id} configuraAgenda={configuraAgenda}
                data={typeof parametros.dataAgenda === 'string' ? parametros.dataAgenda : ''}
                profissional={typeof parametros.profissionalAgenda === 'string' ? parametros.profissionalAgenda : ''}
                situacao={parametros.situacaoAgenda}
                busca={typeof parametros.buscaAgenda === 'string' ? parametros.buscaAgenda.trim().slice(0, 80) : ''} />
            </Suspense>
          ) : atual?.id === 'atendimentos' && !busca && historicoPermitido ? (
            <HistoricoAtendimentos cliente={cliente} unidade={unidade.id}
              filtro={typeof parametros.filtroHistorico === 'string' ? parametros.filtroHistorico.trim().slice(0, 80) : ''}
              pagina={typeof parametros.pagina === 'string' && /^\d{1,5}$/.test(parametros.pagina) ? Number(parametros.pagina) : 0} />
          ) : atual?.id === 'convenios' && !busca ? (
            <CadastroConvenios cliente={cliente} unidade={unidade.id}
              filtro={typeof parametros.filtroConvenios === 'string' ? parametros.filtroConvenios.trim().slice(0, 80) : ''}
              referencia={typeof parametros.referencia === 'string' ? parametros.referencia : ''}
              pagina={typeof parametros.pagina === 'string' && /^\d{1,5}$/.test(parametros.pagina) ? Number(parametros.pagina) : 0}
              estado={typeof parametros.estado === 'string' ? parametros.estado : ''} />
          ) : atual?.id === 'catalogo' && !busca ? (
            <CadastroCatalogo cliente={cliente} unidade={unidade.id}
              filtro={typeof parametros.filtroCatalogo === 'string' ? parametros.filtroCatalogo.trim().slice(0, 80) : ''}
              pagina={typeof parametros.pagina === 'string' && /^\d{1,5}$/.test(parametros.pagina) ? Number(parametros.pagina) : 0}
              estado={typeof parametros.estado === 'string' ? parametros.estado : ''} />
          ) : atual?.id === 'usuarios' && !busca ? (
            <CadastroUsuarios cliente={cliente} unidade={unidade.id}
              estado={typeof parametros.estado === 'string' ? parametros.estado : ''} />
          ) : atual?.id === 'medicos' && !busca ? (
            <CadastroMedicos cliente={cliente} unidade={unidade.id}
              filtro={typeof parametros.filtroMedico === 'string' ? parametros.filtroMedico.trim().slice(0, 80) : ''}
              pagina={typeof parametros.pagina === 'string' && /^\d{1,5}$/.test(parametros.pagina) ? Number(parametros.pagina) : 0}
              estado={typeof parametros.estado === 'string' ? parametros.estado : ''} />
          ) : atual && !busca ? (
            <section className="painel-aviso" aria-labelledby="modulo-status">
              <span className="painel-etiqueta">Em preparação</span>
              <h2 id="modulo-status">Área reservada para {atual.nome.toLocaleLowerCase('pt-BR')}</h2>
              <p>As funções deste módulo serão liberadas nas próximas etapas do piloto.</p>
              <Link href={inicio} prefetch={false}>Voltar para a visão geral</Link>
            </section>
          ) : (
            <>
              {!busca && (
                <section className="painel-perfis" aria-label="Perfis nesta unidade">
                  <span>Seus perfis nesta unidade</span>
                  <ul>{unidade.perfis.map(perfil => <li key={perfil}>{rotuloPerfil[perfil]}</li>)}</ul>
                </section>
              )}
              <section className="painel-modulos" aria-labelledby="painel-modulos-titulo">
                <h2 id="painel-modulos-titulo">{busca ? 'Módulos encontrados' : 'Módulos disponíveis'}</h2>
                {resultados.length ? (
                  <ul className="painel-grade">
                    {resultados.map(modulo => (
                      <li key={modulo.id}>
                        <Link href={urlPainel(unidade.id, modulo.id)} prefetch={false} className="painel-cartao">
                          <span className="painel-cartao-icone"><Icone nome={modulo.id} /></span>
                          <span className="painel-cartao-texto"><strong>{modulo.nome}</strong><span>{modulo.descricao}</span></span>
                          <Icone nome="seta" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="painel-aviso">
                    <p>Nenhum módulo encontrado. Use outro termo ou volte à visão geral.</p>
                    <Link href={inicio} prefetch={false}>Limpar busca</Link>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
