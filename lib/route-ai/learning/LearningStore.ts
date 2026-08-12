import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRouteStorage, type RouteStorage } from '../../routePersistence.ts';
import { DEFAULT_DRIVER_PROFILE } from './DriverProfile.ts';
import { createEmptyCategoryMetrics } from './DeliveryPatternAnalyzer.ts';
import type { LearningStore, RouteLearningState } from './LearningTypes.ts';

export const KEY_ROUTE_LEARNING = 'zerei_route_learning';
export const LEARNING_STORAGE_VERSION = 1;

export function createDefaultLearningState(): RouteLearningState {
  return {
    version: LEARNING_STORAGE_VERSION,
    enabled: true,
    analyzedRouteIds: [],
    routesAnalyzed: 0,
    stopsAnalyzed: 0,
    skippedStopsAnalyzed: 0,
    completedStopsAnalyzed: 0,
    lastUpdatedAt: null,
    profile: DEFAULT_DRIVER_PROFILE,
    categoryMetrics: createEmptyCategoryMetrics(),
    strategyPreferences: {},
    recentEvents: [],
  };
}

export function createLearningStore(storage: RouteStorage = getRouteStorage()): LearningStore {
  return {
    async load() {
      const raw = await storage.getItem(KEY_ROUTE_LEARNING);
      if (!raw) return createDefaultLearningState();
      try {
        return normalizeLearningState(JSON.parse(raw));
      } catch {
        return createDefaultLearningState();
      }
    },
    async save(state) {
      await storage.setItem(KEY_ROUTE_LEARNING, JSON.stringify(normalizeLearningState(state)));
    },
    async clear() {
      await storage.removeItem(KEY_ROUTE_LEARNING);
    },
    async setEnabled(enabled) {
      const current = await this.load();
      const next = {
        ...current,
        enabled,
        lastUpdatedAt: new Date().toISOString(),
      };
      await this.save(next);
      return next;
    },
  };
}

export function getLearningStorage(): RouteStorage {
  return AsyncStorage;
}

function normalizeLearningState(value: any): RouteLearningState {
  const fallback = createDefaultLearningState();
  if (!value || typeof value !== 'object') return fallback;

  return {
    ...fallback,
    ...value,
    version: LEARNING_STORAGE_VERSION,
    enabled: value.enabled !== false,
    analyzedRouteIds: Array.isArray(value.analyzedRouteIds) ? value.analyzedRouteIds : [],
    profile: { ...fallback.profile, ...(value.profile ?? {}) },
    categoryMetrics: { ...fallback.categoryMetrics, ...(value.categoryMetrics ?? {}) },
    strategyPreferences: value.strategyPreferences ?? {},
    recentEvents: Array.isArray(value.recentEvents) ? value.recentEvents.slice(0, 100) : [],
  };
}
