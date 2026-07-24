import {
  type FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AUTH_EXPIRED_EVENT,
  authenticate,
  getCurrentLicenca,
  listPublicClinics,
  resetPassword,
} from "../services";
import { LoginScreen } from "../features/auth/LoginScreen";
import { PasswordRequiredScreen } from "../features/auth/PasswordRequiredScreen";
import { ResetPasswordScreen } from "../features/auth/ResetPasswordScreen";
import { useAuthSession } from "../features/auth/useAuthSession";
import { useMedicalGroupsDomain } from "../features/medicalGroups/useMedicalGroupsDomain";
import { usePatientsDomain } from "../features/patients/usePatientsDomain";
import { useUsersDomain } from "../features/users/useUsersDomain";
import { AppShell } from "../layout/AppShell";
import type { AppView, BreadcrumbItem, ModuleMode } from "../appTypes";
import { queryClient } from "../queryClient";
import { useConfirmationDialog } from "../shared/components/ConfirmationDialog";
import { useRouteView } from "../shared/hooks/useRouteView";
import { useThemePreference } from "../shared/hooks/useThemePreference";
import {
  DEFAULT_PASSWORD,
  formatProfileName,
  getErrorMessage,
  isValidEmail,
  API_ASSET_BASE_URL,
  MEDICAL_PROFILE_ID,
} from "../shared/utils/formatters";
import type { PublicClinic } from "../types";
import { getJwtExpirationDelayMs, isJwtExpired } from "../shared/utils/jwt";
import { getAppAccess, MEDICAL_ALLOWED_ENTRY_PATHS } from "./appAccess";
import { AppMainContent } from "./AppMainContent";
import { AppModals } from "./AppModals";
import {
  buildSessionFromLogin,
  getResetPasswordCompletedMessage,
  shouldOpenDashboardAfterLogin,
} from "./appSession";
import { updateSort } from "./appSort";
import {
  getActiveModuleLabel,
  getAppTitle,
  getFormBreadcrumbLabel,
} from "./appViewMeta";
import { useAppChrome } from "./useAppChrome";

const SESSION_EXPIRED_MESSAGE =
  "Sua sessao expirou. Entre novamente para continuar.";
const SESSION_EXPIRATION_LEEWAY_MS = 30_000;

export function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, persistSession, clearSession } = useAuthSession();
  const { theme, toggleTheme, setThemePreference } = useThemePreference();
  const { confirmAction, confirmationDialog } = useConfirmationDialog();
  const [moduleMode, setModuleMode] = useState<ModuleMode>("list");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginClinicValue, setLoginClinicValue] = useState("");
  const [publicClinics, setPublicClinics] = useState<PublicClinic[]>([]);
  const [publicClinicsLoading, setPublicClinicsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginInfo, setLoginInfo] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [openDashboardAfterLogin, setOpenDashboardAfterLogin] = useState(false);
  const selectedLoginClinic = publicClinics.find(
    (clinic) => String(clinic.id) === loginClinicValue,
  );

  useEffect(() => {
    if (session) {
      return;
    }

    let cancelled = false;
    setPublicClinicsLoading(true);
    void listPublicClinics()
      .then((clinics) => {
        if (cancelled) return;
        setPublicClinics(clinics);
        if (clinics.length === 1) setLoginClinicValue(String(clinics[0].id));
      })
      .catch((error) => {
        if (!cancelled) setLoginError(getErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setPublicClinicsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

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
    canUseAttendancesRoute,
    canUseFinanceRoute,
    canUsePricesRoute,
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
    setLoginError("");
    setLoginInfo(infoMessage);
    setLoginPassword("");
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
    setLoginError("");
    setLoginInfo(infoMessage);
    setLoginPassword("");
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

  useEffect(() => {
    if (!session) {
      return;
    }

    const expireSession = () => {
      endSession(SESSION_EXPIRED_MESSAGE);
    };

    const handleAuthExpired = () => {
      expireSession();
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);

    if (isJwtExpired(session.token, Date.now(), SESSION_EXPIRATION_LEEWAY_MS)) {
      expireSession();
      return () =>
        window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    }

    const expirationDelayMs = getJwtExpirationDelayMs(
      session.token,
      Date.now(),
      SESSION_EXPIRATION_LEEWAY_MS,
    );
    const timeoutId =
      expirationDelayMs === null
        ? null
        : window.setTimeout(expireSession, expirationDelayMs);

    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [session?.token]);

  useEffect(() => {
    if (
      !session ||
      session.user.perfilId !== MEDICAL_PROFILE_ID ||
      session.user.licenca
    ) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const licenca = await getCurrentLicenca(session.token);

        if (!licenca || cancelled) {
          return;
        }

        persistSession({
          ...session,
          user: {
            ...session.user,
            licenca,
          },
        });
      } catch {
        // Mantem o fallback legado do medico quando a API ainda nao retorna a licenca no login.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [persistSession, session]);

  useLayoutEffect(() => {
    if (
      !openDashboardAfterLogin ||
      MEDICAL_ALLOWED_ENTRY_PATHS.has(normalizedPath)
    ) {
      return;
    }

    setOpenDashboardAfterLogin(false);
  }, [normalizedPath, openDashboardAfterLogin]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    setLoginInfo("");

    if (!isValidEmail(loginEmail)) {
      setLoginError("Informe um email valido.");
      return;
    }
    if (!selectedLoginClinic) {
      setLoginError("Selecione uma clinica cadastrada.");
      return;
    }

    setLoginLoading(true);

    try {
      const result = await authenticate(
        loginEmail.trim(),
        loginPassword,
        selectedLoginClinic.slug,
      );
      const nextSession = buildSessionFromLogin(result, loginPassword);
      queryClient.clear();
      setOpenDashboardAfterLogin(
        shouldOpenDashboardAfterLogin(nextSession.user.perfilId),
      );
      persistSession(nextSession);
    } catch (error) {
      setLoginError(getErrorMessage(error));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setLoginError("");
    setLoginInfo("");

    if (!isValidEmail(loginEmail)) {
      setLoginError("Informe um email valido para resetar a senha.");
      return;
    }

    setResetPasswordLoading(true);

    try {
      if (!selectedLoginClinic) {
        setLoginError("Selecione a clinica para redefinir a senha.");
        return;
      }
      const result = await resetPassword(
        loginEmail.trim(),
        selectedLoginClinic.slug,
      );

      if (result.mode === "default-password") {
        setLoginPassword(DEFAULT_PASSWORD);
        setLoginInfo(
          `Senha redefinida para ${DEFAULT_PASSWORD}. Use-a para entrar e altere a seguir.`,
        );
        return;
      }

      setLoginPassword("");
      setLoginInfo(
        result.message ||
          "Se o email estiver cadastrado, enviaremos as instrucoes para redefinir a senha.",
      );
    } catch (error) {
      setLoginError(getErrorMessage(error));
    } finally {
      setResetPasswordLoading(false);
    }
  };

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

  const openSettings = () => {
    resetProfileRouteState();

    if (!canAccessSettings) {
      openDashboard();
      return;
    }

    navigateToViewFromInteraction("settings");
    setModuleMode("list");
  };

  const openAttendances = () => {
    if (!canAccessBilling) {
      openDashboard();
      return;
    }
    navigateToViewFromInteraction("attendances");
    setModuleMode("list");
  };

  const openFinance = () => {
    if (!canAccessBilling || isMedical) {
      openDashboard();
      return;
    }
    navigateToViewFromInteraction("finance");
    setModuleMode("list");
  };

  const openPrices = () => {
    if (!canAccessBilling) {
      openDashboard();
      return;
    }
    navigateToViewFromInteraction("prices");
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
    setModuleMode("list");
    navigateToViewFromInteraction("dashboard", true);
  };

  const handleUserSortChange = (field: string) => {
    updateSort(
      field,
      usersDomain.sortBy,
      usersDomain.setCurrentPage,
      usersDomain.setSortBy,
      usersDomain.setSortDirection,
      field === "recent" ? "desc" : "asc",
    );
  };

  const handlePacienteSortChange = (field: string) => {
    updateSort(
      field,
      patientsDomain.sortBy,
      patientsDomain.setPacienteCurrentPage,
      patientsDomain.setSortBy,
      patientsDomain.setSortDirection,
      field === "recent" ? "desc" : "asc",
    );
  };

  const handleCbhpmSortChange = (field: string) => {
    updateSort(
      field,
      patientsDomain.cbhpmSortBy,
      patientsDomain.setCbhpmCurrentPage,
      patientsDomain.setCbhpmSortBy,
      patientsDomain.setCbhpmSortDirection,
      "asc",
    );
  };

  const handleMedicalGroupSortChange = (field: string) => {
    updateSort(
      field,
      medicalGroupsDomain.sortBy,
      medicalGroupsDomain.setCurrentPage,
      medicalGroupsDomain.setSortBy,
      medicalGroupsDomain.setSortDirection,
      field === "recent" ? "desc" : "asc",
    );
  };

  if (!session && isResetPasswordRoute) {
    return (
      <ResetPasswordScreen
        companyName={appChrome.companyName}
        companyPhoto={appChrome.systemSettings.fotoEmpresa}
        theme={theme}
        token={resetToken}
        onThemeToggle={toggleTheme}
        onBackToLogin={() => returnToLogin()}
        onResetCompleted={handleResetPasswordCompleted}
      />
    );
  }

  if (!session) {
    return (
      <LoginScreen
        companyName={selectedLoginClinic?.nome ?? appChrome.companyName}
        companyPhoto={
          selectedLoginClinic?.fotoUrl
            ? `${API_ASSET_BASE_URL}${selectedLoginClinic.fotoUrl}`
            : appChrome.systemSettings.fotoEmpresa
        }
        isBusy={isBusy}
        theme={theme}
        loginEmail={loginEmail}
        loginPassword={loginPassword}
        loginClinicValue={loginClinicValue}
        clinics={publicClinics}
        clinicsLoading={publicClinicsLoading}
        loginError={loginError}
        loginInfo={loginInfo}
        loginLoading={loginLoading}
        resetPasswordLoading={resetPasswordLoading}
        onThemeToggle={toggleTheme}
        onLoginEmailChange={setLoginEmail}
        onLoginPasswordChange={setLoginPassword}
        onLoginClinicChange={setLoginClinicValue}
        onSubmit={handleLogin}
        onResetPassword={() => void handleResetPassword()}
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
            ? openAttendances
            : activeView === "billing"
              ? openBilling
              : activeView === "finance"
                ? openFinance
                : activeView === "prices"
                  ? openPrices
                  : activeView === "medicalGroups"
                    ? openMedicalGroups
                    : activeView === "settings"
                      ? openSettings
                      : openAgenda;
  const resolvedOpenActiveModuleList =
    activeView === "clinics" ? openClinics : openActiveModuleList;
  const breadcrumbItems: BreadcrumbItem[] =
    activeView === "dashboard"
      ? [
          { label: "Início", onClick: openDashboard },
          { label: "Painel inicial" },
        ]
      : [
          { label: "Início", onClick: openDashboard },
          {
            label: activeModuleLabel,
            onClick:
              moduleMode === "form" ? resolvedOpenActiveModuleList : undefined,
          },
          ...(moduleMode === "form" ? [{ label: formBreadcrumbLabel }] : []),
        ];

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
      onOpenAttendances={openAttendances}
      onOpenFinance={openFinance}
      onOpenPrices={openPrices}
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
          openAttendances,
          openFinance,
          openPrices,
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
