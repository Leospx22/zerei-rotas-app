export function isPackageGroupSelected(
  selectedPackageIds: ReadonlySet<string>,
  groupPackageIds: readonly string[]
): boolean {
  return (
    groupPackageIds.length > 0 &&
    groupPackageIds.every(packageId => selectedPackageIds.has(packageId))
  );
}

export function togglePackageSelection(
  selectedPackageIds: ReadonlySet<string>,
  packageId: string
): Set<string> {
  const next = new Set(selectedPackageIds);
  if (next.has(packageId)) {
    next.delete(packageId);
  } else {
    next.add(packageId);
  }
  return next;
}

export function togglePackageGroupSelection(
  selectedPackageIds: ReadonlySet<string>,
  groupPackageIds: readonly string[]
): Set<string> {
  const next = new Set(selectedPackageIds);
  const allSelected = isPackageGroupSelected(selectedPackageIds, groupPackageIds);

  groupPackageIds.forEach(packageId => {
    if (allSelected) {
      next.delete(packageId);
    } else {
      next.add(packageId);
    }
  });

  return next;
}
