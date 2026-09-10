export type StopMoveDirection = -1 | 1;

export interface OptimizedRouteOrderDecision {
  recommendationAction?: 'use-optimized-route' | 'keep-original-route';
  metricConfidence?: 'reliable' | 'degraded' | 'unreliable';
}

export interface OptimizedRouteOrderResult<T> {
  stops: T[];
  applied: boolean;
}

export function applyEligibleRouteOrder<T extends { id: string; orderIndex: number }>(
  stops: readonly T[],
  eligibleStopIds: readonly string[],
  candidateStopIds: readonly string[]
): OptimizedRouteOrderResult<T> {
  const expectedEligibleIds = new Set(eligibleStopIds);
  const candidateIds = new Set(candidateStopIds);
  if (
    expectedEligibleIds.size !== eligibleStopIds.length
    || candidateIds.size !== candidateStopIds.length
    || candidateStopIds.length !== eligibleStopIds.length
    || candidateStopIds.some(stopId => !expectedEligibleIds.has(stopId))
    || eligibleStopIds.some(stopId => !stops.some(stop => stop.id === stopId))
  ) {
    return { stops: [...stops], applied: false };
  }

  const ineligibleStopIds = stops
    .filter(stop => !expectedEligibleIds.has(stop.id))
    .map(stop => stop.id);

  return applyOptimizedRouteOrder(
    stops,
    [...candidateStopIds, ...ineligibleStopIds],
    {
      recommendationAction: 'use-optimized-route',
      metricConfidence: 'reliable',
    }
  );
}

export function moveRouteStop<T extends { orderIndex: number }>(
  stops: readonly T[],
  fromIndex: number,
  direction: StopMoveDirection
): T[] {
  return moveRouteStopToIndex(stops, fromIndex, fromIndex + direction);
}

export function moveRouteStopToIndex<T extends { orderIndex: number }>(
  stops: readonly T[],
  fromIndex: number,
  toIndex: number
): T[] {
  if (
    fromIndex < 0 ||
    fromIndex >= stops.length ||
    toIndex < 0 ||
    toIndex >= stops.length
  ) {
    return [...stops];
  }

  if (fromIndex === toIndex) return [...stops];

  const reordered = [...stops];
  const [movedStop] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, movedStop);

  return reordered.map((stop, orderIndex) => ({ ...stop, orderIndex }));
}

export function applyOptimizedRouteOrder<T extends { id: string; orderIndex: number }>(
  stops: readonly T[],
  optimizedStopIds: readonly string[] | null | undefined,
  decision: OptimizedRouteOrderDecision
): OptimizedRouteOrderResult<T> {
  if (
    decision.recommendationAction !== 'use-optimized-route' ||
    decision.metricConfidence !== 'reliable' ||
    !optimizedStopIds ||
    optimizedStopIds.length !== stops.length
  ) {
    return { stops: [...stops], applied: false };
  }

  const stopsById = new Map(stops.map(stop => [stop.id, stop]));
  const seen = new Set<string>();
  const reordered: T[] = [];

  for (const stopId of optimizedStopIds) {
    const stop = stopsById.get(stopId);
    if (!stop || seen.has(stopId)) {
      return { stops: [...stops], applied: false };
    }
    seen.add(stopId);
    reordered.push(stop);
  }

  if (seen.size !== stops.length) {
    return { stops: [...stops], applied: false };
  }

  return {
    stops: reordered.map((stop, orderIndex) => ({ ...stop, orderIndex })),
    applied: true,
  };
}
