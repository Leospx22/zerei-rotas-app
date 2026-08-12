import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeRouteAssistantInsights } from '../lib/route-ai/index.ts';

function stop({
  id,
  stopNumber,
  originalStopNumber = stopNumber,
  address,
  latitude = -23.55,
  longitude = -46.63,
  packageCount = 1,
  orderIndex = stopNumber - 1,
  optimizedOrderIndex,
  addressCount = 1,
}) {
  const packages = Array.from({ length: packageCount }, (_, index) => ({
    id: `${id}-pkg-${index}`,
    trackingNumber: `${id}-${index}`,
    destinationAddress: address,
    zipCode: '01000-000',
    latitude,
    longitude,
    stopNumber: originalStopNumber,
    status: 'pending',
  }));

  return {
    id,
    stopNumber,
    originalStopNumber,
    normalizedAddress: address,
    originalAddress: address,
    zipCode: '01000-000',
    latitude,
    longitude,
    packages,
    packageCount,
    addressGroups: [{
      normalizedAddress: address,
      originalAddress: address,
      zipCode: '01000-000',
      packageIds: packages.map(pkg => pkg.id),
      packageCount,
      deliveryCount: packageCount,
      blockCount: 0,
      isCondominium: false,
      blockGroups: [],
    }],
    addressCount,
    orderIndex,
    optimizedOrderIndex,
    status: 'pending',
    houseNumber: String(stopNumber),
    duplicateAddressWarning: false,
  };
}

test('local assistant detects duplicate addresses and duplicate imported stop numbers', () => {
  const analysis = analyzeRouteAssistantInsights([
    stop({ id: 'a', stopNumber: 1, address: 'Rua Alfa, 10' }),
    stop({ id: 'b', stopNumber: 2, originalStopNumber: 1, address: 'Rua Beta, 20' }),
    stop({ id: 'c', stopNumber: 3, address: 'Rua Alfa, 10' }),
  ]);

  assert.ok(analysis.insights.some(insight => insight.type === 'duplicate-address'));
  assert.ok(analysis.insights.some(insight => insight.type === 'duplicate-stop-number'));
  assert.equal(analysis.provider, 'local');
});

test('local assistant warns about missing complements and large stops', () => {
  const analysis = analyzeRouteAssistantInsights([
    stop({ id: 'bulk', stopNumber: 8, address: 'Avenida Predio, 100', packageCount: 9 }),
  ]);

  assert.ok(analysis.insights.some(insight => insight.type === 'missing-complement'));
  assert.ok(analysis.insights.some(insight => insight.type === 'large-stop'));
  assert.equal(analysis.summary.warningCount, 2);
});

test('local assistant checks consecutive optimized legs without changing route order', () => {
  const stops = [
    stop({ id: 'a', stopNumber: 1, address: 'Rua A, 1', latitude: -23.55, longitude: -46.63, orderIndex: 0, optimizedOrderIndex: 0 }),
    stop({ id: 'b', stopNumber: 2, address: 'Rua B, 2', latitude: -23.56, longitude: -46.64, orderIndex: 1, optimizedOrderIndex: 2 }),
    stop({ id: 'c', stopNumber: 3, address: 'Rua C, 3', latitude: -23.9, longitude: -47.1, orderIndex: 2, optimizedOrderIndex: 1 }),
  ];

  const before = stops.map(routeStop => routeStop.id);
  const analysis = analyzeRouteAssistantInsights(stops, { longLegDistanceKm: 5 });

  assert.ok(analysis.insights.some(insight => insight.type === 'long-optimized-leg'));
  assert.deepEqual(stops.map(routeStop => routeStop.id), before);
});

test('local assistant reports potential anomalies for missing coordinates and multi-address stops', () => {
  const analysis = analyzeRouteAssistantInsights([
    stop({ id: 'missing', stopNumber: 1, address: 'Rua Sem Mapa, 1', latitude: null, longitude: null }),
    stop({ id: 'multi', stopNumber: 2, address: 'Rua Galeria, 2', addressCount: 3 }),
  ]);

  const anomalyMessages = analysis.insights.filter(insight => insight.type === 'potential-anomaly');

  assert.equal(anomalyMessages.length, 2);
  assert.equal(analysis.summary.totalInsights, analysis.insights.length);
});
