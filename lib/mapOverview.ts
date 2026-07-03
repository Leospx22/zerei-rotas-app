import type { RouteData } from '../contexts/RouteContext.tsx';
import { getPrimaryExecutionAddress } from './executionPresentation.ts';
import type { GroupedStop } from './packageUtils.ts';

export type MapStopStatus = 'pending' | 'current' | 'completed';
export type MapCoordinateState = 'available' | 'partial' | 'unavailable';

export interface MapStop {
  id: string;
  order: number;
  address: string;
  latitude: number | null;
  longitude: number | null;
  packageCount: number;
  deliveredCount: number;
  occurrenceCount: number;
  status: MapStopStatus;
}

function validCoordinate(value: number | null, minimum: number, maximum: number): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : null;
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

  return route.stops.map((stop, index) => ({
    id: stop.id,
    order: index + 1,
    address: getPrimaryExecutionAddress(stop),
    latitude: validCoordinate(stop.latitude, -90, 90),
    longitude: validCoordinate(stop.longitude, -180, 180),
    packageCount: stop.packages.length,
    deliveredCount: stop.packages.filter(pkg => pkg.status === 'delivered').length,
    occurrenceCount: stop.packages.filter(pkg => Boolean(pkg.occurrenceReason)).length,
    status: hasCompletedStop(stop)
      ? 'completed'
      : index === currentStopIndex
        ? 'current'
        : 'pending',
  }));
}

export function getMapCoordinateState(stops: readonly MapStop[]): MapCoordinateState {
  const locatedCount = stops.filter(
    stop => stop.latitude !== null && stop.longitude !== null
  ).length;

  if (locatedCount === 0) return 'unavailable';
  if (locatedCount === stops.length) return 'available';
  return 'partial';
}

export function mapStopStatusLabel(status: MapStopStatus): string {
  if (status === 'completed') return 'Concluída';
  if (status === 'current') return 'Em andamento';
  return 'Planejada';
}
