import type { GroupedStop, PackageItem } from './packageUtils.ts';
import {
  buildSmartAddressGroups,
  normalizeSmartAddress,
  type SmartBlockGroup,
} from './smartAddressGrouping.ts';

export interface NormalizedPresentationAddress {
  streetType: string;
  street: string;
  number: string;
  complement: string;
  normalizedStreet: string;
  groupKey: string;
  displayAddress: string;
}

export function normalizeAddress(address: string): NormalizedPresentationAddress {
  const normalized = normalizeSmartAddress(address);

  return {
    streetType: normalized.streetType,
    street: normalized.street,
    number: normalized.number,
    complement: normalized.complement,
    normalizedStreet: normalized.normalizedStreet,
    groupKey: normalized.addressKey,
    displayAddress: normalized.displayAddress,
  };
}

export interface ExecutionPackageGroup {
  key: string;
  address: string;
  packages: PackageItem[];
  blocks: SmartBlockGroup[];
  blockCount: number;
  deliveryCount: number;
  isCondominium: boolean;
}

export interface PackageGroupSummary {
  lines: string[];
  remainingGroups: number;
}

export function getPendingPackageIdsForGroup(group: ExecutionPackageGroup): string[] {
  return group.packages
    .filter(pkg => pkg.status === 'pending')
    .map(pkg => pkg.id);
}

export function isExecutionPackageGroupCompleted(group: ExecutionPackageGroup): boolean {
  return (
    group.packages.length > 0 &&
    group.packages.every(pkg => pkg.status === 'delivered' || pkg.status === 'skipped')
  );
}

function numericStreetNumber(address: string): number | null {
  const number = normalizeAddress(address).number;
  const match = number.match(/^\d+/);
  return match ? Number.parseInt(match[0], 10) : null;
}

export function buildExecutionPackageGroups(
  stop: GroupedStop | null
): ExecutionPackageGroup[] {
  if (!stop) return [];

  const groups = new Map<string, ExecutionPackageGroup>();
  const hierarchy = buildSmartAddressGroups(stop.packages);
  hierarchy.forEach(addressGroup => {
    const packages = stop.packages.filter(pkg => addressGroup.packageIds.includes(pkg.id));
    groups.set(addressGroup.key, {
      key: addressGroup.key,
      address: addressGroup.displayAddress,
      packages,
      blocks: addressGroup.blocks,
      blockCount: addressGroup.blockCount,
      deliveryCount: addressGroup.deliveryCount,
      isCondominium: addressGroup.isCondominium,
    });
  });

  return [...groups.values()]
    .map((group, originalIndex) => ({
      group,
      originalIndex,
      streetNumber: numericStreetNumber(group.address),
    }))
    .sort((left, right) => {
      if (left.streetNumber === null && right.streetNumber === null) {
        return left.originalIndex - right.originalIndex;
      }
      if (left.streetNumber === null) return 1;
      if (right.streetNumber === null) return -1;
      return left.streetNumber - right.streetNumber || left.originalIndex - right.originalIndex;
    })
    .map(({ group }) => group);
}

export function getPrimaryExecutionAddress(stop: GroupedStop | null): string {
  if (!stop) return '';
  return (
    buildExecutionPackageGroups(stop)[0]?.address ??
    normalizeAddress(stop.normalizedAddress).displayAddress
  );
}

export function summarizePackageGroups(
  groups: ExecutionPackageGroup[],
  limit = 3,
  preserveInputOrder = false
): PackageGroupSummary {
  const orderedGroups = preserveInputOrder
    ? groups
    : [...groups].sort((left, right) => right.packages.length - left.packages.length);
  const visibleGroups = orderedGroups.slice(0, limit);

  return {
    lines: visibleGroups.map(group => {
      const count = group.packages.length;
      const houseNumber = normalizeAddress(group.address).number;
      const packageLabel = count === 1 ? 'pacote' : 'pacotes';
      return houseNumber
        ? `${count} ${packageLabel} no nº ${houseNumber}`
        : `${count} ${packageLabel} em ${group.address}`;
    }),
    remainingGroups: Math.max(0, orderedGroups.length - visibleGroups.length),
  };
}
