import type { GroupedStop } from '../../packageUtils.ts';
import { DEFAULT_OPTIMIZATION_CONTEXT, estimateDurationMinutes } from '../RouteAnalyzer.ts';
import { optimizeStopOrder } from '../RouteOptimizer.ts';
import type { OptimizationContext, RouteAnalysis, RouteCoordinate } from '../OptimizationTypes.ts';
import type { MetricProvenance } from '../../coordinateIntegrity.ts';
import { applyLockedStopPositions, partitionRouteStops, type LockedStop } from './LockedStopsManager.ts';
import { calculateRuntimeConfidence } from './OptimizationReasonEngine.ts';
import { calculateRemainingRouteMetricSummary } from './RemainingRouteAnalyzer.ts';
import type { RuntimeOptimizationStrategy } from './RemainingRouteOptimizer.ts';

export interface RouteSimulationInput {
  currentPosition: RouteCoordinate | null;
  stops: readonly GroupedStop[];
  lockedStops?: readonly LockedStop[];
  context?: Partial<OptimizationContext>;
}

export interface RouteSimulationResult {
  strategy: 'current' | RuntimeOptimizationStrategy;
  stopIds: string[];
  distanceKm: number;
  durationMinutes: number;
  savingsMinutes: number;
  savingsKm: number;
  confidence: number;
  metricConfidence: RouteAnalysis['metricConfidence'];
  metricProvenance: MetricProvenance;
}

export interface RouteSimulationSummary {
  current: RouteSimulationResult;
  fastest: RouteSimulationResult;
  shortest: RouteSimulationResult;
  balanced: RouteSimulationResult;
  cluster: RouteSimulationResult;
  winner: RouteSimulationResult;
}

export function simulateRemainingRouteStrategies(input: RouteSimulationInput): RouteSimulationSummary {
  const context = { ...DEFAULT_OPTIMIZATION_CONTEXT, ...input.context };
  const partitions = partitionRouteStops(input.stops, input.lockedStops);
  const currentMetricSummary = calculateRemainingRouteMetricSummary(input.currentPosition, partitions.remainingStops);
  const current = buildSimulationResult(
    'current',
    partitions.remainingStops,
    context,
    0,
    0,
    calculateRuntimeConfidence(
      partitions.remainingStops,
      0,
      partitions.lockedRemainingStops.length,
      currentMetricSummary.metricConfidence
    ),
    currentMetricSummary
  );
  const fastest = simulateStrategy('fastest', input, current);
  const shortest = simulateStrategy('shortest-distance', input, current);
  const balanced = simulateStrategy('balanced', input, current);
  const cluster = simulateStrategy('cluster', input, current);
  const winner = [fastest, shortest, balanced, cluster]
    .sort((a, b) => b.savingsMinutes - a.savingsMinutes || b.confidence - a.confidence)[0];

  return {
    current,
    fastest,
    shortest,
    balanced,
    cluster,
    winner,
  };
}

function simulateStrategy(
  strategy: RuntimeOptimizationStrategy,
  input: RouteSimulationInput,
  current: RouteSimulationResult
): RouteSimulationResult {
  const context = { ...DEFAULT_OPTIMIZATION_CONTEXT, ...input.context };
  const partitions = partitionRouteStops(input.stops, input.lockedStops);
  const optimizedMovableStops = optimizeStopOrder(partitions.movableRemainingStops, strategy);
  const proposedRemainingStops = applyLockedStopPositions(
    partitions.remainingStops,
    optimizedMovableStops,
    input.lockedStops
  );
  const proposedMetricSummary = calculateRemainingRouteMetricSummary(input.currentPosition, proposedRemainingStops);
  const distanceKm = proposedMetricSummary.distanceKm;
  const durationMinutes = estimateDurationMinutes(distanceKm, proposedRemainingStops.length, context);
  const canTrustSavings = current.metricConfidence === 'reliable'
    && proposedMetricSummary.metricConfidence === 'reliable';
  const savingsMinutes = canTrustSavings ? Math.max(0, current.durationMinutes - durationMinutes) : 0;
  const savingsKm = canTrustSavings ? Math.max(0, current.distanceKm - distanceKm) : 0;

  return buildSimulationResult(
    strategy,
    proposedRemainingStops,
    context,
    savingsMinutes,
    savingsKm,
    calculateRuntimeConfidence(
      partitions.remainingStops,
      savingsMinutes,
      partitions.lockedRemainingStops.length,
      proposedMetricSummary.metricConfidence
    ),
    proposedMetricSummary
  );
}

function buildSimulationResult(
  strategy: 'current' | RuntimeOptimizationStrategy,
  stops: readonly GroupedStop[],
  context: OptimizationContext,
  savingsMinutes: number,
  savingsKm: number,
  confidence: number,
  metricSummary: ReturnType<typeof calculateRemainingRouteMetricSummary>
): RouteSimulationResult {
  const distanceKm = metricSummary.distanceKm;
  return {
    strategy,
    stopIds: stops.map(stop => stop.id),
    distanceKm,
    durationMinutes: estimateDurationMinutes(distanceKm, stops.length, context),
    savingsMinutes,
    savingsKm: Math.round(savingsKm * 10) / 10,
    confidence,
    metricConfidence: metricSummary.metricConfidence,
    metricProvenance: metricSummary.metricProvenance,
  };
}
