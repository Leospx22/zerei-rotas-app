import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import type { FounderDashboardMetrics } from '@/types/founderDashboardMetrics';

function percent(value: number, base: number): string {
  if (base <= 0) return '0%';
  return `${Math.round((value / base) * 100)}%`;
}

export function ConversionFunnel({ metrics }: { metrics: FounderDashboardMetrics | null }) {
  const stages = [
    { label: 'Waitlist', value: metrics?.totalWaitlist ?? 0, base: metrics?.totalWaitlist ?? 0, color: Colors.gold[400] },
    { label: 'Registered', value: metrics?.registeredUsers ?? 0, base: metrics?.totalWaitlist ?? 0, color: '#60A5FA' },
    { label: 'Trial', value: metrics?.trialUsers ?? 0, base: metrics?.registeredUsers ?? 0, color: Colors.warning },
    { label: 'Premium', value: metrics?.premiumUsers ?? 0, base: metrics?.trialUsers ?? 0, color: Colors.success },
  ];
  const maxValue = Math.max(...stages.map(stage => stage.value), 1);

  return (
    <View style={styles.section}>
      <View>
        <AppText variant="sectionTitle">Conversion Funnel</AppText>
        <AppText variant="body" color={Colors.gray}>
          Waitlist to paid activation.
        </AppText>
      </View>

      <View style={styles.card}>
        {stages.map((stage, index) => (
          <React.Fragment key={stage.label}>
            <View style={styles.stage}>
              <View style={styles.stageHeader}>
                <AppText variant="bodyStrong">{stage.label}</AppText>
                <View style={styles.stageNumbers}>
                  <AppText variant="bodyStrong">{stage.value}</AppText>
                  <AppText variant="caption" color={Colors.gray}>
                    {index === 0 ? '100%' : percent(stage.value, stage.base)}
                  </AppText>
                </View>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.max((stage.value / maxValue) * 100, 6)}%`,
                      backgroundColor: stage.color,
                    },
                  ]}
                />
              </View>
            </View>
            {index < stages.length - 1 ? (
              <AppText variant="sectionTitle" color={Colors.gray} style={styles.arrow}>
                v
              </AppText>
            ) : null}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.md,
  },
  card: {
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardBg,
  },
  stage: {
    gap: Spacing.xs,
  },
  stageHeader: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  stageNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  track: {
    height: 28,
    overflow: 'hidden',
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(148,163,184,0.16)',
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  arrow: {
    textAlign: 'center',
  },
});
