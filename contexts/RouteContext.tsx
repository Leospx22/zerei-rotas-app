import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import {
  GroupedStop,
  PackageItem,
  ImportSummary,
  calculateImportSummary,
} from '@/lib/packageUtils';
import { usePersistence } from '@/hooks/usePersistence';

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
  // packageId → occurrence reason (UI-only state, no business logic)
  occurrences: Record<string, string>;
  setCurrentRoute: (route: RouteData | null) => void;
  updateRouteName: (routeId: string, name: string) => void;
  updateStopStatus: (stopId: string, status: GroupedStop['status']) => void;
  updatePackageStatus: (stopId: string, packageId: string, status: PackageItem['status']) => void;
  // Sets occurrence reason and delegates status change to existing updatePackageStatus
  updatePackageOccurrence: (stopId: string, packageId: string, reason: string) => void;
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
  // UI-only map: packageId → occurrence reason string
  const [occurrences, setOccurrences] = useState<Record<string, string>>({});
  const { isLoading, error: persistenceError, saveRoute, loadCurrentRoute, saveToHistory } = usePersistence();

  // Load persisted route on mount
  useEffect(() => {
    let mounted = true;
    const loadRoute = async () => {
      const route = await loadCurrentRoute();
      if (mounted && route) {
        setCurrentRouteState(route);
      }
    };
    loadRoute().catch(() => {});
    return () => { mounted = false; };
  }, [loadCurrentRoute]);

  // Auto-save on state changes (debounced)
  useEffect(() => {
    if (!currentRoute) return;
    const timer = setTimeout(() => {
      saveRoute(currentRoute).catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [currentRoute, saveRoute]);

  // Save to history when route auto-completes via checkCompletion
  useEffect(() => {
    if (currentRoute?.status === 'completed') {
      saveToHistory(currentRoute).catch(() => {});
    }
  }, [currentRoute?.status]);

  const setCurrentRoute = useCallback((route: RouteData | null) => {
    setCurrentRouteState(route);
    if (route) {
      saveRoute(route).catch(() => {});
    }
  }, [saveRoute]);

  const updateRouteName = useCallback((routeId: string, name: string) => {
    setCurrentRouteState(prev => {
      if (!prev || prev.id !== routeId) return prev;
      const updated = { ...prev, name };
      saveRoute(updated).catch(() => {});
      return updated;
    });
  }, [saveRoute]);

  const updateStopStatus = useCallback((stopId: string, status: GroupedStop['status']) => {
    setCurrentRouteState(prev => {
      if (!prev) return prev;
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
  }, []);

  const updatePackageStatus = useCallback((stopId: string, packageId: string, status: PackageItem['status']) => {
    setCurrentRouteState(prev => {
      if (!prev) return prev;
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
  }, []);

  // UI wrapper: stores the occurrence reason then delegates to existing updatePackageStatus
  const updatePackageOccurrence = useCallback((stopId: string, packageId: string, reason: string) => {
    setOccurrences(prev => ({ ...prev, [packageId]: reason }));
    updatePackageStatus(stopId, packageId, 'skipped');
  }, [updatePackageStatus]);

  const removeDuplicates = useCallback(() => {
    setCurrentRouteState(prev => {
      if (!prev) return prev;
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
  }, []);

  const reorderStops = useCallback(() => {
    setCurrentRouteState(prev => {
      if (!prev) return prev;
      const pending = prev.stops.filter(s => s.status === 'pending');
      const completed = prev.stops.filter(s => s.status === 'completed');
      const skipped = prev.stops.filter(s => s.status === 'skipped');
      const reordered = [...completed, ...pending, ...skipped];
      const reindexed = reordered.map((s, i) => ({ ...s, orderIndex: i }));
      return { ...prev, stops: reindexed };
    });
  }, []);

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
    await saveRoute(completedRoute);
    await saveToHistory(completedRoute);
    setCurrentRouteState(completedRoute);
  }, [currentRoute, saveRoute, saveToHistory]);

  return (
    <RouteContext.Provider value={{
      currentRoute,
      isLoading,
      persistenceError,
      occurrences,
      setCurrentRoute,
      updateRouteName,
      updateStopStatus,
      updatePackageStatus,
      updatePackageOccurrence,
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
