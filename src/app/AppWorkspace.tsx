import type { ModuleMode } from '../appTypes';
import type { useConfirmationDialog } from '../shared/components/ConfirmationDialog';
import type { useThemePreference } from '../shared/hooks/useThemePreference';
import { AppShell } from '../layout/AppShell';
import type { useAppChrome } from './useAppChrome';
import type { useAppDomains } from './useAppDomains';
import type { useAppNavigation } from './useAppNavigation';
import type { useAppViewPresentation } from './useAppViewPresentation';
import type { useSessionLifecycle } from './useSessionLifecycle';
import type { useAuthSession } from '../features/auth';
import type { getAppAccess } from './appAccess';
import { AppMainContent } from './AppMainContent';
import { AppModals } from './AppModals';
import { getAppTitle } from './appViewMeta';

type AppWorkspaceProps = {
  session: NonNullable<ReturnType<typeof useAuthSession>['session']>;
  moduleMode: ModuleMode;
  isBusy: boolean;
  theme: ReturnType<typeof useThemePreference>['theme'];
  setThemePreference: ReturnType<typeof useThemePreference>['setThemePreference'];
  showPrices: boolean;
  setShowPrices: (visible: boolean) => void;
  access: ReturnType<typeof getAppAccess>;
  appChrome: ReturnType<typeof useAppChrome>;
  domains: ReturnType<typeof useAppDomains>;
  navigation: ReturnType<typeof useAppNavigation>;
  presentation: ReturnType<typeof useAppViewPresentation>;
  lifecycle: ReturnType<typeof useSessionLifecycle>;
  activeView: Parameters<typeof getAppTitle>[0];
  confirmationDialog: ReturnType<typeof useConfirmationDialog>['confirmationDialog'];
};

export function AppWorkspace({
  session,
  moduleMode,
  isBusy,
  theme,
  setThemePreference,
  showPrices,
  setShowPrices,
  access,
  appChrome,
  domains,
  navigation,
  presentation,
  lifecycle,
  activeView,
  confirmationDialog,
}: AppWorkspaceProps) {
  const { usersDomain, patientsDomain, medicalGroupsDomain } = domains;

  return (
    <AppShell
      session={session}
      isBusy={isBusy}
      appTitle={getAppTitle(activeView)}
      companyName={appChrome.companyName}
      companyPhoto={presentation.currentClinicPhoto}
      breadcrumbItems={presentation.breadcrumbItems}
      notificationsOpen={appChrome.notificationsOpen}
      currentUserProfile={presentation.currentUserProfile}
      access={{
        dashboard: access.canAccessDashboard,
        patients: access.canAccessPatients,
        users: access.canAccessUsers,
        ownUser: access.canEditOwnUser,
        billing: access.canAccessBilling,
        prices: showPrices,
        medicalGroups: access.canAccessMedicalGroups,
        settings: access.canAccessSettings,
        agenda: access.canAccessAgenda,
        clinics: access.canAccessClinics,
      }}
      counters={{
        users: presentation.usersCount,
        patients: presentation.pacientesCount,
        medicalGroups: medicalGroupsDomain.medicalGroupsCount,
        attendances: presentation.counts.attendancesCount,
        billings: presentation.counts.billingsCount,
        pendingPayments: presentation.counts.pendingPaymentsCount,
        unreadAgendaNotifications: presentation.counts.unreadAgendaNotificationCount,
        notifications: presentation.notificationCount,
      }}
      lookups={{
        medicalUsers: patientsDomain.medicalUsers,
        convenios: patientsDomain.convenios,
        opmeFornecedores: patientsDomain.opmeFornecedores,
      }}
      actions={{
        toggleNotifications: () => void appChrome.handleToggleNotifications(),
        logout: lifecycle.logout,
      }}
      navigation={{
        activeView,
        openDashboard: navigation.openDashboard,
        openUsersList: usersDomain.openUsersList,
        openMyProfile: usersDomain.openMyProfile,
        openPatientsList: navigation.openPatientsListFromMenu,
        openBilling: navigation.openBilling,
        openAttendances: navigation.openAttendances,
        openFinance: navigation.openFinance,
        openPrices: navigation.openPrices,
        openMedicalGroups: navigation.openMedicalGroups,
        openAgenda: navigation.openAgenda,
        openSettings: navigation.openSettings,
        openClinics: navigation.openClinics,
      }}
      modals={
        <AppModals
          session={session}
          usersDomain={usersDomain}
          patientsDomain={patientsDomain}
          isAdmin={access.isAdmin}
          notificationsOpen={appChrome.notificationsOpen}
          notifications={appChrome.notifications}
          notificationsLoading={appChrome.notificationsLoading}
          notificationsError={appChrome.notificationsError}
          notificationCount={presentation.notificationCount}
          onCloseNotifications={() => appChrome.setNotificationsOpen(false)}
          onOpenObservation={(pacienteId) => {
            appChrome.setNotificationsOpen(false);
            void patientsDomain.handleOpenPacienteObservacoesById(pacienteId);
          }}
          onCbhpmSortChange={navigation.handleCbhpmSortChange}
          onPasswordChanged={usersDomain.handlePasswordChanged}
          confirmationDialog={confirmationDialog}
        />
      }
    >
      <AppMainContent
        session={session}
        activeView={activeView}
        moduleMode={moduleMode}
        companyName={appChrome.companyName}
        access={{
          canAccessPatients: access.canAccessPatients,
          canAccessUsers: access.canAccessUsers,
          canEditOwnUser: access.canEditOwnUser,
          canAccessBilling: access.canAccessBilling,
          canAccessMedicalGroups: access.canAccessMedicalGroups,
          canAccessAgenda: access.canAccessAgenda,
          canAccessSettings: access.canAccessSettings,
          canCreatePatients: access.canCreatePatients,
          canEditPatients: access.canEditPatients,
          canDeletePatients: access.canDeletePatients,
          canManagePatientObservacoes: access.canManagePatientObservacoes,
          patientReadOnly: access.patientReadOnly,
          isAdmin: access.isAdmin,
          isSuperAdmin: access.isSuperAdmin,
          isMedical: access.isMedical,
          canAccessClinics: access.canAccessClinics,
        }}
        counts={{
          usersCount: presentation.usersCount,
          pacientesCount: presentation.pacientesCount,
          ...presentation.counts,
        }}
        usersDomain={usersDomain}
        patientsDomain={patientsDomain}
        medicalGroupsDomain={medicalGroupsDomain}
        dashboardError={appChrome.dashboardError}
        theme={theme}
        showPrices={showPrices}
        navigation={{
          openUsersList: usersDomain.openUsersList,
          openMyProfile: usersDomain.openMyProfile,
          openPatientsList: patientsDomain.openPatientsList,
          openBilling: navigation.openBilling,
          openAttendances: navigation.openAttendances,
          openFinance: navigation.openFinance,
          openPrices: navigation.openPrices,
          openMedicalGroups: navigation.openMedicalGroups,
          openAgenda: navigation.openAgenda,
          openSettings: navigation.openSettings,
          openClinics: navigation.openClinics,
        }}
        sortHandlers={{
          handleUserSortChange: navigation.handleUserSortChange,
          handlePacienteSortChange: navigation.handlePacienteSortChange,
          handleMedicalGroupSortChange: navigation.handleMedicalGroupSortChange,
        }}
        onThemeChange={setThemePreference}
        onShowPricesChange={setShowPrices}
        onPasswordChanged={usersDomain.handlePasswordChanged}
        onClinicSelected={navigation.handleClinicSelected}
      />
    </AppShell>
  );
}
