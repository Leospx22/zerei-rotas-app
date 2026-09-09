import type { GroupedStop } from '../packageUtils.ts';
import {
  haversineDistanceKm,
  sanitizeCoordinatePair,
  sanitizeCoordinateRecord,
  sanitizeRouteCoordinates,
  summarizeCoordinateIntegrity,
  type CoordinateConfidence,
  type MetricProvenance,
} from '../coordinateIntegrity.ts';
import type {
  DuplicateGroup,
  OptimizationContext,
  RouteAnalysis,
  RouteBottleneck,
  RouteCluster,
  RouteCoordinate,
  RouteSegmentMetric,
} from './OptimizationTypes.ts';

export const DEFAULT_OPTIMIZATION_CONTEXT: OptimizationContext = {
  averageMinutesPerStop: 3.5,
  averageSpeedKmh: 28,
  fuelConsumptionKmPerLiter: 9.5,
};

const COORDINATE_GRID_SIZE = 0.015;
const ESTIMATED_METRIC_PROVENANCE: MetricProvenance = 'estimated';

export function hasCoordinate(stop: Pick<GroupedStop, 'latitude' | 'longitude'> & {
  coordinateConfidence?: CoordinateConfidence;
  coordinateIntegrity?: ReturnType<typeof sanitizeCoordinatePair>;
}): boolean {
  const coordinate = sanitizeCoordinateRecord({ ...stop, id: 'stop' });
  return coordinate.latitude !== null
    && coordinate.longitude !== null
    && coordinate.confidence !== 'invalid'
    && coordinate.confidence !== 'unavailable'
    && coordinate.confidence !== 'outlier';
}

export function getStopCoordinate(stop: GroupedStop): RouteCoordinate | null {
  const coordinate = sanitizeCoordinateRecord({ ...stop, id: stop.id });
  return coordinate.latitude !== null
    && coordinate.longitude !== null
    && coordinate.confidence !== 'invalid'
    && coordinate.confidence !== 'unavailable'
    && coordinate.confidence !== 'outlier'
    ? { latitude: coordinate.latitude!, longitude: coordinate.longitude! }
    : null;
}

export function calculateDistanceKm(a: GroupedStop, b: GroupedStop): number {
  return calculateSegmentMetric(a, b).distanceKm;
}

export function calculateRouteDistanceKm(stops: readonly GroupedStop[]): number {
  return calculateRouteMetricSummary(stops).distanceKm;
}

export function calculateRouteMetricSummary(stops: readonly GroupedStop[]): {
  distanceKm: number;
  segments: RouteSegmentMetric[];
  metricConfidence: RouteAnalysis['metricConfidence'];
  metricProvenance: MetricProvenance;
  unreliableSegmentCount: number;
} {
  if (stops.length < 2) {
    return {
      distanceKm: 0,
      segments: [],
      metricConfidence: 'reliable',
      metricProvenance: ESTIMATED_METRIC_PROVENANCE,
      unreliableSegmentCount: 0,
    };
  }
  const sanitizedStops = sanitizeRouteCoordinates(stops);
  let distance = 0;
  const segments: RouteSegmentMetric[] = [];
  for (let index = 1; index < stops.length; index++) {
    const segment = calculateSegmentMetric(sanitizedStops[index - 1], sanitizedStops[index]);
    segments.push(segment);
    distance += segment.distanceKm;
  }
  const unreliableSegmentCount = segments.filter(segment => segment.confidence === 'unreliable').length;
  const degradedSegmentCount = segments.filter(segment => segment.confidence === 'degraded').length;
  return {
    distanceKm: roundDistance(distance),
    segments,
    metricConfidence: unreliableSegmentCount > 0
      ? 'unreliable'
      : degradedSegmentCount > 0
        ? 'degraded'
        : 'reliable',
    metricProvenance: ESTIMATED_METRIC_PROVENANCE,
    unreliableSegmentCount,
  };
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
  const sanitizedStops = sanitizeRouteCoordinates(stops);
  const metricSummary = calculateRouteMetricSummary(stops);
  const originalDistanceKm = metricSummary.distanceKm;
  const duplicateStreets = buildDuplicateGroups(stops, stop => getStreetName(stop.normalizedAddress), 'Rua nao identificada');
  const duplicateNeighborhoods = buildDuplicateGroups(stops, getNeighborhood, 'Bairro nao identificado');
  const clusters = buildClusters(sanitizedStops);
  const potentialBottlenecks = buildBottlenecks(sanitizedStops, duplicateNeighborhoods);

  return {
    totalStops: stops.length,
    originalDistanceKm,
    estimatedOriginalDurationMinutes: estimateDurationMinutes(originalDistanceKm, stops.length, context),
    averageStopDistanceKm: stops.length > 1 ? roundDistance(originalDistanceKm / (stops.length - 1)) : 0,
    metricProvenance: metricSummary.metricProvenance,
    metricConfidence: metricSummary.metricConfidence,
    unreliableSegmentCount: metricSummary.unreliableSegmentCount,
    segments: metricSummary.segments,
    coordinateSummary: summarizeCoordinateIntegrity(sanitizedStops.map(stop => stop.coordinateIntegrity)),
    clusters,
    potentialBottlenecks,
    duplicateStreets,
    duplicateNeighborhoods,
  };
}

function calculateSegmentMetric(a: GroupedStop, b: GroupedStop): RouteSegmentMetric {
  const coordA = getMetricCoordinate(a);
  const coordB = getMetricCoordinate(b);
  const confidence = resolveSegmentConfidence(coordA.confidence, coordB.confidence);
  const distanceKm = coordA.coordinate && coordB.coordinate && confidence !== 'unreliable'
    ? haversineDistanceKm(coordA.coordinate, coordB.coordinate)
    : 0;

  return {
    fromStopId: a.id,
    toStopId: b.id,
    distanceKm: roundDistance(distanceKm),
    provenance: ESTIMATED_METRIC_PROVENANCE,
    confidence,
    coordinateConfidence: {
      from: coordA.confidence,
      to: coordB.confidence,
    },
  };
}

function getMetricCoordinate(stop: GroupedStop): {
  coordinate: RouteCoordinate | null;
  confidence: CoordinateConfidence;
} {
  const routeAwareIntegrity = 'coordinateIntegrity' in stop
    ? (stop as GroupedStop & { coordinateIntegrity?: ReturnType<typeof sanitizeCoordinatePair> }).coordinateIntegrity
    : undefined;
  const coordinate = routeAwareIntegrity ?? sanitizeCoordinateRecord({ ...stop, id: stop.id });
  return {
    coordinate: coordinate.latitude !== null && coordinate.longitude !== null
      ? { latitude: coordinate.latitude, longitude: coordinate.longitude }
      : null,
    confidence: coordinate.confidence,
  };
}

function resolveSegmentConfidence(
  from: CoordinateConfidence,
  to: CoordinateConfidence
): RouteSegmentMetric['confidence'] {
  const values = [from, to];
  if (values.some(value => value === 'invalid' || value === 'outlier' || value === 'unavailable')) {
    return 'unreliable';
  }
  if (values.some(value => value === 'ambiguous')) return 'degraded';
  return 'reliable';
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

export function roundDistance(value: number): number {
  return Math.round(value * 10) / 10;
}
