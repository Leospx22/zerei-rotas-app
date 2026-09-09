import type { GroupedStop } from '../../packageUtils.ts';
import {
  calculateDistanceKm,
  calculateRouteMetricSummary,
  DEFAULT_OPTIMIZATION_CONTEXT,
  estimateDurationMinutes,
  getNeighborhood,
  getStopCoordinate,
  roundDistance,
} from '../RouteAnalyzer.ts';
import {
  haversineDistanceKm,
  sanitizeCoordinatePair,
  sanitizeRouteCoordinates,
  type CoordinateConfidence,
  type MetricProvenance,
} from '../../coordinateIntegrity.ts';
import { optimizeStopOrder } from '../RouteOptimizer.ts';
import type { OptimizationContext, OptimizationStrategy, RouteCoordinate, RouteSegmentMetric } from '../OptimizationTypes.ts';
import { applyLockedStopPositions, partitionRouteStops, type LockedStop } from './LockedStopsManager.ts';

export interface RemainingRouteAnalyzerInput {
  currentPosition: RouteCoordinate | null;
  stops: readonly GroupedStop[];
  lockedStops?: readonly LockedStop[];
  strategy?: OptimizationStrategy;
  context?: Partial<OptimizationContext>;
}

export interface RemainingRouteAnalysis {
  remainingStops: GroupedStop[];
  completedStopIds: string[];
  skippedStopIds: string[];
  lockedStopIds: string[];
  remainingDistanceKm: number;
  remainingDurationMinutes: number;
  clusterQuality: number;
  backtrackingCount: number;
  potentialSavingsKm: number;
  potentialSavingsMinutes: number;
  metricConfidence: 'reliable' | 'degraded' | 'unreliable';
  metricProvenance: MetricProvenance;
  unreliableSegmentCount: number;
  segments: RouteSegmentMetric[];
}

export function analyzeRemainingRoute(input: RemainingRouteAnalyzerInput): RemainingRouteAnalysis {
  const context = { ...DEFAULT_OPTIMIZATION_CONTEXT, ...input.context };
  const partitions = partitionRouteStops(input.stops, input.lockedStops);
  const remainingMetricSummary = calculateRemainingRouteMetricSummary(input.currentPosition, partitions.remainingStops);
  const remainingDistanceKm = remainingMetricSummary.distanceKm;
  const remainingDurationMinutes = estimateDurationMinutes(remainingDistanceKm, partitions.remainingStops.length, context);
  const simulatedMovableOrder = optimizeStopOrder(partitions.movableRemainingStops, input.strategy ?? 'balanced');
  const simulatedOrder = applyLockedStopPositions(
    partitions.remainingStops,
    simulatedMovableOrder,
    input.lockedStops
  );
  const simulatedMetricSummary = calculateRemainingRouteMetricSummary(input.currentPosition, simulatedOrder);
  const simulatedDuration = estimateDurationMinutes(simulatedMetricSummary.distanceKm, simulatedOrder.length, context);
  const canTrustSavings = remainingMetricSummary.metricConfidence === 'reliable'
    && simulatedMetricSummary.metricConfidence === 'reliable';

  return {
    remainingStops: partitions.remainingStops,
    completedStopIds: partitions.completedStops.map(stop => stop.id),
    skippedStopIds: partitions.skippedStops.map(stop => stop.id),
    lockedStopIds: partitions.lockedRemainingStops.map(stop => stop.id),
    remainingDistanceKm,
    remainingDurationMinutes,
    clusterQuality: calculateClusterQuality(partitions.remainingStops),
    backtrackingCount: countBacktracking(partitions.remainingStops),
    potentialSavingsKm: canTrustSavings
      ? roundDistance(Math.max(0, remainingDistanceKm - simulatedMetricSummary.distanceKm))
      : 0,
    potentialSavingsMinutes: canTrustSavings
      ? Math.max(0, remainingDurationMinutes - simulatedDuration)
      : 0,
    metricConfidence: remainingMetricSummary.metricConfidence,
    metricProvenance: remainingMetricSummary.metricProvenance,
    unreliableSegmentCount: remainingMetricSummary.unreliableSegmentCount,
    segments: remainingMetricSummary.segments,
  };
}

export function calculateRemainingRouteMetricSummary(
  currentPosition: RouteCoordinate | null,
  remainingStops: readonly GroupedStop[]
): {
  distanceKm: number;
  segments: RouteSegmentMetric[];
  metricConfidence: 'reliable' | 'degraded' | 'unreliable';
  metricProvenance: MetricProvenance;
  unreliableSegmentCount: number;
} {
  const sanitizedStops = sanitizeRouteCoordinates(remainingStops);
  const routeSummary = calculateRouteMetricSummary(sanitizedStops);
  const firstLeg = currentPosition && sanitizedStops[0]
    ? calculatePositionToStopMetric(currentPosition, sanitizedStops[0])
    : null;
  const segments = firstLeg ? [firstLeg, ...routeSummary.segments] : routeSummary.segments;
  const unreliableSegmentCount = segments.filter(segment => segment.confidence === 'unreliable').length;
  const degradedSegmentCount = segments.filter(segment => segment.confidence === 'degraded').length;

  return {
    distanceKm: roundDistance(routeSummary.distanceKm + (firstLeg?.distanceKm ?? 0)),
    segments,
    metricConfidence: unreliableSegmentCount > 0
      ? 'unreliable'
      : degradedSegmentCount > 0 || routeSummary.metricConfidence === 'degraded'
        ? 'degraded'
        : 'reliable',
    metricProvenance: routeSummary.metricProvenance,
    unreliableSegmentCount,
  };
}

export function calculateRemainingDistanceKm(
  currentPosition: RouteCoordinate | null,
  remainingStops: readonly GroupedStop[]
): number {
  return calculateRemainingRouteMetricSummary(currentPosition, remainingStops).distanceKm;
}

export function calculatePositionToStopDistanceKm(
  currentPosition: RouteCoordinate,
  stop: GroupedStop
): number {
  return calculatePositionToStopMetric(currentPosition, stop).distanceKm;
}

function calculatePositionToStopMetric(
  currentPosition: RouteCoordinate,
  stop: GroupedStop
): RouteSegmentMetric {
  const current = sanitizeCoordinatePair(currentPosition.latitude, currentPosition.longitude);
  const stopCoordinate = getStopCoordinate(stop);
  const stopConfidence = getStopConfidence(stop);
  const confidence = resolveSegmentConfidence(current.confidence, stopConfidence);
  const distanceKm = current.latitude !== null
    && current.longitude !== null
    && stopCoordinate
    && confidence !== 'unreliable'
      ? haversineDistanceKm(
        { latitude: current.latitude, longitude: current.longitude },
        stopCoordinate
      )
      : 0;

  return {
    fromStopId: 'current-position',
    toStopId: stop.id,
    distanceKm: roundDistance(distanceKm),
    provenance: 'estimated',
    confidence,
    coordinateConfidence: {
      from: current.confidence,
      to: stopConfidence,
    },
  };
}

function getStopConfidence(stop: GroupedStop): CoordinateConfidence {
  const coordinateIntegrity = (stop as GroupedStop & {
    coordinateIntegrity?: { confidence: CoordinateConfidence };
  }).coordinateIntegrity;
  return coordinateIntegrity?.confidence
    ?? (stop.coordinateConfidence as CoordinateConfidence | undefined)
    ?? sanitizeCoordinatePair(stop.latitude, stop.longitude).confidence;
}

function resolveSegmentConfidence(
  from: CoordinateConfidence,
  to: CoordinateConfidence
): RouteSegmentMetric['confidence'] {
  const values = [from, to];
  if (values.some(value => value === 'invalid' || value === 'outlier' || value === 'unavailable')) {
    return 'unreliable';
  }
  if (values.some(value => value === 'ambiguous')) return 'degraded';
  return 'reliable';
}

function calculateClusterQuality(stops: readonly GroupedStop[]): number {
  if (stops.length <= 1) return 1;
  let sameAreaTransitions = 0;
  for (let index = 1; index < stops.length; index++) {
    if (getNeighborhood(stops[index - 1]) === getNeighborhood(stops[index])) {
      sameAreaTransitions++;
    }
  }
  return Math.round((sameAreaTransitions / (stops.length - 1)) * 100) / 100;
}

function countBacktracking(stops: readonly GroupedStop[]): number {
  let count = 0;
  for (let index = 2; index < stops.length; index++) {
    const previousLeg = calculateDistanceKm(stops[index - 2], stops[index - 1]);
    const currentLeg = calculateDistanceKm(stops[index - 1], stops[index]);
    const directLeg = calculateDistanceKm(stops[index - 2], stops[index]);
    if (previousLeg + currentLeg > directLeg * 2.2 && currentLeg > 1.5) count++;
  }
  return count;
}

