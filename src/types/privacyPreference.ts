export type PrivacyPreferenceStatus = {
  hasPreference: boolean;
  currentDocumentVersion: string;
  documentVersion?: string | null;
  preferencesEnabled: boolean;
  analyticsEnabled: boolean;
  acceptedAtUtc?: string | null;
  updatedAtUtc?: string | null;
};
