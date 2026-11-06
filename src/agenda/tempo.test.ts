import assert from 'node:assert/strict';
import test from 'node:test';
import { dataAgenda, dataValida, deslocarDia, janelaDoDia, janelaValida } from './tempo.ts';

test('dia da grade usa São Paulo mesmo quando o servidor já está no dia seguinte', () => {
  assert.equal(dataAgenda(new Date('2030-11-07T01:00:00Z')), '2030-11-06');
  assert.deepEqual(janelaDoDia('2030-11-06'), { inicio: '2030-11-06T03:00:00.000Z', fim: '2030-11-07T03:00:00.000Z' });
  assert.deepEqual(janelaDoDia('2018-11-04'), { inicio: '2018-11-04T03:00:00.000Z', fim: '2018-11-05T02:00:00.000Z' });
});

test('aceita dias reais e janelas de até 31 dias com fuso explícito', () => {
  assert.ok(dataValida('2028-02-29'));
  assert.equal(deslocarDia('2028-02-29', 1), '2028-03-01');
  assert.equal(dataValida('2030-02-29'), false);
  assert.equal(janelaValida('2030-01-01T00:00:00-03:00', '2030-02-01T00:00:00-03:00'), true);
  assert.equal(janelaValida('2030-01-01T00:00:00-03:00', '2030-02-01T00:00:01-03:00'), false);
  assert.equal(janelaValida('2030-02-30T00:00:00Z', '2030-03-05T00:00:00Z'), false);
  assert.equal(janelaValida('2030-01-01T00:00:00', '2030-02-01T00:00:00Z'), false);
});
