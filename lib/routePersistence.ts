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
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class MemoryRouteStorage implements RouteStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const memoryStorage = new MemoryRouteStorage();

export const KEY_CURRENT = 'zerei_current_route';
export const KEY_HISTORY = 'zerei_route_history';

export function getRouteStorage(): RouteStorage {
  const storage = globalThis.localStorage;
  return storage ?? memoryStorage;
}

function readJSON<T>(storage: RouteStorage, key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(storage: RouteStorage, key: string, value: unknown): void {
  storage.setItem(key, JSON.stringify(value));
}

export function saveRouteToStorage(storage: RouteStorage, route: RouteData): string {
  writeJSON(storage, KEY_CURRENT, route);
  return route.id;
}

export function loadCurrentRouteFromStorage(storage: RouteStorage): RouteData | null {
  const route = readJSON<RouteData | null>(storage, KEY_CURRENT, null);
  return route && route.status !== 'completed' ? route : null;
}

export function loadHistoryFromStorage(storage: RouteStorage): HistoryEntry[] {
  return readJSON<HistoryEntry[]>(storage, KEY_HISTORY, []);
}

export function saveCompletedRouteToHistory(storage: RouteStorage, route: RouteData): void {
  const history = loadHistoryFromStorage(storage);
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
  history.unshift(entry);
  writeJSON(storage, KEY_HISTORY, history.slice(0, 50));
  storage.removeItem(KEY_CURRENT);
}

export function renameRouteInStorage(storage: RouteStorage, id: string, name: string): boolean {
  const current = readJSON<RouteData | null>(storage, KEY_CURRENT, null);
  if (current && current.id === id) {
    writeJSON(storage, KEY_CURRENT, { ...current, name });
    return true;
  }
  const history = loadHistoryFromStorage(storage);
  const idx = history.findIndex(entry => entry.id === id);
  if (idx === -1) return false;
  history[idx] = { ...history[idx], name };
  writeJSON(storage, KEY_HISTORY, history);
  return true;
}

export function deleteRouteFromStorage(storage: RouteStorage, id: string): boolean {
  const current = readJSON<RouteData | null>(storage, KEY_CURRENT, null);
  if (current && current.id === id) {
    storage.removeItem(KEY_CURRENT);
    return true;
  }
  const history = loadHistoryFromStorage(storage);
  const next = history.filter(entry => entry.id !== id);
  if (next.length === history.length) return false;
  writeJSON(storage, KEY_HISTORY, next);
  return true;
}
