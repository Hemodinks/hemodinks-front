import type { LegalAcceptanceStatus } from '../types/legalAcceptance';
import { get, post } from './api';

export function getCurrentLegalAcceptance(token: string) {
  return get<LegalAcceptanceStatus>('/api/legal-acceptances/current', token);
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
  );
}
