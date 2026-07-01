import { useRouter } from 'expo-router';
import { useCallback } from 'react';

export function useNavigation() {
  const router = useRouter();

  const goBack = useCallback(() => router.back(), [router]);
  const goToDashboard = useCallback(() => router.push('/(tabs)'), [router]);
  const goToImport = useCallback(() => router.push('/(tabs)/routes/import'), [router]);
  const goToImportSummary = useCallback(() => router.push('/(tabs)/routes/import-summary'), [router]);
  const goToDeliveryPreparation = useCallback(() => router.push('/(tabs)/routes/delivery-preparation'), [router]);
  const goToRouteExecution = useCallback(() => router.push('/(tabs)/routes/route-execution'), [router]);
  const goToRouteCompleted = useCallback(() => router.replace('/(tabs)/routes/route-completed'), [router]);

  return {
    goBack,
    goToDashboard,
    goToImport,
    goToImportSummary,
    goToDeliveryPreparation,
    goToRouteExecution,
    goToRouteCompleted,
  };
}
