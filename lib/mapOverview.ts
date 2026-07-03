import type { RouteData } from '../contexts/RouteContext.tsx';
import { getPrimaryExecutionAddress } from './executionPresentation.ts';
import type { GroupedStop } from './packageUtils.ts';

export type MapStopStatus = 'pending' | 'current' | 'completed';
export type MapCoordinateState = 'available' | 'partial' | 'unavailable';
export type MapCoordinateStatus = 'valid' | 'corrected' | 'recovered' | 'invalid' | 'missing';

export interface MapStop {
  id: string;
  order: number;
  address: string;
  latitude: number | null;
  longitude: number | null;
  coordinateStatus: MapCoordinateStatus;
  packageCount: number;
  deliveredCount: number;
  occurrenceCount: number;
  status: MapStopStatus;
}

export type LocatedMapStop = MapStop & { latitude: number; longitude: number };

export interface MapCoordinateSummary {
  totalCount: number;
  displayedCount: number;
  correctedCount: number;
  invalidCount: number;
  missingCount: number;
}

const MIN_CLUSTER_SIZE = 3;
const MIN_OUTLIER_DISTANCE_KM = 100;

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function distanceKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(latitudeB - latitudeA);
  const longitudeDelta = radians(longitudeB - longitudeA);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(latitudeA))
      * Math.cos(radians(latitudeB))
      * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function validCoordinate(value: number | null, minimum: number, maximum: number): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : null;
}

function sanitizeRouteCoordinates(stops: MapStop[]): MapStop[] {
  const locatedStops = getLocatedMapStops(stops);
  if (locatedStops.length < MIN_CLUSTER_SIZE) return stops;

  const centerLatitude = median(locatedStops.map(stop => stop.latitude));
  const centerLongitude = median(locatedStops.map(stop => stop.longitude));
  const distances = locatedStops.map(stop =>
    distanceKm(stop.latitude, stop.longitude, centerLatitude, centerLongitude)
  );
  const typicalDistance = median(distances);
  const outlierThreshold = Math.max(
    MIN_OUTLIER_DISTANCE_KM,
    typicalDistance * 8
  );

  return stops.map(stop => {
    if (stop.latitude === null || stop.longitude === null) return stop;
    const originalDistance = distanceKm(
      stop.latitude,
      stop.longitude,
      centerLatitude,
      centerLongitude
    );
    if (originalDistance <= outlierThreshold) return stop;

    const swappedLatitude = validCoordinate(stop.longitude, -90, 90);
    const swappedLongitude = validCoordinate(stop.latitude, -180, 180);
    if (swappedLatitude !== null && swappedLongitude !== null) {
      const swappedDistance = distanceKm(
        swappedLatitude,
        swappedLongitude,
        centerLatitude,
        centerLongitude
      );
      const isClearlyCloser = swappedDistance <= outlierThreshold
        && swappedDistance * 4 < originalDistance;
      if (isClearlyCloser) {
        return {
          ...stop,
          latitude: swappedLatitude,
          longitude: swappedLongitude,
          coordinateStatus: 'corrected' as const,
        };
      }
    }

    return {
      ...stop,
      latitude: null,
      longitude: null,
      coordinateStatus: 'invalid' as const,
    };
  });
}

export function hasCompletedStop(stop: GroupedStop): boolean {
  return (
    stop.status === 'completed' ||
    stop.status === 'skipped' ||
    (stop.packages.length > 0 &&
      stop.packages.every(pkg => pkg.status === 'delivered' || pkg.status === 'skipped'))
  );
}

export function buildMapStops(route: RouteData): MapStop[] {
  const currentStopIndex = route.status === 'active'
    ? route.stops.findIndex(stop => !hasCompletedStop(stop))
    : -1;

  const mapStops = route.stops.map((stop, index) => {
    const latitude = validCoordinate(stop.latitude, -90, 90);
    const longitude = validCoordinate(stop.longitude, -180, 180);
    const hasSourceCoordinate = stop.latitude !== null || stop.longitude !== null;
    const hasValidPair = latitude !== null && longitude !== null;

    return {
      id: stop.id,
      order: index + 1,
      address: getPrimaryExecutionAddress(stop),
      latitude: hasValidPair ? latitude : null,
      longitude: hasValidPair ? longitude : null,
      coordinateStatus: hasValidPair
        ? 'valid' as const
        : hasSourceCoordinate
          ? 'invalid' as const
          : 'missing' as const,
      packageCount: stop.packages.length,
      deliveredCount: stop.packages.filter(pkg => pkg.status === 'delivered').length,
      occurrenceCount: stop.packages.filter(pkg => Boolean(pkg.occurrenceReason)).length,
      status: hasCompletedStop(stop)
        ? 'completed' as const
        : index === currentStopIndex
          ? 'current' as const
          : 'pending' as const,
    };
  });

  return sanitizeRouteCoordinates(mapStops);
}

export function getMapCoordinateState(stops: readonly MapStop[]): MapCoordinateState {
  const locatedCount = getLocatedMapStops(stops).length;

  if (locatedCount === 0) return 'unavailable';
  if (locatedCount === stops.length) return 'available';
  return 'partial';
}

export function getLocatedMapStops(stops: readonly MapStop[]): LocatedMapStop[] {
  return stops.filter(
    (stop): stop is LocatedMapStop =>
      stop.latitude !== null && stop.longitude !== null
  );
}

export function getMapCoordinateSummary(stops: readonly MapStop[]): MapCoordinateSummary {
  return {
    totalCount: stops.length,
    displayedCount: getLocatedMapStops(stops).length,
    correctedCount: stops.filter(stop => stop.coordinateStatus === 'corrected').length,
    invalidCount: stops.filter(stop => stop.coordinateStatus === 'invalid').length,
    missingCount: stops.filter(stop => stop.coordinateStatus === 'missing').length,
  };
}

export function applyRecoveredMapCoordinates(
  stops: readonly MapStop[],
  coordinatesByStopId: Readonly<Record<string, { latitude: number; longitude: number }>>
): MapStop[] {
  const recovered = stops.map(stop => {
    if (stop.latitude !== null && stop.longitude !== null) return stop;
    const coordinate = coordinatesByStopId[stop.id];
    const latitude = validCoordinate(coordinate?.latitude ?? null, -90, 90);
    const longitude = validCoordinate(coordinate?.longitude ?? null, -180, 180);
    if (latitude === null || longitude === null) return stop;
    return {
      ...stop,
      latitude,
      longitude,
      coordinateStatus: 'recovered' as const,
    };
  });

  return sanitizeRouteCoordinates(recovered);
}

export function mapStopStatusLabel(status: MapStopStatus): string {
  if (status === 'completed') return 'Concluída';
  if (status === 'current') return 'Em andamento';
  return 'Planejada';
}
