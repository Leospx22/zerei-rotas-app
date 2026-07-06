import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  calculateTrialDaysLeft,
  createRegistrationProfile,
  createTrialPeriod,
  getFunnelStage,
  getMissingProfileFields,
  getProfileCompletion,
  getTrialDisplay,
  sanitizeProfileUpdate,
  shouldRecordProfileCompleted,
  shouldSyncTrialExpiration,
} from '../lib/userProfile.ts';
import { hasSupabaseConfig } from '../lib/supabase.ts';

const NOW = new Date('2026-07-05T12:00:00.000Z');

test('Supabase config is false when environment values are missing', () => {
  assert.equal(hasSupabaseConfig(undefined, undefined), false);
  assert.equal(hasSupabaseConfig('', ''), false);
});

test('trial end is exactly seven days after registration', () => {
  const trial = createTrialPeriod(NOW);
  assert.equal(trial.trialStartedAt, '2026-07-05T12:00:00.000Z');
  assert.equal(trial.trialEndsAt, '2026-07-12T12:00:00.000Z');
});

test('trial days left rounds partial days up and expired trials return zero', () => {
  const profile = { trial_ends_at: '2026-07-12T12:00:00.000Z' };
  assert.equal(calculateTrialDaysLeft(profile, NOW), 7);
  assert.equal(calculateTrialDaysLeft(profile, new Date('2026-07-12T12:00:01.000Z')), 0);
});

test('registration profile defaults to trial and trial_active', () => {
  const profile = createRegistrationProfile(
    { id: 'user-1', email: 'driver@example.com', user_metadata: { full_name: 'Motorista' } },
    NOW
  );
  assert.equal(profile.subscription_status, 'trial');
  assert.equal(profile.funnel_stage, 'trial_active');
});

test('funnel stage reflects active and expired trial states', () => {
  assert.equal(getFunnelStage({ subscription_status: 'trial', trial_ends_at: '2026-07-06T12:00:00.000Z', funnel_stage: 'registered' }, NOW), 'trial_active');
  assert.equal(getFunnelStage({ subscription_status: 'trial', trial_ends_at: '2026-07-04T12:00:00.000Z', funnel_stage: 'trial_active' }, NOW), 'trial_expired');
  assert.equal(getFunnelStage({ subscription_status: 'active', trial_ends_at: null, funnel_stage: 'registered' }, NOW), 'subscribed');
});

test('profile update payload contains only editable fields', () => {
  const payload = sanitizeProfileUpdate({
    id: 'forbidden',
    email: 'forbidden@example.com',
    full_name: 'Nome permitido',
    subscription_status: 'active',
    funnel_stage: 'subscribed',
  });
  assert.deepEqual(payload, { full_name: 'Nome permitido' });
});

test('profile completion reports missing required fields in Portuguese', () => {
  const profile = { full_name: 'Motorista', phone: '11999990000', city: '' };
  const completion = getProfileCompletion(profile);

  assert.equal(completion.isComplete, false);
  assert.equal(completion.completedFields, 2);
  assert.deepEqual(getMissingProfileFields(profile), [
    'Cidade',
    'Estado',
    'Tipo de veículo',
    'Plataforma principal',
  ]);
});

test('profile completion is complete when all six required fields are filled', () => {
  const profile = {
    full_name: 'Motorista',
    phone: '11999990000',
    city: 'São Paulo',
    state: 'SP',
    vehicle_type: 'Carro',
    main_platform: 'Shopee',
  };
  assert.deepEqual(getProfileCompletion(profile), {
    completedFields: 6,
    totalFields: 6,
    percentage: 100,
    missingFields: [],
    isComplete: true,
  });
});

test('trial ending today displays the last-day state', () => {
  const display = getTrialDisplay(
    { subscription_status: 'trial', trial_ends_at: '2026-07-05T23:00:00.000Z' },
    NOW
  );
  assert.equal(display.state, 'trial_last_day');
  assert.equal(display.daysLabel, 'Último dia do teste');
});

test('trial and subscription labels reflect their effective states', () => {
  assert.equal(
    getTrialDisplay({ subscription_status: 'trial', trial_ends_at: '2026-07-12T12:00:00.000Z' }, NOW).accountLabel,
    'Teste ativo'
  );
  assert.equal(
    getTrialDisplay({ subscription_status: 'trial', trial_ends_at: '2026-07-04T12:00:00.000Z' }, NOW).accountLabel,
    'Teste expirado'
  );
  assert.equal(
    getTrialDisplay({ subscription_status: 'active', trial_ends_at: null }, NOW).accountLabel,
    'Assinatura ativa'
  );
});

test('client expiration readiness never targets an active subscription', () => {
  assert.equal(
    shouldSyncTrialExpiration({ subscription_status: 'active', trial_ends_at: '2026-07-04T12:00:00.000Z' }, NOW),
    false
  );
  assert.equal(
    shouldSyncTrialExpiration({ subscription_status: 'trial', trial_ends_at: '2026-07-04T12:00:00.000Z' }, NOW),
    true
  );
});

test('profile completion event is requested only once on incomplete-to-complete transition', () => {
  const incomplete = { full_name: 'Motorista' };
  const complete = {
    full_name: 'Motorista',
    phone: '11999990000',
    city: 'São Paulo',
    state: 'SP',
    vehicle_type: 'Carro',
    main_platform: 'Shopee',
  };
  assert.equal(shouldRecordProfileCompleted(incomplete, complete, false), true);
  assert.equal(shouldRecordProfileCompleted(incomplete, complete, true), false);
  assert.equal(shouldRecordProfileCompleted(complete, complete, false), false);
});

test('profile helpers return a safe null state without a Supabase client', async () => {
  const { getCurrentUser } = await import('../lib/userProfile.ts');
  assert.equal(await getCurrentUser(null), null);
});

test('migration defines profile, funnel event, and subscription foundations', async () => {
  const schema = await readFile(
    new URL('../supabase/migrations/20260705000000_004_auth_profile_foundation.sql', import.meta.url),
    'utf8'
  );
  assert.match(schema, /create table if not exists public\.profiles/i);
  assert.match(schema, /create table if not exists public\.user_funnel_events/i);
  assert.match(schema, /create table if not exists public\.subscriptions/i);
  assert.match(schema, /enable row level security/i);
});
