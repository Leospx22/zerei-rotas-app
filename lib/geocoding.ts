import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeAddress } from './executionPresentation.ts';
import type { GroupedStop } from './packageUtils.ts';

export interface GeocodingAddressInput {
  address: string;
  zipCode?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface GeocodeCacheEntry {
  normalizedAddressKey: string;
  displayAddress: string;
  latitude: number;
  longitude: number;
  provider: string;
  confidence?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GeocodingStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface GeocodingProviderResult {
  latitude: number;
  longitude: number;
  confidence?: number;
}

export interface GeocodingProvider {
  name: string;
  isConfigured(): boolean;
  geocode(query: string): Promise<GeocodingProviderResult | null>;
}

export type GeocodingResolution =
  | { status: 'cached'; entry: GeocodeCacheEntry }
  | { status: 'resolved'; entry: GeocodeCacheEntry }
  | { status: 'not_configured'; message: 'Geocodificação não configurada' }
  | { status: 'not_found' };

type GeocodeCollection = Record<string, GeocodeCacheEntry>;

export const KEY_GEOCODE_CACHE = 'ZR_GEOCODE_CACHE';

const EXCLUDED_COMPLEMENT = /\b(apartamento|apto|ap|bloco|andar|portaria|loja|fundos|interfone|campainha|recep[cç][aã]o|entregar|entrega|delivery|instru[cç][aã]o)\b/i;

function isValidCoordinatePair(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude)
    && latitude >= -90
    && latitude <= 90
    && Number.isFinite(longitude)
    && longitude >= -180
    && longitude <= 180;
}

function normalizedZipCode(zipCode?: string): string {
  return (zipCode ?? '').replace(/\D/g, '');
}

export function buildGeocodingAddressKey(input: GeocodingAddressInput): string {
  const normalized = normalizeAddress(input.address);
  const zipCode = normalizedZipCode(input.zipCode);
  return zipCode ? `${normalized.groupKey}|${zipCode}` : normalized.groupKey;
}

export function buildGeocodingQuery(input: GeocodingAddressInput): string {
  const normalized = normalizeAddress(input.address);
  const localityParts = normalized.complement
    .split(/\s*,\s*|\s+-\s+/)
    .map(part => part.trim())
    .filter(Boolean)
    .filter(part => !EXCLUDED_COMPLEMENT.test(part));
  const candidates = [
    normalized.displayAddress,
    ...localityParts,
    input.city?.trim(),
    input.state?.trim(),
    input.zipCode?.trim(),
    input.country?.trim() || 'Brasil',
  ].filter((part): part is string => Boolean(part));
  const seen = new Set<string>();

  return candidates.filter(part => {
    const key = part
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join(', ');
}

export function buildCanonicalNavigationAddress(input: GeocodingAddressInput): string {
  return buildGeocodingQuery(input);
}

export function buildStopGeocodingInput(stop: GroupedStop): GeocodingAddressInput {
  const firstPackage = stop.packages[0];
  return {
    address: firstPackage?.destinationAddress || stop.originalAddress || stop.normalizedAddress,
    zipCode: firstPackage?.zipCode || stop.zipCode,
    city: firstPackage?.city,
    state: firstPackage?.state,
    country: 'Brasil',
  };
}

async function readCollection(storage: GeocodingStorage): Promise<GeocodeCollection> {
  try {
    const raw = await storage.getItem(KEY_GEOCODE_CACHE);
    return raw ? (JSON.parse(raw) as GeocodeCollection) : {};
  } catch {
    return {};
  }
}

export async function loadCachedGeocode(
  input: GeocodingAddressInput,
  storage: GeocodingStorage = AsyncStorage
): Promise<GeocodeCacheEntry | null> {
  const collection = await readCollection(storage);
  const entry = collection[buildGeocodingAddressKey(input)];
  return entry && isValidCoordinatePair(entry.latitude, entry.longitude) ? entry : null;
}

export async function saveCachedGeocode(
  input: GeocodingAddressInput,
  coordinate: GeocodingProviderResult,
  provider: string,
  storage: GeocodingStorage = AsyncStorage
): Promise<GeocodeCacheEntry> {
  if (!isValidCoordinatePair(coordinate.latitude, coordinate.longitude)) {
    throw new Error('Coordenadas inválidas para o cache de geocodificação.');
  }

  const collection = await readCollection(storage);
  const normalizedAddressKey = buildGeocodingAddressKey(input);
  const existing = collection[normalizedAddressKey];
  const now = new Date().toISOString();
  const entry: GeocodeCacheEntry = {
    normalizedAddressKey,
    displayAddress: normalizeAddress(input.address).displayAddress,
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    provider,
    confidence: coordinate.confidence,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  collection[normalizedAddressKey] = entry;
  await storage.setItem(KEY_GEOCODE_CACHE, JSON.stringify(collection));
  return entry;
}

export async function resolveGeocoding(
  input: GeocodingAddressInput,
  provider?: GeocodingProvider | null,
  storage: GeocodingStorage = AsyncStorage
): Promise<GeocodingResolution> {
  const cached = await loadCachedGeocode(input, storage);
  if (cached) return { status: 'cached', entry: cached };
  if (!provider?.isConfigured()) {
    return { status: 'not_configured', message: 'Geocodificação não configurada' };
  }

  const result = await provider.geocode(buildGeocodingQuery(input));
  if (!result || !isValidCoordinatePair(result.latitude, result.longitude)) {
    return { status: 'not_found' };
  }
  const entry = await saveCachedGeocode(input, result, provider.name, storage);
  return { status: 'resolved', entry };
}
