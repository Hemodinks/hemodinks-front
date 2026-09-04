import type { ReactNode } from 'react';
import type { AppView, ModuleMode, Theme } from '../appTypes';
import type { AuthSession, SelectClinicResponse } from '../types';
import type { AppChromeState } from './useAppChrome';
import type { UsersDomainState } from '../features/users/useUsersDomain';
import type { PatientsDomainState } from '../features/patients/usePatientsDomain';
import type { MedicalGroupsDomainState } from '../features/medicalGroups/useMedicalGroupsDomain';
import { AppShell } from '../layout/AppShell';
import { API_ASSET_BASE_URL, formatProfileName } from '../shared/utils/formatters';
import { getAllowedTutorialIds } from '../features/tutorials/tutorialAccess';
import { TutorialProvider } from '../features/tutorials/TutorialProvider';
import { getAppAccess } from './appAccess';
import { AppMainContent } from './AppMainContent';
import { AppModals } from './AppModals';
import { buildBreadcrumbItems, getAppTitle } from './appViewMeta';
import { ClinicCnpjWarning } from '../features/clinics/ClinicCnpjWarning';

type AccessState = ReturnType<typeof getAppAccess>;
type Navigation = {
  openDashboard: () => void; openUsersList: () => void; openMyProfile: () => void;
  openPatientsList: () => void; openPatientsListFromMenu: () => void;
  openBilling: () => void; openBillingHistory: () => void; openReports: () => void; openTutorials: () => void;
  openMedicalGroups: () => void; openAgenda: () => void; openSettings: () => void; openClinics: () => void;
  openCurrentClinic: () => void;
};
type SortHandlers = {
  handleUserSortChange: (field: string) => void;
  handlePacienteSortChange: (field: string) => void;
  handleMedicalGroupSortChange: (field: string) => void;
  handleCbhpmSortChange: (field: string) => void;
};

type Props = {
  session: AuthSession;
  activeView: AppView;
  moduleMode: ModuleMode;
  isBusy: boolean;
  theme: Theme;
  access: AccessState;
  appChrome: AppChromeState;
  usersDomain: UsersDomainState;
  patientsDomain: PatientsDomainState;
  medicalGroupsDomain: MedicalGroupsDomainState;
  navigation: Navigation;
  sortHandlers: SortHandlers;
  confirmationDialog: ReactNode;
  onThemeToggle: () => void;
  onThemeChange: (theme: Theme) => void;
  onLogout: () => void;
  onClinicSelected: (result: SelectClinicResponse) => void;
};

export function AuthenticatedAppContent({ session, activeView, moduleMode, isBusy, theme, access, appChrome, usersDomain, patientsDomain, medicalGroupsDomain, navigation, sortHandlers, confirmationDialog, onThemeToggle, onThemeChange, onLogout, onClinicSelected }: Props) {
  const activeUsersCount = appChrome.dashboardSummary?.activeUsersCount ?? 0;
  const activePatientsCount = appChrome.dashboardSummary?.activePatientsCount ?? patientsDomain.pacientesTotalItems;
  const pendingPaymentsCount = appChrome.dashboardSummary?.pendingPaymentsCount ?? 0;
  const patientFilesCount = appChrome.dashboardSummary?.patientFilesCount ?? 0;
  const upcomingEventsCount = appChrome.dashboardSummary?.upcomingEventsCount ?? 0;
  const unreadAgendaNotificationCount = appChrome.dashboardSummary?.unreadAgendaNotificationCount ?? 0;
  const notificationCount = appChrome.notificationsOpen && appChrome.notifications.length
    ? appChrome.notifications.length
    : pendingPaymentsCount + upcomingEventsCount + (appChrome.dashboardSummary?.unreadObservationCount ?? 0) + unreadAgendaNotificationCount;
  const usersCount = appChrome.dashboardSummary?.usersCount ?? usersDomain.usersTotalItems;
  const pacientesCount = appChrome.dashboardSummary?.pacientesCount ?? patientsDomain.pacientesTotalItems;
  const currentClinicPhoto = appChrome.systemSettings.fotoEmpresa && session.user.clinicaSlug
    ? `${API_ASSET_BASE_URL}/api/public/clinicas/${session.user.clinicaSlug}/foto`
    : null;
  const breadcrumbItems = buildBreadcrumbItems({
    activeView,
    moduleMode,
    editingId: usersDomain.editingId,
    editingPacienteId: patientsDomain.editingPacienteId,
    patientReadOnly: access.patientReadOnly,
    editingGroupId: medicalGroupsDomain.editingGroupId,
    openDashboard: navigation.openDashboard,
    openModuleByView: {
      dashboard: navigation.openDashboard, users: navigation.openUsersList, profile: navigation.openMyProfile,
      patients: navigation.openPatientsList, billing: navigation.openBilling, billingHistory: navigation.openBillingHistory,
      reports: navigation.openReports, tutorials: navigation.openTutorials, medicalGroups: navigation.openMedicalGroups,
      agenda: navigation.openAgenda, settings: navigation.openSettings, clinics: navigation.openClinics,
    },
  });
  const allowedTutorialIds = getAllowedTutorialIds({
    canAccessAgenda: access.canAccessAgenda, canAccessBilling: access.canAccessBilling, canAccessClinics: access.canAccessClinics,
    canAccessPatients: access.canAccessPatients, canAccessReports: access.canAccessReports, canAccessUsers: access.canAccessUsers,
  });

  return (
    <TutorialProvider activeView={activeView} allowedTutorialIds={allowedTutorialIds}>
      <AppShell
        banner={<ClinicCnpjWarning session={session} onUpdateClinic={navigation.openCurrentClinic} />}
        session={session}
        isBusy={isBusy}
        appTitle={getAppTitle(activeView)}
        companyName={appChrome.companyName}
        companyPhoto={currentClinicPhoto}
        activeView={activeView}
        breadcrumbItems={breadcrumbItems}
        notificationsOpen={appChrome.notificationsOpen}
        notificationCount={notificationCount}
        theme={theme}
        currentUserProfile={formatProfileName(session.user.perfilId, session.user.perfilNome)}
        canAccessDashboard={access.canAccessDashboard}
        canAccessPatients={access.canAccessPatients}
        canAccessUsers={access.canAccessUsers}
        canEditOwnUser={access.canEditOwnUser}
        canAccessBilling={access.canAccessBilling}
        canAccessMedicalGroups={access.canAccessMedicalGroups}
        canAccessSettings={access.canAccessSettings}
        canAccessAgenda={access.canAccessAgenda}
        canAccessClinics={access.canAccessClinics}
        usersCount={usersCount}
        pacientesCount={pacientesCount}
        medicalGroupsCount={medicalGroupsDomain.medicalGroupsCount}
        pendingPaymentsCount={pendingPaymentsCount}
        unreadAgendaNotificationCount={unreadAgendaNotificationCount}
        medicalUsers={patientsDomain.medicalUsers}
        convenios={patientsDomain.convenios}
        opmeFornecedores={patientsDomain.opmeFornecedores}
        onToggleNotifications={() => void appChrome.handleToggleNotifications()}
        onThemeToggle={onThemeToggle}
        onLogout={onLogout}
        onOpenDashboard={navigation.openDashboard}
        onOpenUsersList={navigation.openUsersList}
        onOpenMyProfile={navigation.openMyProfile}
        onOpenPatientsList={navigation.openPatientsListFromMenu}
        onOpenBilling={navigation.openBilling}
        onOpenBillingHistory={navigation.openBillingHistory}
        onOpenReports={navigation.openReports}
        onOpenTutorials={navigation.openTutorials}
        onOpenMedicalGroups={navigation.openMedicalGroups}
        onOpenAgenda={navigation.openAgenda}
        onOpenSettings={navigation.openSettings}
        onOpenClinics={navigation.openClinics}
        modals={<AppModals
          session={session}
          usersDomain={usersDomain}
          patientsDomain={patientsDomain}
          isAdmin={access.isAdmin}
          notificationsOpen={appChrome.notificationsOpen}
          notifications={appChrome.notifications}
          notificationsLoading={appChrome.notificationsLoading}
          notificationsError={appChrome.notificationsError}
          notificationCount={notificationCount}
          onCloseNotifications={() => appChrome.setNotificationsOpen(false)}
          onOpenObservation={(pacienteId) => { appChrome.setNotificationsOpen(false); void patientsDomain.handleOpenPacienteObservacoesById(pacienteId); }}
          onCbhpmSortChange={sortHandlers.handleCbhpmSortChange}
          onPasswordChanged={usersDomain.handlePasswordChanged}
          confirmationDialog={confirmationDialog}
        />}
      >
        <AppMainContent
          session={session}
          activeView={activeView}
          moduleMode={moduleMode}
          companyName={appChrome.companyName}
          access={access}
          counts={{ usersCount, pacientesCount, activeUsersCount, activePatientsCount, pendingPaymentsCount, patientFilesCount, upcomingEventsCount, unreadAgendaNotificationCount }}
          usersDomain={usersDomain}
          patientsDomain={patientsDomain}
          medicalGroupsDomain={medicalGroupsDomain}
          dashboardError={appChrome.dashboardError}
          theme={theme}
          navigation={{
            openUsersList: navigation.openUsersList, openMyProfile: navigation.openMyProfile, openPatientsList: navigation.openPatientsList,
            openBilling: navigation.openBilling, openReports: navigation.openReports, openTutorials: navigation.openTutorials,
            openMedicalGroups: navigation.openMedicalGroups, openAgenda: navigation.openAgenda, openSettings: navigation.openSettings, openClinics: navigation.openClinics,
          }}
          sortHandlers={sortHandlers}
          onThemeChange={onThemeChange}
          onPasswordChanged={usersDomain.handlePasswordChanged}
          onClinicSelected={onClinicSelected}
        />
      </AppShell>
    </TutorialProvider>
  );
}
