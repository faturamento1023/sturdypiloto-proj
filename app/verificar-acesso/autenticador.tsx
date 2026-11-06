'use client';

import { useActionState } from 'react';
import { cadastrarFator, verificarFator, type InscricaoMfa } from '../auth/mfa';

type Fator = { id: string; nome: string };

export function CodigoAutenticador({ fatores }: { fatores: Fator[] }) {
  const [erro, acao, pendente] = useActionState(verificarFator, null);

  return (
    <form className="acesso-form" action={acao}>
      {fatores.length === 1 ? (
        <input type="hidden" name="fator" value={fatores[0].id} />
      ) : (
        <label>
          Aplicativo autenticador
          <select name="fator">{fatores.map(fator => <option key={fator.id} value={fator.id}>{fator.nome}</option>)}</select>
        </label>
      )}
      <label>
        Código do autenticador
        <input name="codigo" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required />
      </label>
      {erro && <p className="acesso-aviso" role="status">{erro}</p>}
      <button className="botao" type="submit" disabled={pendente}>Verificar acesso</button>
    </form>
  );
}

export function ConfigurarAutenticador() {
  const [inscricao, acao, pendente] = useActionState<InscricaoMfa>(cadastrarFator, null);

  if (inscricao && 'id' in inscricao) {
    return (
      <>
        <p>Escaneie o QR code ou digite a chave no aplicativo autenticador.</p>
        {inscricao.qr && <img className="acesso-qr" src={inscricao.qr} alt="QR code de configuração do autenticador" />}
        <p className="acesso-identidade"><code>{inscricao.segredo}</code></p>
        <CodigoAutenticador fatores={[{ id: inscricao.id, nome: 'Autenticador' }]} />
      </>
    );
  }

  return (
    <form className="acesso-form" action={acao}>
      {inscricao?.erro && <p className="acesso-aviso" role="status">{inscricao.erro}</p>}
      <button className="botao" type="submit" disabled={pendente}>Configurar autenticador</button>
    </form>
  );
}
