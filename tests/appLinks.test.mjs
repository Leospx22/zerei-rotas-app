import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APP_VERSION_LABEL,
  BETA_STATUS_TEXT,
  getAppVersionLabel,
  getFeedbackFormUrl,
  getWhatsAppSupportUrl,
} from '../lib/appLinks.ts';

test('feedback URL returns a configured HTTPS form safely', () => {
  assert.equal(
    getFeedbackFormUrl('https://forms.gle/example-form'),
    'https://forms.gle/example-form'
  );
});

test('missing or placeholder feedback URL returns a safe null state', () => {
  assert.equal(getFeedbackFormUrl(undefined), null);
  assert.equal(getFeedbackFormUrl('https://forms.gle/REPLACE_WITH_FORM_ID'), null);
  assert.equal(getFeedbackFormUrl('not-a-url'), null);
});

test('WhatsApp support URL uses configured HTTPS URL or safe default', () => {
  assert.equal(
    getWhatsAppSupportUrl('https://wa.me/5511000000000'),
    'https://wa.me/5511000000000'
  );
  assert.match(getWhatsAppSupportUrl(undefined), /^https:\/\/wa\.me\//);
});

test('app version and beta helper copy are stable', () => {
  assert.equal(getAppVersionLabel(), APP_VERSION_LABEL);
  assert.equal(APP_VERSION_LABEL, 'Beta 0.1');
  assert.equal(
    BETA_STATUS_TEXT,
    'Você está usando uma versão de teste. Sua opinião ajuda a melhorar o app antes do lançamento oficial.'
  );
});

test('feedback event is optional when no feedback URL is configured', () => {
  assert.doesNotThrow(() => getFeedbackFormUrl(''));
  assert.equal(getFeedbackFormUrl(''), null);
});
