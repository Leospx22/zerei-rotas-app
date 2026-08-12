import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Home,
  Search,
  User,
  UserCheck,
  UserRoundCheck,
  UserX,
  Users,
} from 'lucide-react-native';
import { PageAnalyticsHeader } from '@/components/analytics/PageAnalyticsHeader';
import { FounderUserDetailsPanel } from '@/components/FounderUserDetailsPanel';
import {
  FounderEmptyState,
  FounderErrorState,
  FounderInlineSkeleton,
  FounderLoadingState,
} from '@/components/founder/FounderStates';
import { AppButton, AppChip, AppText, DataTable } from '@/components/ui';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { IconSize, Layout, StatusTone } from '@/constants/designSystem';
import { useAuth } from '@/contexts/AuthContext';
import { useAnalyticsTime } from '@/contexts/AnalyticsTimeContext';
import { fetchFounderAdminAccess } from '@/lib/founderAccess';
import { getFounderUserMetricCounts, getFounderUsers } from '@/lib/founderUsers';
import type {
  FounderUser,
  FounderUsersFilter,
  FounderUsersSort,
} from '@/types/founderUsers';

const PAGE_SIZE = 10;

const filters: { value: FounderUsersFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'trial', label: 'Trial' },
  { value: 'premium', label: 'Premium' },
  { value: 'expired', label: 'Expired' },
];

const sidebarItems = [
  { label: 'Dashboard', href: '/(tabs)' as const, icon: Home },
  { label: 'Metrics', href: '/(tabs)/history' as const, icon: BarChart3 },
  { label: 'Users', href: '/(tabs)/users' as const, icon: Users },
  { label: 'Waitlist', href: '/(tabs)/waitlist' as const, icon: ClipboardList },
  { label: 'Profile', href: '/(tabs)/profile' as const, icon: User },
];

function formatDate(value: string): string {
  if (!value) return 'Nao informado';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Nao informado';
  return date.toLocaleDateString('pt-BR');
}

function pillTone(value: string) {
  if (value === 'premium') return StatusTone.success;
  if (value === 'trial') return StatusTone.warning;
  if (value === 'expired' || value === 'canceled') return StatusTone.error;
  return StatusTone.brand;
}

function StatusPill({ value, label }: { value: string; label: string }) {
  const tone = pillTone(value);

  return (
    <View style={[styles.statusPill, { backgroundColor: tone.background, borderColor: tone.border }]}>
      <View style={[styles.statusDot, { backgroundColor: tone.foreground }]} />
      <AppText variant="label" color={tone.foreground}>
        {label}
      </AppText>
    </View>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone,
  loading,
}: {
  label: string;
  value: number | undefined;
  icon: React.ReactNode;
  tone: string;
  loading: boolean;
}) {
  return (
    <View style={[styles.metricCard, { borderColor: `${tone}55`, backgroundColor: `${tone}12` }]}>
      <View style={[styles.metricIcon, { backgroundColor: `${tone}1F` }]}>
        {icon}
      </View>
      {loading ? (
        <FounderInlineSkeleton compact />
      ) : (
        <>
          <AppText variant="pageTitle" numberOfLines={1} adjustsFontSizeToFit>
            {String(value ?? 0)}
          </AppText>
          <AppText variant="label" color={Colors.gray} numberOfLines={1}>
            {label}
          </AppText>
        </>
      )}
    </View>
  );
}

function userMatchesSearch(user: FounderUser, search: string): boolean {
  const normalized = search.trim().toLocaleLowerCase('pt-BR');
  if (normalized.length === 0) return true;

  return [user.name, user.email].some(value =>
    value.toLocaleLowerCase('pt-BR').includes(normalized)
  );
}

function createdAtTime(user: FounderUser): number {
  const time = new Date(user.createdAt).getTime();
  return Number.isFinite(time) ? time : 0;
}

function userMatchesFilter(user: FounderUser, filter: FounderUsersFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'premium') return user.plan === 'premium' || user.status === 'premium';
  if (filter === 'trial') return user.plan === 'trial' || user.status === 'trial';
  return user.status === 'expired';
}

function getRpcErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('code' in error)) return null;
  return String(error.code);
}

function FounderSidebar({ compact }: { compact: boolean }) {
  const router = useRouter();

  return (
    <View style={[styles.sidebar, compact && styles.sidebarCompact]}>
      {sidebarItems.map(item => {
        const Icon = item.icon;
        const active = item.label === 'Users';
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

export default function FounderUsersScreen() {
  const { session, loading: authLoading } = useAuth();
  const analyticsTime = useAnalyticsTime();
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FounderUsersFilter>('all');
  const [sort, setSort] = useState<FounderUsersSort>('newest');
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const founderAccessQuery = useQuery({
    queryKey: ['founder-admin-access', session?.user.id],
    queryFn: fetchFounderAdminAccess,
    enabled: Boolean(session),
    staleTime: 60_000,
  });
  const showFounderAdmin = Boolean(session) && founderAccessQuery.data === true;

  const query = useQuery({
    queryKey: ['founder-users', analyticsTime.usersRange],
    queryFn: () => getFounderUsers(analyticsTime.usersRange),
    enabled: showFounderAdmin,
    placeholderData: previous => previous,
    retry: 1,
  });

  const metricsQuery = useQuery({
    queryKey: ['founder-user-metric-counts', analyticsTime.usersRange],
    queryFn: () => getFounderUserMetricCounts(analyticsTime.usersRange),
    enabled: showFounderAdmin,
    placeholderData: previous => previous,
    retry: 1,
  });

  const users = useMemo(() => query.data ?? [], [query.data]);
  const filteredUsers = useMemo(() => {
    return users
      .filter(user => userMatchesFilter(user, filter))
      .filter(user => userMatchesSearch(user, search))
      .sort((a, b) => {
        const diff = createdAtTime(b) - createdAtTime(a);
        return sort === 'newest' ? diff : -diff;
      });
  }, [filter, search, sort, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleUsers = filteredUsers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const firstItem = filteredUsers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(currentPage * PAGE_SIZE, filteredUsers.length);

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        flex: 1.2,
        render: (user: FounderUser) => (
          <AppText variant="bodyStrong" numberOfLines={1}>
            {user.name}
          </AppText>
        ),
      },
      {
        key: 'email',
        header: 'Email',
        flex: 1.5,
        render: (user: FounderUser) => (
          <AppText variant="body" color={Colors.gray} numberOfLines={1}>
            {user.email}
          </AppText>
        ),
      },
      {
        key: 'plan',
        header: 'Plan',
        width: 130,
        render: (user: FounderUser) => (
          <StatusPill value={user.plan} label={user.planLabel} />
        ),
      },
      {
        key: 'status',
        header: 'Status',
        width: 140,
        render: (user: FounderUser) => (
          <StatusPill value={user.status} label={user.statusLabel} />
        ),
      },
      {
        key: 'trialStart',
        header: 'Trial Start',
        width: 140,
        render: (user: FounderUser) => (
          <AppText variant="body" color={Colors.gray}>
            {formatDate(user.trialStart)}
          </AppText>
        ),
      },
      {
        key: 'trialEnd',
        header: 'Trial End',
        width: 140,
        render: (user: FounderUser) => (
          <AppText variant="body" color={Colors.gray}>
            {formatDate(user.trialEnd)}
          </AppText>
        ),
      },
      {
        key: 'createdAt',
        header: 'Registration Date',
        width: 140,
        render: (user: FounderUser) => (
          <AppText variant="body" color={Colors.gray}>
            {formatDate(user.createdAt)}
          </AppText>
        ),
      },
    ],
    []
  );

  function changeFilter(nextFilter: FounderUsersFilter) {
    setFilter(nextFilter);
    setPage(1);
  }

  function changeSearch(nextSearch: string) {
    setSearch(nextSearch);
    setPage(1);
  }

  const isAccessDenied = query.isError && getRpcErrorCode(query.error) === '42501';

  if (authLoading || (session && founderAccessQuery.isLoading)) {
    return (
      <View style={styles.screen}>
        <FounderLoadingState message="Loading users..." />
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
            title="Users Management"
            subtitle="Read-only founder view of registered users."
            timeRange={analyticsTime.usersRange}
            onTimeRangeChange={analyticsTime.setUsersRange}
            actions={(
              <View style={styles.totalBadge}>
                <Users size={IconSize.sm} color={Colors.gold[400]} />
                <AppText variant="label" color={Colors.gold[400]}>
                  {users.length} users
                </AppText>
              </View>
            )}
          />

          <View style={styles.metricGrid}>
            <MetricCard
              label="Total Users"
              value={metricsQuery.data?.total}
              icon={<Users size={IconSize.md} color={Colors.gold[400]} />}
              tone={Colors.gold[500]}
              loading={metricsQuery.isLoading}
            />
            <MetricCard
              label="Trial"
              value={metricsQuery.data?.trial}
              icon={<UserCheck size={IconSize.md} color={Colors.warning} />}
              tone={Colors.warning}
              loading={metricsQuery.isLoading}
            />
            <MetricCard
              label="Premium"
              value={metricsQuery.data?.premium}
              icon={<UserRoundCheck size={IconSize.md} color={Colors.success} />}
              tone={Colors.success}
              loading={metricsQuery.isLoading}
            />
            <MetricCard
              label="Expired"
              value={metricsQuery.data?.expired}
              icon={<UserX size={IconSize.md} color={Colors.error} />}
              tone={Colors.error}
              loading={metricsQuery.isLoading}
            />
          </View>

          <View style={styles.controls}>
            <View style={styles.searchBox}>
              <Search size={IconSize.md} color={Colors.gray} />
              <TextInput
                value={search}
                onChangeText={changeSearch}
                placeholder="Search by name or email"
                placeholderTextColor={Colors.darkGray}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.searchInput}
                accessibilityLabel="Search users by name or email"
              />
            </View>

            <View style={styles.filters}>
              <AppChip
                label="Newest"
                selected={sort === 'newest'}
                tone="neutral"
                onPress={() => {
                  setSort('newest');
                  setPage(1);
                }}
              />
              <AppChip
                label="Oldest"
                selected={sort === 'oldest'}
                tone="neutral"
                onPress={() => {
                  setSort('oldest');
                  setPage(1);
                }}
              />
            </View>
          </View>

          <View style={styles.filters}>
            {filters.map(item => (
              <AppChip
                key={item.value}
                label={item.label}
                selected={filter === item.value}
                tone={
                  item.value === 'premium'
                    ? 'success'
                    : item.value === 'trial'
                      ? 'warning'
                      : item.value === 'expired'
                        ? 'error'
                        : 'neutral'
                }
                onPress={() => changeFilter(item.value)}
              />
            ))}
          </View>

          {query.isLoading ? (
            <FounderLoadingState message="Loading users..." />
          ) : query.isError ? (
            <FounderErrorState
              title={isAccessDenied ? 'Access denied' : 'Unable to load users'}
              description={
                isAccessDenied
                  ? 'Your account does not have founder admin access.'
                  : 'We could not load users right now. Please try again.'
              }
              onRetry={isAccessDenied ? undefined : () => query.refetch()}
            />
          ) : users.length === 0 ? (
            <FounderEmptyState
              icon={<Users size={IconSize.xl} color={Colors.gray} />}
              title="No registered users"
              description="Registered accounts will appear here after the RPC returns records."
            />
          ) : visibleUsers.length === 0 ? (
            <FounderEmptyState
              icon={<Search size={IconSize.xl} color={Colors.gray} />}
              title="No matching users"
              description="Adjust search or filters to show records from the existing users."
            />
          ) : (
            <DataTable
              columns={columns}
              data={visibleUsers}
              keyExtractor={user => user.id}
              minWidth={1120}
              onRowPress={user => setSelectedUserId(user.id)}
            />
          )}

          <View style={styles.pagination}>
            <AppText variant="caption" color={Colors.gray}>
              Showing {firstItem}-{lastItem} of {filteredUsers.length}
            </AppText>
            <View style={styles.paginationActions}>
              <AppButton
                label="Previous"
                variant="ghost"
                fullWidth={false}
                disabled={currentPage <= 1 || query.isFetching}
                leftIcon={<ChevronLeft size={IconSize.sm} color={Colors.gray} />}
                onPress={() => setPage(current => Math.max(1, current - 1))}
                style={styles.pageButton}
              />
              <AppText variant="label" color={Colors.gray} style={styles.pageCount}>
                {currentPage} / {totalPages}
              </AppText>
              <AppButton
                label="Next"
                variant="ghost"
                fullWidth={false}
                disabled={currentPage >= totalPages || query.isFetching}
                leftIcon={<ChevronRight size={IconSize.sm} color={Colors.gray} />}
                onPress={() => setPage(current => Math.min(totalPages, current + 1))}
                style={styles.pageButton}
              />
            </View>
          </View>
        </ScrollView>
      </View>
      <FounderUserDetailsPanel
        userId={selectedUserId}
        isOpen={Boolean(selectedUserId)}
        onClose={() => setSelectedUserId(null)}
      />
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
  totalBadge: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.gold[700],
    backgroundColor: Colors.overlay,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: 170,
    minWidth: 150,
    minHeight: 112,
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  metricIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
  },
  controls: {
    flexDirection: 'row',
    gap: Spacing.md,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  searchBox: {
    minHeight: 52,
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardBg,
  },
  searchInput: {
    flex: 1,
    color: Colors.white,
    fontSize: 14,
  },
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  statusPill: {
    minHeight: 28,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: BorderRadius.full,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  paginationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pageButton: {
    minWidth: 118,
  },
  pageCount: {
    minWidth: 64,
    textAlign: 'center',
  },
});
