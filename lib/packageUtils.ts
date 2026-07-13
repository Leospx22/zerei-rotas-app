// ============================================================
// Data hierarchy: Route → Stop → Address → Package (SPX TN)
//
// Rules:
// - Total Stops = unique values in the "Stop" column ONLY
// - "Sequence" column is NEVER used as stop number
// - Packages group by Stop first, then by full normalized address within each Stop
// - Same address under different Stop numbers = separate, flagged with duplicateAddressWarning
// ============================================================

export interface RawPackage {
  trackingNumber: string;
  sequence?: string;
  destinationAddress: string;
  zipCode: string;
  city?: string;
  state?: string;
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
  city?: string;
  state?: string;
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

// A group of packages sharing the same full address within a Stop
export interface AddressGroup {
  normalizedAddress: string;
  originalAddress: string;
  zipCode: string;
  city?: string;
  state?: string;
  packageIds: string[];   // references to PackageItem ids in this group
  packageCount: number;
}

// A Stop is grouped exclusively by the "Stop" column value.
// Never derived from addresses or sequence numbers.
export interface GroupedStop {
  id: string;
  stopNumber: number;
  originalStopNumber: number | null;
  // Primary display address (first address in this stop)
  normalizedAddress: string;
  originalAddress: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  // All packages in this stop (flat list for status tracking)
  packages: PackageItem[];
  packageCount: number;
  // Sub-groups by address inside this stop
  addressGroups: AddressGroup[];
  addressCount: number;
  orderIndex: number;
  // Optimized order from route optimization (if available)
  optimizedOrderIndex?: number;
  status: 'pending' | 'completed' | 'skipped';
  houseNumber: string;
  // True if any address in this stop also appears in another stop
  duplicateAddressWarning: boolean;
}

export interface ImportSummary {
  totalPackages: number;
  totalStops: number;
  largestStop: { stopNumber: number; address: string; count: number };
  smallestStop: { stopNumber: number; address: string; count: number };
}

const ADDRESS_ABBREVIATIONS: Record<string, string[]> = {
  'Rua': ['Rua', 'R.', 'R', 'RUA', 'rua'],
  'Avenida': ['Avenida', 'Av.', 'Av', 'AV', 'AVENIDA', 'avenida'],
  'Travessa': ['Travessa', 'Tr.', 'Trav', 'TRAVESSA'],
  'Estrada': ['Estrada', 'Est.', 'Est', 'ESTRADA'],
  'Alameda': ['Alameda', 'Al.', 'Al', 'ALAMEDA'],
  'Praça': ['Praça', 'Pc.', 'Pc', 'PRACA', 'PRAÇA'],
  'Rodovia': ['Rodovia', 'Rod.', 'Rod', 'RODOVIA'],
  'Boulevard': ['Boulevard', 'Blvd.', 'Blvd', 'BOULEVARD'],
};

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

const INVALID_EMPTY_VALUES = new Set(['', '-', '—', 'n/a', 'na', 'null', 'undefined']);

function cleanSpreadsheetValue(value: unknown): string {
  return String(value ?? '').trim();
}

export function parseValidStopNumber(value: unknown): number | null {
  const raw = cleanSpreadsheetValue(value);
  if (INVALID_EMPTY_VALUES.has(raw.toLowerCase())) return null;
  if (!/^\d+$/.test(raw)) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parseValidSequence(value: unknown): string | undefined {
  const raw = cleanSpreadsheetValue(value);
  if (INVALID_EMPTY_VALUES.has(raw.toLowerCase())) return undefined;
  return /^\d+$/.test(raw) ? raw : undefined;
}

export function isShopeePriorityPackage(
  pkg: Pick<RawPackage | PackageItem, 'stopNumber' | 'sequence'>
): boolean {
  return pkg.stopNumber === null && !parseValidSequence(pkg.sequence);
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

function normalizedAddressKey(address: string): string {
  return normalizeAddress(address).toLowerCase().trim();
}

export function detectColumns(headers: string[]): Record<keyof RawPackage, number | null> {
  const mapping: Record<keyof RawPackage, number | null> = {
    trackingNumber: null,
    sequence: null,
    destinationAddress: null,
    zipCode: null,
    city: null,
    state: null,
    latitude: null,
    longitude: null,
    stopNumber: null,
  };

  // Strict exact-match candidates. "stop" variants have highest priority for stopNumber.
  // "sequence"/"seq" are intentionally excluded from stopNumber — they are order sequence only.
  const exactMatches: Record<keyof RawPackage, string[]> = {
    trackingNumber: [
      'spx tn', 'spx_tn', 'tracking', 'tracking number', 'tracking_number',
      'rastreio', 'número rastreio', 'numero rastreio',
      'package id', 'package_id', 'código', 'codigo', 'id pacote',
    ],
    sequence: ['sequence', 'sequÃªncia', 'sequencia', 'seq'],
    destinationAddress: [
      'destination address', 'destination_address',
      'endereço', 'endereco', 'address', 'destino', 'destination',
      'logradouro', 'delivery address', 'shipping address',
    ],
    zipCode: [
      'postal code', 'postal_code', 'cep', 'zip', 'zip code', 'zip_code',
      'código postal', 'codigo postal', 'postcode', 'post code',
    ],
    city: ['city', 'cidade', 'municipio', 'municÃ­pio'],
    state: ['state', 'estado', 'uf'],
    latitude: ['latitude', 'lat'],
    longitude: ['longitude', 'lng', 'long'],
    // "stop" and "parada" columns ONLY — NOT sequence/seq/order/ordem
    stopNumber: [
      'stop', 'stop number', 'stop_number',
      'parada', 'número parada', 'numero parada', 'num parada',
    ],
  };

  // Fuzzy fallback (only applied when exact match fails)
  // stopNumber fuzzy: only /\bstop\b/i or /\bparada\b/i — not seq/order
  const fuzzyPatterns: Record<keyof RawPackage, RegExp[]> = {
    sequence: [/sequ[eÃª]ncia/i, /^sequence$/i, /^seq$/i],
    trackingNumber: [/track/i, /rastreio/i, /cod[ií]go/i, /id[_\s]?pacote/i, /package[_\s]?id/i, /spx/i, /\btn\b/i],
    destinationAddress: [/endere[cç]o/i, /address/i, /destin/i, /logradouro/i],
    zipCode: [/cep/i, /zip/i, /postal/i],
    city: [/cidade/i, /city/i, /munic/i],
    state: [/estado/i, /^uf$/i, /state/i],
    latitude: [/\blat\b/i],
    longitude: [/\blng\b/i, /\blong\b/i],
    stopNumber: [/\bstop\b/i, /\bparada\b/i],
  };

  // Phase 1: exact matches
  headers.forEach((header, index) => {
    const clean = header.trim().toLowerCase();
    for (const [field, candidates] of Object.entries(exactMatches)) {
      if (mapping[field as keyof RawPackage] !== null) continue;
      if (candidates.includes(clean)) {
        mapping[field as keyof RawPackage] = index;
      }
    }
  });

  // Phase 2: fuzzy fallback only for unmapped fields
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
      ? parseValidSequence(row[mapping.sequence])
      : undefined;

    if (!address && !tracking) continue;

    const stopNum = mapping.stopNumber !== null
      ? parseValidStopNumber(row[mapping.stopNumber])
      : null;

    const parseCoordinate = (value: unknown, minimum: number, maximum: number) => {
      const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'));
      return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
    };

    packages.push({
      trackingNumber: finalTracking,
      sequence,
      destinationAddress: address,
      zipCode: mapping.zipCode !== null ? String(row[mapping.zipCode] ?? '').trim() : '',
      city: mapping.city !== null ? String(row[mapping.city] ?? '').trim() || undefined : undefined,
      state: mapping.state !== null ? String(row[mapping.state] ?? '').trim() || undefined : undefined,
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

// Build address groups inside a stop from a flat package list
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
      city: first.city,
      state: first.state,
      packageIds: pkgs.map(p => p.id),
      packageCount: pkgs.length,
    });
  }
  return groups;
}

// Primary grouping: Stop column is the ONLY source for stop identity.
// Packages without a stop number are grouped by address as a fallback,
// assigned synthetic stop numbers after the highest real stop.
export function groupPackagesByStop(rawPackages: RawPackage[]): GroupedStop[] {
  const withStop = rawPackages.filter(p => p.stopNumber !== null);
  const withoutStop = rawPackages.filter(p => p.stopNumber === null);
  const priorityWithoutStop = withoutStop.filter(isShopeePriorityPackage);
  const nonPriorityWithoutStop = withoutStop.filter(p => !isShopeePriorityPackage(p));

  // Build stop→rawPackages map
  const stopMap = new Map<number, RawPackage[]>();
  const missingStopKeys: number[] = [];
  for (const pkg of withStop) {
    const sn = pkg.stopNumber!;
    if (!stopMap.has(sn)) stopMap.set(sn, []);
    stopMap.get(sn)!.push(pkg);
  }

  // Fallback: group by address for packages without stop numbers
  const addMissingStopGroups = (packages: RawPackage[], priority: boolean) => {
    if (packages.length === 0) return;
    const addrMap = new Map<string, RawPackage[]>();
    for (const pkg of packages) {
      const key = normalizedAddressKey(pkg.destinationAddress);
      if (!addrMap.has(key)) addrMap.set(key, []);
      addrMap.get(key)!.push(pkg);
    }
    let nextStop = stopMap.size > 0 ? Math.max(...stopMap.keys()) + 1 : 1;
    for (const [, pkgs] of addrMap) {
      stopMap.set(nextStop, pkgs);
      if (priority) missingStopKeys.push(nextStop);
      nextStop++;
    }
  };

  addMissingStopGroups(priorityWithoutStop, true);
  addMissingStopGroups(nonPriorityWithoutStop, false);

  // Build global set of normalized addresses to detect cross-stop duplicates
  const addressStopCount = new Map<string, Set<number>>();
  for (const [sn, pkgs] of stopMap) {
    for (const p of pkgs) {
      const key = normalizedAddressKey(p.destinationAddress);
      if (!addressStopCount.has(key)) addressStopCount.set(key, new Set());
      addressStopCount.get(key)!.add(sn);
    }
  }

  const missingKeySet = new Set(missingStopKeys);
  const sortedKeys = [
    ...missingStopKeys,
    ...[...stopMap.keys()].filter(key => !missingKeySet.has(key)).sort((a, b) => a - b),
  ];
  const stops: GroupedStop[] = [];

  sortedKeys.forEach((stopNum, orderIndex) => {
    const rawPkgs = stopMap.get(stopNum)!;
    const first = rawPkgs[0];
    const coordinateSource = rawPkgs.find(
      pkg => pkg.latitude !== null && pkg.longitude !== null
    ) ?? first;
    const normalizedAddr = normalizeAddress(first.destinationAddress);
    const houseNum = extractHouseNumber(first.destinationAddress);

    const packages: PackageItem[] = rawPkgs.map((p, pi) => ({
      id: `pkg-${stopNum}-${pi}`,
      trackingNumber: p.trackingNumber,
      sequence: p.sequence,
      destinationAddress: p.destinationAddress,
      zipCode: p.zipCode,
      city: p.city,
      state: p.state,
      latitude: p.latitude,
      longitude: p.longitude,
      stopNumber: p.stopNumber,
      status: 'pending',
    }));

    const addressGroups = buildAddressGroups(packages);
    const addressCount = addressGroups.length;

    // Warning if any address in this stop appears in another stop
    const hasDuplicate = addressGroups.some(ag => {
      const key = normalizedAddressKey(ag.normalizedAddress);
      const stops = addressStopCount.get(key);
      return stops !== undefined && stops.size > 1;
    });

    stops.push({
      id: `stop-${stopNum}`,
      stopNumber: stopNum,
      originalStopNumber: first.stopNumber,
      normalizedAddress: normalizedAddr,
      originalAddress: first.destinationAddress,
      zipCode: first.zipCode,
      latitude: coordinateSource.latitude,
      longitude: coordinateSource.longitude,
      packages,
      packageCount: packages.length,
      addressGroups,
      addressCount,
      orderIndex,
      status: 'pending',
      houseNumber: houseNum,
      duplicateAddressWarning: hasDuplicate,
    });
  });

  return stops;
}

// Legacy compatibility — delegates to groupPackagesByStop when stop numbers present
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
      largestStop: { stopNumber: 0, address: '-', count: 0 },
      smallestStop: { stopNumber: 0, address: '-', count: 0 },
    };
  }

  const totalPackages = stops.reduce((sum, s) => sum + s.packageCount, 0);
  const totalStops = stops.length;

  const sorted = [...stops].sort((a, b) => b.packageCount - a.packageCount);
  const largest = sorted[0];
  const smallest = sorted[sorted.length - 1];

  return {
    totalPackages,
    totalStops,
    largestStop: { stopNumber: largest.stopNumber, address: largest.normalizedAddress, count: largest.packageCount },
    smallestStop: { stopNumber: smallest.stopNumber, address: smallest.normalizedAddress, count: smallest.packageCount },
  };
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}
