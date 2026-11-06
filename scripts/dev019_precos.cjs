'use strict';
// DEV-019: regras puras de fronteira, sem contratos ou dados de pacientes.
function assertDate(value) {
  if (typeof value !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) throw new TypeError('data invalida');
  const date = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new TypeError('data invalida');
  return value;
}
function validatePriceCents(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 2147483647) throw new TypeError('valor_centavos invalido');
  return value;
}
function overlaps(a, b) {
  const startA = assertDate(a.start), startB = assertDate(b.start);
  const endA = a.end == null ? null : assertDate(a.end);
  const endB = b.end == null ? null : assertDate(b.end);
  if ((endA && endA <= startA) || (endB && endB <= startB)) throw new RangeError('vigencia vazia');
  return (!endA || startB < endA) && (!endB || startA < endB);
}
function selectPrice(rows, {unitId, procedureId, agreementId, date}) {
  assertDate(date);
  const candidates = rows.filter(r => r.unitId === unitId && r.procedureId === procedureId && r.agreementId === agreementId && r.active === true && r.start <= date && (r.end == null || date < r.end));
  if (candidates.length !== 1) return null; // missing or ambiguous: never guess
  validatePriceCents(candidates[0].cents);
  return candidates[0];
}
module.exports = {assertDate, validatePriceCents, overlaps, selectPrice};
