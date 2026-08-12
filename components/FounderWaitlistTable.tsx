import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search, Users } from 'lucide-react-native';
import { FounderWaitlistDetailsPanel } from '@/components/FounderWaitlistDetailsPanel';
import {
  FounderEmptyState,
  FounderErrorState,
  FounderInlineSkeleton,
  FounderLoadingState,
} from '@/components/founder/FounderStates';
import { AppButton, AppChip, AppText, DataTable } from '@/components/ui';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { IconSize, StatusTone } from '@/constants/designSystem';
import { getFounderWaitlist, getFounderWaitlistMetrics } from '@/lib/founderWaitlist';
import type { AnalyticsTimeRange } from '@/lib/analyticsTimeRange';
import type { FounderWaitlistLead, FounderWaitlistSort } from '@/types/founderWaitlist';

const PAGE_SIZE = 10;
const ALL_STATUSES = 'all';

function formatDateTime(value: string): string {
  if (!value) return 'Nao informado';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Nao informado';
  return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function formatStatus(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function statusColors(status: string) {
  if (status === 'purchased' || status === 'trial_active' || status === 'registered') {
    return StatusTone.success;
  }
  if (status === 'contacted' || status === 'invited') {
    return StatusTone.warning;
  }
  if (status === 'not_qualified' || status === 'unsubscribed') {
    return StatusTone.error;
  }
  return StatusTone.brand;
}

function StatusPill({ status }: { status: string }) {
  const colors = statusColors(status);

  return (
    <View style={[styles.statusPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={[styles.statusDot, { backgroundColor: colors.foreground }]} />
      <AppText variant="label" color={colors.foreground}>
        {formatStatus(status)}
      </AppText>
    </View>
  );
}

function leadMatchesSearch(lead: FounderWaitlistLead, search: string): boolean {
  const normalized = search.trim().toLocaleLowerCase('pt-BR');
  if (normalized.length === 0) return true;

  return [lead.name, lead.email, lead.whatsapp]
    .some(value => value.toLocaleLowerCase('pt-BR').includes(normalized));
}

function createdAtTime(lead: FounderWaitlistLead): number {
  const time = new Date(lead.createdAt).getTime();
  return Number.isFinite(time) ? time : 0;
}

function MetricCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
}) {
  return (
    <View style={styles.metricCard}>
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

export function FounderWaitlistTable({
  timeRange,
  showHeader = true,
}: {
  timeRange: AnalyticsTimeRange;
  showHeader?: boolean;
}) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(ALL_STATUSES);
  const [sort, setSort] = useState<FounderWaitlistSort>('newest');
  const [page, setPage] = useState(1);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['founder-waitlist', timeRange],
    queryFn: () => getFounderWaitlist(timeRange),
    placeholderData: previous => previous,
    retry: 1,
  });
  const metricsQuery = useQuery({
    queryKey: ['founder-waitlist-metrics', timeRange],
    queryFn: () => getFounderWaitlistMetrics(timeRange),
    placeholderData: previous => previous,
    retry: 1,
  });

  const leads = useMemo(() => query.data ?? [], [query.data]);
  const statuses = useMemo(() => {
    const unique = Array.from(new Set(leads.map(lead => lead.status).filter(Boolean)));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads
      .filter(lead => status === ALL_STATUSES || lead.status === status)
      .filter(lead => leadMatchesSearch(lead, search))
      .sort((a, b) => {
        const diff = createdAtTime(b) - createdAtTime(a);
        return sort === 'newest' ? diff : -diff;
      });
  }, [leads, search, sort, status]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleLeads = filteredLeads.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const firstItem = filteredLeads.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(currentPage * PAGE_SIZE, filteredLeads.length);

  function resetToFirstPage(nextAction: () => void) {
    nextAction();
    setPage(1);
  }

  function closeDetails() {
    setSelectedLeadId(null);
  }

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        flex: 1.2,
        render: (lead: FounderWaitlistLead) => (
          <AppText variant="bodyStrong" numberOfLines={1}>
            {lead.name}
          </AppText>
        ),
      },
      {
        key: 'whatsapp',
        header: 'WhatsApp',
        width: 150,
        render: (lead: FounderWaitlistLead) => (
          <AppText variant="body" color={Colors.gray} numberOfLines={1}>
            {lead.whatsapp}
          </AppText>
        ),
      },
      {
        key: 'email',
        header: 'Email',
        flex: 1.4,
        render: (lead: FounderWaitlistLead) => (
          <AppText variant="body" color={Colors.gray} numberOfLines={1}>
            {lead.email}
          </AppText>
        ),
      },
      {
        key: 'city',
        header: 'City',
        width: 140,
        render: (lead: FounderWaitlistLead) => (
          <AppText variant="body" color={Colors.gray} numberOfLines={1}>
            {lead.city}
          </AppText>
        ),
      },
      {
        key: 'platform',
        header: 'Platform',
        width: 150,
        render: (lead: FounderWaitlistLead) => (
          <AppText variant="body" color={Colors.gray} numberOfLines={1}>
            {lead.platform}
          </AppText>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        width: 150,
        render: (lead: FounderWaitlistLead) => <StatusPill status={lead.status} />,
      },
      {
        key: 'createdAt',
        header: 'Created At',
        width: 170,
        render: (lead: FounderWaitlistLead) => (
          <AppText variant="body" color={Colors.gray}>
            {formatDateTime(lead.createdAt)}
          </AppText>
        ),
      },
    ],
    []
  );

  return (
    <View style={styles.section}>
      {showHeader ? (
        <View style={styles.header}>
          <View>
            <AppText variant="sectionTitle">Waitlist</AppText>
            <AppText variant="body" color={Colors.gray}>
              Read-only lead intake from the founder RPC.
            </AppText>
          </View>
          <View style={styles.totalBadge}>
            <Users size={IconSize.sm} color={Colors.gold[400]} />
            <AppText variant="label" color={Colors.gold[400]}>
              {leads.length} leads
            </AppText>
          </View>
        </View>
      ) : (
        <View style={styles.totalBadge}>
          <Users size={IconSize.sm} color={Colors.gold[400]} />
          <AppText variant="label" color={Colors.gold[400]}>
            {leads.length} leads
          </AppText>
        </View>
      )}

      <View style={styles.metricGrid}>
        <MetricCard label="Total Leads" value={metricsQuery.data?.total} loading={metricsQuery.isLoading} />
        <MetricCard label="New" value={metricsQuery.data?.new} loading={metricsQuery.isLoading} />
        <MetricCard label="Contacted" value={metricsQuery.data?.contacted} loading={metricsQuery.isLoading} />
        <MetricCard label="Converted" value={metricsQuery.data?.converted} loading={metricsQuery.isLoading} />
      </View>

      <View style={[styles.controls, compact && styles.controlsCompact]}>
        <View style={styles.searchBox}>
          <Search size={IconSize.md} color={Colors.gray} />
          <TextInput
            value={search}
            onChangeText={value => resetToFirstPage(() => setSearch(value))}
            placeholder="Search name, email, or WhatsApp"
            placeholderTextColor={Colors.darkGray}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
            accessibilityLabel="Search waitlist by name, email, or WhatsApp"
          />
        </View>

        <View style={styles.filterGroup}>
          <AppChip
            label="Newest"
            selected={sort === 'newest'}
            tone="neutral"
            onPress={() => resetToFirstPage(() => setSort('newest'))}
          />
          <AppChip
            label="Oldest"
            selected={sort === 'oldest'}
            tone="neutral"
            onPress={() => resetToFirstPage(() => setSort('oldest'))}
          />
        </View>
      </View>

      <View style={styles.filterGroup}>
        <AppChip
          label="All statuses"
          selected={status === ALL_STATUSES}
          tone="neutral"
          onPress={() => resetToFirstPage(() => setStatus(ALL_STATUSES))}
        />
        {statuses.map(item => (
          <AppChip
            key={item}
            label={formatStatus(item)}
            selected={status === item}
            tone={item === 'new' ? 'brand' : 'neutral'}
            onPress={() => resetToFirstPage(() => setStatus(item))}
          />
        ))}
      </View>

      {query.isLoading ? (
        <FounderLoadingState message="Loading waitlist..." />
      ) : query.isError ? (
        <FounderErrorState
          title="Unable to load waitlist"
          description="We could not load waitlist leads right now. Please try again."
          onRetry={() => query.refetch()}
        />
      ) : leads.length === 0 ? (
        <FounderEmptyState
          icon={<Users size={IconSize.xl} color={Colors.gray} />}
          title="No waitlist records"
          description="New leads will appear here after the RPC returns records."
        />
      ) : visibleLeads.length === 0 ? (
        <FounderEmptyState
          icon={<Search size={IconSize.xl} color={Colors.gray} />}
          title="No matching leads"
          description="Adjust search or filters to show records from the existing waitlist."
        />
      ) : (
        <DataTable
          columns={columns}
          data={visibleLeads}
          keyExtractor={lead => lead.id}
          minWidth={1080}
          onRowPress={lead => setSelectedLeadId(lead.id)}
        />
      )}

      <View style={styles.pagination}>
        <AppText variant="caption" color={Colors.gray}>
          Showing {firstItem}-{lastItem} of {filteredLeads.length}
        </AppText>
        <View style={styles.paginationActions}>
          <AppButton
            label="Previous"
            variant="ghost"
            fullWidth={false}
            disabled={currentPage <= 1 || query.isFetching}
            leftIcon={<ChevronLeft size={IconSize.sm} color={Colors.gray} />}
            onPress={() => setPage(value => Math.max(1, value - 1))}
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
            onPress={() => setPage(value => Math.min(totalPages, value + 1))}
            style={styles.pageButton}
          />
        </View>
      </View>

      <FounderWaitlistDetailsPanel
        leadId={selectedLeadId}
        isOpen={Boolean(selectedLeadId)}
        onClose={closeDetails}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
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
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: 160,
    minWidth: 140,
    minHeight: 96,
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardBg,
  },
  controls: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  controlsCompact: {
    alignItems: 'stretch',
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
  filterGroup: {
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
