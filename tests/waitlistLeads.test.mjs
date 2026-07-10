import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  WAITLIST_PLATFORMS,
  buildWaitlistLeadPayload,
  getWaitlistLeadFriendlyError,
  normalizeWhatsApp,
  submitWaitlistLead,
  validateWaitlistLead,
} from '../lib/waitlistLeads.ts';

const validLead = {
  name: 'Motorista Beta',
  whatsapp: '(11) 95959-1283',
  email: 'motorista@example.com',
  city: 'São Paulo',
  main_platform: 'Shopee',
};

test('normalizeWhatsApp removes every non-digit character', () => {
  assert.equal(normalizeWhatsApp('+55 (11) 95959-1283'), '5511959591283');
});

test('valid Brazilian WhatsApp and every allowed platform pass validation', () => {
  for (const platform of WAITLIST_PLATFORMS) {
    assert.equal(validateWaitlistLead({ ...validLead, main_platform: platform }).isValid, true);
  }
});

test('missing name fails required-field validation', () => {
  const result = validateWaitlistLead({ ...validLead, name: '' });
  assert.equal(result.isValid, false);
  assert.equal(result.errors.includes('Preencha os campos obrigatórios.'), true);
});

test('missing WhatsApp fails required-field validation', () => {
  const result = validateWaitlistLead({ ...validLead, whatsapp: '' });
  assert.equal(result.isValid, false);
  assert.equal(result.errors.includes('Preencha os campos obrigatórios.'), true);
});

test('too-short WhatsApp fails with friendly validation', () => {
  const result = validateWaitlistLead({ ...validLead, whatsapp: '12345' });
  assert.equal(result.isValid, false);
  assert.equal(result.errors.includes('Informe um WhatsApp válido.'), true);
});

test('invalid optional email fails with friendly validation', () => {
  const result = validateWaitlistLead({ ...validLead, email: 'invalid-email' });
  assert.equal(result.isValid, false);
  assert.equal(result.errors.includes('Informe um e-mail válido.'), true);
});

test('invalid platform fails validation', () => {
  const result = validateWaitlistLead({ ...validLead, main_platform: 'Desconhecida' });
  assert.equal(result.isValid, false);
  assert.equal(result.errors.includes('Selecione uma plataforma válida.'), true);
});

test('public payload contains only safe fields and defaults its source', () => {
  const payload = buildWaitlistLeadPayload({
    ...validLead,
    status: 'purchased',
    notes: 'protected',
    converted_user_id: 'protected',
  });

  assert.deepEqual(Object.keys(payload).sort(), [
    'city',
    'email',
    'main_platform',
    'metadata',
    'name',
    'source',
    'whatsapp',
  ]);
  assert.equal(payload.source, 'landing_page');
  assert.equal('status' in payload, false);
  assert.equal('notes' in payload, false);
  assert.equal('converted_user_id' in payload, false);
});

test('duplicate database error maps to friendly Portuguese message', () => {
  assert.equal(
    getWaitlistLeadFriendlyError({ code: '23505', message: 'duplicate key value' }),
    'Este WhatsApp já está na lista de teste.'
  );
});

test('network failure returns friendly connection error without real Supabase access', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('network disabled in test');
  };
  try {
    assert.deepEqual(await submitWaitlistLead(validLead), {
      success: false,
      error: 'Não foi possível conectar ao servidor. Verifique a configuração do Supabase.',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('unavailable waitlist configuration error maps to friendly copy', () => {
  assert.equal(
    getWaitlistLeadFriendlyError({ code: 'WAITLIST_NOT_CONFIGURED' }),
    'Lista de teste ainda não configurada.'
  );
});

test('migration grants anonymous inserts only to public form columns', () => {
  const migration = readFileSync(
    new URL('../supabase/migrations/20260706000000_005_waitlist_leads.sql', import.meta.url),
    'utf8'
  );

  assert.match(
    migration,
    /grant insert \(name, whatsapp, email, city, main_platform, source, metadata\)[\s\S]*to anon;/
  );
  assert.doesNotMatch(migration, /grant insert on table public\.waitlist_leads to anon;/);
  assert.match(migration, /alter table public\.waitlist_leads enable row level security;/);
  assert.match(migration, /alter table public\.waitlist_lead_events enable row level security;/);
  assert.doesNotMatch(migration, /for (select|update|delete)\s+to anon/i);
});
