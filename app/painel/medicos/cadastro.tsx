import Link from 'next/link';
import { UFS } from '../../../src/cadastros/validar-cadastro-medico.mjs';
import type { sessaoNoServidor } from '../../auth/sessao';
import { salvarMedico } from './acoes';

type Medico = {
  id: string;
  nome: string;
  crm: string | null;
  crm_uf: string | null;
  especialidade: string;
  titulo: string;
  ativo: boolean;
  revisao: number;
};

function Formulario({ unidade, medico }: { unidade: string; medico?: Medico }) {
  const acao = salvarMedico.bind(null, unidade, medico?.id ?? null, medico?.revisao ?? null);
  const crmObrigatorio = !medico || Boolean(medico.crm);

  return (
    <form className="acesso-form painel-form-medico" action={acao}>
      <label>Nome completo<input name="nome" defaultValue={medico?.nome} minLength={3} maxLength={160} required /></label>
      <div className="painel-campos-medico">
        <label>CRM<input name="crm" defaultValue={medico?.crm ?? ''} inputMode="numeric" maxLength={18} required={crmObrigatorio} /></label>
        <label>UF do CRM
          <select name="uf" defaultValue={medico?.crm_uf ?? ''} required={crmObrigatorio}>
            <option value="">Selecione</option>
            {UFS.map(uf => <option key={uf}>{uf}</option>)}
          </select>
        </label>
      </div>
      <label>Especialidade<input name="especialidade" defaultValue={medico?.especialidade} maxLength={120} /></label>
      <label>Título<input name="titulo" defaultValue={medico?.titulo} maxLength={120} /></label>
      <label className="painel-ativo-medico"><input type="checkbox" name="ativo" defaultChecked={medico?.ativo ?? true} /> Cadastro ativo</label>
      <button className="botao" type="submit">{medico ? 'Salvar alterações' : 'Cadastrar médico'}</button>
    </form>
  );
}

const mensagens: Record<string, string> = {
  salvo: 'Cadastro salvo.',
  invalido: 'Confira o nome, o CRM e a UF e tente novamente.',
  duplicado: 'Este CRM e UF já estão cadastrados nesta unidade.',
  desatualizado: 'O cadastro mudou desde a abertura. Confira os dados e tente novamente.',
  indisponivel: 'O cadastro está temporariamente indisponível.',
};

export async function CadastroMedicos({ cliente, unidade, filtro, pagina, estado }: {
  cliente: NonNullable<Awaited<ReturnType<typeof sessaoNoServidor>>>;
  unidade: string;
  filtro: string;
  pagina: number;
  estado: string;
}) {
  const { data, error } = await cliente.rpc('piloto_listar_medicos', {
    unidade, busca: filtro, pagina, correlacao: crypto.randomUUID(),
  });
  if (error || !Array.isArray(data)) return <div className="painel-aviso" role="alert">{mensagens.indisponivel}</div>;

  const medicos: Medico[] = data.slice(0, 20);
  const linkPagina = (indice: number) => '/painel?' + new URLSearchParams({
    unidade, modulo: 'medicos', filtroMedico: filtro, pagina: String(indice),
  }).toString();

  return (
    <section className="painel-modulos" aria-label="Gerenciar médicos">
      {Object.hasOwn(mensagens, estado) && <p className="acesso-aviso" role="status">{mensagens[estado]}</p>}
      <details className="painel-aviso">
        <summary>Novo médico</summary>
        <Formulario unidade={unidade} />
      </details>
      <form action="/painel" method="get" role="search" aria-label="Buscar médicos" className="painel-filtro-medico">
        <input type="hidden" name="unidade" value={unidade} />
        <input type="hidden" name="modulo" value="medicos" />
        <input type="search" name="filtroMedico" aria-label="Nome, CRM ou especialidade" placeholder="Nome, CRM ou especialidade"
          defaultValue={filtro} key={filtro} maxLength={80} />
        <button type="submit" className="botao">Filtrar</button>
      </form>
      <h2>Médicos da unidade</h2>
      {medicos.length === 0 && <p>Nenhum médico encontrado.</p>}
      <ul className="painel-lista-medicos">
        {medicos.map(medico => (
          <li key={medico.id}>
            <details className="painel-aviso" key={medico.revisao}>
              <summary>
                <strong>{medico.nome}</strong>
                <span>{medico.crm ? 'CRM ' + medico.crm_uf + ' ' + medico.crm : 'CRM pendente'} · {medico.ativo ? 'Ativo' : 'Inativo'}</span>
                <span>{medico.especialidade}</span>
              </summary>
              <Formulario unidade={unidade} medico={medico} />
            </details>
          </li>
        ))}
      </ul>
      {(pagina > 0 || data.length > 20) && (
        <nav aria-label="Páginas de médicos" className="painel-paginas-medicos">
          {pagina > 0 && <Link href={linkPagina(pagina - 1)} prefetch={false}>Página anterior</Link>}
          {data.length > 20 && <Link href={linkPagina(pagina + 1)} prefetch={false}>Próxima página</Link>}
        </nav>
      )}
    </section>
  );
}
