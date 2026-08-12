import type { GroupedStop } from '@/lib/packageUtils';
import type {
  CategoryLearningMetrics,
  DeliveryCategory,
  RouteLearningState,
} from './LearningTypes.ts';
import { roundMetric } from './DriverProfile.ts';

const CATEGORY_KEYWORDS: Record<Exclude<DeliveryCategory, 'unknown'>, RegExp[]> = {
  residential: [/casa/i, /residencial/i, /rua/i],
  commercial: [/loja/i, /comercial/i, /sala/i, /office/i, /empresa/i],
  apartments: [/apartamento/i, /\bap\b/i, /\bapto\b/i, /bloco/i, /torre/i],
  condos: [/condominio/i, /condomínio/i, /residencial/i],
  'shopping-centers': [/shopping/i, /mall/i, /centro comercial/i],
  'industrial-areas': [/industrial/i, /galpao/i, /galpão/i, /distrito/i],
};

export function classifyDeliveryCategory(stop: Pick<GroupedStop, 'normalizedAddress' | 'addressGroups'>): DeliveryCategory {
  const text = [
    stop.normalizedAddress,
    ...stop.addressGroups.map(group => group.normalizedAddress),
  ].join(' ');

  for (const [category, patterns] of Object.entries(CATEGORY_KEYWORDS)) {
    if (patterns.some(pattern => pattern.test(text))) return category as DeliveryCategory;
  }

  return 'unknown';
}

export function summarizeRouteCategories(stops: readonly GroupedStop[]): Record<DeliveryCategory, CategoryLearningMetrics> {
  const metrics = createEmptyCategoryMetrics();

  for (const stop of stops) {
    const category = classifyDeliveryCategory(stop);
    const current = metrics[category];
    const nextStops = current.stops + 1;
    metrics[category] = {
      ...current,
      stops: nextStops,
      skippedStops: current.skippedStops + Number(stop.status === 'skipped'),
      deliveredStops: current.deliveredStops + Number(stop.status === 'completed'),
      averagePackagesPerStop: roundMetric(
        (current.averagePackagesPerStop * current.stops + stop.packageCount) / nextStops
      ),
    };
  }

  return metrics;
}

export function mergeCategoryMetrics(
  current: RouteLearningState['categoryMetrics'],
  next: Record<DeliveryCategory, CategoryLearningMetrics>
): RouteLearningState['categoryMetrics'] {
  const merged = { ...current };

  for (const category of Object.keys(next) as DeliveryCategory[]) {
    const existing = current[category];
    const incoming = next[category];
    if (incoming.stops === 0) continue;
    const totalStops = existing.stops + incoming.stops;
    merged[category] = {
      category,
      stops: totalStops,
      skippedStops: existing.skippedStops + incoming.skippedStops,
      deliveredStops: existing.deliveredStops + incoming.deliveredStops,
      averagePackagesPerStop: roundMetric(
        ((existing.averagePackagesPerStop * existing.stops) +
          (incoming.averagePackagesPerStop * incoming.stops)) /
        totalStops
      ),
    };
  }

  return merged;
}

export function createEmptyCategoryMetrics(): Record<DeliveryCategory, CategoryLearningMetrics> {
  return {
    residential: emptyMetric('residential'),
    commercial: emptyMetric('commercial'),
    apartments: emptyMetric('apartments'),
    condos: emptyMetric('condos'),
    'shopping-centers': emptyMetric('shopping-centers'),
    'industrial-areas': emptyMetric('industrial-areas'),
    unknown: emptyMetric('unknown'),
  };
}

function emptyMetric(category: DeliveryCategory): CategoryLearningMetrics {
  return {
    category,
    stops: 0,
    skippedStops: 0,
    deliveredStops: 0,
    averagePackagesPerStop: 0,
  };
}

