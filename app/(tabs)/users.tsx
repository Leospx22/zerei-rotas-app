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
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Home,
  Search,
  User,
  Users,
} from 'lucide-react-native';
import { AppButton, AppChip, AppText, DataTable, EmptyState } from '@/components/ui';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { IconSize, Layout, StatusTone } from '@/constants/designSystem';
import { fetchFounderUsers } from '@/lib/founderUsers';
import type {
  FounderUser,
  FounderUserBillingStatus,
  FounderUsersFilter,
} from '@/types/founderUsers';

const PAGE_SIZE = 20;

const filters: { value: FounderUsersFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'trial', label: 'Trial' },
  { value: 'premium', label: 'Premium' },
];

const sidebarItems = [
  { label: 'Dashboard', href: '/(tabs)' as const, icon: Home },
  { label: 'Metrics', href: '/(tabs)/history' as const, icon: BarChart3 },
  { label: 'Users', href: '/(tabs)/users' as const, icon: Users },
  { label: 'Profile', href: '/(tabs)/profile' as const, icon: User },
];

function formatDate(value: string): string {
  if (!value) return 'Nao informado';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Nao informado';
  return date.toLocaleDateString('pt-BR');
}

function StatusPill({ status }: { status: FounderUserBillingStatus }) {
  const tone = status === 'premium' ? StatusTone.success : StatusTone.warning;
  const label = status === 'premium' ? 'Premium' : 'Trial';

  return (
    <View style={[styles.statusPill, { backgroundColor: tone.background, borderColor: tone.border }]}>
      <View style={[styles.statusDot, { backgroundColor: tone.foreground }]} />
      <AppText variant="label" color={tone.foreground}>
        {label}
      </AppText>
    </View>
  );
}

function UsersSkeleton() {
  return (
    <View style={styles.skeletonFrame}>
      {Array.from({ length: 8 }).map((_, index) => (
        <View key={index} style={styles.skeletonRow}>
          <View style={[styles.skeletonBlock, styles.skeletonName]} />
          <View style={[styles.skeletonBlock, styles.skeletonEmail]} />
          <View style={[styles.skeletonBlock, styles.skeletonPhone]} />
          <View style={[styles.skeletonBlock, styles.skeletonDate]} />
          <View style={[styles.skeletonBlock, styles.skeletonBadge]} />
        </View>
      ))}
    </View>
  );
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
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FounderUsersFilter>('all');
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['founder-users', { page, search, filter }],
    queryFn: () => fetchFounderUsers({ page, pageSize: PAGE_SIZE, search, filter }),
    placeholderData: previous => previous,
    retry: 1,
  });

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const users = query.data?.users ?? [];
  const firstItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, total);

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
        key: 'phone',
        header: 'Phone',
        width: 150,
        render: (user: FounderUser) => (
          <AppText variant="body" color={Colors.gray} numberOfLines={1}>
            {user.phone}
          </AppText>
        ),
      },
      {
        key: 'created',
        header: 'Registration Date',
        width: 160,
        render: (user: FounderUser) => (
          <AppText variant="body" color={Colors.gray}>
            {formatDate(user.registrationDate)}
          </AppText>
        ),
      },
      {
        key: 'status',
        header: 'Plan',
        width: 130,
        render: (user: FounderUser) => <StatusPill status={user.billingStatus} />,
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

  return (
    <View style={styles.screen}>
      <View style={[styles.shell, compact && styles.shellCompact]}>
        <FounderSidebar compact={compact} />

        <ScrollView style={styles.main} contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View>
              <AppText variant="pageTitle">Users Management</AppText>
              <AppText variant="body" color={Colors.gray}>
                Read-only founder view of registered users.
              </AppText>
            </View>
            <View style={styles.totalBadge}>
              <Users size={IconSize.sm} color={Colors.gold[400]} />
              <AppText variant="label" color={Colors.gold[400]}>
                {total} users
              </AppText>
            </View>
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
              {filters.map(item => (
                <AppChip
                  key={item.value}
                  label={item.label}
                  selected={filter === item.value}
                  tone={item.value === 'premium' ? 'success' : item.value === 'trial' ? 'warning' : 'neutral'}
                  onPress={() => changeFilter(item.value)}
                />
              ))}
            </View>
          </View>

          {query.isLoading ? (
            <UsersSkeleton />
          ) : query.isError ? (
            <View style={styles.stateFrame}>
              <EmptyState
                icon={<AlertCircle size={IconSize.xl} color={Colors.error} />}
                title="Unable to load users"
                description={query.error instanceof Error ? query.error.message : 'Please try again.'}
                actionLabel="Retry"
                onAction={() => query.refetch()}
              />
            </View>
          ) : users.length === 0 ? (
            <View style={styles.stateFrame}>
              <EmptyState
                icon={<Users size={IconSize.xl} color={Colors.gray} />}
                title="No users found"
                description="Adjust the search or filter to broaden the list."
              />
            </View>
          ) : (
            <DataTable
              columns={columns}
              data={users}
              keyExtractor={user => user.id}
              minWidth={820}
            />
          )}

          <View style={styles.pagination}>
            <AppText variant="caption" color={Colors.gray}>
              Showing {firstItem}-{lastItem} of {total}
            </AppText>
            <View style={styles.paginationActions}>
              <AppButton
                label="Previous"
                variant="ghost"
                fullWidth={false}
                disabled={page <= 1 || query.isFetching}
                leftIcon={<ChevronLeft size={IconSize.sm} color={Colors.gray} />}
                onPress={() => setPage(current => Math.max(1, current - 1))}
                style={styles.pageButton}
              />
              <AppText variant="label" color={Colors.gray} style={styles.pageCount}>
                {page} / {totalPages}
              </AppText>
              <AppButton
                label="Next"
                variant="ghost"
                fullWidth={false}
                disabled={page >= totalPages || query.isFetching}
                leftIcon={<ChevronRight size={IconSize.sm} color={Colors.gray} />}
                onPress={() => setPage(current => Math.min(totalPages, current + 1))}
                style={styles.pageButton}
              />
            </View>
          </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
    flexWrap: 'wrap',
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
  skeletonFrame: {
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.cardBg,
  },
  skeletonRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  skeletonBlock: {
    height: 14,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary[700],
  },
  skeletonName: {
    flex: 1.2,
  },
  skeletonEmail: {
    flex: 1.5,
  },
  skeletonPhone: {
    width: 110,
  },
  skeletonDate: {
    width: 120,
  },
  skeletonBadge: {
    width: 86,
  },
  stateFrame: {
    minHeight: 300,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.cardBg,
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
