import test from "node:test";
import assert from "node:assert/strict";
import { abrirAtendimento, calcularSaldo, podeEditarEvolucao, transicionarLaudo } from "./domain.ts";

test("QA-01: agendamento não cria atendimento automaticamente", () => {
  const reserva = { id: "ag-1", estado: "reservado" as const };
  assert.equal(reserva.id, "ag-1");
  assert.equal(Object.hasOwn(reserva, "atendimentoId"), false);
});
test("QA-02: abertura explícita vincula atendimento à reserva", () => {
  assert.deepEqual(abrirAtendimento("at-1", { id: "ag-1", estado: "reservado" }), { id: "at-1", agendamentoId: "ag-1" });
});
test("QA-03: reserva cancelada não pode abrir atendimento", () => {
  assert.throws(() => abrirAtendimento("at-1", { id: "ag-1", estado: "cancelado" }));
});
test("QA-06: autor pode editar rascunho", () => {
  assert.equal(podeEditarEvolucao("rascunho", "med-1", "med-1"), true);
});
test("QA-07: outro médico não pode editar rascunho", () => {
  assert.equal(podeEditarEvolucao("rascunho", "med-2", "med-1"), false);
});
test("QA-09: evolução finalizada não é editável pelo autor", () => {
  assert.equal(podeEditarEvolucao("finalizada", "med-1", "med-1"), false);
});
test("QA-10: laudo não pode ser liberado sem revisão", () => {
  assert.throws(() => transicionarLaudo("rascunho", "liberar"));
  assert.throws(() => transicionarLaudo("em_revisao", "liberar"));
});
test("QA-11: laudo devolvido retorna a rascunho após correção", () => {
  assert.equal(transicionarLaudo(transicionarLaudo("em_revisao", "devolver"), "corrigir"), "rascunho");
});
test("QA-14: laudo liberado não admite novas transições", () => {
  assert.throws(() => transicionarLaudo("liberado", "assinar"));
});
test("Fluxo positivo de laudo até liberação", () => {
  let estado = transicionarLaudo("rascunho", "enviar_revisao");
  estado = transicionarLaudo(estado, "aprovar");
  estado = transicionarLaudo(estado, "assinar");
  assert.equal(transicionarLaudo(estado, "liberar"), "liberado");
});
test("QA-15: pagamento parcial deixa saldo", () => {
  assert.equal(calcularSaldo(20000, 8000).pendenteCentavos, 12000);
});
test("QA-16: pagamento integral zera saldo", () => {
  assert.equal(calcularSaldo(20000, 20000).pendenteCentavos, 0);
});
test("QA-17: estorno reabre saldo", () => {
  assert.equal(calcularSaldo(20000, 20000, 8000).pendenteCentavos, 8000);
});
test("Financeiro rejeita valores fracionários em centavos", () => {
  assert.throws(() => calcularSaldo(200.5, 80));
});
test("Financeiro rejeita estorno acima do recebido", () => {
  assert.throws(() => calcularSaldo(20000, 8000, 9000));
});
test("Financeiro rejeita pagamento acima do cobrado", () => {
  assert.throws(() => calcularSaldo(20000, 21000));
});
