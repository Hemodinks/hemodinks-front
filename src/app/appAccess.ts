import type { AuthSession } from '../types';
import { LICENSE_FEATURES, hasSessionFeature } from '../shared/utils/license';
import {
  CONTROLLER_PROFILE_ID,
  MEDICAL_PROFILE_ID,
  PATIENT_PROFILE_ID,
} from '../shared/utils/formatters';

export const MEDICAL_ALLOWED_ENTRY_PATHS = new Set([
  '/agenda',
  '/faturamento-medico',
  '/meu-cadastro',
  '/pacientes',
]);

export function getAppAccess(session: AuthSession | null) {
  const currentPerfilId = session?.user.perfilId ?? 0;
  const isAdmin = currentPerfilId === 1;
  const isMedical = currentPerfilId === MEDICAL_PROFILE_ID;
  const isController = currentPerfilId === CONTROLLER_PROFILE_ID;
  const isPatient = currentPerfilId === PATIENT_PROFILE_ID;
  const canAccessDashboard = hasSessionFeature(session?.user, LICENSE_FEATURES.dashboardVisualizar) || isMedical;
  const canAccessPatients = hasSessionFeature(session?.user, LICENSE_FEATURES.pacientesVisualizar) || isMedical;
  const canManagePatients = hasSessionFeature(session?.user, LICENSE_FEATURES.pacientesGerenciar) || isMedical;
  const canConsultCbhpm = hasSessionFeature(session?.user, LICENSE_FEATURES.cbhpmConsultar) || isMedical;
  const canAccessAgenda = !isController;
  const canAccessUsers = isAdmin;
  const canEditOwnUser = isMedical || isPatient;
  const canAccessBilling = isAdmin || isMedical || isController;
  const canAccessMedicalGroups = isAdmin;
  const canAccessSettings = isAdmin;

  return {
    currentPerfilId,
    isAdmin,
    isMedical,
    isController,
    isPatient,
    canAccessDashboard,
    canAccessPatients,
    canManagePatients,
    canConsultCbhpm,
    canAccessAgenda,
    canAccessUsers,
    canEditOwnUser,
    canAccessBilling,
    canAccessMedicalGroups,
    canAccessSettings,
    canCreatePatients: canManagePatients,
    canEditPatients: canManagePatients,
    canDeletePatients: isAdmin,
    canManagePatientObservacoes: canManagePatients,
    patientReadOnly: isPatient,
    canUseDashboardRoute: canAccessDashboard,
    canUsePatientsRoute: canAccessPatients,
    canUseUsersRoute: canAccessUsers,
    canUseProfileRoute: canEditOwnUser,
    canUseBillingRoute: canAccessBilling,
    canUseMedicalGroupsRoute: canAccessMedicalGroups,
    canUseAgendaRoute: canAccessAgenda,
    canUseSettingsRoute: canAccessSettings,
  };
}
