import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, FontSizes, Spacing } from '@/constants/theme';
import type { RouteAIReport } from '@/lib/route-ai';
import { formatDistance, formatFuelCurrency, formatMetricImprovement, formatMetricSavings, formatMinutes } from './zrPresentation';

interface ZROptimizationSummaryProps {
  report: RouteAIReport;
  totalStops: number;
  fuelPricePerLiter?: number;
}

export function ZROptimizationSummary({
  report,
  totalStops,
  fuelPricePerLiter,
}: ZROptimizationSummaryProps) {
  const rows = [
    {
      label: 'Distância',
      original: formatDistance(report.comparison.originalDistanceKm),
      optimized: formatDistance(report.comparison.optimizedDistanceKm),
      savings: formatMetricSavings(formatDistance(report.comparison.distanceSavedKm), report.comparison.metricConfidence),
    },
    {
      label: 'Duração',
      original: formatMinutes(report.analysis.estimatedOriginalDurationMinutes),
      optimized: formatMinutes(report.optimization.estimatedDurationMinutes),
      savings: formatMetricSavings(formatMinutes(report.comparison.estimatedTimeSavedMinutes), report.comparison.metricConfidence),
    },
    {
      label: 'Combustível',
      original: '-',
      optimized: '-',
      savings: formatMetricSavings(
        formatFuelCurrency(report.comparison.estimatedFuelSavedLiters, fuelPricePerLiter),
        report.comparison.metricConfidence
      ),
    },
    {
      label: 'Paradas',
      original: String(totalStops),
      optimized: String(totalStops),
      savings: formatMetricImprovement(report.comparison.percentageImprovement, report.comparison.metricConfidence, 'melhor'),
    },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.brand}>ZR Optimize™</Text>
        <Text style={styles.improvement}>
          {formatMetricImprovement(report.comparison.percentageImprovement, report.comparison.metricConfidence, 'de melhoria')}
        </Text>
      </View>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.metricCell]}>Métrica</Text>
          <Text style={styles.headerCell}>Original</Text>
          <Text style={styles.headerCell}>Otimizada</Text>
          <Text style={styles.headerCell}>Economia</Text>
        </View>
        {rows.map(row => (
          <View key={row.label} style={styles.tableRow}>
            <Text style={[styles.cell, styles.metricCell]}>{row.label}</Text>
            <Text style={styles.cell}>{row.original}</Text>
            <Text style={styles.cell}>{row.optimized}</Text>
            <Text style={[styles.cell, styles.savings]}>{row.savings}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.035)',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  brand: { color: Colors.gold[400], fontSize: FontSizes.sm, fontWeight: '900' },
  improvement: { color: Colors.success, fontSize: FontSizes.sm, fontWeight: '900' },
  table: { gap: 1 },
  tableHeader: { flexDirection: 'row', gap: Spacing.xs },
  tableRow: { flexDirection: 'row', gap: Spacing.xs, paddingTop: Spacing.sm },
  headerCell: { flex: 1, color: Colors.gray, fontSize: FontSizes.xs, fontWeight: '800' },
  cell: { flex: 1, color: Colors.white, fontSize: FontSizes.xs, fontWeight: '700' },
  metricCell: { flex: 0.85 },
  savings: { color: Colors.success },
});

