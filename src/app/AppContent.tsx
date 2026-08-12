import { useCallback, useLayoutEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthSession } from "../features/auth/useAuthSession";
import { useLoginFlow } from "../features/auth/useLoginFlow";
import { useMedicalLicenseHydration, useSessionExpiration } from "../features/auth/useSessionLifecycle";
import { useMedicalGroupsDomain } from "../features/medicalGroups/useMedicalGroupsDomain";
import { usePatientsDomain } from "../features/patients/usePatientsDomain";
import { useUsersDomain } from "../features/users/useUsersDomain";
import { AppShell } from "../layout/AppShell";
import type { AppView, ModuleMode } from "../appTypes";
import { queryClient } from "../queryClient";
import { useConfirmationDialog } from "../shared/components/ConfirmationDialog";
import { useRouteView } from "../shared/hooks/useRouteView";
import { useThemePreference } from "../shared/hooks/useThemePreference";
import { formatProfileName, API_ASSET_BASE_URL } from "../shared/utils/formatters";
import { getAppAccess, MEDICAL_ALLOWED_ENTRY_PATHS } from "./appAccess";
import { AppMainContent } from "./AppMainContent";
import { AppModals } from "./AppModals";
import { AppPublicContent } from "./AppPublicContent";
import { AppCredentialGate } from "./AppCredentialGate";
import { buildSessionForSelectedClinic, getResetPasswordCompletedMessage } from "./appSession";
import { createAppSortHandlers } from "./appSortHandlers";
import {
  buildBreadcrumbItems,
  getAppTitle,
} from "./appViewMeta";
import { useAppChrome } from "./useAppChrome";

const SESSION_EXPIRED_MESSAGE =
  "Sua sessao expirou. Entre novamente para continuar.";
export function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, persistSession, clearSession } = useAuthSession();
  const { theme, toggleTheme, setThemePreference } = useThemePreference();
  const { confirmAction, confirmationDialog } = useConfirmationDialog();
  const [moduleMode, setModuleMode] = useState<ModuleMode>("list");
  const loginFlow = useLoginFlow({ session, persistSession });
  const {
    loginLoading,
    resetPasswordLoading,
    openDashboardAfterLogin,
    setOpenDashboardAfterLogin,
    resetLoginState,
  } = loginFlow;

  const {
    isAdmin,
    isSuperAdmin,
    isTeam,
    isMedical,
    canAccessDashboard,
    canAccessPatients,
    canConsultCbhpm,
    canAccessAgenda,
    canAccessUsers,
    canEditOwnUser,
    canAccessBilling,
    canAccessReports,
    canAccessMedicalGroups,
    canAccessSettings,
    canCreatePatients,
    canEditPatients,
    canDeletePatients,
    canManagePatientObservacoes,
    patientReadOnly,
    canUseDashboardRoute,
    canUsePatientsRoute,
    canUseUsersRoute,
    canUseProfileRoute,
    canUseBillingRoute,
    canUseReportsRoute,
    canUseMedicalGroupsRoute,
    canUseAgendaRoute,
    canUseSettingsRoute,
    canAccessClinics,
    canUseClinicsRoute,
  } = getAppAccess(session);
  const forceDashboardRoute =
    openDashboardAfterLogin &&
    Boolean(session && !session.user.precisaTrocarSenha);
  const { activeView, navigateToView } = useRouteView({
    session,
    canUseDashboardRoute,
    canUsePatientsRoute,
    canUseUsersRoute,
    canUseProfileRoute,
    canUseBillingRoute,
    canUseReportsRoute,
    canUseMedicalGroupsRoute,
    canUseAgendaRoute,
    canUseSettingsRoute,
    canUseClinicsRoute,
    forceDashboardRoute,
  });
  const appChrome = useAppChrome({ session });
  const normalizedPath = location.pathname.replace(/\/+$/, "") || "/";
  const isResetPasswordRoute = normalizedPath === "/reset-password";
  const resetToken = isResetPasswordRoute
    ? (new URLSearchParams(location.search).get("token")?.trim() ?? "")
    : "";
  const navigateToViewFromInteraction = useCallback(
    (view: AppView, replace = false) => {
      setOpenDashboardAfterLogin(false);
      navigateToView(view, replace);
    },
    [navigateToView],
  );

  const returnToLogin = (infoMessage = "") => {
    resetLoginState(infoMessage);
    navigate("/", { replace: true });
  };

  const handleResetPasswordCompleted = (message: string) => {
    returnToLogin(getResetPasswordCompletedMessage(message));
  };

  function endSession(infoMessage = "") {
    queryClient.clear();
    clearSession();
    appChrome.resetAppChrome();
    usersDomain.resetUsersState();
    patientsDomain.resetPatientsState();
    medicalGroupsDomain.resetMedicalGroupsState();
    if (infoMessage) {
      navigate("/", { replace: true });
    } else {
      navigateToView("dashboard", true);
    }
    setModuleMode("list");
    setOpenDashboardAfterLogin(false);
    resetLoginState(infoMessage);
  }

  function logout() {
    endSession();
  }

  const usersDomain = useUsersDomain({
    session,
    activeView,
    moduleMode,
    canAccessUsers,
    canEditOwnUser,
    isAdmin,
    setModuleMode,
    navigateToView: navigateToViewFromInteraction,
    persistSession,
    loadDashboardSummary: appChrome.loadDashboardSummary,
    onDeleteCurrentUser: logout,
    confirmAction,
  });

  const patientsDomain = usePatientsDomain({
    session,
    activeView,
    moduleMode,
    companyName: appChrome.companyName,
    isAdmin,
    isMedical,
    canAccessPatients,
    canCreatePatients,
    canEditPatients,
    canDeletePatients,
    canConsultCbhpm,
    patientReadOnly,
    setModuleMode,
    navigateToView: navigateToViewFromInteraction,
    loadDashboardSummary: appChrome.loadDashboardSummary,
    confirmAction,
  });
  const medicalGroupsDomain = useMedicalGroupsDomain({
    session,
    activeView,
    moduleMode,
    canAccessMedicalGroups,
    setModuleMode,
    navigateToView: navigateToViewFromInteraction,
    confirmAction,
  });

  const isBusy =
    loginLoading ||
    resetPasswordLoading ||
    usersDomain.formLoading ||
    patientsDomain.pacienteFormLoading ||
    medicalGroupsDomain.formLoading;

  useSessionExpiration(session, () => endSession(SESSION_EXPIRED_MESSAGE));
  useMedicalLicenseHydration(session, persistSession);

  useLayoutEffect(() => {
    if (
      !openDashboardAfterLogin ||
      MEDICAL_ALLOWED_ENTRY_PATHS.has(normalizedPath)
    ) {
      return;
    }

    setOpenDashboardAfterLogin(false);
  }, [normalizedPath, openDashboardAfterLogin]);

  const resetProfileRouteState = () => {
    if (activeView === "profile") {
      usersDomain.resetUserFormState({ suppressProfileAutoOpen: true });
    }
  };

  const openDashboard = () => {
    resetProfileRouteState();

    if (canAccessDashboard) {
      navigateToViewFromInteraction("dashboard");
      setModuleMode("list");
      return;
    }

    if (canAccessPatients) {
      patientsDomain.openPatientsList();
      return;
    }

    if (canEditOwnUser) {
      usersDomain.openMyProfile();
      return;
    }

    if (canAccessBilling) {
      navigateToViewFromInteraction("billing");
      setModuleMode("list");
      return;
    }

    if (canAccessAgenda) {
      navigateToViewFromInteraction("agenda");
      setModuleMode("list");
      return;
    }

    navigateToViewFromInteraction("settings");
    setModuleMode("list");
  };

  const openAgenda = () => {
    resetProfileRouteState();

    if (!canAccessAgenda) {
      openDashboard();
      return;
    }

    navigateToViewFromInteraction("agenda");
    setModuleMode("list");
  };

  const openPatientsListFromMenu = () => {
    resetProfileRouteState();
    patientsDomain.openPatientsList();
  };

  const openMedicalGroups = () => {
    resetProfileRouteState();

    if (!canAccessMedicalGroups) {
      openDashboard();
      return;
    }

    medicalGroupsDomain.openMedicalGroupsList();
  };

  const openBilling = () => {
    resetProfileRouteState();

    if (!canAccessBilling) {
      openDashboard();
      return;
    }

    navigateToViewFromInteraction("billing");
    setModuleMode("list");
  };

  const openReports = () => {
    resetProfileRouteState();
    if (!canAccessReports) return openDashboard();
    navigateToViewFromInteraction("reports");
    setModuleMode("list");
  };

  const openSettings = () => {
    resetProfileRouteState();

    if (!canAccessSettings) {
      openDashboard();
      return;
    }

    navigateToViewFromInteraction("settings");
    setModuleMode("list");
  };

  const openClinics = () => {
    resetProfileRouteState();
    if (!canAccessClinics) {
      openDashboard();
      return;
    }
    navigateToViewFromInteraction("clinics");
    setModuleMode("list");
  };

  const handleClinicSelected = (
    result: import("../types").SelectClinicResponse,
  ) => {
    if (!session) return;
    queryClient.clear();
    appChrome.resetAppChrome();
    persistSession(buildSessionForSelectedClinic(session, result));
    setModuleMode("list");
    navigateToViewFromInteraction("dashboard", true);
  };

  const {
    handleUserSortChange,
    handlePacienteSortChange,
    handleCbhpmSortChange,
    handleMedicalGroupSortChange,
  } = createAppSortHandlers(usersDomain, patientsDomain, medicalGroupsDomain);

  if (!session) {
    return (
      <AppPublicContent
        loginFlow={loginFlow}
        isResetPasswordRoute={isResetPasswordRoute}
        resetToken={resetToken}
        companyName={appChrome.companyName}
        companyPhoto={appChrome.systemSettings.fotoEmpresa}
        isBusy={isBusy}
        theme={theme}
        onThemeToggle={toggleTheme}
        onBackToLogin={() => returnToLogin()}
        onResetCompleted={handleResetPasswordCompleted}
      />
    );
  }

  if (session.user.precisaTrocarSenha || session.user.precisaTrocarPin) {
    return (
      <AppCredentialGate
        session={session}
        theme={theme}
        isBusy={isBusy}
        onThemeToggle={toggleTheme}
        onPasswordChanged={usersDomain.handlePasswordChanged}
        onPinChanged={(token) => persistSession({
          token,
          user: { ...session.user, precisaTrocarPin: false },
        })}
        onLogout={logout}
      />
    );
  }

  const currentUserProfile = formatProfileName(
    session.user.perfilId,
    session.user.perfilNome,
  );
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
    appChrome.systemSettings.fotoEmpresa && session.user.clinicaSlug
      ? `${API_ASSET_BASE_URL}/api/public/clinicas/${session.user.clinicaSlug}/foto`
      : null;
  const breadcrumbItems = buildBreadcrumbItems({
    activeView,
    moduleMode,
    editingId: usersDomain.editingId,
    editingPacienteId: patientsDomain.editingPacienteId,
    patientReadOnly,
    editingGroupId: medicalGroupsDomain.editingGroupId,
    openDashboard,
    openModuleByView: {
      dashboard: openDashboard,
      users: usersDomain.openUsersList,
      profile: usersDomain.openMyProfile,
      patients: patientsDomain.openPatientsList,
      billing: openBilling,
      reports: openReports,
      medicalGroups: openMedicalGroups,
      agenda: openAgenda,
      settings: openSettings,
      clinics: openClinics,
    },
  });

  return (
    <AppShell
      session={session}
      isBusy={isBusy}
      appTitle={getAppTitle(activeView)}
      companyName={appChrome.companyName}
      companyPhoto={currentClinicPhoto}
      activeView={activeView}
      breadcrumbItems={breadcrumbItems}
      notificationsOpen={appChrome.notificationsOpen}
      notificationCount={notificationCount}
      currentUserProfile={currentUserProfile}
      canAccessDashboard={canAccessDashboard}
      canAccessPatients={canAccessPatients}
      canAccessUsers={canAccessUsers}
      canEditOwnUser={canEditOwnUser}
      canAccessBilling={canAccessBilling}
      canAccessMedicalGroups={canAccessMedicalGroups}
      canAccessSettings={canAccessSettings}
      canAccessAgenda={canAccessAgenda}
      canAccessClinics={canAccessClinics}
      usersCount={usersCount}
      pacientesCount={pacientesCount}
      medicalGroupsCount={medicalGroupsDomain.medicalGroupsCount}
      pendingPaymentsCount={pendingPaymentsCount}
      unreadAgendaNotificationCount={unreadAgendaNotificationCount}
      medicalUsers={patientsDomain.medicalUsers}
      convenios={patientsDomain.convenios}
      opmeFornecedores={patientsDomain.opmeFornecedores}
      onToggleNotifications={() => void appChrome.handleToggleNotifications()}
      onLogout={logout}
      onOpenDashboard={openDashboard}
      onOpenUsersList={usersDomain.openUsersList}
      onOpenMyProfile={usersDomain.openMyProfile}
      onOpenPatientsList={openPatientsListFromMenu}
      onOpenBilling={openBilling}
      onOpenReports={openReports}
      onOpenMedicalGroups={openMedicalGroups}
      onOpenAgenda={openAgenda}
      onOpenSettings={openSettings}
      onOpenClinics={openClinics}
      modals={
        <AppModals
          session={session}
          usersDomain={usersDomain}
          patientsDomain={patientsDomain}
          isAdmin={isAdmin}
          notificationsOpen={appChrome.notificationsOpen}
          notifications={appChrome.notifications}
          notificationsLoading={appChrome.notificationsLoading}
          notificationsError={appChrome.notificationsError}
          notificationCount={notificationCount}
          onCloseNotifications={() => appChrome.setNotificationsOpen(false)}
          onOpenObservation={(pacienteId) => {
            appChrome.setNotificationsOpen(false);
            void patientsDomain.handleOpenPacienteObservacoesById(pacienteId);
          }}
          onCbhpmSortChange={handleCbhpmSortChange}
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
          canAccessPatients,
          canAccessUsers,
          canEditOwnUser,
          canAccessBilling,
          canAccessReports,
          canAccessMedicalGroups,
          canAccessAgenda,
          canAccessSettings,
          canCreatePatients,
          canEditPatients,
          canDeletePatients,
          canManagePatientObservacoes,
          patientReadOnly,
          isAdmin,
          isSuperAdmin,
          isTeam,
          isMedical,
          canAccessClinics,
        }}
        counts={{
          usersCount,
          pacientesCount,
          activeUsersCount,
          activePatientsCount,
          pendingPaymentsCount,
          patientFilesCount,
          upcomingEventsCount,
          unreadAgendaNotificationCount,
        }}
        usersDomain={usersDomain}
        patientsDomain={patientsDomain}
        medicalGroupsDomain={medicalGroupsDomain}
        dashboardError={appChrome.dashboardError}
        theme={theme}
        navigation={{
          openUsersList: usersDomain.openUsersList,
          openMyProfile: usersDomain.openMyProfile,
          openPatientsList: patientsDomain.openPatientsList,
          openBilling,
          openReports,
          openMedicalGroups,
          openAgenda,
          openSettings,
          openClinics,
        }}
        sortHandlers={{
          handleUserSortChange,
          handlePacienteSortChange,
          handleMedicalGroupSortChange,
        }}
        onThemeChange={setThemePreference}
        onPasswordChanged={usersDomain.handlePasswordChanged}
        onClinicSelected={handleClinicSelected}
      />
    </AppShell>
  );
}
