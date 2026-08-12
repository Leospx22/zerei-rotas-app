import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  dateIsInAnalyticsRange,
  type AnalyticsTimeRange,
} from '@/lib/analyticsTimeRange';
import type {
  FounderWaitlistLead,
  FounderWaitlistRecord,
  FounderWaitlistRpcRow,
} from '@/types/founderWaitlist';

export interface FounderWaitlistMetrics {
  total: number;
  new: number;
  contacted: number;
  converted: number;
}

type FounderWaitlistRpcPayload =
  | FounderWaitlistRpcRow[]
  | FounderWaitlistRpcRow
  | { get_founder_waitlist: FounderWaitlistRpcRow[] | FounderWaitlistRpcRow }
  | null;

function normalizeText(value: string | null | undefined, fallback = 'Nao informado'): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function normalizeFounderWaitlistRows(payload: FounderWaitlistRpcPayload): FounderWaitlistRpcRow[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  if ('get_founder_waitlist' in payload) {
    const wrapped = payload.get_founder_waitlist;
    return Array.isArray(wrapped) ? wrapped : [wrapped];
  }

  return [payload];
}

export function mapFounderWaitlistLead(
  row: FounderWaitlistRpcRow,
  index: number
): FounderWaitlistLead {
  return {
    id: normalizeText(row.id == null ? null : String(row.id), `waitlist-${index}`),
    name: normalizeText(row.name),
    whatsapp: normalizeText(row.whatsapp),
    email: normalizeText(row.email),
    city: normalizeText(row.city),
    platform: normalizeText(row.main_platform ?? row.platform),
    status: normalizeText(row.status, 'new'),
    source: normalizeText(row.source),
    internalNotes: normalizeText(row.internal_notes ?? row.notes),
    createdAt: normalizeText(row.created_at, ''),
    updatedAt: normalizeText(row.updated_at, ''),
  };
}

export function mapFounderWaitlistRecord(
  row: FounderWaitlistRpcRow,
  index: number
): FounderWaitlistRecord {
  const lead = mapFounderWaitlistLead(row, index);

  return {
    ...lead,
    phone: normalizeText(row.phone ?? row.phone_number ?? row.whatsapp, ''),
    campaignSource: normalizeText(row.campaign_source, ''),
    referralSource: normalizeText(row.referral_source, ''),
    assignedFounder: normalizeText(row.assigned_founder, ''),
    tags: normalizeText(row.tags, ''),
    contactedAt: normalizeText(row.contacted_at, ''),
    betaAt: normalizeText(row.beta_at, ''),
    trialAt: normalizeText(row.trial_at, ''),
    premiumAt: normalizeText(row.premium_at, ''),
  };
}

async function fetchFounderWaitlistRows(): Promise<FounderWaitlistRpcRow[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase nao esta configurado neste ambiente.');
  }

  const { data, error } = await supabase.rpc('get_founder_waitlist');
  if (error) throw error;

  return normalizeFounderWaitlistRows(data as FounderWaitlistRpcPayload);
}

export async function fetchFounderWaitlist(): Promise<FounderWaitlistLead[]> {
  const rows = await fetchFounderWaitlistRows();
  return rows.map(mapFounderWaitlistLead);
}

export async function getFounderWaitlistRecord(
  leadId: string
): Promise<FounderWaitlistRecord | null> {
  const rows = await fetchFounderWaitlistRows();
  const index = rows.findIndex((row, rowIndex) => {
    const mappedId = normalizeText(row.id == null ? null : String(row.id), `waitlist-${rowIndex}`);
    return mappedId === leadId;
  });

  if (index < 0) return null;

  return mapFounderWaitlistRecord(rows[index], index);
}

export async function getFounderWaitlist(
  range: AnalyticsTimeRange
): Promise<FounderWaitlistLead[]> {
  const leads = await fetchFounderWaitlist();
  return leads.filter(lead => dateIsInAnalyticsRange(lead.createdAt, range));
}

export async function getFounderWaitlistMetrics(
  range: AnalyticsTimeRange
): Promise<FounderWaitlistMetrics> {
  const leads = await getFounderWaitlist(range);

  return leads.reduce<FounderWaitlistMetrics>(
    (metrics, lead) => {
      metrics.total += 1;
      if (lead.status === 'new') metrics.new += 1;
      if (lead.status === 'contacted' || lead.status === 'invited') metrics.contacted += 1;
      if (lead.status === 'registered' || lead.status === 'trial_active' || lead.status === 'purchased') {
        metrics.converted += 1;
      }
      return metrics;
    },
    { total: 0, new: 0, contacted: 0, converted: 0 }
  );
}
