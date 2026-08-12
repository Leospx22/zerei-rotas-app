import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildZRExplanations,
  formatDistance,
  formatFuelCurrency,
  formatMinutes,
  getZRScoreBand,
} from '../components/route-ai/zrPresentation.ts';

test('ZR score bands map score values to premium labels', () => {
  assert.equal(getZRScoreBand(91), 'Excellent');
  assert.equal(getZRScoreBand(75), 'Good');
  assert.equal(getZRScoreBand(55), 'Fair');
  assert.equal(getZRScoreBand(40), 'Poor');
});

test('ZR explanations are derived from route score factors', () => {
  const explanations = buildZRExplanations([
    { label: 'Cluster quality', impact: 16, message: 'Excellent clustering.' },
    { label: 'Route continuity', impact: 0, message: '0 sinais de retorno ou zigue-zague detectados.' },
    { label: 'Street revisits', impact: 0, message: '0 retornos para ruas ja visitadas.' },
    { label: 'Neighborhood returns', impact: -4, message: '1 retornos para bairros ja visitados.' },
    { label: 'Average stop spacing', impact: 0, message: 'Espacamento medio de 1.2 km por trecho.' },
  ]);

  assert.deepEqual(
    explanations.map(item => item.label),
    [
      'Better clustering',
      'Improved stop continuity',
      'Fewer street revisits',
      'Fewer neighborhood returns',
    ]
  );
  assert.equal(explanations[0].detail, 'Excellent clustering.');
});

test('ZR presentation formatters keep route AI metrics display-ready', () => {
  assert.equal(formatDistance(8.44), '8.4 km');
  assert.equal(formatMinutes(31.2), '31 min');
  assert.equal(formatFuelCurrency(2.984, 6.1), 'R$ 18,20');
});

