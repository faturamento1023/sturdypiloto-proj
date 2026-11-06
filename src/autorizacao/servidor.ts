/** Adaptador server-side DEV-013: sem HTTP, Supabase ou dados de produção.
 * A fonte é injetada; NÃO confiar em identidade, unidade ou vínculos do cliente.
 * Uma chamada nova a cada requisição impede cache de vínculos revogados.
 */
import {avaliarAutorizacao, type Acao, type Identidade, type Objeto, type Pedido, type Recurso, type Resultado, type Vinculo} from './politica.ts';

export interface FonteAutorizacao {
  sessaoAtual(): Promise<Identidade | null>;
  unidadeAtiva(unidadeId: string): Promise<boolean>;
  vinculosAtuais(usuarioId: string, unidadeId: string): Promise<readonly Vinculo[]>;
  objetoNaUnidade(recurso: Recurso, objetoId: string, unidadeId: string): Promise<Objeto | null>;
}
export type Solicitacao = { unidadeId: string; recurso: Recurso; acao: Acao; objetoId?: string };
export type Decisao = Resultado & { identidade?: never; vinculos?: never; objeto?: never };

export async function autorizarNoServidor(fonte: FonteAutorizacao, req: Solicitacao): Promise<Decisao> {
  const negar = (status: 401|403|404, motivo: string): Decisao => ({autorizado:false,status,motivo});
  try {
    // Identidade sempre resolvida no servidor; nunca aceitar usuarioId do request.
    const identidade = await fonte.sessaoAtual();
    if (!identidade?.usuarioId) return negar(401,'sessao_ausente');
    if (identidade.aal !== 'aal2') return negar(403,'mfa_pendente');
    if (typeof req.unidadeId !== 'string' || !req.unidadeId.trim()) return negar(403,'unidade_invalida');
    // Entradas HTTP não são garantidas pelos tipos TypeScript; negar antes de consultar objetos.
    const recursos = ['agenda','paciente','atendimento','item','catalogo','preco','clinico','financeiro','recebimento','vinculo','auditoria'];
    const acoes = ['ler','criar','alterar','receber','estornar'];
    if (!recursos.includes(req.recurso) || !acoes.includes(req.acao)) return negar(403,'permissao_negada');
    const ativa = await fonte.unidadeAtiva(req.unidadeId);
    if (!ativa) return negar(403,'unidade_invalida');
    const vinculos = await fonte.vinculosAtuais(identidade.usuarioId,req.unidadeId);
    // Sem objeto: não conceder acesso médico a registros individuais sem atribuição.
    let objeto: Objeto | undefined;
    if (req.objetoId !== undefined) {
      if (typeof req.objetoId !== 'string' || !req.objetoId.trim()) return negar(404,'objeto_nao_encontrado');
      const encontrado = await fonte.objetoNaUnidade(req.recurso,req.objetoId,req.unidadeId);
      if (!encontrado || encontrado.unidadeId !== req.unidadeId) return negar(404,'objeto_nao_encontrado');
      objeto = encontrado;
    }
    const pedido: Pedido = {identidade,unidadeId:req.unidadeId,unidadeAtiva:ativa,vinculos,recurso:req.recurso,acao:req.acao,objeto};
    return avaliarAutorizacao(pedido);
  } catch {
    // Erros do banco/IdP nunca se tornam autorização nem expõem detalhes internos.
    return negar(403,'verificacao_indisponivel');
  }
}
