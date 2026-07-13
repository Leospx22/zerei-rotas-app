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
  const pkg = {
    trackingNumber: 'BR269806920895T',
    sequence: '18',
  };

  assert.equal(getPackagePrimaryLabel(pkg), 'Seq. 18');
  assert.equal(getPackageSecondaryLabel(pkg), 'SPX TN: BR269806920895T');
});

test('package labels fall back to SPX TN when Sequence is missing', () => {
  const pkg = {
    trackingNumber: 'BR269806920895T',
  };

  assert.equal(getPackagePrimaryLabel(pkg), 'SPX TN: BR269806920895T');
  assert.equal(getPackageSecondaryLabel(pkg), null);
});

test('spreadsheet parser preserves Sequence as package identity context', () => {
  const rawPackages = parseSpreadsheetData(
    [
      ['18', 'BR269806920895T', 'Rua Sequencia, 10', '3'],
    ],
    ['Sequence', 'SPX TN', 'Endereço', 'Stop']
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

test('duplicate warning names one exact matching numbered stop', () => {
  const stops = groupPackagesByStop([
    rawPackage('A', 5, 'Rua Igual, 10'),
    rawPackage('B', 7, 'R. Igual, 10, APTO 3'),
  ]);

  assert.equal(
    getDuplicateAddressWarning(stops, stops[0]),
    'Esta parada #1 tem o mesmo endereço da parada #2.'
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
    'Esta parada #1 tem o mesmo endereço das paradas #2 e #3.'
  );
});

test('batched duplicate warnings match single-stop warning behavior', () => {
  const stops = groupPackagesByStop([
    rawPackage('A', 5, 'Rua Igual, 10'),
    rawPackage('B', 7, 'Rua Igual, 10, Loja'),
    rawPackage('C', 12, 'R. Igual, 10 - Fundos'),
    rawPackage('D', 13, 'Rua Diferente, 20'),
  ]);

  const warnings = buildDuplicateAddressWarnings(stops);

  assert.equal(warnings[stops[0].id], getDuplicateAddressWarning(stops, stops[0]));
  assert.equal(warnings[stops[1].id], getDuplicateAddressWarning(stops, stops[1]));
  assert.equal(warnings[stops[2].id], getDuplicateAddressWarning(stops, stops[2]));
  assert.equal(warnings[stops[3].id], undefined);
});

test('duplicate warning handles Prioridade Shopee to numbered and numbered to priority matches', () => {
  const stops = groupPackagesByStop([
    rawPackage('A', null, 'Avenida Ipiranga, 879, bloco B'),
    rawPackage('B', 7, 'Av Ipiranga, 879'),
  ]);
  const priority = stops.find(stop => formatStopBadge(stop) === '#P');
  const numbered = stops.find(stop => formatStopBadge(stop) === '#7');

  assert.equal(
    getDuplicateAddressWarning(stops, priority),
    'Esta Prioridade Shopee tem o mesmo endereço da parada #1.'
  );
  assert.equal(
    getDuplicateAddressWarning(stops, numbered),
    'Esta parada #1 tem o mesmo endereço de uma entrega #Prioridade.'
  );
});

test('duplicate warning avoids ambiguous repeated #P wording', () => {
  const stops = groupPackagesByStop([
    rawPackage('A', 5, 'Rua Igual, 10'),
    rawPackage('B', null, 'Rua Igual, 10, APTO 1'),
  ]);
  const numbered = stops.find(stop => formatStopBadge(stop) === '#5');
  const priority = stops.find(stop => formatStopBadge(stop) === '#P');
  const extraPriority = {
    ...priority,
    id: 'legacy-priority-duplicate',
    packages: priority.packages.map(pkg => ({
      ...pkg,
      id: `${pkg.id}-legacy`,
      destinationAddress: 'R. Igual, 10 - Fundos',
    })),
  };
  const legacyCompatibleStops = [numbered, priority, extraPriority];

  assert.equal(
    getDuplicateAddressWarning(legacyCompatibleStops, numbered),
    'Esta parada #1 tem o mesmo endereço de 2 entregas #Prioridade.'
  );
});

test('duplicate warning names repeated Prioridade Shopee groups without ambiguous #P wording', () => {
  const stops = groupPackagesByStop([
    rawPackage('A', null, 'Rua Prioridade, 10'),
    rawPackage('B', null, 'R. Prioridade, 10, fundos'),
  ]);

  assert.equal(
    getDuplicateAddressWarning(stops, stops[0]),
    'Há outra entrega #Prioridade neste endereço.'
  );
});

test('duplicate warning uses plural #Prioridade copy for multiple priority matches', () => {
  const stops = groupPackagesByStop([
    rawPackage('A', null, 'Rua Prioridade Plural, 10'),
    rawPackage('B', null, 'R. Prioridade Plural, 10, fundos'),
    rawPackage('C', null, 'Rua Prioridade Plural, 10, apto 2'),
  ]);

  assert.equal(
    getDuplicateAddressWarning(stops, stops[0]),
    'Há outras 2 entregas #Prioridade neste endereço.'
  );
});

test('different street numbers do not match as duplicate stops', () => {
  const stops = groupPackagesByStop([
    rawPackage('A', 5, 'Rua Igual, 10'),
    rawPackage('B', 7, 'Rua Igual, 11'),
  ]);

  assert.equal(getDuplicateAddressWarning(stops, stops[0]), null);
});

test('manual address copy text uses street number, city, state, zip code, and Brazil fallback', () => {
  assert.equal(
    getBestManualAddress({
      address: 'Rua Juruá, 137, APTO 2',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '03052-020',
    }),
    'Rua Juruá, 137, São Paulo, SP, 03052-020, Brasil'
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

test('Prioridade Shopee groups appear before numbered stops after import', () => {
  const rawPackages = parseSpreadsheetData(
    [
      ['PKG-1', 'Rua Numerada, 10', '5'],
      ['PKG-2', 'Rua Sem Parada, 20', ''],
      ['PKG-3', 'Rua Numerada, 11', '6'],
    ],
    ['SPX TN', 'Endereço', 'Stop']
  );
  const stops = groupPackagesByStop(rawPackages);

  assert.deepEqual(
    buildDisplayedRoutePositions(stops).map(position => position.badge),
    ['#P', '#1', '#2']
  );
  assert.equal(stops[0].packages[0].trackingNumber, 'PKG-2');
});

test('regular display numbering excludes Prioridade Shopee after manual movement', () => {
  const stops = groupPackagesByStop([
    rawPackage('P', null, 'Rua Prioridade, 1'),
    rawPackage('A', 10, 'Rua A, 10'),
    rawPackage('B', 11, 'Rua B, 11'),
  ]);
  const movedPriority = [stops[1], stops[0], stops[2]];
  const positions = buildDisplayedRoutePositions(movedPriority);

  assert.deepEqual(positions.map(position => position.badge), ['#1', '#P', '#2']);
  assert.deepEqual(positions.map(position => position.originalStopNumber), [10, null, 11]);
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

test('Stop and Sequence combinations classify Prioridade Shopee only when both are invalid', () => {
  const rawPackages = parseSpreadsheetData(
    [
      ['PKG-P', 'Rua Prioridade, 1', '', ''],
      ['PKG-S', 'Rua Sequencia, 2', '', '12'],
      ['PKG-N', 'Rua Numerada, 3', '3', ''],
      ['PKG-R', 'Rua Regular, 4', '4', '13'],
    ],
    ['SPX TN', 'Endereço', 'Stop', 'Sequence']
  );
  const stops = groupPackagesByStop(rawPackages);
  const badgesByTracking = new Map();
  const positions = buildDisplayedRoutePositions(stops);

  stops.forEach(stop => {
    stop.packages.forEach(pkg => {
      badgesByTracking.set(pkg.trackingNumber, positions.find(position => position.stopId === stop.id).badge);
    });
  });

  assert.equal(badgesByTracking.get('PKG-P'), '#P');
  assert.notEqual(badgesByTracking.get('PKG-S'), '#P');
  assert.notEqual(badgesByTracking.get('PKG-N'), '#P');
  assert.notEqual(badgesByTracking.get('PKG-R'), '#P');
  assert.equal(stops.reduce((sum, stop) => sum + stop.packages.length, 0), 4);
});

test('duplicate summary counts unique affected stops without double-counting', () => {
  const stops = groupPackagesByStop([
    rawPackage('A', null, 'Rua Duplicada, 10'),
    rawPackage('B', 2, 'R. Duplicada, 10, Apto 1'),
    rawPackage('C', 3, 'Rua Duplicada, 10 - Fundos'),
    rawPackage('D', 4, 'Rua Unica, 99'),
  ]);

  assert.equal(getDuplicateAddressSummaryCount(stops), 3);
});

test('physical-route-sized import preserves #P, Sequence labels, numbering, duplicates, and package count', () => {
  const rows = [];
  for (let i = 1; i <= 48; i++) {
    const duplicatedAddress = i === 10 || i === 20 ? 'Rua Duplicada, 100' : `Rua Grande, ${i}`;
    rows.push([`BR-${i}-A`, String(i), duplicatedAddress, 'São Paulo', 'SP', '01000-000', String(i)]);
    rows.push([`BR-${i}-B`, String(i + 100), duplicatedAddress, 'São Paulo', 'SP', '01000-000', String(i)]);
  }
  for (let i = 0; i < 18; i++) {
    rows.push([`BR-P-${i}`, '', `Rua Prioridade, ${i % 3}`, 'São Paulo', 'SP', '01000-000', '']);
  }

  const rawPackages = parseSpreadsheetData(
    rows,
    ['SPX TN', 'Sequence', 'Endereço', 'Cidade', 'UF', 'CEP', 'Stop']
  );
  const stops = groupPackagesByStop(rawPackages);
  const positions = buildDisplayedRoutePositions(stops);

  assert.equal(rawPackages.length, 114);
  assert.equal(stops.reduce((sum, stop) => sum + stop.packages.length, 0), 114);
  assert.deepEqual(positions.slice(0, 3).map(position => position.badge), ['#P', '#P', '#P']);
  assert.equal(positions.find(position => position.badge === '#1').originalStopNumber, 1);
  assert.ok(getDuplicateAddressSummaryCount(stops) >= 2);
  assert.equal(getPackagePrimaryLabel(stops.find(stop => stop.originalStopNumber === 1).packages[0]), 'Seq. 1');
});
