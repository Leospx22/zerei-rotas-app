import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { BadgeCheck, Clock, UserPlus, Users } from 'lucide-react-native';
import { AppText } from '@/components/ui';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { IconSize } from '@/constants/designSystem';
import type { FounderUser } from '@/types/founderUsers';
import type { FounderWaitlistLead } from '@/types/founderWaitlist';

interface ActivityItem {
  key: string;
  label: string;
  detail: string;
  date: string;
  color: string;
  icon: React.ReactNode;
}

const NOT_AVAILABLE = 'Not available';

function parseTime(value: string): number {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function formatDateTime(value: string): string {
  if (!value) return NOT_AVAILABLE;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return NOT_AVAILABLE;
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function displayText(value: string): string {
  return value.trim().length > 0 && value !== 'Nao informado' ? value : NOT_AVAILABLE;
}

export function RecentActivity({
  users,
  waitlist,
}: {
  users: FounderUser[];
  waitlist: FounderWaitlistLead[];
}) {
  const visible = useMemo(() => {
    const registered = users
      .filter(user => parseTime(user.createdAt) > 0)
      .map<ActivityItem>(user => ({
        key: `registered-${user.id}`,
        label: 'Registered user',
        detail: displayText(user.email),
        date: user.createdAt,
        color: '#60A5FA',
        icon: <Users size={IconSize.sm} color="#60A5FA" />,
      }));

    const leads = waitlist
      .filter(lead => parseTime(lead.createdAt) > 0)
      .map<ActivityItem>(lead => ({
        key: `waitlist-${lead.id}`,
        label: 'Waitlist registration',
        detail: displayText(lead.email),
        date: lead.createdAt,
        color: Colors.gold[400],
        icon: <UserPlus size={IconSize.sm} color={Colors.gold[400]} />,
      }));

    const trials = users
      .filter(user => parseTime(user.trialStart) > 0)
      .map<ActivityItem>(user => ({
        key: `trial-${user.id}`,
        label: 'Trial started',
        detail: displayText(user.email),
        date: user.trialStart,
        color: Colors.warning,
        icon: <Clock size={IconSize.sm} color={Colors.warning} />,
      }));

    const premium = users
      .filter(user => user.status === 'premium' || user.plan === 'premium')
      .map<ActivityItem>(user => ({
        key: `premium-${user.id}`,
        label: 'Premium upgrade',
        detail: displayText(user.email),
        date: '',
        color: Colors.success,
        icon: <BadgeCheck size={IconSize.sm} color={Colors.success} />,
      }));

    const items = [...registered, ...leads, ...trials]
      .sort((left, right) => parseTime(right.date) - parseTime(left.date))
      .slice(0, Math.max(0, 10 - Math.min(premium.length, 2)));

    return [...items, ...premium.slice(0, 10 - items.length)].slice(0, 10);
  }, [users, waitlist]);

  return (
    <View style={styles.section}>
      <View>
        <AppText variant="sectionTitle">Recent Activity</AppText>
        <AppText variant="body" color={Colors.gray}>
          Latest CRM movement from existing read-only data.
        </AppText>
      </View>

      <View style={styles.card}>
        {visible.length > 0 ? (
          visible.map(item => (
            <View key={item.key} style={styles.row}>
              <View style={[styles.icon, { borderColor: `${item.color}66`, backgroundColor: `${item.color}18` }]}>
                {item.icon}
              </View>
              <View style={styles.copy}>
                <AppText variant="bodyStrong">{item.label}</AppText>
                <AppText variant="body" color={Colors.gray} numberOfLines={1}>
                  {item.detail}
                </AppText>
              </View>
              <AppText variant="caption" color={Colors.gray} style={styles.date}>
                {formatDateTime(item.date)}
              </AppText>
            </View>
          ))
        ) : (
          <View style={styles.empty}>
            <AppText variant="bodyStrong" color={Colors.gray}>
              Not available
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.md,
  },
  card: {
    overflow: 'hidden',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardBg,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  icon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  date: {
    width: 96,
    textAlign: 'right',
  },
  empty: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
});
