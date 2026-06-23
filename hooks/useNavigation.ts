import { useRouter } from 'expo-router';
import { useCallback } from 'react';

export function useNavigation() {
  const router = useRouter();

  const goBack = useCallback(() => router.back(), [router]);
  const goToDashboard = useCallback(() => router.push('/(tabs)'), [router]);
  const goToImport = useCallback(() => router.push('/import'), [router]);
  const goToImportSummary = useCallback(() => router.push('/import-summary'), [router]);
  const goToDeliveryPreparation = useCallback(() => router.push('/delivery-preparation'), [router]);
  const goToRouteExecution = useCallback(() => router.push('/route-execution'), [router]);
  const goToRouteCompleted = useCallback(() => router.replace('/route-completed'), [router]);

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
