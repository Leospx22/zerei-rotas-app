import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type {
  FounderDashboardMetrics,
  FounderDashboardMetricsRpcRow,
} from '@/types/founderDashboardMetrics';

type FounderDashboardMetricsRpcPayload =
  | FounderDashboardMetricsRpcRow
  | FounderDashboardMetricsRpcRow[]
  | { get_founder_dashboard_metrics: FounderDashboardMetricsRpcRow | FounderDashboardMetricsRpcRow[] }
  | null;

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function firstRow(
  value: FounderDashboardMetricsRpcRow | FounderDashboardMetricsRpcRow[]
): FounderDashboardMetricsRpcRow | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function normalizeFounderDashboardMetricsRpcRow(
  payload: FounderDashboardMetricsRpcPayload
): FounderDashboardMetricsRpcRow | null {
  if (!payload) return null;

  if (Array.isArray(payload)) {
    return firstRow(payload);
  }

  if ('get_founder_dashboard_metrics' in payload) {
    return firstRow(payload.get_founder_dashboard_metrics);
  }

  return payload;
}

export function mapFounderDashboardMetrics(
  row: FounderDashboardMetricsRpcRow
): FounderDashboardMetrics {
  return {
    totalWaitlist: toNumber(row.total_waitlist),
    newWaitlistToday: toNumber(row.new_waitlist_today),
    newWaitlistThisWeek:
      row.new_waitlist_this_week == null ? null : toNumber(row.new_waitlist_this_week),
    newWaitlistThisMonth:
      row.new_waitlist_this_month == null ? null : toNumber(row.new_waitlist_this_month),
    registeredUsers: toNumber(row.registered_users),
    trialUsers: toNumber(row.trial_users),
    premiumUsers: toNumber(row.premium_users),
    mrrCents: toNumber(row.mrr_cents),
    generatedAt: row.generated_at ?? null,
  };
}

export async function fetchFounderDashboardMetrics(): Promise<FounderDashboardMetrics> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase nao esta configurado neste ambiente.');
  }

  const { data, error } = await supabase.rpc('get_founder_dashboard_metrics');
  if (error) throw error;

  const row = normalizeFounderDashboardMetricsRpcRow(data as FounderDashboardMetricsRpcPayload);
  if (!row) {
    throw new Error('Nenhuma metrica foi retornada pelo RPC do dashboard.');
  }

  return mapFounderDashboardMetrics(row as FounderDashboardMetricsRpcRow);
}
