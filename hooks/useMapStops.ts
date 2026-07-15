import { useEffect, useMemo, useState } from 'react';
import type { RouteData } from '@/contexts/RouteContext';
import { buildStopGeocodingInput, resolveGeocoding } from '@/lib/geocoding';
import { applyRecoveredMapCoordinates, buildMapStops } from '@/lib/mapOverview';

export function useMapStops(route: RouteData | null) {
  const baseMapStops = useMemo(() => route ? buildMapStops(route) : [], [route]);
  const routeStopsById = useMemo(
    () => new Map((route?.stops ?? []).map(stop => [stop.id, stop])),
    [route?.stops]
  );
  const [cachedCoordinates, setCachedCoordinates] = useState<
    Record<string, { latitude: number; longitude: number }>
  >({});

  useEffect(() => {
    let mounted = true;
    const recoverCoordinates = async () => {
      if (!route) {
        if (mounted) setCachedCoordinates({});
        return;
      }
      const unresolvedStops = baseMapStops.filter(
        stop => stop.latitude === null || stop.longitude === null
      );
      const recoveredEntries = await Promise.all(unresolvedStops.map(async mapStop => {
        const routeStop = routeStopsById.get(mapStop.id);
        if (!routeStop) return null;
        const resolution = await resolveGeocoding(buildStopGeocodingInput(routeStop));
        if (resolution.status !== 'cached' && resolution.status !== 'resolved') return null;
        return [mapStop.id, {
          latitude: resolution.entry.latitude,
          longitude: resolution.entry.longitude,
        }] as const;
      }));
      if (!mounted) return;
      setCachedCoordinates(Object.fromEntries(
        recoveredEntries.filter(entry => entry !== null)
      ));
    };
    recoverCoordinates().catch(() => {});
    return () => { mounted = false; };
  }, [baseMapStops, route, routeStopsById]);

  return useMemo(
    () => applyRecoveredMapCoordinates(baseMapStops, cachedCoordinates),
    [baseMapStops, cachedCoordinates]
  );
}
