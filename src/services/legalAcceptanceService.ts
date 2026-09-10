import type { LegalAcceptanceStatus } from '../types/legalAcceptance';
import { get, post } from './api';

export function getCurrentLegalAcceptance(token: string, signal?: AbortSignal) {
  return get<LegalAcceptanceStatus>('/api/legal-acceptances/current', token, { signal });
}

export function acceptCurrentLegalDocuments(
  token: string,
  termsOfUseVersion: string,
  privacyNoticeVersion: string,
) {
  return post<LegalAcceptanceStatus>(
    '/api/legal-acceptances/current',
    { termsOfUseVersion, privacyNoticeVersion },
    token,
    { timeout: 60_000 },
  );
}
