import { rotuloPerfil } from '../../../src/navegacao/modulos';
import type { Perfil } from '../../../src/autorizacao/politica';
import type { sessaoNoServidor } from '../../auth/sessao';
import { gerirUsuarios } from './acoes';
import { FormularioConvite, type OpcaoMedico } from './convite-form';

type Vinculo = { id: string; usuario_id: string; email: string | null; perfil: Perfil; ativo: boolean };
type Convite = { id: string; email: string; perfil: Perfil; expirado: boolean };

export async function CadastroUsuarios({ cliente, unidade, estado }: {
  cliente: NonNullable<Awaited<ReturnType<typeof sessaoNoServidor>>>;
  unidade: string;
  estado: string;
}) {
  const { data, error } = await cliente.rpc('piloto_listar_usuarios', { unidade, correlacao: crypto.randomUUID() });
  if (error || !Array.isArray(data?.vinculos) || !Array.isArray(data?.convites) || !Array.isArray(data?.medicos)) {
    return <div className="painel-aviso" role="alert">A gestão de usuários está indisponível.</div>;
  }
  const convites: Convite[] = data.convites;
  const medicos: OpcaoMedico[] = data.medicos;
  const porUsuario = new Map<string, Vinculo[]>();
  for (const vinculo of data.vinculos as Vinculo[]) {
    const anteriores = porUsuario.get(vinculo.usuario_id) ?? [];
    anteriores.push(vinculo);
    porUsuario.set(vinculo.usuario_id, anteriores);
  }

  return (
    <section className="painel-modulos" aria-label="Gerenciar usuários">
      {estado === 'salvo' && <p className="acesso-aviso" role="status">Alteração registrada.</p>}
      {estado === 'indisponivel' && <p className="acesso-aviso" role="status">Não foi possível alterar esse acesso.</p>}
      <details className="painel-aviso">
        <summary>Convidar usuário</summary>
        <FormularioConvite unidade={unidade} medicos={medicos} />
      </details>
      <h2>Convites pendentes</h2>
      {convites.length === 0 && <p>Nenhum convite pendente.</p>}
      <ul className="painel-lista-medicos">
        {convites.map(convite => (
          <li key={convite.id} className="painel-aviso painel-acesso-usuario">
            <span>{convite.email} · {rotuloPerfil[convite.perfil]} · {convite.expirado ? 'Expirado' : 'Pendente'}</span>
            <form action={gerirUsuarios.bind(null, unidade, 'cancelar', convite.id, null)}>
              <button type="submit" className="botao">Cancelar convite</button>
            </form>
          </li>
        ))}
      </ul>
      <h2>Usuários vinculados</h2>
      <ul className="painel-lista-medicos">
        {[...porUsuario].map(([usuario, vinculos]) => {
          const admin = vinculos.some(vinculo => vinculo.ativo && vinculo.perfil === 'administrador');
          return (
            <li key={usuario} className="painel-aviso">
              <strong className="acesso-identidade">{vinculos[0].email ?? 'Conta sem e-mail'}</strong>
              <ul className="painel-lista-perfis">
                {vinculos.map(vinculo => (
                  <li key={vinculo.id} className="painel-acesso-usuario">
                    <span>{rotuloPerfil[vinculo.perfil]} · {vinculo.ativo ? 'Ativo' : 'Inativo'}</span>
                    {vinculo.perfil !== 'administrador' && (
                      <form action={gerirUsuarios.bind(null, unidade, 'perfil', vinculo.id, !vinculo.ativo)}>
                        <button type="submit" className="botao">{vinculo.ativo ? 'Inativar perfil' : 'Reativar perfil'}</button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
              {!admin && vinculos.some(vinculo => vinculo.ativo) && (
                <form action={gerirUsuarios.bind(null, unidade, 'bloquear', vinculos[0].id, null)}>
                  <button type="submit" className="botao">Bloquear na unidade</button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
