import type { SupabaseClient, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './supabase.ts';

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'canceled' | 'none';
export type FunnelStage =
  | 'registered'
  | 'trial_active'
  | 'trial_expired'
  | 'subscribed'
  | 'canceled'
  | 'churned';

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  vehicle_type: string | null;
  main_platform: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  subscription_status: SubscriptionStatus;
  funnel_stage: FunnelStage;
  created_at: string;
  updated_at: string;
}

export type EditableUserProfile = Pick<
  UserProfile,
  'full_name' | 'phone' | 'city' | 'state' | 'vehicle_type' | 'main_platform'
>;

const EDITABLE_PROFILE_FIELDS: ReadonlyArray<keyof EditableUserProfile> = [
  'full_name',
  'phone',
  'city',
  'state',
  'vehicle_type',
  'main_platform',
];

export function createTrialPeriod(now = new Date()): {
  trialStartedAt: string;
  trialEndsAt: string;
} {
  const trialEndsAt = new Date(now);
  trialEndsAt.setUTCDate(trialEndsAt.getUTCDate() + 7);
  return {
    trialStartedAt: now.toISOString(),
    trialEndsAt: trialEndsAt.toISOString(),
  };
}

export function createRegistrationProfile(
  user: Pick<User, 'id' | 'email' | 'user_metadata'>,
  now = new Date()
): Partial<UserProfile> & Pick<UserProfile, 'id'> {
  const trial = createTrialPeriod(now);
  return {
    id: user.id,
    email: user.email ?? null,
    full_name:
      typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === 'string'
          ? user.user_metadata.name
          : null,
    trial_started_at: trial.trialStartedAt,
    trial_ends_at: trial.trialEndsAt,
    subscription_status: 'trial',
    funnel_stage: 'trial_active',
    updated_at: now.toISOString(),
  };
}

export function calculateTrialDaysLeft(
  profile: Pick<UserProfile, 'trial_ends_at'> | null,
  now = new Date()
): number {
  if (!profile?.trial_ends_at) return 0;
  const remainingMs = new Date(profile.trial_ends_at).getTime() - now.getTime();
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / 86_400_000);
}

export function getFunnelStage(
  profile: Pick<UserProfile, 'subscription_status' | 'trial_ends_at' | 'funnel_stage'>,
  now = new Date()
): FunnelStage {
  if (profile.subscription_status === 'active') return 'subscribed';
  if (profile.subscription_status === 'canceled') return 'canceled';
  if (profile.subscription_status === 'expired') return 'trial_expired';
  if (profile.subscription_status === 'trial') {
    return calculateTrialDaysLeft(profile, now) > 0 ? 'trial_active' : 'trial_expired';
  }
  return profile.funnel_stage;
}

export function sanitizeProfileUpdate(
  patch: Partial<UserProfile>
): Partial<EditableUserProfile> {
  return Object.fromEntries(
    EDITABLE_PROFILE_FIELDS
      .filter(field => Object.prototype.hasOwnProperty.call(patch, field))
      .map(field => [field, patch[field]])
  );
}

export async function getCurrentUser(client: SupabaseClient | null = supabase): Promise<User | null> {
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error) return null;
  return data.user;
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const user = await getCurrentUser();
  if (!user || !supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error) return null;
  return data as UserProfile | null;
}

export async function createProfileForUser(user: User): Promise<UserProfile | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const payload = createRegistrationProfile(user);
  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id', ignoreDuplicates: true })
    .select('*')
    .maybeSingle();
  if (error) return null;
  return data as UserProfile | null;
}

export async function updateUserProfile(
  patch: Partial<UserProfile>
): Promise<UserProfile | null> {
  const user = await getCurrentUser();
  if (!user || !supabase) return null;
  const safePatch = sanitizeProfileUpdate(patch);
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...safePatch, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select('*')
    .single();
  if (error) throw error;
  await recordFunnelEvent(user.id, 'profile_updated', { fields: Object.keys(safePatch) });
  return data as UserProfile;
}

export async function startTrialForUser(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const trial = createTrialPeriod();
  const { data, error } = await supabase
    .from('profiles')
    .update({
      trial_started_at: trial.trialStartedAt,
      trial_ends_at: trial.trialEndsAt,
      subscription_status: 'trial',
      funnel_stage: 'trial_active',
      updated_at: trial.trialStartedAt,
    })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  await recordFunnelEvent(userId, 'trial_started');
  return data as UserProfile;
}

export async function recordFunnelEvent(
  userId: string,
  eventType: string,
  eventData: Record<string, unknown> = {}
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { error } = await supabase.from('user_funnel_events').insert({
    user_id: userId,
    event_type: eventType,
    event_data: eventData,
  });
  return !error;
}
