import type { sessaoNoServidor } from '../../auth/sessao';

export const uuidAgenda = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export const rotulosAgenda = {
  reservado: 'Reservado',
  confirmado: 'Confirmado',
  remarcado: 'Remarcado',
  realizado: 'Realizado',
  cancelado: 'Cancelado',
};

type Intervalo = { profissional_id: string; inicio: string; fim: string };
type HorarioLivre = Intervalo & { local_nome?: string };
type Aviso = { tipo: 'feriado' | 'bloqueio' | 'substituicao'; inicio: string; fim: string;
  profissional_id?: string; descricao?: string };
type Agendamento = Intervalo & { id: string; estado: keyof typeof rotulosAgenda };
type Profissional = { id: string; nome: string; ativo: boolean };
type Grade = {
  profissionais: Profissional[];
  agendamentos: Agendamento[];
  livres: HorarioLivre[];
  avisos?: Aviso[];
};

export async function lerGradeAgenda(
  cliente: NonNullable<Awaited<ReturnType<typeof sessaoNoServidor>>>,
  unidade: string, profissional: string | null, inicio: string, fim: string, correlacao: string,
): Promise<{ status: 200; grade: Grade } | { status: 422; profissionais: Profissional[] } | { status: 403 | 503 }> {
  const { data, error } = await cliente.rpc('piloto_ler_grade_agenda', { unidade, profissional, de: inicio, ate: fim, correlacao });
  if (error) return { status: 503 };
  if (data === null) return { status: 403 };
  if (!Array.isArray(data?.profissionais)) return { status: 503 };
  const profissionais = data.profissionais.map(({ id, nome, ativo }: Profissional) => ({ id, nome, ativo }));
  if (data.excedida === true) return { status: 422, profissionais };
  if (!Array.isArray(data.agendamentos) || !Array.isArray(data.livres)) return { status: 503 };

  // Projeção explícita no servidor para não repassar novos campos adicionados ao RPC.
  return {
    status: 200,
    grade: {
      profissionais,
      ...(Array.isArray(data.avisos) && data.avisos.length > 0 && {
        avisos: data.avisos.map(({ tipo, inicio, fim, profissional_id, descricao }: Aviso) =>
          ({ tipo, inicio, fim, ...(profissional_id && { profissional_id }), ...(descricao && { descricao }) })),
      }),
      agendamentos: data.agendamentos.map(({ id, profissional_id, inicio, fim, estado }: Agendamento) =>
        ({ id, profissional_id, inicio, fim, estado })),
      livres: data.livres.map(({ profissional_id, inicio, fim, local_nome }: HorarioLivre) =>
        ({ profissional_id, inicio, fim, ...(typeof local_nome === 'string' && { local_nome }) })),
    },
  };
}
