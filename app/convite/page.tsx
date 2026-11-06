import Link from 'next/link';
import { redirect } from 'next/navigation';
import { avisoAcesso, TelaAcesso, type PaginaAcesso } from '../auth/interface';
import { sessaoNoServidor, verificarIdentidade } from '../auth/sessao';
import { aceitarConvite } from '../painel/usuarios/acoes';

export const dynamic = 'force-dynamic';

export default async function PaginaConvite({ searchParams }: PaginaAcesso) {
  const cliente = await sessaoNoServidor();
  if (!cliente) redirect('/entrar?estado=indisponivel');
  const sessao = await verificarIdentidade(cliente);
  if (!sessao) redirect('/entrar');
  if (sessao.aal !== 'aal2') redirect('/verificar-acesso');

  const { estado } = await searchParams;
  const aviso = avisoAcesso(estado, {
    aceito: 'Convite aceito. Seu acesso à unidade já está disponível.',
    invalido: 'Convite inválido, expirado ou indisponível para sua conta.',
    indisponivel: 'Não foi possível validar o convite. Tente novamente.',
  });

  return (
    <TelaAcesso titulo="Validar convite" descricao="Use o código recebido da administração da unidade." aviso={aviso}>
      {estado === 'aceito' ? <Link href="/painel" className="botao" prefetch={false}>Abrir painel</Link> : (
        <form className="acesso-form" action={aceitarConvite}>
          <label>Código do convite
            <input name="codigo" maxLength={64} autoComplete="off" spellCheck={false} required />
          </label>
          <button className="botao" type="submit">Aceitar convite</button>
        </form>
      )}
      <Link href="/conta" className="acesso-link" prefetch={false}>Minha conta</Link>
    </TelaAcesso>
  );
}
