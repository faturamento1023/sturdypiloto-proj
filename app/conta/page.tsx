import { redirect } from 'next/navigation';
import { sair } from '../auth/acoes';
import { avisoAcesso, TelaAcesso, type PaginaAcesso } from '../auth/interface';
import { sessaoNoServidor } from '../auth/sessao';

export const dynamic = 'force-dynamic';

export default async function PaginaConta({ searchParams }: PaginaAcesso) {
  const cliente = await sessaoNoServidor();
  if (!cliente) redirect('/entrar?estado=indisponivel');

  const { data, error } = await cliente.auth.getUser();
  if (error || !data.user || data.user.is_anonymous) redirect('/entrar');

  const { data: identidade } = await cliente.auth.getClaims();
  const temAutenticador = data.user.factors?.some(fator => fator.status === 'verified' && fator.factor_type === 'totp');
  if (!temAutenticador || identidade?.claims.sub !== data.user.id || identidade.claims.aal !== 'aal2') {
    redirect('/verificar-acesso');
  }

  const { estado } = await searchParams;
  const aviso = avisoAcesso(estado, { saida: 'Não foi possível encerrar a sessão. Tente novamente.' });

  return (
    <TelaAcesso titulo="Minha conta" descricao="Sua sessão está ativa no Projeto Piloto." aviso={aviso}>
      <p className="acesso-identidade">{data.user.email}</p>
      <form action={sair}>
        <button className="botao" type="submit">Sair</button>
      </form>
    </TelaAcesso>
  );
}
