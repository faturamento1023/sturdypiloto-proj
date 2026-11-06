// DEV-016: validação de entrada para cadastro médico em ambiente de homologação.
// Não substitui consulta oficial ao conselho nem autoriza assinatura digital.
const UFS = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));
const texto = (value, max) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max + 1) : '';
const somenteDigitos = (value) => typeof value === 'string' ? value.replace(/\D/g, '') : '';
export function validarCadastroMedico(input) {
  const erros = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, erros: { corpo: 'Objeto inválido' } };
  const nome = texto(input.nome, 160);
  const uf = texto(input.ufConselho, 2).toUpperCase();
  const crm = somenteDigitos(input.numeroConselho);
  const especialidade = texto(input.especialidade ?? '', 120);
  const titulo = texto(input.titulo ?? '', 120);
  if (nome.length < 3 || nome.length > 160) erros.nome = 'Informe o nome completo (3 a 160 caracteres)';
  if (!UFS.has(uf)) erros.ufConselho = 'UF inválida';
  if (typeof input.numeroConselho !== 'string' || !/^\d{1,10}$/.test(crm) || !/^[\d.\-/\s]+$/.test(input.numeroConselho)) erros.numeroConselho = 'Número do conselho inválido';
  if (especialidade.length > 120) erros.especialidade = 'Máximo de 120 caracteres';
  if (titulo.length > 120) erros.titulo = 'Máximo de 120 caracteres';
  if (typeof input.ativo !== 'boolean') erros.ativo = 'Informe um estado booleano';
  // Não aceitar PFX, senha, assinatura ou dados de autenticação no cadastro básico.
  for (const key of ['certificado', 'pfx', 'senha', 'assinatura', 'privateKey', 'usuarioId', 'unidadeId']) {
    if (Object.hasOwn(input, key)) erros[key] = 'Campo não permitido nesta operação';
  }
  return Object.keys(erros).length ? { ok: false, erros } : {
    ok: true, valor: { nome, ufConselho: uf, numeroConselho: crm, especialidade, titulo, ativo: input.ativo }
  };
}
