'use client';

import { useId, useRef, type ReactNode } from 'react';

export function ImprimirPainel() {
  return <button type="button" className="painel-controle painel-controle-destaque" onClick={() => window.print()}>Imprimir</button>;
}

export function JanelaPesquisa({ titulo, children }: { titulo: string; children: ReactNode }) {
  const janela = useRef<HTMLDialogElement>(null);
  const tituloId = useId();
  return (
    <>
      <button type="button" className="painel-controle painel-controle-destaque" aria-haspopup="dialog"
        onClick={() => janela.current?.showModal()}>Pesquisar</button>
      <dialog ref={janela} className="painel-janela" aria-labelledby={tituloId}
        onClose={evento => evento.currentTarget.querySelector('form')?.reset()}>
        <header>
          <h3 id={tituloId}>{titulo}</h3>
          <button type="button" className="painel-controle" onClick={() => janela.current?.close()}>Fechar</button>
        </header>
        {children}
      </dialog>
    </>
  );
}
