import type { RouteData } from '@/contexts/RouteContext';
import type { GroupedStop } from '../packageUtils.ts';
import { calculateDistanceKm, roundDistance } from './RouteAnalyzer.ts';
import { analyzeRouteAssistantInsights } from './RouteAssistantAnalyzer.ts';

export type RoutePaceStatus = 'ahead' | 'on-pace' | 'behind';

export interface ExecutionProductivitySnapshot {
  completedStops: number;
  remainingStops: number;
  deliveredPackages: number;
  remainingPackages: number;
  totalStops: number;
  totalPackages: number;
  elapsedMinutes: number;
  estimatedCompletionTime: number | null;
  averagePackagesPerHour: number;
  pace: RoutePaceStatus;
  paceLabel: string;
  tips: string[];
  achievementMessage: string | null;
}

const DEFAULT_MINUTES_PER_STOP = 3.5;
const LARGE_STOP_PACKAGE_THRESHOLD = 8;
const MANY_PACKAGES_REMAINING_THRESHOLD = 25;
const LONG_NEXT_LEG_KM = 5;

export function buildExecutionProductivitySnapshot(
  route: RouteData,
  now = Date.now()
): ExecutionProductivitySnapshot {
  const completedStops = route.completedStops;
  const deliveredPackages = route.deliveredPackages;
  const totalStops = route.stops.length;
  const totalPackages = route.totalPackages;
  const remainingStops = Math.max(0, totalStops - completedStops);
  const remainingPackages = Math.max(0, totalPackages - deliveredPackages);
  const elapsedMinutes = route.startTime
    ? Math.max(0, Math.round((now - route.startTime) / 60000))
    : 0;
  const averagePackagesPerHour =
    elapsedMinutes > 0 ? roundRate((deliveredPackages / elapsedMinutes) * 60) : 0;
  const estimatedTotalMinutes = getEstimatedTotalMinutes(route);
  const estimatedRemainingMinutes = getEstimatedRemainingMinutes(
    elapsedMinutes,
    completedStops,
    remainingStops,
    estimatedTotalMinutes
  );
  const estimatedCompletionTime =
    remainingStops > 0 ? now + estimatedRemainingMinutes * 60000 : now;
  const pace = getRoutePace({
    completedStops,
    totalStops,
    elapsedMinutes,
    estimatedTotalMinutes,
    estimatedRemainingMinutes,
  });
  const remainingRouteStops = route.stops.filter(stop => stop.status === 'pending');

  return {
    completedStops,
    remainingStops,
    deliveredPackages,
    remainingPackages,
    totalStops,
    totalPackages,
    elapsedMinutes,
    estimatedCompletionTime,
    averagePackagesPerHour,
    pace,
    paceLabel: formatPaceLabel(pace),
    tips: buildExecutionTips(route, remainingRouteStops, {
      remainingPackages,
      remainingStops,
      averagePackagesPerHour,
      pace,
    }),
    achievementMessage: buildAchievementMessage(completedStops, totalStops, remainingStops),
  };
}

export function formatExecutionEta(timestamp: number | null): string {
  if (!timestamp) return '--:--';
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEstimatedTotalMinutes(route: RouteData): number {
  const reportEstimate =
    route.routeAIReport?.optimization.estimatedDurationMinutes ??
    route.routeAIReport?.analysis.estimatedOriginalDurationMinutes;
  if (reportEstimate && reportEstimate > 0) return reportEstimate;
  return Math.max(route.stops.length * DEFAULT_MINUTES_PER_STOP, DEFAULT_MINUTES_PER_STOP);
}

function getEstimatedRemainingMinutes(
  elapsedMinutes: number,
  completedStops: number,
  remainingStops: number,
  estimatedTotalMinutes: number
): number {
  if (remainingStops <= 0) return 0;
  if (completedStops > 0 && elapsedMinutes > 0) {
    return Math.max(1, Math.round((elapsedMinutes / completedStops) * remainingStops));
  }
  return Math.max(1, Math.round(Math.max(estimatedTotalMinutes - elapsedMinutes, remainingStops)));
}

function getRoutePace({
  completedStops,
  totalStops,
  elapsedMinutes,
  estimatedTotalMinutes,
  estimatedRemainingMinutes,
}: {
  completedStops: number;
  totalStops: number;
  elapsedMinutes: number;
  estimatedTotalMinutes: number;
  estimatedRemainingMinutes: number;
}): RoutePaceStatus {
  if (totalStops === 0 || elapsedMinutes < 5 || completedStops === 0) return 'on-pace';

  const expectedCompletedStops = (elapsedMinutes / estimatedTotalMinutes) * totalStops;
  const projectedTotalMinutes = elapsedMinutes + estimatedRemainingMinutes;

  if (
    completedStops >= expectedCompletedStops + 1 ||
    projectedTotalMinutes <= estimatedTotalMinutes * 0.9
  ) {
    return 'ahead';
  }

  if (
    completedStops + 1 < expectedCompletedStops ||
    projectedTotalMinutes >= estimatedTotalMinutes * 1.15
  ) {
    return 'behind';
  }

  return 'on-pace';
}

function formatPaceLabel(pace: RoutePaceStatus): string {
  if (pace === 'ahead') return 'Adiantado';
  if (pace === 'behind') return 'Atrasado';
  return 'No ritmo';
}

function buildExecutionTips(
  route: RouteData,
  remainingStops: GroupedStop[],
  progress: {
    remainingPackages: number;
    remainingStops: number;
    averagePackagesPerHour: number;
    pace: RoutePaceStatus;
  }
): string[] {
  const tips: string[] = [];
  const currentStop = remainingStops[0] ?? null;
  const nextStop = remainingStops[1] ?? null;
  const assistantAnalysis = analyzeRouteAssistantInsights(remainingStops, {
    largeStopPackageThreshold: LARGE_STOP_PACKAGE_THRESHOLD,
    longLegDistanceKm: LONG_NEXT_LEG_KM,
  });

  const largeStopInsight = assistantAnalysis.insights.find(
    insight => insight.type === 'large-stop' && (!currentStop || insight.stopIds.includes(currentStop.id))
  );
  if (largeStopInsight) {
    tips.push(`Parada grande à frente: ${largeStopInsight.packageCount ?? currentStop?.packageCount} pacotes.`);
  }

  if (progress.remainingPackages >= MANY_PACKAGES_REMAINING_THRESHOLD) {
    tips.push(`Ainda há ${progress.remainingPackages} pacotes nesta rota.`);
  }

  if (currentStop && nextStop) {
    const nextDistanceKm = roundDistance(calculateDistanceKm(currentStop, nextStop));
    if (nextDistanceKm >= LONG_NEXT_LEG_KM) {
      tips.push(`Próxima parada distante: cerca de ${nextDistanceKm} km.`);
    }
  }

  if (progress.remainingStops > 0 && progress.remainingStops <= 3) {
    tips.push(`Reta final: faltam ${progress.remainingStops} paradas.`);
  }

  if (
    route.deliveredPackages >= 10 &&
    progress.pace === 'ahead' &&
    progress.averagePackagesPerHour >= 20
  ) {
    tips.push('Ritmo excelente hoje. Mantenha esse fluxo.');
  }

  if (tips.length === 0) {
    tips.push('Rota estável. Continue confirmando cada entrega.');
  }

  return tips.slice(0, 3);
}

function buildAchievementMessage(
  completedStops: number,
  totalStops: number,
  remainingStops: number
): string | null {
  if (totalStops > 0 && remainingStops === 1) return 'Última parada';
  if (completedStops > 0 && completedStops % 10 === 0) return '10 paradas concluídas';
  if (totalStops > 1 && completedStops >= Math.ceil(totalStops / 2)) return 'Metade da rota concluída';
  if (completedStops === 1) return 'Primeira parada concluída';
  return null;
}

function roundRate(value: number): number {
  return Math.round(value * 10) / 10;
}
