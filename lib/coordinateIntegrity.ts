export type CoordinateConfidence =
  | 'valid'
  | 'corrected_swap'
  | 'ambiguous'
  | 'outlier'
  | 'invalid'
  | 'unavailable';

export type MetricProvenance = 'estimated' | 'road_routed';

export interface CoordinatePair {
  latitude: number;
  longitude: number;
}

export interface GeographicBounds {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}

export interface CoordinateValidationContext {
  id: string;
  label: string;
  bounds: GeographicBounds;
  nearZeroThresholdDegrees: number;
  outlierThresholdKm: number;
  outlierMadMultiplier: number;
}

export interface CoordinateValidationResult {
  latitude: number | null;
  longitude: number | null;
  confidence: CoordinateConfidence;
  originalLatitude: number | null;
  originalLongitude: number | null;
  reason: string;
}

export interface RouteCoordinateInput {
  id: string;
  latitude: unknown;
  longitude: unknown;
  coordinateConfidence?: CoordinateConfidence;
  originalLatitude?: number | null;
  originalLongitude?: number | null;
  coordinateIssue?: string;
  coordinateIntegrity?: CoordinateValidationResult;
}

export interface RouteCoordinateValidationResult extends CoordinateValidationResult {
  id: string;
}

export interface CoordinateIntegritySummary {
  total: number;
  valid: number;
  correctedSwap: number;
  ambiguous: number;
  outlier: number;
  invalid: number;
  unavailable: number;
}

export type AiRouteEligibleConfidence = 'valid' | 'corrected_swap';

export interface AiRouteEligibleCoordinate {
  latitude: number;
  longitude: number;
  confidence: AiRouteEligibleConfidence;
}

export const BRAZIL_COORDINATE_CONTEXT: CoordinateValidationContext = {
  id: 'BR',
  label: 'Brasil',
  bounds: {
    minLatitude: -34,
    maxLatitude: 6,
    minLongitude: -74,
    maxLongitude: -34,
  },
  nearZeroThresholdDegrees: 0.001,
  outlierThresholdKm: 120,
  outlierMadMultiplier: 3,
};

export const DEFAULT_COORDINATE_CONTEXT = BRAZIL_COORDINATE_CONTEXT;

export function parseCoordinateValue(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[+-]?\d+(?:[\.,]\d+)?$/.test(trimmed)) return null;
  const parsed = Number.parseFloat(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function isStructurallyValidCoordinatePair(
  latitude: unknown,
  longitude: unknown
): latitude is number {
  const lat = parseCoordinateValue(latitude);
  const lng = parseCoordinateValue(longitude);
  return lat !== null
    && lng !== null
    && lat >= -90
    && lat <= 90
    && lng >= -180
    && lng <= 180;
}

/** Canonical coordinate rule for AI map organization. */
export function isAiRouteEligibleCoordinate(
  coordinate: Pick<CoordinateValidationResult, 'latitude' | 'longitude' | 'confidence'>
): coordinate is AiRouteEligibleCoordinate {
  return coordinate.latitude !== null
    && coordinate.longitude !== null
    && Number.isFinite(coordinate.latitude)
    && Number.isFinite(coordinate.longitude)
    && (coordinate.confidence === 'valid' || coordinate.confidence === 'corrected_swap');
}

export function sanitizeCoordinatePair(
  latitude: unknown,
  longitude: unknown,
  context: CoordinateValidationContext = DEFAULT_COORDINATE_CONTEXT
): CoordinateValidationResult {
  const originalLatitude = parseCoordinateValue(latitude);
  const originalLongitude = parseCoordinateValue(longitude);

  if (originalLatitude === null && originalLongitude === null) {
    return unavailable(originalLatitude, originalLongitude, 'Coordenadas ausentes.');
  }

  if (!isStructurallyValidCoordinatePair(originalLatitude, originalLongitude)) {
    return invalid(originalLatitude, originalLongitude, 'Coordenadas fora do formato esperado.');
  }
  if (originalLatitude === null || originalLongitude === null) {
    return invalid(originalLatitude, originalLongitude, 'Coordenadas fora do formato esperado.');
  }

  if (isNearZero(originalLatitude, originalLongitude, context)) {
    return invalid(originalLatitude, originalLongitude, 'Coordenadas próximas de 0,0 foram rejeitadas.');
  }

  const originalFits = fitsBounds(originalLatitude, originalLongitude, context.bounds);
  const swappedFits = fitsBounds(originalLongitude, originalLatitude, context.bounds)
    && isStructurallyValidCoordinatePair(originalLongitude, originalLatitude)
    && !isNearZero(originalLongitude, originalLatitude, context);

  if (originalFits && !swappedFits) {
    return {
      latitude: originalLatitude,
      longitude: originalLongitude,
      confidence: 'valid',
      originalLatitude,
      originalLongitude,
      reason: `Coordenadas dentro da área ${context.label}.`,
    };
  }

  if (!originalFits && swappedFits) {
    return {
      latitude: originalLongitude,
      longitude: originalLatitude,
      confidence: 'corrected_swap',
      originalLatitude,
      originalLongitude,
      reason: 'Latitude e longitude pareciam invertidas e foram corrigidas.',
    };
  }

  if (originalFits && swappedFits) {
    return {
      latitude: originalLatitude,
      longitude: originalLongitude,
      confidence: 'ambiguous',
      originalLatitude,
      originalLongitude,
      reason: 'Coordenadas ambíguas; orientação original preservada.',
    };
  }

  return invalid(originalLatitude, originalLongitude, `Coordenadas fora da área ${context.label}.`);
}

export function sanitizeCoordinateRecord(
  record: RouteCoordinateInput,
  context: CoordinateValidationContext = DEFAULT_COORDINATE_CONTEXT
): CoordinateValidationResult {
  if (record.coordinateIntegrity) return record.coordinateIntegrity;

  const sanitized = sanitizeCoordinatePair(record.latitude, record.longitude, context);
  const existingConfidence = record.coordinateConfidence;

  if (!existingConfidence) return sanitized;

  const originalLatitude = record.originalLatitude ?? sanitized.originalLatitude;
  const originalLongitude = record.originalLongitude ?? sanitized.originalLongitude;
  const reason = record.coordinateIssue ?? sanitized.reason;

  if (
    existingConfidence === 'corrected_swap'
    || existingConfidence === 'ambiguous'
  ) {
    if (sanitized.latitude !== null && sanitized.longitude !== null) {
      return {
        ...sanitized,
        confidence: existingConfidence,
        originalLatitude,
        originalLongitude,
        reason,
      };
    }
  }

  if (
    sanitized.confidence === 'unavailable'
    && (existingConfidence === 'invalid' || existingConfidence === 'outlier')
  ) {
    return {
      ...sanitized,
      confidence: existingConfidence,
      originalLatitude,
      originalLongitude,
      reason,
    };
  }

  return sanitized;
}

export function sanitizeRouteCoordinates<T extends RouteCoordinateInput>(
  stops: readonly T[],
  context: CoordinateValidationContext = DEFAULT_COORDINATE_CONTEXT
): Array<T & { coordinateIntegrity: RouteCoordinateValidationResult }> {
  const sanitized = stops.map(stop => ({
    ...stop,
    coordinateIntegrity: {
      id: stop.id,
      ...sanitizeCoordinateRecord(stop, context),
    },
  }));
  const reliable = sanitized.filter(stop =>
    stop.coordinateIntegrity.latitude !== null
    && stop.coordinateIntegrity.longitude !== null
    && stop.coordinateIntegrity.confidence !== 'invalid'
    && stop.coordinateIntegrity.confidence !== 'unavailable'
  );

  if (reliable.length < 3) return sanitized;

  const center = findMedoid(reliable.map(stop => ({
    latitude: stop.coordinateIntegrity.latitude!,
    longitude: stop.coordinateIntegrity.longitude!,
  })));
  const distances = reliable.map(stop =>
    haversineDistanceKm(
      {
        latitude: stop.coordinateIntegrity.latitude!,
        longitude: stop.coordinateIntegrity.longitude!,
      },
      center
    )
  );
  const distanceMedian = median(distances);
  const mad = median(distances.map(distance => Math.abs(distance - distanceMedian)));
  const robustThreshold = distanceMedian + Math.max(
    context.outlierThresholdKm,
    mad * context.outlierMadMultiplier
  );

  return sanitized.map(stop => {
    const coordinate = stop.coordinateIntegrity;
    if (coordinate.latitude === null || coordinate.longitude === null) return stop;
    const distanceFromCenter = haversineDistanceKm(
      { latitude: coordinate.latitude, longitude: coordinate.longitude },
      center
    );
    if (distanceFromCenter <= robustThreshold) return stop;
    return {
      ...stop,
      coordinateIntegrity: {
        ...coordinate,
        latitude: null,
        longitude: null,
        confidence: 'outlier' as const,
        reason: 'Coordenada destoante do restante da rota.',
      },
    };
  });
}

export function summarizeCoordinateIntegrity(
  results: readonly Pick<CoordinateValidationResult, 'confidence'>[]
): CoordinateIntegritySummary {
  return {
    total: results.length,
    valid: results.filter(result => result.confidence === 'valid').length,
    correctedSwap: results.filter(result => result.confidence === 'corrected_swap').length,
    ambiguous: results.filter(result => result.confidence === 'ambiguous').length,
    outlier: results.filter(result => result.confidence === 'outlier').length,
    invalid: results.filter(result => result.confidence === 'invalid').length,
    unavailable: results.filter(result => result.confidence === 'unavailable').length,
  };
}

export function haversineDistanceKm(a: CoordinatePair, b: CoordinatePair): number {
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

function unavailable(
  originalLatitude: number | null,
  originalLongitude: number | null,
  reason: string
): CoordinateValidationResult {
  return {
    latitude: null,
    longitude: null,
    confidence: 'unavailable',
    originalLatitude,
    originalLongitude,
    reason,
  };
}

function invalid(
  originalLatitude: number | null,
  originalLongitude: number | null,
  reason: string
): CoordinateValidationResult {
  return {
    latitude: null,
    longitude: null,
    confidence: 'invalid',
    originalLatitude,
    originalLongitude,
    reason,
  };
}

function fitsBounds(latitude: number, longitude: number, bounds: GeographicBounds): boolean {
  return latitude >= bounds.minLatitude
    && latitude <= bounds.maxLatitude
    && longitude >= bounds.minLongitude
    && longitude <= bounds.maxLongitude;
}

function isNearZero(
  latitude: number,
  longitude: number,
  context: CoordinateValidationContext
): boolean {
  return Math.abs(latitude) <= context.nearZeroThresholdDegrees
    && Math.abs(longitude) <= context.nearZeroThresholdDegrees;
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function findMedoid(coordinates: CoordinatePair[]): CoordinatePair {
  return coordinates
    .map(coordinate => ({
      coordinate,
      totalDistance: coordinates.reduce(
        (sum, other) => sum + haversineDistanceKm(coordinate, other),
        0
      ),
    }))
    .sort((left, right) => left.totalDistance - right.totalDistance)[0].coordinate;
}

function toRadians(value: number): number {
  return value * Math.PI / 180;
}
