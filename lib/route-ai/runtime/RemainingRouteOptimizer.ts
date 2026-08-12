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
  const proposedDistance = calculateRemainingDistanceKm(input.currentPosition, proposedRemainingStops);
  const proposedDuration = estimateDurationMinutes(proposedDistance, proposedRemainingStops.length, context);
  const savingsMinutes = Math.max(0, analysis.remainingDurationMinutes - proposedDuration);
  const savingsKm = Math.max(0, analysis.remainingDistanceKm - proposedDistance);

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
        partitions.lockedRemainingStops.length
      ),
      driverAction: 'preview-changes',
    },
  };
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
