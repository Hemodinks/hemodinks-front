import { useCallback, useLayoutEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthSession } from "../features/auth/useAuthSession";
import { useLoginFlow } from "../features/auth/useLoginFlow";
import { useMedicalLicenseHydration, useSessionExpiration } from "../features/auth/useSessionLifecycle";
import { useMedicalGroupsDomain } from "../features/medicalGroups/useMedicalGroupsDomain";
import { usePrivacyPreferenceSession } from "../features/privacy/ConsentProvider";
import { LegalAcceptanceGate } from "../features/legal/LegalAcceptanceGate";
import { useLegalAcceptance } from "../features/legal/useLegalAcceptance";
import { usePatientsDomain } from "../features/patients/usePatientsDomain";
import { useUsersDomain } from "../features/users/useUsersDomain";
import type { AppView, ModuleMode } from "../appTypes";
import { queryClient } from "../queryClient";
import { useConfirmationDialog } from "../shared/components/ConfirmationDialog";
import { useRouteView } from "../shared/hooks/useRouteView";
import { useScrollToTopOnNavigation } from "../shared/hooks/useScrollToTopOnNavigation";
import { useThemePreference } from "../shared/hooks/useThemePreference";
import { getAppAccess, MEDICAL_ALLOWED_ENTRY_PATHS } from "./appAccess";
import { AppPublicContent } from "./AppPublicContent";
import { AppCredentialGate } from "./AppCredentialGate";
import { buildSessionForSelectedClinic, getResetPasswordCompletedMessage } from "./appSession";
import { createAppSortHandlers } from "./appSortHandlers";
import { useAppChrome } from "./useAppChrome";
import { TutorialProvider } from "../features/tutorials/TutorialProvider";
import { AuthenticatedAppContent } from "./AuthenticatedAppContent";
const SESSION_EXPIRED_MESSAGE =
  "Sua sessao expirou. Entre novamente para continuar.";
export function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  useScrollToTopOnNavigation();
  const { session, persistSession, clearSession } = useAuthSession();
  usePrivacyPreferenceSession(session);
  const { theme, toggleTheme, setThemePreference } = useThemePreference();
  const { confirmAction, confirmationDialog } = useConfirmationDialog();
  const [moduleMode, setModuleMode] = useState<ModuleMode>("list");
  const loginFlow = useLoginFlow({ session, persistSession });
  const access = getAppAccess(session);
  const credentialGateActive = Boolean(
    session && (session.user.precisaTrocarSenha || session.user.precisaTrocarPin),
  );
  const legalAcceptance = useLegalAcceptance(credentialGateActive ? null : session);
  const legalGateActive = Boolean(
    session && !credentialGateActive && !legalAcceptance.isCurrent,
  );
  const operationalSession = legalGateActive ? null : session;
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
    isController,
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
    canAccessTutorials,
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
    canUseBillingHistoryRoute,
    canUseReportsRoute,
    canUseTutorialsRoute,
    canUseMedicalGroupsRoute,
    canUseAgendaRoute,
    canUseSettingsRoute,
    canAccessClinics,
    canUseClinicsRoute,
  } = access;
  const forceDashboardRoute =
    openDashboardAfterLogin &&
    Boolean(operationalSession && !operationalSession.user.precisaTrocarSenha);
  const { activeView, navigateToView } = useRouteView({
    session: operationalSession,
    canUseDashboardRoute,
    canUsePatientsRoute,
    canUseUsersRoute,
    canUseProfileRoute,
    canUseBillingRoute,
    canUseBillingHistoryRoute,
    canUseReportsRoute,
    canUseTutorialsRoute,
    canUseMedicalGroupsRoute,
    canUseAgendaRoute,
    canUseSettingsRoute,
    canUseClinicsRoute,
    forceDashboardRoute,
  });
  const appChrome = useAppChrome({ session: operationalSession });
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
    session: operationalSession,
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
    session: operationalSession,
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
    session: operationalSession,
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
  useMedicalLicenseHydration(operationalSession, persistSession);
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

  const openBillingView = (view: 'billing' | 'billingHistory') => {
    resetProfileRouteState();
    if (!canAccessBilling) return openDashboard();
    navigateToViewFromInteraction(view);
    setModuleMode("list");
  };
  const openBilling = () => openBillingView('billing');
  const openBillingHistory = () => openBillingView('billingHistory');
  const openReports = () => {
    resetProfileRouteState();
    if (!canAccessReports) return openDashboard();
    navigateToViewFromInteraction("reports");
    setModuleMode("list");
  };

  const openTutorials = () => {
    resetProfileRouteState();
    if (!canAccessTutorials) return openDashboard();
    navigateToViewFromInteraction("tutorials"); setModuleMode("list");
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
  const openCurrentClinic = () => {
    resetProfileRouteState();
    if (!canAccessClinics || !session?.user.clinicaId) {
      openDashboard();
      return;
    }
    navigate(`/clinicas?editar=${session.user.clinicaId}`);
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
      <TutorialProvider activeView="login" allowedTutorialIds={['login-clinic']}>
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
      </TutorialProvider>
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

  if (!legalAcceptance.isCurrent) {
    return (
      <LegalAcceptanceGate
        theme={theme}
        loading={legalAcceptance.loading}
        accepting={legalAcceptance.accepting}
        error={legalAcceptance.error}
        onThemeToggle={toggleTheme}
        onAccept={legalAcceptance.accept}
        onRetry={legalAcceptance.retry}
        onLogout={logout}
      />
    );
  }

  return <AuthenticatedAppContent
    session={session}
    activeView={activeView}
    moduleMode={moduleMode}
    isBusy={isBusy}
    theme={theme}
    access={access}
    appChrome={appChrome}
    usersDomain={usersDomain}
    patientsDomain={patientsDomain}
    medicalGroupsDomain={medicalGroupsDomain}
    navigation={{
      openDashboard,
      openUsersList: usersDomain.openUsersList,
      openMyProfile: usersDomain.openMyProfile,
      openPatientsList: patientsDomain.openPatientsList,
      openPatientsListFromMenu,
      openBilling,
      openBillingHistory,
      openReports,
      openTutorials,
      openMedicalGroups,
      openAgenda,
      openSettings,
      openClinics,
      openCurrentClinic,
    }}
    sortHandlers={{ handleUserSortChange, handlePacienteSortChange, handleMedicalGroupSortChange, handleCbhpmSortChange }}
    confirmationDialog={confirmationDialog}
    onThemeToggle={toggleTheme}
    onThemeChange={setThemePreference}
    onLogout={logout}
    onClinicSelected={handleClinicSelected}
  />;
}
