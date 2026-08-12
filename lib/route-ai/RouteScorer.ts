import type { GroupedStop } from '@/lib/packageUtils';
import { calculateDistanceKm, getNeighborhood, getStreetName } from './RouteAnalyzer.ts';
import type { RouteAnalysis, RouteScoreFactor, RouteScoreResult } from './OptimizationTypes.ts';

export function scoreRoute(stops: readonly GroupedStop[], analysis: RouteAnalysis): RouteScoreResult {
  const streetRevisits = countRevisits(stops, stop => getStreetName(stop.normalizedAddress));
  const neighborhoodReturns = countRevisits(stops, getNeighborhood);
  const backtracking = countBacktracking(stops);
  const clusterQuality = calculateClusterQuality(stops);
  const spacingPenalty = analysis.averageStopDistanceKm > 4 ? 8 : analysis.averageStopDistanceKm > 2.5 ? 4 : 0;
  const continuityPenalty = Math.min(18, backtracking * 4);

  const factors: RouteScoreFactor[] = [
    {
      label: 'Retornos à rua',
      impact: -Math.min(18, streetRevisits * 3),
      message: `${streetRevisits} retornos para ruas já visitadas.`,
    },
    {
      label: 'Retornos ao bairro',
      impact: -Math.min(16, neighborhoodReturns * 4),
      message: `${neighborhoodReturns} retornos para bairros já visitados.`,
    },
    {
      label: 'Qualidade do agrupamento',
      impact: Math.round(clusterQuality * 18),
      message: clusterQuality >= 0.7 ? 'Agrupamento excelente.' : 'Os agrupamentos podem ficar mais próximos.',
    },
    {
      label: 'Distância média entre paradas',
      impact: -spacingPenalty,
      message: `Espaçamento médio de ${analysis.averageStopDistanceKm.toFixed(1)} km por trecho.`,
    },
    {
      label: 'Continuidade da rota',
      impact: -continuityPenalty,
      message: `${backtracking} sinais de retorno ou zigue-zague detectados.`,
    },
  ];

  const rawScore = 72 + factors.reduce((sum, factor) => sum + factor.impact, 0);
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  const reasons = buildReasons(score, factors, neighborhoodReturns);

  return {
    score,
    summary: `Nota: ${score}`,
    reasons,
    potentialImprovementPercentage: Math.max(0, Math.min(35, Math.round((100 - score) * 0.42))),
    factors,
  };
}

function countRevisits(stops: readonly GroupedStop[], selector: (stop: GroupedStop) => string): number {
  const completed = new Set<string>();
  let previous = '';
  let revisits = 0;

  for (const stop of stops) {
    const key = selector(stop);
    if (!key) continue;
    if (key !== previous && completed.has(key)) revisits++;
    completed.add(key);
    previous = key;
  }

  return revisits;
}

function countBacktracking(stops: readonly GroupedStop[]): number {
  let count = 0;
  for (let index = 2; index < stops.length; index++) {
    const previousLeg = calculateDistanceKm(stops[index - 2], stops[index - 1]);
    const currentLeg = calculateDistanceKm(stops[index - 1], stops[index]);
    const directLeg = calculateDistanceKm(stops[index - 2], stops[index]);
    if (previousLeg + currentLeg > directLeg * 2.4 && currentLeg > 2) count++;
  }
  return count;
}

function calculateClusterQuality(stops: readonly GroupedStop[]): number {
  if (stops.length <= 1) return 1;
  let sameAreaTransitions = 0;
  for (let index = 1; index < stops.length; index++) {
    if (getNeighborhood(stops[index - 1]) === getNeighborhood(stops[index])) {
      sameAreaTransitions++;
    }
  }
  return sameAreaTransitions / (stops.length - 1);
}

function buildReasons(
  score: number,
  factors: readonly RouteScoreFactor[],
  neighborhoodReturns: number
): string[] {
  const positive = factors.find(factor => factor.label === 'Qualidade do agrupamento')?.message ?? 'Agrupamento calculado.';
  const reasons = [positive];
  if (neighborhoodReturns > 0) {
    reasons.push(`${neighborhoodReturns} retorno${neighborhoodReturns === 1 ? '' : 's'} desnecessário${neighborhoodReturns === 1 ? '' : 's'} ao bairro detectado${neighborhoodReturns === 1 ? '' : 's'}.`);
  }
  if (score < 85) {
    reasons.push(`Melhoria possível: ${Math.max(5, Math.round((100 - score) * 0.42))}%`);
  }
  return reasons;
}
