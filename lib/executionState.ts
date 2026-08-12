import type { RouteData } from '@/contexts/RouteContext';
import type { GroupedStop, PackageItem } from '@/lib/packageUtils';

export type ExecutionStep = 'separacao' | 'entrega';

export interface DerivedExecutionState {
  currentStop: GroupedStop | null;
  nextStop: GroupedStop | null;
  totalPackagesAtCurrentStop: number;
  pendingPackagesAtCurrentStop: PackageItem[];
  deliveredPackagesCount: number;
  totalPackagesCount: number;
  remainingStopsCount: number;
  executionStep: ExecutionStep;
}

export interface ExecutionProgressSummary {
  deliveredStops: number;
  remainingStops: number;
  completionPercent: number;
  deliveredPackages: number;
  remainingPackages: number;
  totalStops: number;
  totalPackages: number;
  successRate: number;
}

export function deriveExecutionState(route: RouteData | null): DerivedExecutionState {
  const remainingStops = route?.stops.filter(stop => stop.status === 'pending') ?? [];
  const currentStop = remainingStops[0] ?? null;
  const nextStop = remainingStops[1] ?? null;
  const pendingPackagesAtCurrentStop =
    currentStop?.packages.filter(pkg => pkg.status === 'pending') ?? [];
  const totalPackagesAtCurrentStop = currentStop?.packages.length ?? 0;
  const deliveredPackagesCount = route?.stops.reduce(
    (total, stop) => total + stop.packages.filter(pkg => pkg.status === 'delivered').length,
    0
  ) ?? 0;

  return {
    currentStop,
    nextStop,
    totalPackagesAtCurrentStop,
    pendingPackagesAtCurrentStop,
    deliveredPackagesCount,
    totalPackagesCount: route?.totalPackages ?? 0,
    remainingStopsCount: remainingStops.length,
    executionStep:
      currentStop && pendingPackagesAtCurrentStop.length < totalPackagesAtCurrentStop
        ? 'entrega'
        : 'separacao',
  };
}

export function deriveExecutionProgress(route: RouteData | null): ExecutionProgressSummary {
  const totalStops = route?.stops.length ?? 0;
  const deliveredStops = route?.completedStops ?? 0;
  const totalPackages = route?.totalPackages ?? 0;
  const deliveredPackages = route?.deliveredPackages ?? 0;
  const remainingStops = Math.max(0, totalStops - deliveredStops);
  const remainingPackages = Math.max(0, totalPackages - deliveredPackages);
  const completionPercent =
    totalStops > 0 ? Math.round((deliveredStops / totalStops) * 100) : 0;
  const successRate =
    totalPackages > 0 ? Math.round((deliveredPackages / totalPackages) * 100) : 0;

  return {
    deliveredStops,
    remainingStops,
    completionPercent,
    deliveredPackages,
    remainingPackages,
    totalStops,
    totalPackages,
    successRate,
  };
}

export function formatExecutionDuration(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}min`;
}

export function formatExecutionTime(timestamp: number | null | undefined): string {
  if (!timestamp) return '--:--';
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
