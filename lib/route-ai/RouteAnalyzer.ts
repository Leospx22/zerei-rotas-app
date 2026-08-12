import type { GroupedStop } from '@/lib/packageUtils';
import type {
  DuplicateGroup,
  OptimizationContext,
  RouteAnalysis,
  RouteBottleneck,
  RouteCluster,
  RouteCoordinate,
} from './OptimizationTypes.ts';

export const DEFAULT_OPTIMIZATION_CONTEXT: OptimizationContext = {
  averageMinutesPerStop: 3.5,
  averageSpeedKmh: 28,
  fuelConsumptionKmPerLiter: 9.5,
};

const COORDINATE_GRID_SIZE = 0.015;

export function hasCoordinate(stop: Pick<GroupedStop, 'latitude' | 'longitude'>): boolean {
  return stop.latitude !== null && stop.longitude !== null;
}

export function getStopCoordinate(stop: GroupedStop): RouteCoordinate | null {
  return hasCoordinate(stop)
    ? { latitude: stop.latitude!, longitude: stop.longitude! }
    : null;
}

export function calculateDistanceKm(a: GroupedStop, b: GroupedStop): number {
  const coordA = getStopCoordinate(a);
  const coordB = getStopCoordinate(b);

  if (coordA && coordB) {
    return haversineDistanceKm(coordA, coordB);
  }

  if (getStreetName(a.normalizedAddress) === getStreetName(b.normalizedAddress)) return 0.25;
  if (getNeighborhood(a) && getNeighborhood(a) === getNeighborhood(b)) return 0.85;
  if (a.zipCode && b.zipCode && a.zipCode.slice(0, 5) === b.zipCode.slice(0, 5)) return 1.4;
  return 3.5;
}

export function calculateRouteDistanceKm(stops: readonly GroupedStop[]): number {
  if (stops.length < 2) return 0;
  let distance = 0;
  for (let index = 1; index < stops.length; index++) {
    distance += calculateDistanceKm(stops[index - 1], stops[index]);
  }
  return roundDistance(distance);
}

export function estimateDurationMinutes(
  distanceKm: number,
  stopCount: number,
  context: OptimizationContext = DEFAULT_OPTIMIZATION_CONTEXT
): number {
  const driveMinutes = context.averageSpeedKmh > 0
    ? (distanceKm / context.averageSpeedKmh) * 60
    : 0;
  return Math.round(driveMinutes + stopCount * context.averageMinutesPerStop);
}

export function analyzeRoute(
  stops: readonly GroupedStop[],
  context: OptimizationContext = DEFAULT_OPTIMIZATION_CONTEXT
): RouteAnalysis {
  const originalDistanceKm = calculateRouteDistanceKm(stops);
  const duplicateStreets = buildDuplicateGroups(stops, stop => getStreetName(stop.normalizedAddress), 'Rua nao identificada');
  const duplicateNeighborhoods = buildDuplicateGroups(stops, getNeighborhood, 'Bairro nao identificado');
  const clusters = buildClusters(stops);
  const potentialBottlenecks = buildBottlenecks(stops, duplicateNeighborhoods);

  return {
    totalStops: stops.length,
    originalDistanceKm,
    estimatedOriginalDurationMinutes: estimateDurationMinutes(originalDistanceKm, stops.length, context),
    averageStopDistanceKm: stops.length > 1 ? roundDistance(originalDistanceKm / (stops.length - 1)) : 0,
    clusters,
    potentialBottlenecks,
    duplicateStreets,
    duplicateNeighborhoods,
  };
}

export function getStreetName(address: string): string {
  const cleaned = address.split('-')[0]?.split(',')[0]?.trim() ?? '';
  return normalizeKey(cleaned);
}

export function getNeighborhood(stop: GroupedStop): string {
  const groupNeighborhood = stop.addressGroups
    .map(group => parseNeighborhood(group.normalizedAddress))
    .find(Boolean);
  return normalizeKey(groupNeighborhood ?? parseNeighborhood(stop.normalizedAddress) ?? stop.zipCode.slice(0, 5));
}

function buildDuplicateGroups(
  stops: readonly GroupedStop[],
  selector: (stop: GroupedStop) => string,
  fallbackLabel: string
): DuplicateGroup[] {
  const groups = new Map<string, GroupedStop[]>();
  for (const stop of stops) {
    const key = selector(stop) || fallbackLabel.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(stop);
  }

  return [...groups.entries()]
    .filter(([, groupedStops]) => groupedStops.length > 1)
    .map(([key, groupedStops]) => ({
      key,
      label: toDisplayLabel(key),
      count: groupedStops.length,
      stopIds: groupedStops.map(stop => stop.id),
    }))
    .sort((a, b) => b.count - a.count);
}

function buildClusters(stops: readonly GroupedStop[]): RouteCluster[] {
  const buckets = new Map<string, GroupedStop[]>();
  for (const stop of stops) {
    const coordinate = getStopCoordinate(stop);
    const key = coordinate
      ? `${Math.round(coordinate.latitude / COORDINATE_GRID_SIZE)}:${Math.round(coordinate.longitude / COORDINATE_GRID_SIZE)}`
      : getNeighborhood(stop) || getStreetName(stop.normalizedAddress) || 'sem-area';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(stop);
  }

  return [...buckets.entries()]
    .map(([key, groupedStops], index) => {
      const center = getClusterCenter(groupedStops);
      const labelSource = getNeighborhood(groupedStops[0]) || getStreetName(groupedStops[0].normalizedAddress);
      return {
        id: `cluster-${index + 1}`,
        label: labelSource ? toDisplayLabel(labelSource) : `Area ${key}`,
        stopIds: groupedStops.map(stop => stop.id),
        stopCount: groupedStops.length,
        packageCount: groupedStops.reduce((sum, stop) => sum + stop.packageCount, 0),
        center,
      };
    })
    .sort((a, b) => b.stopCount - a.stopCount);
}

function buildBottlenecks(
  stops: readonly GroupedStop[],
  duplicateNeighborhoods: readonly DuplicateGroup[]
): RouteBottleneck[] {
  const bottlenecks: RouteBottleneck[] = [];
  const missingCoordinates = stops.filter(stop => !hasCoordinate(stop));
  if (missingCoordinates.length > 0) {
    bottlenecks.push({
      type: 'missing-coordinate',
      severity: missingCoordinates.length / Math.max(stops.length, 1) > 0.35 ? 'high' : 'medium',
      message: `${missingCoordinates.length} paradas sem coordenadas usam estimativa por endereco.`,
      stopIds: missingCoordinates.map(stop => stop.id),
    });
  }

  const largeStops = stops.filter(stop => stop.packageCount >= 8);
  for (const stop of largeStops.slice(0, 5)) {
    bottlenecks.push({
      type: 'large-stop',
      severity: stop.packageCount >= 14 ? 'high' : 'medium',
      message: `Parada ${stop.stopNumber} concentra ${stop.packageCount} pacotes.`,
      stopIds: [stop.id],
    });
  }

  for (const group of duplicateNeighborhoods.slice(0, 3)) {
    if (group.count < 3) continue;
    bottlenecks.push({
      type: 'duplicate-area',
      severity: group.count >= 8 ? 'high' : 'medium',
      message: `${group.count} paradas no bairro ${group.label}.`,
      stopIds: group.stopIds,
    });
  }

  return bottlenecks;
}

function getClusterCenter(stops: readonly GroupedStop[]): RouteCoordinate | null {
  const coordinates = stops.map(getStopCoordinate).filter((coord): coord is RouteCoordinate => coord !== null);
  if (coordinates.length === 0) return null;

  return {
    latitude: coordinates.reduce((sum, coord) => sum + coord.latitude, 0) / coordinates.length,
    longitude: coordinates.reduce((sum, coord) => sum + coord.longitude, 0) / coordinates.length,
  };
}

function haversineDistanceKm(a: RouteCoordinate, b: RouteCoordinate): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function parseNeighborhood(address: string): string | null {
  const parts = address.split('-').map(part => part.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 1];
  return null;
}

function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function toDisplayLabel(value: string): string {
  return value
    .split(' ')
    .map(word => word ? word[0].toUpperCase() + word.slice(1) : word)
    .join(' ');
}

function toRadians(value: number): number {
  return value * Math.PI / 180;
}

export function roundDistance(value: number): number {
  return Math.round(value * 10) / 10;
}
