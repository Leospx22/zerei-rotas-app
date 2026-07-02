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
