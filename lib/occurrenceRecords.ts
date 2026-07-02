import type { RouteData } from '../contexts/RouteContext';
import { normalizeAddress } from './executionPresentation.ts';
import type { GroupedStop } from './packageUtils.ts';

export const OCCURRENCE_REASON_FALLBACK = 'Motivo não informado';

export interface OccurrenceRecord {
  packageId: string;
  packageCode?: string;
  address: string;
  normalizedAddress?: string;
  reason?: string;
  registeredAt?: string;
  routeName?: string;
  stopNumber?: number;
}

export interface OccurrenceHistorySource {
  id: string;
  name: string;
  occurrences?: OccurrenceRecord[];
}

export function applyPackageOccurrenceToStops(
  stops: readonly GroupedStop[],
  stopId: string,
  packageId: string,
  reason: string,
  registeredAt: string
): GroupedStop[] {
  return stops.map(stop => {
    if (stop.id !== stopId) return stop;

    const packages = stop.packages.map(packageItem =>
      packageItem.id === packageId
        ? {
            ...packageItem,
            status: 'skipped' as const,
            occurrenceReason: reason,
            occurrenceRegisteredAt: registeredAt,
          }
        : packageItem
    );
    const allHandled = packages.every(
      packageItem => packageItem.status === 'delivered' || packageItem.status === 'skipped'
    );

    return {
      ...stop,
      packages,
      status: allHandled ? 'completed' : 'pending',
      packageCount: packages.length,
    };
  });
}

export function collectRouteOccurrenceRecords(route: RouteData | null): OccurrenceRecord[] {
  if (!route) return [];

  return route.stops.flatMap(stop =>
    stop.packages
      .filter(packageItem => packageItem.status === 'skipped')
      .map(packageItem => ({
        packageId: packageItem.id,
        packageCode: packageItem.trackingNumber || packageItem.id,
        address: packageItem.destinationAddress,
        normalizedAddress: normalizeAddress(packageItem.destinationAddress).displayAddress,
        reason: packageItem.occurrenceReason,
        registeredAt: packageItem.occurrenceRegisteredAt,
        routeName: route.name,
        stopNumber: stop.stopNumber,
      }))
  );
}

export function collectAllOccurrenceRecords(
  currentRoute: RouteData | null,
  history: readonly OccurrenceHistorySource[]
): OccurrenceRecord[] {
  const records: OccurrenceRecord[] = [];
  const seen = new Set<string>();

  collectRouteOccurrenceRecords(currentRoute).forEach(record => {
    records.push(record);
    seen.add(`${currentRoute?.id ?? ''}|${record.packageId}`);
  });

  history.forEach(entry => {
    (entry.occurrences ?? []).forEach(record => {
      const key = `${entry.id}|${record.packageId}`;
      if (seen.has(key)) return;
      seen.add(key);
      records.push({ ...record, routeName: entry.name });
    });
  });

  return records;
}

export function occurrenceReasonLabel(reason?: string): string {
  return reason?.trim() || OCCURRENCE_REASON_FALLBACK;
}
