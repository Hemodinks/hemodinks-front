import { type FormEvent, useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authenticate, getCurrentLicenca, resetPassword } from '../services';
import { LoginScreen } from '../features/auth/LoginScreen';
import { PasswordRequiredScreen } from '../features/auth/PasswordRequiredScreen';
import { ResetPasswordScreen } from '../features/auth/ResetPasswordScreen';
import { useAuthSession } from '../features/auth/useAuthSession';
import { useMedicalGroupsDomain } from '../features/medicalGroups/useMedicalGroupsDomain';
import { usePatientsDomain } from '../features/patients/usePatientsDomain';
import { useUsersDomain } from '../features/users/useUsersDomain';
import { AppShell } from '../layout/AppShell';
import type { AppView, BreadcrumbItem, ModuleMode } from '../appTypes';
import { queryClient } from '../queryClient';
import { useConfirmationDialog } from '../shared/components/ConfirmationDialog';
import { useRouteView } from '../shared/hooks/useRouteView';
import { useThemePreference } from '../shared/hooks/useThemePreference';
import { LICENSE_FEATURES, hasSessionFeature } from '../shared/utils/license';
import {
  CONTROLLER_PROFILE_ID,
  DEFAULT_PASSWORD,
  DEFAULT_PROFILE_ID,
  formatProfileName,
  getErrorMessage,
  isValidEmail,
  MEDICAL_PROFILE_ID,
  PATIENT_PROFILE_ID,
} from '../shared/utils/formatters';
import { AppMainContent } from './AppMainContent';
import { AppModals } from './AppModals';
import { getActiveModuleLabel, getAppTitle, getFormBreadcrumbLabel } from './appViewMeta';
import { useAppChrome } from './useAppChrome';

function updateSort(
  field: string,
  currentField: string,
  setCurrentPage: (page: number) => void,
  setField: (value: string) => void,
  setDirection: (value: 'asc' | 'desc' | ((current: 'asc' | 'desc') => 'asc' | 'desc')) => void,
  defaultDirection: 'asc' | 'desc',
) {
  setCurrentPage(1);

  if (currentField === field) {
    setDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    return;
  }

  setField(field);
  setDirection(defaultDirection);
}

const MEDICAL_ALLOWED_ENTRY_PATHS = new Set([
  '/agenda',
  '/faturamento-medico',
  '/meu-cadastro',
  '/pacientes',
]);

export function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, persistSession, clearSession } = useAuthSession();
  const { theme, toggleTheme, setThemePreference } = useThemePreference();
  const { confirmAction, confirmationDialog } = useConfirmationDialog();
  const [moduleMode, setModuleMode] = useState<ModuleMode>('list');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginInfo, setLoginInfo] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [openDashboardAfterLogin, setOpenDashboardAfterLogin] = useState(false);

  const currentPerfilId = session?.user.perfilId ?? 0;
  const isAdmin = currentPerfilId === 1;
  const isMedical = currentPerfilId === MEDICAL_PROFILE_ID;
  const isController = currentPerfilId === CONTROLLER_PROFILE_ID;
  const isPatient = currentPerfilId === PATIENT_PROFILE_ID;
  const canAccessDashboard = hasSessionFeature(session?.user, LICENSE_FEATURES.dashboardVisualizar) || isMedical;
  const canAccessPatients = hasSessionFeature(session?.user, LICENSE_FEATURES.pacientesVisualizar) || isMedical;
  const canManagePatients = hasSessionFeature(session?.user, LICENSE_FEATURES.pacientesGerenciar) || isMedical;
  const canConsultCbhpm = hasSessionFeature(session?.user, LICENSE_FEATURES.cbhpmConsultar);
  const canAccessAgenda = !isController;
  const canAccessUsers = isAdmin;
  const canEditOwnUser = isMedical || isPatient;
  const canAccessBilling = isAdmin || isMedical || isController;
  const canAccessMedicalGroups = isAdmin;
  const canAccessSettings = isAdmin;
  const canCreatePatients = canManagePatients;
  const canEditPatients = canManagePatients;
  const canDeletePatients = isAdmin;
  const canManagePatientObservacoes = canManagePatients;
  const patientReadOnly = isPatient;
  const canUseDashboardRoute = canAccessDashboard;
  const canUsePatientsRoute = canAccessPatients;
  const canUseUsersRoute = canAccessUsers;
  const canUseProfileRoute = canEditOwnUser;
  const canUseBillingRoute = canAccessBilling;
  const canUseMedicalGroupsRoute = canAccessMedicalGroups;
  const canUseAgendaRoute = canAccessAgenda;
  const canUseSettingsRoute = canAccessSettings;
  const forceDashboardRoute = openDashboardAfterLogin && Boolean(session && !session.user.precisaTrocarSenha);
  const { activeView, navigateToView } = useRouteView({
    session,
    canUseDashboardRoute,
    canUsePatientsRoute,
    canUseUsersRoute,
    canUseProfileRoute,
    canUseBillingRoute,
    canUseMedicalGroupsRoute,
    canUseAgendaRoute,
    canUseSettingsRoute,
    forceDashboardRoute,
  });
  const appChrome = useAppChrome({ session });
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const isResetPasswordRoute = normalizedPath === '/reset-password';
  const resetToken = isResetPasswordRoute
    ? new URLSearchParams(location.search).get('token')?.trim() ?? ''
    : '';
  const navigateToViewFromInteraction = useCallback((view: AppView, replace = false) => {
    setOpenDashboardAfterLogin(false);
    navigateToView(view, replace);
  }, [navigateToView]);

  const returnToLogin = (infoMessage = '') => {
    setLoginError('');
    setLoginInfo(infoMessage);
    setLoginPassword('');
    navigate('/', { replace: true });
  };

  const handleResetPasswordCompleted = (message: string) => {
    const nextMessage = /nova senha/i.test(message)
      ? message
      : `${message}. Entre com a nova senha.`;

    returnToLogin(nextMessage);
  };

  function logout() {
    queryClient.clear();
    clearSession();
    appChrome.resetAppChrome();
    usersDomain.resetUsersState();
    patientsDomain.resetPatientsState();
    medicalGroupsDomain.resetMedicalGroupsState();
    navigateToView('dashboard', true);
    setModuleMode('list');
    setOpenDashboardAfterLogin(false);
    setLoginPassword('');
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

  const isBusy = loginLoading
    || resetPasswordLoading
    || usersDomain.formLoading
    || patientsDomain.pacienteFormLoading
    || medicalGroupsDomain.formLoading;

  useEffect(() => {
    if (!session || session.user.perfilId !== MEDICAL_PROFILE_ID || session.user.licenca) {
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
    if (!openDashboardAfterLogin || MEDICAL_ALLOWED_ENTRY_PATHS.has(normalizedPath)) {
      return;
    }

    setOpenDashboardAfterLogin(false);
  }, [normalizedPath, openDashboardAfterLogin]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError('');
    setLoginInfo('');

    if (!isValidEmail(loginEmail)) {
      setLoginError('Informe um email valido.');
      return;
    }

    setLoginLoading(true);

    try {
      const result = await authenticate(loginEmail.trim(), loginPassword);
      const shouldOpenDashboardAfterLogin = (result.perfilId || DEFAULT_PROFILE_ID) === MEDICAL_PROFILE_ID;
      queryClient.clear();
      setOpenDashboardAfterLogin(shouldOpenDashboardAfterLogin);

      persistSession({
        token: result.token,
        user: {
          id: result.id,
          clinicaId: result.clinicaId,
          clinicaSlug: result.clinicaSlug ?? null,
          nome: result.nome,
          email: result.email,
          cpf: result.cpf ?? null,
          crm: result.crm ?? null,
          crmUf: result.crmUf ?? null,
          fotoPerfil: result.fotoPerfil ?? null,
          precisaTrocarSenha: result.precisaTrocarSenha || loginPassword === DEFAULT_PASSWORD,
          perfilId: result.perfilId || DEFAULT_PROFILE_ID,
          perfilNome: formatProfileName(result.perfilId || DEFAULT_PROFILE_ID, result.perfilNome),
          licenca: result.licenca ?? null,
        },
      });
    } catch (error) {
      setLoginError(getErrorMessage(error));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setLoginError('');
    setLoginInfo('');

    if (!isValidEmail(loginEmail)) {
      setLoginError('Informe um email valido para resetar a senha.');
      return;
    }

    setResetPasswordLoading(true);

    try {
      const result = await resetPassword(loginEmail.trim());

      if (result.mode === 'default-password') {
        setLoginPassword(DEFAULT_PASSWORD);
        setLoginInfo(`Senha redefinida para ${DEFAULT_PASSWORD}. Use-a para entrar e altere a seguir.`);
        return;
      }

      setLoginPassword('');
      setLoginInfo(result.message || 'Se o email estiver cadastrado, enviaremos as instrucoes para redefinir a senha.');
    } catch (error) {
      setLoginError(getErrorMessage(error));
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const resetProfileRouteState = () => {
    if (activeView === 'profile') {
      usersDomain.resetUserFormState({ suppressProfileAutoOpen: true });
    }
  };

  const openDashboard = () => {
    resetProfileRouteState();

    if (canAccessDashboard) {
      navigateToViewFromInteraction('dashboard');
      setModuleMode('list');
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
      navigateToViewFromInteraction('billing');
      setModuleMode('list');
      return;
    }

    if (canAccessAgenda) {
      navigateToViewFromInteraction('agenda');
      setModuleMode('list');
      return;
    }

    navigateToViewFromInteraction('settings');
    setModuleMode('list');
  };

  const openAgenda = () => {
    resetProfileRouteState();

    if (!canAccessAgenda) {
      openDashboard();
      return;
    }

    navigateToViewFromInteraction('agenda');
    setModuleMode('list');
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

    navigateToViewFromInteraction('billing');
    setModuleMode('list');
  };

  const openSettings = () => {
    resetProfileRouteState();

    if (!canAccessSettings) {
      openDashboard();
      return;
    }

    navigateToViewFromInteraction('settings');
    setModuleMode('list');
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
        companyName={appChrome.companyName}
        companyPhoto={appChrome.systemSettings.fotoEmpresa}
        isBusy={isBusy}
        theme={theme}
        loginEmail={loginEmail}
        loginPassword={loginPassword}
        loginError={loginError}
        loginInfo={loginInfo}
        loginLoading={loginLoading}
        resetPasswordLoading={resetPasswordLoading}
        onThemeToggle={toggleTheme}
        onLoginEmailChange={setLoginEmail}
        onLoginPasswordChange={setLoginPassword}
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

  const currentUserProfile = formatProfileName(session.user.perfilId, session.user.perfilNome);
  const activeUsersCount = appChrome.dashboardSummary?.activeUsersCount ?? 0;
  const activePatientsCount = appChrome.dashboardSummary?.activePatientsCount ?? 0;
  const pendingPaymentsCount = appChrome.dashboardSummary?.pendingPaymentsCount ?? 0;
  const patientFilesCount = appChrome.dashboardSummary?.patientFilesCount ?? 0;
  const upcomingEventsCount = appChrome.dashboardSummary?.upcomingEventsCount ?? 0;
  const unreadObservationCount = appChrome.dashboardSummary?.unreadObservationCount ?? 0;
  const unreadAgendaNotificationCount = appChrome.dashboardSummary?.unreadAgendaNotificationCount ?? 0;
  const notificationCount = appChrome.notificationsOpen && appChrome.notifications.length
    ? appChrome.notifications.length
    : pendingPaymentsCount + upcomingEventsCount + unreadObservationCount + unreadAgendaNotificationCount;
  const usersCount = appChrome.dashboardSummary?.usersCount ?? usersDomain.usersTotalItems;
  const pacientesCount = appChrome.dashboardSummary?.pacientesCount ?? patientsDomain.pacientesTotalItems;
  const activeModuleLabel = getActiveModuleLabel(activeView);
  const formBreadcrumbLabel = getFormBreadcrumbLabel({
    activeView,
    editingId: usersDomain.editingId,
    editingPacienteId: patientsDomain.editingPacienteId,
    patientReadOnly,
    editingGroupId: medicalGroupsDomain.editingGroupId,
  });
  const openActiveModuleList = activeView === 'users'
    ? usersDomain.openUsersList
    : activeView === 'profile' ? usersDomain.openMyProfile
      : activeView === 'patients' ? patientsDomain.openPatientsList
        : activeView === 'billing' ? openBilling
          : activeView === 'medicalGroups' ? openMedicalGroups
            : activeView === 'settings' ? openSettings : openAgenda;
  const breadcrumbItems: BreadcrumbItem[] = activeView === 'dashboard'
    ? [
      { label: 'Início', onClick: openDashboard },
      { label: 'Painel inicial' },
    ]
    : [
      { label: 'Início', onClick: openDashboard },
      {
        label: activeModuleLabel,
        onClick: moduleMode === 'form' ? openActiveModuleList : undefined,
      },
      ...(moduleMode === 'form' ? [{ label: formBreadcrumbLabel }] : []),
    ];

  return (
    <AppShell
      session={session}
      isBusy={isBusy}
      appTitle={getAppTitle(activeView)}
      companyName={appChrome.companyName}
      companyPhoto={appChrome.systemSettings.fotoEmpresa}
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
      onOpenMedicalGroups={openMedicalGroups}
      onOpenAgenda={openAgenda}
      onOpenSettings={openSettings}
      modals={(
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
      )}
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
          canAccessSettings,
          canCreatePatients,
          canEditPatients,
          canDeletePatients,
          canManagePatientObservacoes,
          patientReadOnly,
          isAdmin,
          isMedical,
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
        systemSettings={appChrome.systemSettings}
        settingsLoading={appChrome.systemSettingsQuery.isLoading || appChrome.systemSettingsQuery.isFetching}
        settingsError={appChrome.systemSettingsError}
        navigation={{
          openUsersList: usersDomain.openUsersList,
          openMyProfile: usersDomain.openMyProfile,
          openPatientsList: patientsDomain.openPatientsList,
          openBilling,
          openMedicalGroups,
          openAgenda,
          openSettings,
        }}
        sortHandlers={{
          handleUserSortChange,
          handlePacienteSortChange,
          handleMedicalGroupSortChange,
        }}
        onThemeChange={setThemePreference}
        onPasswordChanged={usersDomain.handlePasswordChanged}
      />
    </AppShell>
  );
}
