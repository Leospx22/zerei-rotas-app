import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase.ts';

export const WAITLIST_PLATFORMS = [
  'Shopee',
  'Mercado Livre',
  'Amazon',
  'Loggi',
  'Outra',
] as const;

export type WaitlistPlatform = typeof WAITLIST_PLATFORMS[number];

export interface WaitlistLeadInput {
  name: string;
  whatsapp: string;
  email?: string;
  city?: string;
  main_platform: WaitlistPlatform | string;
}

export interface WaitlistLeadPayload {
  name: string;
  whatsapp: string;
  email: string | null;
  city: string | null;
  main_platform: WaitlistPlatform;
  source: 'landing_page';
  metadata: Record<string, never>;
}

export interface WaitlistLeadValidation {
  isValid: boolean;
  errors: string[];
}

export interface WaitlistLeadResult {
  success: boolean;
  error: string | null;
}

export function normalizeWhatsApp(value: string): string {
  return value.replace(/\D/g, '');
}

function hasValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateWaitlistLead(input: WaitlistLeadInput): WaitlistLeadValidation {
  const errors: string[] = [];
  if (!input.name?.trim() || !input.whatsapp?.trim() || !input.main_platform?.trim()) {
    errors.push('Preencha os campos obrigatórios.');
  }
  if (input.whatsapp?.trim() && normalizeWhatsApp(input.whatsapp).length < 10) {
    errors.push('Informe um WhatsApp válido.');
  }
  if (input.email?.trim() && !hasValidEmail(input.email.trim())) {
    errors.push('Informe um e-mail válido.');
  }
  if (
    input.main_platform?.trim()
    && !WAITLIST_PLATFORMS.includes(input.main_platform.trim() as WaitlistPlatform)
  ) {
    errors.push('Selecione uma plataforma válida.');
  }
  return { isValid: errors.length === 0, errors };
}

export function buildWaitlistLeadPayload(input: WaitlistLeadInput): WaitlistLeadPayload {
  const validation = validateWaitlistLead(input);
  if (!validation.isValid) throw new Error(validation.errors[0]);
  return {
    name: input.name.trim(),
    whatsapp: normalizeWhatsApp(input.whatsapp),
    email: input.email?.trim() || null,
    city: input.city?.trim() || null,
    main_platform: input.main_platform.trim() as WaitlistPlatform,
    source: 'landing_page',
    metadata: {},
  };
}

export function getWaitlistLeadFriendlyError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : '';
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : String(error ?? '');
  const normalized = message.toLocaleLowerCase('pt-BR');

  if (code === 'WAITLIST_NOT_CONFIGURED') return 'Lista de teste ainda não configurada.';
  if (code === '23505' || normalized.includes('duplicate') || normalized.includes('unique')) {
    return 'Este WhatsApp já está na lista de teste.';
  }
  if (normalized.includes('campos obrigatórios')) return 'Preencha os campos obrigatórios.';
  if (normalized.includes('whatsapp válido')) return 'Informe um WhatsApp válido.';
  if (normalized.includes('e-mail válido')) return 'Informe um e-mail válido.';
  if (normalized.includes('plataforma válida')) return 'Selecione uma plataforma válida.';
  return 'Não foi possível enviar seus dados agora. Tente novamente em instantes.';
}

export async function submitWaitlistLead(
  input: WaitlistLeadInput,
  client: SupabaseClient | null = supabase
): Promise<WaitlistLeadResult> {
  const validation = validateWaitlistLead(input);
  if (!validation.isValid) return { success: false, error: validation.errors[0] };
  if (!client) {
    return {
      success: false,
      error: getWaitlistLeadFriendlyError({ code: 'WAITLIST_NOT_CONFIGURED' }),
    };
  }

  const payload = buildWaitlistLeadPayload(input);
  const { error } = await client.from('waitlist_leads').insert(payload);
  if (error) return { success: false, error: getWaitlistLeadFriendlyError(error) };
  return { success: true, error: null };
}
