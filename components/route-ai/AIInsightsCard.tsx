import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AlertTriangle, BrainCircuit, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react-native';
import { BorderRadius, Colors, FontSizes, Spacing } from '@/constants/theme';
import type { GroupedStop } from '@/lib/packageUtils';
import {
  analyzeRouteAssistantInsights,
  type RouteAssistantInsight,
  type RouteAssistantInsightSeverity,
} from '@/lib/route-ai';

interface AIInsightsCardProps {
  stops: readonly GroupedStop[];
}

const MAX_VISIBLE_INSIGHTS = 6;

export function AIInsightsCard({ stops }: AIInsightsCardProps) {
  const [expanded, setExpanded] = useState(false);
  const analysis = useMemo(() => analyzeRouteAssistantInsights(stops), [stops]);
  const visibleInsights = expanded
    ? analysis.insights
    : analysis.insights.slice(0, MAX_VISIBLE_INSIGHTS);

  const statusLabel = analysis.summary.criticalCount > 0
    ? `${analysis.summary.criticalCount} critico${analysis.summary.criticalCount > 1 ? 's' : ''}`
    : analysis.summary.warningCount > 0
      ? `${analysis.summary.warningCount} aviso${analysis.summary.warningCount > 1 ? 's' : ''}`
      : 'Rota sem alertas';

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(value => !value)}
        activeOpacity={0.8}
      >
        <View style={styles.iconBox}>
          <BrainCircuit size={18} color={Colors.gold[400]} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Analise local</Text>
          <Text style={styles.title}>AI Insights</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
        {expanded ? (
          <ChevronUp size={20} color={Colors.gray} />
        ) : (
          <ChevronDown size={20} color={Colors.gray} />
        )}
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.body}>
          {analysis.insights.length === 0 ? (
            <View style={styles.emptyState}>
              <Lightbulb size={16} color={Colors.success} />
              <Text style={styles.emptyText}>Nenhum risco local encontrado nesta rota.</Text>
            </View>
          ) : (
            visibleInsights.map(insight => (
              <InsightRow key={insight.id} insight={insight} />
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

function InsightRow({ insight }: { insight: RouteAssistantInsight }) {
  const color = getSeverityColor(insight.severity);

  return (
    <View style={styles.insightRow}>
      <View style={[styles.severityMarker, { backgroundColor: color }]} />
      <View style={styles.insightCopy}>
        <View style={styles.insightTitleRow}>
          <AlertTriangle size={14} color={color} />
          <Text style={styles.insightTitle}>{insight.title}</Text>
        </View>
        <Text style={styles.insightMessage}>{insight.message}</Text>
        <Text style={styles.recommendation}>{insight.recommendation}</Text>
      </View>
    </View>
  );
}

function getSeverityColor(severity: RouteAssistantInsightSeverity): string {
  if (severity === 'critical') return Colors.error;
  if (severity === 'warning') return Colors.warning;
  return Colors.gray;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.24)',
    backgroundColor: Colors.cardBg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: {
    color: Colors.gray,
    fontSize: FontSizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.white,
    fontSize: FontSizes.xl,
    fontWeight: '900',
  },
  statusPill: {
    maxWidth: 112,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  statusText: {
    color: Colors.gold[400],
    fontSize: FontSizes.xs,
    fontWeight: '900',
  },
  body: {
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    flex: 1,
    color: Colors.lightGray,
    fontSize: FontSizes.sm,
  },
  insightRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  severityMarker: {
    width: 3,
    borderRadius: BorderRadius.full,
  },
  insightCopy: { flex: 1, gap: 5 },
  insightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  insightTitle: {
    flex: 1,
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: '800',
  },
  insightMessage: {
    color: Colors.lightGray,
    fontSize: FontSizes.sm,
    lineHeight: 18,
  },
  recommendation: {
    color: Colors.gray,
    fontSize: FontSizes.sm,
    lineHeight: 18,
  },
});
