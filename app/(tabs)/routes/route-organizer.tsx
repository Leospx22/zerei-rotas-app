import React, { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpDown,
  CheckCircle2,
  Copy,
  MapPin,
  Package,
  Play,
  Trash2,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { HeaderBrandIcon } from '@/components/HeaderBrandIcon';
import { AIInsightsCard } from '@/components/route-ai';
import { FadeInView, ScreenSkeleton } from '@/components/ui';
import { useRoute } from '@/contexts/RouteContext';
import type { GroupedStop } from '@/lib/packageUtils';
import {
  buildDuplicateAddressWarnings,
  buildDisplayedRoutePositionMap,
  formatRouteOrderBadge,
  formatStopBadge,
  SHOPEE_PRIORITY_LABEL,
} from '@/lib/routeStopPresentation';

const EMPTY_ROUTE_STOPS: GroupedStop[] = [];

export default function RouteOrganizerScreen() {
  const router = useRouter();
  const { currentRoute, isLoading, removeDuplicates, reorderStops, setCurrentRoute } = useRoute();
  const routeStops = currentRoute?.stops ?? EMPTY_ROUTE_STOPS;
  const duplicateCount =
    routeStops.length - new Set(routeStops.map(stop => stop.normalizedAddress.toLowerCase().trim())).size;
  const duplicateWarnings = useMemo(
    () => buildDuplicateAddressWarnings(routeStops),
    [routeStops]
  );
  const displayedPositions = useMemo(
    () => buildDisplayedRoutePositionMap(routeStops),
    [routeStops]
  );

  if (isLoading) {
    return <ScreenSkeleton message="Carregando organizador de rota..." rows={6} />;
  }

  if (!currentRoute) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Nenhuma rota criada</Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/routes/import')}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel="Importar planilha"
        >
          <Text style={styles.emptyLink}>Importar planilha</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const startRoute = () => {
    setCurrentRoute({
      ...currentRoute,
      status: 'active',
      startTime: Date.now(),
    });
    router.push('/(tabs)/routes/route-execution');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <FadeInView>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <HeaderBrandIcon size={20} />
            <Text style={styles.headerTitle}>Organizar Rota</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </FadeInView>

      <FadeInView delay={40}>
        <View style={styles.summaryCard}>
          <LinearGradient
            colors={[Colors.primary[500], Colors.primary[700]]}
            style={styles.summaryGradient}
          >
            <Text style={styles.routeName}>{currentRoute.name}</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryItem}>
                <Package size={16} color={Colors.gold[400]} />
                <Text style={styles.summaryValue}>{currentRoute.totalPackages}</Text>
                <Text style={styles.summaryLabel}>Pacotes</Text>
              </View>
              <View style={styles.summaryItem}>
                <MapPin size={16} color={Colors.gold[400]} />
                <Text style={styles.summaryValue}>{currentRoute.stops.length}</Text>
                <Text style={styles.summaryLabel}>Paradas</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </FadeInView>

      <Text style={styles.sectionTitle}>Acoes</Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={removeDuplicates}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel="Remover duplicatas da rota"
        >
          <Copy size={22} color={Colors.gold[400]} />
          <Text style={styles.actionLabel}>Remover</Text>
          <Text style={styles.actionLabel}>Duplicatas</Text>
          {duplicateCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{duplicateCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={reorderStops}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel="Reordenar paradas"
        >
          <ArrowUpDown size={22} color={Colors.gold[400]} />
          <Text style={styles.actionLabel}>Reordenar</Text>
          <Text style={styles.actionLabel}>Paradas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {
            Alert.alert('Confirmar', 'Limpar todas as paradas?', [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Limpar',
                style: 'destructive',
                onPress: () =>
                  setCurrentRoute({
                    ...currentRoute,
                    stops: [],
                    totalPackages: 0,
                    estimatedDistanceKm: 0,
                  }),
              },
            ]);
          }}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel="Limpar todas as paradas"
        >
          <Trash2 size={22} color={Colors.error} />
          <Text style={[styles.actionLabel, styles.dangerText]}>Limpar</Text>
          <Text style={[styles.actionLabel, styles.dangerText]}>Tudo</Text>
        </TouchableOpacity>
      </View>

      <AIInsightsCard stops={currentRoute.stops} />

      <Text style={styles.sectionTitle}>
        Paradas Agrupadas ({currentRoute.stops.length})
      </Text>

      {currentRoute.stops.map((stop, index) => (
        <FadeInView key={stop.id} delay={Math.min(index * 24, 180)}>
          <OrganizerStopCard
            stop={stop}
            index={index}
            displayedBadge={displayedPositions[stop.id]?.badge}
            duplicateWarning={duplicateWarnings[stop.id]}
          />
        </FadeInView>
      ))}

      {currentRoute.stops.length > 0 ? (
        <TouchableOpacity
          style={styles.startButton}
          onPress={startRoute}
          activeOpacity={0.84}
          accessibilityRole="button"
          accessibilityLabel="Iniciar rota"
        >
          <LinearGradient
            colors={[Colors.gold[500], Colors.gold[700]]}
            style={styles.startGradient}
          >
            <Play size={24} color={Colors.primary[900]} />
            <Text style={styles.startText}>Iniciar Rota</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const OrganizerStopCard = React.memo(function OrganizerStopCard({
  stop,
  index,
  displayedBadge,
  duplicateWarning,
}: {
  stop: GroupedStop;
  index: number;
  displayedBadge?: string;
  duplicateWarning?: string;
}) {
  const stopBadge = formatStopBadge(stop);
  const routeBadge = displayedBadge ?? formatRouteOrderBadge(stop, index + 1);

  return (
    <View style={styles.stopCard}>
      <View style={styles.stopNumberCircle}>
        <Text style={styles.stopNumberText}>{routeBadge}</Text>
      </View>
      <View style={styles.stopContent}>
        <Text style={styles.stopAddress}>{stop.normalizedAddress}</Text>
        <View style={styles.stopMetaRow}>
          <Text style={styles.stopMeta}>
            {stop.packageCount} pacote{stop.packageCount !== 1 ? 's' : ''} - Parada {formatStopBadge(stop)}
          </Text>
          {stopBadge === '#P' ? (
            <Text style={styles.stopHint}>{SHOPEE_PRIORITY_LABEL}</Text>
          ) : null}
          {duplicateWarning ? (
            <View style={styles.warningRow}>
              <AlertTriangle size={12} color={Colors.warning} />
              <Text style={styles.warningText}>{duplicateWarning}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.stopStatus}>
        {stop.status === 'completed' ? (
          <CheckCircle2 size={20} color={Colors.success} />
        ) : (
          <View style={styles.pendingDot} />
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  emptyContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  emptyText: { fontSize: FontSizes.lg, color: Colors.gray },
  emptyLink: { fontSize: FontSizes.md, color: Colors.gold[400], fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backButton: { width: 48, height: 48, justifyContent: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.white,
  },
  headerSpacer: { width: 48 },
  summaryCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.lg },
  summaryGradient: { padding: Spacing.lg, gap: Spacing.md },
  routeName: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.white,
  },
  summaryStats: { flexDirection: 'row', gap: Spacing.xl },
  summaryItem: { alignItems: 'center', gap: 4 },
  summaryValue: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.gold[400],
  },
  summaryLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  actionsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  actionCard: {
    flex: 1,
    minHeight: 96,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  actionLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
  },
  dangerText: { color: Colors.error },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.white,
  },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  stopNumberCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumberText: {
    fontSize: FontSizes.md,
    fontWeight: '800',
    color: Colors.gold[400],
  },
  stopContent: { flex: 1 },
  stopAddress: {
    fontSize: FontSizes.md,
    color: Colors.white,
    fontWeight: '500',
  },
  stopMetaRow: { marginTop: 4, gap: 4 },
  stopMeta: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  stopHint: {
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  warningText: {
    flex: 1,
    fontSize: FontSizes.xs,
    color: Colors.warning,
    fontWeight: '700',
  },
  stopStatus: { width: 24, alignItems: 'center' },
  pendingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.warning,
  },
  startButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing.xl,
  },
  startGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    gap: Spacing.sm,
  },
  startText: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.primary[900],
  },
});
