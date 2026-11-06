import Link from 'next/link';
import { pedirRecuperacao } from '../auth/acoes';
import { avisoAcesso, EmailAcesso, TelaAcesso, type PaginaAcesso } from '../auth/interface';

export default async function PaginaRecuperar({ searchParams }: PaginaAcesso) {
  const { estado } = await searchParams;
  const aviso = avisoAcesso(estado, { invalido: 'Informe um e-mail válido.' });

  return (
    <TelaAcesso titulo="Recuperar acesso" descricao="Solicite um código para criar uma nova senha." aviso={aviso}>
      <form className="acesso-form" action={pedirRecuperacao}>
        <EmailAcesso />
        <button className="botao" type="submit">Solicitar código</button>
      </form>
      <Link className="acesso-link" href="/entrar">Voltar ao login</Link>
    </TelaAcesso>
  );
}
