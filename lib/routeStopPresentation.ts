import { normalizeAddress } from './executionPresentation.ts';
import type { GroupedStop } from './packageUtils.ts';

export const MISSING_STOP_BADGE = '#P';
export const MISSING_STOP_DESCRIPTION = 'Sem número de parada na planilha';
export const UNRESOLVED_COORDINATE_LABEL = 'Insira o endereço manualmente';

export function isMissingSpreadsheetStop(stop: Pick<GroupedStop, 'packages'>): boolean {
  return stop.packages.length > 0 && stop.packages.every(pkg => pkg.stopNumber === null);
}

export function formatStopBadge(
  stopOrNumber: Pick<GroupedStop, 'packages' | 'stopNumber'> | number | null | undefined
): string {
  if (typeof stopOrNumber === 'number') return `#${stopOrNumber}`;
  if (!stopOrNumber || isMissingSpreadsheetStop(stopOrNumber)) return MISSING_STOP_BADGE;
  return `#${stopOrNumber.stopNumber}`;
}

export function formatRouteOrderBadge(
  stop: Pick<GroupedStop, 'packages'>,
  routeOrder: number
): string {
  return isMissingSpreadsheetStop(stop) ? MISSING_STOP_BADGE : `#${routeOrder}`;
}

export function formatSpreadsheetStopIdentifier(stop: GroupedStop): string {
  return isMissingSpreadsheetStop(stop) ? MISSING_STOP_BADGE : `#${stop.stopNumber}`;
}

export function getBaseAddressKey(address: string): string {
  return normalizeAddress(address).groupKey;
}

function stopBaseAddressKeys(stop: GroupedStop): Set<string> {
  return new Set(
    stop.packages
      .map(pkg => pkg.destinationAddress || stop.normalizedAddress)
      .map(getBaseAddressKey)
      .filter(Boolean)
  );
}

function formatStopIdentifiers(stops: readonly GroupedStop[]): string {
  if (stops.length === 1) return formatSpreadsheetStopIdentifier(stops[0]);
  if (stops.length === 2) {
    return `${formatSpreadsheetStopIdentifier(stops[0])} e ${formatSpreadsheetStopIdentifier(stops[1])}`;
  }
  const identifiers = stops.map(formatSpreadsheetStopIdentifier);
  return `${identifiers.slice(0, -1).join(', ')} e ${identifiers[identifiers.length - 1]}`;
}

export function getDuplicateAddressWarning(
  stops: readonly GroupedStop[],
  targetStop: GroupedStop
): string | null {
  const targetKeys = stopBaseAddressKeys(targetStop);
  if (targetKeys.size === 0) return null;

  const matchingStops = stops.filter(stop => {
    if (stop.id === targetStop.id) return false;
    const keys = stopBaseAddressKeys(stop);
    return [...targetKeys].some(key => keys.has(key));
  });
  if (matchingStops.length === 0) return null;

  const numberedMatches = matchingStops.filter(stop => !isMissingSpreadsheetStop(stop));
  const missingMatches = matchingStops.filter(isMissingSpreadsheetStop);
  const targetIdentifier = formatSpreadsheetStopIdentifier(targetStop);

  if (numberedMatches.length > 0 && missingMatches.length === 0) {
    const article = numberedMatches.length === 1 ? 'da parada' : 'das paradas';
    return `Esta parada ${targetIdentifier} tem o mesmo endereço ${article} ${formatStopIdentifiers(numberedMatches)}.`;
  }

  if (numberedMatches.length === 0 && missingMatches.length === 1) {
    return `Esta parada ${targetIdentifier} tem o mesmo endereço da parada ${MISSING_STOP_BADGE}.`;
  }

  if (numberedMatches.length === 0 && missingMatches.length > 1) {
    return `Esta parada ${targetIdentifier} também corresponde a ${missingMatches.length} paradas sem número.`;
  }

  const article = numberedMatches.length === 1 ? 'da parada' : 'das paradas';
  return `Esta parada ${targetIdentifier} tem o mesmo endereço ${article} ${formatStopIdentifiers(numberedMatches)} e também corresponde a ${missingMatches.length} parada${missingMatches.length === 1 ? '' : 's'} sem número.`;
}

export function getBestManualAddress(stop: {
  address?: string;
  zipCode?: string;
}): string {
  const address = normalizeAddress(stop.address ?? '').displayAddress;
  const parts = [
    address,
    stop.zipCode?.trim(),
    'Brasil',
  ].filter(Boolean);
  return parts.join(', ');
}
