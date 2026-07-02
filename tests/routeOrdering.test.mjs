import test from 'node:test';
import assert from 'node:assert/strict';
import { moveRouteStop, moveRouteStopToIndex } from '../lib/routeOrdering.ts';

function stop(id, orderIndex, packageStatus = 'pending') {
  return {
    id,
    orderIndex,
    packages: [{ id: `pkg-${id}`, status: packageStatus }],
    addressGroups: [{ packageIds: [`pkg-${id}`] }],
  };
}

test('moves one stop up and reindexes route order', () => {
  const stops = [stop('a', 0), stop('b', 1), stop('c', 2)];
  const reordered = moveRouteStop(stops, 1, -1);

  assert.deepEqual(reordered.map(item => item.id), ['b', 'a', 'c']);
  assert.deepEqual(reordered.map(item => item.orderIndex), [0, 1, 2]);
  assert.deepEqual(stops.map(item => item.id), ['a', 'b', 'c']);
});

test('does not move the first stop up or the last stop down', () => {
  const stops = [stop('a', 0), stop('b', 1), stop('c', 2)];

  assert.deepEqual(moveRouteStop(stops, 0, -1).map(item => item.id), ['a', 'b', 'c']);
  assert.deepEqual(moveRouteStop(stops, 2, 1).map(item => item.id), ['a', 'b', 'c']);
});

test('preserves package status and address-group data while moving stops', () => {
  const stops = [stop('a', 0, 'delivered'), stop('b', 1, 'skipped')];
  const reordered = moveRouteStop(stops, 1, -1);

  assert.equal(reordered[0].packages, stops[1].packages);
  assert.equal(reordered[0].addressGroups, stops[1].addressGroups);
  assert.equal(reordered[0].packages[0].status, 'skipped');
  assert.equal(reordered[1].packages[0].status, 'delivered');
});

test('keeps customized order after route state is serialized and read again', () => {
  const route = {
    id: 'route-1',
    stops: moveRouteStop([stop('a', 0), stop('b', 1), stop('c', 2)], 2, -1),
  };

  const reloadedRoute = JSON.parse(JSON.stringify(route));

  assert.deepEqual(reloadedRoute.stops.map(item => item.id), ['a', 'c', 'b']);
  assert.deepEqual(reloadedRoute.stops.map(item => item.orderIndex), [0, 1, 2]);
});

test('moves a stop directly from one position to another', () => {
  const stops = [stop('a', 0), stop('b', 1), stop('c', 2), stop('d', 3)];

  assert.deepEqual(
    moveRouteStopToIndex(stops, 1, 3).map(item => item.id),
    ['a', 'c', 'd', 'b']
  );
});

test('moves the first stop later and the last stop earlier', () => {
  const stops = [stop('a', 0), stop('b', 1), stop('c', 2), stop('d', 3)];

  assert.deepEqual(
    moveRouteStopToIndex(stops, 0, 2).map(item => item.id),
    ['b', 'c', 'a', 'd']
  );
  assert.deepEqual(
    moveRouteStopToIndex(stops, 3, 1).map(item => item.id),
    ['a', 'd', 'b', 'c']
  );
});

test('invalid and same target indexes do not mutate route order', () => {
  const stops = [stop('a', 0), stop('b', 1), stop('c', 2)];

  assert.deepEqual(moveRouteStopToIndex(stops, 1, -1).map(item => item.id), ['a', 'b', 'c']);
  assert.deepEqual(moveRouteStopToIndex(stops, 1, 3).map(item => item.id), ['a', 'b', 'c']);
  assert.deepEqual(moveRouteStopToIndex(stops, 1, 1).map(item => item.id), ['a', 'b', 'c']);
  assert.deepEqual(stops.map(item => item.id), ['a', 'b', 'c']);
});

test('direct movement preserves package data and status', () => {
  const stops = [stop('a', 0, 'delivered'), stop('b', 1), stop('c', 2, 'skipped')];
  const reordered = moveRouteStopToIndex(stops, 2, 0);

  assert.equal(reordered[0].packages, stops[2].packages);
  assert.equal(reordered[0].packages[0].status, 'skipped');
  assert.equal(reordered[1].packages[0].status, 'delivered');
  assert.deepEqual(reordered.map(item => item.orderIndex), [0, 1, 2]);
});
