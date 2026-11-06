import Link from 'next/link';
import { entrar } from '../auth/acoes';
import { avisoAcesso, EmailAcesso, TelaAcesso, type PaginaAcesso } from '../auth/interface';

export default async function PaginaEntrar({ searchParams }: PaginaAcesso) {
  const { estado } = await searchParams;
  const aviso = avisoAcesso(estado, {
    invalido: 'Não foi possível entrar. Confira seu e-mail e sua senha.',
    redefinida: 'Senha alterada. Entre com a nova senha.',
    revogacao: 'Senha alterada. Não foi possível confirmar o encerramento das sessões anteriores.',
  });

  return (
    <TelaAcesso titulo="Entrar" descricao="Acesse o piloto com sua conta da clínica." aviso={aviso}>
      <form className="acesso-form" action={entrar}>
        <EmailAcesso />
        <label>
          Senha
          <input type="password" name="senha" autoComplete="current-password" maxLength={1024} required />
        </label>
        <button className="botao" type="submit">Entrar</button>
      </form>
      <Link className="acesso-link" href="/recuperar-acesso">Esqueci minha senha</Link>
    </TelaAcesso>
  );
}
