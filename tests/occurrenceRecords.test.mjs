import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyPackageOccurrenceToStops,
  collectAllOccurrenceRecords,
  collectRouteOccurrenceRecords,
  editPackageOccurrenceInStops,
  hasOccurrenceEditChanges,
  occurrenceReasonLabel,
  partitionOccurrenceRecords,
  resolvePackageOccurrenceInStops,
} from '../lib/occurrenceRecords.ts';
import {
  loadHistoryFromStorage,
  editHistoryOccurrenceInStorage,
  resolveHistoryOccurrenceInStorage,
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

test('resolves an occurrence as delivered while preserving its reason', () => {
  const registeredAt = '2026-07-02T17:00:00.000Z';
  const resolvedAt = '2026-07-02T18:00:00.000Z';
  const occurrencePackage = {
    ...packageItem('delivered-resolution', 'skipped'),
    occurrenceReason: 'Cliente ausente',
    occurrenceRegisteredAt: registeredAt,
  };

  const [resolvedStop] = resolvePackageOccurrenceInStops(
    [stop([occurrencePackage])],
    occurrencePackage.id,
    'delivered',
    resolvedAt
  );
  const resolvedPackage = resolvedStop.packages[0];

  assert.equal(resolvedPackage.status, 'delivered');
  assert.equal(resolvedPackage.occurrenceReason, 'Cliente ausente');
  assert.equal(resolvedPackage.occurrenceRegisteredAt, registeredAt);
  assert.equal(resolvedPackage.occurrenceResolution, 'delivered');
  assert.equal(resolvedPackage.occurrenceResolvedAt, resolvedAt);
});

test('quick delivered resolution does not require or overwrite an occurrence reason', () => {
  const resolvedAt = '2026-07-02T18:00:00.000Z';
  const occurrencePackage = packageItem('reasonless-resolution', 'skipped');
  const [resolvedStop] = resolvePackageOccurrenceInStops(
    [stop([occurrencePackage])],
    occurrencePackage.id,
    'delivered',
    resolvedAt
  );
  const resolvedRoute = route([resolvedStop]);
  const [record] = collectRouteOccurrenceRecords(resolvedRoute);
  const sections = partitionOccurrenceRecords(
    [record],
    Date.parse('2026-07-03T00:00:00.000Z')
  );

  assert.equal(resolvedStop.packages[0].status, 'delivered');
  assert.equal(resolvedStop.packages[0].occurrenceReason, undefined);
  assert.equal(occurrenceReasonLabel(record.reason), 'Motivo não informado');
  assert.equal(sections.pending.length, 0);
  assert.deepEqual(
    sections.resolvedRecently.map(item => item.packageId),
    ['reasonless-resolution']
  );
});

test('resolves an occurrence as returned to hub without marking it delivered', () => {
  const occurrencePackage = {
    ...packageItem('returned-resolution', 'skipped'),
    occurrenceReason: 'Endereço não localizado',
  };
  const [resolvedStop] = resolvePackageOccurrenceInStops(
    [stop([occurrencePackage])],
    occurrencePackage.id,
    'returned_to_hub',
    '2026-07-02T18:00:00.000Z'
  );

  assert.equal(resolvedStop.packages[0].status, 'skipped');
  assert.equal(resolvedStop.packages[0].occurrenceResolution, 'returned_to_hub');
  assert.equal(resolvedStop.packages[0].occurrenceReason, 'Endereço não localizado');
});

test('partitions pending and recently resolved occurrences for seven days', () => {
  const now = Date.parse('2026-07-10T12:00:00.000Z');
  const sections = partitionOccurrenceRecords([
    { packageId: 'pending', address: 'Rua A, 1' },
    {
      packageId: 'recent',
      address: 'Rua B, 2',
      occurrenceResolution: 'delivered',
      occurrenceResolvedAt: '2026-07-04T12:00:00.000Z',
    },
    {
      packageId: 'expired',
      address: 'Rua C, 3',
      occurrenceResolution: 'returned_to_hub',
      occurrenceResolvedAt: '2026-07-02T11:59:59.000Z',
    },
  ], now);

  assert.deepEqual(sections.pending.map(record => record.packageId), ['pending']);
  assert.deepEqual(sections.resolvedRecently.map(record => record.packageId), ['recent']);
});

test('old occurrence records without resolution fields remain pending', () => {
  const sections = partitionOccurrenceRecords([
    { packageId: 'legacy', address: 'Rua Antiga, 1', reason: 'Outro' },
  ], Date.parse('2026-07-10T12:00:00.000Z'));

  assert.deepEqual(sections.pending.map(record => record.packageId), ['legacy']);
  assert.equal(sections.resolvedRecently.length, 0);
});

test('completed history resolution preserves reason and writes result timestamp', async () => {
  const storage = new MemoryStorage();
  const occurrencePackage = {
    ...packageItem('history-resolution', 'skipped'),
    occurrenceReason: 'Cliente recusou',
    occurrenceRegisteredAt: '2026-07-02T17:00:00.000Z',
  };
  await saveCompletedRouteToHistory(
    storage,
    route([{ ...stop([occurrencePackage]), status: 'completed' }], 'completed')
  );
  const [savedEntry] = await loadHistoryFromStorage(storage);
  const resolvedAt = '2026-07-02T18:00:00.000Z';

  assert.equal(
    await resolveHistoryOccurrenceInStorage(
      storage,
      savedEntry.id,
      savedEntry.completedAt,
      occurrencePackage.id,
      'delivered',
      resolvedAt
    ),
    true
  );
  const [resolvedEntry] = await loadHistoryFromStorage(storage);
  const [resolvedOccurrence] = resolvedEntry.occurrences;

  assert.equal(resolvedOccurrence.reason, 'Cliente recusou');
  assert.equal(resolvedOccurrence.occurrenceResolution, 'delivered');
  assert.equal(resolvedOccurrence.occurrenceResolvedAt, resolvedAt);
  assert.equal(resolvedEntry.deliveredPackages, 1);

  await resolveHistoryOccurrenceInStorage(
    storage,
    savedEntry.id,
    savedEntry.completedAt,
    occurrencePackage.id,
    'delivered',
    '2026-07-02T19:00:00.000Z'
  );
  const [idempotentEntry] = await loadHistoryFromStorage(storage);
  assert.equal(idempotentEntry.deliveredPackages, 1);
});

test('completed history can resolve an occurrence as returned without delivered stats', async () => {
  const storage = new MemoryStorage();
  const occurrencePackage = {
    ...packageItem('history-returned', 'skipped'),
    occurrenceReason: 'Endereço não localizado',
  };
  await saveCompletedRouteToHistory(
    storage,
    route([{ ...stop([occurrencePackage]), status: 'completed' }], 'completed')
  );
  const [savedEntry] = await loadHistoryFromStorage(storage);

  assert.equal(
    await resolveHistoryOccurrenceInStorage(
      storage,
      savedEntry.id,
      savedEntry.completedAt,
      occurrencePackage.id,
      'returned_to_hub',
      '2026-07-02T18:00:00.000Z'
    ),
    true
  );
  const [resolvedEntry] = await loadHistoryFromStorage(storage);

  assert.equal(resolvedEntry.occurrences[0].occurrenceResolution, 'returned_to_hub');
  assert.equal(resolvedEntry.deliveredPackages, 0);
});

test('edits a pending occurrence reason without changing lifecycle fields', () => {
  const occurrencePackage = {
    ...packageItem('pending-edit', 'skipped'),
    occurrenceReason: 'Cliente ausente',
    occurrenceRegisteredAt: '2026-07-02T17:00:00.000Z',
  };
  const [editedStop] = editPackageOccurrenceInStops(
    [stop([occurrencePackage])],
    occurrencePackage.id,
    'Reagendado'
  );
  const editedPackage = editedStop.packages[0];

  assert.equal(editedPackage.occurrenceReason, 'Reagendado');
  assert.equal(editedPackage.occurrenceRegisteredAt, occurrencePackage.occurrenceRegisteredAt);
  assert.equal(editedPackage.occurrenceResolution, undefined);
  assert.equal(editedPackage.occurrenceResolvedAt, undefined);
  assert.equal(editedPackage.status, 'skipped');
});

test('edits a resolved reason without changing result or timestamps', () => {
  const occurrencePackage = {
    ...packageItem('resolved-reason-edit', 'delivered'),
    occurrenceReason: 'Cliente ausente',
    occurrenceRegisteredAt: '2026-07-02T17:00:00.000Z',
    occurrenceResolution: 'delivered',
    occurrenceResolvedAt: '2026-07-02T18:00:00.000Z',
  };
  const [editedStop] = editPackageOccurrenceInStops(
    [stop([occurrencePackage])],
    occurrencePackage.id,
    'Outro'
  );
  const editedPackage = editedStop.packages[0];

  assert.equal(editedPackage.occurrenceReason, 'Outro');
  assert.equal(editedPackage.occurrenceResolution, 'delivered');
  assert.equal(editedPackage.occurrenceRegisteredAt, occurrencePackage.occurrenceRegisteredAt);
  assert.equal(editedPackage.occurrenceResolvedAt, occurrencePackage.occurrenceResolvedAt);
  assert.equal(editedPackage.status, 'delivered');
});

test('reverses current-route occurrence result in both directions safely', () => {
  const returnedPackage = {
    ...packageItem('result-edit', 'skipped'),
    occurrenceReason: 'Outro',
    occurrenceResolution: 'returned_to_hub',
    occurrenceResolvedAt: '2026-07-02T18:00:00.000Z',
  };
  const [deliveredStop] = editPackageOccurrenceInStops(
    [stop([returnedPackage])],
    returnedPackage.id,
    returnedPackage.occurrenceReason,
    'delivered'
  );
  const [returnedStop] = editPackageOccurrenceInStops(
    deliveredStop ? [deliveredStop] : [],
    returnedPackage.id,
    returnedPackage.occurrenceReason,
    'returned_to_hub'
  );

  assert.equal(deliveredStop.packages[0].status, 'delivered');
  assert.equal(deliveredStop.packages[0].occurrenceResolution, 'delivered');
  assert.equal(returnedStop.packages[0].status, 'skipped');
  assert.equal(returnedStop.packages[0].occurrenceResolution, 'returned_to_hub');
  assert.equal(
    returnedStop.packages[0].occurrenceResolvedAt,
    returnedPackage.occurrenceResolvedAt
  );
});

test('edits one completed-history occurrence without duplicates or stat drift', async () => {
  const storage = new MemoryStorage();
  const returnedPackage = {
    ...packageItem('history-edit', 'skipped'),
    occurrenceReason: 'Outro',
    occurrenceRegisteredAt: '2026-07-02T17:00:00.000Z',
    occurrenceResolution: 'returned_to_hub',
    occurrenceResolvedAt: '2026-07-02T18:00:00.000Z',
  };
  await saveCompletedRouteToHistory(
    storage,
    route([{ ...stop([returnedPackage]), status: 'completed' }], 'completed')
  );
  const [savedEntry] = await loadHistoryFromStorage(storage);

  assert.equal(await editHistoryOccurrenceInStorage(
    storage,
    savedEntry.id,
    savedEntry.completedAt,
    returnedPackage.id,
    'Cliente recusou',
    'delivered'
  ), true);
  let [editedEntry] = await loadHistoryFromStorage(storage);
  assert.equal(editedEntry.occurrences.length, 1);
  assert.equal(editedEntry.occurrences[0].reason, 'Cliente recusou');
  assert.equal(editedEntry.occurrences[0].occurrenceResolution, 'delivered');
  assert.equal(editedEntry.occurrences[0].occurrenceResolvedAt, returnedPackage.occurrenceResolvedAt);
  assert.equal(editedEntry.deliveredPackages, 1);

  assert.equal(await editHistoryOccurrenceInStorage(
    storage,
    savedEntry.id,
    savedEntry.completedAt,
    returnedPackage.id,
    'Cliente recusou',
    'returned_to_hub'
  ), true);
  [editedEntry] = await loadHistoryFromStorage(storage);
  assert.equal(editedEntry.occurrences.length, 1);
  assert.equal(editedEntry.occurrences[0].occurrenceResolution, 'returned_to_hub');
  assert.equal(editedEntry.deliveredPackages, 0);
});

test('enables occurrence editing only when reason or resolved result changes', () => {
  const resolvedRecord = {
    packageId: 'edit-state',
    address: 'Rua Teste, 10',
    occurrenceResolution: 'returned_to_hub',
  };

  assert.equal(
    hasOccurrenceEditChanges(resolvedRecord, '', 'returned_to_hub'),
    false
  );
  assert.equal(
    hasOccurrenceEditChanges(resolvedRecord, '', 'delivered'),
    true
  );
  assert.equal(
    hasOccurrenceEditChanges(resolvedRecord, 'Cliente ausente', 'returned_to_hub'),
    true
  );
});

test('result-only edit preserves a missing reason and reverses package status', () => {
  const resolvedPackage = {
    ...packageItem('result-only-edit', 'skipped'),
    occurrenceResolution: 'returned_to_hub',
    occurrenceResolvedAt: '2026-07-02T18:00:00.000Z',
  };
  const [editedStop] = editPackageOccurrenceInStops(
    [stop([resolvedPackage])],
    resolvedPackage.id,
    '',
    'delivered'
  );
  const editedPackage = editedStop.packages[0];

  assert.equal(editedPackage.status, 'delivered');
  assert.equal(editedPackage.occurrenceResolution, 'delivered');
  assert.equal(editedPackage.occurrenceReason, undefined);
  assert.equal(occurrenceReasonLabel(editedPackage.occurrenceReason), 'Motivo não informado');
  assert.equal(editedPackage.occurrenceResolvedAt, resolvedPackage.occurrenceResolvedAt);
});
