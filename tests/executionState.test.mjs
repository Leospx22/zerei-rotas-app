import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveExecutionState } from '../lib/executionState.ts';

function packageItem(id, status = 'pending') {
  return {
    id,
    trackingNumber: id,
    destinationAddress: 'Rua Teste, 10',
    zipCode: '00000-000',
    latitude: null,
    longitude: null,
    stopNumber: 1,
    status,
  };
}

function stop(id, status, packages) {
  return {
    id,
    stopNumber: Number(id.replace('stop-', '')),
    normalizedAddress: 'Rua Teste, 10',
    originalAddress: 'Rua Teste, 10',
    zipCode: '00000-000',
    latitude: null,
    longitude: null,
    packages,
    packageCount: packages.length,
    addressGroups: [],
    addressCount: 1,
    orderIndex: 0,
    status,
    houseNumber: '10',
    duplicateAddressWarning: false,
  };
}

function route(stops) {
  return {
    id: 'route-1',
    name: 'Rota teste',
    stops,
    status: 'active',
    estimatedDistanceKm: 10,
    completedStops: stops.filter(item => item.status === 'completed').length,
    totalPackages: stops.reduce((total, item) => total + item.packages.length, 0),
    deliveredPackages: 0,
    startTime: Date.now(),
    durationMinutes: 0,
  };
}

test('derives current and next pending stops for separation', () => {
  const completed = stop('stop-1', 'completed', [packageItem('pkg-1', 'delivered')]);
  const current = stop('stop-2', 'pending', [packageItem('pkg-2'), packageItem('pkg-3')]);
  const next = stop('stop-3', 'pending', [packageItem('pkg-4')]);
  const skipped = stop('stop-4', 'skipped', [packageItem('pkg-5', 'skipped')]);

  const state = deriveExecutionState(route([completed, current, next, skipped]));

  assert.equal(state.currentStop?.id, 'stop-2');
  assert.equal(state.nextStop?.id, 'stop-3');
  assert.equal(state.totalPackagesAtCurrentStop, 2);
  assert.deepEqual(state.pendingPackagesAtCurrentStop.map(pkg => pkg.id), ['pkg-2', 'pkg-3']);
  assert.equal(state.deliveredPackagesCount, 1);
  assert.equal(state.totalPackagesCount, 5);
  assert.equal(state.remainingStopsCount, 2);
  assert.equal(state.executionStep, 'separacao');
});

test('derives delivery step after current-stop package progress begins', () => {
  const current = stop('stop-1', 'pending', [
    packageItem('pkg-1', 'delivered'),
    packageItem('pkg-2'),
  ]);

  const state = deriveExecutionState(route([current]));

  assert.equal(state.pendingPackagesAtCurrentStop.length, 1);
  assert.equal(state.deliveredPackagesCount, 1);
  assert.equal(state.executionStep, 'entrega');
});

test('returns stable empty execution state without a route', () => {
  assert.deepEqual(deriveExecutionState(null), {
    currentStop: null,
    nextStop: null,
    totalPackagesAtCurrentStop: 0,
    pendingPackagesAtCurrentStop: [],
    deliveredPackagesCount: 0,
    totalPackagesCount: 0,
    remainingStopsCount: 0,
    executionStep: 'separacao',
  });
});
