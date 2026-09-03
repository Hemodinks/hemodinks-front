import type { PrivacyPreferenceStatus } from '../types/privacyPreference';
import { get, put } from './api';

export function getCurrentPrivacyPreference(token: string) {
  return get<PrivacyPreferenceStatus>('/api/privacy-preferences/current', token);
}

export function updateCurrentPrivacyPreference(
  token: string,
  documentVersion: string,
  preferencesEnabled: boolean,
  analyticsEnabled: boolean,
) {
  return put<PrivacyPreferenceStatus>(
    '/api/privacy-preferences/current',
    { documentVersion, preferencesEnabled, analyticsEnabled },
    token,
  );
}
