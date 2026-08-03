import type { ReactNode } from 'react';
import type { DashboardModuleId } from './dashboardModuleOrder';

export type DashboardPageProps = {
  companyName: string;
  canAccessPatients: boolean;
  canAccessUsers: boolean;
  canEditOwnUser: boolean;
  canAccessBilling: boolean;
  canAccessMedicalGroups: boolean;
  canAccessAgenda: boolean;
  canAccessSettings: boolean;
  canAccessClinics: boolean;
  isSuperAdmin: boolean;
  patientReadOnly: boolean;
  usersCount: number;
  pacientesCount: number;
  activeUsersCount: number;
  activePatientsCount: number;
  pendingPaymentsCount: number;
  patientFilesCount: number;
  upcomingEventsCount: number;
  unreadAgendaNotificationCount: number;
  successMessage: string;
  dashboardError: string;
  onOpenUsersList: () => void;
  onOpenMyProfile: () => void;
  onOpenPatientsList: () => void;
  onOpenController: () => void;
  onOpenClinics: () => void;
  onOpenMedicalGroups: () => void;
  onOpenAgenda: () => void;
  onOpenSettings: () => void;
};

export type DashboardModule = {
  id: DashboardModuleId;
  title: string;
  metric: string;
  footerLabel: string;
  className: string;
  ariaLabel: string;
  icon: ReactNode;
  onOpen: () => void;
  badge?: string;
};
