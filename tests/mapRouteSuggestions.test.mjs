import assert from 'node:assert/strict';
import test from 'node:test';
import { generateMapRouteSuggestions } from '../lib/route-ai/MapRouteSuggestions.ts';
import {
  applyRecoveredMapCoordinates,
  buildMapRoutePreview,
  getAiEligibleMapStops,
} from '../lib/mapOverview.ts';
import { applyEligibleRouteOrder } from '../lib/routeOrdering.ts';

function coordinateStop(id, latitude, longitude, extra = {}) {
  return { id, latitude, longitude, ...extra };
}

function mappedStop(id, latitude, longitude, order, extra = {}) {
  return {
    id,
    order,
    badge: `#${order}`,
    address: `Rua ${id}`,
    navigationAddress: `Rua ${id}`,
    zipCode: '',
    baseAddressKey: id,
    missingSpreadsheetStop: false,
    latitude,
    longitude,
    coordinateStatus: latitude === null ? 'missing' : 'valid',
    packageCount: 1,
    deliveredCount: 0,
    occurrenceCount: 0,
    status: 'pending',
    ...extra,
  };
}

function routeStop(id, orderIndex) {
  return { id, orderIndex, packages: [{ id: `pkg-${id}` }] };
}

const geographicStops = [
  coordinateStop('a', -23.550, -46.660),
  coordinateStop('b', -23.548, -46.645),
  coordinateStop('c', -23.555, -46.632),
  coordinateStop('d', -23.565, -46.640),
  coordinateStop('e', -23.570, -46.655),
  coordinateStop('f', -23.560, -46.670),
];

test('both suggestions contain every eligible stop exactly once', () => {
  const result = generateMapRouteSuggestions(geographicStops);
  const expectedIds = geographicStops.map(stop => stop.id).sort();

  assert.equal(result.suggestions.length, 2);
  for (const suggestion of result.suggestions) {
    assert.equal(suggestion.stopIds.length, expectedIds.length);
    assert.equal(new Set(suggestion.stopIds).size, expectedIds.length);
    assert.deepEqual([...suggestion.stopIds].sort(), expectedIds);
  }
});

test('suggestions are deterministic and the alternative has a different traversal', () => {
  const first = generateMapRouteSuggestions(geographicStops);
  const second = generateMapRouteSuggestions(geographicStops);

  assert.deepEqual(second, first);
  assert.notDeepEqual(first.suggestions[1].stopIds, first.suggestions[0].stopIds);
  assert.notEqual(first.suggestions[1].stopIds[0], first.suggestions[0].stopIds[0]);
});

test('invalid, unavailable, ambiguous, and outlier coordinates never enter candidates', () => {
  const excluded = [
    coordinateStop('invalid', 95, -46.6),
    coordinateStop('unavailable', null, null),
    coordinateStop('ambiguous', -23.4, -46.4, { coordinateConfidence: 'ambiguous' }),
    coordinateStop('outlier', -3.1, -60.0),
  ];
  const result = generateMapRouteSuggestions([...geographicStops, ...excluded]);
  const candidateIds = result.suggestions.flatMap(suggestion => suggestion.stopIds);

  assert.equal(result.eligibleStopCount, geographicStops.length);
  for (const stop of excluded) assert.equal(candidateIds.includes(stop.id), false);
});

test('corrected_swap uses the canonical sanitized pair', () => {
  const correctedInput = [
    coordinateStop('swap', -46.660, -23.550, { coordinateConfidence: 'corrected_swap' }),
    ...geographicStops.slice(1),
  ];
  const canonicalInput = [
    coordinateStop('swap', -23.550, -46.660, { coordinateConfidence: 'corrected_swap' }),
    ...geographicStops.slice(1),
  ];

  assert.deepEqual(
    generateMapRouteSuggestions(correctedInput).suggestions,
    generateMapRouteSuggestions(canonicalInput).suggestions
  );
});

test('low coordinate confidence suppresses suggestions', () => {
  const result = generateMapRouteSuggestions([
    ...geographicStops.slice(0, 2),
    coordinateStop('missing-1', null, null),
    coordinateStop('missing-2', null, null),
  ]);

  assert.deepEqual(result.suggestions, []);
  assert.equal(result.suppressedReason, 'insufficient-reliable-coordinates');
});

test('effectively identical geometry returns one suggestion without inventing an alternative', () => {
  const result = generateMapRouteSuggestions([
    coordinateStop('a', -23.55, -46.65),
    coordinateStop('b', -23.55, -46.65),
    coordinateStop('c', -23.55, -46.65),
  ]);

  assert.equal(result.suggestions.length, 1);
  assert.equal(result.alternativeUnavailable, true);
});

test('preview and switching candidates do not mutate the active map order', () => {
  const original = geographicStops.map((stop, index) =>
    mappedStop(stop.id, stop.latitude, stop.longitude, index + 1)
  );
  const originalSnapshot = structuredClone(original);
  const suggestions = generateMapRouteSuggestions(original).suggestions;

  const firstPreview = buildMapRoutePreview(original, suggestions[0].stopIds);
  const secondPreview = buildMapRoutePreview(original, suggestions[1].stopIds);

  assert.deepEqual(firstPreview.map(stop => stop.id), suggestions[0].stopIds);
  assert.deepEqual(secondPreview.map(stop => stop.id), suggestions[1].stopIds);
  assert.deepEqual(original, originalSnapshot);
});

test('keeping original restores original pin order without mutation', () => {
  const original = geographicStops.map((stop, index) =>
    mappedStop(stop.id, stop.latitude, stop.longitude, index + 1)
  );
  const suggestion = generateMapRouteSuggestions(original).suggestions[0];

  buildMapRoutePreview(original, suggestion.stopIds);
  const restored = buildMapRoutePreview(original, null);

  assert.deepEqual(restored, original);
  assert.notEqual(restored, original);
});

test('accepted candidate applies the exact eligible order and preserves unmappable stops', () => {
  const stops = [
    routeStop('unmapped-a', 0),
    ...geographicStops.map((stop, index) => routeStop(stop.id, index + 1)),
    routeStop('unmapped-b', 7),
  ];
  const eligibleIds = geographicStops.map(stop => stop.id);
  const candidateIds = generateMapRouteSuggestions(geographicStops).suggestions[0].stopIds;
  const result = applyEligibleRouteOrder(stops, eligibleIds, candidateIds);

  assert.equal(result.applied, true);
  assert.deepEqual(
    result.stops.map(stop => stop.id),
    [...candidateIds, 'unmapped-a', 'unmapped-b']
  );
  assert.deepEqual(result.stops.map(stop => stop.orderIndex), result.stops.map((_, index) => index));
  assert.equal(result.stops.find(stop => stop.id === 'unmapped-a').packages, stops[0].packages);
});

test('candidate is rejected when ids do not exactly match eligible stops', () => {
  const stops = ['a', 'b', 'c', 'unmapped'].map(routeStop);

  for (const invalidCandidate of [
    ['a', 'b'],
    ['a', 'b', 'b'],
    ['a', 'b', 'missing'],
    ['a', 'b', 'c', 'unmapped'],
  ]) {
    const result = applyEligibleRouteOrder(stops, ['a', 'b', 'c'], invalidCandidate);
    assert.equal(result.applied, false);
    assert.deepEqual(result.stops.map(stop => stop.id), ['a', 'b', 'c', 'unmapped']);
  }
});

test('invalid preview candidate restores the unchanged original order', () => {
  const original = geographicStops.slice(0, 3).map((stop, index) =>
    mappedStop(stop.id, stop.latitude, stop.longitude, index + 1)
  );

  assert.deepEqual(buildMapRoutePreview(original, ['a', 'a', 'b']), original);
  assert.deepEqual(buildMapRoutePreview(original, ['a', 'b']), original);
  assert.deepEqual(buildMapRoutePreview(original, ['a', 'b', 'missing']), original);
});

test('AI generation, preview, and acceptance share eligibility for ambiguous coordinates', () => {
  const validMapStops = geographicStops.map((stop, index) =>
    mappedStop(stop.id, stop.latitude, stop.longitude, index + 1, {
      coordinateConfidence: 'valid',
    })
  );
  const ambiguousStop = mappedStop('ambiguous', -23.558, -46.650, 7, {
    coordinateStatus: 'invalid',
    coordinateConfidence: 'ambiguous',
  });
  const mapStops = [...validMapStops, ambiguousStop];
  const suggestions = generateMapRouteSuggestions(mapStops);
  const eligibleIds = getAiEligibleMapStops(mapStops).map(stop => stop.id);
  const candidate = suggestions.suggestions[0];

  assert.equal(eligibleIds.includes(ambiguousStop.id), false);
  assert.equal(suggestions.eligibleStopCount, eligibleIds.length);
  assert.deepEqual([...candidate.stopIds].sort(), [...eligibleIds].sort());

  const preview = buildMapRoutePreview(mapStops, candidate.stopIds);
  assert.equal(preview.length, mapStops.length);
  assert.deepEqual(preview.slice(0, eligibleIds.length).map(stop => stop.id), candidate.stopIds);
  assert.equal(preview.at(-1).id, ambiguousStop.id);
  assert.notDeepEqual(preview.map(stop => stop.id), mapStops.map(stop => stop.id));

  const routeStops = mapStops.map((stop, index) => routeStop(stop.id, index));
  const accepted = applyEligibleRouteOrder(routeStops, eligibleIds, candidate.stopIds);
  const acceptedIds = accepted.stops.map(stop => stop.id);

  assert.equal(accepted.applied, true);
  assert.equal(acceptedIds.at(-1), ambiguousStop.id);
  assert.equal(acceptedIds.length, mapStops.length);
  assert.equal(new Set(acceptedIds).size, mapStops.length);
  assert.deepEqual([...acceptedIds].sort(), mapStops.map(stop => stop.id).sort());
});

test('sanitized recovered coordinates are explicitly trusted across the AI flow', () => {
  const baseStops = [
    ...geographicStops.slice(0, 5).map((stop, index) =>
      mappedStop(stop.id, stop.latitude, stop.longitude, index + 1, {
        coordinateConfidence: 'valid',
      })
    ),
    mappedStop('recovered', null, null, 6),
  ];
  const recoveredStops = applyRecoveredMapCoordinates(baseStops, {
    recovered: { latitude: -23.562, longitude: -46.658 },
  });
  const recovered = recoveredStops.find(stop => stop.id === 'recovered');
  const suggestions = generateMapRouteSuggestions(recoveredStops);
  const eligibleIds = getAiEligibleMapStops(recoveredStops).map(stop => stop.id);

  assert.equal(recovered.coordinateStatus, 'recovered');
  assert.equal(recovered.coordinateConfidence, 'valid');
  assert.equal(eligibleIds.includes('recovered'), true);
  assert.equal(suggestions.eligibleStopCount, eligibleIds.length);
  assert.equal(suggestions.suggestions[0].stopIds.includes('recovered'), true);
  assert.deepEqual(
    buildMapRoutePreview(recoveredStops, suggestions.suggestions[0].stopIds)
      .slice(0, eligibleIds.length)
      .map(stop => stop.id),
    suggestions.suggestions[0].stopIds
  );
});
