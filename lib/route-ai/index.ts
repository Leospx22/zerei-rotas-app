import type { GroupedStop } from '@/lib/packageUtils';
import { analyzeRoute, DEFAULT_OPTIMIZATION_CONTEXT } from './RouteAnalyzer.ts';
import { compareRoutes } from './RouteComparison.ts';
import { DeterministicRouteOptimizer } from './RouteOptimizer.ts';
import { scoreRoute } from './RouteScorer.ts';
import type {
  OptimizationContext,
  OptimizationStrategy,
  RouteAIRecommendation,
  RouteAIReport,
} from './OptimizationTypes.ts';

export * from './OptimizationTypes.ts';
export * from './RouteAssistantAnalyzer.ts';
export * from './RouteAnalyzer.ts';
export * from './RouteComparison.ts';
export * from './RouteOptimizer.ts';
export * from './RouteScorer.ts';
export * from './ExecutionProductivityAssistant.ts';
export * from './runtime/index.ts';
export * from './learning/index.ts';

export async function generateRouteAIReport(
  stops: readonly GroupedStop[],
  strategy: OptimizationStrategy = 'balanced',
  context: Partial<OptimizationContext> = {}
): Promise<RouteAIReport> {
  const resolvedContext = { ...DEFAULT_OPTIMIZATION_CONTEXT, ...context };
  const analysis = analyzeRoute(stops, resolvedContext);
  const optimizer = new DeterministicRouteOptimizer();
  const optimization = await optimizer.optimize(stops, strategy, resolvedContext);
  const comparison = compareRoutes(
    analysis.originalDistanceKm,
    optimization.estimatedDistanceKm,
    analysis.estimatedOriginalDurationMinutes,
    optimization.estimatedDurationMinutes,
    resolvedContext
  );
  const score = scoreRoute(stops, analysis);
  const recommendation = buildRecommendation(comparison.percentageImprovement, optimization.confidenceScore);

  return {
    generatedAt: new Date().toISOString(),
    analysis,
    optimization,
    comparison,
    score,
    recommendation,
  };
}

function buildRecommendation(
  percentageImprovement: number,
  confidenceScore: number
): RouteAIRecommendation {
  if (percentageImprovement >= 6 && confidenceScore >= 55) {
    return {
      action: 'use-optimized-route',
      label: 'Usar rota otimizada',
      reason: `A rota otimizada economiza cerca de ${percentageImprovement}% com ${confidenceScore}% de confiança.`,
    };
  }

  return {
    action: 'keep-original-route',
    label: 'Manter rota original',
    reason: confidenceScore < 55
      ? 'A ordem original é mais segura porque muitas paradas têm coordenadas estimadas.'
      : 'A ordem original está próxima da estimativa otimizada.',
  };
}
