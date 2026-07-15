import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { AppState } from 'react-native';
import {
  GroupedStop,
  PackageItem,
  ImportSummary,
  calculateImportSummary,
} from '@/lib/packageUtils';
import { usePersistence } from '@/hooks/usePersistence';
import type { HistoryEntry } from '@/lib/routePersistence';
import {
  applyPackageOccurrenceToStops,
  deletePackageOccurrenceInStops,
  editPackageOccurrenceInStops,
  resolvePackageOccurrenceInStops,
  type OccurrenceResolution,
} from '@/lib/occurrenceRecords';

export interface RouteData {
  id: string;
  name: string;
  stops: GroupedStop[];
  status: 'planning' | 'active' | 'completed';
  estimatedDistanceKm: number;
  completedStops: number;
  totalPackages: number;
  deliveredPackages: number;
  startTime: number | null;
  durationMinutes: number;
}

interface RouteContextType {
  currentRoute: RouteData | null;
  isLoading: boolean;
  persistenceError: string | null;
  routeHistory: HistoryEntry[];
  restoreNotice: string | null;
  // Compatibility lookup for occurrence reasons also persisted on PackageItem.
  occurrences: Record<string, string>;
  setCurrentRoute: (route: RouteData | null) => void;
  clearRestoreNotice: () => void;
  reloadHistory: () => Promise<void>;
  renameCurrentRoute: (name: string) => Promise<boolean>;
  updateStopStatus: (stopId: string, status: GroupedStop['status']) => void;
  updatePackageStatus: (stopId: string, packageId: string, status: PackageItem['status']) => void;
  updatePackagesStatus: (stopId: string, packageIds: readonly string[], status: PackageItem['status']) => void;
  // Persists occurrence reason and the existing skipped status convention.
  updatePackageOccurrence: (stopId: string, packageId: string, reason: string) => void;
  resolvePackageOccurrence: (packageId: string, resolution: OccurrenceResolution) => void;
  editPackageOccurrence: (
    packageId: string,
    reason: string,
    resolution?: OccurrenceResolution
  ) => void;
  deletePackageOccurrence: (packageId: string) => void;
  removeDuplicates: () => void;
  reorderStops: () => void;
  getSummary: () => ImportSummary;
  loadPersistedRoute: () => Promise<void>;
  saveCurrentRoute: () => Promise<void>;
  markCompletedAndSave: () => Promise<void>;
}

const RouteContext = createContext<RouteContextType | undefined>(undefined);

function checkCompletion(route: RouteData): RouteData {
  const allDone = route.stops.every(
    s => s.status === 'completed' || s.status === 'skipped'
  );
  if (!allDone) return route;
  const elapsed = route.startTime
    ? Math.round((Date.now() - route.startTime) / 60000)
    : 0;
  return { ...route, status: 'completed', durationMinutes: elapsed };
}

export function RouteProvider({ children }: { children: ReactNode }) {
  const [currentRoute, setCurrentRouteState] = useState<RouteData | null>(null);
  const [routeHistory, setRouteHistory] = useState<HistoryEntry[]>([]);
  const [restoreNotice, setRestoreNotice] = useState<string | null>(null);
  // Immediate UI lookup; PackageItem remains the persisted source.
  const [occurrences, setOccurrences] = useState<Record<string, string>>({});
  const {
    isLoading,
    error: persistenceError,
    saveRoute,
    loadCurrentRoute,
    clearCurrentRoute,
    saveToHistory,
    getHistory,
  } = usePersistence();
  const currentRouteRef = useRef<RouteData | null>(null);
  const restoreNoticeShownRef = useRef(false);
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    currentRouteRef.current = currentRoute;
  }, [currentRoute]);

  const reloadHistory = useCallback(async () => {
    const history = await getHistory();
    setRouteHistory(prev =>
      JSON.stringify(prev) === JSON.stringify(history) ? prev : history
    );
  }, [getHistory]);

  // Load persisted route on mount
  useEffect(() => {
    let mounted = true;
    const loadRoute = async () => {
      const route = await loadCurrentRoute();
      if (mounted && route) {
        setCurrentRouteState(route);
        if (route.status === 'active' && !restoreNoticeShownRef.current) {
          restoreNoticeShownRef.current = true;
          setRestoreNotice('Rota restaurada. Você pode continuar a entrega.');
        }
      }
    };
    loadRoute().catch(() => {});
    reloadHistory().catch(() => {});
    return () => { mounted = false; };
  }, [loadCurrentRoute, reloadHistory]);

  const enqueuePersistence = useCallback((task: () => Promise<unknown>) => {
    setTimeout(() => {
      persistQueueRef.current = persistQueueRef.current
        .then(() => task())
        .then(() => undefined)
        .catch(() => undefined);
    }, 0);
  }, []);

  const persistActiveRouteSnapshot = useCallback((route: RouteData | null) => {
    if (!route) {
      enqueuePersistence(clearCurrentRoute);
      return;
    }
    if (route.status === 'completed') return;
    enqueuePersistence(() => saveRoute(route));
  }, [clearCurrentRoute, enqueuePersistence, saveRoute]);

  const commitRouteUpdate = useCallback((
    updater: (route: RouteData) => RouteData | null
  ) => {
    setCurrentRouteState(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      persistActiveRouteSnapshot(next);
      return next;
    });
  }, [persistActiveRouteSnapshot]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'inactive' || nextState === 'background') {
        const route = currentRouteRef.current;
        if (route && route.status !== 'completed') {
          saveRoute(route).catch(() => {});
        }
      }

      if (nextState === 'active') {
        loadCurrentRoute()
          .then(route => {
            if (!route) return;
            const current = currentRouteRef.current;
            if (current?.status === 'completed') return;
            if (!current) {
              setCurrentRouteState(route);
            }
          })
          .catch(() => {});
      }
    });

    return () => subscription.remove();
  }, [loadCurrentRoute, saveRoute]);

  // Save to history when route auto-completes via checkCompletion
  useEffect(() => {
    if (currentRoute?.status === 'completed') {
      saveToHistory(currentRoute)
        .then(() => reloadHistory())
        .catch(() => {});
    }
  }, [currentRoute?.status, currentRoute, saveToHistory, reloadHistory]);

  const setCurrentRoute = useCallback((route: RouteData | null) => {
    setCurrentRouteState(route);
    persistActiveRouteSnapshot(route);
  }, [persistActiveRouteSnapshot]);

  const clearRestoreNotice = useCallback(() => {
    setRestoreNotice(null);
  }, []);

  const renameCurrentRoute = useCallback(async (name: string): Promise<boolean> => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    const route = currentRoute ?? await loadCurrentRoute();
    if (!route) return false;

    const updatedRoute = { ...route, name: trimmed };
    setCurrentRouteState(updatedRoute);
    const savedId = await saveRoute(updatedRoute);
    return savedId !== null;
  }, [currentRoute, loadCurrentRoute, saveRoute]);

  const updateStopStatus = useCallback((stopId: string, status: GroupedStop['status']) => {
    commitRouteUpdate(prev => {
      const stops = prev.stops.map(s => {
        if (s.id !== stopId) return s;
        const packages = s.packages.map(p => ({
          ...p,
          status: status === 'completed' ? 'delivered' as const : status === 'skipped' ? 'skipped' as const : p.status,
        }));
        return { ...s, status, packages };
      });
      const completedStops = stops.filter(s => s.status === 'completed').length;
      const deliveredPackages = stops.reduce(
        (sum, s) => sum + s.packages.filter(p => p.status === 'delivered').length, 0
      );
      const updated = { ...prev, stops, completedStops, deliveredPackages };
      return checkCompletion(updated);
    });
  }, [commitRouteUpdate]);

  const updatePackageStatus = useCallback((stopId: string, packageId: string, status: PackageItem['status']) => {
    commitRouteUpdate(prev => {
      const stops = prev.stops.map(s => {
        if (s.id !== stopId) return s;
        const packages = s.packages.map(p => p.id === packageId ? { ...p, status } : p);
        const allDelivered = packages.every(p => p.status === 'delivered' || p.status === 'skipped');
        const stopStatus = allDelivered ? 'completed' as const : 'pending' as const;
        return { ...s, packages, status: stopStatus, packageCount: packages.length };
      });
      const completedStops = stops.filter(s => s.status === 'completed').length;
      const deliveredPackages = stops.reduce(
        (sum, s) => sum + s.packages.filter(p => p.status === 'delivered').length, 0
      );
      const updated = { ...prev, stops, completedStops, deliveredPackages };
      return checkCompletion(updated);
    });
  }, [commitRouteUpdate]);

  const updatePackagesStatus = useCallback((
    stopId: string,
    packageIds: readonly string[],
    status: PackageItem['status']
  ) => {
    if (packageIds.length === 0) return;
    const targetPackageIds = new Set(packageIds);
    commitRouteUpdate(prev => {
      const stops = prev.stops.map(s => {
        if (s.id !== stopId) return s;
        const packages = s.packages.map(p =>
          targetPackageIds.has(p.id) ? { ...p, status } : p
        );
        const allDelivered = packages.every(p => p.status === 'delivered' || p.status === 'skipped');
        const stopStatus = allDelivered ? 'completed' as const : 'pending' as const;
        return { ...s, packages, status: stopStatus, packageCount: packages.length };
      });
      const completedStops = stops.filter(s => s.status === 'completed').length;
      const deliveredPackages = stops.reduce(
        (sum, s) => sum + s.packages.filter(p => p.status === 'delivered').length, 0
      );
      const updated = { ...prev, stops, completedStops, deliveredPackages };
      return checkCompletion(updated);
    });
  }, [commitRouteUpdate]);

  // Persist occurrence metadata in the route while retaining the UI lookup map.
  const updatePackageOccurrence = useCallback((stopId: string, packageId: string, reason: string) => {
    const registeredAt = new Date().toISOString();
    setOccurrences(prev => ({ ...prev, [packageId]: reason }));
    commitRouteUpdate(prev => {
      const stops = applyPackageOccurrenceToStops(
        prev.stops,
        stopId,
        packageId,
        reason,
        registeredAt
      );
      const completedStops = stops.filter(stop => stop.status === 'completed').length;
      const deliveredPackages = stops.reduce(
        (sum, stop) =>
          sum + stop.packages.filter(packageItem => packageItem.status === 'delivered').length,
        0
      );
      return checkCompletion({ ...prev, stops, completedStops, deliveredPackages });
    });
  }, [commitRouteUpdate]);

  const resolvePackageOccurrence = useCallback((
    packageId: string,
    resolution: OccurrenceResolution
  ) => {
    const resolvedAt = new Date().toISOString();
    commitRouteUpdate(prev => {
      const stops = resolvePackageOccurrenceInStops(
        prev.stops,
        packageId,
        resolution,
        resolvedAt
      );
      const completedStops = stops.filter(stop => stop.status === 'completed').length;
      const deliveredPackages = stops.reduce(
        (sum, stop) =>
          sum + stop.packages.filter(packageItem => packageItem.status === 'delivered').length,
        0
      );
      return checkCompletion({ ...prev, stops, completedStops, deliveredPackages });
    });
  }, [commitRouteUpdate]);

  const editPackageOccurrence = useCallback((
    packageId: string,
    reason: string,
    resolution?: OccurrenceResolution
  ) => {
    const updatedAt = new Date().toISOString();
    setOccurrences(prev => ({ ...prev, [packageId]: reason }));
    commitRouteUpdate(prev => {
      const stops = editPackageOccurrenceInStops(
        prev.stops,
        packageId,
        reason,
        resolution,
        updatedAt
      );
      const completedStops = stops.filter(stop => stop.status === 'completed').length;
      const deliveredPackages = stops.reduce(
        (sum, stop) =>
          sum + stop.packages.filter(packageItem => packageItem.status === 'delivered').length,
        0
      );
      return checkCompletion({ ...prev, stops, completedStops, deliveredPackages });
    });
  }, [commitRouteUpdate]);

  const deletePackageOccurrence = useCallback((packageId: string) => {
    setOccurrences(prev => {
      const next = { ...prev };
      delete next[packageId];
      return next;
    });
    commitRouteUpdate(prev => {
      const stops = deletePackageOccurrenceInStops(prev.stops, packageId);
      const completedStops = stops.filter(stop => stop.status === 'completed').length;
      const deliveredPackages = stops.reduce(
        (sum, stop) =>
          sum + stop.packages.filter(packageItem => packageItem.status === 'delivered').length,
        0
      );
      return checkCompletion({ ...prev, stops, completedStops, deliveredPackages });
    });
  }, [commitRouteUpdate]);

  const removeDuplicates = useCallback(() => {
    commitRouteUpdate(prev => {
      const seen = new Set<string>();
      const unique = prev.stops.filter(s => {
        const key = s.normalizedAddress.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const reindexed = unique.map((s, i) => ({ ...s, orderIndex: i }));
      return { ...prev, stops: reindexed };
    });
  }, [commitRouteUpdate]);

  const reorderStops = useCallback(() => {
    commitRouteUpdate(prev => {
      const pending = prev.stops.filter(s => s.status === 'pending');
      const completed = prev.stops.filter(s => s.status === 'completed');
      const skipped = prev.stops.filter(s => s.status === 'skipped');
      const reordered = [...completed, ...pending, ...skipped];
      const reindexed = reordered.map((s, i) => ({ ...s, orderIndex: i }));
      return { ...prev, stops: reindexed };
    });
  }, [commitRouteUpdate]);

  const getSummary = useCallback((): ImportSummary => {
    return calculateImportSummary(currentRoute?.stops ?? []);
  }, [currentRoute]);

  const loadPersistedRoute = useCallback(async () => {
    const route = await loadCurrentRoute();
    if (route) setCurrentRouteState(route);
  }, [loadCurrentRoute]);

  const saveCurrentRoute = useCallback(async () => {
    if (currentRoute) {
      await saveRoute(currentRoute);
    }
  }, [currentRoute, saveRoute]);

  const markCompletedAndSave = useCallback(async () => {
    if (!currentRoute) return;
    const elapsed = currentRoute.startTime
      ? Math.round((Date.now() - currentRoute.startTime) / 60000)
      : 0;
    const completedRoute = { ...currentRoute, status: 'completed' as const, durationMinutes: elapsed };
    const saved = await saveToHistory(completedRoute);
    if (!saved) return;
    setCurrentRouteState(completedRoute);
    await reloadHistory();
  }, [currentRoute, saveToHistory, reloadHistory]);

  return (
    <RouteContext.Provider value={{
      currentRoute,
      isLoading,
      persistenceError,
      routeHistory,
      restoreNotice,
      occurrences,
      setCurrentRoute,
      clearRestoreNotice,
      reloadHistory,
      renameCurrentRoute,
      updateStopStatus,
      updatePackageStatus,
      updatePackagesStatus,
      updatePackageOccurrence,
      resolvePackageOccurrence,
      editPackageOccurrence,
      deletePackageOccurrence,
      removeDuplicates,
      reorderStops,
      getSummary,
      loadPersistedRoute,
      saveCurrentRoute,
      markCompletedAndSave,
    }}>
      {children}
    </RouteContext.Provider>
  );
}

export function useRoute() {
  const context = useContext(RouteContext);
  if (!context) throw new Error('useRoute must be used within RouteProvider');
  return context;
}
