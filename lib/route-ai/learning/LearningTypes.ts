import type { RouteData } from '@/contexts/RouteContext';
import type { OptimizationStrategy } from '../OptimizationTypes.ts';
import type { RouteStorage } from '../../routePersistence.ts';

export type DeliveryCategory =
  | 'residential'
  | 'commercial'
  | 'apartments'
  | 'condos'
  | 'shopping-centers'
  | 'industrial-areas'
  | 'unknown';

export type LearningEventType =
  | 'completed-route'
  | 'completed-stop'
  | 'skipped-stop'
  | 'manual-reordering'
  | 'accepted-ai-recommendation'
  | 'ignored-ai-recommendation'
  | 'locked-stop'
  | 'navigation-deviation';

export interface DriverProfile {
  averageStopDurationMinutes: number;
  averageApartmentDurationMinutes: number;
  averageHouseDurationMinutes: number;
  averageWalkingDistanceMeters: number;
  preferredOptimizationStrategy: OptimizationStrategy | 'unknown';
  averageRouteCompletionSpeedStopsPerHour: number;
  averagePauseDurationMinutes: number;
  averagePackagesPerStop: number;
  averageDeliverySuccessRate: number;
}

export interface CategoryLearningMetrics {
  category: DeliveryCategory;
  stops: number;
  skippedStops: number;
  deliveredStops: number;
  averagePackagesPerStop: number;
}

export interface StrategyPreferenceMetrics {
  strategy: OptimizationStrategy;
  accepted: number;
  ignored: number;
  routesSuggested: number;
}

export interface LearningEvent {
  id: string;
  type: LearningEventType;
  routeId?: string;
  stopId?: string;
  strategy?: OptimizationStrategy;
  category?: DeliveryCategory;
  createdAt: string;
}

export interface RouteLearningState {
  version: 1;
  enabled: boolean;
  analyzedRouteIds: string[];
  routesAnalyzed: number;
  stopsAnalyzed: number;
  skippedStopsAnalyzed: number;
  completedStopsAnalyzed: number;
  lastUpdatedAt: string | null;
  profile: DriverProfile;
  categoryMetrics: Record<DeliveryCategory, CategoryLearningMetrics>;
  strategyPreferences: Partial<Record<OptimizationStrategy, StrategyPreferenceMetrics>>;
  recentEvents: LearningEvent[];
}

export interface LearningRecommendation {
  suggestedStrategy: OptimizationStrategy;
  confidence: number;
  reason: string;
}

export interface LearningStatus {
  enabled: boolean;
  label: string;
  routesAnalyzed: number;
  detail: string;
  confidence: number;
  recommendation: LearningRecommendation | null;
}

export interface CompletedRouteLearningInput {
  route: RouteData;
  completedAt?: string;
}

export interface LearningStore {
  load(): Promise<RouteLearningState>;
  save(state: RouteLearningState): Promise<void>;
  clear(): Promise<void>;
  setEnabled(enabled: boolean): Promise<RouteLearningState>;
}

export interface LearningStorageOptions {
  storage?: RouteStorage;
}

export interface FutureEncryptedCloudBackupProvider {
  readonly id: string;
  backupEncryptedLearningState(state: RouteLearningState): Promise<void>;
  restoreEncryptedLearningState(): Promise<RouteLearningState | null>;
}

export interface FutureFleetLearningProvider {
  readonly id: string;
  getFleetPreferenceHints(): Promise<LearningRecommendation[]>;
}
