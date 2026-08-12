export interface FounderDashboardMetricsRpcRow {
  total_waitlist?: number | string | null;
  new_waitlist_today?: number | string | null;
  new_waitlist_this_week?: number | string | null;
  new_waitlist_this_month?: number | string | null;
  registered_users?: number | string | null;
  trial_users?: number | string | null;
  premium_users?: number | string | null;
  mrr_cents?: number | string | null;
  generated_at?: string | null;
}

export interface FounderDashboardMetrics {
  totalWaitlist: number;
  newWaitlistToday: number;
  newWaitlistThisWeek: number | null;
  newWaitlistThisMonth: number | null;
  registeredUsers: number;
  trialUsers: number;
  premiumUsers: number;
  mrrCents: number;
  generatedAt: string | null;
}
