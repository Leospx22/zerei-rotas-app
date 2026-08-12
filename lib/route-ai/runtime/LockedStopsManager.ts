import type { GroupedStop } from '../../packageUtils.ts';

export type LockedStopReason =
  | 'user-locked'
  | 'priority-delivery'
  | 'business-hours'
  | 'customer-request'
  | 'future-appointment';

export interface LockedStop {
  stopId: string;
  reason: LockedStopReason;
  note?: string;
}

export interface RouteStopPartitions {
  completedStops: GroupedStop[];
  skippedStops: GroupedStop[];
  remainingStops: GroupedStop[];
  lockedRemainingStops: GroupedStop[];
  movableRemainingStops: GroupedStop[];
}

export function createLockedStopMap(lockedStops: readonly LockedStop[] = []): Map<string, LockedStop> {
  return new Map(lockedStops.map(lock => [lock.stopId, lock]));
}

export function isStopLocked(stop: Pick<GroupedStop, 'id'>, lockedStops: readonly LockedStop[] = []): boolean {
  return createLockedStopMap(lockedStops).has(stop.id);
}

export function partitionRouteStops(
  stops: readonly GroupedStop[],
  lockedStops: readonly LockedStop[] = []
): RouteStopPartitions {
  const lockMap = createLockedStopMap(lockedStops);
  const completedStops = stops.filter(stop => stop.status === 'completed');
  const skippedStops = stops.filter(stop => stop.status === 'skipped');
  const remainingStops = stops.filter(stop => stop.status === 'pending');
  const lockedRemainingStops = remainingStops.filter(stop => lockMap.has(stop.id));
  const movableRemainingStops = remainingStops.filter(stop => !lockMap.has(stop.id));

  return {
    completedStops,
    skippedStops,
    remainingStops,
    lockedRemainingStops,
    movableRemainingStops,
  };
}

export function applyLockedStopPositions(
  currentRemainingStops: readonly GroupedStop[],
  optimizedMovableStops: readonly GroupedStop[],
  lockedStops: readonly LockedStop[] = []
): GroupedStop[] {
  const lockMap = createLockedStopMap(lockedStops);
  const movableQueue = [...optimizedMovableStops];

  return currentRemainingStops.map(stop => {
    if (lockMap.has(stop.id)) return stop;
    return movableQueue.shift() ?? stop;
  });
}
