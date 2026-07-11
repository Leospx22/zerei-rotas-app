import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deleteRouteFromStorage,
  KEY_CURRENT,
  KEY_CURRENT_CORRUPTED,
  KEY_HISTORY,
  loadActiveRouteEnvelopeFromStorage,
  loadCurrentRouteFromStorage,
  loadHistoryFromStorage,
  renameRouteInStorage,
  saveCompletedRouteToHistory,
  saveRouteToStorage,
  validatePersistedRoute,
} from '../lib/routePersistence.ts';
import { buildPlanningRoute } from '../lib/packageUtils.ts';

class MemoryStorage {
  values = new Map();

  async getItem(key) { return this.values.get(key) ?? null; }
  async setItem(key, value) { this.values.set(key, value); }
  async removeItem(key) { this.values.delete(key); }
}

class FailingHistoryStorage extends MemoryStorage {
  failHistoryWrite = false;

  async setItem(key, value) {
    if (this.failHistoryWrite && key === KEY_HISTORY) {
      throw new Error('history write failed');
    }
    return super.setItem(key, value);
  }
}

function route(status) {
  const packageStatus = status === 'completed' ? 'delivered' : 'pending';
  const stopStatus = status === 'completed' ? 'completed' : 'pending';
  return {
    id: 'route-1',
    name: 'Rota importada',
    stops: [{
      id: 'stop-1',
      stopNumber: 1,
      normalizedAddress: 'Rua A, 10',
      originalAddress: 'Rua A, 10',
      zipCode: '01000-000',
      latitude: null,
      longitude: null,
      packages: [{
        id: 'pkg-1',
        trackingNumber: 'SPX1',
        destinationAddress: 'Rua A, 10',
        zipCode: '01000-000',
        latitude: null,
        longitude: null,
        stopNumber: status === 'planning' ? null : 1,
        status: packageStatus,
      }],
      packageCount: 1,
      addressGroups: [{
        normalizedAddress: 'Rua A, 10',
        originalAddress: 'Rua A, 10',
        zipCode: '01000-000',
        packageIds: ['pkg-1'],
        packageCount: 1,
      }],
      addressCount: 1,
      orderIndex: 0,
      status: stopStatus,
      houseNumber: '10',
      duplicateAddressWarning: false,
    }],
    status,
    estimatedDistanceKm: 0,
    completedStops: status === 'completed' ? 1 : 0,
    totalPackages: 1,
    deliveredPackages: status === 'completed' ? 1 : 0,
    startTime: status === 'planning' ? null : 1,
    durationMinutes: status === 'completed' ? 10 : 0,
  };
}

function historyEntry(id, name, completedAt) {
  return {
    id,
    name,
    totalPackages: 3,
    totalStops: 2,
    deliveredPackages: 3,
    completedStops: 2,
    distance: 7,
    durationMinutes: 15,
    completedAt,
  };
}

test('import persists a planning route that Minhas Rotas can load', async () => {
  const storage = new MemoryStorage();
  await saveRouteToStorage(storage, route('planning'));

  assert.equal((await loadCurrentRouteFromStorage(storage))?.status, 'planning');
  assert.equal((await loadHistoryFromStorage(storage)).length, 0);
});

test('planning to active overwrites the current route without duplication', async () => {
  const storage = new MemoryStorage();
  await saveRouteToStorage(storage, route('planning'));
  await saveRouteToStorage(storage, route('active'));

  const reloaded = await loadCurrentRouteFromStorage(storage);
  assert.equal(reloaded?.status, 'active');
  assert.equal(reloaded?.startTime, 1);
  const envelope = JSON.parse(await storage.getItem(KEY_CURRENT));
  assert.equal(envelope.version, 1);
  assert.equal(envelope.route.id, 'route-1');
  assert.match(envelope.savedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal((await loadHistoryFromStorage(storage)).length, 0);
});

test('active route serializes with an envelope and restores metadata safely', async () => {
  const storage = new MemoryStorage();
  await saveRouteToStorage(storage, route('active'));

  const restored = await loadActiveRouteEnvelopeFromStorage(storage);
  assert.equal(restored.route?.id, 'route-1');
  assert.equal(restored.route?.status, 'active');
  assert.equal(restored.recovered, true);
  assert.match(restored.savedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('legacy raw current route storage still restores for migration compatibility', async () => {
  const storage = new MemoryStorage();
  await storage.setItem(KEY_CURRENT, JSON.stringify(route('planning')));

  const restored = await loadActiveRouteEnvelopeFromStorage(storage);
  assert.equal(restored.route?.status, 'planning');
  assert.equal(restored.savedAt, null);
});

test('active to completed keeps history behavior and removes the current route', async () => {
  const storage = new MemoryStorage();
  await saveRouteToStorage(storage, route('active'));
  await saveCompletedRouteToHistory(storage, route('completed'));

  assert.equal(await loadCurrentRouteFromStorage(storage), null);
  assert.equal(await storage.getItem(KEY_CURRENT), null);
  assert.equal((await loadHistoryFromStorage(storage)).length, 1);
  assert.equal(JSON.parse(await storage.getItem(KEY_HISTORY))[0].id, 'route-1');
});

test('planning routes can still be renamed and deleted', async () => {
  const storage = new MemoryStorage();
  await saveRouteToStorage(storage, route('planning'));

  assert.equal(await renameRouteInStorage(storage, 'route-1', 'Nova rota'), true);
  assert.equal((await loadCurrentRouteFromStorage(storage))?.name, 'Nova rota');
  assert.equal(await deleteRouteFromStorage(storage, 'route-1'), true);
  assert.equal(await loadCurrentRouteFromStorage(storage), null);
});

test('renamed current route survives reload and completion history', async () => {
  const storage = new MemoryStorage();
  await saveRouteToStorage(storage, route('active'));

  assert.equal(await renameRouteInStorage(storage, 'route-1', 'Rota Renomeada'), true);

  const reloaded = await loadCurrentRouteFromStorage(storage);
  assert.ok(reloaded);
  assert.equal(reloaded?.name, 'Rota Renomeada');

  await saveCompletedRouteToHistory(storage, { ...reloaded, status: 'completed', durationMinutes: 10 });

  const history = await loadHistoryFromStorage(storage);
  assert.equal(history.length, 1);
  assert.equal(history[0].name, 'Rota Renomeada');
});

test('successful spreadsheet parsing can create and persist a planning route immediately', async () => {
  const storage = new MemoryStorage();
  const rawPackages = [
    {
      trackingNumber: 'PKG-1',
      destinationAddress: 'Rua A, 10',
      zipCode: '01000-000',
      latitude: null,
      longitude: null,
      stopNumber: 1,
    },
    {
      trackingNumber: 'PKG-2',
      destinationAddress: 'Rua A, 10',
      zipCode: '01000-000',
      latitude: null,
      longitude: null,
      stopNumber: 1,
    },
  ];

  const importedRoute = buildPlanningRoute(rawPackages);
  await saveRouteToStorage(storage, importedRoute);

  const saved = await loadCurrentRouteFromStorage(storage);
  assert.equal(saved?.id, importedRoute.id);
  assert.equal(saved?.status, 'planning');
  assert.equal(saved?.totalPackages, 2);
  assert.equal(saved?.stops.length, 1);
});

test('continue can reuse the already-created imported route without duplicating it', async () => {
  const storage = new MemoryStorage();
  const importedRoute = route('planning');

  await saveRouteToStorage(storage, importedRoute);
  await saveRouteToStorage(storage, importedRoute);

  assert.equal((await loadCurrentRouteFromStorage(storage))?.id, importedRoute.id);
  assert.equal((await loadHistoryFromStorage(storage)).length, 0);
});

test('renames multiple completed history routes independently', async () => {
  const storage = new MemoryStorage();
  await storage.setItem(KEY_HISTORY, JSON.stringify([
    historyEntry('route-1', 'Rota 1', '2026-06-24T10:00:00.000Z'),
    historyEntry('route-2', 'Rota 2', '2026-06-24T11:00:00.000Z'),
    historyEntry('route-3', 'Rota 3', '2026-06-24T12:00:00.000Z'),
  ]));

  assert.equal(await renameRouteInStorage(storage, 'route-1', 'Primeira'), true);
  assert.equal(await renameRouteInStorage(storage, 'route-2', 'Segunda'), true);
  assert.equal(await renameRouteInStorage(storage, 'route-3', 'Terceira'), true);

  const history = await loadHistoryFromStorage(storage);
  assert.deepEqual(history.map(entry => entry.name), ['Primeira', 'Segunda', 'Terceira']);
});

test('renames exact completed history entry when duplicate route ids exist', async () => {
  const storage = new MemoryStorage();
  await storage.setItem(KEY_HISTORY, JSON.stringify([
    historyEntry('route-1', 'Rota antiga', '2026-06-24T10:00:00.000Z'),
    historyEntry('route-1', 'Rota mais recente', '2026-06-24T11:00:00.000Z'),
  ]));

  assert.equal(
    await renameRouteInStorage(
      storage,
      'route-1',
      'Rota mais recente renomeada',
      '2026-06-24T11:00:00.000Z'
    ),
    true
  );

  const history = await loadHistoryFromStorage(storage);
  assert.equal(history[0].name, 'Rota antiga');
  assert.equal(history[1].name, 'Rota mais recente renomeada');
});

test('completed route identity takes precedence over a current route with the same id', async () => {
  const storage = new MemoryStorage();
  await saveRouteToStorage(storage, route('planning'));
  await storage.setItem(KEY_HISTORY, JSON.stringify([
    historyEntry('route-1', 'Rota concluida', '2026-06-24T10:00:00.000Z'),
  ]));

  assert.equal(
    await renameRouteInStorage(
      storage,
      'route-1',
      'Historico renomeado',
      '2026-06-24T10:00:00.000Z'
    ),
    true
  );

  assert.equal((await loadCurrentRouteFromStorage(storage))?.name, 'Rota importada');
  assert.equal((await loadHistoryFromStorage(storage))[0].name, 'Historico renomeado');
});

test('later stale completion save does not revert newest history rename', async () => {
  const storage = new MemoryStorage();
  const completedRoute = route('completed');

  await saveCompletedRouteToHistory(storage, completedRoute);
  const [savedEntry] = await loadHistoryFromStorage(storage);
  await renameRouteInStorage(
    storage,
    completedRoute.id,
    'Rota final renomeada',
    savedEntry.completedAt
  );

  await saveCompletedRouteToHistory(storage, completedRoute);

  const history = await loadHistoryFromStorage(storage);
  assert.equal(history.length, 1);
  assert.equal(history[0].name, 'Rota final renomeada');
  assert.equal(history[0].completedAt, savedEntry.completedAt);
  assert.equal(await storage.getItem(KEY_CURRENT), null);
});

test('active route clear happens only after completed history save succeeds', async () => {
  const storage = new FailingHistoryStorage();
  await saveRouteToStorage(storage, route('active'));
  storage.failHistoryWrite = true;

  await assert.rejects(
    () => saveCompletedRouteToHistory(storage, route('completed')),
    /history write failed/
  );

  assert.equal((await loadCurrentRouteFromStorage(storage))?.status, 'active');
  assert.equal(await storage.getItem(KEY_HISTORY), null);
});

test('completed route is not restored as an active route', async () => {
  const storage = new MemoryStorage();
  await saveRouteToStorage(storage, route('completed'));

  assert.equal(await loadCurrentRouteFromStorage(storage), null);
});

test('invalid JSON does not crash and preserves a debug backup', async () => {
  const storage = new MemoryStorage();
  await storage.setItem(KEY_CURRENT, '{invalid json');

  assert.equal(await loadCurrentRouteFromStorage(storage), null);
  assert.equal(await storage.getItem(KEY_CURRENT_CORRUPTED), '{invalid json');
});

test('malformed route data falls back safely without deleting history', async () => {
  const storage = new MemoryStorage();
  await storage.setItem(KEY_CURRENT, JSON.stringify({ version: 1, savedAt: '2026-07-11T10:00:00.000Z', route: { id: 'bad' } }));
  await storage.setItem(KEY_HISTORY, JSON.stringify([historyEntry('done', 'Rota feita', '2026-07-11T11:00:00.000Z')]));

  assert.equal(await loadCurrentRouteFromStorage(storage), null);
  assert.equal((await loadHistoryFromStorage(storage)).length, 1);
  assert.ok(await storage.getItem(KEY_CURRENT_CORRUPTED));
});

test('missing optional route fields are repaired during restore', () => {
  const recovered = validatePersistedRoute({
    id: 'route-repair',
    stops: [{
      packages: [{
        destinationAddress: 'Rua B, 20',
      }],
    }],
  });

  assert.equal(recovered?.name, 'Rota atual');
  assert.equal(recovered?.status, 'planning');
  assert.equal(recovered?.stops[0].packages[0].status, 'pending');
  assert.equal(recovered?.stops[0].packageCount, 1);
});

test('manual order, #P groups, SPX TN and delivered package survive restore', async () => {
  const storage = new MemoryStorage();
  const active = route('active');
  active.name = 'Rota recuperavel';
  active.stops = [
    {
      ...active.stops[0],
      id: 'stop-p',
      stopNumber: 99,
      orderIndex: 0,
      packages: [{
        ...active.stops[0].packages[0],
        id: 'pkg-p',
        trackingNumber: 'SPX-P',
        stopNumber: null,
        status: 'delivered',
      }],
      completedStops: undefined,
      status: 'completed',
    },
    {
      ...active.stops[0],
      id: 'stop-2',
      stopNumber: 2,
      orderIndex: 1,
      packages: [{
        ...active.stops[0].packages[0],
        id: 'pkg-2',
        trackingNumber: 'SPX-2',
        status: 'pending',
      }],
      status: 'pending',
    },
  ];
  active.deliveredPackages = 1;
  active.completedStops = 1;
  active.totalPackages = 2;

  await saveRouteToStorage(storage, active);
  const restored = await loadCurrentRouteFromStorage(storage);

  assert.equal(restored?.name, 'Rota recuperavel');
  assert.deepEqual(restored?.stops.map(stop => stop.id), ['stop-p', 'stop-2']);
  assert.equal(restored?.stops[0].packages[0].trackingNumber, 'SPX-P');
  assert.equal(restored?.stops[0].packages[0].stopNumber, null);
  assert.equal(restored?.stops[0].packages[0].status, 'delivered');
});
