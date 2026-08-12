import type { GroupedStop } from '../../packageUtils.ts';
import type { OptimizationContext, RouteCoordinate } from '../OptimizationTypes.ts';
import type { LockedStop } from './LockedStopsManager.ts';
import { analyzeRemainingRoute, type RemainingRouteAnalysis } from './RemainingRouteAnalyzer.ts';
import {
  optimizeRemainingRoute,
  type RemainingRouteOptimizationResult,
  type RuntimeOptimizationStrategy,
} from './RemainingRouteOptimizer.ts';
import { simulateRemainingRouteStrategies, type RouteSimulationSummary } from './RouteSimulation.ts';

export interface RuntimeTrafficProvider {
  readonly id: string;
  getTrafficWeight(stopIds: readonly string[]): Promise<Record<string, number>>;
}

export interface RuntimeWeatherProvider {
  readonly id: string;
  getWeatherRisk(position: RouteCoordinate): Promise<'low' | 'medium' | 'high'>;
}

export interface RuntimeRoadEventsProvider {
  readonly id: string;
  getRoadEvents(stopIds: readonly string[]): Promise<readonly string[]>;
}

export interface RuntimeParkingDifficultyProvider {
  readonly id: string;
  getParkingDifficulty(stopIds: readonly string[]): Promise<Record<string, number>>;
}

export interface RuntimeLearningEngine {
  readonly id: string;
  scoreHistoricalPreference(stopIds: readonly string[]): Promise<Record<string, number>>;
}

export interface RuntimeVoiceAssistant {
  readonly id: string;
  announceRecommendation(message: string): Promise<void>;
}

export interface OptimizationSessionInput {
  currentPosition: RouteCoordinate | null;
  stops: readonly GroupedStop[];
  lockedStops?: readonly LockedStop[];
  strategy?: RuntimeOptimizationStrategy;
  context?: Partial<OptimizationContext>;
}

export interface OptimizationSessionSnapshot {
  generatedAt: string;
  analysis: RemainingRouteAnalysis;
  optimization: RemainingRouteOptimizationResult;
  simulation: RouteSimulationSummary;
}

export async function createOptimizationSessionSnapshot(
  input: OptimizationSessionInput
): Promise<OptimizationSessionSnapshot> {
  const [optimization] = await Promise.all([
    optimizeRemainingRoute(input),
  ]);
  const analysis = analyzeRemainingRoute({
    currentPosition: input.currentPosition,
    stops: input.stops,
    lockedStops: input.lockedStops,
    strategy: input.strategy,
    context: input.context,
  });
  const simulation = simulateRemainingRouteStrategies(input);

  return {
    generatedAt: new Date().toISOString(),
    analysis,
    optimization,
    simulation,
  };
}
