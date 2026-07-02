import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deletePlaceInfo,
  KEY_PLACE_INTELLIGENCE,
  loadPlaceInfo,
  savePlaceInfo,
} from '../lib/placeIntelligence.ts';

class MemoryStorage {
  values = new Map();

  async getItem(key) {
    return this.values.get(key) ?? null;
  }

  async setItem(key, value) {
    this.values.set(key, value);
  }
}

function place(overrides = {}) {
  return {
    normalizedAddress: 'Rua Coronel Trancoso, 20',
    deliveryType: 'condominio',
    deliveryNote: 'Entregar na recepção',
    localTip: 'Porteiro pede documento',
    updatedAt: '2026-07-02T10:00:00.000Z',
    ...overrides,
  };
}

test('saves PlaceInfo under the dedicated storage key', async () => {
  const storage = new MemoryStorage();
  await savePlaceInfo(place(), storage);

  const collection = JSON.parse(await storage.getItem(KEY_PLACE_INTELLIGENCE));
  assert.equal(Object.keys(collection).length, 1);
  assert.equal(collection['rua coronel trancoso|20'].deliveryType, 'condominio');
});

test('loads the same place through an equivalent address representation', async () => {
  const storage = new MemoryStorage();
  await savePlaceInfo(place(), storage);

  const loaded = await loadPlaceInfo('R. Cel Trancoso, 20 - Fundos', storage);

  assert.equal(loaded?.normalizedAddress, 'Rua Coronel Trancoso, 20');
  assert.equal(loaded?.deliveryNote, 'Entregar na recepção');
  assert.equal(loaded?.localTip, 'Porteiro pede documento');
});

test('deletes only the normalized place entry', async () => {
  const storage = new MemoryStorage();
  await savePlaceInfo(place(), storage);
  await savePlaceInfo(place({
    normalizedAddress: 'Avenida Paulista, 1000',
    deliveryType: 'comercio',
  }), storage);

  await deletePlaceInfo('Rua Cel. Trancoso, 20', storage);

  assert.equal(await loadPlaceInfo('Rua Coronel Trancoso, 20', storage), null);
  assert.equal(
    (await loadPlaceInfo('Av. Paulista, 1000', storage))?.deliveryType,
    'comercio'
  );
});

test('loading absent or malformed storage returns no PlaceInfo', async () => {
  const storage = new MemoryStorage();
  assert.equal(await loadPlaceInfo('Rua Sem Registro, 1', storage), null);

  await storage.setItem(KEY_PLACE_INTELLIGENCE, '{invalid');
  assert.equal(await loadPlaceInfo('Rua Sem Registro, 1', storage), null);
});
