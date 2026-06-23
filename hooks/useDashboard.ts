import { useMemo } from 'react';
import { useRoute } from '@/contexts/RouteContext';

const KM_PER_STOP = 3.5;
const MINUTES_PER_STOP = 8;

export function getMotivationalMessage(delivered: number, total: number): string {
  if (total === 0) return 'Importe uma planilha para começar sua rota.';
  if (delivered === 0) return 'Boa rota! Dirija com segurança.';
  const remaining = total - delivered;
  const pct = (delivered / total) * 100;
  if (delivered === total) return 'Rota zerada! Parabéns, campeão!';
  if (remaining <= 15) return `Faltam apenas ${remaining} pacote${remaining !== 1 ? 's' : ''}. Você está quase zerando a rota!`;
  if (pct >= 50) return 'Excelente! Você já passou da metade.';
  if (pct >= 25) return 'Bom ritmo! Você está avançando bem na rota.';
  return 'Boa rota! Dirija com segurança.';
}

export function useDashboard() {
  const { currentRoute } = useRoute();

  return useMemo(() => {
    const hasRoute = !!currentRoute;
    const total = currentRoute?.totalPackages ?? 0;
    const delivered = currentRoute?.deliveredPackages ?? 0;
    const totalStops = currentRoute?.stops.length ?? 0;
    const completedStops = currentRoute?.completedStops ?? 0;
    const pending = total - delivered;
    const remainingStops = totalStops - completedStops;
    const progressPct = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const remainingKm = Math.round(remainingStops * KM_PER_STOP * 10) / 10;
    const remainingMins = remainingStops * MINUTES_PER_STOP;
    const remainingHours = Math.floor(remainingMins / 60);
    const remainingMinRem = remainingMins % 60;
    const distanceKm = currentRoute?.estimatedDistanceKm ?? 0;
    const motivationalMessage = getMotivationalMessage(delivered, total);

    const largestStop = currentRoute?.stops.length
      ? currentRoute.stops.reduce((max, s) => s.packageCount > max.packageCount ? s : max, currentRoute.stops[0])
      : null;

    return {
      hasRoute,
      total,
      delivered,
      pending,
      totalStops,
      completedStops,
      remainingStops,
      progressPct,
      remainingKm,
      remainingMins,
      remainingHours,
      remainingMinRem,
      distanceKm,
      motivationalMessage,
      largestStop,
      routeName: currentRoute?.name ?? '',
      routeStatus: currentRoute?.status ?? null,
      durationMinutes: currentRoute?.durationMinutes ?? 0,
    };
  }, [currentRoute]);
}
