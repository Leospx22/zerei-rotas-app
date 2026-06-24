import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RouteData } from '../contexts/RouteContext';

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
}

export interface RouteStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const KEY_CURRENT = 'zerei_current_route';
export const KEY_HISTORY = 'zerei_route_history';

function traceRouteStorage(event: string, details: Record<string, unknown>): void {
  console.log(`[ZEREI RENAME TRACE][routePersistence.${event}]`, {
    ...details,
    stack: new Error().stack,
  });
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
  const json = JSON.stringify(value);
  traceRouteStorage('writeJSON.before', {
    key,
    jsonWritten: json,
  });
  await storage.setItem(key, json);
  const readBack = await storage.getItem(key);
  traceRouteStorage('writeJSON.afterReadBack', {
    key,
    readBack,
  });
}

export async function saveRouteToStorage(storage: RouteStorage, route: RouteData): Promise<string> {
  traceRouteStorage('saveRouteToStorage.called', {
    key: KEY_CURRENT,
    routeId: route.id,
    routeName: route.name,
    routeStatus: route.status,
  });
  await writeJSON(storage, KEY_CURRENT, route);
  return route.id;
}

export async function loadCurrentRouteFromStorage(storage: RouteStorage): Promise<RouteData | null> {
  const route = await readJSON<RouteData | null>(storage, KEY_CURRENT, null);
  traceRouteStorage('loadCurrentRouteFromStorage.result', {
    key: KEY_CURRENT,
    routeId: route?.id ?? null,
    routeName: route?.name ?? null,
    routeStatus: route?.status ?? null,
  });
  return route && route.status !== 'completed' ? route : null;
}

export async function loadHistoryFromStorage(storage: RouteStorage): Promise<HistoryEntry[]> {
  return readJSON<HistoryEntry[]>(storage, KEY_HISTORY, []);
}

export async function saveCompletedRouteToHistory(storage: RouteStorage, route: RouteData): Promise<void> {
  const history = await loadHistoryFromStorage(storage);
  const entry: HistoryEntry = {
    id: route.id,
    name: route.name,
    totalPackages: route.totalPackages,
    totalStops: route.stops.length,
    deliveredPackages: route.deliveredPackages,
    completedStops: route.completedStops,
    distance: route.estimatedDistanceKm,
    durationMinutes: route.durationMinutes,
    completedAt: new Date().toISOString(),
  };
  const deduped = history.filter(h => h.id !== entry.id);
  deduped.unshift(entry);
  await writeJSON(storage, KEY_HISTORY, deduped.slice(0, 50));
  await storage.removeItem(KEY_CURRENT);
}

export async function renameRouteInStorage(storage: RouteStorage, id: string, name: string): Promise<boolean> {
  const current = await readJSON<RouteData | null>(storage, KEY_CURRENT, null);
  traceRouteStorage('renameRouteInStorage.before', {
    key: KEY_CURRENT,
    routeId: id,
    titleBeforeRename: current?.id === id ? current.name : null,
    newTitlePassedToRenameRoute: name,
    currentRouteId: current?.id ?? null,
    currentRouteName: current?.name ?? null,
  });
  if (current && current.id === id) {
    await writeJSON(storage, KEY_CURRENT, { ...current, name });
    traceRouteStorage('renameRouteInStorage.afterCurrentRename', {
      key: KEY_CURRENT,
      routeId: id,
      newTitlePassedToRenameRoute: name,
      readBack: await storage.getItem(KEY_CURRENT),
    });
    return true;
  }
  const history = await loadHistoryFromStorage(storage);
  const idx = history.findIndex(entry => entry.id === id);
  if (idx === -1) return false;
  history[idx] = { ...history[idx], name };
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
