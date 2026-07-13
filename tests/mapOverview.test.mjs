import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSafeInitialRegion,
  buildSafeMapPayload,
  buildMapStops,
  getLocatedMapStops,
  getMapCoordinateSummary,
  getMapCoordinateState,
  isFiniteCoordinate,
  isNativeRouteMapFeatureEnabled,
  isValidCoordinatePair,
  shouldAttemptNativeRouteMap,
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

test('map badges exclude Prioridade Shopee from regular numbering', () => {
  const stops = groupPackagesByStop(parseSpreadsheetData(
    [
      ['PKG-P', 'Rua Prioridade, 9', '', '', ''],
      ['PKG-1', 'Rua Regular, 10', '1', '-23.51', '-46.61'],
      ['PKG-2', 'Rua Regular, 20', '2', '-23.52', '-46.62'],
    ],
    ['SPX TN', 'Endereço', 'Stop', 'Latitude', 'Longitude']
  ));

  const mapStops = buildMapStops(route(stops));

  assert.deepEqual(mapStops.map(stop => stop.badge), ['#P', '#1', '#2']);
  assert.deepEqual(mapStops.map(stop => stop.missingSpreadsheetStop), [true, false, false]);
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

test('safe native map payload rejects NaN, Infinity, and malformed coordinates', () => {
  assert.equal(isFiniteCoordinate(Number.NaN), false);
  assert.equal(isFiniteCoordinate(Number.POSITIVE_INFINITY), false);
  assert.equal(isValidCoordinatePair(Number.NaN, -46.6), false);
  assert.equal(isValidCoordinatePair(-23.5, Number.POSITIVE_INFINITY), false);
  assert.equal(buildSafeInitialRegion({ latitude: Number.NaN, longitude: -46.6 }), null);

  const malformedStops = [
    { ...buildMapStops(route(groupPackagesByStop([rawPackage('A', 1, -23.5, -46.6)])))[0], latitude: Number.NaN },
    { ...buildMapStops(route(groupPackagesByStop([rawPackage('B', 2, -23.6, -46.7)])))[0], longitude: Number.POSITIVE_INFINITY },
  ];
  const payload = buildSafeMapPayload(malformedStops, 'stop-1');

  assert.equal(payload.canRenderNativeMap, false);
  assert.equal(payload.markers.length, 0);
  assert.equal(payload.initialRegion, null);
});

test('native Android map feature flag keeps missing or false values on the safe fallback', () => {
  assert.equal(isNativeRouteMapFeatureEnabled(undefined), false);
  assert.equal(isNativeRouteMapFeatureEnabled('false'), false);
  assert.equal(isNativeRouteMapFeatureEnabled('true'), true);
  assert.equal(shouldAttemptNativeRouteMap(true, 'android', undefined), false);
  assert.equal(shouldAttemptNativeRouteMap(true, 'android', 'false'), false);
  assert.equal(shouldAttemptNativeRouteMap(true, 'android', 'true'), true);
  assert.equal(shouldAttemptNativeRouteMap(true, 'web', undefined), true);
  assert.equal(shouldAttemptNativeRouteMap(false, 'android', 'true'), false);
});

test('safe native map payload handles zero, one, and multiple coordinates without unsafe polylines', () => {
  const zero = buildSafeMapPayload(buildMapStops(route(groupPackagesByStop([
    rawPackage('A', 1, null, null),
  ]))), null);
  assert.equal(zero.canRenderNativeMap, false);
  assert.deepEqual(zero.polylineCoordinates, []);

  const one = buildSafeMapPayload(buildMapStops(route(groupPackagesByStop([
    rawPackage('A', 1, -23.5, -46.6),
  ]))), 'missing-selected');
  assert.equal(one.canRenderNativeMap, true);
  assert.equal(one.markers.length, 1);
  assert.equal(one.selectedStopId, one.markers[0].stop.id);
  assert.deepEqual(one.polylineCoordinates, []);
  assert.deepEqual(one.initialRegion, {
    latitude: -23.5,
    longitude: -46.6,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  });

  const many = buildSafeMapPayload(buildMapStops(route(groupPackagesByStop([
    rawPackage('A', 1, -23.5, -46.6),
    rawPackage('B', 2, -23.6, -46.7),
  ]))), null);
  assert.equal(many.canRenderNativeMap, true);
  assert.equal(many.polylineCoordinates.length, 2);
  assert.deepEqual(many.markers.map(marker => marker.key), ['stop-1', 'stop-2']);
});

test('safe native map payload removes duplicate marker keys before native rendering', () => {
  const [first, second] = buildMapStops(route(groupPackagesByStop([
    rawPackage('A', 1, -23.5, -46.6),
    rawPackage('B', 2, -23.6, -46.7),
  ])));
  const duplicate = { ...second, id: first.id };
  const payload = buildSafeMapPayload([first, duplicate], first.id);

  assert.equal(payload.markers.length, 1);
  assert.deepEqual(payload.markers.map(marker => marker.key), [first.id]);
  assert.equal(payload.polylineCoordinates.length, 0);
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

test('same normalized address reuses valid coordinates for missing duplicate stops', () => {
  const stops = groupPackagesByStop([
    {
      ...rawPackage('A', 1, -23.5505, -46.6333),
      destinationAddress: 'Avenida Ipiranga, 879',
    },
    {
      ...rawPackage('B', 2, null, null),
      destinationAddress: 'Av. Ipiranga, 879, Bloco B',
    },
  ]);
  const mapStops = buildMapStops(route(stops));

  assert.equal(mapStops[1].latitude, -23.5505);
  assert.equal(mapStops[1].longitude, -46.6333);
  assert.equal(mapStops[1].coordinateStatus, 'recovered');
  assert.deepEqual(getLocatedMapStops(mapStops).map(stop => stop.order), [1, 2]);
});

test('coordinate inheritance does not cross different street numbers', () => {
  const stops = groupPackagesByStop([
    {
      ...rawPackage('A', 1, -23.5505, -46.6333),
      destinationAddress: 'Avenida Ipiranga, 879',
    },
    {
      ...rawPackage('B', 2, null, null),
      destinationAddress: 'Avenida Ipiranga, 880',
    },
  ]);
  const mapStops = buildMapStops(route(stops));

  assert.equal(mapStops[1].latitude, null);
  assert.equal(mapStops[1].longitude, null);
  assert.equal(mapStops[1].coordinateStatus, 'missing');
});

test('invalid coordinates are not propagated to duplicate addresses', () => {
  const stops = groupPackagesByStop([
    {
      ...rawPackage('A', 1, 95, -46.6333),
      destinationAddress: 'Avenida Ipiranga, 879',
    },
    {
      ...rawPackage('B', 2, null, null),
      destinationAddress: 'Av. Ipiranga, 879, Loja',
    },
  ]);
  const mapStops = buildMapStops(route(stops));

  assert.equal(mapStops[0].coordinateStatus, 'invalid');
  assert.equal(mapStops[1].coordinateStatus, 'missing');
  assert.equal(getLocatedMapStops(mapStops).length, 0);
});

test('multiple duplicate stops reuse the valid coordinate and keep saved route order', () => {
  const stops = groupPackagesByStop([
    {
      ...rawPackage('A', 1, -23.5505, -46.6333),
      destinationAddress: 'Rua Duplicada, 20',
    },
    {
      ...rawPackage('B', 2, null, null),
      destinationAddress: 'R. Duplicada, 20, APTO 1',
    },
    {
      ...rawPackage('C', 3, null, null),
      destinationAddress: 'Rua Duplicada, 20 - Fundos',
    },
  ]);
  const mapStops = buildMapStops(route([stops[2], stops[0], stops[1]]));

  assert.deepEqual(mapStops.map(stop => stop.order), [1, 2, 3]);
  assert.equal(getLocatedMapStops(mapStops).length, 3);
  assert.deepEqual(
    mapStops.map(stop => [stop.latitude, stop.longitude, stop.coordinateStatus]),
    [
      [-23.5505, -46.6333, 'recovered'],
      [-23.5505, -46.6333, 'valid'],
      [-23.5505, -46.6333, 'recovered'],
    ]
  );
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
