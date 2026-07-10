import type { RouteData } from '../contexts/RouteContext';
import { normalizeAddress } from './executionPresentation.ts';
import type { GroupedStop } from './packageUtils.ts';

export const OCCURRENCE_REASON_FALLBACK = 'Motivo não informado';
export const RECENT_OCCURRENCE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type OccurrenceResolution = 'delivered' | 'returned_to_hub';

export interface OccurrenceRecord {
  packageId: string;
  packageCode?: string;
  address: string;
  normalizedAddress?: string;
  reason?: string;
  registeredAt?: string;
  routeName?: string;
  stopNumber?: number;
  occurrenceResolution?: OccurrenceResolution;
  occurrenceResolvedAt?: string;
  occurrenceUpdatedAt?: string;
}

export interface OccurrenceHistorySource {
  id: string;
  name: string;
  completedAt?: string;
  occurrences?: OccurrenceRecord[];
}

export interface CollectedOccurrenceRecord extends OccurrenceRecord {
  routeId: string;
  source: 'current' | 'history';
  historyCompletedAt?: string;
}

export interface OccurrenceSections<T extends OccurrenceRecord = OccurrenceRecord> {
  pending: T[];
  resolvedRecently: T[];
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
      .filter(packageItem =>
        packageItem.status === 'skipped' || packageItem.occurrenceResolution !== undefined
      )
      .map(packageItem => ({
        packageId: packageItem.id,
        packageCode: packageItem.trackingNumber || packageItem.id,
        address: packageItem.destinationAddress,
        normalizedAddress: normalizeAddress(packageItem.destinationAddress).displayAddress,
        reason: packageItem.occurrenceReason,
        registeredAt: packageItem.occurrenceRegisteredAt,
        routeName: route.name,
        stopNumber: stop.stopNumber,
        occurrenceResolution: packageItem.occurrenceResolution,
        occurrenceResolvedAt: packageItem.occurrenceResolvedAt,
        occurrenceUpdatedAt: packageItem.occurrenceUpdatedAt,
      }))
  );
}

export function collectAllOccurrenceRecords(
  currentRoute: RouteData | null,
  history: readonly OccurrenceHistorySource[]
): CollectedOccurrenceRecord[] {
  const records: CollectedOccurrenceRecord[] = [];
  const seen = new Set<string>();

  collectRouteOccurrenceRecords(currentRoute).forEach(record => {
    records.push({
      ...record,
      routeId: currentRoute?.id ?? '',
      source: 'current',
    });
    seen.add(`${currentRoute?.id ?? ''}|${record.packageId}`);
  });

  history.forEach(entry => {
    (entry.occurrences ?? []).forEach(record => {
      const key = `${entry.id}|${record.packageId}`;
      if (seen.has(key)) return;
      seen.add(key);
      records.push({
        ...record,
        routeName: entry.name,
        routeId: entry.id,
        source: 'history',
        historyCompletedAt: entry.completedAt,
      });
    });
  });

  return records;
}

export function occurrenceReasonLabel(reason?: string): string {
  return reason?.trim() || OCCURRENCE_REASON_FALLBACK;
}

export function occurrenceResolutionLabel(resolution: OccurrenceResolution): string {
  return resolution === 'delivered' ? 'Entregue' : 'Devolvido ao Hub';
}

export function getOccurrenceDisplayTimestamps(record: OccurrenceRecord): {
  registeredAt?: string;
  updatedAt?: string;
} {
  return {
    registeredAt: record.registeredAt,
    updatedAt: record.occurrenceUpdatedAt ?? record.occurrenceResolvedAt,
  };
}

export function formatOccurrenceDateTime(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function partitionOccurrenceRecords<T extends OccurrenceRecord>(
  records: readonly T[],
  now = Date.now()
): OccurrenceSections<T> {
  const cutoff = now - RECENT_OCCURRENCE_WINDOW_MS;
  return records.reduce<OccurrenceSections<T>>(
    (sections, record) => {
      if (!record.occurrenceResolution) {
        sections.pending.push(record);
        return sections;
      }

      const resolvedAt = record.occurrenceResolvedAt
        ? new Date(record.occurrenceResolvedAt).getTime()
        : Number.NaN;
      if (Number.isFinite(resolvedAt) && resolvedAt >= cutoff) {
        sections.resolvedRecently.push(record);
      }
      return sections;
    },
    { pending: [], resolvedRecently: [] }
  );
}

export function resolvePackageOccurrenceInStops(
  stops: readonly GroupedStop[],
  packageId: string,
  resolution: OccurrenceResolution,
  resolvedAt: string
): GroupedStop[] {
  return stops.map(stop => {
    const hasTarget = stop.packages.some(
      packageItem =>
        packageItem.id === packageId &&
        packageItem.status === 'skipped' &&
        packageItem.occurrenceResolution === undefined
    );
    if (!hasTarget) return stop;

    const packages = stop.packages.map(packageItem =>
      packageItem.id === packageId
        ? {
            ...packageItem,
            status: resolution === 'delivered' ? 'delivered' as const : 'skipped' as const,
            occurrenceResolution: resolution,
            occurrenceResolvedAt: resolvedAt,
            occurrenceUpdatedAt: resolvedAt,
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

export function resolveOccurrenceRecord(
  record: OccurrenceRecord,
  resolution: OccurrenceResolution,
  resolvedAt: string
): OccurrenceRecord {
  if (record.occurrenceResolution) return record;
  return {
    ...record,
    occurrenceResolution: resolution,
    occurrenceResolvedAt: resolvedAt,
    occurrenceUpdatedAt: resolvedAt,
  };
}

export function editPackageOccurrenceInStops(
  stops: readonly GroupedStop[],
  packageId: string,
  reason: string,
  resolution?: OccurrenceResolution,
  updatedAt = new Date().toISOString()
): GroupedStop[] {
  return stops.map(stop => {
    const target = stop.packages.find(packageItem => packageItem.id === packageId);
    if (
      !target ||
      (target.status !== 'skipped' && target.occurrenceResolution === undefined)
    ) {
      return stop;
    }

    const nextResolution = target.occurrenceResolution
      ? resolution ?? target.occurrenceResolution
      : undefined;
    const packages = stop.packages.map(packageItem =>
      packageItem.id === packageId
        ? {
            ...packageItem,
            status: nextResolution === 'delivered' ? 'delivered' as const : 'skipped' as const,
            occurrenceReason: reason.trim() ? reason : packageItem.occurrenceReason,
            occurrenceResolution: nextResolution,
            occurrenceUpdatedAt: updatedAt,
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

export function deletePackageOccurrenceInStops(
  stops: readonly GroupedStop[],
  packageId: string
): GroupedStop[] {
  return stops.map(stop => {
    const hasTarget = stop.packages.some(packageItem => packageItem.id === packageId);
    if (!hasTarget) return stop;

    const packages = stop.packages.map(packageItem => {
      if (packageItem.id !== packageId) return packageItem;
      const {
        occurrenceReason: _occurrenceReason,
        occurrenceRegisteredAt: _occurrenceRegisteredAt,
        occurrenceResolution: _occurrenceResolution,
        occurrenceResolvedAt: _occurrenceResolvedAt,
        occurrenceUpdatedAt: _occurrenceUpdatedAt,
        ...packageWithoutOccurrence
      } = packageItem;
      return {
        ...packageWithoutOccurrence,
        status: packageItem.status === 'delivered' ? 'delivered' as const : 'pending' as const,
      };
    });
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

export function editOccurrenceRecord(
  record: OccurrenceRecord,
  reason: string,
  resolution?: OccurrenceResolution,
  updatedAt = new Date().toISOString()
): OccurrenceRecord {
  const nextResolution = record.occurrenceResolution
    ? resolution ?? record.occurrenceResolution
    : undefined;
  return {
    ...record,
    reason: reason.trim() ? reason : record.reason,
    occurrenceResolution: nextResolution,
    occurrenceUpdatedAt: updatedAt,
  };
}

export function hasOccurrenceEditChanges(
  record: OccurrenceRecord,
  reason: string,
  resolution?: OccurrenceResolution
): boolean {
  const reasonChanged = reason !== (record.reason ?? '');
  const resolutionChanged = record.occurrenceResolution !== undefined &&
    resolution !== record.occurrenceResolution;
  return reasonChanged || resolutionChanged;
}
