export interface DirectOccurrenceTarget {
  stopId: string;
  pkgId: string;
}

export interface OccurrenceTarget {
  stopId: string;
  packageIds: string[];
}

export type AddressGroupOccurrenceAction =
  | { kind: 'none' }
  | { kind: 'direct'; target: OccurrenceTarget }
  | { kind: 'select'; packageIds: string[] };

export function createDirectOccurrenceTarget(
  stopId: string,
  packageItem: { id: string; status: 'pending' | 'delivered' | 'skipped' }
): DirectOccurrenceTarget | null {
  if (packageItem.status === 'delivered') return null;
  return { stopId, pkgId: packageItem.id };
}

export function getAddressGroupOccurrenceAction(
  stopId: string,
  packages: ReadonlyArray<{
    id: string;
    status: 'pending' | 'delivered' | 'skipped';
  }>,
  selectedPackageIds: ReadonlySet<string> = new Set()
): AddressGroupOccurrenceAction {
  const pendingPackages = packages.filter(pkg => pkg.status === 'pending');
  const selectedPendingPackages = pendingPackages.filter(pkg =>
    selectedPackageIds.has(pkg.id)
  );

  if (selectedPendingPackages.length > 0) {
    return {
      kind: 'direct',
      target: {
        stopId,
        packageIds: selectedPendingPackages.map(pkg => pkg.id),
      },
    };
  }

  if (pendingPackages.length === 0) return { kind: 'none' };
  if (pendingPackages.length === 1) {
    return {
      kind: 'direct',
      target: { stopId, packageIds: [pendingPackages[0].id] },
    };
  }
  return {
    kind: 'select',
    packageIds: pendingPackages.map(pkg => pkg.id),
  };
}

export function applyOccurrenceReasonToTarget(
  target: OccurrenceTarget,
  reason: string,
  updatePackageOccurrence: (stopId: string, packageId: string, reason: string) => void
): void {
  target.packageIds.forEach(packageId => {
    updatePackageOccurrence(target.stopId, packageId, reason);
  });
}
