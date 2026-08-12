import type { DriverProfile } from './LearningTypes.ts';

export const DEFAULT_DRIVER_PROFILE: DriverProfile = {
  averageStopDurationMinutes: 0,
  averageApartmentDurationMinutes: 0,
  averageHouseDurationMinutes: 0,
  averageWalkingDistanceMeters: 0,
  preferredOptimizationStrategy: 'unknown',
  averageRouteCompletionSpeedStopsPerHour: 0,
  averagePauseDurationMinutes: 0,
  averagePackagesPerStop: 0,
  averageDeliverySuccessRate: 0,
};

export function updateAverage(previous: number, previousCount: number, next: number): number {
  if (!Number.isFinite(next) || next < 0) return previous;
  const total = previous * previousCount + next;
  return roundMetric(total / (previousCount + 1));
}

export function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

