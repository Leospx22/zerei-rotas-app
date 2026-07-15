import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Package,
  MapPin,
  TrendingUp,
  ArrowDown,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { HeaderBrandIcon } from '@/components/HeaderBrandIcon';
import { useRoute } from '@/contexts/RouteContext';
import {
  buildDisplayedRoutePositionMap,
  formatRouteOrderBadge,
  buildDuplicateAddressWarnings,
  getDuplicateAddressSummaryCount,
} from '@/lib/routeStopPresentation';

export default function ImportSummaryScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { currentRoute, getSummary } = useRoute();
  const routeStops = currentRoute?.stops ?? [];
  const summary = React.useMemo(
    () => currentRoute ? getSummary() : null,
    [currentRoute, getSummary]
  );
  const duplicateWarnings = React.useMemo(
    () => buildDuplicateAddressWarnings(routeStops),
    [routeStops]
  );
  const duplicateStopCount = React.useMemo(
    () => getDuplicateAddressSummaryCount(routeStops),
    [routeStops]
  );
  const displayedPositions = React.useMemo(
    () => buildDisplayedRoutePositionMap(routeStops),
    [routeStops]
  );
  const stopRows = React.useMemo(
    () => routeStops.map((stop, index) => ({
      stop,
      index,
      duplicateWarning: duplicateWarnings[stop.id] ?? null,
      stopBadge: displayedPositions[stop.id]?.badge ?? formatRouteOrderBadge(stop, index + 1),
    })),
    [displayedPositions, duplicateWarnings, routeStops]
  );

  if (!currentRoute || !summary) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Nenhuma rota importada</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/routes/import')}>
          <Text style={styles.emptyLink}>Importar planilha</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const returningFromReview = from === 'delivery-preparation';
  const largestStopSequence =
    currentRoute.stops.findIndex(stop => stop.stopNumber === summary.largestStop.stopNumber) + 1;
  const smallestStopSequence =
    currentRoute.stops.findIndex(stop => stop.stopNumber === summary.smallestStop.stopNumber) + 1;
  const largestStop = currentRoute.stops[largestStopSequence - 1];
  const smallestStop = currentRoute.stops[smallestStopSequence - 1];
  const openRouteReview = () => {
    router.replace({
      pathname: '/(tabs)/routes/delivery-preparation',
      params: { from: 'import-summary' },
    });
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={stopRows}
      keyExtractor={row => row.stop.id}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      updateCellsBatchingPeriod={40}
      windowSize={7}
      removeClippedSubviews
      ListHeaderComponent={(
        <>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/routes/import')} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <HeaderBrandIcon size={20} />
          <Text style={styles.headerTitle}>Resumo da Importação</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {returningFromReview ? (
        <TouchableOpacity
          style={styles.returnToReviewButton}
          onPress={openRouteReview}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel="Voltar para Revisar Rota"
        >
          <Text style={styles.returnToReviewText}>Voltar para Revisar Rota</Text>
          <ChevronRight size={18} color={Colors.gold[400]} />
        </TouchableOpacity>
      ) : null}

      {/* ROTA DE HOJE hero card */}
      <LinearGradient
        colors={[Colors.primary[600], Colors.primary[800]]}
        style={styles.rotaCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.rotaCardHeader}>
          <TrendingUp size={22} color={Colors.gold[400]} />
          <Text style={styles.rotaCardTitle}>ROTA DE HOJE</Text>
        </View>

        <View style={styles.rotaHeroRow}>
          <View style={styles.rotaHeroItem}>
            <Package size={26} color={Colors.gold[400]} />
            <Text style={styles.rotaHeroValue}>{summary.totalPackages}</Text>
            <Text style={styles.rotaHeroLabel}>Total de{'\n'}Pacotes</Text>
          </View>
          <View style={styles.rotaHeroDivider} />
          <View style={styles.rotaHeroItem}>
            <MapPin size={26} color={Colors.gold[300]} />
            <Text style={[styles.rotaHeroValue, { color: Colors.gold[300] }]}>{summary.totalStops}</Text>
            <Text style={styles.rotaHeroLabel}>Total de{'\n'}Paradas</Text>
          </View>
        </View>

        <View style={styles.rotaExtremeRow}>
          <View style={[styles.rotaExtremeCard, { borderColor: Colors.successBorder }]}>
            <View style={styles.rotaExtremeTop}>
              <TrendingUp size={13} color={Colors.success} />
              <Text style={[styles.rotaExtremeLabel, { color: Colors.success }]}>Maior Parada</Text>
            </View>
            <Text style={styles.rotaExtremeStop}>
              Parada {largestStop ? displayedPositions[largestStop.id]?.badge ?? formatRouteOrderBadge(largestStop, largestStopSequence) : `#${largestStopSequence}`}
            </Text>
            <Text style={styles.rotaExtremeAddress} numberOfLines={1}>{summary.largestStop.address}</Text>
            <Text style={styles.rotaExtremeCount}>
              {summary.largestStop.count} pacote{summary.largestStop.count !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={[styles.rotaExtremeCard, { borderColor: Colors.warningBorder }]}>
            <View style={styles.rotaExtremeTop}>
              <ArrowDown size={13} color={Colors.warning} />
              <Text style={[styles.rotaExtremeLabel, { color: Colors.warning }]}>Menor Parada</Text>
            </View>
            <Text style={styles.rotaExtremeStop}>
              Parada {smallestStop ? displayedPositions[smallestStop.id]?.badge ?? formatRouteOrderBadge(smallestStop, smallestStopSequence) : `#${smallestStopSequence}`}
            </Text>
            <Text style={styles.rotaExtremeAddress} numberOfLines={1}>{summary.smallestStop.address}</Text>
            <Text style={styles.rotaExtremeCount}>
              {summary.smallestStop.count} pacote{summary.smallestStop.count !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Duplicate address warning */}
      {duplicateStopCount > 0 && (
        <View style={styles.duplicateWarningCard}>
          <AlertTriangle size={16} color={Colors.warning} />
          <Text style={styles.duplicateWarningText}>
            {duplicateStopCount} parada{duplicateStopCount !== 1 ? 's têm' : ' tem'} endereços que aparecem em outra parada.
          </Text>
        </View>
      )}

      {/* All stops list */}
      <Text style={styles.sectionTitle}>Ordem atual ({currentRoute.stops.length} paradas)</Text>
        </>
      )}
      renderItem={({ item: row }) => {
        const { stop, duplicateWarning, stopBadge } = row;
        return (
        <View key={stop.id} style={styles.stopCard}>
          <View style={styles.stopNumberWrap}>
            <View style={styles.stopNumberCircle}>
              <Text style={styles.stopNumberText}>{stopBadge}</Text>
            </View>
            <Text style={styles.stopLabel}>Parada</Text>
            {stop.optimizedOrderIndex !== undefined && stop.optimizedOrderIndex !== null && (
              <View style={styles.optimizedBadge}>
                <Text style={styles.optimizedBadgeText}>#{stop.optimizedOrderIndex}</Text>
              </View>
            )}
          </View>

          <View style={styles.stopInfo}>
            <Text style={styles.stopAddress} numberOfLines={2}>
              {stop.normalizedAddress}
            </Text>
            {stop.zipCode ? (
              <Text style={styles.stopZip}>CEP: {stop.zipCode}</Text>
            ) : null}
            <View style={styles.stopMetaRow}>
              {stop.addressCount > 1 && (
                <View style={styles.metaBadge}>
                  <MapPin size={11} color={Colors.primary[200]} />
                  <Text style={styles.metaBadgeText}>{stop.addressCount} endereços</Text>
                </View>
              )}
              {duplicateWarning && (
                <View style={[styles.metaBadge, styles.metaBadgeWarning]}>
                  <AlertTriangle size={11} color={Colors.warning} />
                  <Text style={[styles.metaBadgeText, { color: Colors.warning }]}>
                    {duplicateWarning}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.packageBadge}>
            <Text style={styles.packageBadgeValue}>{stop.packageCount}</Text>
            <Text style={styles.packageBadgeLabel}>pkg{stop.packageCount !== 1 ? 's' : ''}</Text>
          </View>
        </View>
        );
      }}
      ListFooterComponent={(
      <TouchableOpacity
        style={styles.nextButton}
        onPress={openRouteReview}
      >
        <LinearGradient
          colors={[Colors.gold[500], Colors.gold[700]]}
          style={styles.nextGradient}
        >
          <Text style={styles.nextText}>
            {returningFromReview ? 'Voltar para Revisar Rota' : 'Revisar Rota'}
          </Text>
          <ChevronRight size={20} color={Colors.primary[900]} />
        </LinearGradient>
      </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  emptyContainer: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', gap: Spacing.md,
  },
  emptyText: { fontSize: FontSizes.lg, color: Colors.gray },
  emptyLink: { fontSize: FontSizes.md, color: Colors.gold[400], fontWeight: '600' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: Spacing.lg,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.white },
  returnToReviewButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gold[700],
    backgroundColor: Colors.overlay,
  },
  returnToReviewText: {
    color: Colors.gold[400],
    fontSize: FontSizes.md,
    fontWeight: '800',
  },

  rotaCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.lg,
    marginBottom: Spacing.md, borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.2)', gap: Spacing.lg,
  },
  rotaCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rotaCardTitle: { fontSize: FontSizes.xxl, fontWeight: '900', color: Colors.white, letterSpacing: 1 },
  rotaHeroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  rotaHeroItem: { alignItems: 'center', gap: 6, flex: 1 },
  rotaHeroDivider: { width: 1, height: 72, backgroundColor: 'rgba(212,160,23,0.15)' },
  rotaHeroValue: { fontSize: 52, fontWeight: '900', color: Colors.gold[400], lineHeight: 58 },
  rotaHeroLabel: {
    fontSize: FontSizes.sm, color: Colors.gray,
    fontWeight: '500', textAlign: 'center', lineHeight: 18,
  },
  rotaExtremeRow: {
    flexDirection: 'row', gap: Spacing.sm,
    borderTopWidth: 1, borderTopColor: 'rgba(212,160,23,0.1)', paddingTop: Spacing.md,
  },
  rotaExtremeCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, gap: 3,
  },
  rotaExtremeTop: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  rotaExtremeLabel: { fontSize: FontSizes.xs, fontWeight: '700' },
  rotaExtremeStop: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.white },
  rotaExtremeAddress: { fontSize: FontSizes.xs, color: Colors.gray, lineHeight: 16 },
  rotaExtremeCount: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.gold[400] },

  duplicateWarningCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: Colors.warningBg, borderWidth: 1, borderColor: Colors.warningBorder,
    borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md,
  },
  duplicateWarningText: { flex: 1, fontSize: FontSizes.sm, color: Colors.warning, lineHeight: 20 },

  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.white, marginBottom: Spacing.md },

  stopCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.md,
  },
  stopNumberWrap: { alignItems: 'center', gap: 3 },
  stopNumberCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary[500], alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(212,160,23,0.3)',
  },
  stopNumberText: { fontSize: FontSizes.lg, fontWeight: '900', color: Colors.gold[400] },
  stopLabel: { fontSize: FontSizes.xs, color: Colors.gray, fontWeight: '500' },
  optimizedBadge: {
    marginTop: 2, paddingHorizontal: 5, paddingVertical: 2,
    backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 4,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
  },
  optimizedBadgeText: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.success },

  stopInfo: { flex: 1 },
  stopAddress: { fontSize: FontSizes.md, color: Colors.white, fontWeight: '500', lineHeight: 20 },
  stopZip: { fontSize: FontSizes.xs, color: Colors.gray, marginTop: 2 },
  stopMetaRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: 5, flexWrap: 'wrap' },
  metaBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(10,37,114,0.4)', borderRadius: BorderRadius.sm,
    paddingHorizontal: 6, paddingVertical: 2, gap: 3,
  },
  metaBadgeWarning: { backgroundColor: Colors.warningBg, borderWidth: 1, borderColor: Colors.warningBorder },
  metaBadgeText: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.primary[200] },

  packageBadge: {
    backgroundColor: Colors.gold[500], borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 6, minWidth: 40, alignItems: 'center',
  },
  packageBadgeValue: { fontSize: FontSizes.xl, fontWeight: '900', color: Colors.primary[900] },
  packageBadgeLabel: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.primary[700] },

  nextButton: { borderRadius: BorderRadius.md, overflow: 'hidden', marginTop: Spacing.xl },
  nextGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', height: 56, gap: Spacing.sm,
  },
  nextText: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.primary[900] },
});
