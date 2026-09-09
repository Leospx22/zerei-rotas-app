import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeRemainingRoute,
  calculateRemainingRouteMetricSummary,
  createOptimizationSessionSnapshot,
  optimizeRemainingRoute,
  partitionRouteStops,
  simulateRemainingRouteStrategies,
} from '../lib/route-ai/runtime/index.ts';

function stop(id, orderIndex, address, latitude, longitude, status = 'pending') {
  return {
    id,
    stopNumber: orderIndex + 1,
    originalStopNumber: orderIndex + 1,
    normalizedAddress: address,
    originalAddress: address,
    zipCode: '01310-000',
    latitude,
    longitude,
    packages: [{
      id: `${id}-pkg`,
      trackingNumber: `${id}-tracking`,
      destinationAddress: address,
      zipCode: '01310-000',
      latitude,
      longitude,
      stopNumber: orderIndex + 1,
      status: status === 'completed' ? 'delivered' : status,
    }],
    packageCount: 1,
    addressGroups: [{
      normalizedAddress: address,
      originalAddress: address,
      zipCode: '01310-000',
      packageIds: [`${id}-pkg`],
      packageCount: 1,
    }],
    addressCount: 1,
    orderIndex,
    status,
    houseNumber: String(orderIndex + 1),
    duplicateAddressWarning: false,
  };
}

const routeStops = [
  stop('done', 0, 'Rua Entregue, 1 - Centro', -23.5500, -46.6300, 'completed'),
  stop('a', 1, 'Rua Alfa, 10 - Centro', -23.5505, -46.6333),
  stop('b', 2, 'Rua Beta, 20 - Norte', -23.6000, -46.7000),
  stop('c', 3, 'Rua Alfa, 30 - Centro', -23.5510, -46.6340),
  stop('d', 4, 'Rua Delta, 40 - Norte', -23.6010, -46.7010),
  stop('skip', 5, 'Rua Pulada, 99 - Centro', -23.5520, -46.6320, 'skipped'),
];

const inefficientRemainingRoute = [
  stop('done', 0, 'Rua Entregue, 1 - Centro', -23.5500, -46.6300, 'completed'),
  stop('d', 1, 'Rua Delta, 40 - Norte', -23.6010, -46.7010),
  stop('a', 2, 'Rua Alfa, 10 - Centro', -23.5505, -46.6333),
  stop('c', 3, 'Rua Alfa, 30 - Centro', -23.5510, -46.6340),
  stop('b', 4, 'Rua Beta, 20 - Norte', -23.6000, -46.7000),
  stop('skip', 5, 'Rua Pulada, 99 - Centro', -23.5520, -46.6320, 'skipped'),
];

test('partitions completed, skipped, locked, and movable remaining stops', () => {
  const partitions = partitionRouteStops(routeStops, [{ stopId: 'b', reason: 'business-hours' }]);

  assert.deepEqual(partitions.completedStops.map(item => item.id), ['done']);
  assert.deepEqual(partitions.skippedStops.map(item => item.id), ['skip']);
  assert.deepEqual(partitions.remainingStops.map(item => item.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(partitions.lockedRemainingStops.map(item => item.id), ['b']);
  assert.deepEqual(partitions.movableRemainingStops.map(item => item.id), ['a', 'c', 'd']);
});

test('remaining analyzer evaluates only pending stops', () => {
  const analysis = analyzeRemainingRoute({
    currentPosition: { latitude: -23.5490, longitude: -46.6320 },
    stops: routeStops,
    lockedStops: [{ stopId: 'b', reason: 'business-hours' }],
  });

  assert.deepEqual(analysis.completedStopIds, ['done']);
  assert.deepEqual(analysis.skippedStopIds, ['skip']);
  assert.deepEqual(analysis.remainingStops.map(item => item.id), ['a', 'b', 'c', 'd']);
  assert.ok(analysis.remainingDistanceKm > 0);
  assert.ok(analysis.remainingDurationMinutes > 0);
});

test('remaining optimizer preserves locked stop position and never mutates route stops', async () => {
  const before = inefficientRemainingRoute.map(item => `${item.id}:${item.orderIndex}:${item.status}`);
  const result = await optimizeRemainingRoute({
    currentPosition: { latitude: -23.5490, longitude: -46.6320 },
    stops: inefficientRemainingRoute,
    lockedStops: [{ stopId: 'b', reason: 'business-hours' }],
    strategy: 'balanced',
  });
  const after = inefficientRemainingRoute.map(item => `${item.id}:${item.orderIndex}:${item.status}`);

  assert.deepEqual(after, before);
  assert.ok(result.recommendation);
  assert.equal(result.recommendation.proposedStopIds[3], 'b');
  assert.equal(result.recommendation.driverAction, 'preview-changes');
});

test('route simulation compares runtime strategies and selects a winner', () => {
  const simulation = simulateRemainingRouteStrategies({
    currentPosition: { latitude: -23.5490, longitude: -46.6320 },
    stops: routeStops,
    lockedStops: [{ stopId: 'b', reason: 'business-hours' }],
  });

  assert.equal(simulation.current.strategy, 'current');
  assert.equal(simulation.fastest.strategy, 'fastest');
  assert.equal(simulation.shortest.strategy, 'shortest-distance');
  assert.equal(simulation.balanced.strategy, 'balanced');
  assert.equal(simulation.cluster.strategy, 'cluster');
  assert.ok(['fastest', 'shortest-distance', 'balanced', 'cluster'].includes(simulation.winner.strategy));
});

test('optimization session composes analysis, recommendation, and simulation snapshot', async () => {
  const snapshot = await createOptimizationSessionSnapshot({
    currentPosition: { latitude: -23.5490, longitude: -46.6320 },
    stops: routeStops,
    lockedStops: [{ stopId: 'b', reason: 'business-hours' }],
  });

  assert.ok(snapshot.generatedAt);
  assert.equal(snapshot.analysis.remainingStops.length, 4);
  assert.equal(snapshot.simulation.current.stopIds.length, 4);
  assert.equal(snapshot.optimization.analysis.remainingStops.length, 4);
});

test('runtime metrics mark invalid remaining segments as unreliable without trusted distance', () => {
  const runtimeStops = [
    stop('a', 0, 'Rua Alfa, 10 - Centro', -23.5505, -46.6333),
    stop('bad', 1, 'Rua Ruim, 20 - Centro', 0, 0),
    stop('b', 2, 'Rua Beta, 30 - Centro', -23.5510, -46.6340),
  ];
  const summary = calculateRemainingRouteMetricSummary(null, runtimeStops);

  assert.equal(summary.metricConfidence, 'unreliable');
  assert.equal(summary.metricProvenance, 'estimated');
  assert.equal(summary.unreliableSegmentCount, 2);
  assert.equal(summary.segments.find(segment => segment.toStopId === 'bad')?.distanceKm, 0);
});

test('runtime simulation does not report full confidence or savings for unreliable coordinates', () => {
  const simulation = simulateRemainingRouteStrategies({
    currentPosition: null,
    stops: [
      stop('a', 0, 'Rua Alfa, 10 - Centro', -23.5505, -46.6333),
      stop('bad', 1, 'Rua Ruim, 20 - Centro', 0, 0),
      stop('b', 2, 'Rua Beta, 30 - Centro', -23.5510, -46.6340),
    ],
  });

  assert.equal(simulation.current.metricConfidence, 'unreliable');
  assert.equal(simulation.current.confidence, 0);
  assert.equal(simulation.winner.confidence, 0);
  assert.equal(simulation.winner.savingsMinutes, 0);
  assert.equal(simulation.winner.savingsKm, 0);
});
