import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deleteRouteFromStorage,
  KEY_CURRENT,
  KEY_HISTORY,
  loadCurrentRouteFromStorage,
  loadHistoryFromStorage,
  renameRouteInStorage,
  saveCompletedRouteToHistory,
  saveRouteToStorage,
} from '../lib/routePersistence.ts';
import { buildPlanningRoute } from '../lib/packageUtils.ts';

class MemoryStorage {
  values = new Map();

  async getItem(key) { return this.values.get(key) ?? null; }
  async setItem(key, value) { this.values.set(key, value); }
  async removeItem(key) { this.values.delete(key); }
}

function route(status) {
  return {
    id: 'route-1',
    name: 'Rota importada',
    stops: [],
    status,
    estimatedDistanceKm: 0,
    completedStops: 0,
    totalPackages: 3,
    deliveredPackages: status === 'completed' ? 3 : 0,
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

  assert.equal((await loadCurrentRouteFromStorage(storage))?.status, 'active');
  assert.equal(JSON.parse(await storage.getItem(KEY_CURRENT)).id, 'route-1');
  assert.equal((await loadHistoryFromStorage(storage)).length, 0);
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
