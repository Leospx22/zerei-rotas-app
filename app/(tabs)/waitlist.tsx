import React from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import {
  BarChart3,
  ClipboardList,
  Home,
  User,
  Users,
} from 'lucide-react-native';
import { PageAnalyticsHeader } from '@/components/analytics/PageAnalyticsHeader';
import { FounderWaitlistTable } from '@/components/FounderWaitlistTable';
import { FounderLoadingState } from '@/components/founder/FounderStates';
import { AppText } from '@/components/ui';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { IconSize, Layout } from '@/constants/designSystem';
import { useAnalyticsTime } from '@/contexts/AnalyticsTimeContext';
import { useAuth } from '@/contexts/AuthContext';
import { fetchFounderAdminAccess } from '@/lib/founderAccess';

const sidebarItems = [
  { label: 'Dashboard', href: '/(tabs)' as const, icon: Home },
  { label: 'Metrics', href: '/(tabs)/history' as const, icon: BarChart3 },
  { label: 'Users', href: '/(tabs)/users' as const, icon: Users },
  { label: 'Waitlist', href: '/(tabs)/waitlist' as const, icon: ClipboardList },
  { label: 'Profile', href: '/(tabs)/profile' as const, icon: User },
];

function FounderSidebar({ compact }: { compact: boolean }) {
  const router = useRouter();

  return (
    <View style={[styles.sidebar, compact && styles.sidebarCompact]}>
      {sidebarItems.map(item => {
        const Icon = item.icon;
        const active = item.label === 'Waitlist';
        return (
          <TouchableOpacity
            key={item.label}
            onPress={() => router.push(item.href as never)}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.sidebarItem, active && styles.sidebarItemActive]}
          >
            <Icon size={IconSize.sm} color={active ? Colors.gold[400] : Colors.gray} />
            <AppText variant="label" color={active ? Colors.gold[400] : Colors.gray}>
              {item.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function FounderWaitlistScreen() {
  const { session, loading: authLoading } = useAuth();
  const analyticsTime = useAnalyticsTime();
  const { width } = useWindowDimensions();
  const compact = width < 900;

  const founderAccessQuery = useQuery({
    queryKey: ['founder-admin-access', session?.user.id],
    queryFn: fetchFounderAdminAccess,
    enabled: Boolean(session),
    staleTime: 60_000,
  });
  const showFounderAdmin = Boolean(session) && founderAccessQuery.data === true;

  if (authLoading || (session && founderAccessQuery.isLoading)) {
    return (
      <View style={styles.screen}>
        <FounderLoadingState message="Loading waitlist..." />
      </View>
    );
  }

  if (!showFounderAdmin) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.shell, compact && styles.shellCompact]}>
        <FounderSidebar compact={compact} />

        <ScrollView style={styles.main} contentContainerStyle={styles.content}>
          <PageAnalyticsHeader
            title="Waitlist"
            subtitle="Read-only lead intake from the founder RPC."
            timeRange={analyticsTime.waitlistRange}
            onTimeRangeChange={analyticsTime.setWaitlistRange}
          />

          <FounderWaitlistTable timeRange={analyticsTime.waitlistRange} showHeader={false} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  shell: {
    flex: 1,
    flexDirection: 'row',
  },
  shellCompact: {
    flexDirection: 'column',
  },
  sidebar: {
    width: 220,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderRightWidth: 1,
    borderRightColor: Colors.cardBorder,
    backgroundColor: Colors.cardBg,
  },
  sidebarCompact: {
    width: '100%',
    flexDirection: 'row',
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  sidebarItem: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sidebarItemActive: {
    backgroundColor: Colors.overlay,
    borderColor: Colors.gold[700],
  },
  main: {
    flex: 1,
  },
  content: {
    padding: Layout.screenPadding,
    paddingBottom: Layout.screenBottomPadding,
    gap: Spacing.lg,
  },
});
