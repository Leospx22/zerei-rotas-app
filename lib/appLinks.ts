export const APP_VERSION_LABEL = 'Beta 0.1';
export const BETA_STATUS_TITLE = 'Beta do Zerei Rotas';
export const BETA_STATUS_TEXT =
  'Você está usando uma versão de teste. Sua opinião ajuda a melhorar o app antes do lançamento oficial.';

const DEFAULT_WHATSAPP_SUPPORT_URL = 'https://wa.me/5511959591283';

function validHttpsUrl(value: string | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getFeedbackFormUrl(
  configuredUrl = process.env.EXPO_PUBLIC_FEEDBACK_FORM_URL
): string | null {
  const url = validHttpsUrl(configuredUrl);
  if (!url || url.includes('REPLACE_WITH_FORM_ID')) return null;
  return url;
}

export function getWhatsAppSupportUrl(
  configuredUrl = process.env.EXPO_PUBLIC_WHATSAPP_SUPPORT_URL
): string {
  return validHttpsUrl(configuredUrl) ?? DEFAULT_WHATSAPP_SUPPORT_URL;
}

export function getAppVersionLabel(): string {
  return APP_VERSION_LABEL;
}
