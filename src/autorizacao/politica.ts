/** DEV-013: política pura e conservadora; NÃO é middleware de produção.
 * O chamador deve obter identidade e vínculos atuais do servidor, nunca do cliente.
 * Nenhum objeto clínico ou financeiro é retornado por esta função.
 */
export const PERFIS = ['recepcao','medico','financeiro','gestao','administrador'] as const;
export type Perfil = typeof PERFIS[number];
export type Recurso = 'agenda'|'paciente'|'atendimento'|'item'|'itemClinico'|'catalogo'|'preco'|'clinico'|'financeiro'|'recebimento'|'vinculo'|'auditoria'|'cadastroMedico'|'cadastroUsuario';
export type Acao = 'ler'|'criar'|'alterar'|'receber'|'estornar';
export type Vinculo = { usuarioId: string; unidadeId: string; perfil: Perfil; ativo: boolean };
export type Identidade = { usuarioId: string; aal: 'aal1'|'aal2' };
export type Objeto = { unidadeId: string; profissionalUsuarioId?: string };
export type Pedido = { identidade: Identidade|null; unidadeId: string; unidadeAtiva: boolean; vinculos: readonly Vinculo[]; recurso: Recurso; acao: Acao; objeto?: Objeto };
export type Resultado = { autorizado: boolean; status: 200|401|403|404; motivo: string };

const regra: Readonly<Record<Recurso, Partial<Record<Acao, readonly Perfil[]>>>> = {
  agenda: {ler:['recepcao','medico','gestao','administrador'],criar:['recepcao','gestao'],alterar:['recepcao','gestao']},
  paciente: {ler:['recepcao','medico'],criar:['recepcao']},
  atendimento: {ler:['recepcao','medico','financeiro','gestao','administrador'],criar:['recepcao','gestao']},
  item: {ler:['recepcao','financeiro','gestao','administrador'],criar:['recepcao','gestao']},
  itemClinico: {ler:['medico']},
  catalogo: {ler:PERFIS,criar:['gestao','administrador'],alterar:['gestao','administrador']},
  preco: {ler:['recepcao','financeiro','gestao','administrador'],criar:['gestao','administrador'],alterar:['gestao','administrador']},
  clinico: {ler:['medico'],criar:['medico'],alterar:['medico']},
  financeiro: {ler:['financeiro','gestao','administrador']},
  cadastroMedico: {ler:['gestao','administrador'],criar:['gestao','administrador'],alterar:['gestao','administrador']},
  cadastroUsuario: {ler:['administrador'],criar:['administrador'],alterar:['administrador']},
  recebimento: {}, vinculo: {}, auditoria: {},
};
const MEDICO_ESCOPO: readonly Recurso[] = ['agenda','paciente','atendimento','itemClinico','clinico'];
export function perfisDaOperacao(recurso: Recurso, acao: Acao): readonly Perfil[] {
  if (!Object.hasOwn(regra, recurso)) return [];
  const acoes = regra[recurso];
  return Object.hasOwn(acoes, acao) ? acoes[acao] ?? [] : [];
}

export function avaliarAutorizacao(p: Pedido): Resultado {
  const deny = (status: 401|403|404, motivo: string): Resultado => ({autorizado:false,status,motivo});
  if (!p.identidade?.usuarioId) return deny(401,'sessao_ausente');
  if (p.identidade.aal !== 'aal2') return deny(403,'mfa_pendente');
  if (!p.unidadeId || !p.unidadeAtiva) return deny(403,'unidade_invalida');
  // Falhar fechado também diante de respostas inesperadas do adaptador de dados.
  if (!Array.isArray(p.vinculos)) return deny(403,'vinculos_invalidos');
  const perfis = new Set(p.vinculos.filter(v => v && typeof v === 'object' && v.ativo === true && v.usuarioId === p.identidade!.usuarioId && v.unidadeId === p.unidadeId && PERFIS.includes(v.perfil)).map(v => v.perfil));
  if (perfis.size === 0) return deny(403,'sem_vinculo_ativo');
  if (p.objeto && p.objeto.unidadeId !== p.unidadeId) return deny(404,'objeto_nao_encontrado');
  const permitidos = perfisDaOperacao(p.recurso, p.acao);
  const validos = [...perfis].filter(perfil => permitidos.includes(perfil));
  if (validos.length === 0) return deny(403,'permissao_negada');
  // Sem atribuição comprovada, o médico não herda acesso clínico nem acesso a dados de outro médico.
  if (MEDICO_ESCOPO.includes(p.recurso) && validos.length === 1 && validos[0] === 'medico') {
    if (!p.objeto || !p.objeto.profissionalUsuarioId || p.objeto.profissionalUsuarioId !== p.identidade.usuarioId)
      return deny(404,'objeto_nao_encontrado');
  }
  if (p.recurso === 'clinico' && (!p.objeto || p.objeto.profissionalUsuarioId !== p.identidade.usuarioId))
    return deny(404,'objeto_nao_encontrado');
  return {autorizado:true,status:200,motivo:'permitido'};
}
