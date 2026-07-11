import assert from 'node:assert/strict';
import test from 'node:test';
import {
  KEY_GEOCODE_CACHE,
  buildGeocodingQuery,
  loadCachedGeocode,
  resolveGeocoding,
  saveCachedGeocode,
} from '../lib/geocoding.ts';
import {
  applyRecoveredMapCoordinates,
  getLocatedMapStops,
  getMapCoordinateSummary,
} from '../lib/mapOverview.ts';
import { buildGoogleMapsSearchUrl } from '../lib/mapNavigation.ts';

class MemoryStorage {
  values = new Map();

  async getItem(key) { return this.values.get(key) ?? null; }
  async setItem(key, value) { this.values.set(key, value); }
}

function missingMapStop(id = 'stop-1') {
  return {
    id,
    order: 1,
    badge: '#1',
    address: 'Rua Juruá, 137',
    zipCode: '03036-010',
    baseAddressKey: 'rua jurua|137',
    missingSpreadsheetStop: false,
    latitude: null,
    longitude: null,
    coordinateStatus: 'missing',
    packageCount: 2,
    deliveredCount: 0,
    occurrenceCount: 0,
    status: 'pending',
  };
}

test('builds geocoding query from street, number, and Brazil fallback', () => {
  assert.equal(
    buildGeocodingQuery({ address: 'Rua Juruá, 137' }),
    'Rua Juruá, 137, Brasil'
  );
});

test('includes safe locality, city, state, postal code, and country details', () => {
  const query = buildGeocodingQuery({
    address: 'Rua Juruá, 137, Canindé',
    zipCode: '03036-010',
    city: 'São Paulo',
    state: 'SP',
    country: 'Brasil',
  });

  assert.equal(query, 'Rua Juruá, 137, Canindé, 03036-010, São Paulo, SP, Brasil');
});

test('excludes delivery complements while preserving useful locality text', () => {
  const query = buildGeocodingQuery({
    address: 'Rua Juruá, 137, Apto 31, Canindé, São Paulo, SP, tocar campainha',
  });

  assert.equal(query, 'Rua Juruá, 137, Canindé, São Paulo, SP, Brasil');
  assert.equal(query.includes('Apto'), false);
  assert.equal(query.includes('campainha'), false);
});

test('cache saves and returns one coordinate per normalized address key', async () => {
  const storage = new MemoryStorage();
  const input = { address: 'R. Juruá, 137', zipCode: '03036-010' };

  await saveCachedGeocode(input, { latitude: -23.52, longitude: -46.61 }, 'test', storage);
  await saveCachedGeocode(
    { address: 'Rua Juruá, 137', zipCode: '03036-010' },
    { latitude: -23.521, longitude: -46.611 },
    'test',
    storage
  );

  const loaded = await loadCachedGeocode(input, storage);
  const collection = JSON.parse(await storage.getItem(KEY_GEOCODE_CACHE));
  assert.equal(Object.keys(collection).length, 1);
  assert.equal(loaded?.latitude, -23.521);
  assert.equal(loaded?.longitude, -46.611);
});

test('an unconfigured provider makes no network request', async () => {
  const storage = new MemoryStorage();
  let calls = 0;
  const provider = {
    name: 'disabled',
    isConfigured: () => false,
    geocode: async () => {
      calls += 1;
      return { latitude: -23.52, longitude: -46.61 };
    },
  };

  const result = await resolveGeocoding({ address: 'Rua Juruá, 137' }, provider, storage);
  assert.equal(result.status, 'not_configured');
  assert.equal(calls, 0);
});

test('cached coordinates recover a marker without mutating original route presentation data', () => {
  const original = [missingMapStop()];
  const recovered = applyRecoveredMapCoordinates(original, {
    'stop-1': { latitude: -23.52, longitude: -46.61 },
  });

  assert.equal(original[0].latitude, null);
  assert.equal(original[0].coordinateStatus, 'missing');
  assert.equal(recovered[0].coordinateStatus, 'recovered');
  assert.equal(getLocatedMapStops(recovered).length, 1);
  assert.equal(getMapCoordinateSummary(recovered).displayedCount, 1);
});

test('unresolved stops remain selectable list data without becoming markers', () => {
  const unresolved = [missingMapStop('stop-missing')];

  assert.equal(unresolved.length, 1);
  assert.equal(unresolved[0].address, 'Rua Juruá, 137');
  assert.equal(getLocatedMapStops(unresolved).length, 0);
});

test('quick navigation uses the existing complement-free Google Maps query', () => {
  const url = buildGoogleMapsSearchUrl('Rua Juruá, 137, Apto 31, Canindé');

  assert.equal(decodeURIComponent(url.split('query=')[1]), 'Rua Juruá, 137');
});
