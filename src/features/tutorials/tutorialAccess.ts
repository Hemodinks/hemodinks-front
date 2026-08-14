import type { TutorialId } from './tutorialRegistry';

type TutorialAccess = {
  canAccessAgenda: boolean;
  canAccessBilling: boolean;
  canAccessClinics: boolean;
  canAccessPatients: boolean;
  canAccessReports: boolean;
  canAccessUsers: boolean;
};

export function getAllowedTutorialIds(access: TutorialAccess): TutorialId[] {
  return [
    ...(access.canAccessClinics ? ['clinic-registration', 'team-identification', 'clinic-switch'] as const : []),
    ...(access.canAccessPatients ? ['patient-registration', 'surgery-registration', 'full-text-search'] as const : []),
    ...(access.canAccessBilling ? ['billing-management'] as const : []),
    ...(access.canAccessReports ? ['reports-analytics', 'report-export'] as const : []),
    ...(access.canAccessUsers ? ['user-access'] as const : []),
    ...(access.canAccessAgenda ? ['agenda-notifications'] as const : []),
  ];
}
