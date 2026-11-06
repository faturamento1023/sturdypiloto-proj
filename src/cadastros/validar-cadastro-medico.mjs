export const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
const campos = new Set(['nome', 'ufConselho', 'numeroConselho', 'especialidade', 'titulo', 'ativo']);
const texto = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

export function validarCadastroMedico(input, { permitirSemCrm = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, erros: { corpo: 'Objeto inválido' } };
  }

  const erros = {};
  const nome = texto(input.nome);
  const uf = texto(input.ufConselho).toUpperCase();
  const numero = texto(input.numeroConselho);
  const crm = numero.replace(/\D/g, '');
  const especialidade = texto(input.especialidade);
  const titulo = texto(input.titulo);

  if (nome.length < 3 || nome.length > 160) erros.nome = 'Informe o nome completo (3 a 160 caracteres)';
  if (!permitirSemCrm || uf || numero) {
    if (!UFS.includes(uf)) erros.ufConselho = 'UF inválida';
    if (!/^\d+(?:[ ./-]\d+)*$/.test(numero) || crm.length > 10 || !/[1-9]/.test(crm)) {
      erros.numeroConselho = 'Número do conselho inválido';
    }
  }
  for (const [campo, valor] of [['especialidade', especialidade], ['titulo', titulo]]) {
    if ((input[campo] != null && typeof input[campo] !== 'string') || valor.length > 120) {
      erros[campo] = 'Informe um texto de até 120 caracteres';
    }
  }
  if (typeof input.ativo !== 'boolean') erros.ativo = 'Informe um estado booleano';
  if (Object.keys(input).some(campo => !campos.has(campo))) erros.corpo = 'Campo não permitido nesta operação';

  if (Object.keys(erros).length) return { ok: false, erros };
  return { ok: true, valor: { nome, ufConselho: uf, numeroConselho: crm, especialidade, titulo, ativo: input.ativo } };
}
