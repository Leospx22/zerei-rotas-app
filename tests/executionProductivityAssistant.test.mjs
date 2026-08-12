import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildExecutionProductivitySnapshot,
  formatExecutionEta,
} from '../lib/route-ai/index.ts';

const NOW = Date.UTC(2026, 7, 12, 15, 0, 0);

function packageItem(id, status = 'pending', address = 'Rua Teste, 10') {
  return {
    id,
    trackingNumber: id,
    destinationAddress: address,
    zipCode: '01000-000',
    latitude: -23.55,
    longitude: -46.63,
    stopNumber: 1,
    status,
  };
}

function stop({
  id,
  stopNumber,
  status = 'pending',
  packageCount = 1,
  latitude = -23.55,
  longitude = -46.63,
  address = `Rua Teste, ${stopNumber}`,
}) {
  const packages = Array.from({ length: packageCount }, (_, index) =>
    packageItem(`${id}-pkg-${index}`, status === 'completed' ? 'delivered' : 'pending', address)
  );

  return {
    id,
    stopNumber,
    originalStopNumber: stopNumber,
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
    addressCount: 1,
    orderIndex: stopNumber - 1,
    status,
    houseNumber: String(stopNumber),
    duplicateAddressWarning: false,
  };
}

function route(stops, overrides = {}) {
  const deliveredPackages = stops.reduce(
    (total, item) => total + item.packages.filter(pkg => pkg.status === 'delivered').length,
    0
  );

  return {
    id: 'route-1',
    name: 'Rota teste',
    stops,
    status: 'active',
    estimatedDistanceKm: 10,
    completedStops: stops.filter(item => item.status === 'completed').length,
    totalPackages: stops.reduce((total, item) => total + item.packages.length, 0),
    deliveredPackages,
    startTime: NOW - 60 * 60000,
    durationMinutes: 0,
    ...overrides,
  };
}

test('builds productivity metrics and ETA from local route progress', () => {
  const data = route([
    stop({ id: 'stop-1', stopNumber: 1, status: 'completed', packageCount: 4 }),
    stop({ id: 'stop-2', stopNumber: 2, status: 'completed', packageCount: 2 }),
    stop({ id: 'stop-3', stopNumber: 3, packageCount: 3 }),
    stop({ id: 'stop-4', stopNumber: 4, packageCount: 1 }),
  ]);

  const snapshot = buildExecutionProductivitySnapshot(data, NOW);

  assert.equal(snapshot.completedStops, 2);
  assert.equal(snapshot.remainingStops, 2);
  assert.equal(snapshot.deliveredPackages, 6);
  assert.equal(snapshot.remainingPackages, 4);
  assert.equal(snapshot.averagePackagesPerHour, 6);
  assert.equal(snapshot.estimatedCompletionTime, NOW + 60 * 60000);
  assert.equal(formatExecutionEta(snapshot.estimatedCompletionTime).length, 5);
});

test('reports behind pace when projected execution exceeds local route estimate', () => {
  const data = route([
    stop({ id: 'stop-1', stopNumber: 1, status: 'completed', packageCount: 1 }),
    stop({ id: 'stop-2', stopNumber: 2, packageCount: 1 }),
    stop({ id: 'stop-3', stopNumber: 3, packageCount: 1 }),
    stop({ id: 'stop-4', stopNumber: 4, packageCount: 1 }),
  ], {
    startTime: NOW - 90 * 60000,
    routeAIReport: {
      optimization: { estimatedDurationMinutes: 40 },
      analysis: { estimatedOriginalDurationMinutes: 45 },
    },
  });

  const snapshot = buildExecutionProductivitySnapshot(data, NOW);

  assert.equal(snapshot.pace, 'behind');
  assert.equal(snapshot.paceLabel, 'Atrasado');
});

test('uses local assistant signals for large stops and long next legs', () => {
  const data = route([
    stop({ id: 'stop-1', stopNumber: 1, status: 'completed', packageCount: 1 }),
    stop({ id: 'stop-2', stopNumber: 2, packageCount: 9, latitude: -23.55, longitude: -46.63 }),
    stop({ id: 'stop-3', stopNumber: 3, packageCount: 2, latitude: -23.9, longitude: -47.1 }),
  ]);

  const snapshot = buildExecutionProductivitySnapshot(data, NOW);

  assert.ok(snapshot.tips.some(tip => tip.startsWith('Parada grande à frente')));
  assert.ok(snapshot.tips.some(tip => tip.startsWith('Próxima parada distante')));
});

test('returns milestone achievement messages from current progress', () => {
  const firstStop = route([
    stop({ id: 'stop-1', stopNumber: 1, status: 'completed' }),
    stop({ id: 'stop-2', stopNumber: 2 }),
  ]);
  assert.equal(
    buildExecutionProductivitySnapshot(firstStop, NOW).achievementMessage,
    'Última parada'
  );

  const tenStops = route([
    ...Array.from({ length: 10 }, (_, index) =>
      stop({ id: `done-${index}`, stopNumber: index + 1, status: 'completed' })
    ),
    ...Array.from({ length: 3 }, (_, index) =>
      stop({ id: `pending-${index}`, stopNumber: index + 11 })
    ),
  ]);
  assert.equal(
    buildExecutionProductivitySnapshot(tenStops, NOW).achievementMessage,
    '10 paradas concluídas'
  );
});
