import { lazy, Suspense, useCallback, useLayoutEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { sessionEpoch } from '../services/sessionEpoch';
import { useAuthSession } from "../features/auth/useAuthSession";
import { useLoginFlow } from "../features/auth/useLoginFlow";
import { useMedicalLicenseHydration, useSessionExpiration } from "../features/auth/useSessionLifecycle";
import { useMedicalGroupsDomain } from "../features/medicalGroups/useMedicalGroupsDomain";
import { usePrivacyPreferenceSession } from "../features/privacy/ConsentProvider";
import { LegalAcceptanceGate } from "../features/legal/LegalAcceptanceGate";
import { useLegalAcceptance } from "../features/legal/useLegalAcceptance";
import { usePatientsDomain } from "../features/patients/usePatientsDomain";
import { useUsersDomain } from "../features/users/useUsersDomain";
import type { AppView } from "../appTypes";
import type { FormView } from "../routes";
import { queryClient } from "../queryClient";
import { useConfirmationDialog } from "../shared/components/ConfirmationDialog";
import { useRouteView } from "../shared/hooks/useRouteView";
import { useScrollToTopOnNavigation } from "../shared/hooks/useScrollToTopOnNavigation";
import { useThemePreference } from "../shared/hooks/useThemePreference";
import { getAppAccess, MEDICAL_ALLOWED_ENTRY_PATHS } from "./appAccess";
import { AppAccessProvider } from "./AppAccessContext";
import { AppPublicContent } from "./AppPublicContent";
import { AppCredentialGate } from "./AppCredentialGate";
import { buildSessionForSelectedClinic, getResetPasswordCompletedMessage } from "./appSession";
import { createAppSortHandlers } from "./appSortHandlers";
import { useAppChrome } from "./useAppChrome";
import { TutorialProvider } from "../features/tutorials/TutorialProvider";
import { LoadingOverlay } from "../shared/components/LoadingOverlay";

const AuthenticatedAppContent = lazy(() => import("./AuthenticatedAppContent")
  .then(module => ({ default: module.AuthenticatedAppContent })));
const SESSION_EXPIRED_MESSAGE =
  "Sua sessao expirou. Entre novamente para continuar.";
export function AppContent() {
  const auth = useAuthSession();
  const loginFlow = useLoginFlow({ session: auth.session, persistSession: auth.persistSession, sessionRestoring: auth.restoring });
  // A clinic/session change must discard forms, lists and pending UI callbacks.
  const scopeKey = auth.session
    ? `${auth.session.user.clinicaId ?? ''}:${auth.session.user.id}:${sessionEpoch()}`
    : 'anonymous';
  return <AppSessionContent key={scopeKey} auth={auth} loginFlow={loginFlow} />;
}

function AppSessionContent({ auth, loginFlow }: {
  auth: ReturnType<typeof useAuthSession>;
  loginFlow: ReturnType<typeof useLoginFlow>;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  useScrollToTopOnNavigation();
  const { session, persistSession, clearSession } = auth;
  usePrivacyPreferenceSession(session);
  const { theme, toggleTheme, setThemePreference } = useThemePreference();
  const { confirmAction, confirmationDialog } = useConfirmationDialog();
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

  const forceDashboardRoute =
    openDashboardAfterLogin &&
    Boolean(operationalSession && !operationalSession.user.precisaTrocarSenha);
  const { activeView, moduleMode, formRecordId, navigateToView, navigateToForm } = useRouteView({
    ...access,
    session: operationalSession,
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
  const navigateToFormFromInteraction = useCallback(
    (view: FormView, recordId: number | null = null, replace = false) => {
      setOpenDashboardAfterLogin(false);
      navigateToForm(view, recordId, replace);
    },
    [navigateToForm],
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
    canAccessUsers: access.canAccessUsers,
    canEditOwnUser: access.canEditOwnUser,
    isAdmin: access.isAdmin,
    formRecordId,
    navigateToForm: navigateToFormFromInteraction,
    navigateToView: navigateToViewFromInteraction,
    persistSession,
    loadDashboardSummary: appChrome.loadDashboardSummary,
    onDeleteCurrentUser: logout,
    onIdentityChanged: endSession,
    confirmAction,
  });
  const patientsDomain = usePatientsDomain({
    session: operationalSession,
    activeView,
    moduleMode,
    companyName: appChrome.companyName,
    isAdmin: access.isAdmin,
    isMedical: access.isMedical,
    canAccessPatients: access.canAccessPatients,
    canCreatePatients: access.canCreatePatients,
    canEditPatients: access.canEditPatients,
    canDeletePatients: access.canDeletePatients,
    canConsultCbhpm: access.canConsultCbhpm,
    patientReadOnly: access.patientReadOnly,
    formRecordId,
    navigateToForm: navigateToFormFromInteraction,
    navigateToView: navigateToViewFromInteraction,
    loadDashboardSummary: appChrome.loadDashboardSummary,
    confirmAction,
  });
  const medicalGroupsDomain = useMedicalGroupsDomain({
    session: operationalSession,
    activeView,
    moduleMode,
    canAccessMedicalGroups: access.canAccessMedicalGroups,
    formRecordId,
    navigateToForm: navigateToFormFromInteraction,
    navigateToView: navigateToViewFromInteraction,
    confirmAction,
  });
  const isBusy =
    loginLoading ||
    resetPasswordLoading ||
    usersDomain.formLoading ||
    patientsDomain.pacienteFormLoading ||
    medicalGroupsDomain.formLoading;
  useSessionExpiration(session, message => endSession(message ?? SESSION_EXPIRED_MESSAGE), persistSession);
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

    if (access.canAccessDashboard) {
      navigateToViewFromInteraction("dashboard");
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
      navigateToViewFromInteraction("billing");
      return;
    }
    if (access.canAccessAgenda) {
      navigateToViewFromInteraction("agenda");
      return;
    }

    navigateToViewFromInteraction("settings");
  };

  const openAgenda = () => {
    resetProfileRouteState();

    if (!access.canAccessAgenda) {
      openDashboard();
      return;
    }

    navigateToViewFromInteraction("agenda");
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

  const openBillingView = (view: 'billing' | 'billingHistory') => {
    resetProfileRouteState();
    if (!access.canAccessBilling) return openDashboard();
    navigateToViewFromInteraction(view);
  };
  const openBilling = () => openBillingView('billing');
  const openBillingHistory = () => openBillingView('billingHistory');
  const openReports = () => {
    resetProfileRouteState();
    if (!access.canAccessReports) return openDashboard();
    navigateToViewFromInteraction("reports");
  };

  const openTutorials = () => {
    resetProfileRouteState();
    if (!access.canAccessTutorials) return openDashboard();
    navigateToViewFromInteraction("tutorials");
  };

  const openSettings = () => {
    resetProfileRouteState();

    if (!access.canAccessSettings) {
      openDashboard();
      return;
    }

    navigateToViewFromInteraction("settings");
  };

  const openClinics = () => {
    resetProfileRouteState();
    if (!access.canAccessClinics) {
      openDashboard();
      return;
    }
    navigateToViewFromInteraction("clinics");
  };
  const openCurrentClinic = () => {
    resetProfileRouteState();
    if (!access.canAccessClinics || !session?.user.clinicaId) {
      openDashboard();
      return;
    }
    navigate(`/clinicas?editar=${session.user.clinicaId}`);
  };

  const handleClinicSelected = (
    result: import("../types").SelectClinicResponse,
  ) => {
    if (!session) return;
    queryClient.clear();
    appChrome.resetAppChrome();
    // Same reset as endSession: no list, form or record of the previous clinic survives the switch.
    usersDomain.resetUsersState();
    patientsDomain.resetPatientsState();
    medicalGroupsDomain.resetMedicalGroupsState();
    persistSession(buildSessionForSelectedClinic(session, result));
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
        slow={legalAcceptance.slow}
        canRetry={legalAcceptance.canRetry}
        accepting={legalAcceptance.accepting}
        error={legalAcceptance.error}
        onThemeToggle={toggleTheme}
        onAccept={legalAcceptance.accept}
        onRetry={legalAcceptance.retry}
        onLogout={logout}
      />
    );
  }

  return <Suspense fallback={<LoadingOverlay active message="Carregando a interface…" />}><AppAccessProvider access={access}><AuthenticatedAppContent
    session={session}
    activeView={activeView}
    moduleMode={moduleMode}
    isBusy={isBusy}
    theme={theme}
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
      openPatientsWithConsolidationPending: () => {
        resetProfileRouteState();
        patientsDomain.openPatientsWithConsolidationPending();
      },
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
  /></AppAccessProvider></Suspense>;
}
