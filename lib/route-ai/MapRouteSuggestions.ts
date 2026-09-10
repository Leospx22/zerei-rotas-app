import {
  haversineDistanceKm,
  isAiRouteEligibleCoordinate,
  sanitizeRouteCoordinates,
  type CoordinateConfidence,
  type CoordinatePair,
  type RouteCoordinateInput,
} from '../coordinateIntegrity.ts';

export type MapRouteSuggestionStrategy = 'logical-forward' | 'reverse-side';
export type MapRouteSuggestionConfidence = 'high' | 'medium';

export interface MapRouteSuggestionStop extends RouteCoordinateInput {
  coordinateStatus?: 'valid' | 'corrected' | 'recovered' | 'invalid' | 'missing';
}

export interface MapRouteSuggestion {
  id: 'suggestion-1' | 'suggestion-2';
  stopIds: string[];
  score: number;
  strategy: MapRouteSuggestionStrategy;
  confidence: MapRouteSuggestionConfidence;
}

export interface MapRouteSuggestionsResult {
  suggestions: MapRouteSuggestion[];
  eligibleStopCount: number;
  totalStopCount: number;
  suppressedReason: 'insufficient-reliable-coordinates' | null;
  alternativeUnavailable: boolean;
}

interface LocatedSuggestionStop extends MapRouteSuggestionStop {
  latitude: number;
  longitude: number;
}

const MINIMUM_ELIGIBLE_STOPS = 3;
const MINIMUM_RELIABLE_RATIO = 0.4;
const EPSILON = 1e-9;

/**
 * Builds two local, deterministic map candidates from canonical coordinates.
 * It deliberately uses coordinateIntegrity before any geometry calculation.
 */
export function generateMapRouteSuggestions(
  stops: readonly MapRouteSuggestionStop[]
): MapRouteSuggestionsResult {
  const sanitized = sanitizeRouteCoordinates(stops.map(stop => ({
    ...stop,
    coordinateConfidence: resolveInputConfidence(stop),
  })));
  const eligible: LocatedSuggestionStop[] = sanitized.flatMap(stop => {
    if (
      !isAiRouteEligibleCoordinate(stop.coordinateIntegrity)
    ) {
      return [];
    }
    return [{
      ...stop,
      latitude: stop.coordinateIntegrity.latitude,
      longitude: stop.coordinateIntegrity.longitude,
    }];
  });
  const reliableRatio = eligible.length / Math.max(stops.length, 1);

  if (
    eligible.length < MINIMUM_ELIGIBLE_STOPS
    || reliableRatio < MINIMUM_RELIABLE_RATIO
  ) {
    return {
      suggestions: [],
      eligibleStopCount: eligible.length,
      totalStopCount: stops.length,
      suppressedReason: 'insufficient-reliable-coordinates',
      alternativeUnavailable: false,
    };
  }

  const [forwardEndpoint, oppositeEndpoint] = findLogicalEndpoints(eligible);
  const forward = refineOpenPath(
    nearestNeighborPath(eligible, forwardEndpoint.id, 'direct')
  );
  const forwardIds = forward.map(stop => stop.id);
  const alternativePool = [
    refineOpenPath(nearestNeighborPath(eligible, oppositeEndpoint.id, 'lookahead')),
    refineOpenPath(nearestNeighborPath(eligible, oppositeEndpoint.id, 'direct')),
    refineOpenPath(projectionSweepPath(eligible, oppositeEndpoint)),
  ];
  const distinctAlternatives = uniquePaths(alternativePool)
    .filter(candidate => isMeaningfulAlternative(forward, candidate))
    .sort(compareCandidatePaths);
  const alternative = distinctAlternatives[0] ?? null;
  const confidence: MapRouteSuggestionConfidence = reliableRatio >= 0.75 ? 'high' : 'medium';
  const suggestions: MapRouteSuggestion[] = [{
    id: 'suggestion-1',
    stopIds: forwardIds,
    score: roundScore(scorePath(forward)),
    strategy: 'logical-forward',
    confidence,
  }];

  if (alternative) {
    suggestions.push({
      id: 'suggestion-2',
      stopIds: alternative.map(stop => stop.id),
      score: roundScore(scorePath(alternative)),
      strategy: 'reverse-side',
      confidence,
    });
  }

  return {
    suggestions,
    eligibleStopCount: eligible.length,
    totalStopCount: stops.length,
    suppressedReason: null,
    alternativeUnavailable: alternative === null,
  };
}

function resolveInputConfidence(stop: MapRouteSuggestionStop): CoordinateConfidence | undefined {
  if (stop.coordinateConfidence) return stop.coordinateConfidence;
  // Recovered map coordinates only retain this status after mapOverview
  // sanitizes them to the canonical valid confidence.
  if (stop.coordinateStatus === 'recovered') return 'valid';
  if (stop.coordinateStatus === 'valid') return 'valid';
  if (stop.coordinateStatus === 'corrected') return 'corrected_swap';
  if (stop.coordinateStatus === 'invalid') return 'invalid';
  if (stop.coordinateStatus === 'missing') return 'unavailable';
  return undefined;
}

function findLogicalEndpoints(
  stops: readonly LocatedSuggestionStop[]
): [LocatedSuggestionStop, LocatedSuggestionStop] {
  let bestPair: [LocatedSuggestionStop, LocatedSuggestionStop] = [stops[0], stops[1]];
  let bestDistance = -1;

  for (let leftIndex = 0; leftIndex < stops.length - 1; leftIndex++) {
    for (let rightIndex = leftIndex + 1; rightIndex < stops.length; rightIndex++) {
      const left = stops[leftIndex];
      const right = stops[rightIndex];
      const distance = distanceBetween(left, right);
      const pair = orderSpatially(left, right);
      if (
        distance > bestDistance + EPSILON
        || (Math.abs(distance - bestDistance) <= EPSILON && pairKey(pair) < pairKey(bestPair))
      ) {
        bestDistance = distance;
        bestPair = pair;
      }
    }
  }

  return bestPair;
}

function nearestNeighborPath(
  stops: readonly LocatedSuggestionStop[],
  startId: string,
  mode: 'direct' | 'lookahead'
): LocatedSuggestionStop[] {
  const remaining = new Map(stops.map(stop => [stop.id, stop]));
  const start = remaining.get(startId) ?? stops[0];
  const path = [start];
  remaining.delete(start.id);

  while (remaining.size > 0) {
    const current = path[path.length - 1];
    const candidates = [...remaining.values()].map(candidate => {
      const directDistance = distanceBetween(current, candidate);
      const futureDistance = mode === 'lookahead'
        ? nearestDistance(candidate, [...remaining.values()].filter(stop => stop.id !== candidate.id))
        : 0;
      return {
        candidate,
        score: directDistance + futureDistance * 0.35,
        directDistance,
      };
    }).sort((left, right) =>
      left.score - right.score
      || left.directDistance - right.directDistance
      || left.candidate.id.localeCompare(right.candidate.id)
    );
    const next = candidates[0].candidate;
    path.push(next);
    remaining.delete(next.id);
  }

  return path;
}

function projectionSweepPath(
  stops: readonly LocatedSuggestionStop[],
  start: LocatedSuggestionStop
): LocatedSuggestionStop[] {
  const farthest = [...stops]
    .filter(stop => stop.id !== start.id)
    .sort((left, right) =>
      distanceBetween(start, right) - distanceBetween(start, left)
      || left.id.localeCompare(right.id)
    )[0];
  const meanLatitude = stops.reduce((sum, stop) => sum + stop.latitude, 0) / stops.length;
  const longitudeScale = Math.cos(meanLatitude * Math.PI / 180);
  const axisX = (farthest.longitude - start.longitude) * longitudeScale;
  const axisY = farthest.latitude - start.latitude;
  const axisLength = Math.hypot(axisX, axisY) || 1;

  return [...stops].sort((left, right) => {
    const leftProjection = projection(left, start, axisX, axisY, axisLength, longitudeScale);
    const rightProjection = projection(right, start, axisX, axisY, axisLength, longitudeScale);
    return leftProjection.along - rightProjection.along
      || leftProjection.across - rightProjection.across
      || left.id.localeCompare(right.id);
  });
}

function refineOpenPath(path: LocatedSuggestionStop[]): LocatedSuggestionStop[] {
  if (path.length < 4) return [...path];
  let best = [...path];
  let bestDistance = pathDistance(best);

  for (let iteration = 0; iteration < 3; iteration++) {
    let improved = false;
    for (let start = 1; start < best.length - 1; start++) {
      for (let end = start + 1; end < best.length; end++) {
        const previous = best[start - 1];
        const first = best[start];
        const last = best[end];
        const next = best[end + 1];
        const removedDistance = distanceBetween(previous, first)
          + (next ? distanceBetween(last, next) : 0);
        const addedDistance = distanceBetween(previous, last)
          + (next ? distanceBetween(first, next) : 0);
        const distanceDelta = addedDistance - removedDistance;
        if (distanceDelta < -EPSILON) {
          best = [
            ...best.slice(0, start),
            ...best.slice(start, end + 1).reverse(),
            ...best.slice(end + 1),
          ];
          bestDistance += distanceDelta;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }

  return best;
}

function scorePath(path: readonly LocatedSuggestionStop[]): number {
  const distance = pathDistance(path);
  const averageLeg = distance / Math.max(path.length - 1, 1);
  return distance + countCrossings(path) * averageLeg * 2;
}

function pathDistance(path: readonly LocatedSuggestionStop[]): number {
  return path.slice(1).reduce(
    (sum, stop, index) => sum + distanceBetween(path[index], stop),
    0
  );
}

function countCrossings(path: readonly LocatedSuggestionStop[]): number {
  let crossings = 0;
  for (let first = 0; first < path.length - 1; first++) {
    for (let second = first + 2; second < path.length - 1; second++) {
      if (first === 0 && second === path.length - 2) continue;
      if (segmentsCross(path[first], path[first + 1], path[second], path[second + 1])) {
        crossings++;
      }
    }
  }
  return crossings;
}

function segmentsCross(
  a: LocatedSuggestionStop,
  b: LocatedSuggestionStop,
  c: LocatedSuggestionStop,
  d: LocatedSuggestionStop
): boolean {
  const first = orientation(a, b, c);
  const second = orientation(a, b, d);
  const third = orientation(c, d, a);
  const fourth = orientation(c, d, b);
  return first * second < -EPSILON && third * fourth < -EPSILON;
}

function orientation(a: CoordinatePair, b: CoordinatePair, c: CoordinatePair): number {
  return (b.longitude - a.longitude) * (c.latitude - a.latitude)
    - (b.latitude - a.latitude) * (c.longitude - a.longitude);
}

function projection(
  stop: LocatedSuggestionStop,
  start: LocatedSuggestionStop,
  axisX: number,
  axisY: number,
  axisLength: number,
  longitudeScale: number
) {
  const x = (stop.longitude - start.longitude) * longitudeScale;
  const y = stop.latitude - start.latitude;
  return {
    along: (x * axisX + y * axisY) / axisLength,
    across: Math.abs(x * axisY - y * axisX) / axisLength,
  };
}

function nearestDistance(
  origin: LocatedSuggestionStop,
  candidates: readonly LocatedSuggestionStop[]
): number {
  if (candidates.length === 0) return 0;
  return Math.min(...candidates.map(candidate => distanceBetween(origin, candidate)));
}

function distanceBetween(a: CoordinatePair, b: CoordinatePair): number {
  return haversineDistanceKm(a, b);
}

function compareCandidatePaths(
  left: readonly LocatedSuggestionStop[],
  right: readonly LocatedSuggestionStop[]
): number {
  return scorePath(left) - scorePath(right)
    || sequenceKey(left).localeCompare(sequenceKey(right));
}

function uniquePaths(paths: readonly LocatedSuggestionStop[][]): LocatedSuggestionStop[][] {
  const seen = new Set<string>();
  return paths.filter(path => {
    const key = sequenceKey(path);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function orderSpatially(
  left: LocatedSuggestionStop,
  right: LocatedSuggestionStop
): [LocatedSuggestionStop, LocatedSuggestionStop] {
  return compareSpatially(left, right) <= 0 ? [left, right] : [right, left];
}

function compareSpatially(left: LocatedSuggestionStop, right: LocatedSuggestionStop): number {
  return left.longitude - right.longitude
    || left.latitude - right.latitude
    || left.id.localeCompare(right.id);
}

function pairKey(pair: readonly LocatedSuggestionStop[]): string {
  return pair.map(stop => stop.id).join('|');
}

function sequenceKey(path: readonly LocatedSuggestionStop[]): string {
  return path.map(stop => stop.id).join('|');
}

function sameSequence(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function isMeaningfulAlternative(
  original: readonly LocatedSuggestionStop[],
  alternative: readonly LocatedSuggestionStop[]
): boolean {
  if (sameSequence(original.map(stop => stop.id), alternative.map(stop => stop.id))) return false;
  if (distanceBetween(original[0], alternative[0]) >= 0.05) return true;

  const originalEdges = new Set(pathGeographicEdges(original));
  return pathGeographicEdges(alternative).some(edge => !originalEdges.has(edge));
}

function pathGeographicEdges(path: readonly LocatedSuggestionStop[]): string[] {
  return path.slice(1).map((stop, index) => {
    const points = [path[index], stop]
      .map(point => `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`)
      .sort();
    return points.join('|');
  });
}

function roundScore(value: number): number {
  return Math.round(value * 1000) / 1000;
}
