import type { GroupedStop } from '../../packageUtils.ts';
import { DEFAULT_OPTIMIZATION_CONTEXT, estimateDurationMinutes } from '../RouteAnalyzer.ts';
import { optimizeStopOrder } from '../RouteOptimizer.ts';
import type { OptimizationContext, OptimizationStrategy, RouteCoordinate } from '../OptimizationTypes.ts';
import {
  applyLockedStopPositions,
  partitionRouteStops,
  type LockedStop,
} from './LockedStopsManager.ts';
import {
  analyzeRemainingRoute,
  calculateRemainingDistanceKm,
  calculateRemainingRouteMetricSummary,
  type RemainingRouteAnalysis,
} from './RemainingRouteAnalyzer.ts';
import {
  calculateRuntimeConfidence,
  explainRecommendedMove,
  findFirstMove,
  type RuntimeOptimizationReason,
} from './OptimizationReasonEngine.ts';

export type RuntimeOptimizationStrategy =
  | 'fastest'
  | 'shortest-distance'
  | 'balanced'
  | 'cluster'
  | 'traffic'
  | 'learning'
  | 'ai'
  | 'driver-profile';

export interface RouteOptimizationRecommendation {
  id: string;
  strategy: RuntimeOptimizationStrategy;
  proposedRemainingStops: GroupedStop[];
  proposedStopIds: string[];
  move: { stopId: string; fromIndex: number; toIndex: number } | null;
  reason: RuntimeOptimizationReason;
  estimatedSavingsMinutes: number;
  estimatedSavingsKm: number;
  confidence: number;
  driverAction: 'accept-recommendation' | 'ignore' | 'preview-changes';
}

export interface RemainingRouteOptimizationInput {
  currentPosition: RouteCoordinate | null;
  stops: readonly GroupedStop[];
  lockedStops?: readonly LockedStop[];
  strategy?: RuntimeOptimizationStrategy;
  context?: Partial<OptimizationContext>;
}

export interface RemainingRouteOptimizationResult {
  analysis: RemainingRouteAnalysis;
  recommendation: RouteOptimizationRecommendation | null;
}

export async function optimizeRemainingRoute(
  input: RemainingRouteOptimizationInput
): Promise<RemainingRouteOptimizationResult> {
  await yieldToRuntime();
  const strategy = input.strategy ?? 'balanced';
  const context = { ...DEFAULT_OPTIMIZATION_CONTEXT, ...input.context };
  const partitions = partitionRouteStops(input.stops, input.lockedStops);
  const analysis = analyzeRemainingRoute({
    currentPosition: input.currentPosition,
    stops: input.stops,
    lockedStops: input.lockedStops,
    strategy: normalizeStrategy(strategy),
    context,
  });

  if (partitions.movableRemainingStops.length < 2) {
    return { analysis, recommendation: null };
  }

  const optimizedMovableStops = optimizeStopOrder(partitions.movableRemainingStops, normalizeStrategy(strategy));
  const proposedRemainingStops = applyLockedStopPositions(
    partitions.remainingStops,
    optimizedMovableStops,
    input.lockedStops
  );
  const proposedMetricSummary = calculateRemainingRouteMetricSummary(input.currentPosition, proposedRemainingStops);
  const proposedDistance = proposedMetricSummary.distanceKm;
  const proposedDuration = estimateDurationMinutes(proposedDistance, proposedRemainingStops.length, context);
  const canTrustSavings = analysis.metricConfidence === 'reliable'
    && proposedMetricSummary.metricConfidence === 'reliable';
  const savingsMinutes = canTrustSavings
    ? Math.max(0, analysis.remainingDurationMinutes - proposedDuration)
    : 0;
  const savingsKm = canTrustSavings
    ? Math.max(0, analysis.remainingDistanceKm - proposedDistance)
    : 0;

  if (savingsMinutes < 2 && savingsKm < 0.5) {
    return { analysis, recommendation: null };
  }

  const move = findFirstMove(partitions.remainingStops, proposedRemainingStops);
  const reason = explainRecommendedMove(partitions.remainingStops, proposedRemainingStops, savingsMinutes);

  return {
    analysis,
    recommendation: {
      id: `runtime-rec-${Date.now()}`,
      strategy,
      proposedRemainingStops,
      proposedStopIds: proposedRemainingStops.map(stop => stop.id),
      move,
      reason,
      estimatedSavingsMinutes: savingsMinutes,
      estimatedSavingsKm: Math.round(savingsKm * 10) / 10,
      confidence: calculateRuntimeConfidence(
        partitions.remainingStops,
        savingsMinutes,
        partitions.lockedRemainingStops.length,
        resolveMetricConfidence(analysis.metricConfidence, proposedMetricSummary.metricConfidence)
      ),
      driverAction: 'preview-changes',
    },
  };
}

function resolveMetricConfidence(
  current: RemainingRouteAnalysis['metricConfidence'],
  proposed: RemainingRouteAnalysis['metricConfidence']
): RemainingRouteAnalysis['metricConfidence'] {
  if (current === 'unreliable' || proposed === 'unreliable') return 'unreliable';
  if (current === 'degraded' || proposed === 'degraded') return 'degraded';
  return 'reliable';
}

function normalizeStrategy(strategy: RuntimeOptimizationStrategy): OptimizationStrategy {
  if (strategy === 'traffic') return 'traffic';
  if (strategy === 'learning') return 'learning';
  if (strategy === 'ai') return 'ai';
  if (strategy === 'driver-profile') return 'driver-profile';
  return strategy;
}

function yieldToRuntime(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}
