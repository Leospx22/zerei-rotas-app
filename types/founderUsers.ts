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
  phone?: string | null;
  phone_number?: string | null;
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
  premium_expiration?: string | null;
  premium_expires_at?: string | null;
  subscription_expires_at?: string | null;
  premium_activated_at?: string | null;
  subscription_started_at?: string | null;
  last_activity?: string | null;
  last_activity_at?: string | null;
  last_login?: string | null;
  last_login_at?: string | null;
  total_routes?: string | number | null;
  completed_routes?: string | number | null;
  packages_delivered?: string | number | null;
  last_route?: string | null;
  last_route_at?: string | null;
  average_packages_per_route?: string | number | null;
  avg_packages_per_route?: string | number | null;
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

export interface FounderUserDetails extends FounderUser {
  phone: string;
  lastActivity: string;
  lastLogin: string;
  premiumExpiration: string;
  premiumActivatedAt: string;
  totalRoutes: number | null;
  completedRoutes: number | null;
  packagesDelivered: number | null;
  lastRoute: string;
  averagePackagesPerRoute: number | null;
}
