import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  dateIsInAnalyticsRange,
  type AnalyticsTimeRange,
} from '@/lib/analyticsTimeRange';
import type {
  FounderUser,
  FounderUserDetails,
  FounderUserPlan,
  FounderUserRpcRow,
  FounderUserStatus,
} from '@/types/founderUsers';

export interface FounderUserMetricCounts {
  total: number;
  trial: number;
  premium: number;
  expired: number;
}

type FounderUsersRpcPayload =
  | FounderUserRpcRow[]
  | FounderUserRpcRow
  | { get_founder_users: FounderUserRpcRow[] | FounderUserRpcRow }
  | null;

function normalizeText(value: string | number | null | undefined, fallback = 'Nao informado'): string {
  const trimmed = value == null ? '' : String(value).trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeFounderUsersRows(payload: FounderUsersRpcPayload): FounderUserRpcRow[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  if ('get_founder_users' in payload) {
    const wrapped = payload.get_founder_users;
    return Array.isArray(wrapped) ? wrapped : [wrapped];
  }

  return [payload];
}

function normalizeToken(value: string | null | undefined): string {
  return value?.trim().toLocaleLowerCase('pt-BR') ?? '';
}

function formatLabel(value: string, fallback: string): string {
  if (!value) return fallback;

  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toOptionalNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function getPlan(row: FounderUserRpcRow): FounderUserPlan {
  const plan = normalizeToken(row.plan ?? row.subscription_plan ?? row.plan_id);
  const status = normalizeToken(row.subscription_status ?? row.status ?? row.funnel_stage);

  if (plan.includes('premium') || status === 'active' || status === 'subscribed') return 'premium';
  if (plan.includes('trial') || status === 'trial' || status === 'trial_active') return 'trial';
  if (plan.includes('free') || status === 'none' || status === 'registered') return 'free';

  return 'unknown';
}

function getStatus(row: FounderUserRpcRow, plan: FounderUserPlan): FounderUserStatus {
  const status = normalizeToken(row.subscription_status ?? row.status ?? row.funnel_stage);

  if (status === 'active' || status === 'subscribed' || status === 'premium') return 'premium';
  if (status === 'trial' || status === 'trial_active') return 'trial';
  if (status === 'expired' || status === 'trial_expired') return 'expired';
  if (status === 'canceled' || status === 'cancelled' || status === 'churned') return 'canceled';
  if (status === 'none' || status === 'registered') return 'none';

  if (plan === 'premium' || plan === 'trial') return plan;
  if (plan === 'free') return 'none';

  return 'unknown';
}

export function mapFounderUser(row: FounderUserRpcRow, index: number): FounderUser {
  const plan = getPlan(row);
  const status = getStatus(row, plan);

  return {
    id: normalizeText(row.id ?? row.user_id, `founder-user-${index}`),
    name: normalizeText(row.name ?? row.full_name, 'Sem nome'),
    email: normalizeText(row.email),
    plan,
    planLabel: formatLabel(plan, 'Unknown'),
    status,
    statusLabel: formatLabel(status, 'Unknown'),
    trialStart: normalizeText(row.trial_start ?? row.trial_started_at, ''),
    trialEnd: normalizeText(row.trial_end ?? row.trial_ends_at, ''),
    createdAt: normalizeText(row.created_at, ''),
  };
}

export function mapFounderUserDetails(row: FounderUserRpcRow, index: number): FounderUserDetails {
  const user = mapFounderUser(row, index);
  const totalRoutes = toOptionalNumber(row.total_routes);
  const packagesDelivered = toOptionalNumber(row.packages_delivered);
  const explicitAverage = toOptionalNumber(
    row.average_packages_per_route ?? row.avg_packages_per_route
  );
  const averagePackagesPerRoute =
    explicitAverage ?? (
      totalRoutes && packagesDelivered != null
        ? packagesDelivered / totalRoutes
        : null
    );

  return {
    ...user,
    phone: normalizeText(row.phone ?? row.phone_number, ''),
    lastActivity: normalizeText(row.last_activity ?? row.last_activity_at, ''),
    lastLogin: normalizeText(row.last_login ?? row.last_login_at, ''),
    premiumExpiration: normalizeText(
      row.premium_expiration ?? row.premium_expires_at ?? row.subscription_expires_at,
      ''
    ),
    premiumActivatedAt: normalizeText(
      row.premium_activated_at ?? row.subscription_started_at,
      ''
    ),
    totalRoutes,
    completedRoutes: toOptionalNumber(row.completed_routes),
    packagesDelivered,
    lastRoute: normalizeText(row.last_route ?? row.last_route_at, ''),
    averagePackagesPerRoute,
  };
}

export async function fetchFounderUsers(): Promise<FounderUser[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase nao esta configurado neste ambiente.');
  }

  const { data, error } = await supabase.rpc('get_founder_users');
  if (error) throw error;

  return normalizeFounderUsersRows(data as FounderUsersRpcPayload).map(mapFounderUser);
}

export async function getFounderUserDetails(userId: string): Promise<FounderUserDetails | null> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase nao esta configurado neste ambiente.');
  }

  const { data, error } = await supabase.rpc('get_founder_users');
  if (error) throw error;

  const rows = normalizeFounderUsersRows(data as FounderUsersRpcPayload);
  const index = rows.findIndex((row, rowIndex) => {
    const mappedId = normalizeText(row.id ?? row.user_id, `founder-user-${rowIndex}`);
    return mappedId === userId;
  });

  if (index < 0) return null;

  return mapFounderUserDetails(rows[index], index);
}

export async function getFounderUsers(range: AnalyticsTimeRange): Promise<FounderUser[]> {
  const users = await fetchFounderUsers();
  return users.filter(user => dateIsInAnalyticsRange(user.createdAt, range));
}

export async function getFounderUserMetricCounts(
  range: AnalyticsTimeRange
): Promise<FounderUserMetricCounts> {
  const users = await getFounderUsers(range);

  return users.reduce<FounderUserMetricCounts>(
    (counts, user) => {
      counts.total += 1;
      if (user.status === 'trial' || user.plan === 'trial') counts.trial += 1;
      if (user.status === 'premium' || user.plan === 'premium') counts.premium += 1;
      if (user.status === 'expired') counts.expired += 1;
      return counts;
    },
    { total: 0, trial: 0, premium: 0, expired: 0 }
  );
}
