import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOptimizedRouteOrder,
  moveRouteStop,
  moveRouteStopToIndex,
} from '../lib/routeOrdering.ts';
import { deriveExecutionState } from '../lib/executionState.ts';

function stop(id, orderIndex, packageStatus = 'pending') {
  return {
    id,
    orderIndex,
    status: packageStatus === 'delivered'
      ? 'completed'
      : packageStatus === 'skipped'
        ? 'skipped'
        : 'pending',
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

test('trusted optimized recommendation applies optimized stop ids exactly once', () => {
  const stops = [stop('a', 0), stop('b', 1), stop('c', 2)];
  const result = applyOptimizedRouteOrder(stops, ['c', 'a', 'b'], {
    recommendationAction: 'use-optimized-route',
    metricConfidence: 'reliable',
  });

  assert.equal(result.applied, true);
  assert.deepEqual(result.stops.map(item => item.id), ['c', 'a', 'b']);
  assert.deepEqual(result.stops.map(item => item.orderIndex), [0, 1, 2]);
});

test('optimized route order preserves every original stop and package data', () => {
  const stops = [stop('a', 0, 'delivered'), stop('b', 1), stop('c', 2, 'skipped')];
  stops[1].packages.push({ id: 'pkg-b-extra', status: 'pending' });
  const result = applyOptimizedRouteOrder(stops, ['b', 'c', 'a'], {
    recommendationAction: 'use-optimized-route',
    metricConfidence: 'reliable',
  });

  assert.equal(result.applied, true);
  assert.deepEqual([...new Set(result.stops.map(item => item.id))], ['b', 'c', 'a']);
  assert.deepEqual(result.stops.map(item => item.id).sort(), stops.map(item => item.id).sort());
  assert.equal(result.stops[0].packages, stops[1].packages);
  assert.equal(result.stops[0].addressGroups, stops[1].addressGroups);
  assert.deepEqual(result.stops[0].packages.map(pkg => pkg.id), ['pkg-b', 'pkg-b-extra']);
});

test('invalid optimized stop ids cannot lose or duplicate stops', () => {
  const stops = [stop('a', 0), stop('b', 1), stop('c', 2)];

  assert.deepEqual(
    applyOptimizedRouteOrder(stops, ['c', 'c', 'a'], {
      recommendationAction: 'use-optimized-route',
      metricConfidence: 'reliable',
    }).stops.map(item => item.id),
    ['a', 'b', 'c']
  );
  assert.deepEqual(
    applyOptimizedRouteOrder(stops, ['c', 'a'], {
      recommendationAction: 'use-optimized-route',
      metricConfidence: 'reliable',
    }).stops.map(item => item.id),
    ['a', 'b', 'c']
  );
  assert.deepEqual(
    applyOptimizedRouteOrder(stops, ['c', 'missing', 'a'], {
      recommendationAction: 'use-optimized-route',
      metricConfidence: 'reliable',
    }).stops.map(item => item.id),
    ['a', 'b', 'c']
  );
});

test('unreliable recommendation does not apply optimized order', () => {
  const stops = [stop('a', 0), stop('b', 1), stop('c', 2)];
  const result = applyOptimizedRouteOrder(stops, ['c', 'a', 'b'], {
    recommendationAction: 'use-optimized-route',
    metricConfidence: 'unreliable',
  });

  assert.equal(result.applied, false);
  assert.deepEqual(result.stops.map(item => item.id), ['a', 'b', 'c']);
});

test('keep-original recommendation does not mutate route order', () => {
  const stops = [stop('a', 0), stop('b', 1), stop('c', 2)];
  const result = applyOptimizedRouteOrder(stops, ['c', 'a', 'b'], {
    recommendationAction: 'keep-original-route',
    metricConfidence: 'reliable',
  });

  assert.equal(result.applied, false);
  assert.deepEqual(result.stops.map(item => item.id), ['a', 'b', 'c']);
  assert.deepEqual(stops.map(item => item.id), ['a', 'b', 'c']);
});

test('execution consumes the optimized route order after it is applied', () => {
  const stops = [stop('a', 0), stop('b', 1), stop('c', 2)];
  const result = applyOptimizedRouteOrder(stops, ['c', 'a', 'b'], {
    recommendationAction: 'use-optimized-route',
    metricConfidence: 'reliable',
  });
  const route = {
    id: 'route-optimized',
    stops: result.stops,
    totalPackages: 3,
  };

  assert.equal(deriveExecutionState(route).currentStop?.id, 'c');
  assert.equal(deriveExecutionState(route).nextStop?.id, 'a');
});
