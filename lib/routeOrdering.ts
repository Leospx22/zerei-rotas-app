export type StopMoveDirection = -1 | 1;

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
