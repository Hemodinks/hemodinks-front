import type { AppView, BreadcrumbItem, ModuleMode } from "../appTypes";
import type { MedicalGroupsDomainState } from "../features/medicalGroups/useMedicalGroupsDomain";
import type { PatientsDomainState } from "../features/patients/usePatientsDomain";
import type { UsersDomainState } from "../features/users/useUsersDomain";
import {
  API_ASSET_BASE_URL,
  formatProfileName,
} from "../shared/utils/formatters";
import type { AuthSession } from "../types";
import {
  getActiveModuleLabel,
  getFormBreadcrumbLabel,
} from "./appViewMeta";
import type { AppChromeState } from "./useAppChrome";
import type { AppNavigationState } from "./useAppNavigation";

type AppViewPresentationOptions = {
  session: AuthSession | null;
  activeView: AppView;
  moduleMode: ModuleMode;
  patientReadOnly: boolean;
  usersDomain: UsersDomainState;
  patientsDomain: PatientsDomainState;
  medicalGroupsDomain: MedicalGroupsDomainState;
  appChrome: AppChromeState;
  navigation: AppNavigationState;
};

export function useAppViewPresentation({
  session,
  activeView,
  moduleMode,
  patientReadOnly,
  usersDomain,
  patientsDomain,
  medicalGroupsDomain,
  appChrome,
  navigation,
}: AppViewPresentationOptions) {
  const activeUsersCount = appChrome.dashboardSummary?.activeUsersCount ?? 0;
  const activePatientsCount =
    appChrome.dashboardSummary?.activePatientsCount ??
    patientsDomain.pacientesTotalItems;
  const pendingPaymentsCount =
    appChrome.dashboardSummary?.pendingPaymentsCount ?? 0;
  const patientFilesCount = appChrome.dashboardSummary?.patientFilesCount ?? 0;
  const upcomingEventsCount =
    appChrome.dashboardSummary?.upcomingEventsCount ?? 0;
  const unreadObservationCount =
    appChrome.dashboardSummary?.unreadObservationCount ?? 0;
  const unreadAgendaNotificationCount =
    appChrome.dashboardSummary?.unreadAgendaNotificationCount ?? 0;
  const notificationCount =
    appChrome.notificationsOpen && appChrome.notifications.length
      ? appChrome.notifications.length
      : pendingPaymentsCount +
        upcomingEventsCount +
        unreadObservationCount +
        unreadAgendaNotificationCount;
  const usersCount =
    appChrome.dashboardSummary?.usersCount ?? usersDomain.usersTotalItems;
  const pacientesCount =
    appChrome.dashboardSummary?.pacientesCount ??
    patientsDomain.pacientesTotalItems;
  const currentClinicPhoto =
    appChrome.systemSettings.fotoEmpresa && session?.user.clinicaSlug
      ? `${API_ASSET_BASE_URL}/api/public/clinicas/${session.user.clinicaSlug}/foto`
      : null;
  const currentUserProfile = session
    ? formatProfileName(session.user.perfilId, session.user.perfilNome)
    : "";
  const activeModuleLabel = getActiveModuleLabel(activeView);
  const formBreadcrumbLabel = getFormBreadcrumbLabel({
    activeView,
    editingId: usersDomain.editingId,
    editingPacienteId: patientsDomain.editingPacienteId,
    patientReadOnly,
    editingGroupId: medicalGroupsDomain.editingGroupId,
  });
  const openActiveModuleList =
    activeView === "users"
      ? usersDomain.openUsersList
      : activeView === "profile"
        ? usersDomain.openMyProfile
        : activeView === "patients"
          ? patientsDomain.openPatientsList
          : activeView === "attendances"
            ? navigation.openAttendances
            : activeView === "billing"
              ? navigation.openBilling
              : activeView === "finance"
                ? navigation.openFinance
                : activeView === "prices"
                  ? navigation.openPrices
                  : activeView === "medicalGroups"
                    ? navigation.openMedicalGroups
                    : activeView === "settings"
                      ? navigation.openSettings
                      : navigation.openAgenda;
  const resolvedOpenActiveModuleList =
    activeView === "clinics" ? navigation.openClinics : openActiveModuleList;
  const breadcrumbItems: BreadcrumbItem[] =
    activeView === "dashboard"
      ? [
          { label: "Início", onClick: navigation.openDashboard },
          { label: "Painel inicial" },
        ]
      : [
          { label: "Início", onClick: navigation.openDashboard },
          {
            label: activeModuleLabel,
            onClick:
              moduleMode === "form" ? resolvedOpenActiveModuleList : undefined,
          },
          ...(moduleMode === "form" ? [{ label: formBreadcrumbLabel }] : []),
        ];

  return {
    currentUserProfile,
    currentClinicPhoto,
    notificationCount,
    usersCount,
    pacientesCount,
    counts: {
      activeUsersCount,
      activePatientsCount,
      pendingPaymentsCount,
      patientFilesCount,
      upcomingEventsCount,
      unreadAgendaNotificationCount,
    },
    breadcrumbItems,
  };
}

export type AppViewPresentationState = ReturnType<
  typeof useAppViewPresentation
>;
