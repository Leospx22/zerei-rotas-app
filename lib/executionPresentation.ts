import type { GroupedStop, PackageItem } from '@/lib/packageUtils';

export interface NormalizedPresentationAddress {
  streetType: string;
  street: string;
  number: string;
  complement: string;
  normalizedStreet: string;
  groupKey: string;
  displayAddress: string;
}

export const ADDRESS_NORMALIZATION_DICTIONARY: Readonly<Record<string, string>> = {
  r: 'Rua',
  rua: 'Rua',
  av: 'Avenida',
  avenida: 'Avenida',
  cel: 'Coronel',
  coronel: 'Coronel',
  dr: 'Doutor',
  doutor: 'Doutor',
  prof: 'Professor',
  professor: 'Professor',
};

const LOWERCASE_STREET_WORDS = new Set(['da', 'das', 'de', 'do', 'dos', 'e']);

function comparisonText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

function cleanAddressText(address: string): string {
  return address
    .replace(/\./g, '')
    .replace(/,+/g, ',')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();
}

function normalizeStreetToken(token: string, index: number): string {
  const key = comparisonText(token);
  const dictionaryValue = ADDRESS_NORMALIZATION_DICTIONARY[key];
  if (dictionaryValue) return dictionaryValue;

  const lower = token.toLocaleLowerCase('pt-BR');
  if (index > 0 && LOWERCASE_STREET_WORDS.has(comparisonText(lower))) return lower;
  return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1);
}

export function normalizeAddress(address: string): NormalizedPresentationAddress {
  const cleaned = cleanAddressText(address);
  const parts = cleaned.match(
    /^(.*?)(?:,\s*|\s+)(\d+[a-zA-Z]?(?:-\d+[a-zA-Z]?)?|s\/?n)(?:\s*(?:,|-)\s*(.*))?$/i
  );
  const rawStreet = (parts?.[1] ?? cleaned).trim();
  const number = (parts?.[2] ?? '').toLocaleUpperCase('pt-BR');
  const complement = (parts?.[3] ?? '').trim();
  const streetTokens = rawStreet
    .split(/\s+/)
    .filter(Boolean)
    .map(normalizeStreetToken);
  const streetType = ['Rua', 'Avenida'].includes(streetTokens[0] ?? '')
    ? streetTokens[0]
    : '';
  const street = (streetType ? streetTokens.slice(1) : streetTokens).join(' ');
  const normalizedStreet = streetType
    ? `${streetType} ${street}`.trim()
    : street;
  const normalizedStreetKey = comparisonText(normalizedStreet);
  const groupKey = `${normalizedStreetKey}|${comparisonText(number)}`;
  const displayAddress = number
    ? `${normalizedStreet}, ${number}`
    : normalizedStreet;

  return {
    streetType,
    street,
    number,
    complement,
    normalizedStreet,
    groupKey,
    displayAddress,
  };
}

export interface ExecutionPackageGroup {
  key: string;
  address: string;
  packages: PackageItem[];
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
  stop.packages.forEach(pkg => {
    const originalAddress = pkg.destinationAddress.trim() || stop.normalizedAddress;
    const normalized = normalizeAddress(originalAddress);
    const existing = groups.get(normalized.groupKey);
    if (existing) {
      existing.packages.push(pkg);
      return;
    }

    groups.set(normalized.groupKey, {
      key: normalized.groupKey,
      address: normalized.displayAddress || originalAddress,
      packages: [pkg],
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
