import assert from 'node:assert/strict';
import test from 'node:test';
import {
  KEY_GEOCODE_CACHE,
  buildCanonicalNavigationAddress,
  buildGeocodingQuery,
  buildStopGeocodingInput,
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
import { groupPackagesByStop, parseSpreadsheetData } from '../lib/packageUtils.ts';

const JURUA = 'Rua Juru\u00e1, 137';
const CANINDE = 'Canind\u00e9';
const SAO_PAULO = 'S\u00e3o Paulo';
const ANTONIO = 'Rua Ant\u00f4nio dos Santos Neto, 629';

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
    address: JURUA,
    navigationAddress: `${JURUA}, 03036-010, Brasil`,
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
    buildGeocodingQuery({ address: JURUA }),
    `${JURUA}, Brasil`
  );
});

test('includes safe locality, city, state, postal code, and country details', () => {
  const query = buildGeocodingQuery({
    address: `${JURUA}, ${CANINDE}`,
    zipCode: '03036-010',
    city: SAO_PAULO,
    state: 'SP',
    country: 'Brasil',
  });

  assert.equal(query, `${JURUA}, ${CANINDE}, ${SAO_PAULO}, SP, 03036-010, Brasil`);
});

test('canonical navigation address uses street, number, city, state, CEP, and Brazil', () => {
  assert.equal(
    buildCanonicalNavigationAddress({
      address: `${ANTONIO}, APTO 2`,
      city: SAO_PAULO,
      state: 'SP',
      zipCode: '02000-000',
    }),
    `${ANTONIO}, ${SAO_PAULO}, SP, 02000-000, Brasil`
  );
});

test('spreadsheet city and state fields feed stop geocoding input without altering package address', () => {
  const fullAddress = `${ANTONIO}, APTO 2`;
  const rawPackages = parseSpreadsheetData(
    [
      ['BR1', fullAddress, '02000-000', SAO_PAULO, 'SP', '1'],
    ],
    ['SPX TN', 'Endere\u00e7o', 'CEP', 'Cidade', 'UF', 'Stop']
  );
  const [stop] = groupPackagesByStop(rawPackages);
  const input = buildStopGeocodingInput(stop);

  assert.equal(stop.packages[0].destinationAddress, fullAddress);
  assert.equal(input.city, SAO_PAULO);
  assert.equal(input.state, 'SP');
  assert.equal(
    buildCanonicalNavigationAddress(input),
    `${ANTONIO}, ${SAO_PAULO}, SP, 02000-000, Brasil`
  );
});

test('excludes delivery complements while preserving useful locality text', () => {
  const query = buildGeocodingQuery({
    address: `${JURUA}, Apto 31, ${CANINDE}, ${SAO_PAULO}, SP, tocar campainha`,
  });

  assert.equal(query, `${JURUA}, ${CANINDE}, ${SAO_PAULO}, SP, Brasil`);
  assert.equal(query.includes('Apto'), false);
  assert.equal(query.includes('campainha'), false);
});

test('cache saves and returns one coordinate per normalized address key', async () => {
  const storage = new MemoryStorage();
  const input = { address: 'R. Juru\u00e1, 137', zipCode: '03036-010' };

  await saveCachedGeocode(input, { latitude: -23.52, longitude: -46.61 }, 'test', storage);
  await saveCachedGeocode(
    { address: JURUA, zipCode: '03036-010' },
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

  const result = await resolveGeocoding({ address: JURUA }, provider, storage);
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
  assert.equal(unresolved[0].address, JURUA);
  assert.equal(getLocatedMapStops(unresolved).length, 0);
});

test('quick navigation uses the existing complement-free Google Maps query', () => {
  const url = buildGoogleMapsSearchUrl(`${JURUA}, Apto 31, ${CANINDE}`);

  assert.equal(decodeURIComponent(url.split('query=')[1]), JURUA);
});
