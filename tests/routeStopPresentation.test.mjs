import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatRouteOrderBadge,
  formatStopBadge,
  getBestManualAddress,
  getDuplicateAddressWarning,
  MISSING_STOP_BADGE,
  MISSING_STOP_DESCRIPTION,
  UNRESOLVED_COORDINATE_LABEL,
} from '../lib/routeStopPresentation.ts';
import { groupPackagesByStop, parseSpreadsheetData } from '../lib/packageUtils.ts';

function rawPackage(id, stopNumber, address, latitude = null, longitude = null) {
  return {
    trackingNumber: id,
    destinationAddress: address,
    zipCode: '01000-000',
    latitude,
    longitude,
    stopNumber,
  };
}

test('formats compact stop badges, including missing spreadsheet stops as #P', () => {
  const [numbered, missing] = groupPackagesByStop([
    rawPackage('A', 12, 'Rua Teste, 12'),
    rawPackage('B', null, 'Rua Sem Stop, 9'),
  ]);

  assert.equal(formatStopBadge(12), '#12');
  assert.equal(formatStopBadge(numbered), '#12');
  assert.equal(formatStopBadge(missing), MISSING_STOP_BADGE);
  assert.equal(formatRouteOrderBadge(missing, 1), '#P');
  assert.equal(MISSING_STOP_DESCRIPTION, 'Sem número de parada na planilha');
});

test('duplicate warning names one exact matching numbered stop', () => {
  const stops = groupPackagesByStop([
    rawPackage('A', 5, 'Rua Igual, 10'),
    rawPackage('B', 7, 'R. Igual, 10, APTO 3'),
  ]);

  assert.equal(
    getDuplicateAddressWarning(stops, stops[0]),
    'Esta parada #5 tem o mesmo endereço da parada #7.'
  );
});

test('duplicate warning names multiple exact matching numbered stops', () => {
  const stops = groupPackagesByStop([
    rawPackage('A', 5, 'Rua Igual, 10'),
    rawPackage('B', 7, 'Rua Igual, 10, Loja'),
    rawPackage('C', 12, 'R. Igual, 10 - Fundos'),
  ]);

  assert.equal(
    getDuplicateAddressWarning(stops, stops[0]),
    'Esta parada #5 tem o mesmo endereço das paradas #7 e #12.'
  );
});

test('duplicate warning handles #P to numbered and numbered to #P matches', () => {
  const stops = groupPackagesByStop([
    rawPackage('A', null, 'Avenida Ipiranga, 879, bloco B'),
    rawPackage('B', 7, 'Av Ipiranga, 879'),
  ]);
  const missing = stops.find(stop => formatStopBadge(stop) === '#P');
  const numbered = stops.find(stop => formatStopBadge(stop) === '#7');

  assert.equal(
    getDuplicateAddressWarning(stops, missing),
    'Esta parada #P tem o mesmo endereço da parada #7.'
  );
  assert.equal(
    getDuplicateAddressWarning(stops, numbered),
    'Esta parada #7 tem o mesmo endereço da parada #P.'
  );
});

test('duplicate warning avoids ambiguous repeated #P wording', () => {
  const stops = groupPackagesByStop([
    rawPackage('A', 5, 'Rua Igual, 10'),
    rawPackage('B', null, 'Rua Igual, 10, APTO 1'),
  ]);
  const extraMissing = {
    ...stops[1],
    id: 'legacy-missing-duplicate',
    packages: stops[1].packages.map(pkg => ({
      ...pkg,
      id: `${pkg.id}-legacy`,
      destinationAddress: 'R. Igual, 10 - Fundos',
    })),
  };
  const legacyCompatibleStops = [stops[0], stops[1], extraMissing];

  assert.equal(
    getDuplicateAddressWarning(legacyCompatibleStops, stops[0]),
    'Esta parada #5 também corresponde a 2 paradas sem número.'
  );
});

test('different street numbers do not match as duplicate stops', () => {
  const stops = groupPackagesByStop([
    rawPackage('A', 5, 'Rua Igual, 10'),
    rawPackage('B', 7, 'Rua Igual, 11'),
  ]);

  assert.equal(getDuplicateAddressWarning(stops, stops[0]), null);
});

test('manual address copy text uses street number, zip code, and Brazil fallback', () => {
  assert.equal(
    getBestManualAddress({ address: 'Rua Juruá, 137, APTO 2', zipCode: '03052-020' }),
    'Rua Juruá, 137, 03052-020, Brasil'
  );
  assert.equal(UNRESOLVED_COORDINATE_LABEL, 'Insira o endereço manualmente');
});

test('blank, dash, and invalid imported stop values remain movable #P groups', () => {
  const rawPackages = parseSpreadsheetData(
    [
      ['PKG-1', 'Rua Sem Parada, 10', ''],
      ['PKG-2', 'Rua Sem Parada, 11', '-'],
      ['PKG-3', 'Rua Sem Parada, 12', 'abc'],
    ],
    ['SPX TN', 'Endereço', 'Stop']
  );
  const stops = groupPackagesByStop(rawPackages);

  assert.equal(stops.length, 3);
  assert.deepEqual(stops.map(stop => formatRouteOrderBadge(stop, stop.orderIndex + 1)), ['#P', '#P', '#P']);
  assert.deepEqual(stops.map(stop => stop.orderIndex), [0, 1, 2]);
});
