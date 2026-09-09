import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { BrainCircuit, GraduationCap } from 'lucide-react-native';
import { BorderRadius, Colors, FontSizes, Spacing } from '@/constants/theme';
import type { LearningStatus, RouteAIReport, RouteSimulationSummary } from '@/lib/route-ai';
import { ZRExplanationCard } from './ZRExplanationCard';
import { ZROptimizationSummary } from './ZROptimizationSummary';
import { ZRRecommendationCard } from './ZRRecommendationCard';
import { ZRScoreCard } from './ZRScoreCard';
import { ZRSimulationCard } from './ZRSimulationCard';
import { formatDistance, formatFuelCurrency, formatMetricConfidence, formatMetricSavings, formatMinutes } from './zrPresentation';

interface ZRIntelligenceCardProps {
  report: RouteAIReport;
  simulation?: RouteSimulationSummary;
  learningStatus?: LearningStatus;
  totalStops: number;
  onPreview?: () => void;
  onUseOptimized?: () => void;
  onKeepOriginal?: () => void;
  fuelPricePerLiter?: number;
}

export function ZRIntelligenceCard({
  report,
  simulation,
  learningStatus,
  totalStops,
  onPreview,
  onUseOptimized,
  onKeepOriginal,
  fuelPricePerLiter,
}: ZRIntelligenceCardProps) {
  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <View style={styles.brandIcon}>
          <BrainCircuit size={19} color={Colors.gold[400]} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Inteligência offline premium</Text>
          <Text style={styles.title}>ZR Intelligence™</Text>
        </View>
      </View>

      <ProgressiveSection delay={70}>
        <View style={styles.kpiGrid}>
          <Kpi label="Nota de otimização" value={`${report.score.score} / 100`} />
          <Kpi
            label="Confiança"
            value={formatMetricConfidence(report.optimization.confidenceScore, report.optimization.metricConfidence)}
          />
          <Kpi
            label="Distância economizada"
            value={formatMetricSavings(formatDistance(report.comparison.distanceSavedKm), report.comparison.metricConfidence)}
          />
          <Kpi
            label="Tempo economizado"
            value={formatMetricSavings(formatMinutes(report.comparison.estimatedTimeSavedMinutes), report.comparison.metricConfidence)}
          />
          <Kpi
            label="Combustível economizado"
            value={formatMetricSavings(
              formatFuelCurrency(report.comparison.estimatedFuelSavedLiters, fuelPricePerLiter),
              report.comparison.metricConfidence
            )}
          />
          <Kpi label="Recomendação" value={report.recommendation.label} />
        </View>
      </ProgressiveSection>

      <ProgressiveSection delay={130}>
        <ZRLearningStatusCard status={learningStatus} />
      </ProgressiveSection>

      <ProgressiveSection delay={190}>
        <ZRScoreCard score={report.score} />
      </ProgressiveSection>

      <ProgressiveSection delay={250}>
        <ZROptimizationSummary
          report={report}
          totalStops={totalStops}
          fuelPricePerLiter={fuelPricePerLiter}
        />
      </ProgressiveSection>

      <ProgressiveSection delay={310}>
        <ZRExplanationCard factors={report.score.factors} />
      </ProgressiveSection>

      <ProgressiveSection delay={370}>
        <ZRRecommendationCard
          report={report}
          onPreview={onPreview}
          onUse={onUseOptimized}
          onKeep={onKeepOriginal}
          fuelPricePerLiter={fuelPricePerLiter}
        />
      </ProgressiveSection>

      {simulation ? (
        <ProgressiveSection delay={430}>
          <ZRSimulationCard simulation={simulation} />
        </ProgressiveSection>
      ) : null}
    </View>
  );
}

function ProgressiveSection({
  children,
  delay,
}: {
  children: React.ReactNode;
  delay: number;
}) {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(8)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        delay,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        delay,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function ZRLearningStatusCard({ status }: { status?: LearningStatus }) {
  const label = status?.label ?? 'Sem histórico ainda';
  const detail = status?.detail ?? 'Conclua rotas para personalizar a ZR Intelligence™.';
  const routes = status?.routesAnalyzed ?? 0;
  const confidence = status?.confidence ?? 0;
  const color = status?.enabled === false
    ? Colors.warning
    : routes > 0
      ? Colors.success
      : Colors.gray;

  return (
    <View style={styles.learningCard}>
      <View style={styles.learningHeader}>
        <View style={styles.learningTitleRow}>
          <GraduationCap size={16} color={color} />
          <Text style={styles.learningBrand}>ZR Learning Engine™</Text>
        </View>
        <Text style={[styles.learningStatus, { color }]}>{label}</Text>
      </View>
      <Text style={styles.learningDetail}>
        {routes > 0 ? `${routes} rotas analisadas. ` : ''}{detail}
      </Text>
      <View style={styles.learningProgressTrack}>
        <View style={[styles.learningProgressFill, { width: `${Math.min(100, confidence)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.22)',
    backgroundColor: Colors.cardBg,
    padding: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.25)',
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: Colors.gray, fontSize: FontSizes.xs, fontWeight: '800', textTransform: 'uppercase' },
  title: { color: Colors.white, fontSize: FontSizes.xxl, fontWeight: '900' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  kpi: {
    width: '48%',
    minHeight: 70,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: Spacing.sm,
    justifyContent: 'center',
    gap: 4,
  },
  kpiLabel: { color: Colors.gray, fontSize: FontSizes.xs, fontWeight: '800' },
  kpiValue: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: '900' },
  learningCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.035)',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  learningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  learningTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  learningBrand: { color: Colors.gold[400], fontSize: FontSizes.sm, fontWeight: '900' },
  learningStatus: { fontSize: FontSizes.sm, fontWeight: '900' },
  learningDetail: { color: Colors.gray, fontSize: FontSizes.sm, lineHeight: 19 },
  learningProgressTrack: {
    height: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  learningProgressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
});
