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
  destinationAddress: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  stopNumber: number | null;
}

export interface PackageItem {
  id: string;
  trackingNumber: string;
  destinationAddress: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  stopNumber: number | null;
  status: 'pending' | 'delivered' | 'skipped';
}

// A group of packages sharing the same full address within a Stop
export interface AddressGroup {
  normalizedAddress: string;
  originalAddress: string;
  zipCode: string;
  packageIds: string[];   // references to PackageItem ids in this group
  packageCount: number;
}

// A Stop is grouped exclusively by the "Stop" column value.
// Never derived from addresses or sequence numbers.
export interface GroupedStop {
  id: string;
  stopNumber: number;
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

function normalizedAddressKey(address: string): string {
  return normalizeAddress(address).toLowerCase().trim();
}

export function detectColumns(headers: string[]): Record<keyof RawPackage, number | null> {
  const mapping: Record<keyof RawPackage, number | null> = {
    trackingNumber: null,
    destinationAddress: null,
    zipCode: null,
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
    // "stop" and "parada" columns ONLY — NOT sequence/seq/order/ordem
    stopNumber: [
      'stop', 'stop number', 'stop_number',
      'parada', 'número parada', 'numero parada', 'num parada',
    ],
  };

  // Fuzzy fallback (only applied when exact match fails)
  // stopNumber fuzzy: only /\bstop\b/i or /\bparada\b/i — not seq/order
  const fuzzyPatterns: Record<keyof RawPackage, RegExp[]> = {
    trackingNumber: [/track/i, /rastreio/i, /cod[ií]go/i, /id[_\s]?pacote/i, /package[_\s]?id/i, /spx/i, /\btn\b/i],
    destinationAddress: [/endere[cç]o/i, /address/i, /destin/i, /logradouro/i],
    zipCode: [/cep/i, /zip/i, /postal/i],
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

    if (!address && !tracking) continue;

    const rawStop = mapping.stopNumber !== null
      ? String(row[mapping.stopNumber] ?? '').trim()
      : '';
    const stopNum = rawStop !== '' ? parseInt(rawStop, 10) || null : null;

    packages.push({
      trackingNumber: finalTracking,
      destinationAddress: address,
      zipCode: mapping.zipCode !== null ? String(row[mapping.zipCode] ?? '').trim() : '',
      latitude: mapping.latitude !== null ? parseFloat(String(row[mapping.latitude])) || null : null,
      longitude: mapping.longitude !== null ? parseFloat(String(row[mapping.longitude])) || null : null,
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

  // Build stop→rawPackages map
  const stopMap = new Map<number, RawPackage[]>();
  for (const pkg of withStop) {
    const sn = pkg.stopNumber!;
    if (!stopMap.has(sn)) stopMap.set(sn, []);
    stopMap.get(sn)!.push(pkg);
  }

  // Fallback: group by address for packages without stop numbers
  if (withoutStop.length > 0) {
    const addrMap = new Map<string, RawPackage[]>();
    for (const pkg of withoutStop) {
      const key = normalizedAddressKey(pkg.destinationAddress);
      if (!addrMap.has(key)) addrMap.set(key, []);
      addrMap.get(key)!.push(pkg);
    }
    let nextStop = stopMap.size > 0 ? Math.max(...stopMap.keys()) + 1 : 1;
    for (const [, pkgs] of addrMap) {
      stopMap.set(nextStop++, pkgs);
    }
  }

  // Build global set of normalized addresses to detect cross-stop duplicates
  const addressStopCount = new Map<string, Set<number>>();
  for (const [sn, pkgs] of stopMap) {
    for (const p of pkgs) {
      const key = normalizedAddressKey(p.destinationAddress);
      if (!addressStopCount.has(key)) addressStopCount.set(key, new Set());
      addressStopCount.get(key)!.add(sn);
    }
  }

  const sortedKeys = [...stopMap.keys()].sort((a, b) => a - b);
  const stops: GroupedStop[] = [];

  sortedKeys.forEach((stopNum, orderIndex) => {
    const rawPkgs = stopMap.get(stopNum)!;
    const first = rawPkgs[0];
    const normalizedAddr = normalizeAddress(first.destinationAddress);
    const houseNum = extractHouseNumber(first.destinationAddress);

    const packages: PackageItem[] = rawPkgs.map((p, pi) => ({
      id: `pkg-${stopNum}-${pi}`,
      trackingNumber: p.trackingNumber,
      destinationAddress: p.destinationAddress,
      zipCode: p.zipCode,
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
      normalizedAddress: normalizedAddr,
      originalAddress: first.destinationAddress,
      zipCode: first.zipCode,
      latitude: first.latitude,
      longitude: first.longitude,
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
