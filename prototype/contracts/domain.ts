/** Projeto Piloto — contratos de estado para protótipo isolado.
 * Não integra sistema clínico, assinatura, pagamento ou banco de dados.
 * Regras de acesso devem ser reforçadas no servidor na implementação real.
 */
export type Papel = "recepcao" | "medico" | "gestao" | "administrador";
export type AgendamentoEstado = "reservado" | "remarcado" | "cancelado" | "realizado";
export type EvolucaoEstado = "rascunho" | "finalizada";
export type LaudoEstado = "rascunho" | "em_revisao" | "devolvido_para_correcao" | "aprovado_para_assinatura" | "assinado" | "liberado";
export type EventoLaudo = "enviar_revisao" | "devolver" | "aprovar" | "assinar" | "liberar" | "corrigir";

const laudoTransitions: Readonly<Record<LaudoEstado, Partial<Record<EventoLaudo, LaudoEstado>>>> = {
  rascunho: { enviar_revisao: "em_revisao" },
  em_revisao: { devolver: "devolvido_para_correcao", aprovar: "aprovado_para_assinatura" },
  devolvido_para_correcao: { corrigir: "rascunho" },
  aprovado_para_assinatura: { assinar: "assinado" },
  assinado: { liberar: "liberado" },
  liberado: {},
};

export function transicionarLaudo(estado: LaudoEstado, evento: EventoLaudo): LaudoEstado {
  const destino = laudoTransitions[estado][evento];
  if (!destino) throw new Error(`Transição de laudo inválida: ${estado} -> ${evento}`);
  return destino;
}

export function podeEditarEvolucao(estado: EvolucaoEstado, usuarioMedicoId: string, autorMedicoId: string): boolean {
  return estado === "rascunho" && usuarioMedicoId.length > 0 && usuarioMedicoId === autorMedicoId;
}

export interface SaldoFinanceiro { cobradoCentavos: number; recebidoCentavos: number; estornadoCentavos: number; descontoCentavos: number; pendenteCentavos: number }
function centavosValidos(n: number): boolean { return Number.isSafeInteger(n) && n >= 0; }
export function calcularSaldo(cobradoCentavos: number, recebidoCentavos: number, estornadoCentavos = 0, descontoCentavos = 0): SaldoFinanceiro {
  if (![cobradoCentavos, recebidoCentavos, estornadoCentavos, descontoCentavos].every(centavosValidos)) throw new Error("Valores devem ser inteiros não negativos em centavos");
  if (estornadoCentavos > recebidoCentavos) throw new Error("Estorno maior que recebimentos");
  const pendenteCentavos = cobradoCentavos - descontoCentavos - recebidoCentavos + estornadoCentavos;
  if (!Number.isSafeInteger(pendenteCentavos) || pendenteCentavos < 0) throw new Error("Saldo inválido; revisar cobrança, desconto e pagamentos");
  return { cobradoCentavos, recebidoCentavos, estornadoCentavos, descontoCentavos, pendenteCentavos };
}

export interface Agendamento { id: string; estado: AgendamentoEstado }
export interface Atendimento { id: string; agendamentoId: string | null }
export function abrirAtendimento(id: string, agendamento: Agendamento | null): Atendimento {
  if (!id.trim()) throw new Error("ID de atendimento obrigatório");
  if (agendamento && !["reservado", "remarcado"].includes(agendamento.estado)) throw new Error("Reserva indisponível para abertura");
  return { id, agendamentoId: agendamento?.id ?? null };
}


/** A checagem local é auxiliar: persistência deve garantir exclusão/concorrência atomicamente. */
export interface JanelaAgenda { profissionalId: string; inicioMinuto: number; fimMinuto: number; estado: AgendamentoEstado }
export function horariosConflitam(a: JanelaAgenda, b: JanelaAgenda): boolean {
  for (const item of [a, b]) {
    if (!item.profissionalId.trim() || !Number.isSafeInteger(item.inicioMinuto) || !Number.isSafeInteger(item.fimMinuto) || item.inicioMinuto < 0 || item.fimMinuto <= item.inicioMinuto) {
      throw new Error("Intervalo de agenda inválido");
    }
  }
  if (a.profissionalId !== b.profissionalId || a.estado === "cancelado" || b.estado === "cancelado") return false;
  return a.inicioMinuto < b.fimMinuto && b.inicioMinuto < a.fimMinuto;
}

export interface RevisaoEvolucao { versaoAtual: number; versaoEsperada: number; estado: EvolucaoEstado; autorMedicoId: string; usuarioMedicoId: string }
export function validarGravacaoEvolucao(dados: RevisaoEvolucao): number {
  if (!podeEditarEvolucao(dados.estado, dados.usuarioMedicoId, dados.autorMedicoId)) throw new Error("Sem autorização para editar evolução");
  if (!Number.isSafeInteger(dados.versaoAtual) || dados.versaoAtual < 0 || dados.versaoEsperada !== dados.versaoAtual) throw new Error("Conflito de versão da evolução");
  return dados.versaoAtual + 1;
}

export function autorizarDesconto(papel: Papel, valorCentavos: number): void {
  if (papel !== "gestao") throw new Error("Desconto exige aprovação de gestão");
  if (!centavosValidos(valorCentavos)) throw new Error("Desconto inválido");
}
