export type RouteDisplayStatus = 'planning' | 'active' | 'completed';

export function deriveRouteDisplayStatus(
  isCurrentRoute: boolean,
  deliveredPackages: number,
  hasStarted = false
): RouteDisplayStatus {
  if (!isCurrentRoute) return 'completed';
  return hasStarted || deliveredPackages > 0 ? 'active' : 'planning';
}

export function routeDisplayStatusLabel(status: RouteDisplayStatus): string {
  if (status === 'completed') return 'Concluída';
  if (status === 'active') return 'Em rota';
  return 'Planejada';
}

export function routePrimaryActionLabel(status: RouteDisplayStatus): string | null {
  if (status === 'completed') return null;
  if (status === 'active') return 'Continuar entrega';
  return 'Começar entrega';
}
