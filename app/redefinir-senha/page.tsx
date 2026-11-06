import Link from 'next/link';
import { redefinirSenha } from '../auth/acoes';
import { avisoAcesso, EmailAcesso, TelaAcesso, type PaginaAcesso } from '../auth/interface';

export default async function PaginaRedefinir({ searchParams }: PaginaAcesso) {
  const { estado } = await searchParams;
  const aviso = avisoAcesso(estado, {
    codigo: 'O e-mail ou o código está incorreto ou expirou.',
    senha: 'Confira se as senhas coincidem e têm entre 12 caracteres e 72 bytes.',
    autenticador: 'Solicite outro código por e-mail e confirme também o código do seu aplicativo autenticador.',
    recusada: 'Não foi possível salvar a senha. Solicite outro código e tente novamente.',
  });

  return (
    <TelaAcesso
      titulo="Redefinir senha"
      descricao="Se o endereço estiver cadastrado, você receberá um código por e-mail."
      aviso={aviso}
    >
      <form className="acesso-form" action={redefinirSenha}>
        <EmailAcesso />
        <label>
          Código do e-mail
          <input name="codigo" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" required />
        </label>
        <label>
          Nova senha
          <input type="password" name="senha" autoComplete="new-password" minLength={12} maxLength={72} required />
        </label>
        <label>
          Confirmar nova senha
          <input type="password" name="confirmacao" autoComplete="new-password" minLength={12} maxLength={72} required />
        </label>
        <label>
          Código do autenticador (se já configurado)
          <input name="codigoMfa" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" />
        </label>
        <button className="botao" type="submit">Salvar nova senha</button>
      </form>
      <Link className="acesso-link" href="/recuperar-acesso">Solicitar outro código</Link>
    </TelaAcesso>
  );
}
