import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Eye, Route, ShieldCheck } from 'lucide-react-native';
import { BorderRadius, Colors, FontSizes, Spacing } from '@/constants/theme';
import type { RouteAIReport } from '@/lib/route-ai';
import { formatDistance, formatFuelCurrency, formatMetricConfidence, formatMetricSavings, formatMinutes } from './zrPresentation';

interface ZRRecommendationCardProps {
  report: RouteAIReport;
  onPreview?: () => void;
  onUse?: () => void;
  onKeep?: () => void;
  fuelPricePerLiter?: number;
}

export function ZRRecommendationCard({
  report,
  onPreview,
  onUse,
  onKeep,
  fuelPricePerLiter,
}: ZRRecommendationCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.brand}>ZR Runtime™</Text>
        <View style={styles.confidencePill}>
          <ShieldCheck size={13} color={Colors.success} />
          <Text style={styles.confidenceText}>
            {formatMetricConfidence(report.optimization.confidenceScore, report.optimization.metricConfidence)}
          </Text>
        </View>
      </View>
      <Text style={styles.title}>{report.recommendation.label}</Text>
      <Text style={styles.reason}>{report.recommendation.reason}</Text>
      <View style={styles.gainRow}>
        <Text style={styles.gain}>
          {formatMetricSavings(formatDistance(report.comparison.distanceSavedKm), report.comparison.metricConfidence)}
        </Text>
        <Text style={styles.gain}>
          {formatMetricSavings(formatMinutes(report.comparison.estimatedTimeSavedMinutes), report.comparison.metricConfidence)}
        </Text>
        <Text style={styles.gain}>
          {formatMetricSavings(
            formatFuelCurrency(report.comparison.estimatedFuelSavedLiters, fuelPricePerLiter),
            report.comparison.metricConfidence
          )}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onPreview} accessibilityRole="button">
          <Eye size={15} color={Colors.gold[400]} />
          <Text style={styles.secondaryButtonText}>Prévia</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={onUse} accessibilityRole="button">
          <Route size={15} color={Colors.primary[900]} />
          <Text style={styles.primaryButtonText}>Usar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostButton} onPress={onKeep} accessibilityRole="button">
          <Text style={styles.ghostButtonText}>Manter atual</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    backgroundColor: Colors.successBg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  brand: { color: Colors.gold[400], fontSize: FontSizes.sm, fontWeight: '900' },
  confidencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(34,197,94,0.12)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  confidenceText: { color: Colors.success, fontSize: FontSizes.xs, fontWeight: '900' },
  title: { color: Colors.white, fontSize: FontSizes.xl, fontWeight: '900' },
  reason: { color: Colors.gray, fontSize: FontSizes.sm, lineHeight: 19 },
  gainRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  gain: {
    color: Colors.success,
    fontSize: FontSizes.sm,
    fontWeight: '900',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  primaryButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.gold[500],
    paddingHorizontal: Spacing.md,
  },
  primaryButtonText: { color: Colors.primary[900], fontSize: FontSizes.sm, fontWeight: '900' },
  secondaryButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.gold[700],
    paddingHorizontal: Spacing.md,
  },
  secondaryButtonText: { color: Colors.gold[400], fontSize: FontSizes.sm, fontWeight: '900' },
  ghostButton: {
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: Spacing.md,
  },
  ghostButtonText: { color: Colors.gray, fontSize: FontSizes.sm, fontWeight: '900' },
});

