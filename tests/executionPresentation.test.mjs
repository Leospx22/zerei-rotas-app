import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExecutionPackageGroups,
  normalizeAddress,
  summarizePackageGroups,
} from '../lib/executionPresentation.ts';

function packageItem(id, address) {
  return {
    id,
    trackingNumber: id,
    destinationAddress: address,
    zipCode: '',
    latitude: null,
    longitude: null,
    stopNumber: 1,
    status: 'pending',
  };
}

function stopWithGroups(groupDefinitions) {
  const packages = groupDefinitions.flatMap(group => group.packages);
  return {
    id: 'stop-1',
    stopNumber: 1,
    normalizedAddress: groupDefinitions[0].address,
    originalAddress: groupDefinitions[0].address,
    zipCode: '',
    latitude: null,
    longitude: null,
    packages,
    packageCount: packages.length,
    addressGroups: groupDefinitions.map(group => ({
      normalizedAddress: group.address,
      originalAddress: group.address,
      zipCode: '',
      packageIds: group.packages.map(pkg => pkg.id),
      packageCount: group.packages.length,
    })),
    addressCount: groupDefinitions.length,
    orderIndex: 0,
    status: 'pending',
    houseNumber: '38',
    duplicateAddressWarning: false,
  };
}

test('builds visual package groups from stop address groups', () => {
  const address38 = 'Rua Visconde de Abaeté, 38';
  const address49 = 'Rua Visconde de Abaeté, 49';
  const stop = stopWithGroups([
    { address: address38, packages: [packageItem('pkg-1', address38), packageItem('pkg-2', address38)] },
    { address: address49, packages: Array.from({ length: 8 }, (_, index) => packageItem(`pkg-${index + 3}`, address49)) },
  ]);

  const groups = buildExecutionPackageGroups(stop);

  assert.equal(groups.length, 2);
  assert.equal(groups[0].address, address38);
  assert.equal(groups[0].packages.length, 2);
  assert.equal(groups[1].address, address49);
  assert.equal(groups[1].packages.length, 8);
});

test('summarizes the three largest address groups and remaining count', () => {
  const definitions = [
    { number: 38, count: 2 },
    { number: 49, count: 8 },
    { number: 51, count: 3 },
    { number: 60, count: 1 },
  ];
  const stop = stopWithGroups(definitions.map(({ number, count }) => {
    const address = `Rua Visconde de Abaeté, ${number}`;
    return {
      address,
      packages: Array.from({ length: count }, (_, index) =>
        packageItem(`pkg-${number}-${index}`, address)
      ),
    };
  }));

  const summary = summarizePackageGroups(buildExecutionPackageGroups(stop));

  assert.deepEqual(summary.lines, [
    '8 pacotes no nº 49',
    '3 pacotes no nº 51',
    '2 pacotes no nº 38',
  ]);
  assert.equal(summary.remainingGroups, 1);
});

test('normalizes street, number, and complement independently', () => {
  assert.deepEqual(normalizeAddress('Rua Coronel Trancoso, 20'), {
    streetType: 'Rua',
    street: 'Coronel Trancoso',
    number: '20',
    complement: '',
    normalizedStreet: 'Rua Coronel Trancoso',
    groupKey: 'rua coronel trancoso|20',
    displayAddress: 'Rua Coronel Trancoso, 20',
  });

  assert.equal(
    normalizeAddress('Rua Coronel Trancoso, 20, Loja Nafee').complement,
    'Loja Nafee'
  );
  assert.equal(
    normalizeAddress('Rua Cel Trancoso, 20 - Fundos').complement,
    'Fundos'
  );
});

test('collapses address abbreviations and complements into one presentation group', () => {
  const originalAddresses = [
    'Rua Coronel Trancoso, 20',
    'R. Coronel Trancoso, 20',
    'Rua Cel Trancoso, 20',
    'R Cel Trancoso, 20',
    'Rua Coronel Trancoso, 20, Loja Nafee',
    'Rua Coronel Trancoso, 20 - Fundos',
  ];
  const packages = originalAddresses.map((address, index) =>
    packageItem(`pkg-normalized-${index}`, address)
  );
  const stop = stopWithGroups(originalAddresses.map((address, index) => ({
    address,
    packages: [packages[index]],
  })));

  const groups = buildExecutionPackageGroups(stop);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].address, 'Rua Coronel Trancoso, 20');
  assert.deepEqual(
    groups[0].packages.map(pkg => pkg.destinationAddress),
    originalAddresses
  );
  assert.equal(new Set(originalAddresses.map(address => normalizeAddress(address).groupKey)).size, 1);
});

test('normalization ignores capitalization, periods, repeated commas, and extra spaces', () => {
  const variants = [
    'RUA   CORONEL TRANCOSO,,, 20',
    'r. coronel trancoso, 20',
    'Rua Cel. Trancoso,   20',
  ];

  assert.deepEqual(
    variants.map(address => normalizeAddress(address).groupKey),
    Array(variants.length).fill('rua coronel trancoso|20')
  );
});
