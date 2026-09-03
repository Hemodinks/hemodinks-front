export type LegalDocumentAcceptanceStatus = {
  documentType: 'TermsOfUse' | 'PrivacyNoticeAcknowledgement';
  currentVersion: string;
  acceptedVersion?: string | null;
  acceptedAtUtc?: string | null;
  isCurrent: boolean;
};

export type LegalAcceptanceStatus = {
  requiresAcceptance: boolean;
  termsOfUse: LegalDocumentAcceptanceStatus;
  privacyNotice: LegalDocumentAcceptanceStatus;
};
