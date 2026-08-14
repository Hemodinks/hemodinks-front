import { agendaNotificationsTutorial } from './configs/agendaNotificationsTutorial';
import { billingManagementTutorial } from './configs/billingManagementTutorial';
import { clinicRegistrationTutorial } from './configs/clinicRegistrationTutorial';
import { clinicSwitchTutorial } from './configs/clinicSwitchTutorial';
import { fullTextSearchTutorial } from './configs/fullTextSearchTutorial';
import { loginClinicTutorial } from './configs/loginClinicTutorial';
import { patientRegistrationTutorial } from './configs/patientRegistrationTutorial';
import { reportExportTutorial } from './configs/reportExportTutorial';
import { reportsTutorial } from './configs/reportsTutorial';
import { surgeryRegistrationTutorial } from './configs/surgeryRegistrationTutorial';
import { teamIdentificationTutorial } from './configs/teamIdentificationTutorial';
import { userAccessTutorial } from './configs/userAccessTutorial';
import type { TutorialConfig } from './tutorialTypes';

export const TUTORIALS = {
  'login-clinic': loginClinicTutorial,
  'clinic-registration': clinicRegistrationTutorial,
  'team-identification': teamIdentificationTutorial,
  'patient-registration': patientRegistrationTutorial,
  'surgery-registration': surgeryRegistrationTutorial,
  'billing-management': billingManagementTutorial,
  'reports-analytics': reportsTutorial,
  'report-export': reportExportTutorial,
  'full-text-search': fullTextSearchTutorial,
  'user-access': userAccessTutorial,
  'clinic-switch': clinicSwitchTutorial,
  'agenda-notifications': agendaNotificationsTutorial,
} satisfies Record<string, TutorialConfig>;

export type TutorialId = Extract<keyof typeof TUTORIALS, string>;

export function getTutorial(id: string): TutorialConfig | null {
  return id in TUTORIALS ? TUTORIALS[id as TutorialId] : null;
}
