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

export async function saveRouteToStorage(storage: RouteStorage, route: RouteData): Promise<string> {
  await writeJSON(storage, KEY_CURRENT, route);
  return route.id;
}

export async function loadCurrentRouteFromStorage(storage: RouteStorage): Promise<RouteData | null> {
  const route = await readJSON<RouteData | null>(storage, KEY_CURRENT, null);
  return route && route.status !== 'completed' ? route : null;
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

  const current = await readJSON<RouteData | null>(storage, KEY_CURRENT, null);
  if (current && current.id === id) {
    await writeJSON(storage, KEY_CURRENT, { ...current, name });
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
  const current = await readJSON<RouteData | null>(storage, KEY_CURRENT, null);
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
