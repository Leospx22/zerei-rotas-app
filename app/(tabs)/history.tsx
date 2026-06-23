import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import {
  CheckCircle2,
  MapPin,
  Clock,
  TrendingUp,
  Crown,
  Package,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { usePersistence, HistoryEntry } from '@/hooks/usePersistence';

export default function HistoryScreen() {
  const { getHistory } = usePersistence();
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    getHistory().then(setHistory).catch(() => {});
  }, [getHistory]);

  const totalPackages = history.reduce((s, h) => s + h.deliveredPackages, 0);
  const totalDistance = history.reduce((s, h) => s + h.distance, 0);
  const totalDuration = history.reduce((s, h) => s + h.durationMinutes, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Crown size={22} color={Colors.gold[400]} />
        <Text style={styles.pageTitle}>Histórico</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Package size={18} color={Colors.gold[400]} />
          <Text style={styles.summaryValue}>{totalPackages}</Text>
          <Text style={styles.summaryLabel}>Pacotes</Text>
        </View>
        <View style={styles.summaryCard}>
          <MapPin size={18} color={Colors.gold[400]} />
          <Text style={styles.summaryValue}>{totalDistance.toFixed(1)} km</Text>
          <Text style={styles.summaryLabel}>Distância</Text>
        </View>
        <View style={styles.summaryCard}>
          <Clock size={18} color={Colors.gold[400]} />
          <Text style={styles.summaryValue}>{Math.round(totalDuration / 60)}h</Text>
          <Text style={styles.summaryLabel}>Tempo</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Rotas Concluídas</Text>

      {history.length === 0 ? (
        <View style={styles.emptyCard}>
          <CheckCircle2 size={32} color={Colors.darkGray} />
          <Text style={styles.emptyText}>Nenhuma rota concluída ainda.</Text>
          <Text style={styles.emptySubtext}>Conclua sua primeira rota para ver o histórico aqui.</Text>
        </View>
      ) : (
        history.map(entry => {
          const date = new Date(entry.completedAt).toLocaleDateString('pt-BR');
          const durationHours = Math.floor(entry.durationMinutes / 60);
          const durationMins = entry.durationMinutes % 60;
          const durationLabel = durationHours > 0
            ? `${durationHours}h ${durationMins}min`
            : `${entry.durationMinutes} min`;

          return (
            <View key={entry.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View style={styles.historyTitleRow}>
                  <TrendingUp size={16} color={Colors.gold[400]} />
                  <Text style={styles.historyName}>{entry.name}</Text>
                </View>
                <Text style={styles.historyDate}>{date}</Text>
              </View>
              <View style={styles.historyDetails}>
                <Text style={styles.historyDetail}>
                  {entry.deliveredPackages}/{entry.totalPackages} pacotes
                </Text>
                <Text style={styles.historyDetail}>
                  {entry.completedStops}/{entry.totalStops} paradas
                </Text>
                <Text style={styles.historyDetail}>
                  {entry.distance} km
                </Text>
                <Text style={styles.historyDetail}>
                  {durationLabel}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.white,
  },
  summaryLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
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
    fontWeight: '600',
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
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyName: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.white,
  },
  historyDate: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  historyDetails: {
    flexDirection: 'row',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  historyDetail: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
});
