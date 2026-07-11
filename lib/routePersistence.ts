import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RouteData } from '../contexts/RouteContext';
import {
  collectRouteOccurrenceRecords,
  editOccurrenceRecord,
  resolveOccurrenceRecord,
  type OccurrenceRecord,
  type OccurrenceResolution,
} from './occurrenceRecords.ts';

export interface HistoryEntry {
  id: string;
  name: string;
  totalPackages: number;
  totalStops: number;
  deliveredPackages: number;
  completedStops: number;
  distance: number;
  durationMinutes: number;
  completedAt: string;
  occurrences?: OccurrenceRecord[];
}

export interface RouteStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const KEY_CURRENT = 'zerei_current_route';
export const KEY_HISTORY = 'zerei_route_history';
export const KEY_CURRENT_CORRUPTED = 'zerei_current_route_corrupted';
export const ACTIVE_ROUTE_STORAGE_VERSION = 1;

export interface ActiveRouteEnvelope {
  version: typeof ACTIVE_ROUTE_STORAGE_VERSION;
  savedAt: string;
  route: RouteData;
}

export interface ActiveRouteRestoreResult {
  route: RouteData | null;
  savedAt: string | null;
  recovered: boolean;
}

export function getRouteStorage(): RouteStorage {
  return AsyncStorage;
}

async function readJSON<T>(storage: RouteStorage, key: string, fallback: T): Promise<T> {
  try {
    const raw = await storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJSON(storage: RouteStorage, key: string, value: unknown): Promise<void> {
  await storage.setItem(key, JSON.stringify(value));
}

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRouteStatus(value: unknown): value is RouteData['status'] {
  return value === 'planning' || value === 'active' || value === 'completed';
}

function isStopStatus(value: unknown): value is RouteData['stops'][number]['status'] {
  return value === 'pending' || value === 'completed' || value === 'skipped';
}

function isPackageStatus(value: unknown): value is RouteData['stops'][number]['packages'][number]['status'] {
  return value === 'pending' || value === 'delivered' || value === 'skipped';
}

function numberOrFallback(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringOrFallback(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

export function validatePersistedRoute(data: unknown): RouteData | null {
  if (!isObject(data)) return null;
  if (typeof data.id !== 'string' || data.id.trim().length === 0) return null;
  if (!Array.isArray(data.stops)) return null;

  const status = isRouteStatus(data.status) ? data.status : 'planning';
  const stops = data.stops
    .filter(isObject)
    .map((stop, stopIndex) => {
      const rawPackages = Array.isArray(stop.packages) ? stop.packages.filter(isObject) : [];
      const packages = rawPackages.map((pkg, packageIndex) => ({
        ...pkg,
        id: stringOrFallback(pkg.id, `pkg-${stopIndex + 1}-${packageIndex + 1}`),
        trackingNumber: stringOrFallback(pkg.trackingNumber, `PKG-${stopIndex + 1}-${packageIndex + 1}`),
        destinationAddress: stringOrFallback(pkg.destinationAddress, stringOrFallback(stop.normalizedAddress, '')),
        zipCode: stringOrFallback(pkg.zipCode, stringOrFallback(stop.zipCode, '')),
        latitude: typeof pkg.latitude === 'number' ? pkg.latitude : null,
        longitude: typeof pkg.longitude === 'number' ? pkg.longitude : null,
        stopNumber: typeof pkg.stopNumber === 'number' ? pkg.stopNumber : null,
        status: isPackageStatus(pkg.status) ? pkg.status : 'pending',
      }));
      if (packages.length === 0) return null;

      const stopStatus = isStopStatus(stop.status)
        ? stop.status
        : packages.every(pkg => pkg.status === 'delivered' || pkg.status === 'skipped')
          ? 'completed'
          : 'pending';
      const firstPackage = packages[0];
      const addressGroups = Array.isArray(stop.addressGroups) ? stop.addressGroups : [];
      return {
        ...stop,
        id: stringOrFallback(stop.id, `stop-${stopIndex + 1}`),
        stopNumber: numberOrFallback(stop.stopNumber, stopIndex + 1),
        normalizedAddress: stringOrFallback(stop.normalizedAddress, firstPackage.destinationAddress),
        originalAddress: stringOrFallback(stop.originalAddress, firstPackage.destinationAddress),
        zipCode: stringOrFallback(stop.zipCode, firstPackage.zipCode),
        latitude: typeof stop.latitude === 'number' ? stop.latitude : null,
        longitude: typeof stop.longitude === 'number' ? stop.longitude : null,
        packages,
        packageCount: packages.length,
        addressGroups,
        addressCount: numberOrFallback(stop.addressCount, addressGroups.length || 1),
        orderIndex: numberOrFallback(stop.orderIndex, stopIndex),
        status: stopStatus,
        houseNumber: stringOrFallback(stop.houseNumber, ''),
        duplicateAddressWarning: Boolean(stop.duplicateAddressWarning),
      };
    })
    .filter((stop): stop is RouteData['stops'][number] => stop !== null);

  if (stops.length === 0) return null;

  const deliveredPackages = stops.reduce(
    (sum, stop) => sum + stop.packages.filter(pkg => pkg.status === 'delivered').length,
    0
  );
  const completedStops = stops.filter(stop => stop.status === 'completed').length;
  const totalPackages = stops.reduce((sum, stop) => sum + stop.packages.length, 0);

  return {
    ...data,
    id: data.id,
    name: stringOrFallback(data.name, 'Rota atual'),
    stops,
    status,
    estimatedDistanceKm: numberOrFallback(data.estimatedDistanceKm, 0),
    completedStops,
    totalPackages,
    deliveredPackages,
    startTime: typeof data.startTime === 'number' ? data.startTime : null,
    durationMinutes: numberOrFallback(data.durationMinutes, 0),
  };
}

export function recoverPersistedRoute(data: unknown): RouteData | null {
  return validatePersistedRoute(data);
}

async function readActiveRouteEnvelope(
  storage: RouteStorage
): Promise<ActiveRouteRestoreResult> {
  const raw = await storage.getItem(KEY_CURRENT);
  if (!raw) return { route: null, savedAt: null, recovered: false };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    await storage.setItem(KEY_CURRENT_CORRUPTED, raw).catch(() => {});
    return { route: null, savedAt: null, recovered: false };
  }

  if (
    isObject(parsed) &&
    parsed.version === ACTIVE_ROUTE_STORAGE_VERSION &&
    typeof parsed.savedAt === 'string' &&
    'route' in parsed
  ) {
    const route = recoverPersistedRoute(parsed.route);
    if (!route) {
      await storage.setItem(KEY_CURRENT_CORRUPTED, raw).catch(() => {});
      return { route: null, savedAt: parsed.savedAt, recovered: false };
    }
    return { route, savedAt: parsed.savedAt, recovered: true };
  }

  const legacyRoute = recoverPersistedRoute(parsed);
  if (!legacyRoute) {
    await storage.setItem(KEY_CURRENT_CORRUPTED, raw).catch(() => {});
    return { route: null, savedAt: null, recovered: false };
  }
  return { route: legacyRoute, savedAt: null, recovered: true };
}

export async function loadActiveRouteEnvelopeFromStorage(
  storage: RouteStorage
): Promise<ActiveRouteRestoreResult> {
  const restored = await readActiveRouteEnvelope(storage);
  if (restored.route?.status === 'completed') {
    return { ...restored, route: null };
  }
  return restored;
}

export async function saveRouteToStorage(storage: RouteStorage, route: RouteData): Promise<string> {
  const envelope: ActiveRouteEnvelope = {
    version: ACTIVE_ROUTE_STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    route,
  };
  await writeJSON(storage, KEY_CURRENT, envelope);
  return route.id;
}

export async function clearActiveRouteFromStorage(storage: RouteStorage): Promise<void> {
  await storage.removeItem(KEY_CURRENT);
}

export async function loadCurrentRouteFromStorage(storage: RouteStorage): Promise<RouteData | null> {
  const restored = await loadActiveRouteEnvelopeFromStorage(storage);
  return restored.route;
}

export async function loadHistoryFromStorage(storage: RouteStorage): Promise<HistoryEntry[]> {
  return readJSON<HistoryEntry[]>(storage, KEY_HISTORY, []);
}

export async function saveCompletedRouteToHistory(storage: RouteStorage, route: RouteData): Promise<void> {
  const history = await loadHistoryFromStorage(storage);
  const existing = history.find(entry => entry.id === route.id);
  const existingOccurrences = new Map(
    (existing?.occurrences ?? []).map(record => [record.packageId, record])
  );
  const routeOccurrences = collectRouteOccurrenceRecords(route).map(record => {
    const previous = existingOccurrences.get(record.packageId);
    return {
      ...previous,
      ...record,
      reason: record.reason ?? previous?.reason,
      registeredAt: record.registeredAt ?? previous?.registeredAt,
      occurrenceResolution:
        record.occurrenceResolution ?? previous?.occurrenceResolution,
      occurrenceResolvedAt:
        record.occurrenceResolvedAt ?? previous?.occurrenceResolvedAt,
      occurrenceUpdatedAt:
        record.occurrenceUpdatedAt ?? previous?.occurrenceUpdatedAt,
    };
  });
  const entry: HistoryEntry = {
    id: route.id,
    name: existing?.name ?? route.name,
    totalPackages: route.totalPackages,
    totalStops: route.stops.length,
    deliveredPackages: route.deliveredPackages,
    completedStops: route.completedStops,
    distance: route.estimatedDistanceKm,
    durationMinutes: route.durationMinutes,
    completedAt: existing?.completedAt ?? new Date().toISOString(),
    occurrences: routeOccurrences.length > 0
      ? routeOccurrences
      : existing?.occurrences,
  };
  const deduped = history.filter(h => h.id !== entry.id);
  deduped.unshift(entry);
  await writeJSON(storage, KEY_HISTORY, deduped.slice(0, 50));
  await storage.removeItem(KEY_CURRENT);
}

export async function resolveHistoryOccurrenceInStorage(
  storage: RouteStorage,
  routeId: string,
  completedAt: string,
  packageId: string,
  resolution: OccurrenceResolution,
  resolvedAt: string
): Promise<boolean> {
  const history = await loadHistoryFromStorage(storage);
  const routeIndex = history.findIndex(
    entry => entry.id === routeId && entry.completedAt === completedAt
  );
  if (routeIndex === -1) return false;

  const occurrences = history[routeIndex].occurrences;
  if (!occurrences) return false;
  const target = occurrences.find(record => record.packageId === packageId);
  if (!target) return false;
  const newlyDelivered =
    target.occurrenceResolution === undefined && resolution === 'delivered';

  history[routeIndex] = {
    ...history[routeIndex],
    deliveredPackages: newlyDelivered
      ? Math.min(
          history[routeIndex].totalPackages,
          history[routeIndex].deliveredPackages + 1
        )
      : history[routeIndex].deliveredPackages,
    occurrences: occurrences.map(record =>
      record.packageId === packageId
        ? resolveOccurrenceRecord(record, resolution, resolvedAt)
        : record
    ),
  };
  await writeJSON(storage, KEY_HISTORY, history);
  return true;
}

export async function editHistoryOccurrenceInStorage(
  storage: RouteStorage,
  routeId: string,
  completedAt: string,
  packageId: string,
  reason: string,
  resolution?: OccurrenceResolution,
  updatedAt = new Date().toISOString()
): Promise<boolean> {
  const history = await loadHistoryFromStorage(storage);
  const routeIndex = history.findIndex(
    entry => entry.id === routeId && entry.completedAt === completedAt
  );
  if (routeIndex === -1) return false;

  const occurrences = history[routeIndex].occurrences;
  if (!occurrences) return false;
  const target = occurrences.find(record => record.packageId === packageId);
  if (!target) return false;

  const edited = editOccurrenceRecord(target, reason, resolution, updatedAt);
  const deliveredDelta =
    Number(edited.occurrenceResolution === 'delivered') -
    Number(target.occurrenceResolution === 'delivered');
  history[routeIndex] = {
    ...history[routeIndex],
    deliveredPackages: Math.max(
      0,
      Math.min(
        history[routeIndex].totalPackages,
        history[routeIndex].deliveredPackages + deliveredDelta
      )
    ),
    occurrences: occurrences.map(record =>
      record.packageId === packageId ? edited : record
    ),
  };
  await writeJSON(storage, KEY_HISTORY, history);
  return true;
}

export async function deleteHistoryOccurrenceInStorage(
  storage: RouteStorage,
  routeId: string,
  completedAt: string,
  packageId: string
): Promise<boolean> {
  const history = await loadHistoryFromStorage(storage);
  const routeIndex = history.findIndex(
    entry => entry.id === routeId && entry.completedAt === completedAt
  );
  if (routeIndex === -1) return false;

  const occurrences = history[routeIndex].occurrences;
  if (!occurrences) return false;
  const nextOccurrences = occurrences.filter(record => record.packageId !== packageId);
  if (nextOccurrences.length === occurrences.length) return false;

  history[routeIndex] = {
    ...history[routeIndex],
    occurrences: nextOccurrences.length > 0 ? nextOccurrences : undefined,
  };
  await writeJSON(storage, KEY_HISTORY, history);
  return true;
}

export async function renameRouteInStorage(
  storage: RouteStorage,
  id: string,
  name: string,
  completedAt?: string
): Promise<boolean> {
  if (completedAt !== undefined) {
    const history = await loadHistoryFromStorage(storage);
    const idx = history.findIndex(entry =>
      entry.id === id && entry.completedAt === completedAt
    );
    if (idx === -1) return false;
    history[idx] = {
      ...history[idx],
      name,
      occurrences: history[idx].occurrences?.map(record => ({ ...record, routeName: name })),
    };
    await writeJSON(storage, KEY_HISTORY, history);
    return true;
  }

  const current = (await loadActiveRouteEnvelopeFromStorage(storage)).route;
  if (current && current.id === id) {
    await saveRouteToStorage(storage, { ...current, name });
    return true;
  }
  const history = await loadHistoryFromStorage(storage);
  const idx = history.findIndex(entry => entry.id === id);
  if (idx === -1) return false;
  history[idx] = {
    ...history[idx],
    name,
    occurrences: history[idx].occurrences?.map(record => ({ ...record, routeName: name })),
  };
  await writeJSON(storage, KEY_HISTORY, history);
  return true;
}

export async function deleteRouteFromStorage(storage: RouteStorage, id: string): Promise<boolean> {
  const current = (await loadActiveRouteEnvelopeFromStorage(storage)).route;
  if (current && current.id === id) {
    await storage.removeItem(KEY_CURRENT);
    return true;
  }
  const history = await loadHistoryFromStorage(storage);
  const next = history.filter(entry => entry.id !== id);
  if (next.length === history.length) return false;
  await writeJSON(storage, KEY_HISTORY, next);
  return true;
}
