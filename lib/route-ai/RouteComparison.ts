import type { OptimizationContext, RouteComparisonResult } from './OptimizationTypes.ts';
import { DEFAULT_OPTIMIZATION_CONTEXT, roundDistance } from './RouteAnalyzer.ts';

export function compareRoutes(
  originalDistanceKm: number,
  optimizedDistanceKm: number,
  originalDurationMinutes: number,
  optimizedDurationMinutes: number,
  context: Partial<OptimizationContext> = {}
): RouteComparisonResult {
  const resolvedContext = { ...DEFAULT_OPTIMIZATION_CONTEXT, ...context };
  const distanceSavedKm = Math.max(0, originalDistanceKm - optimizedDistanceKm);
  const timeSaved = Math.max(0, originalDurationMinutes - optimizedDurationMinutes);
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
  };
}
