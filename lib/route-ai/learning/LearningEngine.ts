import type { RouteData } from '@/contexts/RouteContext';
import type { OptimizationStrategy } from '@/lib/route-ai/OptimizationTypes.ts';
import { updateAverage } from './DriverProfile.ts';
import {
  mergeCategoryMetrics,
  summarizeRouteCategories,
} from './DeliveryPatternAnalyzer.ts';
import { createLearningStore } from './LearningStore.ts';
import { scoreLearningPreferences } from './PreferenceScorer.ts';
import type {
  CompletedRouteLearningInput,
  LearningEvent,
  LearningEventType,
  LearningStatus,
  LearningStore,
  RouteLearningState,
} from './LearningTypes.ts';

export async function learnFromCompletedRoute(
  input: CompletedRouteLearningInput,
  store: LearningStore = createLearningStore()
): Promise<RouteLearningState> {
  const current = await store.load();
  if (!current.enabled) return current;

  const route = input.route;
  if (current.analyzedRouteIds.includes(route.id)) return current;
  const completedStops = route.stops.filter(stop => stop.status === 'completed').length;
  const skippedStops = route.stops.filter(stop => stop.status === 'skipped').length;
  const successRate = route.totalPackages > 0 ? route.deliveredPackages / route.totalPackages : 0;
  const routeHours = route.durationMinutes > 0 ? route.durationMinutes / 60 : 0;
  const speed = routeHours > 0 ? completedStops / routeHours : 0;
  const routeIndex = current.routesAnalyzed;
  const averageStopDuration = route.stops.length > 0
    ? route.durationMinutes / route.stops.length
    : 0;
  const averagePackagesPerStop = route.stops.length > 0
    ? route.totalPackages / route.stops.length
    : 0;
  const strategy = route.routeAIReport?.optimization.strategy;
  const nextStrategyPreferences = strategy
    ? incrementStrategySuggestion(current, strategy)
    : current.strategyPreferences;

  const next: RouteLearningState = {
    ...current,
    analyzedRouteIds: [route.id, ...current.analyzedRouteIds].slice(0, 200),
    routesAnalyzed: current.routesAnalyzed + 1,
    stopsAnalyzed: current.stopsAnalyzed + route.stops.length,
    skippedStopsAnalyzed: current.skippedStopsAnalyzed + skippedStops,
    completedStopsAnalyzed: current.completedStopsAnalyzed + completedStops,
    lastUpdatedAt: input.completedAt ?? new Date().toISOString(),
    profile: {
      ...current.profile,
      averageStopDurationMinutes: updateAverage(
        current.profile.averageStopDurationMinutes,
        routeIndex,
        averageStopDuration
      ),
      averageApartmentDurationMinutes: updateAverage(
        current.profile.averageApartmentDurationMinutes,
        routeIndex,
        estimateApartmentStopDuration(route)
      ),
      averageHouseDurationMinutes: updateAverage(
        current.profile.averageHouseDurationMinutes,
        routeIndex,
        estimateHouseStopDuration(route)
      ),
      preferredOptimizationStrategy: strategy ?? current.profile.preferredOptimizationStrategy,
      averageRouteCompletionSpeedStopsPerHour: updateAverage(
        current.profile.averageRouteCompletionSpeedStopsPerHour,
        routeIndex,
        speed
      ),
      averagePackagesPerStop: updateAverage(
        current.profile.averagePackagesPerStop,
        routeIndex,
        averagePackagesPerStop
      ),
      averageDeliverySuccessRate: updateAverage(
        current.profile.averageDeliverySuccessRate,
        routeIndex,
        successRate
      ),
    },
    categoryMetrics: mergeCategoryMetrics(
      current.categoryMetrics,
      summarizeRouteCategories(route.stops)
    ),
    strategyPreferences: nextStrategyPreferences,
    recentEvents: [
      createLearningEvent('completed-route', route.id, undefined, strategy),
      ...current.recentEvents,
    ].slice(0, 100),
  };

  await store.save(next);
  return next;
}

export async function recordLearningEvent(
  event: Omit<LearningEvent, 'id' | 'createdAt'>,
  store: LearningStore = createLearningStore()
): Promise<RouteLearningState> {
  const current = await store.load();
  if (!current.enabled) return current;
  const nextEvent = createLearningEvent(event.type, event.routeId, event.stopId, event.strategy);
  const next: RouteLearningState = {
    ...current,
    lastUpdatedAt: nextEvent.createdAt,
    recentEvents: [nextEvent, ...current.recentEvents].slice(0, 100),
    strategyPreferences: event.strategy
      ? updateStrategyDecision(current, event.strategy, event.type)
      : current.strategyPreferences,
  };
  await store.save(next);
  return next;
}

export async function getLearningStatus(
  store: LearningStore = createLearningStore()
): Promise<LearningStatus> {
  return buildLearningStatus(await store.load());
}

export function buildLearningStatus(state: RouteLearningState): LearningStatus {
  const recommendation = scoreLearningPreferences(state);
  if (!state.enabled) {
    return {
      enabled: false,
      label: 'Aprendizado desativado',
      routesAnalyzed: state.routesAnalyzed,
      detail: 'O aprendizado local está pausado.',
      confidence: 0,
      recommendation: null,
    };
  }

  if (state.routesAnalyzed === 0) {
    return {
      enabled: true,
      label: 'Sem histórico ainda',
      routesAnalyzed: 0,
      detail: 'Conclua rotas para personalizar a ZR Intelligence™.',
      confidence: 0,
      recommendation: null,
    };
  }

  return {
    enabled: true,
    label: 'Aprendendo',
    routesAnalyzed: state.routesAnalyzed,
    detail: recommendation
      ? `Confiança melhorando. Estratégia sugerida: ${formatStrategyLabel(recommendation.suggestedStrategy)}.`
      : 'Confiança melhorando com o histórico local de entregas.',
    confidence: recommendation?.confidence ?? Math.min(90, 25 + state.routesAnalyzed * 5),
    recommendation,
  };
}

export async function clearLearningHistory(store: LearningStore = createLearningStore()): Promise<void> {
  await store.clear();
}

export async function setLearningEnabled(
  enabled: boolean,
  store: LearningStore = createLearningStore()
): Promise<RouteLearningState> {
  return store.setEnabled(enabled);
}

function incrementStrategySuggestion(
  state: RouteLearningState,
  strategy: OptimizationStrategy
): RouteLearningState['strategyPreferences'] {
  const current = state.strategyPreferences[strategy] ?? {
    strategy,
    accepted: 0,
    ignored: 0,
    routesSuggested: 0,
  };
  return {
    ...state.strategyPreferences,
    [strategy]: {
      ...current,
      routesSuggested: current.routesSuggested + 1,
    },
  };
}

function updateStrategyDecision(
  state: RouteLearningState,
  strategy: OptimizationStrategy,
  type: LearningEventType
): RouteLearningState['strategyPreferences'] {
  const current = state.strategyPreferences[strategy] ?? {
    strategy,
    accepted: 0,
    ignored: 0,
    routesSuggested: 0,
  };
  return {
    ...state.strategyPreferences,
    [strategy]: {
      ...current,
      accepted: current.accepted + Number(type === 'accepted-ai-recommendation'),
      ignored: current.ignored + Number(type === 'ignored-ai-recommendation'),
    },
  };
}

function formatStrategyLabel(strategy: OptimizationStrategy): string {
  if (strategy === 'fastest') return 'mais rápida';
  if (strategy === 'shortest-distance') return 'mais curta';
  if (strategy === 'balanced') return 'equilibrada';
  if (strategy === 'cluster') return 'agrupada';
  if (strategy === 'traffic-aware' || strategy === 'traffic') return 'com trânsito';
  if (strategy === 'driver-preference' || strategy === 'driver-profile') return 'perfil do motorista';
  if (strategy === 'historical-learning' || strategy === 'learning') return 'aprendizado histórico';
  if (strategy === 'ai') return 'IA';
  return strategy;
}

function createLearningEvent(
  type: LearningEventType,
  routeId?: string,
  stopId?: string,
  strategy?: OptimizationStrategy
): LearningEvent {
  return {
    id: `learn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    routeId,
    stopId,
    strategy,
    createdAt: new Date().toISOString(),
  };
}

function estimateApartmentStopDuration(route: RouteData): number {
  const apartmentStops = route.stops.filter(stop =>
    /apartamento|\bap\b|\bapto\b|bloco|torre/i.test(stop.normalizedAddress)
  );
  return apartmentStops.length > 0 ? route.durationMinutes / apartmentStops.length : 0;
}

function estimateHouseStopDuration(route: RouteData): number {
  const houseStops = route.stops.filter(stop =>
    /rua|casa|residencial/i.test(stop.normalizedAddress)
  );
  return houseStops.length > 0 ? route.durationMinutes / houseStops.length : 0;
}
