import type { OptimizationContext, RouteAnalysis, RouteComparisonResult } from './OptimizationTypes.ts';
import { DEFAULT_OPTIMIZATION_CONTEXT, roundDistance } from './RouteAnalyzer.ts';

export function compareRoutes(
  originalDistanceKm: number,
  optimizedDistanceKm: number,
  originalDurationMinutes: number,
  optimizedDurationMinutes: number,
  context: Partial<OptimizationContext> = {},
  metricSafety: {
    originalMetricConfidence?: RouteAnalysis['metricConfidence'];
    optimizedMetricConfidence?: RouteAnalysis['metricConfidence'];
    metricProvenance?: RouteComparisonResult['metricProvenance'];
  } = {}
): RouteComparisonResult {
  const resolvedContext = { ...DEFAULT_OPTIMIZATION_CONTEXT, ...context };
  const metricConfidence = resolveMetricConfidence(
    metricSafety.originalMetricConfidence ?? 'unreliable',
    metricSafety.optimizedMetricConfidence ?? 'unreliable'
  );
  const canTrustSavings = metricConfidence === 'reliable';
  const distanceSavedKm = canTrustSavings ? Math.max(0, originalDistanceKm - optimizedDistanceKm) : 0;
  const timeSaved = canTrustSavings ? Math.max(0, originalDurationMinutes - optimizedDurationMinutes) : 0;
  const percentageImprovement = originalDistanceKm > 0
    ? Math.round((distanceSavedKm / originalDistanceKm) * 100)
    : 0;

  return {
    originalDistanceKm: roundDistance(originalDistanceKm),
    optimizedDistanceKm: roundDistance(optimizedDistanceKm),
    distanceSavedKm: roundDistance(distanceSavedKm),
    estimatedTimeSavedMinutes: Math.round(timeSaved),
    estimatedFuelSavedLiters: roundDistance(distanceSavedKm / resolvedContext.fuelConsumptionKmPerLiter),
    percentageImprovement,
    metricProvenance: metricSafety.metricProvenance ?? 'estimated',
    metricConfidence,
  };
}

function resolveMetricConfidence(
  original: RouteAnalysis['metricConfidence'],
  optimized: RouteAnalysis['metricConfidence']
): RouteAnalysis['metricConfidence'] {
  if (original === 'unreliable' || optimized === 'unreliable') return 'unreliable';
  if (original === 'degraded' || optimized === 'degraded') return 'degraded';
  return 'reliable';
}
