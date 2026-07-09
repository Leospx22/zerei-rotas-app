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

// WaitlistLeadPayload preserves metadata for backward-compat with tests;
// the REST call intentionally omits it per the external table contract.
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

const EXTERNAL_SUPABASE_URL = 'https://xmtvjzwcfvjkiaplaiay.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdHZqendjZnZqa2lhcGxhaWF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxODc5NDcsImV4cCI6MjA5Nzc2Mzk0N30.cV8GVo2EmHEK6FOW3MRDuMP9MXT3XX3xdEB48qktDmA';
const WAITLIST_REST_URL = `${EXTERNAL_SUPABASE_URL}/rest/v1/waitlist_leads`;

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

/**
 * Submits a waitlist lead directly to the external Supabase REST API.
 * The Supabase client is not used. Only the six public fields are sent.
 * Success is only returned when the REST response is ok (2xx).
 */
export async function submitWaitlistLead(
  input: WaitlistLeadInput
): Promise<WaitlistLeadResult> {
  const validation = validateWaitlistLead(input);
  if (!validation.isValid) return { success: false, error: validation.errors[0] };

  const payload = {
    name: input.name.trim(),
    whatsapp: normalizeWhatsApp(input.whatsapp),
    email: input.email?.trim() || null,
    city: input.city?.trim() || null,
    main_platform: input.main_platform.trim() as WaitlistPlatform,
    source: 'landing_page' as const,
  };

  console.log(
    'Submitting waitlist lead to external Supabase REST:',
    WAITLIST_REST_URL
  );
  console.log('Waitlist payload:', payload);

  try {
    const response = await fetch(WAITLIST_REST_URL, {
      method: 'POST',
      headers: {
        apikey: EXTERNAL_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${EXTERNAL_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseBody = await response.text();
      console.error('Waitlist REST insert failed:', response.status, responseBody);

      if (
        response.status === 409 ||
        responseBody.includes('23505') ||
        responseBody.includes('waitlist_leads_whatsapp_normalized_key') ||
        responseBody.includes('duplicate key')
      ) {
        return { success: false, error: 'Este WhatsApp já está na lista de teste.' };
      }

      if (responseBody.includes('row-level security') || responseBody.includes('RLS')) {
        return {
          success: false,
          error:
            'Não foi possível salvar seus dados por configuração de segurança. Verifique a política RLS.',
        };
      }

      return {
        success: false,
        error: 'Não foi possível enviar seus dados agora. Tente novamente em instantes.',
      };
    }

    return { success: true, error: null };
  } catch {
    return {
      success: false,
      error:
        'Não foi possível conectar ao servidor. Verifique a configuração do Supabase.',
    };
  }
}
