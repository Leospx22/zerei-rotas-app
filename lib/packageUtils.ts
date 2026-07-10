// ============================================================
// Data hierarchy: Route -> Stop -> Address -> Package (SPX TN)
//
// Rules:
// - Valid numeric Stop values remain the primary source for stop identity.
// - "Sequence" is package identification/order context, never a stop number.
// - Packages group by Stop first, then by full normalized address within each Stop.
// - Rows without valid Stop values are preserved as "Sem parada" stops grouped by base address.
// - Same base address under different stops is diagnosed with exact stop matches.
// ============================================================

import { normalizeAddress as normalizePresentationAddress } from './executionPresentation.ts';

export interface RawPackage {
  trackingNumber: string;
  sequence?: string;
  destinationAddress: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  stopNumber: number | null;
}

export interface PackageItem {
  id: string;
  trackingNumber: string;
  sequence?: string;
  destinationAddress: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  stopNumber: number | null;
  status: 'pending' | 'delivered' | 'skipped';
  occurrenceReason?: string;
  occurrenceRegisteredAt?: string;
  occurrenceResolution?: 'delivered' | 'returned_to_hub';
  occurrenceResolvedAt?: string;
  occurrenceUpdatedAt?: string;
}

export interface AddressGroup {
  normalizedAddress: string;
  originalAddress: string;
  zipCode: string;
  packageIds: string[];
  packageCount: number;
}

export interface GroupedStop {
  id: string;
  stopNumber: number | null;
  missingStopNumber?: boolean;
  normalizedAddress: string;
  originalAddress: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  packages: PackageItem[];
  packageCount: number;
  addressGroups: AddressGroup[];
  addressCount: number;
  orderIndex: number;
  optimizedOrderIndex?: number;
  status: 'pending' | 'completed' | 'skipped';
  houseNumber: string;
  duplicateAddressWarning: boolean;
  duplicateAddressWarningMessage?: string;
}

export interface ImportSummary {
  totalPackages: number;
  totalStops: number;
  largestStop: { stopNumber: number | null; address: string; count: number };
  smallestStop: { stopNumber: number | null; address: string; count: number };
}

const ADDRESS_ABBREVIATIONS: Record<string, string[]> = {
  Rua: ['Rua', 'R.', 'R', 'RUA', 'rua'],
  Avenida: ['Avenida', 'Av.', 'Av', 'AV', 'AVENIDA', 'avenida'],
  Travessa: ['Travessa', 'Tr.', 'Trav', 'TRAVESSA'],
  Estrada: ['Estrada', 'Est.', 'Est', 'ESTRADA'],
  Alameda: ['Alameda', 'Al.', 'Al', 'ALAMEDA'],
  Praça: ['Praça', 'Pc.', 'Pc', 'PRACA', 'PRAÇA'],
  Rodovia: ['Rodovia', 'Rod.', 'Rod', 'RODOVIA'],
  Boulevard: ['Boulevard', 'Blvd.', 'Blvd', 'BOULEVARD'],
};

interface StopBuildEntry {
  stopNumber: number | null;
  missingStopNumber: boolean;
  packages: RawPackage[];
}

export function normalizeAddress(address: string): string {
  let normalized = address.trim();
  for (const [full, abbreviations] of Object.entries(ADDRESS_ABBREVIATIONS)) {
    for (const abbr of abbreviations) {
      if (abbr === full) continue;
      const regex = new RegExp(`^${abbr.replace('.', '\\.')}\\s+`, 'i');
      normalized = normalized.replace(regex, `${full} `);
    }
  }
  return normalized;
}

export function extractHouseNumber(address: string): string {
  const match = address.match(/[,#\s]+(\d[\d\-a-zA-Z]*)/);
  return match ? match[1] : '';
}

function normalizedAddressKey(address: string): string {
  return normalizeAddress(address).toLowerCase().trim();
}

export function normalizeBaseAddressForDuplicateDetection(address: string): string {
  return normalizePresentationAddress(address).groupKey;
}

export function getStopDisplayLabel(
  stop: Pick<GroupedStop, 'stopNumber' | 'missingStopNumber'>
): string {
  return stop.stopNumber === null || stop.missingStopNumber ? 'Sem parada' : `#${stop.stopNumber}`;
}

export function getStopSecondaryLabel(
  stop: Pick<GroupedStop, 'stopNumber' | 'missingStopNumber'>
): string {
  return stop.stopNumber === null || stop.missingStopNumber ? 'Sem número na planilha' : 'Parada';
}

function stopReferenceLabel(
  stop: Pick<GroupedStop, 'stopNumber' | 'missingStopNumber'>
): string {
  return stop.stopNumber === null || stop.missingStopNumber
    ? 'uma parada sem número'
    : `#${stop.stopNumber}`;
}

function formatStopReferenceList(
  stops: Pick<GroupedStop, 'stopNumber' | 'missingStopNumber'>[]
): string {
  if (stops.length === 1) {
    const [stop] = stops;
    return stop.stopNumber === null || stop.missingStopNumber
      ? 'de uma parada sem número'
      : `da parada #${stop.stopNumber}`;
  }
  const labels = stops.map(stopReferenceLabel);
  if (labels.length === 2) return `das paradas ${labels[0]} e ${labels[1]}`;
  return `das paradas ${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`;
}

export function formatDuplicateStopMessage(
  currentStop: Pick<GroupedStop, 'stopNumber' | 'missingStopNumber'>,
  matchingStops: Pick<GroupedStop, 'stopNumber' | 'missingStopNumber'>[]
): string {
  const currentLabel = currentStop.stopNumber === null || currentStop.missingStopNumber
    ? 'Esta parada sem número'
    : `Esta parada #${currentStop.stopNumber}`;
  return `${currentLabel} tem o mesmo endereço ${formatStopReferenceList(matchingStops)}.`;
}

export function getPackagePrimaryLabel(
  pkg: Pick<PackageItem, 'trackingNumber' | 'sequence'>
): string {
  const sequence = pkg.sequence?.trim();
  return sequence ? `Seq. ${sequence}` : `SPX TN: ${pkg.trackingNumber}`;
}

export function getPackageSecondaryLabel(
  pkg: Pick<PackageItem, 'trackingNumber' | 'sequence'>
): string | null {
  return pkg.sequence?.trim() ? `SPX TN: ${pkg.trackingNumber}` : null;
}

export function detectColumns(headers: string[]): Record<keyof RawPackage, number | null> {
  const mapping: Record<keyof RawPackage, number | null> = {
    trackingNumber: null,
    sequence: null,
    destinationAddress: null,
    zipCode: null,
    latitude: null,
    longitude: null,
    stopNumber: null,
  };

  const exactMatches: Record<keyof RawPackage, string[]> = {
    trackingNumber: [
      'spx tn', 'spx_tn', 'tracking', 'tracking number', 'tracking_number',
      'rastreio', 'número rastreio', 'numero rastreio',
      'package id', 'package_id', 'código', 'codigo', 'id pacote',
    ],
    sequence: ['sequence', 'sequência', 'sequencia'],
    destinationAddress: [
      'destination address', 'destination_address',
      'endereço', 'endereco', 'address', 'destino', 'destination',
      'logradouro', 'delivery address', 'shipping address',
    ],
    zipCode: [
      'postal code', 'postal_code', 'cep', 'zip', 'zip code', 'zip_code',
      'código postal', 'codigo postal', 'postcode', 'post code',
    ],
    latitude: ['latitude', 'lat'],
    longitude: ['longitude', 'lng', 'long'],
    stopNumber: [
      'stop', 'stop number', 'stop_number',
      'parada', 'número parada', 'numero parada', 'num parada',
    ],
  };

  const fuzzyPatterns: Record<keyof RawPackage, RegExp[]> = {
    trackingNumber: [/track/i, /rastreio/i, /cod[ií]go/i, /id[_\s]?pacote/i, /package[_\s]?id/i, /spx/i, /\btn\b/i],
    sequence: [/sequ[eê]ncia/i, /^sequence$/i],
    destinationAddress: [/endere[cç]o/i, /address/i, /destin/i, /logradouro/i],
    zipCode: [/cep/i, /zip/i, /postal/i],
    latitude: [/\blat\b/i],
    longitude: [/\blng\b/i, /\blong\b/i],
    stopNumber: [/\bstop\b/i, /\bparada\b/i],
  };

  headers.forEach((header, index) => {
    const clean = header.trim().toLowerCase();
    for (const [field, candidates] of Object.entries(exactMatches)) {
      if (mapping[field as keyof RawPackage] !== null) continue;
      if (candidates.includes(clean)) {
        mapping[field as keyof RawPackage] = index;
      }
    }
  });

  headers.forEach((header, index) => {
    const clean = header.trim().toLowerCase();
    for (const [field, regexes] of Object.entries(fuzzyPatterns)) {
      if (mapping[field as keyof RawPackage] !== null) continue;
      if (regexes.some(r => r.test(clean))) {
        mapping[field as keyof RawPackage] = index;
      }
    }
  });

  return mapping;
}

export function parseSpreadsheetData(rows: any[][], headers: string[]): RawPackage[] {
  const mapping = detectColumns(headers);
  const packages: RawPackage[] = [];

  if (mapping.destinationAddress === null && mapping.trackingNumber === null) {
    return packages;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const address = mapping.destinationAddress !== null
      ? String(row[mapping.destinationAddress] ?? '').trim()
      : '';
    const tracking = mapping.trackingNumber !== null
      ? String(row[mapping.trackingNumber] ?? '').trim()
      : '';
    const finalTracking = tracking || `PKG-${i + 1}`;
    const sequence = mapping.sequence !== null
      ? String(row[mapping.sequence] ?? '').trim()
      : '';

    if (!address && !tracking) continue;

    const rawStop = mapping.stopNumber !== null
      ? String(row[mapping.stopNumber] ?? '').trim()
      : '';
    const stopNum = /^\d+$/.test(rawStop) ? parseInt(rawStop, 10) : null;

    const parseCoordinate = (value: unknown, minimum: number, maximum: number) => {
      const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'));
      return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
    };

    packages.push({
      trackingNumber: finalTracking,
      sequence: sequence || undefined,
      destinationAddress: address,
      zipCode: mapping.zipCode !== null ? String(row[mapping.zipCode] ?? '').trim() : '',
      latitude: mapping.latitude !== null
        ? parseCoordinate(row[mapping.latitude], -90, 90)
        : null,
      longitude: mapping.longitude !== null
        ? parseCoordinate(row[mapping.longitude], -180, 180)
        : null,
      stopNumber: stopNum,
    });
  }

  return packages;
}

function buildAddressGroups(packages: PackageItem[]): AddressGroup[] {
  const groupMap = new Map<string, PackageItem[]>();
  for (const pkg of packages) {
    const key = normalizedAddressKey(pkg.destinationAddress);
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(pkg);
  }

  const groups: AddressGroup[] = [];
  for (const [, pkgs] of groupMap) {
    const first = pkgs[0];
    groups.push({
      normalizedAddress: normalizeAddress(first.destinationAddress),
      originalAddress: first.destinationAddress,
      zipCode: first.zipCode,
      packageIds: pkgs.map(p => p.id),
      packageCount: pkgs.length,
    });
  }
  return groups;
}

export function groupPackagesByStop(rawPackages: RawPackage[]): GroupedStop[] {
  const withStop = rawPackages.filter(p => p.stopNumber !== null);
  const withoutStop = rawPackages.filter(p => p.stopNumber === null);
  const stopMap = new Map<number, RawPackage[]>();

  for (const pkg of withStop) {
    const stopNumber = pkg.stopNumber!;
    if (!stopMap.has(stopNumber)) stopMap.set(stopNumber, []);
    stopMap.get(stopNumber)!.push(pkg);
  }

  const entries: StopBuildEntry[] = [];
  if (withoutStop.length > 0) {
    const addressMap = new Map<string, RawPackage[]>();
    for (const pkg of withoutStop) {
      const key = normalizeBaseAddressForDuplicateDetection(pkg.destinationAddress);
      if (!addressMap.has(key)) addressMap.set(key, []);
      addressMap.get(key)!.push(pkg);
    }
    for (const [, packages] of addressMap) {
      entries.push({ stopNumber: null, missingStopNumber: true, packages });
    }
  }

  [...stopMap.keys()].sort((a, b) => a - b).forEach(stopNumber => {
    entries.push({
      stopNumber,
      missingStopNumber: false,
      packages: stopMap.get(stopNumber)!,
    });
  });

  const stops = entries.map<GroupedStop>((entry, orderIndex) => {
    const rawPkgs = entry.packages;
    const first = rawPkgs[0];
    const coordinateSource = rawPkgs.find(
      pkg => pkg.latitude !== null && pkg.longitude !== null
    ) ?? first;
    const normalizedAddr = normalizeAddress(first.destinationAddress);
    const houseNum = extractHouseNumber(first.destinationAddress);
    const stopKey = entry.stopNumber === null ? `sem-parada-${orderIndex + 1}` : String(entry.stopNumber);

    const packages: PackageItem[] = rawPkgs.map((pkg, packageIndex) => ({
      id: `pkg-${stopKey}-${packageIndex}`,
      trackingNumber: pkg.trackingNumber,
      sequence: pkg.sequence,
      destinationAddress: pkg.destinationAddress,
      zipCode: pkg.zipCode,
      latitude: pkg.latitude,
      longitude: pkg.longitude,
      stopNumber: pkg.stopNumber,
      status: 'pending',
    }));

    const addressGroups = buildAddressGroups(packages);

    return {
      id: entry.stopNumber === null ? `stop-${stopKey}` : `stop-${entry.stopNumber}`,
      stopNumber: entry.stopNumber,
      missingStopNumber: entry.missingStopNumber,
      normalizedAddress: normalizedAddr,
      originalAddress: first.destinationAddress,
      zipCode: first.zipCode,
      latitude: coordinateSource.latitude,
      longitude: coordinateSource.longitude,
      packages,
      packageCount: packages.length,
      addressGroups,
      addressCount: addressGroups.length,
      orderIndex,
      status: 'pending',
      houseNumber: houseNum,
      duplicateAddressWarning: false,
    };
  });

  const addressToStopIds = new Map<string, Set<string>>();
  stops.forEach(stop => {
    stop.packages.forEach(pkg => {
      const key = normalizeBaseAddressForDuplicateDetection(pkg.destinationAddress);
      if (!addressToStopIds.has(key)) addressToStopIds.set(key, new Set());
      addressToStopIds.get(key)!.add(stop.id);
    });
  });

  return stops.map(stop => {
    const matchingIds = new Set<string>();
    stop.packages.forEach(pkg => {
      const key = normalizeBaseAddressForDuplicateDetection(pkg.destinationAddress);
      addressToStopIds.get(key)?.forEach(stopId => {
        if (stopId !== stop.id) matchingIds.add(stopId);
      });
    });
    const matchingStops = [...matchingIds]
      .map(stopId => stops.find(candidate => candidate.id === stopId))
      .filter((candidate): candidate is GroupedStop => Boolean(candidate));

    return {
      ...stop,
      duplicateAddressWarning: matchingStops.length > 0,
      duplicateAddressWarningMessage: matchingStops.length > 0
        ? formatDuplicateStopMessage(stop, matchingStops)
        : undefined,
    };
  });
}

export function groupPackagesByAddress(rawPackages: RawPackage[]): GroupedStop[] {
  return groupPackagesByStop(rawPackages);
}

export function buildPlanningRoute(rawPackages: RawPackage[]) {
  const stops = groupPackagesByStop(rawPackages);
  const totalPackages = stops.reduce((sum, stop) => sum + stop.packageCount, 0);

  return {
    id: generateId(),
    name: `Rota ${new Date().toLocaleDateString('pt-BR')}`,
    stops,
    status: 'planning' as const,
    estimatedDistanceKm: Math.round(stops.length * 3.5 * 10) / 10,
    completedStops: 0,
    totalPackages,
    deliveredPackages: 0,
    startTime: null,
    durationMinutes: 0,
  };
}

export function calculateImportSummary(stops: GroupedStop[]): ImportSummary {
  if (stops.length === 0) {
    return {
      totalPackages: 0,
      totalStops: 0,
      largestStop: { stopNumber: null, address: '-', count: 0 },
      smallestStop: { stopNumber: null, address: '-', count: 0 },
    };
  }

  const totalPackages = stops.reduce((sum, stop) => sum + stop.packageCount, 0);
  const totalStops = stops.length;
  const sorted = [...stops].sort((a, b) => b.packageCount - a.packageCount);
  const largest = sorted[0];
  const smallest = sorted[sorted.length - 1];

  return {
    totalPackages,
    totalStops,
    largestStop: {
      stopNumber: largest.stopNumber,
      address: largest.normalizedAddress,
      count: largest.packageCount,
    },
    smallestStop: {
      stopNumber: smallest.stopNumber,
      address: smallest.normalizedAddress,
      count: smallest.packageCount,
    },
  };
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}
