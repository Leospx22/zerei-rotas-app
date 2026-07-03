import { useCallback, useState } from 'react';
import { RouteData } from '@/contexts/RouteContext';
import {
  deleteRouteFromStorage,
  deleteHistoryOccurrenceInStorage,
  editHistoryOccurrenceInStorage,
  getRouteStorage,
  loadCurrentRouteFromStorage,
  loadHistoryFromStorage,
  renameRouteInStorage,
  resolveHistoryOccurrenceInStorage,
  saveCompletedRouteToHistory,
  saveRouteToStorage,
} from '@/lib/routePersistence';
import type { OccurrenceResolution } from '@/lib/occurrenceRecords';
export type { HistoryEntry } from '@/lib/routePersistence';

export function usePersistence() {
  const [isLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const storage = getRouteStorage();

  const saveRoute = useCallback(async (route: RouteData): Promise<string | null> => {
    try {
      const savedId = await saveRouteToStorage(storage, route);
      return savedId;
    } catch (err: any) {
      setError(err.message ?? 'Erro ao salvar rota');
      return null;
    }
  }, [storage]);

  const loadCurrentRoute = useCallback(async (): Promise<RouteData | null> => {
    try {
      return await loadCurrentRouteFromStorage(storage);
    } catch (err: any) {
      setError(err.message ?? 'Erro ao carregar rota');
      return null;
    }
  }, [storage]);

  const saveToHistory = useCallback(async (route: RouteData): Promise<boolean> => {
    try {
      await saveCompletedRouteToHistory(storage, route);
      return true;
    } catch (err: any) {
      setError(err.message ?? 'Erro ao salvar histórico');
      return false;
    }
  }, [storage]);

  const getHistory = useCallback(async () => loadHistoryFromStorage(storage), [storage]);

  const renameRoute = useCallback(async (id: string, name: string, completedAt?: string): Promise<boolean> => {
    try {
      return await renameRouteInStorage(storage, id, name, completedAt);
    } catch {
      return false;
    }
  }, [storage]);

  const deleteRoute = useCallback(async (id: string): Promise<boolean> => {
    try {
      return await deleteRouteFromStorage(storage, id);
    } catch {
      return false;
    }
  }, [storage]);

  const resolveHistoryOccurrence = useCallback(async (
    routeId: string,
    completedAt: string,
    packageId: string,
    resolution: OccurrenceResolution
  ): Promise<boolean> => {
    try {
      return await resolveHistoryOccurrenceInStorage(
        storage,
        routeId,
        completedAt,
        packageId,
        resolution,
        new Date().toISOString()
      );
    } catch {
      return false;
    }
  }, [storage]);

  const editHistoryOccurrence = useCallback(async (
    routeId: string,
    completedAt: string,
    packageId: string,
    reason: string,
    resolution?: OccurrenceResolution
  ): Promise<boolean> => {
    try {
      return await editHistoryOccurrenceInStorage(
        storage,
        routeId,
        completedAt,
        packageId,
        reason,
        resolution,
        new Date().toISOString()
      );
    } catch {
      return false;
    }
  }, [storage]);

  const deleteHistoryOccurrence = useCallback(async (
    routeId: string,
    completedAt: string,
    packageId: string
  ): Promise<boolean> => {
    try {
      return await deleteHistoryOccurrenceInStorage(
        storage,
        routeId,
        completedAt,
        packageId
      );
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
    resolveHistoryOccurrence,
    editHistoryOccurrence,
    deleteHistoryOccurrence,
  };
}
