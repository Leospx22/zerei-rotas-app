import type { GroupedStop } from '@/lib/packageUtils';

export type OptimizationStrategy =
  | 'fastest'
  | 'shortest-distance'
  | 'balanced'
  | 'cluster'
  | 'traffic-aware'
  | 'driver-preference'
  | 'historical-learning'
  | 'traffic'
  | 'learning'
  | 'ai'
  | 'driver-profile';

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface RouteCluster {
  id: string;
  label: string;
  stopIds: string[];
  stopCount: number;
  packageCount: number;
  center: RouteCoordinate | null;
}

export interface RouteBottleneck {
  type: 'missing-coordinate' | 'large-stop' | 'duplicate-area' | 'backtracking' | 'spread-out-cluster';
  severity: 'low' | 'medium' | 'high';
  message: string;
  stopIds: string[];
}

export interface DuplicateGroup {
  key: string;
  label: string;
  count: number;
  stopIds: string[];
}

export interface RouteAnalysis {
  totalStops: number;
  originalDistanceKm: number;
  estimatedOriginalDurationMinutes: number;
  averageStopDistanceKm: number;
  clusters: RouteCluster[];
  potentialBottlenecks: RouteBottleneck[];
  duplicateStreets: DuplicateGroup[];
  duplicateNeighborhoods: DuplicateGroup[];
}

export interface OptimizationContext {
  averageMinutesPerStop: number;
  averageSpeedKmh: number;
  fuelConsumptionKmPerLiter: number;
  fuelPricePerLiter?: number;
}

export interface OptimizedStop {
  stop: GroupedStop;
  originalIndex: number;
  optimizedIndex: number;
}

export interface RouteOptimizationResult {
  strategy: OptimizationStrategy;
  optimizedStops: OptimizedStop[];
  optimizedStopIds: string[];
  estimatedDistanceKm: number;
  estimatedDurationMinutes: number;
  estimatedSavingsMinutes: number;
  estimatedDistanceSavingsKm: number;
  confidenceScore: number;
}

export interface RouteComparisonResult {
  originalDistanceKm: number;
  optimizedDistanceKm: number;
  distanceSavedKm: number;
  estimatedTimeSavedMinutes: number;
  estimatedFuelSavedLiters: number;
  percentageImprovement: number;
}

export interface RouteScoreFactor {
  label: string;
  impact: number;
  message: string;
}

export interface RouteScoreResult {
  score: number;
  summary: string;
  reasons: string[];
  potentialImprovementPercentage: number;
  factors: RouteScoreFactor[];
}

export interface RouteAIRecommendation {
  action: 'use-optimized-route' | 'keep-original-route';
  label: 'Use Optimized Route' | 'Keep Original Route';
  reason: string;
}

export interface RouteAIReport {
  generatedAt: string;
  analysis: RouteAnalysis;
  optimization: RouteOptimizationResult;
  comparison: RouteComparisonResult;
  score: RouteScoreResult;
  recommendation: RouteAIRecommendation;
}

export interface IRouteOptimizationProvider {
  readonly id: 'local' | 'openai' | 'gemini' | 'claude' | 'offline-ml' | string;
  readonly label: string;
  optimize(
    stops: readonly GroupedStop[],
    strategy?: OptimizationStrategy,
    context?: Partial<OptimizationContext>
  ): Promise<RouteOptimizationResult>;
}

export interface IOptimizationStrategy {
  readonly id: OptimizationStrategy;
  readonly label: string;
  optimize(
    stops: readonly GroupedStop[],
    analysis: RouteAnalysis,
    context: OptimizationContext
  ): RouteOptimizationResult;
}
