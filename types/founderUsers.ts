export type FounderUserPlan = 'trial' | 'premium' | 'free' | 'unknown';

export type FounderUserStatus = 'trial' | 'premium' | 'expired' | 'canceled' | 'none' | 'unknown';

export type FounderUsersFilter = 'all' | 'trial' | 'premium' | 'expired';

export type FounderUsersSort = 'newest' | 'oldest';

export interface FounderUserRpcRow {
  id?: string | number | null;
  user_id?: string | number | null;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
  plan?: string | null;
  plan_id?: string | null;
  subscription_plan?: string | null;
  status?: string | null;
  subscription_status?: string | null;
  funnel_stage?: string | null;
  trial_start?: string | null;
  trial_started_at?: string | null;
  trial_end?: string | null;
  trial_ends_at?: string | null;
  created_at?: string | null;
}

export interface FounderUser {
  id: string;
  name: string;
  email: string;
  plan: FounderUserPlan;
  planLabel: string;
  status: FounderUserStatus;
  statusLabel: string;
  trialStart: string;
  trialEnd: string;
  createdAt: string;
}
