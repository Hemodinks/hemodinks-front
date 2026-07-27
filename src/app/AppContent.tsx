import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LoginScreen } from "../features/auth/LoginScreen";
import { PasswordRequiredScreen } from "../features/auth/PasswordRequiredScreen";
import { ResetPasswordScreen } from "../features/auth/ResetPasswordScreen";
import { useAuthSession } from "../features/auth/useAuthSession";
import { useLoginFlow } from "../features/auth/useLoginFlow";
import { AppShell } from "../layout/AppShell";
import type { AppView, ModuleMode } from "../appTypes";
import { useConfirmationDialog } from "../shared/components/ConfirmationDialog";
import { useRouteView } from "../shared/hooks/useRouteView";
import { useThemePreference } from "../shared/hooks/useThemePreference";
import { getAppAccess, MEDICAL_ALLOWED_ENTRY_PATHS } from "./appAccess";
import { AppMainContent } from "./AppMainContent";
import { AppModals } from "./AppModals";
import { getAppTitle } from "./appViewMeta";
import { useAppChrome } from "./useAppChrome";
import { useAppDomains } from "./useAppDomains";
import { useAppNavigation } from "./useAppNavigation";
import { useAppViewPresentation } from "./useAppViewPresentation";
import { useSessionLifecycle } from "./useSessionLifecycle";

export function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, persistSession, clearSession } = useAuthSession();
  const { theme, toggleTheme, setThemePreference } = useThemePreference();
  const { confirmAction, confirmationDialog } = useConfirmationDialog();
  const [moduleMode, setModuleMode] = useState<ModuleMode>("list");
  const logoutRef = useRef<() => void>(() => undefined);

  const {
    isAdmin,
    isSuperAdmin,
    isMedical,
    canAccessDashboard,
    canAccessPatients,
    canConsultCbhpm,
    canAccessAgenda,
    canAccessUsers,
    canEditOwnUser,
    canAccessBilling,
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
    canUseAttendancesRoute,
    canUseFinanceRoute,
    canUsePricesRoute,
    canUseMedicalGroupsRoute,
    canUseAgendaRoute,
    canUseSettingsRoute,
    canAccessClinics,
    canUseClinicsRoute,
  } = getAppAccess(session);
  const appChrome = useAppChrome({ session });
  const loginFlow = useLoginFlow({
    session,
    persistSession,
    navigate,
    fallbackCompanyName: appChrome.companyName,
    fallbackCompanyPhoto: appChrome.systemSettings.fotoEmpresa,
  });
  const forceDashboardRoute =
    loginFlow.openDashboardAfterLogin &&
    Boolean(session && !session.user.precisaTrocarSenha);
  const { activeView, navigateToView } = useRouteView({
    session,
    canUseDashboardRoute,
    canUsePatientsRoute,
    canUseUsersRoute,
    canUseProfileRoute,
    canUseBillingRoute,
    canUseAttendancesRoute,
    canUseFinanceRoute,
    canUsePricesRoute,
    canUseMedicalGroupsRoute,
    canUseAgendaRoute,
    canUseSettingsRoute,
    canUseClinicsRoute,
    forceDashboardRoute,
  });
  const normalizedPath = location.pathname.replace(/\/+$/, "") || "/";
  const isResetPasswordRoute = normalizedPath === "/reset-password";
  const resetToken = isResetPasswordRoute
    ? (new URLSearchParams(location.search).get("token")?.trim() ?? "")
    : "";
  const navigateToViewFromInteraction = useCallback(
    (view: AppView, replace = false) => {
      loginFlow.setOpenDashboardAfterLogin(false);
      navigateToView(view, replace);
    },
    [navigateToView],
  );

  const { usersDomain, patientsDomain, medicalGroupsDomain } = useAppDomains({
    users: {
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
      onDeleteCurrentUser: () => logoutRef.current(),
      confirmAction,
    },
    patients: {
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
    },
    medicalGroups: {
      session,
      activeView,
      moduleMode,
      canAccessMedicalGroups,
      setModuleMode,
      navigateToView: navigateToViewFromInteraction,
      confirmAction,
    },
  });
  const sessionLifecycle = useSessionLifecycle({
    session,
    persistSession,
    clearSession,
    navigate,
    navigateToDashboard: () => navigateToView("dashboard", true),
    resetDomains: () => {
      usersDomain.resetUsersState();
      patientsDomain.resetPatientsState();
      medicalGroupsDomain.resetMedicalGroupsState();
    },
    resetAppChrome: appChrome.resetAppChrome,
    resetModuleMode: () => setModuleMode("list"),
    resetLoginFlow: (infoMessage) => {
      loginFlow.setOpenDashboardAfterLogin(false);
      loginFlow.setLoginError("");
      loginFlow.setLoginInfo(infoMessage);
      loginFlow.setLoginPassword("");
    },
  });
  logoutRef.current = sessionLifecycle.logout;
  const appNavigation = useAppNavigation({
    session,
    access: {
      canAccessDashboard,
      canAccessPatients,
      canEditOwnUser,
      canAccessBilling,
      canAccessAgenda,
      canAccessMedicalGroups,
      canAccessSettings,
      canAccessClinics,
      isMedical,
    },
    activeView,
    usersDomain,
    patientsDomain,
    medicalGroupsDomain,
    appChrome,
    persistSession,
    setModuleMode,
    navigateToView: navigateToViewFromInteraction,
  });
  const viewPresentation = useAppViewPresentation({
    session,
    activeView,
    moduleMode,
    patientReadOnly,
    usersDomain,
    patientsDomain,
    medicalGroupsDomain,
    appChrome,
    navigation: appNavigation,
  });

  const isBusy =
    loginFlow.loginLoading ||
    loginFlow.resetPasswordLoading ||
    usersDomain.formLoading ||
    patientsDomain.pacienteFormLoading ||
    medicalGroupsDomain.formLoading;

  useLayoutEffect(() => {
    if (
      !loginFlow.openDashboardAfterLogin ||
      MEDICAL_ALLOWED_ENTRY_PATHS.has(normalizedPath)
    ) {
      return;
    }

    loginFlow.setOpenDashboardAfterLogin(false);
  }, [normalizedPath, loginFlow.openDashboardAfterLogin]);

  if (!session && isResetPasswordRoute) {
    return (
      <ResetPasswordScreen
        companyName={appChrome.companyName}
        companyPhoto={appChrome.systemSettings.fotoEmpresa}
        theme={theme}
        token={resetToken}
        onThemeToggle={toggleTheme}
        onBackToLogin={() => loginFlow.returnToLogin()}
        onResetCompleted={loginFlow.handleResetPasswordCompleted}
      />
    );
  }

  if (!session) {
    return (
      <LoginScreen
        companyName={loginFlow.companyName}
        companyPhoto={loginFlow.companyPhoto}
        isBusy={isBusy}
        theme={theme}
        loginEmail={loginFlow.loginEmail}
        loginPassword={loginFlow.loginPassword}
        loginClinicValue={loginFlow.loginClinicValue}
        clinics={loginFlow.publicClinics}
        clinicsLoading={loginFlow.publicClinicsLoading}
        loginError={loginFlow.loginError}
        loginInfo={loginFlow.loginInfo}
        loginLoading={loginFlow.loginLoading}
        resetPasswordLoading={loginFlow.resetPasswordLoading}
        onThemeToggle={toggleTheme}
        onLoginEmailChange={loginFlow.setLoginEmail}
        onLoginPasswordChange={loginFlow.setLoginPassword}
        onLoginClinicChange={loginFlow.setLoginClinicValue}
        onSubmit={loginFlow.handleLogin}
        onResetPassword={() => void loginFlow.handleResetPassword()}
      />
    );
  }

  if (session.user.precisaTrocarSenha) {
    return (
      <PasswordRequiredScreen
        session={session}
        isBusy={isBusy}
        theme={theme}
        onThemeToggle={toggleTheme}
        onPasswordChanged={usersDomain.handlePasswordChanged}
        onLogout={sessionLifecycle.logout}
      />
    );
  }

  return (
    <AppShell
      session={session}
      isBusy={isBusy}
      appTitle={getAppTitle(activeView)}
      companyName={appChrome.companyName}
      companyPhoto={viewPresentation.currentClinicPhoto}
      activeView={activeView}
      breadcrumbItems={viewPresentation.breadcrumbItems}
      notificationsOpen={appChrome.notificationsOpen}
      notificationCount={viewPresentation.notificationCount}
      currentUserProfile={viewPresentation.currentUserProfile}
      canAccessDashboard={canAccessDashboard}
      canAccessPatients={canAccessPatients}
      canAccessUsers={canAccessUsers}
      canEditOwnUser={canEditOwnUser}
      canAccessBilling={canAccessBilling}
      canAccessMedicalGroups={canAccessMedicalGroups}
      canAccessSettings={canAccessSettings}
      canAccessAgenda={canAccessAgenda}
      canAccessClinics={canAccessClinics}
      usersCount={viewPresentation.usersCount}
      pacientesCount={viewPresentation.pacientesCount}
      medicalGroupsCount={medicalGroupsDomain.medicalGroupsCount}
      pendingPaymentsCount={viewPresentation.counts.pendingPaymentsCount}
      unreadAgendaNotificationCount={
        viewPresentation.counts.unreadAgendaNotificationCount
      }
      medicalUsers={patientsDomain.medicalUsers}
      convenios={patientsDomain.convenios}
      opmeFornecedores={patientsDomain.opmeFornecedores}
      onToggleNotifications={() => void appChrome.handleToggleNotifications()}
      onLogout={sessionLifecycle.logout}
      onOpenDashboard={appNavigation.openDashboard}
      onOpenUsersList={usersDomain.openUsersList}
      onOpenMyProfile={usersDomain.openMyProfile}
      onOpenPatientsList={appNavigation.openPatientsListFromMenu}
      onOpenBilling={appNavigation.openBilling}
      onOpenAttendances={appNavigation.openAttendances}
      onOpenFinance={appNavigation.openFinance}
      onOpenPrices={appNavigation.openPrices}
      onOpenMedicalGroups={appNavigation.openMedicalGroups}
      onOpenAgenda={appNavigation.openAgenda}
      onOpenSettings={appNavigation.openSettings}
      onOpenClinics={appNavigation.openClinics}
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
          notificationCount={viewPresentation.notificationCount}
          onCloseNotifications={() => appChrome.setNotificationsOpen(false)}
          onOpenObservation={(pacienteId) => {
            appChrome.setNotificationsOpen(false);
            void patientsDomain.handleOpenPacienteObservacoesById(pacienteId);
          }}
          onCbhpmSortChange={appNavigation.handleCbhpmSortChange}
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
          isMedical,
          canAccessClinics,
        }}
        counts={{
          usersCount: viewPresentation.usersCount,
          pacientesCount: viewPresentation.pacientesCount,
          ...viewPresentation.counts,
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
          openBilling: appNavigation.openBilling,
          openAttendances: appNavigation.openAttendances,
          openFinance: appNavigation.openFinance,
          openPrices: appNavigation.openPrices,
          openMedicalGroups: appNavigation.openMedicalGroups,
          openAgenda: appNavigation.openAgenda,
          openSettings: appNavigation.openSettings,
          openClinics: appNavigation.openClinics,
        }}
        sortHandlers={{
          handleUserSortChange: appNavigation.handleUserSortChange,
          handlePacienteSortChange: appNavigation.handlePacienteSortChange,
          handleMedicalGroupSortChange:
            appNavigation.handleMedicalGroupSortChange,
        }}
        onThemeChange={setThemePreference}
        onPasswordChanged={usersDomain.handlePasswordChanged}
        onClinicSelected={appNavigation.handleClinicSelected}
      />
    </AppShell>
  );
}
