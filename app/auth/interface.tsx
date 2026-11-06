import type { ReactNode } from 'react';

export function TelaAcesso({ titulo, descricao, aviso, children }: {
  titulo: string;
  descricao: string;
  aviso?: string;
  children: ReactNode;
}) {
  return (
    <main className="shell acesso">
      <header className="brand">
        <span className="monograma" aria-hidden="true">DM</span>
        <span>Clínica DM</span>
      </header>
      <section className="painel acesso-painel" aria-labelledby="titulo">
        <div className="intro">
          <span className="rotulo">PROJETO PILOTO · ACESSO</span>
          <h1 id="titulo">{titulo}</h1>
          <p>{descricao}</p>
          {aviso && <p className="acesso-aviso" role="status">{aviso}</p>}
          {children}
        </div>
      </section>
    </main>
  );
}

export function EmailAcesso() {
  return (
    <label>
      E-mail
      <input type="email" name="email" autoComplete="email" maxLength={254} required />
    </label>
  );
}

export function avisoAcesso(estado: string | string[] | undefined, mensagens: Record<string, string>) {
  if (estado === 'indisponivel') return 'O acesso está indisponível neste ambiente.';
  return typeof estado === 'string' && Object.hasOwn(mensagens, estado) ? mensagens[estado] : undefined;
}

export type PaginaAcesso = { searchParams: Promise<{ estado?: string | string[] }> };
