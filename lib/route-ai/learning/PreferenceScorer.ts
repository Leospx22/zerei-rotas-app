import type {
  LearningRecommendation,
  RouteLearningState,
  StrategyPreferenceMetrics,
} from './LearningTypes.ts';

export function scoreLearningPreferences(state: RouteLearningState): LearningRecommendation | null {
  const preferred = getPreferredStrategy(state);
  if (!preferred) return null;

  const acceptanceTotal = preferred.accepted + preferred.ignored;
  const acceptanceRate = acceptanceTotal > 0 ? preferred.accepted / acceptanceTotal : 0;
  const routeConfidence = Math.min(35, state.routesAnalyzed * 4);
  const acceptanceConfidence = Math.round(acceptanceRate * 58);
  const confidence = Math.max(35, Math.min(98, routeConfidence + acceptanceConfidence));

  return {
    suggestedStrategy: preferred.strategy,
    confidence,
    reason: preferred.accepted > 0
      ? `Você aceitou esta estratégia em ${preferred.accepted} de ${acceptanceTotal} recomendações registradas.`
      : `Com base em ${state.routesAnalyzed} rota${state.routesAnalyzed === 1 ? '' : 's'} concluída${state.routesAnalyzed === 1 ? '' : 's'}, esta estratégia combina melhor com seu padrão local de entrega.`,
  };
}

export function getPreferredStrategy(state: RouteLearningState): StrategyPreferenceMetrics | null {
  const explicit = Object.values(state.strategyPreferences)
    .filter((item): item is StrategyPreferenceMetrics => item !== undefined)
    .sort((a, b) => b.accepted - a.accepted || b.routesSuggested - a.routesSuggested)[0];

  if (explicit && (explicit.accepted > 0 || explicit.routesSuggested > 0)) return explicit;
  if (state.profile.preferredOptimizationStrategy === 'unknown') return null;

  return {
    strategy: state.profile.preferredOptimizationStrategy,
    accepted: 0,
    ignored: 0,
    routesSuggested: state.routesAnalyzed,
  };
}

