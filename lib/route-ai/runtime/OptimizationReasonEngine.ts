import type { GroupedStop } from '../../packageUtils.ts';
import { getNeighborhood } from '../RouteAnalyzer.ts';

export interface RuntimeOptimizationReason {
  title: string;
  detail: string;
}

export function explainRecommendedMove(
  currentRemainingStops: readonly GroupedStop[],
  proposedRemainingStops: readonly GroupedStop[],
  savingsMinutes: number
): RuntimeOptimizationReason {
  const move = findFirstMove(currentRemainingStops, proposedRemainingStops);
  if (!move) {
    return {
      title: 'Keep current remaining order',
      detail: 'The remaining route is already close to the best deterministic simulation.',
    };
  }

  const movedStop = proposedRemainingStops[move.toIndex];
  const nextStop = proposedRemainingStops[move.toIndex + 1] ?? proposedRemainingStops[move.toIndex - 1];
  const movedArea = getNeighborhood(movedStop);
  const nextArea = nextStop ? getNeighborhood(nextStop) : '';
  const areaReason = movedArea && movedArea === nextArea
    ? `Avoid returning to ${toDisplayLabel(movedArea)}.`
    : 'Reduce backtracking in the remaining route.';

  return {
    title: `Move Stop ${movedStop.stopNumber} before Stop ${currentRemainingStops[move.fromIndex]?.stopNumber ?? proposedRemainingStops[move.toIndex + 1]?.stopNumber ?? movedStop.stopNumber}.`,
    detail: `${areaReason} Estimated savings: ${savingsMinutes} minutes.`,
  };
}

export function calculateRuntimeConfidence(
  remainingStops: readonly GroupedStop[],
  savingsMinutes: number,
  lockedStopCount: number
): number {
  const missingCoordinates = remainingStops.filter(stop => stop.latitude === null || stop.longitude === null).length;
  const coordinatePenalty = Math.round((missingCoordinates / Math.max(remainingStops.length, 1)) * 24);
  const lockedPenalty = Math.min(12, lockedStopCount * 3);
  const savingsSignal = Math.min(20, savingsMinutes * 2);
  return Math.max(0, Math.min(100, Math.round(74 + savingsSignal - coordinatePenalty - lockedPenalty)));
}

export function findFirstMove(
  currentRemainingStops: readonly GroupedStop[],
  proposedRemainingStops: readonly GroupedStop[]
): { stopId: string; fromIndex: number; toIndex: number } | null {
  for (let index = 0; index < proposedRemainingStops.length; index++) {
    if (currentRemainingStops[index]?.id === proposedRemainingStops[index]?.id) continue;
    const stopId = proposedRemainingStops[index].id;
    const fromIndex = currentRemainingStops.findIndex(stop => stop.id === stopId);
    if (fromIndex === -1) continue;
    return { stopId, fromIndex, toIndex: index };
  }
  return null;
}

function toDisplayLabel(value: string): string {
  return value
    .split(' ')
    .map(word => word ? word[0].toUpperCase() + word.slice(1) : word)
    .join(' ');
}
