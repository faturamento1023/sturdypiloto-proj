import { perfisDaOperacao, type Perfil, type Recurso } from '../autorizacao/politica';

export const rotuloPerfil: Record<Perfil, string> = {
  recepcao: 'Recepção',
  medico: 'Médico',
  financeiro: 'Financeiro',
  gestao: 'Gestão',
  administrador: 'Administrador',
};

type Modulo = {
  id: string;
  nome: string;
  descricao: string;
  recurso: Recurso;
  termos: string;
};

const modulos: readonly Modulo[] = [
  { id: 'agenda', nome: 'Agenda', descricao: 'Horários, reservas e remarcações.', recurso: 'agenda', termos: 'agendamento calendário' },
  { id: 'pacientes', nome: 'Pacientes', descricao: 'Cadastro e identificação para o atendimento.', recurso: 'paciente', termos: 'cadastro recepção' },
  { id: 'atendimentos', nome: 'Atendimentos', descricao: 'Abertura, acompanhamento e itens do atendimento.', recurso: 'atendimento', termos: 'consulta recepção' },
  { id: 'prontuario', nome: 'Prontuário e laudos', descricao: 'Evolução clínica e documentos do atendimento.', recurso: 'clinico', termos: 'médico exame evolução' },
  { id: 'catalogo', nome: 'Catálogo', descricao: 'Procedimentos disponíveis na unidade.', recurso: 'catalogo', termos: 'procedimento exame' },
  { id: 'medicos', nome: 'Cadastro de médicos', descricao: 'CRM, especialidades e situação dos profissionais.', recurso: 'cadastroMedico', termos: 'cadastro médico crm especialidade' },
  { id: 'financeiro', nome: 'Financeiro', descricao: 'Saldos e movimentações dos atendimentos.', recurso: 'financeiro', termos: 'caixa pagamento faturamento' },
];

export function modulosPorPerfil(perfis: readonly Perfil[]) {
  return modulos.filter(modulo => perfisDaOperacao(modulo.recurso, 'ler').some(perfil => perfis.includes(perfil)));
}

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR').trim();
}

export function buscarModulos(disponiveis: readonly Modulo[], termo: string) {
  const palavras = normalizar(termo).split(/\s+/);
  return disponiveis.filter(({ nome, descricao, termos }) => {
    const indice = normalizar([nome, descricao, termos].join(' '));
    return palavras.every(palavra => indice.includes(palavra));
  });
}
