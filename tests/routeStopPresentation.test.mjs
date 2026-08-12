import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getPackagePrimaryLabel,
  getPackageSecondaryLabel,
  groupPackagesByStop,
  parseSpreadsheetData,
} from '../lib/packageUtils.ts';
import {
  buildDisplayedRoutePositions,
  buildDuplicateAddressWarnings,
  formatRouteOrderBadge,
  formatStopBadge,
  getBestManualAddress,
  getDuplicateAddressSummaryCount,
  getDuplicateAddressWarning,
  MISSING_STOP_BADGE,
  MISSING_STOP_DESCRIPTION,
  SHOPEE_PRIORITY_LABEL,
  UNRESOLVED_COORDINATE_LABEL,
} from '../lib/routeStopPresentation.ts';

function rawPackage(id, stopNumber, address, latitude = null, longitude = null, sequence = undefined) {
  return {
    trackingNumber: id,
    sequence,
    destinationAddress: address,
    zipCode: '01000-000',
    latitude,
    longitude,
    stopNumber,
  };
}

test('package labels prioritize Sequence and keep SPX TN as secondary', () => {
  const pkg = { trackingNumber: 'BR269806920895T', sequence: '18' };

  assert.equal(getPackagePrimaryLabel(pkg), 'Seq. 18');
  assert.equal(getPackageSecondaryLabel(pkg), 'SPX TN: BR269806920895T');
});

test('package labels fall back to SPX TN when Sequence is missing', () => {
  const pkg = { trackingNumber: 'BR269806920895T' };

  assert.equal(getPackagePrimaryLabel(pkg), 'SPX TN: BR269806920895T');
  assert.equal(getPackageSecondaryLabel(pkg), null);
});

test('spreadsheet parser preserves Sequence as package identity context', () => {
  const rawPackages = parseSpreadsheetData(
    [['18', 'BR269806920895T', 'Rua Sequencia, 10', '3']],
    ['Sequence', 'SPX TN', 'Endereco', 'Stop']
  );
  const [stop] = groupPackagesByStop(rawPackages);

  assert.equal(rawPackages[0].sequence, '18');
  assert.equal(stop.packages[0].sequence, '18');
  assert.equal(getPackagePrimaryLabel(stop.packages[0]), 'Seq. 18');
  assert.equal(getPackageSecondaryLabel(stop.packages[0]), 'SPX TN: BR269806920895T');
});

test('formats compact stop badges, including Prioridade Shopee as #P', () => {
  const stops = groupPackagesByStop([
    rawPackage('A', 12, 'Rua Teste, 12'),
    rawPackage('B', null, 'Rua Sem Stop, 9'),
  ]);
  const numbered = stops.find(stop => formatStopBadge(stop) === '#12');
  const priority = stops.find(stop => formatStopBadge(stop) === '#P');

  assert.equal(formatStopBadge(12), '#12');
  assert.equal(formatStopBadge(numbered), '#12');
  assert.equal(formatStopBadge(priority), MISSING_STOP_BADGE);
  assert.equal(formatRouteOrderBadge(priority, 1), '#P');
  assert.equal(SHOPEE_PRIORITY_LABEL, 'Prioridade Shopee');
  assert.equal(MISSING_STOP_DESCRIPTION, 'Sem número de parada e sequência na planilha');
});

test('same street and number merge into one stop regardless of complement or imported Stop', () => {
  const stops = groupPackagesByStop([
    rawPackage('A', 5, 'Rua Igual, 10'),
    rawPackage('B', 7, 'R. Igual, 10, APTO 3'),
    rawPackage('C', 12, 'Rua Igual, 10 - Fundos'),
  ]);

  assert.equal(stops.length, 1);
  assert.equal(stops[0].normalizedAddress, 'Rua Igual, 10');
  assert.equal(stops[0].packageCount, 3);
  assert.equal(stops[0].packages.length, 3);
  assert.equal(getDuplicateAddressWarning(stops, stops[0]), null);
  assert.deepEqual(buildDuplicateAddressWarnings(stops), {});
  assert.equal(getDuplicateAddressSummaryCount(stops), 0);
});

test('different street numbers never merge', () => {
  const stops = groupPackagesByStop([
    rawPackage('A', 5, 'Rua Igual, 10'),
    rawPackage('B', 7, 'Rua Igual, 11'),
    rawPackage('C', 8, 'R. Igual, 799, APTO 1'),
  ]);

  assert.equal(stops.length, 3);
  assert.deepEqual(stops.map(stop => stop.normalizedAddress), [
    'Rua Igual, 10',
    'Rua Igual, 11',
    'Rua Igual, 799',
  ]);
});

test('smart grouping detects blocks and units below the street-number stop', () => {
  const stops = groupPackagesByStop([
    rawPackage('A', 5, 'Rua Igual, 10, Bloco A apto 101'),
    rawPackage('B', null, 'Rua Igual, 10, BL A apto 102'),
    rawPackage('C', null, 'Rua Igual, 10, Torre B sala 9'),
    rawPackage('D', null, 'Rua Igual, 10, loja'),
  ]);
  const [addressGroup] = stops[0].addressGroups;

  assert.equal(stops.length, 1);
  assert.equal(stops[0].packageCount, 4);
  assert.equal(addressGroup.isCondominium, true);
  assert.equal(addressGroup.blockCount, 2);
  assert.deepEqual(addressGroup.blockGroups.map(block => block.name), ['Bloco A', 'Torre B', 'Sem bloco']);
  assert.deepEqual(
    addressGroup.blockGroups.flatMap(block => block.units.map(unit => unit.label)),
    ['Apto 101', 'Apto 102', 'Sala 9', 'Loja']
  );
  assert.equal(
    addressGroup.blockGroups.reduce((sum, block) => sum + block.packageCount, 0),
    stops[0].packageCount
  );
});

test('priority and numbered packages at the same address merge into the numbered stop', () => {
  const stops = groupPackagesByStop([
    rawPackage('A', null, 'Avenida Ipiranga, 879, bloco B'),
    rawPackage('B', 7, 'Av Ipiranga, 879'),
  ]);

  assert.equal(stops.length, 1);
  assert.equal(formatStopBadge(stops[0]), '#7');
  assert.equal(stops[0].packageCount, 2);
});

test('blank, dash, and invalid imported stop values remain movable #P groups by address', () => {
  const rawPackages = parseSpreadsheetData(
    [
      ['PKG-1', 'Rua Sem Parada, 10', ''],
      ['PKG-2', 'Rua Sem Parada, 11', '-'],
      ['PKG-3', 'Rua Sem Parada, 12', 'abc'],
    ],
    ['SPX TN', 'Endereco', 'Stop']
  );
  const stops = groupPackagesByStop(rawPackages);

  assert.equal(stops.length, 3);
  assert.deepEqual(stops.map(stop => formatRouteOrderBadge(stop, stop.orderIndex + 1)), ['#P', '#P', '#P']);
  assert.deepEqual(stops.map(stop => stop.orderIndex), [0, 1, 2]);
});

test('Prioridade Shopee groups appear before numbered stops after import', () => {
  const rawPackages = parseSpreadsheetData(
    [
      ['PKG-1', 'Rua Numerada, 10', '5'],
      ['PKG-2', 'Rua Sem Parada, 20', ''],
      ['PKG-3', 'Rua Numerada, 11', '6'],
    ],
    ['SPX TN', 'Endereco', 'Stop']
  );
  const stops = groupPackagesByStop(rawPackages);

  assert.deepEqual(buildDisplayedRoutePositions(stops).map(position => position.badge), ['#P', '#1', '#2']);
  assert.equal(stops[0].packages[0].trackingNumber, 'PKG-2');
});

test('missing Stop with a valid Sequence is not treated as Prioridade Shopee', () => {
  const stops = groupPackagesByStop([
    rawPackage('S', null, 'Rua Sequencia Sem Stop, 1', null, null, '99'),
    rawPackage('A', 4, 'Rua Regular, 4'),
  ]);
  const sequenceStop = stops.find(stop => stop.packages.some(pkg => pkg.trackingNumber === 'S'));

  assert.deepEqual(buildDisplayedRoutePositions(stops).map(position => position.badge), ['#1', '#2']);
  assert.equal(sequenceStop.packages[0].stopNumber, null);
  assert.equal(sequenceStop.packages[0].sequence, '99');
});

test('manual address copy text uses street number, city, state, zip code, and Brazil fallback', () => {
  assert.equal(
    getBestManualAddress({
      address: 'Rua Jurua, 137, APTO 2',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '03052-020',
    }),
    'Rua Jurua, 137, Sao Paulo, SP, 03052-020, Brasil'
  );
  assert.equal(UNRESOLVED_COORDINATE_LABEL, 'Insira o endereço manualmente');
});

test('physical-route-sized import preserves labels, package totals, and merges duplicate addresses', () => {
  const rows = [];
  for (let i = 1; i <= 48; i++) {
    const duplicatedAddress = i === 10 || i === 20 ? 'Rua Duplicada, 100' : `Rua Grande, ${i}`;
    rows.push([`BR-${i}-A`, String(i), duplicatedAddress, 'Sao Paulo', 'SP', '01000-000', String(i)]);
    rows.push([`BR-${i}-B`, String(i + 100), duplicatedAddress, 'Sao Paulo', 'SP', '01000-000', String(i)]);
  }
  for (let i = 0; i < 18; i++) {
    rows.push([`BR-P-${i}`, '', `Rua Prioridade, ${i % 3}`, 'Sao Paulo', 'SP', '01000-000', '']);
  }

  const rawPackages = parseSpreadsheetData(
    rows,
    ['SPX TN', 'Sequence', 'Endereco', 'Cidade', 'UF', 'CEP', 'Stop']
  );
  const stops = groupPackagesByStop(rawPackages);
  const positions = buildDisplayedRoutePositions(stops);

  assert.equal(rawPackages.length, 114);
  assert.equal(stops.reduce((sum, stop) => sum + stop.packages.length, 0), 114);
  assert.deepEqual(positions.slice(0, 3).map(position => position.badge), ['#P', '#P', '#P']);
  assert.equal(stops.filter(stop => stop.normalizedAddress === 'Rua Duplicada, 100').length, 1);
  assert.equal(stops.find(stop => stop.normalizedAddress === 'Rua Duplicada, 100').packageCount, 4);
  assert.equal(getDuplicateAddressSummaryCount(stops), 0);
  assert.equal(getPackagePrimaryLabel(stops.find(stop => stop.originalStopNumber === 1).packages[0]), 'Seq. 1');
});
