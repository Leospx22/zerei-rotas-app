import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BRAZIL_COORDINATE_CONTEXT,
  sanitizeCoordinatePair,
  sanitizeRouteCoordinates,
} from '../lib/coordinateIntegrity.ts';
import {
  analyzeRoute,
  compareRoutes,
  DeterministicRouteOptimizer,
  generateRouteAIReport,
  optimizeStopOrder,
  scoreRoute,
} from '../lib/route-ai/index.ts';
import { validatePersistedRoute } from '../lib/routePersistence.ts';

const SAO_PAULO_POINTS = [
  [-23.5505, -46.6333],
  [-23.5510, -46.6340],
  [-23.5520, -46.6350],
  [-23.5530, -46.6360],
  [-23.5540, -46.6370],
  [-23.5550, -46.6380],
];

function stop(id, index, latitude, longitude) {
  const address = `Rua D0A, ${index + 10} - Centro`;
  return {
    id,
    stopNumber: index + 1,
    originalStopNumber: index + 1,
    normalizedAddress: address,
    originalAddress: address,
    zipCode: '01310-000',
    latitude,
    longitude,
    packages: [{
      id: `${id}-pkg`,
      trackingNumber: `${id}-tracking`,
      destinationAddress: address,
      zipCode: '01310-000',
      latitude,
      longitude,
      stopNumber: index + 1,
      status: 'pending',
    }],
    packageCount: 1,
    addressGroups: [{
      normalizedAddress: address,
      originalAddress: address,
      zipCode: '01310-000',
      packageIds: [`${id}-pkg`],
      packageCount: 1,
    }],
    addressCount: 1,
    orderIndex: index,
    status: 'pending',
    houseNumber: String(index + 10),
    duplicateAddressWarning: false,
  };
}

function persistedRoute(stops) {
  return {
    id: 'route-d0a',
    name: 'Rota D0A',
    stops,
    status: 'planning',
    estimatedDistanceKm: 0,
    completedStops: 0,
    totalPackages: stops.length,
    deliveredPackages: 0,
    startTime: null,
    durationMinutes: 0,
  };
}

test('D.0A coordinate schema rejects malformed and out-of-range values', () => {
  assert.equal(sanitizeCoordinatePair(-23.5505, -46.6333).confidence, 'valid');
  assert.equal(sanitizeCoordinatePair(null, -46.6333).confidence, 'invalid');
  assert.equal(sanitizeCoordinatePair(undefined, -46.6333).confidence, 'invalid');
  assert.equal(sanitizeCoordinatePair(Number.NaN, -46.6333).confidence, 'invalid');
  assert.equal(sanitizeCoordinatePair(Number.POSITIVE_INFINITY, -46.6333).confidence, 'invalid');
  assert.equal(sanitizeCoordinatePair('abc', '-46.6333').confidence, 'invalid');
  assert.equal(sanitizeCoordinatePair(0, 0).confidence, 'invalid');
  assert.equal(sanitizeCoordinatePair(0.0001, -0.0001).confidence, 'invalid');
  assert.equal(sanitizeCoordinatePair(91, -46.6333).confidence, 'invalid');
  assert.equal(sanitizeCoordinatePair(-23.5505, -181).confidence, 'invalid');
});

test('D.0A swap handling corrects obvious swaps and flags ambiguous configured regions', () => {
  const swapped = sanitizeCoordinatePair(-46.6333, -23.5505);
  assert.equal(swapped.confidence, 'corrected_swap');
  assert.equal(swapped.latitude, -23.5505);
  assert.equal(swapped.longitude, -46.6333);

  const ambiguous = sanitizeCoordinatePair(10, 20, {
    id: 'TEST',
    label: 'Região de teste',
    bounds: {
      minLatitude: 0,
      maxLatitude: 30,
      minLongitude: 0,
      maxLongitude: 30,
    },
    nearZeroThresholdDegrees: 0.001,
    outlierThresholdKm: 120,
    outlierMadMultiplier: 3,
  });

  assert.equal(ambiguous.confidence, 'ambiguous');
  assert.equal(ambiguous.latitude, 10);
  assert.equal(ambiguous.longitude, 20);
});

test('D.0A route sanitizer flags outliers without removing stops', () => {
  const routeStops = [
    stop('a', 0, -23.5505, -46.6333),
    stop('b', 1, -23.5510, -46.6340),
    stop('c', 2, -23.5520, -46.6350),
    stop('outlier', 3, -15.7939, -47.8828),
  ];
  const sanitized = sanitizeRouteCoordinates(routeStops, BRAZIL_COORDINATE_CONTEXT);

  assert.equal(sanitized.length, 4);
  assert.equal(sanitized[3].coordinateIntegrity.confidence, 'outlier');
  assert.equal(sanitized[3].coordinateIntegrity.latitude, null);
  assert.equal(sanitized[3].id, 'outlier');
});

test('D.0A unreliable stops do not contaminate route metrics, score, or intelligence', async () => {
  const routeStops = [
    stop('a', 0, -23.5505, -46.6333),
    stop('b', 1, -23.5510, -46.6340),
    stop('bad', 2, 0, 0),
    stop('c', 3, -23.5520, -46.6350),
  ];
  const analysis = analyzeRoute(routeStops);
  const score = scoreRoute(routeStops, analysis);
  const optimizer = new DeterministicRouteOptimizer();
  const optimization = await optimizer.optimize(routeStops, 'balanced');
  const comparison = compareRoutes(
    analysis.originalDistanceKm,
    optimization.estimatedDistanceKm,
    analysis.estimatedOriginalDurationMinutes,
    optimization.estimatedDurationMinutes,
    {},
    {
      originalMetricConfidence: analysis.metricConfidence,
      optimizedMetricConfidence: optimization.metricConfidence,
      metricProvenance: analysis.metricProvenance,
    }
  );
  const report = await generateRouteAIReport(routeStops, 'balanced');

  assert.equal(analysis.metricProvenance, 'estimated');
  assert.equal(analysis.metricConfidence, 'unreliable');
  assert.equal(analysis.unreliableSegmentCount, 2);
  assert.equal(analysis.segments.find(segment => segment.toStopId === 'bad')?.distanceKm, 0);
  assert.equal(optimization.estimatedDistanceSavingsKm, 0);
  assert.equal(comparison.distanceSavedKm, 0);
  assert.equal(comparison.estimatedFuelSavedLiters, 0);
  assert.ok(score.factors.some(factor => factor.label === 'Confiança dos dados' && factor.impact < 0));
  assert.equal(report.comparison.metricConfidence, 'unreliable');
  assert.match(report.recommendation.reason, /Estimativa de distância indisponível/);
});

test('D.0A direct route comparison without confidence cannot create trusted savings', () => {
  const comparison = compareRoutes(30, 10, 90, 45);

  assert.equal(comparison.metricConfidence, 'unreliable');
  assert.equal(comparison.distanceSavedKm, 0);
  assert.equal(comparison.estimatedTimeSavedMinutes, 0);
  assert.equal(comparison.estimatedFuelSavedLiters, 0);
  assert.equal(comparison.percentageImprovement, 0);
});

test('D.0A route analyzer excludes outliers from coordinate cluster centers', () => {
  const routeStops = [
    stop('a', 0, -23.5505, -46.6333),
    stop('b', 1, -23.5510, -46.6340),
    stop('c', 2, -23.5520, -46.6350),
    stop('outlier', 3, -15.7939, -47.8828),
  ];
  const analysis = analyzeRoute(routeStops);
  const outlierCluster = analysis.clusters.find(cluster => cluster.stopIds.includes('outlier'));

  assert.ok(outlierCluster);
  assert.equal(outlierCluster.center, null);
  assert.ok(analysis.potentialBottlenecks.some(
    bottleneck => bottleneck.type === 'missing-coordinate' && bottleneck.stopIds.includes('outlier')
  ));
});

test('D.0A route optimizer ordering uses corrected swapped coordinates', () => {
  const ordered = optimizeStopOrder([
    stop('swapped', 0, -46.55, -23.55),
    stop('south', 1, -23.60, -46.60),
    stop('north', 2, -23.50, -46.50),
  ], 'shortest-distance');

  assert.deepEqual(ordered.map(item => item.id), ['south', 'swapped', 'north']);
});

test('D.0A persisted route restore sanitizes invalid coordinates with route context', () => {
  const restored = validatePersistedRoute(persistedRoute([
    stop('a', 0, -23.5505, -46.6333),
    stop('b', 1, -23.5510, -46.6340),
    stop('c', 2, -23.5520, -46.6350),
    stop('outlier', 3, -15.7939, -47.8828),
  ]));

  assert.equal(restored?.stops.length, 4);
  assert.equal(restored?.stops[3].coordinateConfidence, 'outlier');
  assert.equal(restored?.stops[3].latitude, null);
  assert.equal(restored?.stops[3].longitude, null);
});

test('D.0A swapped São Paulo regression cannot create thousands of artificial kilometers', async () => {
  const routeStops = Array.from({ length: 36 }, (_, index) => {
    const point = SAO_PAULO_POINTS[index % SAO_PAULO_POINTS.length];
    const offset = Math.floor(index / SAO_PAULO_POINTS.length) * 0.0002;
    const latitude = point[0] - offset;
    const longitude = point[1] - offset;
    if ([7, 13, 21, 29].includes(index)) {
      return stop(`swapped-${index}`, index, longitude, latitude);
    }
    if (index === 31) return stop('outlier-brasilia', index, -15.7939, -47.8828);
    if (index === 34) return stop('null-island', index, 0, 0);
    return stop(`local-${index}`, index, latitude, longitude);
  });

  const analysis = analyzeRoute(routeStops);
  const optimizer = new DeterministicRouteOptimizer();
  const optimization = await optimizer.optimize(routeStops, 'balanced');

  assert.equal(analysis.coordinateSummary.correctedSwap, 4);
  assert.equal(analysis.coordinateSummary.outlier, 1);
  assert.equal(analysis.coordinateSummary.invalid, 1);
  assert.equal(analysis.metricConfidence, 'unreliable');
  assert.ok(analysis.originalDistanceKm < 100);
  assert.ok(optimization.estimatedDistanceKm < 100);
  assert.equal(optimization.estimatedDistanceSavingsKm, 0);
  assert.equal(optimization.estimatedSavingsMinutes, 0);
});
