import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOccurrenceReasonToTarget,
  createDirectOccurrenceTarget,
  getAddressGroupOccurrenceAction,
} from '../lib/occurrenceFlow.ts';

test('creates a direct reason-selection target for the chosen package', () => {
  assert.deepEqual(
    createDirectOccurrenceTarget('stop-1', { id: 'pkg-2', status: 'pending' }),
    { stopId: 'stop-1', pkgId: 'pkg-2' }
  );
});

test('allows an existing occurrence reason to be updated', () => {
  assert.deepEqual(
    createDirectOccurrenceTarget('stop-1', { id: 'pkg-skipped', status: 'skipped' }),
    { stopId: 'stop-1', pkgId: 'pkg-skipped' }
  );
});

test('does not create an occurrence target for a delivered package', () => {
  assert.equal(
    createDirectOccurrenceTarget('stop-1', { id: 'pkg-delivered', status: 'delivered' }),
    null
  );
});

test('opens reason selection directly for one pending package in an address group', () => {
  assert.deepEqual(
    getAddressGroupOccurrenceAction('stop-1', [
      { id: 'pkg-pending', status: 'pending' },
      { id: 'pkg-delivered', status: 'delivered' },
      { id: 'pkg-skipped', status: 'skipped' },
    ]),
    { kind: 'direct', target: { stopId: 'stop-1', packageIds: ['pkg-pending'] } }
  );
});

test('opens reason selection directly for selected pending packages in one group', () => {
  assert.deepEqual(
    getAddressGroupOccurrenceAction(
      'stop-1',
      [
        { id: 'pkg-a', status: 'pending' },
        { id: 'pkg-b', status: 'pending' },
        { id: 'pkg-delivered', status: 'delivered' },
        { id: 'pkg-skipped', status: 'skipped' },
      ],
      new Set(['pkg-a', 'pkg-b', 'pkg-delivered', 'pkg-skipped', 'other-group'])
    ),
    {
      kind: 'direct',
      target: { stopId: 'stop-1', packageIds: ['pkg-a', 'pkg-b'] },
    }
  );
});

test('filters multi-package occurrence selection to pending packages in the address group', () => {
  assert.deepEqual(
    getAddressGroupOccurrenceAction('stop-1', [
      { id: 'pkg-a', status: 'pending' },
      { id: 'pkg-b', status: 'pending' },
      { id: 'pkg-delivered', status: 'delivered' },
      { id: 'pkg-skipped', status: 'skipped' },
    ]),
    { kind: 'select', packageIds: ['pkg-a', 'pkg-b'] }
  );
});

test('does nothing when an address group has no pending packages', () => {
  assert.deepEqual(
    getAddressGroupOccurrenceAction('stop-1', [
      { id: 'pkg-delivered', status: 'delivered' },
      { id: 'pkg-skipped', status: 'skipped' },
    ]),
    { kind: 'none' }
  );
});

test('applies one occurrence reason to every package in a bulk target', () => {
  const updates = [];

  applyOccurrenceReasonToTarget(
    { stopId: 'stop-1', packageIds: ['pkg-a', 'pkg-b'] },
    'Cliente ausente',
    (stopId, packageId, reason) => updates.push({ stopId, packageId, reason })
  );

  assert.deepEqual(updates, [
    { stopId: 'stop-1', packageId: 'pkg-a', reason: 'Cliente ausente' },
    { stopId: 'stop-1', packageId: 'pkg-b', reason: 'Cliente ausente' },
  ]);
});
