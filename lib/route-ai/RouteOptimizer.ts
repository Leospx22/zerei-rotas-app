import type { GroupedStop } from '@/lib/packageUtils';
import {
  analyzeRoute,
  calculateRouteDistanceKm,
  DEFAULT_OPTIMIZATION_CONTEXT,
  estimateDurationMinutes,
  getNeighborhood,
  getStreetName,
} from './RouteAnalyzer.ts';
import type {
  IOptimizationStrategy,
  IRouteOptimizationProvider,
  OptimizationContext,
  OptimizationStrategy,
  RouteAnalysis,
  RouteOptimizationResult,
} from './OptimizationTypes.ts';

const STRATEGY_LABELS: Record<OptimizationStrategy, string> = {
  fastest: 'Mais rápida',
  'shortest-distance': 'Menor distância',
  balanced: 'Equilibrada',
  cluster: 'Agrupada',
  'traffic-aware': 'Com trânsito',
  'driver-preference': 'Preferência do motorista',
  'historical-learning': 'Aprendizado histórico',
  traffic: 'Trânsito',
  learning: 'Aprendizado',
  ai: 'IA',
  'driver-profile': 'Perfil do motorista',
};

export class DeterministicRouteOptimizer implements IRouteOptimizationProvider {
  readonly id = 'local';
  readonly label = 'Otimizador local determinístico';

  private readonly strategies: Record<string, IOptimizationStrategy> = {
    fastest: new LocalOptimizationStrategy('fastest'),
    'shortest-distance': new LocalOptimizationStrategy('shortest-distance'),
    balanced: new LocalOptimizationStrategy('balanced'),
    cluster: new LocalOptimizationStrategy('cluster'),
  };

  async optimize(
    stops: readonly GroupedStop[],
    strategy: OptimizationStrategy = 'balanced',
    context: Partial<OptimizationContext> = {}
  ): Promise<RouteOptimizationResult> {
    await yieldToRuntime();
    const resolvedContext = { ...DEFAULT_OPTIMIZATION_CONTEXT, ...context };
    const analysis = analyzeRoute(stops, resolvedContext);
    const optimizer = this.strategies[strategy] ?? this.strategies.balanced;
    return optimizer.optimize(stops, analysis, resolvedContext);
  }
}

class LocalOptimizationStrategy implements IOptimizationStrategy {
  readonly id: OptimizationStrategy;
  readonly label: string;

  constructor(id: OptimizationStrategy) {
    this.id = id;
    this.label = STRATEGY_LABELS[id];
  }

  optimize(
    stops: readonly GroupedStop[],
    analysis: RouteAnalysis,
    context: OptimizationContext
  ): RouteOptimizationResult {
    const orderedStops = optimizeStopOrder(stops, this.id);
    const originalDistance = analysis.originalDistanceKm;
    const optimizedDistance = calculateRouteDistanceKm(orderedStops);
    const estimatedDuration = estimateDurationMinutes(optimizedDistance, stops.length, context);
    const originalDuration = analysis.estimatedOriginalDurationMinutes;
    const distanceSavings = Math.max(0, originalDistance - optimizedDistance);

    return {
      strategy: this.id,
      optimizedStops: orderedStops.map((stop, optimizedIndex) => ({
        stop,
        originalIndex: stops.findIndex(candidate => candidate.id === stop.id),
        optimizedIndex,
      })),
      optimizedStopIds: orderedStops.map(stop => stop.id),
      estimatedDistanceKm: optimizedDistance,
      estimatedDurationMinutes: estimatedDuration,
      estimatedSavingsMinutes: Math.max(0, originalDuration - estimatedDuration),
      estimatedDistanceSavingsKm: distanceSavings,
      confidenceScore: calculateConfidenceScore(stops, analysis, distanceSavings),
    };
  }
}

export function optimizeStopOrder(
  stops: readonly GroupedStop[],
  strategy: OptimizationStrategy = 'balanced'
): GroupedStop[] {
  if (stops.length <= 2) return [...stops];

  const ordered = [...stops].sort((a, b) => {
    const clusterCompare = getClusterKey(a, strategy).localeCompare(getClusterKey(b, strategy));
    if (clusterCompare !== 0) return clusterCompare;

    const coordinateCompare = compareCoordinates(a, b, strategy);
    if (coordinateCompare !== 0) return coordinateCompare;

    return a.orderIndex - b.orderIndex;
  });

  return twoOptImprove(ordered, strategy);
}

function twoOptImprove(stops: GroupedStop[], strategy: OptimizationStrategy): GroupedStop[] {
  if (stops.length < 4) return stops;
  const maxIterations = stops.length <= 80 ? 2 : 1;
  let best = stops;
  let bestDistance = calculateRouteDistanceKm(best);

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let improved = false;
    for (let start = 1; start < best.length - 2; start++) {
      const endStep = best.length > 120 ? 3 : 1;
      for (let end = start + 1; end < best.length - 1; end += endStep) {
        const candidate = [
          ...best.slice(0, start),
          ...best.slice(start, end + 1).reverse(),
          ...best.slice(end + 1),
        ];
        const candidateDistance = calculateRouteDistanceKm(candidate);
        if (candidateDistance + strategyTolerance(strategy) < bestDistance) {
          best = candidate;
          bestDistance = candidateDistance;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }

  return best;
}

function getClusterKey(stop: GroupedStop, strategy: OptimizationStrategy): string {
  const neighborhood = getNeighborhood(stop);
  const street = getStreetName(stop.normalizedAddress);
  if (strategy === 'fastest') {
    return `${neighborhood}|${String(9999 - stop.packageCount).padStart(4, '0')}|${street}`;
  }
  if (strategy === 'cluster') return `${neighborhood}|${String(stop.orderIndex).padStart(4, '0')}|${street}`;
  if (strategy === 'shortest-distance') return `${neighborhood}|${street}`;
  return `${neighborhood}|${street}|${String(stop.orderIndex).padStart(4, '0')}`;
}

function compareCoordinates(a: GroupedStop, b: GroupedStop, strategy: OptimizationStrategy): number {
  if (a.latitude === null || a.longitude === null || b.latitude === null || b.longitude === null) return 0;
  const latitudeCompare = a.latitude - b.latitude;
  const longitudeCompare = a.longitude - b.longitude;
  if (strategy === 'fastest') return longitudeCompare || latitudeCompare;
  return latitudeCompare || longitudeCompare;
}

function calculateConfidenceScore(
  stops: readonly GroupedStop[],
  analysis: RouteAnalysis,
  distanceSavingsKm: number
): number {
  const missingCoordinateRatio = stops.filter(stop => stop.latitude === null || stop.longitude === null).length / Math.max(stops.length, 1);
  const coordinatePenalty = Math.round(missingCoordinateRatio * 30);
  const duplicateSignal = Math.min(12, analysis.duplicateNeighborhoods.length + analysis.duplicateStreets.length);
  const savingsSignal = Math.min(18, Math.round(distanceSavingsKm * 2));
  return clampScore(76 - coordinatePenalty + duplicateSignal + savingsSignal);
}

function strategyTolerance(strategy: OptimizationStrategy): number {
  if (strategy === 'shortest-distance') return 0.05;
  if (strategy === 'fastest') return 0.15;
  if (strategy === 'cluster') return 0.2;
  return 0.1;
}

function yieldToRuntime(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
