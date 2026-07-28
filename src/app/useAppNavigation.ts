import type { Dispatch, SetStateAction } from 'react';
import type { AppView, ModuleMode } from '../appTypes';
import type { MedicalGroupsDomainState } from '../features/medicalGroups/useMedicalGroupsDomain';
import type { PatientsDomainState } from '../features/patients/usePatientsDomain';
import type { UsersDomainState } from '../features/users/useUsersDomain';
import { queryClient } from '../queryClient';
import type { AuthSession } from '../features/auth/authTypes';
import type { SelectClinicResponse } from '../features/clinics/clinicTypes';
import type { AppChromeState } from './useAppChrome';
import { updateSort } from './appSort';

type NavigationAccess = {
  canAccessDashboard: boolean;
  canAccessPatients: boolean;
  canEditOwnUser: boolean;
  canAccessBilling: boolean;
  canAccessAgenda: boolean;
  canAccessMedicalGroups: boolean;
  canAccessSettings: boolean;
  canAccessClinics: boolean;
  isMedical: boolean;
};

type AppNavigationOptions = {
  session: AuthSession | null;
  access: NavigationAccess;
  activeView: AppView;
  usersDomain: UsersDomainState;
  patientsDomain: PatientsDomainState;
  medicalGroupsDomain: MedicalGroupsDomainState;
  appChrome: AppChromeState;
  persistSession: (session: AuthSession) => void;
  setModuleMode: Dispatch<SetStateAction<ModuleMode>>;
  navigateToView: (view: AppView, replace?: boolean) => void;
};

export function useAppNavigation({
  session,
  access,
  activeView,
  usersDomain,
  patientsDomain,
  medicalGroupsDomain,
  appChrome,
  persistSession,
  setModuleMode,
  navigateToView,
}: AppNavigationOptions) {
  const resetProfileRouteState = () => {
    if (activeView === 'profile') {
      usersDomain.resetUserFormState({ suppressProfileAutoOpen: true });
    }
  };

  function openDashboard() {
    resetProfileRouteState();

    if (access.canAccessDashboard) {
      navigateToView('dashboard');
      setModuleMode('list');
      return;
    }
    if (access.canAccessPatients) {
      patientsDomain.openPatientsList();
      return;
    }
    if (access.canEditOwnUser) {
      usersDomain.openMyProfile();
      return;
    }
    if (access.canAccessBilling) {
      navigateToView('billing');
      setModuleMode('list');
      return;
    }
    if (access.canAccessAgenda) {
      navigateToView('agenda');
      setModuleMode('list');
      return;
    }
    navigateToView('settings');
    setModuleMode('list');
  }

  const openAgenda = () => {
    resetProfileRouteState();
    if (!access.canAccessAgenda) {
      openDashboard();
      return;
    }
    navigateToView('agenda');
    setModuleMode('list');
  };

  const openPatientsListFromMenu = () => {
    resetProfileRouteState();
    patientsDomain.openPatientsList();
  };

  const openMedicalGroups = () => {
    resetProfileRouteState();
    if (!access.canAccessMedicalGroups) {
      openDashboard();
      return;
    }
    medicalGroupsDomain.openMedicalGroupsList();
  };

  const openBilling = () => {
    resetProfileRouteState();
    if (!access.canAccessBilling) {
      openDashboard();
      return;
    }
    navigateToView('billing');
    setModuleMode('list');
  };

  const openSettings = () => {
    resetProfileRouteState();
    if (!access.canAccessSettings) {
      openDashboard();
      return;
    }
    navigateToView('settings');
    setModuleMode('list');
  };

  const openAttendances = () => {
    if (!access.canAccessBilling) {
      openDashboard();
      return;
    }
    navigateToView('attendances');
    setModuleMode('list');
  };

  const openFinance = () => {
    if (!access.canAccessBilling || access.isMedical) {
      openDashboard();
      return;
    }
    navigateToView('finance');
    setModuleMode('list');
  };

  const openPrices = () => {
    if (!access.canAccessBilling) {
      openDashboard();
      return;
    }
    navigateToView('prices');
    setModuleMode('list');
  };

  const openClinics = () => {
    resetProfileRouteState();
    if (!access.canAccessClinics) {
      openDashboard();
      return;
    }
    navigateToView('clinics');
    setModuleMode('list');
  };

  const handleClinicSelected = (result: SelectClinicResponse) => {
    if (!session) return;
    queryClient.clear();
    appChrome.resetAppChrome();
    persistSession({
      token: result.token,
      user: {
        ...session.user,
        id: result.clinica.userId,
        clinicaId: result.clinica.clinicaId,
        clinicaSlug: result.clinica.slug,
        perfilId: result.clinica.perfilId,
        perfilNome: result.clinica.perfil,
        modulosLiberados: result.clinica.modulosLiberados,
      },
    });
    setModuleMode('list');
    navigateToView('dashboard', true);
  };

  const handleUserSortChange = (field: string) => {
    updateSort(
      field,
      usersDomain.sortBy,
      usersDomain.setCurrentPage,
      usersDomain.setSortBy,
      usersDomain.setSortDirection,
      field === 'recent' ? 'desc' : 'asc',
    );
  };
  const handlePacienteSortChange = (field: string) => {
    updateSort(
      field,
      patientsDomain.sortBy,
      patientsDomain.setPacienteCurrentPage,
      patientsDomain.setSortBy,
      patientsDomain.setSortDirection,
      field === 'recent' ? 'desc' : 'asc',
    );
  };
  const handleCbhpmSortChange = (field: string) => {
    updateSort(
      field,
      patientsDomain.cbhpmSortBy,
      patientsDomain.setCbhpmCurrentPage,
      patientsDomain.setCbhpmSortBy,
      patientsDomain.setCbhpmSortDirection,
      'asc',
    );
  };
  const handleMedicalGroupSortChange = (field: string) => {
    updateSort(
      field,
      medicalGroupsDomain.sortBy,
      medicalGroupsDomain.setCurrentPage,
      medicalGroupsDomain.setSortBy,
      medicalGroupsDomain.setSortDirection,
      field === 'recent' ? 'desc' : 'asc',
    );
  };

  return {
    openDashboard,
    openAgenda,
    openPatientsListFromMenu,
    openMedicalGroups,
    openBilling,
    openSettings,
    openAttendances,
    openFinance,
    openPrices,
    openClinics,
    handleClinicSelected,
    handleUserSortChange,
    handlePacienteSortChange,
    handleCbhpmSortChange,
    handleMedicalGroupSortChange,
  };
}

export type AppNavigationState = ReturnType<typeof useAppNavigation>;
