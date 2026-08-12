import type { RouteScoreFactor } from '@/lib/route-ai';

export type ZRScoreBand = 'Excellent' | 'Good' | 'Fair' | 'Poor';

export interface ZRExplanationItem {
  label: string;
  detail: string;
}

export function getZRScoreBand(score: number): ZRScoreBand {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Poor';
}

export function buildZRExplanations(factors: readonly RouteScoreFactor[]): ZRExplanationItem[] {
  const explanations: ZRExplanationItem[] = [];
  const clusterQuality = factors.find(factor => factor.label === 'Cluster quality');
  const routeContinuity = factors.find(factor => factor.label === 'Route continuity');
  const neighborhoodReturns = factors.find(factor => factor.label === 'Neighborhood returns');
  const streetRevisits = factors.find(factor => factor.label === 'Street revisits');
  const averageSpacing = factors.find(factor => factor.label === 'Average stop spacing');

  if (clusterQuality && clusterQuality.impact > 0) {
    explanations.push({
      label: 'Better clustering',
      detail: clusterQuality.message,
    });
  }

  if (routeContinuity && routeContinuity.impact >= -4) {
    explanations.push({
      label: 'Improved stop continuity',
      detail: routeContinuity.message,
    });
  }

  if (streetRevisits && streetRevisits.impact >= -3) {
    explanations.push({
      label: 'Fewer street revisits',
      detail: streetRevisits.message,
    });
  }

  if (neighborhoodReturns && neighborhoodReturns.impact >= -4) {
    explanations.push({
      label: 'Fewer neighborhood returns',
      detail: neighborhoodReturns.message,
    });
  }

  if (averageSpacing) {
    explanations.push({
      label: 'Lower average stop distance',
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

