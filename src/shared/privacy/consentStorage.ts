export const CONSENT_STORAGE_KEY = 'hemodinks.privacy-consent';
export const PRIVACY_POLICY_VERSION = '1.1';
export const CONSENT_POLICY_VERSION = PRIVACY_POLICY_VERSION;

export type OptionalConsentCategories = {
  preferences: boolean;
  analytics: boolean;
};

export type ConsentRecord = OptionalConsentCategories & {
  necessary: true;
  version: string;
  updatedAt: string;
};

const OPTIONAL_PREFERENCE_KEYS = [
  'hemodinks.theme',
  'hemodinks.dashboard.module-order',
  'hemodinks.tutorials.completed',
  'hemodinks.tutorials.hidden',
  'hemodinks.tutorials.narration-enabled',
] as const;

function isConsentRecord(value: unknown): value is ConsentRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<ConsentRecord>;
  return record.version === PRIVACY_POLICY_VERSION
    && record.necessary === true
    && typeof record.updatedAt === 'string'
    && !Number.isNaN(Date.parse(record.updatedAt))
    && typeof record.preferences === 'boolean'
    && typeof record.analytics === 'boolean';
}

export function readConsent(): ConsentRecord | null {
  try {
    const value = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? 'null');
    return isConsentRecord(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveConsent(
  categories: OptionalConsentCategories,
  updatedAt = new Date().toISOString(),
): ConsentRecord {
  const record: ConsentRecord = {
    necessary: true,
    version: PRIVACY_POLICY_VERSION,
    updatedAt,
    ...categories,
  };
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  return record;
}

export function hasPreferenceConsent() {
  return readConsent()?.preferences === true;
}

export function clearOptionalPreferenceStorage() {
  OPTIONAL_PREFERENCE_KEYS.forEach((key) => localStorage.removeItem(key));
}

export function clearApplicationAnalyticsCookies() {
  if (typeof document === 'undefined' || !document.cookie) return;

  document.cookie.split(';').forEach((entry) => {
    const name = entry.split('=')[0]?.trim();
    if (!name || !/^(?:NREUM|NRAGENT|_?newrelic|_?sentry)/i.test(name)) return;
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
  });
}
