import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeRoute,
  compareRoutes,
  DeterministicRouteOptimizer,
  generateRouteAIReport,
  scoreRoute,
} from '../lib/route-ai/index.ts';

function stop(id, orderIndex, address, latitude, longitude, packageCount = 1) {
  return {
    id,
    stopNumber: orderIndex + 1,
    originalStopNumber: orderIndex + 1,
    normalizedAddress: address,
    originalAddress: address,
    zipCode: '01310-000',
    latitude,
    longitude,
    packages: Array.from({ length: packageCount }, (_, index) => ({
      id: `${id}-pkg-${index}`,
      trackingNumber: `${id}-${index}`,
      destinationAddress: address,
      zipCode: '01310-000',
      latitude,
      longitude,
      stopNumber: orderIndex + 1,
      status: 'pending',
    })),
    packageCount,
    addressGroups: [{
      normalizedAddress: address,
      originalAddress: address,
      zipCode: '01310-000',
      packageIds: [`${id}-pkg-0`],
      packageCount,
    }],
    addressCount: 1,
    orderIndex,
    status: 'pending',
    houseNumber: String(orderIndex + 1),
    duplicateAddressWarning: false,
  };
}

const stops = [
  stop('a', 0, 'Rua Alfa, 10 - Centro', -23.5505, -46.6333),
  stop('b', 1, 'Rua Beta, 20 - Norte', -23.6000, -46.7000),
  stop('c', 2, 'Rua Alfa, 30 - Centro', -23.5510, -46.6340),
  stop('d', 3, 'Rua Delta, 40 - Norte', -23.6010, -46.7010, 3),
];

test('analyzes imported stops with duplicates and route metrics', () => {
  const analysis = analyzeRoute(stops);

  assert.equal(analysis.totalStops, 4);
  assert.ok(analysis.originalDistanceKm > 0);
  assert.ok(analysis.estimatedOriginalDurationMinutes > 0);
  assert.equal(analysis.duplicateNeighborhoods[0].label, 'Centro');
  assert.equal(analysis.clusters.length, 2);
});

test('deterministic optimizer returns stable optimized order and savings estimates', async () => {
  const optimizer = new DeterministicRouteOptimizer();
  const result = await optimizer.optimize(stops, 'balanced');

  assert.deepEqual(result.optimizedStopIds, ['a', 'c', 'b', 'd']);
  assert.ok(result.estimatedDistanceKm <= analyzeRoute(stops).originalDistanceKm);
  assert.ok(result.confidenceScore >= 0 && result.confidenceScore <= 100);
});

test('comparison and score explain the route quality', () => {
  const analysis = analyzeRoute(stops);
  const comparison = compareRoutes(analysis.originalDistanceKm, 1, analysis.estimatedOriginalDurationMinutes, 20);
  const score = scoreRoute(stops, analysis);

  assert.ok(comparison.distanceSavedKm > 0);
  assert.ok(score.score >= 0 && score.score <= 100);
  assert.ok(score.reasons.length > 0);
});

test('route AI report composes analysis, optimization, comparison, score, and recommendation', async () => {
  const report = await generateRouteAIReport(stops, 'balanced');

  assert.equal(report.analysis.totalStops, 4);
  assert.equal(report.optimization.strategy, 'balanced');
  assert.ok(report.comparison.percentageImprovement >= 0);
  assert.match(report.recommendation.label, /Route$/);
});

