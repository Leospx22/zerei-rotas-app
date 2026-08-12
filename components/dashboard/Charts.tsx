import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { AppText } from '@/components/ui';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import type { FounderUser } from '@/types/founderUsers';
import type { FounderWaitlistLead } from '@/types/founderWaitlist';

interface GrowthPoint {
  label: string;
  value: number;
}

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function formatBucket(value: Date): string {
  return value.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function buildGrowthData(values: string[]): GrowthPoint[] {
  const counts = new Map<string, { label: string; value: number }>();

  values.forEach(value => {
    const date = parseDate(value);
    if (!date) return;
    const key = date.toISOString().slice(0, 10);
    const current = counts.get(key);
    counts.set(key, {
      label: current?.label ?? formatBucket(date),
      value: (current?.value ?? 0) + 1,
    });
  });

  return Array.from(counts.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, item]) => item);
}

function ChartCard({
  title,
  subtitle,
  data,
  tone,
  unavailable,
}: {
  title: string;
  subtitle: string;
  data: GrowthPoint[];
  tone: string;
  unavailable: string;
}) {
  const maxValue = Math.max(...data.map(point => point.value), 1);

  return (
    <View style={styles.card}>
      <View>
        <AppText variant="cardTitle">{title}</AppText>
        <AppText variant="caption" color={Colors.gray}>
          {subtitle}
        </AppText>
      </View>

      {data.length > 0 ? (
        <View style={styles.chart}>
          {data.slice(-14).map((point, index) => (
            <View key={`${point.label}-${index}`} style={styles.barColumn}>
              <View style={styles.barFrame}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${Math.max((point.value / maxValue) * 100, 8)}%`,
                      backgroundColor: tone,
                    },
                  ]}
                />
              </View>
              <AppText variant="caption" color={Colors.gray} numberOfLines={1}>
                {point.label}
              </AppText>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.unavailable}>
          <AlertCircle size={18} color={Colors.warning} />
          <AppText variant="body" color={Colors.warning} style={styles.unavailableText}>
            {unavailable}
          </AppText>
        </View>
      )}
    </View>
  );
}

export function GrowthCharts({
  users,
  waitlist,
}: {
  users: FounderUser[];
  waitlist: FounderWaitlistLead[];
}) {
  const usersGrowth = useMemo(
    () => buildGrowthData(users.map(user => user.createdAt)),
    [users]
  );
  const waitlistGrowth = useMemo(
    () => buildGrowthData(waitlist.map(lead => lead.createdAt)),
    [waitlist]
  );
  const trialGrowth = useMemo(
    () => buildGrowthData(users.map(user => user.trialStart)),
    [users]
  );
  const premiumGrowth = useMemo<GrowthPoint[]>(() => [], []);

  return (
    <View style={styles.section}>
      <View>
        <AppText variant="sectionTitle">Growth Charts</AppText>
        <AppText variant="body" color={Colors.gray}>
          Charts follow the selected dashboard time range.
        </AppText>
      </View>

      <View style={styles.grid}>
        <ChartCard
          title="Users Growth"
          subtitle="Registered users by day"
          data={usersGrowth}
          tone="#60A5FA"
          unavailable="Not available"
        />
        <ChartCard
          title="Waitlist Growth"
          subtitle="Waitlist registrations by day"
          data={waitlistGrowth}
          tone={Colors.gold[400]}
          unavailable="Not available"
        />
        <ChartCard
          title="Premium Growth"
          subtitle="Premium upgrades by day"
          data={premiumGrowth}
          tone={Colors.success}
          unavailable="Not available"
        />
        <ChartCard
          title="Trial Growth"
          subtitle="Trial starts by day"
          data={trialGrowth}
          tone={Colors.warning}
          unavailable="Not available"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  card: {
    flexGrow: 1,
    flexBasis: 320,
    minWidth: 280,
    minHeight: 260,
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardBg,
  },
  chart: {
    minHeight: 168,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  barColumn: {
    flex: 1,
    minWidth: 18,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  barFrame: {
    width: '100%',
    height: 132,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(148,163,184,0.16)',
  },
  barFill: {
    width: '100%',
    borderRadius: BorderRadius.sm,
  },
  unavailable: {
    flex: 1,
    minHeight: 168,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    backgroundColor: Colors.warningBg,
  },
  unavailableText: {
    textAlign: 'center',
  },
});
