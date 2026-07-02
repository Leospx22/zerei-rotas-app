export type RouteDisplayStatus = 'planning' | 'active' | 'completed';

export function deriveRouteDisplayStatus(
  isCurrentRoute: boolean,
  deliveredPackages: number
): RouteDisplayStatus {
  if (!isCurrentRoute) return 'completed';
  return deliveredPackages > 0 ? 'active' : 'planning';
}

export function routeDisplayStatusLabel(status: RouteDisplayStatus): string {
  if (status === 'completed') return 'Concluída';
  if (status === 'active') return 'Em rota';
  return 'Planejada';
}
