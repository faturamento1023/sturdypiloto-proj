// Validacao estrutural dos wireflows do Projeto Piloto (DEV-006).
// Execute na raiz: node scripts/validate-ux.mjs
// Nao usa dados reais ou rede.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const inventory = JSON.parse(readFileSync('docs/DEV-004_TELAS.json', 'utf8'));
const ux = JSON.parse(readFileSync('docs/DEV-006_JORNADAS.json', 'utf8'));
const ids = new Set(inventory.screens.map((screen) => screen.id));
const expectedDomains = new Set(['administracao', 'recepcao', 'medico', 'laudos', 'financeiro']);
const evidence = new Set(['observado', 'documentado', 'proposto']);
const priorities = new Set(['MVP', 'V1', 'Futura']);
const journeyIds = new Set();
const stepIds = new Set();
let steps = 0;
let proposals = 0;

assert.equal(inventory.screens.length, 65, 'Inventario de 65 telas exigido');
assert.equal(new Set(inventory.screens.map((screen) => screen.id)).size, 65, 'IDs de tela duplicados');
assert.ok(ux.journeys.length >= 7, 'Ao menos sete jornadas para cobrir os perfis e dominios');

for (const journey of ux.journeys) {
  assert.ok(!journeyIds.has(journey.id), `Jornada duplicada: ${journey.id}`);
  journeyIds.add(journey.id);
  assert.ok(journey.title && journey.starts_at && journey.ends_at && journey.terminal_status,
    `Inicio, fim ou resultado ausente: ${journey.id}`);
  assert.ok(expectedDomains.has(journey.domain), `Dominio desconhecido: ${journey.domain}`);
  assert.ok(priorities.has(journey.priority), `Fase invalida: ${journey.id}`);
  assert.ok(journey.roles.length > 0 && journey.steps.length >= 5, `Jornada incompleta: ${journey.id}`);
  assert.ok(journey.variants.length > 0 && journey.critical_checks.length > 0,
    `Sem excecoes ou criterios: ${journey.id}`);
  for (const reference of journey.references) {
    assert.ok(ids.has(reference), `Tela inexistente: ${journey.id}/${reference}`);
  }
  for (const step of journey.steps) {
    const key = `${journey.id}/${step.id}`;
    assert.ok(!stepIds.has(key), `Etapa duplicada: ${key}`);
    stepIds.add(key);
    assert.ok(step.action && step.inputs && step.output && step.error, `Passo sem entrada/saida/erro: ${key}`);
    assert.ok(evidence.has(step.evidence), `Evidencia invalida: ${key}`);
    assert.ok(step.screen_refs.length > 0, `Sem tela vinculada: ${key}`);
    for (const reference of step.screen_refs) {
      assert.ok(ids.has(reference), `Tela inexistente: ${key}/${reference}`);
    }
    if (step.evidence === 'proposto') proposals++;
    steps++;
  }
}
const domains = new Set(ux.journeys.map((journey) => journey.domain));
for (const domain of expectedDomains) {
  assert.ok(domains.has(domain), `Dominio ausente: ${domain}`);
}
assert.ok(proposals > 0, 'As inferencias/propostas precisam permanecer identificadas');
assert.ok(ux.status?.includes('andamento'), 'DEV-006 nao deve ser fechada sem revisao dos perfis');

console.log(`OK: ${inventory.screens.length} telas, ${journeyIds.size} jornadas, ${steps} etapas, ${proposals} propostas identificadas e ${domains.size} dominios cobertos.`);
