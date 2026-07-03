import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMapStops,
  getLocatedMapStops,
  getMapCoordinateSummary,
  getMapCoordinateState,
} from '../lib/mapOverview.ts';
import { groupPackagesByStop, parseSpreadsheetData } from '../lib/packageUtils.ts';
import {
  loadCurrentRouteFromStorage,
  saveRouteToStorage,
} from '../lib/routePersistence.ts';

class MemoryStorage {
  values = new Map();

  async getItem(key) { return this.values.get(key) ?? null; }
  async setItem(key, value) { this.values.set(key, value); }
  async removeItem(key) { this.values.delete(key); }
}

function rawPackage(id, stopNumber, latitude, longitude) {
  return {
    trackingNumber: id,
    destinationAddress: `Rua Teste, ${stopNumber * 10}`,
    zipCode: '01000-000',
    latitude,
    longitude,
    stopNumber,
  };
}

function route(stops, status = 'planning') {
  return {
    id: 'route-map',
    name: 'Rota com mapa',
    stops,
    status,
    estimatedDistanceKm: 5,
    completedStops: 0,
    totalPackages: stops.reduce((sum, stop) => sum + stop.packageCount, 0),
    deliveredPackages: 0,
    startTime: status === 'active' ? 1 : null,
    durationMinutes: 0,
  };
}

test('map stops preserve the customized route order and use one-based labels', () => {
  const [first, second, third] = groupPackagesByStop([
    rawPackage('A', 1, -23.51, -46.61),
    rawPackage('B', 2, -23.52, -46.62),
    rawPackage('C', 3, -23.53, -46.63),
  ]);
  const reordered = [third, first, second];

  const mapStops = buildMapStops(route(reordered));

  assert.deepEqual(mapStops.map(stop => stop.id), reordered.map(stop => stop.id));
  assert.deepEqual(mapStops.map(stop => stop.order), [1, 2, 3]);
});

test('all coordinate-bearing stops reach the native marker renderer', () => {
  const packages = Array.from({ length: 15 }, (_, index) =>
    rawPackage(
      `PKG-${index + 1}`,
      index + 1,
      -23.50 - index * 0.001,
      -46.60 - index * 0.001
    )
  );
  const mapStops = buildMapStops(route(groupPackagesByStop(packages)));
  const locatedStops = getLocatedMapStops(mapStops);

  assert.equal(mapStops.length, 15);
  assert.equal(locatedStops.length, 15);
  assert.deepEqual(locatedStops.map(stop => stop.order), Array.from({ length: 15 }, (_, index) => index + 1));
});

test('active route marks completed stops and the first remaining stop as current', () => {
  const stops = groupPackagesByStop([
    rawPackage('A', 1, -23.51, -46.61),
    rawPackage('B', 2, -23.52, -46.62),
    rawPackage('C', 3, -23.53, -46.63),
  ]);
  stops[0] = {
    ...stops[0],
    status: 'completed',
    packages: stops[0].packages.map(pkg => ({ ...pkg, status: 'delivered' })),
  };

  assert.deepEqual(
    buildMapStops(route(stops, 'active')).map(stop => stop.status),
    ['completed', 'current', 'pending']
  );
});

test('selected map stop details include normalized address and package count', () => {
  const stops = groupPackagesByStop([
    rawPackage('A', 1, -23.51, -46.61),
    rawPackage('B', 1, -23.51, -46.61),
  ]);

  const [details] = buildMapStops(route(stops));

  assert.equal(details.address, 'Rua Teste, 10');
  assert.equal(details.packageCount, 2);
  assert.equal(details.status, 'pending');
});

test('coordinate availability distinguishes complete, partial, and unavailable routes', () => {
  const complete = buildMapStops(route(groupPackagesByStop([
    rawPackage('A', 1, -23.51, -46.61),
    rawPackage('B', 2, -23.52, -46.62),
  ])));
  const partial = buildMapStops(route(groupPackagesByStop([
    rawPackage('A', 1, -23.51, -46.61),
    rawPackage('B', 2, null, null),
  ])));
  const unavailable = buildMapStops(route(groupPackagesByStop([
    rawPackage('A', 1, null, null),
  ])));

  assert.equal(getMapCoordinateState(complete), 'available');
  assert.equal(getMapCoordinateState(partial), 'partial');
  assert.equal(getMapCoordinateState(unavailable), 'unavailable');
});

test('normal valid coordinates remain unchanged', () => {
  const [stop] = buildMapStops(route(groupPackagesByStop([
    rawPackage('A', 1, -23.5505, -46.6333),
  ])));

  assert.equal(stop.latitude, -23.5505);
  assert.equal(stop.longitude, -46.6333);
  assert.equal(stop.coordinateStatus, 'valid');
});

test('invalid coordinate ranges are rejected', () => {
  const [stop] = buildMapStops(route(groupPackagesByStop([
    rawPackage('A', 1, 95, -46.6333),
  ])));

  assert.equal(stop.latitude, null);
  assert.equal(stop.longitude, null);
  assert.equal(stop.coordinateStatus, 'invalid');
});

test('a swapped route outlier is corrected when swapping makes it clearly closer', () => {
  const stops = groupPackagesByStop([
    rawPackage('A', 1, -23.5505, -46.6333),
    rawPackage('B', 2, -23.5515, -46.6343),
    rawPackage('C', 3, -23.5525, -46.6353),
    rawPackage('D', 4, -46.6363, -23.5535),
  ]);
  const corrected = buildMapStops(route(stops));

  assert.equal(corrected[3].latitude, -23.5535);
  assert.equal(corrected[3].longitude, -46.6363);
  assert.equal(corrected[3].coordinateStatus, 'corrected');
  assert.equal(getLocatedMapStops(corrected).length, 4);
});

test('an unfixable extreme route outlier is excluded from markers but kept in the list', () => {
  const stops = groupPackagesByStop([
    rawPackage('A', 1, -23.5505, -46.6333),
    rawPackage('B', 2, -23.5515, -46.6343),
    rawPackage('C', 3, -23.5525, -46.6353),
    rawPackage('D', 4, 0, 0),
  ]);
  const mapStops = buildMapStops(route(stops));
  const summary = getMapCoordinateSummary(mapStops);

  assert.equal(mapStops.length, 4);
  assert.equal(mapStops[3].coordinateStatus, 'invalid');
  assert.equal(mapStops[3].latitude, null);
  assert.equal(mapStops[3].address, 'Rua Teste, 40');
  assert.equal(getLocatedMapStops(mapStops).length, 3);
  assert.deepEqual(summary, {
    totalCount: 4,
    displayedCount: 3,
    correctedCount: 0,
    invalidCount: 1,
    missingCount: 0,
  });
});

test('selecting a stop without coordinates keeps every route item and marker candidate stable', () => {
  const mapStops = buildMapStops(route(groupPackagesByStop([
    rawPackage('A', 1, -23.5505, -46.6333),
    rawPackage('B', 2, -23.5515, -46.6343),
    rawPackage('C', 3, null, null),
  ])));
  const markersBeforeSelection = getLocatedMapStops(mapStops);
  const selected = mapStops.find(stop => stop.id === 'stop-3');
  const markersAfterSelection = getLocatedMapStops(mapStops);

  assert.equal(mapStops.length, 3);
  assert.equal(selected?.address, 'Rua Teste, 30');
  assert.equal(selected?.packageCount, 1);
  assert.equal(selected?.coordinateStatus, 'missing');
  assert.deepEqual(markersAfterSelection, markersBeforeSelection);
});

test('spreadsheet latitude and longitude are parsed safely, including zero', () => {
  const parsed = parseSpreadsheetData(
    [['PKG-1', 'Rua Teste, 10', '1', '0', '-46,6333']],
    ['SPX TN', 'Endereço', 'Stop', 'Latitude', 'Longitude']
  );

  assert.equal(parsed[0].latitude, 0);
  assert.equal(parsed[0].longitude, -46.6333);
});

test('route coordinates survive the existing current-route persistence round trip', async () => {
  const storage = new MemoryStorage();
  const original = route(groupPackagesByStop([
    rawPackage('A', 1, -23.5505, -46.6333),
  ]));

  await saveRouteToStorage(storage, original);
  const reloaded = await loadCurrentRouteFromStorage(storage);

  assert.equal(reloaded?.stops[0].latitude, -23.5505);
  assert.equal(reloaded?.stops[0].longitude, -46.6333);
});
