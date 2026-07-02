import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyPackageOccurrenceToStops,
  collectAllOccurrenceRecords,
  collectRouteOccurrenceRecords,
  occurrenceReasonLabel,
} from '../lib/occurrenceRecords.ts';
import {
  loadHistoryFromStorage,
  saveCompletedRouteToHistory,
} from '../lib/routePersistence.ts';

class MemoryStorage {
  values = new Map();

  async getItem(key) { return this.values.get(key) ?? null; }
  async setItem(key, value) { this.values.set(key, value); }
  async removeItem(key) { this.values.delete(key); }
}

function packageItem(id, status = 'pending') {
  return {
    id,
    trackingNumber: `BR-${id}`,
    destinationAddress: 'Rua Gomes Cardim, 182, Apto 2',
    zipCode: '00000-000',
    latitude: null,
    longitude: null,
    stopNumber: 7,
    status,
  };
}

function stop(packages) {
  return {
    id: 'stop-7',
    stopNumber: 7,
    normalizedAddress: 'Rua Gomes Cardim, 182',
    originalAddress: 'Rua Gomes Cardim, 182',
    zipCode: '00000-000',
    latitude: null,
    longitude: null,
    packages,
    packageCount: packages.length,
    addressGroups: [],
    addressCount: 1,
    orderIndex: 0,
    status: 'pending',
    houseNumber: '182',
    duplicateAddressWarning: false,
  };
}

function route(stops, status = 'active') {
  return {
    id: 'route-1',
    name: 'Rota 02/07/2026',
    stops,
    status,
    estimatedDistanceKm: 0,
    completedStops: stops.filter(item => item.status === 'completed').length,
    totalPackages: stops.reduce((total, item) => total + item.packages.length, 0),
    deliveredPackages: 0,
    startTime: 1,
    durationMinutes: 10,
  };
}

test('writes occurrence reason and timestamp without changing unrelated packages', () => {
  const registeredAt = '2026-07-02T17:32:00.000Z';
  const originalStops = [stop([packageItem('one'), packageItem('two')])];
  const updatedStops = applyPackageOccurrenceToStops(
    originalStops,
    'stop-7',
    'one',
    'Cliente ausente',
    registeredAt
  );

  assert.equal(updatedStops[0].packages[0].status, 'skipped');
  assert.equal(updatedStops[0].packages[0].occurrenceReason, 'Cliente ausente');
  assert.equal(updatedStops[0].packages[0].occurrenceRegisteredAt, registeredAt);
  assert.equal(updatedStops[0].packages[1].status, 'pending');
  assert.equal(originalStops[0].packages[0].occurrenceReason, undefined);
});

test('collects current-route occurrences and excludes delivered packages', () => {
  const skipped = {
    ...packageItem('occurrence', 'skipped'),
    occurrenceReason: 'Cliente recusou',
    occurrenceRegisteredAt: '2026-07-02T17:32:00.000Z',
  };
  const records = collectRouteOccurrenceRecords(
    route([stop([skipped, packageItem('delivered', 'delivered')])])
  );

  assert.equal(records.length, 1);
  assert.equal(records[0].packageId, 'occurrence');
  assert.equal(records[0].reason, 'Cliente recusou');
  assert.equal(records[0].normalizedAddress, 'Rua Gomes Cardim, 182');
});

test('old skipped packages without occurrence fields load with fallback reason', () => {
  const records = collectRouteOccurrenceRecords(route([stop([packageItem('old', 'skipped')])]));

  assert.equal(records.length, 1);
  assert.equal(records[0].reason, undefined);
  assert.equal(occurrenceReasonLabel(records[0].reason), 'Motivo não informado');
});

test('collects current occurrences first and completed history occurrences second', () => {
  const currentPackage = {
    ...packageItem('current', 'skipped'),
    occurrenceReason: 'Cliente ausente',
  };
  const records = collectAllOccurrenceRecords(route([stop([currentPackage])]), [
    {
      id: 'route-2',
      name: 'Rota concluída',
      occurrences: [{
        packageId: 'history',
        packageCode: 'BR-HISTORY',
        address: 'Rua Teste, 10',
        reason: 'Outro',
      }],
    },
    { id: 'route-old', name: 'Rota antiga' },
  ]);

  assert.deepEqual(records.map(record => record.packageId), ['current', 'history']);
  assert.equal(records[1].routeName, 'Rota concluída');
});

test('completed history persists occurrence summaries and old history remains compatible', async () => {
  const storage = new MemoryStorage();
  const occurrencePackage = {
    ...packageItem('history-occurrence', 'skipped'),
    occurrenceReason: 'Estabelecimento fechado',
    occurrenceRegisteredAt: '2026-07-02T18:00:00.000Z',
  };
  const completedStop = { ...stop([occurrencePackage]), status: 'completed' };

  await saveCompletedRouteToHistory(storage, route([completedStop], 'completed'));
  const [entry] = await loadHistoryFromStorage(storage);

  assert.equal(entry.occurrences?.length, 1);
  assert.equal(entry.occurrences?.[0].reason, 'Estabelecimento fechado');

  await storage.setItem('zerei_route_history', JSON.stringify([{
    id: 'old-route',
    name: 'Rota antiga',
    totalPackages: 1,
    totalStops: 1,
    deliveredPackages: 1,
    completedStops: 1,
    distance: 0,
    durationMinutes: 1,
    completedAt: '2026-01-01T00:00:00.000Z',
  }]));
  const [oldEntry] = await loadHistoryFromStorage(storage);

  assert.equal(oldEntry.occurrences, undefined);
});
