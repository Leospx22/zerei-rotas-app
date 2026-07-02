import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { AlertCircle, ArrowLeft, MapPin, Package } from 'lucide-react-native';
import { useRoute } from '@/contexts/RouteContext';
import {
  collectAllOccurrenceRecords,
  occurrenceReasonLabel,
} from '@/lib/occurrenceRecords';
import { BorderRadius, Colors, FontSizes, Spacing } from '@/constants/theme';

function formatRegisteredAt(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OccurrencesScreen() {
  const router = useRouter();
  const { currentRoute, routeHistory, reloadHistory } = useRoute();
  const occurrenceRecords = useMemo(
    () => collectAllOccurrenceRecords(currentRoute, routeHistory),
    [currentRoute, routeHistory]
  );

  useFocusEffect(
    useCallback(() => {
      reloadHistory().catch(() => {});
    }, [reloadHistory])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <AlertCircle size={22} color={Colors.error} />
          <Text style={styles.title}>Ocorrências</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {occurrenceRecords.length === 0 ? (
        <View style={styles.emptyState}>
          <AlertCircle size={48} color={Colors.cardBorder} />
          <Text style={styles.emptyText}>Nenhuma ocorrência registrada</Text>
        </View>
      ) : (
        occurrenceRecords.map((record, index) => {
          const registeredAt = formatRegisteredAt(record.registeredAt);
          return (
            <View
              key={`${record.routeName ?? 'rota'}-${record.packageId}-${record.registeredAt ?? index}`}
              style={styles.card}
            >
              <View style={styles.packageHeader}>
                <Package size={18} color={Colors.gold[400]} />
                <View style={styles.packageHeaderText}>
                  <Text style={styles.label}>Pacote</Text>
                  <Text style={styles.packageCode}>{record.packageCode ?? record.packageId}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <MapPin size={16} color={Colors.gray} />
                <View style={styles.detailContent}>
                  <Text style={styles.label}>Endereço</Text>
                  <Text style={styles.value}>{record.address}</Text>
                  {record.normalizedAddress && record.normalizedAddress !== record.address ? (
                    <Text style={styles.normalizedAddress}>{record.normalizedAddress}</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.reasonBox}>
                <Text style={styles.label}>Motivo</Text>
                <Text style={styles.reason}>{occurrenceReasonLabel(record.reason)}</Text>
              </View>

              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <Text style={styles.label}>Rota</Text>
                  <Text style={styles.value}>{record.routeName ?? 'Rota não informada'}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.label}>Parada</Text>
                  <Text style={styles.value}>
                    {record.stopNumber !== undefined ? `#${record.stopNumber}` : 'Não informada'}
                  </Text>
                </View>
              </View>

              {registeredAt ? (
                <View>
                  <Text style={styles.label}>Registrado em</Text>
                  <Text style={styles.value}>{registeredAt}</Text>
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { color: Colors.white, fontSize: FontSizes.xxl, fontWeight: '800' },
  headerSpacer: { width: 44 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xxl,
  },
  emptyText: { color: Colors.gray, fontSize: FontSizes.lg, fontWeight: '700' },
  card: {
    padding: Spacing.md,
    gap: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardBg,
  },
  packageHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  packageHeaderText: { flex: 1 },
  packageCode: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: '800' },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  detailContent: { flex: 1, gap: 2 },
  label: {
    color: Colors.gray,
    fontSize: FontSizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  value: { color: Colors.white, fontSize: FontSizes.md, lineHeight: 20 },
  normalizedAddress: { color: Colors.gold[400], fontSize: FontSizes.sm },
  reasonBox: {
    gap: 4,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    backgroundColor: Colors.errorBg,
  },
  reason: { color: Colors.error, fontSize: FontSizes.md, fontWeight: '800' },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  metaItem: { flex: 1, minWidth: 120, gap: 2 },
});
