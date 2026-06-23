import { useCallback, useState } from 'react';
import { RouteData } from '@/contexts/RouteContext';
import {
  deleteRouteFromStorage,
  getRouteStorage,
  KEY_CURRENT,
  loadCurrentRouteFromStorage,
  loadHistoryFromStorage,
  renameRouteInStorage,
  saveCompletedRouteToHistory,
  saveRouteToStorage,
} from '@/lib/routePersistence';

export type { HistoryEntry } from '@/lib/routePersistence';

function describeStorage(storage: Storage | { constructor?: { name?: string } }): string {
  if (typeof globalThis.localStorage !== 'undefined' && storage === globalThis.localStorage) {
    return 'globalThis.localStorage';
  }
  return storage.constructor?.name ?? 'unknown storage';
}

export function usePersistence() {
  const [isLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const storage = getRouteStorage();

  const saveRoute = useCallback(async (route: RouteData): Promise<string | null> => {
    try {
      const jsonWritten = JSON.stringify(route);
      console.log('[ZEREI TRACE][saveRoute] before write', {
        storageImplementation: describeStorage(storage),
        storageKey: KEY_CURRENT,
        jsonWritten,
      });
      const savedId = saveRouteToStorage(storage, route);
      console.log('[ZEREI TRACE][saveRoute] after write readback', {
        storageImplementation: describeStorage(storage),
        storageKey: KEY_CURRENT,
        readBack: storage.getItem(KEY_CURRENT),
      });
      return savedId;
    } catch (err: any) {
      console.log('[ZEREI TRACE][saveRoute] write failed', {
        storageImplementation: describeStorage(storage),
        storageKey: KEY_CURRENT,
        error: err?.message ?? err,
      });
      setError(err.message ?? 'Erro ao salvar rota');
      return null;
    }
  }, [storage]);

  const loadCurrentRoute = useCallback(async (): Promise<RouteData | null> => {
    try {
      return loadCurrentRouteFromStorage(storage);
    } catch (err: any) {
      setError(err.message ?? 'Erro ao carregar rota');
      return null;
    }
  }, [storage]);

  const saveToHistory = useCallback(async (route: RouteData): Promise<boolean> => {
    try {
      saveCompletedRouteToHistory(storage, route);
      return true;
    } catch (err: any) {
      setError(err.message ?? 'Erro ao salvar histórico');
      return false;
    }
  }, [storage]);

  const getHistory = useCallback(async () => loadHistoryFromStorage(storage), [storage]);

  const renameRoute = useCallback(async (id: string, name: string): Promise<boolean> => {
    try {
      return renameRouteInStorage(storage, id, name);
    } catch {
      return false;
    }
  }, [storage]);

  const deleteRoute = useCallback(async (id: string): Promise<boolean> => {
    try {
      return deleteRouteFromStorage(storage, id);
    } catch {
      return false;
    }
  }, [storage]);

  return {
    isLoading,
    error,
    saveRoute,
    loadCurrentRoute,
    saveToHistory,
    getHistory,
    renameRoute,
    deleteRoute,
  };
}
