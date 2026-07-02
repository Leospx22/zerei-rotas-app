import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isPackageGroupSelected,
  togglePackageSelection,
  togglePackageGroupSelection,
} from '../lib/packageSelection.ts';

test('selects every package in one address group only', () => {
  const selected = new Set(['other-group-package']);
  const next = togglePackageGroupSelection(selected, ['group-a', 'group-b']);

  assert.deepEqual([...next].sort(), ['group-a', 'group-b', 'other-group-package']);
  assert.equal(isPackageGroupSelected(next, ['group-a', 'group-b']), true);
});

test('clears a fully selected address group without affecting other groups', () => {
  const selected = new Set(['group-a', 'group-b', 'other-group-package']);
  const next = togglePackageGroupSelection(selected, ['group-a', 'group-b']);

  assert.deepEqual([...next], ['other-group-package']);
  assert.equal(isPackageGroupSelected(next, ['group-a', 'group-b']), false);
});

test('partially selected group becomes fully selected and updates total count', () => {
  const selected = new Set(['group-a', 'other-group-package']);
  const next = togglePackageGroupSelection(selected, ['group-a', 'group-b']);

  assert.equal(next.size, 3);
  assert.equal(next.has('group-a'), true);
  assert.equal(next.has('group-b'), true);
  assert.equal(next.has('other-group-package'), true);
});

test('toggles one package without selecting the rest of its group', () => {
  const selected = togglePackageSelection(new Set(), 'group-a');

  assert.deepEqual([...selected], ['group-a']);
  assert.equal(isPackageGroupSelected(selected, ['group-a', 'group-b']), false);
});

test('selecting every package individually updates group state and clearing one makes it partial', () => {
  const first = togglePackageSelection(new Set(), 'group-a');
  const all = togglePackageSelection(first, 'group-b');
  const partial = togglePackageSelection(all, 'group-a');

  assert.equal(isPackageGroupSelected(all, ['group-a', 'group-b']), true);
  assert.equal(isPackageGroupSelected(partial, ['group-a', 'group-b']), false);
  assert.deepEqual([...partial], ['group-b']);
});
