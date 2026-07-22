import type { AuthSession } from '../types';
import { LICENSE_FEATURES, hasSessionFeature } from '../shared/utils/license';
import {
  CONTROLLER_PROFILE_ID,
  MEDICAL_PROFILE_ID,
  PATIENT_PROFILE_ID,
  SUPER_ADMIN_PROFILE_ID,
} from '../shared/utils/formatters';

export const MEDICAL_ALLOWED_ENTRY_PATHS = new Set([
  '/agenda',
  '/faturamento-medico',
  '/meu-cadastro',
  '/pacientes',
]);

export const CLINIC_MODULES = {
  users: 'usuarios',
  patients: 'pacientes',
  billing: 'faturamento',
  medicalGroups: 'grupos-medicos',
  agenda: 'agenda',
} as const;

export function getAppAccess(session: AuthSession | null) {
  const currentPerfilId = session?.user.perfilId ?? 0;
  const isSuperAdmin = currentPerfilId === SUPER_ADMIN_PROFILE_ID;
  const isAdmin = currentPerfilId === 1 || isSuperAdmin;
  const isMedical = currentPerfilId === MEDICAL_PROFILE_ID;
  const isController = currentPerfilId === CONTROLLER_PROFILE_ID;
  const isPatient = currentPerfilId === PATIENT_PROFILE_ID;
  const contractedModules = session?.user.modulosLiberados;
  const hasClinicModule = (module: string) => contractedModules == null
    || contractedModules.includes(module);
  const canAccessDashboard = hasSessionFeature(session?.user, LICENSE_FEATURES.dashboardVisualizar) || isMedical;
  const canAccessPatients = (hasSessionFeature(session?.user, LICENSE_FEATURES.pacientesVisualizar) || isMedical)
    && hasClinicModule(CLINIC_MODULES.patients);
  const canManagePatients = (hasSessionFeature(session?.user, LICENSE_FEATURES.pacientesGerenciar) || isMedical)
    && hasClinicModule(CLINIC_MODULES.patients);
  const canConsultCbhpm = (hasSessionFeature(session?.user, LICENSE_FEATURES.cbhpmConsultar) || isMedical)
    && hasClinicModule(CLINIC_MODULES.patients);
  const canAccessAgenda = hasClinicModule(CLINIC_MODULES.agenda);
  const canAccessUsers = isAdmin && hasClinicModule(CLINIC_MODULES.users);
  const canEditOwnUser = isMedical || isPatient;
  const canAccessBilling = (isAdmin || isMedical || isController) && hasClinicModule(CLINIC_MODULES.billing);
  const canAccessMedicalGroups = (isAdmin || isController) && hasClinicModule(CLINIC_MODULES.medicalGroups);
  const canAccessSettings = isAdmin;

  return {
    currentPerfilId,
    isAdmin,
    isSuperAdmin,
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
    canDeletePatients: isAdmin && hasClinicModule(CLINIC_MODULES.patients),
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
    canAccessClinics: isSuperAdmin,
    canUseClinicsRoute: isSuperAdmin,
  };
}
