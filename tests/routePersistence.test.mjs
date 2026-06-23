import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deleteRouteFromStorage,
  getRouteStorage,
  KEY_CURRENT,
  KEY_HISTORY,
  loadCurrentRouteFromStorage,
  loadHistoryFromStorage,
  renameRouteInStorage,
  saveCompletedRouteToHistory,
  saveRouteToStorage,
} from '../lib/routePersistence.ts';

class MemoryStorage {
  values = new Map();

  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
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

test('import persists a planning route that Minhas Rotas can load', () => {
  const storage = new MemoryStorage();
  saveRouteToStorage(storage, route('planning'));

  assert.equal(loadCurrentRouteFromStorage(storage)?.status, 'planning');
  assert.equal(loadHistoryFromStorage(storage).length, 0);
});

test('planning to active overwrites the current route without duplication', () => {
  const storage = new MemoryStorage();
  saveRouteToStorage(storage, route('planning'));
  saveRouteToStorage(storage, route('active'));

  assert.equal(loadCurrentRouteFromStorage(storage)?.status, 'active');
  assert.equal(JSON.parse(storage.getItem(KEY_CURRENT)).id, 'route-1');
  assert.equal(loadHistoryFromStorage(storage).length, 0);
});

test('active to completed keeps history behavior and removes the current route', () => {
  const storage = new MemoryStorage();
  saveRouteToStorage(storage, route('active'));
  saveCompletedRouteToHistory(storage, route('completed'));

  assert.equal(loadCurrentRouteFromStorage(storage), null);
  assert.equal(storage.getItem(KEY_CURRENT), null);
  assert.equal(loadHistoryFromStorage(storage).length, 1);
  assert.equal(JSON.parse(storage.getItem(KEY_HISTORY))[0].id, 'route-1');
});

test('planning routes can still be renamed and deleted', () => {
  const storage = new MemoryStorage();
  saveRouteToStorage(storage, route('planning'));

  assert.equal(renameRouteInStorage(storage, 'route-1', 'Nova rota'), true);
  assert.equal(loadCurrentRouteFromStorage(storage)?.name, 'Nova rota');
  assert.equal(deleteRouteFromStorage(storage, 'route-1'), true);
  assert.equal(loadCurrentRouteFromStorage(storage), null);
});

test('falls back to shared memory storage when localStorage is unavailable', () => {
  const previous = globalThis.localStorage;
  try {
    delete globalThis.localStorage;
    const storage = getRouteStorage();
    saveRouteToStorage(storage, route('planning'));

    assert.equal(loadCurrentRouteFromStorage(getRouteStorage())?.status, 'planning');
  } finally {
    if (previous) globalThis.localStorage = previous;
  }
});
