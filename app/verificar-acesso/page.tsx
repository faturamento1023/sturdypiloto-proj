import { redirect } from 'next/navigation';
import { sair } from '../auth/acoes';
import { TelaAcesso } from '../auth/interface';
import { sessaoNoServidor } from '../auth/sessao';
import { CodigoAutenticador, ConfigurarAutenticador } from './autenticador';

export const dynamic = 'force-dynamic';

export default async function PaginaVerificarAcesso() {
  const cliente = await sessaoNoServidor();
  if (!cliente) redirect('/entrar?estado=indisponivel');

  const { data: { user } } = await cliente.auth.getUser();
  if (!user || user.is_anonymous) redirect('/entrar');

  const verificados = user.factors?.filter(fator => fator.status === 'verified') ?? [];
  const autenticadores = verificados.filter(fator => fator.factor_type === 'totp').map((fator, indice) => ({
    id: fator.id, nome: fator.friendly_name || `Autenticador ${indice + 1}`,
  }));

  return (
    <TelaAcesso titulo="Verificar acesso" descricao="Use seu aplicativo autenticador para proteger a conta.">
      {autenticadores.length > 0 ? <CodigoAutenticador fatores={autenticadores} /> :
        verificados.length === 0 ? <ConfigurarAutenticador /> :
        <p className="acesso-aviso" role="status">O fator cadastrado precisa ser revisado pelo administrador do piloto.</p>}
      <form className="acesso-saida" action={sair}>
        <button className="botao" type="submit">Sair</button>
      </form>
    </TelaAcesso>
  );
}
