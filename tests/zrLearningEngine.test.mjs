import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLearningStatus,
  clearLearningHistory,
  createLearningStore,
  learnFromCompletedRoute,
  recordLearningEvent,
  setLearningEnabled,
} from '../lib/route-ai/learning/index.ts';

class MemoryStorage {
  values = new Map();
  async getItem(key) { return this.values.get(key) ?? null; }
  async setItem(key, value) { this.values.set(key, value); }
  async removeItem(key) { this.values.delete(key); }
}

function stop(id, status, address, packageCount = 1) {
  return {
    id,
    stopNumber: Number(id.replace(/\D/g, '')) || 1,
    originalStopNumber: Number(id.replace(/\D/g, '')) || 1,
    normalizedAddress: address,
    originalAddress: address,
    zipCode: '01000-000',
    latitude: null,
    longitude: null,
    packages: Array.from({ length: packageCount }, (_, index) => ({
      id: `${id}-pkg-${index}`,
      trackingNumber: `${id}-${index}`,
      destinationAddress: address,
      zipCode: '01000-000',
      latitude: null,
      longitude: null,
      stopNumber: 1,
      status: status === 'completed' ? 'delivered' : 'skipped',
    })),
    packageCount,
    addressGroups: [{
      normalizedAddress: address,
      originalAddress: address,
      zipCode: '01000-000',
      packageIds: [`${id}-pkg-0`],
      packageCount,
    }],
    addressCount: 1,
    orderIndex: 0,
    status,
    houseNumber: '10',
    duplicateAddressWarning: false,
  };
}

function completedRoute(id = 'route-learning-1') {
  return {
    id,
    name: 'Rota aprendida',
    stops: [
      stop('stop-1', 'completed', 'Rua Casa, 10 - Centro', 2),
      stop('stop-2', 'completed', 'Apartamento Torre A, 22 - Centro', 1),
      stop('stop-3', 'skipped', 'Condominio Portaria, 100 - Norte', 1),
    ],
    status: 'completed',
    estimatedDistanceKm: 12,
    completedStops: 2,
    totalPackages: 4,
    deliveredPackages: 3,
    startTime: 1,
    durationMinutes: 60,
    routeAIReport: {
      optimization: { strategy: 'balanced' },
    },
  };
}

test('learns anonymous aggregate metrics from a completed route', async () => {
  const store = createLearningStore(new MemoryStorage());
  const state = await learnFromCompletedRoute({ route: completedRoute() }, store);

  assert.equal(state.routesAnalyzed, 1);
  assert.equal(state.stopsAnalyzed, 3);
  assert.equal(state.completedStopsAnalyzed, 2);
  assert.equal(state.skippedStopsAnalyzed, 1);
  assert.equal(state.profile.preferredOptimizationStrategy, 'balanced');
  assert.equal(state.profile.averageDeliverySuccessRate, 0.75);
  assert.equal(state.categoryMetrics.apartments.stops, 1);
});

test('does not double count the same completed route', async () => {
  const store = createLearningStore(new MemoryStorage());

  await learnFromCompletedRoute({ route: completedRoute() }, store);
  const state = await learnFromCompletedRoute({ route: completedRoute() }, store);

  assert.equal(state.routesAnalyzed, 1);
  assert.equal(state.stopsAnalyzed, 3);
});

test('records accepted and ignored AI recommendation events locally', async () => {
  const store = createLearningStore(new MemoryStorage());

  await learnFromCompletedRoute({ route: completedRoute() }, store);
  await recordLearningEvent({ type: 'accepted-ai-recommendation', strategy: 'balanced' }, store);
  await recordLearningEvent({ type: 'ignored-ai-recommendation', strategy: 'fastest' }, store);
  const state = await store.load();
  const status = buildLearningStatus(state);

  assert.equal(state.strategyPreferences.balanced?.accepted, 1);
  assert.equal(state.strategyPreferences.fastest?.ignored, 1);
  assert.equal(status.label, 'Learning');
  assert.equal(status.recommendation?.suggestedStrategy, 'balanced');
});

test('can disable learning and clear local history', async () => {
  const storage = new MemoryStorage();
  const store = createLearningStore(storage);

  await learnFromCompletedRoute({ route: completedRoute() }, store);
  const disabled = await setLearningEnabled(false, store);
  const unchanged = await learnFromCompletedRoute({ route: completedRoute('route-learning-2') }, store);

  assert.equal(disabled.enabled, false);
  assert.equal(unchanged.routesAnalyzed, 1);

  await clearLearningHistory(store);
  assert.equal((await store.load()).routesAnalyzed, 0);
});

