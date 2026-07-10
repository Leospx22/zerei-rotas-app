import assert from 'node:assert/strict';
import test from 'node:test';
import {
  detectColumns,
  formatDuplicateStopMessage,
  getPackagePrimaryLabel,
  getPackageSecondaryLabel,
  getStopDisplayLabel,
  getStopSecondaryLabel,
  groupPackagesByStop,
  normalizeBaseAddressForDuplicateDetection,
  parseSpreadsheetData,
} from '../lib/packageUtils.ts';

function rawPackage(overrides = {}) {
  return {
    trackingNumber: 'BR269399',
    sequence: undefined,
    destinationAddress: 'Rua Teste, 10',
    zipCode: '01000-000',
    latitude: null,
    longitude: null,
    stopNumber: 1,
    ...overrides,
  };
}

test('detects Sequence column without treating it as Stop', () => {
  const mapping = detectColumns(['Sequence', 'SPX TN', 'Destination Address', 'Stop']);

  assert.equal(mapping.sequence, 0);
  assert.equal(mapping.trackingNumber, 1);
  assert.equal(mapping.destinationAddress, 2);
  assert.equal(mapping.stopNumber, 3);
});

test('parses Sequence while preserving SPX TN', () => {
  const [pkg] = parseSpreadsheetData(
    [['18', 'BR269399', 'Rua Teste, 10', '1']],
    ['Sequência', 'SPX TN', 'Endereço', 'Stop']
  );

  assert.equal(pkg.sequence, '18');
  assert.equal(pkg.trackingNumber, 'BR269399');
  assert.equal(pkg.stopNumber, 1);
});

test('package labels prioritize Sequence and keep SPX TN secondary', () => {
  assert.equal(
    getPackagePrimaryLabel({ sequence: '18', trackingNumber: 'BR269399' }),
    'Seq. 18'
  );
  assert.equal(
    getPackageSecondaryLabel({ sequence: '18', trackingNumber: 'BR269399' }),
    'SPX TN: BR269399'
  );
  assert.equal(
    getPackagePrimaryLabel({ trackingNumber: 'BR269399' }),
    'SPX TN: BR269399'
  );
  assert.equal(getPackageSecondaryLabel({ trackingNumber: 'BR269399' }), null);
});

test('imports rows with dash and blank Stop values instead of dropping packages', () => {
  const parsed = parseSpreadsheetData(
    [
      ['BR-MISSING-DASH', 'Rua Sem Parada, 10', '-'],
      ['BR-MISSING-BLANK', 'Rua Sem Parada, 20', ''],
      ['BR-NUMBERED', 'Rua Numerada, 30', '2'],
    ],
    ['SPX TN', 'Endereço', 'Stop']
  );
  const stops = groupPackagesByStop(parsed);

  assert.equal(parsed.length, 3);
  assert.deepEqual(stops.map(stop => stop.stopNumber), [null, null, 2]);
  assert.deepEqual(stops.map(stop => stop.packageCount), [1, 1, 1]);
  assert.equal(stops[0].packages[0].trackingNumber, 'BR-MISSING-DASH');
  assert.equal(stops[1].packages[0].trackingNumber, 'BR-MISSING-BLANK');
});

test('groups missing Stop packages by base address and displays Sem parada', () => {
  const stops = groupPackagesByStop([
    rawPackage({
      trackingNumber: 'A',
      stopNumber: null,
      destinationAddress: 'Rua Pedra Sabão, 378, Bl 03 Apto 52',
    }),
    rawPackage({
      trackingNumber: 'B',
      stopNumber: null,
      destinationAddress: 'Rua Pedra Sabão, 378, Bl 5 Ap 92',
    }),
    rawPackage({
      trackingNumber: 'C',
      stopNumber: null,
      destinationAddress: 'Rua Outra, 10',
    }),
  ]);

  assert.equal(stops.length, 2);
  assert.equal(stops[0].packageCount, 2);
  assert.equal(getStopDisplayLabel(stops[0]), 'Sem parada');
  assert.equal(getStopSecondaryLabel(stops[0]), 'Sem número na planilha');
});

test('missing Stop groups appear before numbered stops and remain movable array items', () => {
  const stops = groupPackagesByStop([
    rawPackage({ trackingNumber: 'numbered-3', stopNumber: 3, destinationAddress: 'Rua C, 30' }),
    rawPackage({ trackingNumber: 'missing', stopNumber: null, destinationAddress: 'Rua A, 10' }),
    rawPackage({ trackingNumber: 'numbered-1', stopNumber: 1, destinationAddress: 'Rua B, 20' }),
  ]);
  const reordered = [stops[1], stops[0], stops[2]];

  assert.deepEqual(stops.map(stop => stop.stopNumber), [null, 1, 3]);
  assert.deepEqual(reordered.map(stop => stop.id), [stops[1].id, stops[0].id, stops[2].id]);
});

test('duplicate detection matches same street and number despite complements', () => {
  assert.equal(
    normalizeBaseAddressForDuplicateDetection('Rua Pedra Sabão, 378, Bl 03 Apto 52'),
    normalizeBaseAddressForDuplicateDetection('Rua Pedra Sabão, 378, Bl 5 Ap 92')
  );
  assert.notEqual(
    normalizeBaseAddressForDuplicateDetection('Rua Pedra Sabão, 378'),
    normalizeBaseAddressForDuplicateDetection('Rua Pedra Sabão, 379')
  );
});

test('duplicate warning names the exact matching stop numbers', () => {
  const stops = groupPackagesByStop([
    rawPackage({ trackingNumber: 'A', stopNumber: 5, destinationAddress: 'Rua Pedra Sabão, 378, Bl 03 Apto 52' }),
    rawPackage({ trackingNumber: 'B', stopNumber: 7, destinationAddress: 'Rua Pedra Sabão, 378, Bl 5 Ap 92' }),
    rawPackage({ trackingNumber: 'C', stopNumber: 12, destinationAddress: 'Rua Pedra Sabão, 378, Fundos' }),
  ]);

  assert.equal(
    stops[0].duplicateAddressWarningMessage,
    'Esta parada #5 tem o mesmo endereço das paradas #7 e #12.'
  );
});

test('duplicate warning handles missing stop numbers readably', () => {
  assert.equal(
    formatDuplicateStopMessage(
      { stopNumber: null, missingStopNumber: true },
      [{ stopNumber: 7, missingStopNumber: false }]
    ),
    'Esta parada sem número tem o mesmo endereço da parada #7.'
  );
  assert.equal(
    formatDuplicateStopMessage(
      { stopNumber: 5, missingStopNumber: false },
      [{ stopNumber: null, missingStopNumber: true }]
    ),
    'Esta parada #5 tem o mesmo endereço de uma parada sem número.'
  );
});
