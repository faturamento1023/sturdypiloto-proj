import { ambientePiloto } from './ambiente';

export const dynamic = 'force-dynamic';

export default function Home() {
  const label = ambientePiloto() === 'homologacao' ? 'Homologação' : 'Desenvolvimento';

  return (
    <main className="shell">
      <header className="brand">
        <span className="monograma" aria-hidden="true">DM</span>
        <span>Clínica DM</span>
      </header>
      <section className="painel" aria-labelledby="titulo">
        <div className="intro">
          <span className="rotulo">INFRAESTRUTURA · DEV-011</span>
          <h1 id="titulo">Projeto Piloto</h1>
          <p>Base web para testar a aplicação da clínica com dados fictícios.</p>
          <div className="acoes-inicio">
            <a className="botao" href="/entrar">Entrar no piloto</a>
            <a className="acesso-link" href="/api/saude">Verificar status técnico <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <dl className="estado">
          <div>
            <dt>Ambiente</dt>
            <dd>{label}</dd>
          </div>
          <div>
            <dt>Escopo</dt>
            <dd>Dados fictícios</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
