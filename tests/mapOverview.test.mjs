import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMapStops, getMapCoordinateState } from '../lib/mapOverview.ts';
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
