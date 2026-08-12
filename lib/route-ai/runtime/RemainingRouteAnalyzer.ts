import type { GroupedStop } from '../../packageUtils.ts';
import {
  calculateDistanceKm,
  calculateRouteDistanceKm,
  DEFAULT_OPTIMIZATION_CONTEXT,
  estimateDurationMinutes,
  getNeighborhood,
  getStopCoordinate,
  roundDistance,
} from '../RouteAnalyzer.ts';
import { optimizeStopOrder } from '../RouteOptimizer.ts';
import type { OptimizationContext, OptimizationStrategy, RouteCoordinate } from '../OptimizationTypes.ts';
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
}

export function analyzeRemainingRoute(input: RemainingRouteAnalyzerInput): RemainingRouteAnalysis {
  const context = { ...DEFAULT_OPTIMIZATION_CONTEXT, ...input.context };
  const partitions = partitionRouteStops(input.stops, input.lockedStops);
  const remainingDistanceKm = calculateRemainingDistanceKm(input.currentPosition, partitions.remainingStops);
  const remainingDurationMinutes = estimateDurationMinutes(remainingDistanceKm, partitions.remainingStops.length, context);
  const simulatedMovableOrder = optimizeStopOrder(partitions.movableRemainingStops, input.strategy ?? 'balanced');
  const simulatedOrder = applyLockedStopPositions(
    partitions.remainingStops,
    simulatedMovableOrder,
    input.lockedStops
  );
  const simulatedDistance = calculateRemainingDistanceKm(input.currentPosition, simulatedOrder);
  const simulatedDuration = estimateDurationMinutes(simulatedDistance, simulatedOrder.length, context);

  return {
    remainingStops: partitions.remainingStops,
    completedStopIds: partitions.completedStops.map(stop => stop.id),
    skippedStopIds: partitions.skippedStops.map(stop => stop.id),
    lockedStopIds: partitions.lockedRemainingStops.map(stop => stop.id),
    remainingDistanceKm,
    remainingDurationMinutes,
    clusterQuality: calculateClusterQuality(partitions.remainingStops),
    backtrackingCount: countBacktracking(partitions.remainingStops),
    potentialSavingsKm: roundDistance(Math.max(0, remainingDistanceKm - simulatedDistance)),
    potentialSavingsMinutes: Math.max(0, remainingDurationMinutes - simulatedDuration),
  };
}

export function calculateRemainingDistanceKm(
  currentPosition: RouteCoordinate | null,
  remainingStops: readonly GroupedStop[]
): number {
  if (remainingStops.length === 0) return 0;
  const routeDistance = calculateRouteDistanceKm(remainingStops);
  const firstLeg = currentPosition
    ? calculatePositionToStopDistanceKm(currentPosition, remainingStops[0])
    : 0;
  return roundDistance(firstLeg + routeDistance);
}

export function calculatePositionToStopDistanceKm(
  currentPosition: RouteCoordinate,
  stop: GroupedStop
): number {
  const stopCoordinate = getStopCoordinate(stop);
  if (!stopCoordinate) return 1.4;
  return roundDistance(haversineDistanceKm(currentPosition, stopCoordinate));
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

function haversineDistanceKm(a: RouteCoordinate, b: RouteCoordinate): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function toRadians(value: number): number {
  return value * Math.PI / 180;
}
