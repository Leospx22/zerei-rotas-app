import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  ArrowDownUp,
  CalendarClock,
  CheckCircle2,
  Clock,
  Eye,
  ListChecks,
  Package,
  Search,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { HeaderBrandIcon } from '@/components/HeaderBrandIcon';
import { FadeInView, ScreenSkeleton } from '@/components/ui';
import { useRoute, type RouteData } from '@/contexts/RouteContext';
import type { HistoryEntry } from '@/lib/routePersistence';
import {
  formatExecutionDuration,
  formatExecutionTime,
} from '@/lib/executionState';

type SortOrder = 'newest' | 'oldest';
type HistoryStatus = 'completed' | 'in-progress';

interface DisplayHistoryEntry {
  id: string;
  key: string;
  name: string;
  totalPackages: number;
  totalStops: number;
  deliveredPackages: number;
  completedStops: number;
  durationMinutes: number;
  executionDate: Date;
  startTime: number | null;
  finishTime: number | null;
  completedAt?: string;
  status: HistoryStatus;
}

function entryFromHistory(entry: HistoryEntry): DisplayHistoryEntry {
  const finishTime = new Date(entry.completedAt).getTime();
  return {
    id: entry.id,
    key: `${entry.id}-${entry.completedAt}`,
    name: entry.name,
    totalPackages: entry.totalPackages,
    totalStops: entry.totalStops,
    deliveredPackages: entry.deliveredPackages,
    completedStops: entry.completedStops,
    durationMinutes: entry.durationMinutes,
    executionDate: new Date(entry.completedAt),
    startTime: finishTime - entry.durationMinutes * 60000,
    finishTime,
    completedAt: entry.completedAt,
    status: 'completed',
  };
}

function entryFromCurrentRoute(route: RouteData): DisplayHistoryEntry {
  const now = Date.now();
  const startTime = route.startTime ?? now;
  const durationMinutes = route.startTime
    ? Math.max(0, Math.round((now - route.startTime) / 60000))
    : route.durationMinutes;

  return {
    id: route.id,
    key: `${route.id}-active`,
    name: route.name,
    totalPackages: route.totalPackages,
    totalStops: route.stops.length,
    deliveredPackages: route.deliveredPackages,
    completedStops: route.completedStops,
    durationMinutes,
    executionDate: new Date(startTime),
    startTime,
    finishTime: null,
    status: 'in-progress',
  };
}

function formatExecutionDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getSuccessRate(entry: DisplayHistoryEntry): number {
  return entry.totalPackages > 0
    ? Math.round((entry.deliveredPackages / entry.totalPackages) * 100)
    : 0;
}

export default function HistoryScreen() {
  const {
    currentRoute,
    isLoading,
    routeHistory: history,
    reloadHistory,
    deleteHistoryRecord,
  } = useRoute();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [selectedEntry, setSelectedEntry] = useState<DisplayHistoryEntry | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(10)).current;

  useFocusEffect(
    useCallback(() => {
      reloadHistory();
    }, [reloadHistory])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateAnim]);

  const completedEntries = useMemo(() => {
    const seen = new Set<string>();
    return history.filter(entry => {
      const key = `${entry.id}-${entry.completedAt}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [history]);

  const stats = useMemo(() => {
    const totalCompletedRoutes = completedEntries.length;
    const totalPackagesDelivered = completedEntries.reduce(
      (sum, entry) => sum + entry.deliveredPackages,
      0
    );
    const totalStopsCompleted = completedEntries.reduce(
      (sum, entry) => sum + entry.completedStops,
      0
    );
    const totalDuration = completedEntries.reduce(
      (sum, entry) => sum + entry.durationMinutes,
      0
    );
    const totalPackages = completedEntries.reduce(
      (sum, entry) => sum + entry.totalPackages,
      0
    );

    return {
      totalCompletedRoutes,
      totalPackagesDelivered,
      totalStopsCompleted,
      averageDuration: totalCompletedRoutes > 0
        ? Math.round(totalDuration / totalCompletedRoutes)
        : 0,
      averagePackages: totalCompletedRoutes > 0
        ? Math.round(totalPackages / totalCompletedRoutes)
        : 0,
    };
  }, [completedEntries]);

  const displayEntries = useMemo(() => {
    const completedDisplayEntries = completedEntries.map(entryFromHistory);
    const hasCurrentInHistory =
      currentRoute !== null &&
      completedEntries.some(entry => entry.id === currentRoute.id);
    const activeEntry =
      currentRoute && currentRoute.status !== 'completed' && !hasCurrentInHistory
        ? [entryFromCurrentRoute(currentRoute)]
        : [];
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return [...activeEntry, ...completedDisplayEntries]
      .filter(entry => entry.name.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => {
        const aTime = a.finishTime ?? a.startTime ?? a.executionDate.getTime();
        const bTime = b.finishTime ?? b.startTime ?? b.executionDate.getTime();
        return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
      });
  }, [completedEntries, currentRoute, searchQuery, sortOrder]);

  const handleDelete = useCallback((entry: DisplayHistoryEntry) => {
    if (!entry.completedAt) return;
    const completedAt = entry.completedAt;

    Alert.alert(
      'Excluir registro',
      `Deseja excluir "${entry.name}" do histórico?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            deleteHistoryRecord(entry.id, completedAt).catch(() => {});
            if (selectedEntry?.key === entry.key) setSelectedEntry(null);
          },
        },
      ]
    );
  }, [deleteHistoryRecord, selectedEntry]);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest');
  };

  const hasAnyHistory = completedEntries.length > 0 || Boolean(currentRoute);
  const listIsEmpty = displayEntries.length === 0;
  const renderHistoryCard = useCallback(({ item, index }: { item: DisplayHistoryEntry; index: number }) => (
    <FadeInView delay={Math.min(index * 28, 180)}>
      <HistoryCard
        entry={item}
        onOpen={() => setSelectedEntry(item)}
        onDelete={() => handleDelete(item)}
      />
    </FadeInView>
  ), [handleDelete]);
  const listHeader = (
    <Animated.View
      style={{ opacity: fadeAnim, transform: [{ translateY: translateAnim }] }}
    >
      <View style={styles.headerRow}>
        <HeaderBrandIcon size={22} />
        <Text style={styles.pageTitle}>Histórico</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          icon={<CheckCircle2 size={18} color={Colors.success} />}
          value={stats.totalCompletedRoutes.toString()}
          label="Rotas concluídas"
        />
        <StatCard
          icon={<Package size={18} color={Colors.gold[400]} />}
          value={stats.totalPackagesDelivered.toString()}
          label="Pacotes entregues"
        />
        <StatCard
          icon={<ListChecks size={18} color={Colors.gold[400]} />}
          value={stats.totalStopsCompleted.toString()}
          label="Paradas concluídas"
        />
        <StatCard
          icon={<Clock size={18} color={Colors.gold[400]} />}
          value={formatExecutionDuration(stats.averageDuration)}
          label="Media de tempo"
        />
        <StatCard
          icon={<TrendingUp size={18} color={Colors.gold[400]} />}
          value={stats.averagePackages.toString()}
          label="Pacotes por rota"
        />
      </View>

      <View style={styles.actionsRow}>
        <View style={styles.searchBox}>
          <Search size={18} color={Colors.gray} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar rota"
            placeholderTextColor={Colors.darkGray}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Buscar rota"
          />
        </View>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={toggleSortOrder}
          accessibilityRole="button"
          accessibilityLabel={`Ordenar por ${sortOrder === 'newest' ? 'mais antigas' : 'mais recentes'}`}
          activeOpacity={0.78}
        >
          <ArrowDownUp size={18} color={Colors.gold[400]} />
          <Text style={styles.sortText}>
            {sortOrder === 'newest' ? 'Recentes' : 'Antigas'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Rotas</Text>
    </Animated.View>
  );

  if (isLoading) {
    return <ScreenSkeleton message="Carregando histórico..." rows={5} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        data={listIsEmpty ? [] : displayEntries}
        keyExtractor={item => item.key}
        renderItem={renderHistoryCard}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          !hasAnyHistory ? (
            <View style={styles.emptyCard}>
              <CheckCircle2 size={32} color={Colors.darkGray} />
              <Text style={styles.emptyText}>Nenhuma rota no histórico.</Text>
              <Text style={styles.emptySubtext}>
                Conclua sua primeira rota para acompanhar sua produtividade aqui.
              </Text>
            </View>
          ) : listIsEmpty ? (
            <View style={styles.emptyCard}>
              <Search size={32} color={Colors.darkGray} />
              <Text style={styles.emptyText}>Nenhuma rota encontrada.</Text>
              <Text style={styles.emptySubtext}>
                Tente buscar por outro nome de rota.
              </Text>
            </View>
          ) : null
        }
      />

      <SummaryModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </View>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      {icon}
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const HistoryCard = React.memo(function HistoryCard({
  entry,
  onOpen,
  onDelete,
}: {
  entry: DisplayHistoryEntry;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const date = formatExecutionDate(entry.executionDate);
  const successRate = getSuccessRate(entry);
  const statusLabel = entry.status === 'completed' ? 'Concluida' : 'Em andamento';
  const statusStyle = entry.status === 'completed' ? styles.completedBadge : styles.inProgressBadge;

  return (
    <TouchableOpacity
      style={styles.historyCard}
      activeOpacity={0.86}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Abrir resumo da rota ${entry.name}`}
    >
      <View style={styles.historyHeader}>
        <View style={styles.historyTitleBlock}>
          <View style={styles.historyTitleRow}>
            <CalendarClock size={16} color={Colors.gold[400]} />
            <Text style={styles.historyName} numberOfLines={1}>{entry.name}</Text>
          </View>
          <Text style={styles.historyDate}>
            {date} as {formatExecutionTime(entry.startTime)}
          </Text>
        </View>
        <View style={[styles.statusBadge, statusStyle]}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.historyMetrics}>
        <Metric label="Paradas" value={`${entry.completedStops}/${entry.totalStops}`} />
        <Metric label="Pacotes" value={`${entry.deliveredPackages}/${entry.totalPackages}`} />
        <Metric label="Duração" value={formatExecutionDuration(entry.durationMinutes)} />
        <Metric label="Sucesso" value={`${successRate}%`} />
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.iconAction}
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel="Ver resumo"
        >
          <Eye size={17} color={Colors.gold[400]} />
        </TouchableOpacity>
        {entry.status === 'completed' ? (
          <TouchableOpacity
            style={[styles.iconAction, styles.deleteAction]}
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel="Excluir registro"
          >
            <Trash2 size={17} color={Colors.error} />
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function SummaryModal({
  entry,
  onClose,
}: {
  entry: DisplayHistoryEntry | null;
  onClose: () => void;
}) {
  if (!entry) return null;

  const successRate = getSuccessRate(entry);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.summaryModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Resumo da rota</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar resumo"
            >
              <X size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.summaryContent}>
            <Text style={styles.summaryRouteName}>{entry.name}</Text>
            <SummaryRow label="Data de execução" value={formatExecutionDate(entry.executionDate)} />
            <SummaryRow label="Inicio" value={formatExecutionTime(entry.startTime)} />
            <SummaryRow
              label="Fim"
              value={entry.finishTime ? formatExecutionTime(entry.finishTime) : 'Em andamento'}
            />
            <SummaryRow label="Duração total" value={formatExecutionDuration(entry.durationMinutes)} />
            <SummaryRow label="Paradas concluídas" value={`${entry.completedStops}/${entry.totalStops}`} />
            <SummaryRow label="Pacotes entregues" value={`${entry.deliveredPackages}/${entry.totalPackages}`} />
            <SummaryRow label="Taxa de sucesso" value={`${successRate}%`} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  pageTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.white,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    width: '48%',
    minHeight: 104,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 5,
    justifyContent: 'center',
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: '900',
    color: Colors.white,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray,
    fontWeight: '600',
    lineHeight: 15,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  searchBox: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    flex: 1,
    color: Colors.white,
    fontSize: FontSizes.md,
    paddingVertical: Spacing.sm,
  },
  sortButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary[800],
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  sortText: {
    color: Colors.gold[400],
    fontSize: FontSizes.sm,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  emptyCard: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.gray,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray,
    textAlign: 'center',
    lineHeight: 18,
  },
  historyCard: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  historyTitleBlock: { flex: 1, gap: 4 },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyName: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: '800',
    color: Colors.white,
  },
  historyDate: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  statusBadge: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  completedBadge: {
    backgroundColor: Colors.successBg,
    borderColor: Colors.successBorder,
  },
  inProgressBadge: {
    backgroundColor: Colors.warningBg,
    borderColor: Colors.warningBorder,
  },
  statusText: {
    color: Colors.white,
    fontSize: FontSizes.xs,
    fontWeight: '800',
  },
  historyMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metric: {
    minWidth: '22%',
    flex: 1,
    backgroundColor: Colors.primary[900],
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    gap: 2,
  },
  metricValue: {
    color: Colors.gold[400],
    fontSize: FontSizes.md,
    fontWeight: '900',
  },
  metricLabel: {
    color: Colors.gray,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  iconAction: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.primary[800],
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAction: {
    backgroundColor: Colors.errorBg,
    borderColor: Colors.errorBorder,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  summaryModal: {
    maxHeight: '82%',
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    color: Colors.white,
    fontSize: FontSizes.xl,
    fontWeight: '900',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  summaryContent: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  summaryRouteName: {
    color: Colors.gold[400],
    fontSize: FontSizes.xl,
    fontWeight: '900',
    marginBottom: Spacing.sm,
  },
  summaryRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  summaryLabel: {
    flex: 1,
    color: Colors.gray,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  summaryValue: {
    flex: 1,
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: '900',
    textAlign: 'right',
  },
});
