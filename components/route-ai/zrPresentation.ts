import type { RouteScoreFactor } from '@/lib/route-ai';

export type ZRScoreBand = 'Excelente' | 'Boa' | 'Regular' | 'Ruim';

export interface ZRExplanationItem {
  label: string;
  detail: string;
}

export function getZRScoreBand(score: number): ZRScoreBand {
  if (score >= 85) return 'Excelente';
  if (score >= 70) return 'Boa';
  if (score >= 50) return 'Regular';
  return 'Ruim';
}

export function buildZRExplanations(factors: readonly RouteScoreFactor[]): ZRExplanationItem[] {
  const explanations: ZRExplanationItem[] = [];
  const clusterQuality = factors.find(factor => factor.label === 'Qualidade do agrupamento');
  const routeContinuity = factors.find(factor => factor.label === 'Continuidade da rota');
  const neighborhoodReturns = factors.find(factor => factor.label === 'Retornos ao bairro');
  const streetRevisits = factors.find(factor => factor.label === 'Retornos à rua');
  const averageSpacing = factors.find(factor => factor.label === 'Distância média entre paradas');

  if (clusterQuality && clusterQuality.impact > 0) {
    explanations.push({
      label: 'Agrupamento melhor',
      detail: clusterQuality.message,
    });
  }

  if (routeContinuity && routeContinuity.impact >= -4) {
    explanations.push({
      label: 'Continuidade melhor entre paradas',
      detail: routeContinuity.message,
    });
  }

  if (streetRevisits && streetRevisits.impact >= -3) {
    explanations.push({
      label: 'Menos retornos à rua',
      detail: streetRevisits.message,
    });
  }

  if (neighborhoodReturns && neighborhoodReturns.impact >= -4) {
    explanations.push({
      label: 'Menos retornos ao bairro',
      detail: neighborhoodReturns.message,
    });
  }

  if (averageSpacing) {
    explanations.push({
      label: 'Menor distância média entre paradas',
      detail: averageSpacing.message,
    });
  }

  return explanations.slice(0, 4);
}

export function formatMinutes(minutes: number): string {
  return `${Math.round(minutes)} min`;
}

export function formatDistance(distanceKm: number): string {
  return `${distanceKm.toFixed(1)} km`;
}

export function formatFuelCurrency(liters: number, fuelPricePerLiter = 6.1): string {
  return (liters * fuelPricePerLiter).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

