import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildZRExplanations,
  formatDistance,
  formatFuelCurrency,
  formatMetricConfidence,
  formatMetricImprovement,
  formatMetricSavings,
  formatMinutes,
  getZRScoreBand,
} from '../components/route-ai/zrPresentation.ts';

test('ZR score bands map score values to premium labels', () => {
  assert.equal(getZRScoreBand(91), 'Excelente');
  assert.equal(getZRScoreBand(75), 'Boa');
  assert.equal(getZRScoreBand(55), 'Regular');
  assert.equal(getZRScoreBand(40), 'Ruim');
});

test('ZR explanations are derived from route score factors', () => {
  const explanations = buildZRExplanations([
    { label: 'Qualidade do agrupamento', impact: 16, message: 'Agrupamento excelente.' },
    { label: 'Continuidade da rota', impact: 0, message: '0 sinais de retorno ou zigue-zague detectados.' },
    { label: 'Retornos à rua', impact: 0, message: '0 retornos para ruas já visitadas.' },
    { label: 'Retornos ao bairro', impact: -4, message: '1 retornos para bairros já visitados.' },
    { label: 'Distância média entre paradas', impact: 0, message: 'Espaçamento médio de 1.2 km por trecho.' },
  ]);

  assert.deepEqual(
    explanations.map(item => item.label),
    [
      'Agrupamento melhor',
      'Continuidade melhor entre paradas',
      'Menos retornos à rua',
      'Menos retornos ao bairro',
    ]
  );
  assert.equal(explanations[0].detail, 'Agrupamento excelente.');
});

test('ZR presentation formatters keep route AI metrics display-ready', () => {
  assert.equal(formatDistance(8.44), '8.4 km');
  assert.equal(formatMinutes(31.2), '31 min');
  assert.equal(formatFuelCurrency(2.984, 6.1), 'R$ 18,20');
});

test('ZR presentation shows unavailable copy for untrusted savings, confidence, and improvement', () => {
  assert.equal(formatMetricSavings('12.0 km', 'unreliable'), 'Indisponível');
  assert.equal(formatMetricImprovement(0, 'unreliable', 'de melhoria'), 'Estimativa indisponível');
  assert.equal(formatMetricImprovement(0, 'degraded', 'melhor'), 'Estimativa indisponível');
  assert.equal(formatMetricConfidence(100, 'unreliable'), 'Indisponível');
  assert.equal(formatMetricConfidence(52, 'degraded'), 'Confiança parcial');
  assert.equal(formatMetricConfidence(88, 'reliable'), '88%');
});

