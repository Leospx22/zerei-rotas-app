import type { GroupedStop } from '../packageUtils.ts';
import { calculateDistanceKm, hasCoordinate, roundDistance } from './RouteAnalyzer.ts';

export type RouteAssistantInsightType =
  | 'duplicate-address'
  | 'duplicate-stop-number'
  | 'missing-complement'
  | 'large-stop'
  | 'long-optimized-leg'
  | 'potential-anomaly';

export type RouteAssistantInsightSeverity = 'info' | 'warning' | 'critical';

export interface RouteAssistantInsight {
  id: string;
  type: RouteAssistantInsightType;
  severity: RouteAssistantInsightSeverity;
  title: string;
  message: string;
  recommendation: string;
  stopIds: string[];
  packageCount?: number;
  distanceKm?: number;
}

export interface RouteAssistantSummary {
  totalInsights: number;
  warningCount: number;
  criticalCount: number;
  recommendationCount: number;
}

export interface RouteAssistantAnalysis {
  generatedAt: string;
  provider: 'local';
  summary: RouteAssistantSummary;
  insights: RouteAssistantInsight[];
}

export interface RouteAssistantAnalyzerProvider {
  readonly id: 'local' | 'openai' | string;
  readonly label: string;
  analyze(stops: readonly GroupedStop[]): Promise<RouteAssistantAnalysis> | RouteAssistantAnalysis;
}

export interface RouteAssistantAnalysisOptions {
  largeStopPackageThreshold: number;
  criticalStopPackageThreshold: number;
  longLegDistanceKm: number;
  missingComplementPackageThreshold: number;
}

export const DEFAULT_ROUTE_ASSISTANT_OPTIONS: RouteAssistantAnalysisOptions = {
  largeStopPackageThreshold: 8,
  criticalStopPackageThreshold: 14,
  longLegDistanceKm: 5,
  missingComplementPackageThreshold: 2,
};

const COMPLEMENT_PATTERN =
  /\b(apto|apt|apartamento|bloco|bl|torre|casa|fundos|sala|loja|cj|conjunto|quadra|lote|lt|unidade|andar)\b/i;

export class LocalRouteAssistantAnalyzer implements RouteAssistantAnalyzerProvider {
  readonly id = 'local';
  readonly label = 'Assistente local de rota';
  private readonly options: RouteAssistantAnalysisOptions;

  constructor(options: RouteAssistantAnalysisOptions = DEFAULT_ROUTE_ASSISTANT_OPTIONS) {
    this.options = options;
  }

  analyze(stops: readonly GroupedStop[]): RouteAssistantAnalysis {
    const insights = [
      ...detectDuplicateAddresses(stops),
      ...detectDuplicateStopNumbers(stops),
      ...detectMissingComplements(stops, this.options),
      ...detectLargeStops(stops, this.options),
      ...detectLongOptimizedLegs(stops, this.options),
      ...detectPotentialAnomalies(stops),
    ];

    return {
      generatedAt: new Date().toISOString(),
      provider: this.id,
      summary: summarizeInsights(insights),
      insights,
    };
  }
}

export function analyzeRouteAssistantInsights(
  stops: readonly GroupedStop[],
  options: Partial<RouteAssistantAnalysisOptions> = {}
): RouteAssistantAnalysis {
  const analyzer = new LocalRouteAssistantAnalyzer({
    ...DEFAULT_ROUTE_ASSISTANT_OPTIONS,
    ...options,
  });
  return analyzer.analyze(stops);
}

function detectDuplicateAddresses(stops: readonly GroupedStop[]): RouteAssistantInsight[] {
  return groupStops(stops, stop => normalizeKey(stop.normalizedAddress))
    .filter(group => group.stops.length > 1)
    .map(group => ({
      id: `duplicate-address-${group.key}`,
      type: 'duplicate-address',
      severity: 'warning',
      title: 'Endereço duplicado',
      message: `${group.stops.length} paradas usam o mesmo endereço: ${group.stops[0].normalizedAddress}.`,
      recommendation: 'Conferir se os pacotes deveriam estar na mesma parada antes de iniciar a rota.',
      stopIds: group.stops.map(stop => stop.id),
      packageCount: sumPackages(group.stops),
    }));
}

function detectDuplicateStopNumbers(stops: readonly GroupedStop[]): RouteAssistantInsight[] {
  return groupStops(stops, stop => stop.originalStopNumber === null ? '' : String(stop.originalStopNumber))
    .filter(group => group.key && group.stops.length > 1)
    .map(group => ({
      id: `duplicate-stop-number-${group.key}`,
      type: 'duplicate-stop-number',
      severity: 'critical',
      title: 'Número de parada repetido',
      message: `A parada #${group.key} aparece em ${group.stops.length} endereços diferentes.`,
      recommendation: 'Validar a planilha ou separar manualmente esses pontos antes da execução.',
      stopIds: group.stops.map(stop => stop.id),
      packageCount: sumPackages(group.stops),
    }));
}

function detectMissingComplements(
  stops: readonly GroupedStop[],
  options: RouteAssistantAnalysisOptions
): RouteAssistantInsight[] {
  return stops
    .filter(stop => stop.packageCount >= options.missingComplementPackageThreshold)
    .filter(stop => stop.addressGroups.some(group =>
      group.packageCount >= options.missingComplementPackageThreshold &&
      !group.isCondominium &&
      !hasComplement(group.originalAddress) &&
      stop.packages
        .filter(pkg => normalizeKey(pkg.destinationAddress).includes(normalizeKey(group.originalAddress)))
        .every(pkg => !hasComplement(pkg.destinationAddress))
    ))
    .map(stop => ({
      id: `missing-complement-${stop.id}`,
      type: 'missing-complement',
      severity: stop.packageCount >= options.largeStopPackageThreshold ? 'warning' : 'info',
      title: 'Complemento possivelmente ausente',
      message: `Parada #${stop.stopNumber} tem ${stop.packageCount} pacotes no mesmo ponto sem apartamento, bloco ou sala.`,
      recommendation: 'Antes de sair do veículo, confira se há complemento no pacote físico ou no app da transportadora.',
      stopIds: [stop.id],
      packageCount: stop.packageCount,
    }));
}

function detectLargeStops(
  stops: readonly GroupedStop[],
  options: RouteAssistantAnalysisOptions
): RouteAssistantInsight[] {
  return stops
    .filter(stop => stop.packageCount >= options.largeStopPackageThreshold)
    .map(stop => ({
      id: `large-stop-${stop.id}`,
      type: 'large-stop',
      severity: stop.packageCount >= options.criticalStopPackageThreshold ? 'critical' : 'warning',
      title: 'Parada com muitos pacotes',
      message: `Parada #${stop.stopNumber} concentra ${stop.packageCount} pacotes.`,
      recommendation: 'Separar os pacotes dessa parada antes de iniciar para reduzir tempo parado.',
      stopIds: [stop.id],
      packageCount: stop.packageCount,
    }));
}

function detectLongOptimizedLegs(
  stops: readonly GroupedStop[],
  options: RouteAssistantAnalysisOptions
): RouteAssistantInsight[] {
  const orderedStops = getOptimizedOrder(stops);
  const insights: RouteAssistantInsight[] = [];

  for (let index = 1; index < orderedStops.length; index++) {
    const previous = orderedStops[index - 1];
    const current = orderedStops[index];
    const distanceKm = calculateDistanceKm(previous, current);

    if (distanceKm < options.longLegDistanceKm) continue;

    insights.push({
      id: `long-optimized-leg-${previous.id}-${current.id}`,
      type: 'long-optimized-leg',
      severity: distanceKm >= options.longLegDistanceKm * 1.8 ? 'critical' : 'warning',
      title: 'Trecho longo na ordem otimizada',
      message: `Entre as paradas #${previous.stopNumber} e #${current.stopNumber} há cerca de ${roundDistance(distanceKm)} km.`,
      recommendation: 'Conferir se esse salto faz sentido antes de seguir a sequência sugerida.',
      stopIds: [previous.id, current.id],
      distanceKm: roundDistance(distanceKm),
    });
  }

  return insights;
}

function detectPotentialAnomalies(stops: readonly GroupedStop[]): RouteAssistantInsight[] {
  const insights: RouteAssistantInsight[] = [];
  const missingCoordinates = stops.filter(stop => !hasCoordinate(stop));
  const multiAddressStops = stops.filter(stop => stop.addressCount >= 3);
  const missingImportedStopNumbers = stops.filter(stop => stop.originalStopNumber === null);

  if (missingCoordinates.length > 0) {
    insights.push({
      id: 'potential-anomaly-missing-coordinates',
      type: 'potential-anomaly',
      severity: missingCoordinates.length / Math.max(stops.length, 1) > 0.35 ? 'warning' : 'info',
      title: 'Coordenadas incompletas',
      message: `${missingCoordinates.length} paradas não têm latitude/longitude importadas.`,
      recommendation: 'Use o endereço manualmente no mapa se a navegação abrir no ponto errado.',
      stopIds: missingCoordinates.map(stop => stop.id),
    });
  }

  for (const stop of multiAddressStops) {
    insights.push({
      id: `potential-anomaly-multi-address-${stop.id}`,
      type: 'potential-anomaly',
      severity: 'warning',
      title: 'Parada com muitos endereços internos',
      message: `Parada #${stop.stopNumber} contém ${stop.addressCount} endereços agrupados.`,
      recommendation: 'Conferir se todos pertencem ao mesmo local antes de marcar a parada como concluída.',
      stopIds: [stop.id],
      packageCount: stop.packageCount,
    });
  }

  if (missingImportedStopNumbers.length > 0) {
    insights.push({
      id: 'potential-anomaly-missing-stop-number',
      type: 'potential-anomaly',
      severity: 'info',
      title: 'Paradas sem número importado',
      message: `${missingImportedStopNumbers.length} paradas foram criadas sem número de Stop na planilha.`,
      recommendation: 'Revise as prioridades Shopee e confira se a ordem exibida está adequada.',
      stopIds: missingImportedStopNumbers.map(stop => stop.id),
    });
  }

  return insights;
}

function summarizeInsights(insights: readonly RouteAssistantInsight[]): RouteAssistantSummary {
  return {
    totalInsights: insights.length,
    warningCount: insights.filter(insight => insight.severity === 'warning').length,
    criticalCount: insights.filter(insight => insight.severity === 'critical').length,
    recommendationCount: insights.filter(insight => insight.recommendation.trim().length > 0).length,
  };
}

function getOptimizedOrder(stops: readonly GroupedStop[]): GroupedStop[] {
  return [...stops].sort((left, right) => {
    const leftOrder = left.optimizedOrderIndex ?? left.orderIndex;
    const rightOrder = right.optimizedOrderIndex ?? right.orderIndex;
    return leftOrder - rightOrder;
  });
}

function groupStops(
  stops: readonly GroupedStop[],
  selector: (stop: GroupedStop) => string
): Array<{ key: string; stops: GroupedStop[] }> {
  const groups = new Map<string, GroupedStop[]>();
  for (const stop of stops) {
    const key = selector(stop);
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(stop);
    groups.set(key, group);
  }
  return [...groups.entries()].map(([key, groupedStops]) => ({ key, stops: groupedStops }));
}

function hasComplement(address: string): boolean {
  return COMPLEMENT_PATTERN.test(address);
}

function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function sumPackages(stops: readonly GroupedStop[]): number {
  return stops.reduce((sum, stop) => sum + stop.packageCount, 0);
}
