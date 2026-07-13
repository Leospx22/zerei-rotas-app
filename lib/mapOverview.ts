import type { RouteData } from '../contexts/RouteContext.tsx';
import { getPrimaryExecutionAddress } from './executionPresentation.ts';
import type { GroupedStop } from './packageUtils.ts';
import { buildCanonicalNavigationAddress, buildStopGeocodingInput } from './geocoding.ts';
import {
  buildDisplayedRoutePositionMap,
  getBaseAddressKey,
  isMissingSpreadsheetStop,
} from './routeStopPresentation.ts';

export type MapStopStatus = 'pending' | 'current' | 'completed';
export type MapCoordinateState = 'available' | 'partial' | 'unavailable';
export type MapCoordinateStatus = 'valid' | 'corrected' | 'recovered' | 'invalid' | 'missing';

export interface MapStop {
  id: string;
  order: number;
  badge: string;
  address: string;
  navigationAddress: string;
  zipCode: string;
  city?: string;
  state?: string;
  baseAddressKey: string;
  missingSpreadsheetStop: boolean;
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

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface SafeMapMarker {
  key: string;
  stop: LocatedMapStop;
}

export interface SafeMapPayload {
  canRenderNativeMap: boolean;
  markers: SafeMapMarker[];
  coordinates: Array<{ latitude: number; longitude: number }>;
  polylineCoordinates: Array<{ latitude: number; longitude: number }>;
  initialRegion: MapRegion | null;
  selectedStopId: string | null;
}

export function isNativeRouteMapFeatureEnabled(value: unknown): boolean {
  return value === 'true';
}

export function shouldAttemptNativeRouteMap(
  canRenderNativeMap: boolean,
  platform: string,
  featureFlagValue: unknown
): boolean {
  if (!canRenderNativeMap) return false;
  return platform !== 'android' || isNativeRouteMapFeatureEnabled(featureFlagValue);
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

export function isValidCoordinatePair(latitude: unknown, longitude: unknown): latitude is number {
  return validCoordinate(typeof latitude === 'number' ? latitude : null, -90, 90) !== null
    && validCoordinate(typeof longitude === 'number' ? longitude : null, -180, 180) !== null;
}

export function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function buildSafeInitialRegion(
  coordinate: { latitude: unknown; longitude: unknown } | null | undefined
): MapRegion | null {
  if (!coordinate || !isValidCoordinatePair(coordinate.latitude, coordinate.longitude)) {
    return null;
  }
  const latitude = coordinate.latitude as number;
  const longitude = coordinate.longitude as number;

  return {
    latitude,
    longitude,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };
}

export function buildSafeMapPayload(
  stops: readonly MapStop[],
  selectedStopId: string | null
): SafeMapPayload {
  const locatedStops = getLocatedMapStops(stops);
  const seenKeys = new Set<string>();
  const markers = locatedStops
    .filter(stop => typeof stop.id === 'string' && stop.id.trim().length > 0)
    .filter(stop => {
      if (seenKeys.has(stop.id)) return false;
      seenKeys.add(stop.id);
      return true;
    })
    .map((stop): SafeMapMarker => ({
      key: stop.id,
      stop,
    }));
  const coordinates = markers.map(({ stop }) => ({
    latitude: stop.latitude,
    longitude: stop.longitude,
  }));
  const initialRegion = buildSafeInitialRegion(coordinates[0]);
  const safeSelectedStopId = selectedStopId && markers.some(marker => marker.stop.id === selectedStopId)
    ? selectedStopId
    : markers[0]?.stop.id ?? null;

  return {
    canRenderNativeMap: markers.length > 0 && initialRegion !== null,
    markers,
    coordinates,
    polylineCoordinates: coordinates.length >= 2 ? coordinates : [],
    initialRegion,
    selectedStopId: safeSelectedStopId,
  };
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

function inheritDuplicateAddressCoordinates(stops: MapStop[]): MapStop[] {
  const coordinatesByAddress = new Map<string, { latitude: number; longitude: number }>();

  stops.forEach(stop => {
    if (stop.latitude === null || stop.longitude === null) return;
    if (!stop.baseAddressKey) return;
    if (!coordinatesByAddress.has(stop.baseAddressKey)) {
      coordinatesByAddress.set(stop.baseAddressKey, {
        latitude: stop.latitude,
        longitude: stop.longitude,
      });
    }
  });

  if (coordinatesByAddress.size === 0) return stops;

  const inherited = stops.map(stop => {
    if (stop.latitude !== null && stop.longitude !== null) return stop;
    const coordinate = coordinatesByAddress.get(stop.baseAddressKey);
    if (!coordinate) return stop;
    return {
      ...stop,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      coordinateStatus: 'recovered' as const,
    };
  });

  return sanitizeRouteCoordinates(inherited);
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
  const displayedPositions = buildDisplayedRoutePositionMap(route.stops);

  const mapStops = route.stops.map((stop, index) => {
    const latitude = validCoordinate(stop.latitude, -90, 90);
    const longitude = validCoordinate(stop.longitude, -180, 180);
    const hasSourceCoordinate = stop.latitude !== null || stop.longitude !== null;
    const hasValidPair = latitude !== null && longitude !== null;
    const geocodingInput = buildStopGeocodingInput(stop);
    const address = getPrimaryExecutionAddress(stop);

    return {
      id: stop.id,
      order: index + 1,
      badge: displayedPositions[stop.id]?.badge ?? `#${index + 1}`,
      address,
      navigationAddress: buildCanonicalNavigationAddress(geocodingInput),
      zipCode: stop.zipCode,
      city: geocodingInput.city,
      state: geocodingInput.state,
      baseAddressKey: getBaseAddressKey(address),
      missingSpreadsheetStop: isMissingSpreadsheetStop(stop),
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

  return inheritDuplicateAddressCoordinates(sanitizeRouteCoordinates(mapStops));
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
      isValidCoordinatePair(stop.latitude, stop.longitude)
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

  return inheritDuplicateAddressCoordinates(sanitizeRouteCoordinates(recovered));
}

export function mapStopStatusLabel(status: MapStopStatus): string {
  if (status === 'completed') return 'Concluída';
  if (status === 'current') return 'Em andamento';
  return 'Planejada';
}
