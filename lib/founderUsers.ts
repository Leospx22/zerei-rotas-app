import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type {
  FounderUser,
  FounderUserBillingStatus,
  FounderUsersPage,
  FounderUsersQuery,
} from '@/types/founderUsers';

interface FounderUserProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  subscription_status: string | null;
  created_at: string | null;
}

const PROFILE_COLUMNS = 'id,email,full_name,phone,subscription_status,created_at';

function normalizeText(value: string | null | undefined, fallback = 'Nao informado'): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

export function getFounderUserBillingStatus(
  subscriptionStatus: string | null | undefined
): FounderUserBillingStatus {
  return subscriptionStatus === 'active' ? 'premium' : 'trial';
}

export function mapFounderUser(row: FounderUserProfileRow): FounderUser {
  return {
    id: row.id,
    name: normalizeText(row.full_name, 'Sem nome'),
    email: normalizeText(row.email),
    phone: normalizeText(row.phone),
    registrationDate: row.created_at ?? '',
    billingStatus: getFounderUserBillingStatus(row.subscription_status),
  };
}

export async function fetchFounderUsers({
  page,
  pageSize,
  search,
  filter,
}: FounderUsersQuery): Promise<FounderUsersPage> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase nao esta configurado neste ambiente.');
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const normalizedSearch = search.trim();

  let query = supabase
    .from('profiles')
    .select(PROFILE_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filter === 'trial') {
    query = query.neq('subscription_status', 'active');
  }

  if (filter === 'premium') {
    query = query.eq('subscription_status', 'active');
  }

  if (normalizedSearch.length > 0) {
    const escapedSearch = normalizedSearch.replace(/[%_,]/g, '\\$&');
    query = query.or(`email.ilike.%${escapedSearch}%,full_name.ilike.%${escapedSearch}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    users: (data ?? []).map(row => mapFounderUser(row as FounderUserProfileRow)),
    total: count ?? 0,
    page,
    pageSize,
  };
}
