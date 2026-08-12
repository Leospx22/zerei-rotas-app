import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AlertCircle, Bell, TrendingDown, TrendingUp } from 'lucide-react-native';
import { AppText } from '@/components/ui';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { IconSize } from '@/constants/designSystem';
import type { FounderDashboardMetrics } from '@/types/founderDashboardMetrics';
import type { FounderUser } from '@/types/founderUsers';

interface AlertItem {
  key: string;
  title: string;
  detail: string;
  tone: string;
  icon: React.ReactNode;
}

function daysUntil(value: string): number | null {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const diff = date.getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

export function FounderAlerts({
  metrics,
  users,
}: {
  metrics: FounderDashboardMetrics | null;
  users: FounderUser[];
}) {
  const alerts = useMemo<AlertItem[]>(() => {
    const trialsEndingSoon = users.filter(user => {
      const remaining = daysUntil(user.trialEnd);
      return remaining != null && remaining >= 0 && remaining <= 3;
    }).length;
    const premiumConversion = metrics && metrics.registeredUsers > 0
      ? metrics.premiumUsers / metrics.registeredUsers
      : 0;
    const nextAlerts: AlertItem[] = [];

    if (trialsEndingSoon > 0) {
      nextAlerts.push({
        key: 'trials-ending',
        title: 'Trials ending soon',
        detail: `${trialsEndingSoon} trial account(s) end within 3 days.`,
        tone: Colors.warning,
        icon: <Bell size={IconSize.md} color={Colors.warning} />,
      });
    }

    if (metrics && metrics.newWaitlistToday === 0) {
      nextAlerts.push({
        key: 'no-new-users-today',
        title: 'No new waitlist today',
        detail: 'No waitlist registrations have arrived today.',
        tone: Colors.warning,
        icon: <AlertCircle size={IconSize.md} color={Colors.warning} />,
      });
    }

    if (metrics && premiumConversion < 0.1) {
      nextAlerts.push({
        key: 'premium-conversion',
        title: 'Premium conversion below target',
        detail: `Current registered-to-premium conversion is ${Math.round(premiumConversion * 100)}%.`,
        tone: Colors.error,
        icon: <TrendingDown size={IconSize.md} color={Colors.error} />,
      });
    }

    if (metrics && (metrics.newWaitlistThisWeek ?? 0) >= 25) {
      nextAlerts.push({
        key: 'waitlist-growth',
        title: 'Large waitlist growth',
        detail: `${metrics.newWaitlistThisWeek} new waitlist leads this week.`,
        tone: Colors.success,
        icon: <TrendingUp size={IconSize.md} color={Colors.success} />,
      });
    }

    if (nextAlerts.length === 0) {
      nextAlerts.push({
        key: 'steady',
        title: 'No founder alerts',
        detail: 'No simple business-rule alerts are active for the selected data.',
        tone: Colors.success,
        icon: <Bell size={IconSize.md} color={Colors.success} />,
      });
    }

    return nextAlerts;
  }, [metrics, users]);

  return (
    <View style={styles.section}>
      <View>
        <AppText variant="sectionTitle">Founder Alerts</AppText>
        <AppText variant="body" color={Colors.gray}>
          Simple informational rules. No AI scoring.
        </AppText>
      </View>

      <View style={styles.grid}>
        {alerts.map(item => (
          <View
            key={item.key}
            style={[styles.card, { borderColor: `${item.tone}55`, backgroundColor: `${item.tone}10` }]}
          >
            <View style={[styles.icon, { backgroundColor: `${item.tone}1F` }]}>
              {item.icon}
            </View>
            <View style={styles.copy}>
              <AppText variant="bodyStrong">{item.title}</AppText>
              <AppText variant="body" color={Colors.gray}>
                {item.detail}
              </AppText>
            </View>
          </View>
        ))}
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
    flexBasis: 260,
    minWidth: 220,
    minHeight: 108,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  icon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xs,
  },
});
