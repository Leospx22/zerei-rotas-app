export type FounderWaitlistSort = 'newest' | 'oldest';

export interface FounderWaitlistRpcRow {
  id?: string | number | null;
  name?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  phone_number?: string | null;
  email?: string | null;
  city?: string | null;
  main_platform?: string | null;
  platform?: string | null;
  status?: string | null;
  source?: string | null;
  campaign_source?: string | null;
  referral_source?: string | null;
  assigned_founder?: string | null;
  tags?: string | null;
  contacted_at?: string | null;
  beta_at?: string | null;
  trial_at?: string | null;
  premium_at?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface FounderWaitlistLead {
  id: string;
  name: string;
  whatsapp: string;
  email: string;
  city: string;
  platform: string;
  status: string;
  source: string;
  internalNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface FounderWaitlistRecord extends FounderWaitlistLead {
  phone: string;
  campaignSource: string;
  referralSource: string;
  assignedFounder: string;
  tags: string;
  contactedAt: string;
  betaAt: string;
  trialAt: string;
  premiumAt: string;
}
