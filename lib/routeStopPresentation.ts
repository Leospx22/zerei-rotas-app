import { normalizeAddress } from './executionPresentation.ts';
import { isShopeePriorityPackage, type GroupedStop } from './packageUtils.ts';

export const MISSING_STOP_BADGE = '#P';
export const SHOPEE_PRIORITY_LABEL = 'Prioridade Shopee';
export const MISSING_STOP_DESCRIPTION = 'Sem número de parada e sequência na planilha';
export const UNRESOLVED_COORDINATE_LABEL = 'Insira o endereço manualmente';

export interface DisplayedRoutePosition {
  stopId: string;
  isShopeePriority: boolean;
  badge: string;
  routeIndex: number;
  displayedPosition: number | null;
  originalStopNumber: number | null;
}

export function isShopeePriorityStop(stop: Pick<GroupedStop, 'packages'>): boolean {
  return stop.packages.length > 0 && stop.packages.every(isShopeePriorityPackage);
}

export function isMissingSpreadsheetStop(stop: Pick<GroupedStop, 'packages'>): boolean {
  return isShopeePriorityStop(stop);
}

export function buildDisplayedRoutePositions(
  stops: readonly Pick<GroupedStop, 'id' | 'packages' | 'stopNumber' | 'originalStopNumber'>[]
): DisplayedRoutePosition[] {
  let nextRegularPosition = 1;

  return stops.map((stop, index) => {
    const isShopeePriority = isShopeePriorityStop(stop);
    const displayedPosition = isShopeePriority ? null : nextRegularPosition++;

    return {
      stopId: stop.id,
      isShopeePriority,
      badge: isShopeePriority ? MISSING_STOP_BADGE : `#${displayedPosition}`,
      routeIndex: index,
      displayedPosition,
      originalStopNumber: stop.originalStopNumber ?? (isShopeePriority ? null : stop.stopNumber),
    };
  });
}

export function buildDisplayedRoutePositionMap(
  stops: readonly Pick<GroupedStop, 'id' | 'packages' | 'stopNumber' | 'originalStopNumber'>[]
): Record<string, DisplayedRoutePosition> {
  return Object.fromEntries(
    buildDisplayedRoutePositions(stops).map(position => [position.stopId, position])
  );
}

export function formatStopBadge(
  stopOrNumber: Pick<GroupedStop, 'packages' | 'stopNumber'> | number | null | undefined
): string {
  if (typeof stopOrNumber === 'number') return `#${stopOrNumber}`;
  if (!stopOrNumber || isShopeePriorityStop(stopOrNumber)) return MISSING_STOP_BADGE;
  return `#${stopOrNumber.stopNumber}`;
}

export function formatRouteOrderBadge(
  stop: Pick<GroupedStop, 'packages'>,
  routeOrder: number
): string {
  return isShopeePriorityStop(stop) ? MISSING_STOP_BADGE : `#${routeOrder}`;
}

export function formatSpreadsheetStopIdentifier(stop: GroupedStop): string {
  return isShopeePriorityStop(stop) ? MISSING_STOP_BADGE : `#${stop.originalStopNumber ?? stop.stopNumber}`;
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

function formatWarningStopIdentifier(
  stop: GroupedStop,
  positions?: Readonly<Record<string, DisplayedRoutePosition>>
): string {
  if (isShopeePriorityStop(stop)) return MISSING_STOP_BADGE;
  return positions?.[stop.id]?.badge ?? formatSpreadsheetStopIdentifier(stop);
}

function formatStopIdentifiers(
  stops: readonly GroupedStop[],
  positions?: Readonly<Record<string, DisplayedRoutePosition>>
): string {
  if (stops.length === 1) return formatWarningStopIdentifier(stops[0], positions);
  if (stops.length === 2) {
    return `${formatWarningStopIdentifier(stops[0], positions)} e ${formatWarningStopIdentifier(stops[1], positions)}`;
  }
  const identifiers = stops.map(stop => formatWarningStopIdentifier(stop, positions));
  return `${identifiers.slice(0, -1).join(', ')} e ${identifiers[identifiers.length - 1]}`;
}

function formatDuplicateAddressWarning(
  targetStop: GroupedStop,
  matchingStops: readonly GroupedStop[],
  positions?: Readonly<Record<string, DisplayedRoutePosition>>
): string {
  return getDuplicateAddressWarning([targetStop, ...matchingStops], targetStop, positions) ?? '';
}

export function getDuplicateAddressWarning(
  stops: readonly GroupedStop[],
  targetStop: GroupedStop,
  positions: Readonly<Record<string, DisplayedRoutePosition>> = buildDisplayedRoutePositionMap(stops)
): string | null {
  const targetKeys = stopBaseAddressKeys(targetStop);
  if (targetKeys.size === 0) return null;

  const matchingStops = stops.filter(stop => {
    if (stop.id === targetStop.id) return false;
    const keys = stopBaseAddressKeys(stop);
    return [...targetKeys].some(key => keys.has(key));
  });
  if (matchingStops.length === 0) return null;

  const numberedMatches = matchingStops.filter(stop => !isShopeePriorityStop(stop));
  const priorityMatches = matchingStops.filter(isShopeePriorityStop);
  const targetIdentifier = formatWarningStopIdentifier(targetStop, positions);
  const targetIsPriority = isShopeePriorityStop(targetStop);

  if (targetIsPriority && numberedMatches.length === 0) {
    if (priorityMatches.length === 1) {
      return 'Há outra entrega #Prioridade neste endereço.';
    }
    return `Há outras ${priorityMatches.length} entregas #Prioridade neste endereço.`;
  }

  if (targetIsPriority && numberedMatches.length > 0) {
    const article = numberedMatches.length === 1 ? 'da parada' : 'das paradas';
    return `Esta Prioridade Shopee tem o mesmo endereço ${article} ${formatStopIdentifiers(numberedMatches, positions)}.`;
  }

  if (numberedMatches.length > 0 && priorityMatches.length === 0) {
    const article = numberedMatches.length === 1 ? 'da parada' : 'das paradas';
    return `Esta parada ${targetIdentifier} tem o mesmo endereço ${article} ${formatStopIdentifiers(numberedMatches, positions)}.`;
  }

  if (numberedMatches.length === 0 && priorityMatches.length === 1) {
    return `Esta parada ${targetIdentifier} tem o mesmo endereço de uma entrega #Prioridade.`;
  }

  if (numberedMatches.length === 0 && priorityMatches.length > 1) {
    return `Esta parada ${targetIdentifier} tem o mesmo endereço de ${priorityMatches.length} entregas #Prioridade.`;
  }

  const article = numberedMatches.length === 1 ? 'da parada' : 'das paradas';
  return `Esta parada ${targetIdentifier} tem o mesmo endereço ${article} ${formatStopIdentifiers(numberedMatches, positions)} e de ${priorityMatches.length} entrega${priorityMatches.length === 1 ? '' : 's'} #Prioridade.`;
}

export function buildDuplicateAddressWarnings(
  stops: readonly GroupedStop[]
): Record<string, string> {
  const positions = buildDisplayedRoutePositionMap(stops);
  const keysByStopId = new Map<string, Set<string>>();
  const stopIdsByKey = new Map<string, Set<string>>();
  const stopsById = new Map<string, GroupedStop>();

  stops.forEach(stop => {
    stopsById.set(stop.id, stop);
    const keys = stopBaseAddressKeys(stop);
    keysByStopId.set(stop.id, keys);

    keys.forEach(key => {
      const stopIds = stopIdsByKey.get(key) ?? new Set<string>();
      stopIds.add(stop.id);
      stopIdsByKey.set(key, stopIds);
    });
  });

  const warnings: Record<string, string> = {};

  stops.forEach(targetStop => {
    const targetKeys = keysByStopId.get(targetStop.id);
    if (!targetKeys || targetKeys.size === 0) return;

    const matchingIds = new Set<string>();
    targetKeys.forEach(key => {
      stopIdsByKey.get(key)?.forEach(stopId => {
        if (stopId !== targetStop.id) matchingIds.add(stopId);
      });
    });

    if (matchingIds.size === 0) return;

    const matchingStops = [...matchingIds]
      .map(stopId => stopsById.get(stopId))
      .filter((stop): stop is GroupedStop => Boolean(stop));
    warnings[targetStop.id] = formatDuplicateAddressWarning(targetStop, matchingStops, positions);
  });

  return warnings;
}

export function getDuplicateAddressSummaryCount(stops: readonly GroupedStop[]): number {
  return Object.keys(buildDuplicateAddressWarnings(stops)).length;
}

export function getBestManualAddress(stop: {
  address?: string;
  zipCode?: string;
  city?: string;
  state?: string;
}): string {
  const address = normalizeAddress(stop.address ?? '').displayAddress;
  const parts = [
    address,
    stop.city?.trim(),
    stop.state?.trim(),
    stop.zipCode?.trim(),
    'Brasil',
  ].filter(Boolean);
  return parts.join(', ');
}
