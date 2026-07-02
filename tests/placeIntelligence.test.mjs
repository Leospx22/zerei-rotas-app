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

test('updates an existing PlaceInfo without creating a duplicate address entry', async () => {
  const storage = new MemoryStorage();
  await savePlaceInfo(place(), storage);
  await savePlaceInfo(place({
    deliveryType: 'portaria',
    parkingNote: 'Em frente',
    accessNote: 'Portaria 24h',
    updatedAt: '2026-07-02T11:00:00.000Z',
  }), storage);

  const collection = JSON.parse(await storage.getItem(KEY_PLACE_INTELLIGENCE));
  const loaded = await loadPlaceInfo('R. Cel. Trancoso, 20', storage);

  assert.equal(Object.keys(collection).length, 1);
  assert.equal(loaded?.deliveryType, 'portaria');
  assert.equal(loaded?.parkingNote, 'Em frente');
  assert.equal(loaded?.accessNote, 'Portaria 24h');
  assert.equal(loaded?.updatedAt, '2026-07-02T11:00:00.000Z');
});

test('loads the same place through an equivalent address representation', async () => {
  const storage = new MemoryStorage();
  await savePlaceInfo(place(), storage);

  const loaded = await loadPlaceInfo('R. Cel Trancoso, 20 - Fundos', storage);

  assert.equal(loaded?.normalizedAddress, 'Rua Coronel Trancoso, 20');
  assert.equal(loaded?.deliveryNote, 'Entregar na recepção');
  assert.equal(loaded?.localTip, 'Porteiro pede documento');
});

test('keeps PlaceInfo isolated for separate normalized address groups', async () => {
  const storage = new MemoryStorage();
  await savePlaceInfo(place({
    normalizedAddress: 'Rua Coronel Trancoso, 20',
    deliveryNote: 'Portaria',
  }), storage);
  await savePlaceInfo(place({
    normalizedAddress: 'Rua Coronel Trancoso, 34',
    deliveryType: 'comercio',
    deliveryNote: 'Loja',
  }), storage);

  const address20 = await loadPlaceInfo('R. Cel. Trancoso, 20 - Fundos', storage);
  const address34 = await loadPlaceInfo('Rua Cel Trancoso, 34, Loja A', storage);

  assert.equal(address20?.deliveryNote, 'Portaria');
  assert.equal(address34?.deliveryType, 'comercio');
  assert.equal(address34?.deliveryNote, 'Loja');
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
