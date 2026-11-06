import Link from 'next/link';
import { redirect } from 'next/navigation';
import { sair } from '../auth/acoes';
import { avisoAcesso, TelaAcesso, type PaginaAcesso } from '../auth/interface';
import { sessaoNoServidor, verificarIdentidade } from '../auth/sessao';

export const dynamic = 'force-dynamic';

export default async function PaginaConta({ searchParams }: PaginaAcesso) {
  const cliente = await sessaoNoServidor();
  if (!cliente) redirect('/entrar?estado=indisponivel');

  const sessao = await verificarIdentidade(cliente);
  if (!sessao) redirect('/entrar');
  if (sessao.aal !== 'aal2') redirect('/verificar-acesso');

  const { estado } = await searchParams;
  const aviso = avisoAcesso(estado, { saida: 'Não foi possível encerrar a sessão. Tente novamente.' });

  return (
    <TelaAcesso titulo="Minha conta" descricao="Sua sessão está ativa no Projeto Piloto." aviso={aviso}>
      <p className="acesso-identidade">{sessao.usuario.email}</p>
      <div className="acoes-inicio">
        <Link href="/painel" className="botao" prefetch={false}>Abrir painel</Link>
        <form action={sair}>
          <button className="acesso-link acesso-link-botao" type="submit">Sair</button>
        </form>
      </div>
    </TelaAcesso>
  );
}
