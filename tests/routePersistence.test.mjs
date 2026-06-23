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
