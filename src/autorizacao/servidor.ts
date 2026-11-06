/** Adaptador server-side DEV-013: sem HTTP, Supabase ou dados de produção.
 * A fonte é injetada; NÃO confiar em identidade, unidade ou vínculos do cliente.
 * Uma chamada nova a cada requisição impede cache de vínculos revogados.
 */
import {avaliarAutorizacao, perfisDaOperacao, type Acao, type Identidade, type Objeto, type Pedido, type Recurso, type Resultado, type Vinculo} from './politica.ts';

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
    if (perfisDaOperacao(req.recurso, req.acao).length === 0) return negar(403, 'permissao_negada');
    const unidadeAtiva = await fonte.unidadeAtiva(req.unidadeId);
    if (!unidadeAtiva) return negar(403, 'unidade_invalida');
    const vinculos = await fonte.vinculosAtuais(identidade.usuarioId, req.unidadeId);
    const pedido: Pedido = { identidade, unidadeId: req.unidadeId, unidadeAtiva, vinculos, recurso: req.recurso, acao: req.acao };
    const previa = avaliarAutorizacao(pedido);
    // O 404 preliminar indica que a operação médica requer um objeto atribuído.
    if (req.objetoId === undefined || (!previa.autorizado && previa.status !== 404)) return previa;
    if (typeof req.objetoId !== 'string' || !req.objetoId.trim()) return negar(404, 'objeto_nao_encontrado');

    const objeto = await fonte.objetoNaUnidade(req.recurso, req.objetoId, req.unidadeId);
    if (!objeto || objeto.unidadeId !== req.unidadeId) return negar(404, 'objeto_nao_encontrado');
    return avaliarAutorizacao({ ...pedido, objeto });
  } catch {
    // Erros do banco/IdP nunca se tornam autorização nem expõem detalhes internos.
    return negar(403,'verificacao_indisponivel');
  }
}
