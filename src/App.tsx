import { type FormEvent, lazy, Suspense, useEffect, useState } from 'react';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import {
  authenticate,
  getDashboardNotifications,
  getDashboardSummary,
  resetPassword,
} from './api';
import { LoginScreen } from './features/auth/LoginScreen';
import { PasswordRequiredScreen } from './features/auth/PasswordRequiredScreen';
import { useAuthSession } from './features/auth/useAuthSession';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { useMedicalGroupsDomain } from './features/medicalGroups/useMedicalGroupsDomain';
import { usePatientsDomain } from './features/patients/usePatientsDomain';
import { useUsersDomain } from './features/users/useUsersDomain';
import { ContactModal, InfoModal } from './features/users/UserModals';
import { AppShell } from './layout/AppShell';
import type { BreadcrumbItem, ModuleMode } from './appTypes';
import { queryClient } from './queryClient';
import { setObservabilityUser } from './observability';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { queryKeys } from './shared/queryKeys';
import { useRouteView } from './shared/hooks/useRouteView';
import { useThemePreference } from './shared/hooks/useThemePreference';
import {
  CONTROLLER_PROFILE_ID,
  DEFAULT_PASSWORD,
  DEFAULT_PROFILE_ID,
  getErrorMessage,
  getProfileName,
  isValidEmail,
  MEDICAL_PROFILE_ID,
} from './shared/utils/formatters';
import type {
  DashboardNotification,
  DashboardSummary,
} from './types';

const DASHBOARD_CACHE_TIME_MS = 30 * 1000;
const NOTIFICATIONS_CACHE_TIME_MS = 15 * 1000;

const NotificationsModal = lazy(() => import('./features/dashboard/NotificationsModal').then((module) => ({ default: module.NotificationsModal })));
const AgendaPage = lazy(() => import('./features/events/AgendaPage').then((module) => ({ default: module.AgendaPage })));
const MedicalGroupsPage = lazy(() => import('./features/medicalGroups/MedicalGroupsPage').then((module) => ({ default: module.MedicalGroupsPage })));
const CbhpmLookupModal = lazy(() => import('./features/patients/CbhpmLookupModal').then((module) => ({ default: module.CbhpmLookupModal })));
const PatientInfoModal = lazy(() => import('./features/patients/PatientModals').then((module) => ({ default: module.PatientInfoModal })));
const PatientFilesModal = lazy(() => import('./features/patients/PatientModals').then((module) => ({ default: module.PatientFilesModal })));
const PatientsPage = lazy(() => import('./features/patients/PatientsPage').then((module) => ({ default: module.PatientsPage })));
const UsersPage = lazy(() => import('./features/users/UsersPage').then((module) => ({ default: module.UsersPage })));
const PasswordModal = lazy(() => import('./shared/components/PasswordModal').then((module) => ({ default: module.PasswordModal })));

function ModuleFallback() {
  return (
    <section className="workspace" aria-live="polite">
      <section className="data-panel">
        <p className="agenda-empty" role="status">Carregando modulo...</p>
      </section>
    </section>
  );
}

function AppContent() {
  const { session, persistSession, clearSession } = useAuthSession();
  const { theme, toggleTheme } = useThemePreference();
  const [moduleMode, setModuleMode] = useState<ModuleMode>('list');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginInfo, setLoginInfo] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [dashboardError, setDashboardError] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const sessionReady = Boolean(session && !session.user.precisaTrocarSenha);
  const dashboardSummaryQuery = useQuery({
    queryKey: queryKeys.dashboardSummary(session?.token ?? ''),
    queryFn: () => getDashboardSummary(session?.token ?? ''),
    enabled: sessionReady,
    staleTime: DASHBOARD_CACHE_TIME_MS,
  });
  const notificationsQuery = useQuery({
    queryKey: queryKeys.dashboardNotifications(session?.token ?? ''),
    queryFn: () => getDashboardNotifications(session?.token ?? ''),
    enabled: Boolean(session && notificationsOpen),
    staleTime: NOTIFICATIONS_CACHE_TIME_MS,
  });

  useEffect(() => {
    setObservabilityUser(session ? {
      id: session.user.id,
      email: session.user.email,
      nome: session.user.nome,
    } : null);
  }, [session?.user.email, session?.user.id, session?.user.nome]);

  useEffect(() => {
    if (dashboardSummaryQuery.data) {
      setDashboardSummary(dashboardSummaryQuery.data);
      setDashboardError('');
    }
  }, [dashboardSummaryQuery.data]);

  useEffect(() => {
    if (dashboardSummaryQuery.error) {
      setDashboardError(getErrorMessage(dashboardSummaryQuery.error));
    }
  }, [dashboardSummaryQuery.error]);

  useEffect(() => {
    setNotificationsLoading(notificationsQuery.isFetching);
  }, [notificationsQuery.isFetching]);

  useEffect(() => {
    if (notificationsQuery.data) {
      setNotifications(notificationsQuery.data);
      setNotificationsError('');
    }
  }, [notificationsQuery.data]);

  useEffect(() => {
    if (notificationsQuery.error) {
      setNotificationsError(getErrorMessage(notificationsQuery.error));
    }
  }, [notificationsQuery.error]);

  const loadDashboardSummary = async (token = session?.token, forceRefresh = false) => {
    if (!token) {
      return;
    }

    if (forceRefresh) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(token) });
    }

    await dashboardSummaryQuery.refetch();
  };

  const handleToggleNotifications = async () => {
    if (!session) {
      return;
    }

    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);

    if (!nextOpen) {
      return;
    }

    await notificationsQuery.refetch();
  };

  const currentPerfilId = session?.user.perfilId ?? 0;
  const isAdmin = currentPerfilId === 1;
  const isMedical = currentPerfilId === MEDICAL_PROFILE_ID;
  const isController = currentPerfilId === CONTROLLER_PROFILE_ID;
  const isPatient = currentPerfilId === 3;
  const canAccessDashboard = !isController;
  const canAccessAgenda = !isController;
  const canAccessUsers = isAdmin;
  const canEditOwnUser = isMedical;
  const canAccessMedicalGroups = isAdmin;
  const canCreatePatients = isAdmin || isController || isMedical;
  const canEditPatients = isAdmin || isMedical || isController;
  const canDeletePatients = isAdmin;
  const patientReadOnly = isPatient;
  const canUseDashboardRoute = canAccessDashboard;
  const canUseUsersRoute = canAccessUsers;
  const canUseProfileRoute = canEditOwnUser;
  const canUseMedicalGroupsRoute = canAccessMedicalGroups;
  const canUseAgendaRoute = canAccessAgenda;
  const { activeView, navigateToView } = useRouteView({
    session,
    canUseDashboardRoute,
    canUseUsersRoute,
    canUseProfileRoute,
    canUseMedicalGroupsRoute,
    canUseAgendaRoute,
  });

  const usersDomain = useUsersDomain({
    session,
    activeView,
    moduleMode,
    canAccessUsers,
    canEditOwnUser,
    isAdmin,
    setModuleMode,
    navigateToView,
    persistSession,
    loadDashboardSummary,
    onDeleteCurrentUser: logout,
  });

  const patientsDomain = usePatientsDomain({
    session,
    activeView,
    moduleMode,
    isAdmin,
    isMedical,
    canCreatePatients,
    canEditPatients,
    canDeletePatients,
    patientReadOnly,
    setModuleMode,
    navigateToView,
    loadDashboardSummary,
  });
  const medicalGroupsDomain = useMedicalGroupsDomain({
    session,
    activeView,
    moduleMode,
    canAccessMedicalGroups,
    setModuleMode,
    navigateToView,
  });

  const {
    usersLoading,
    usersError,
    successMessage,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    sortBy: userSortBy,
    setSortBy: setUserSortBy,
    sortDirection: userSortDirection,
    setSortDirection: setUserSortDirection,
    usersTotalItems,
    totalPages,
    paginatedUsers,
    visibleStart,
    visibleEnd,
    formData,
    setFormData,
    editingId,
    editingUserDetails,
    formLoading,
    formError,
    photoInputKey,
    userFileInputKey,
    pendingUserFiles,
    showPasswordModal,
    setShowPasswordModal,
    selectedInfoUser,
    setSelectedInfoUser,
    selectedContactUser,
    setSelectedContactUser,
    canUseUserForm,
    resetUsersState,
    handleProfilePhotoChange,
    handleRemoveProfilePhoto,
    handleUserFilesChange,
    removePendingUserFile,
    handleDeleteUserArquivo,
    handleSubmitUser,
    handleEditUser,
    handleDeleteUser,
    handlePasswordChanged,
    openUsersList,
    openNewUserForm,
    closeUserForm,
    resetUserFormState,
    openMyProfile,
    refreshUsers,
  } = usersDomain;

  const {
    pacientesLoading,
    pacientesError,
    pacienteSuccessMessage,
    pacienteSearchTerm,
    setPacienteSearchTerm,
    pacienteExportLoading,
    pacienteExportScope,
    setPacienteExportScope,
    pacienteFilters,
    setPacienteFilters,
    pacienteCurrentPage,
    setPacienteCurrentPage,
    sortBy: pacienteSortBy,
    setSortBy: setPacienteSortBy,
    sortDirection: pacienteSortDirection,
    setSortDirection: setPacienteSortDirection,
    pacientesTotalItems,
    pacienteTotalPages,
    paginatedPacientes,
    pacienteVisibleStart,
    pacienteVisibleEnd,
    pacienteFormData,
    setPacienteFormData,
    editingPacienteId,
    editingPaciente,
    pacienteFormError,
    pacienteFormLoading,
    pendingPatientFiles,
    patientFileInputKey,
    selectedPatientInfo,
    setSelectedPatientInfo,
    selectedPatientFiles,
    patientFilesModalLoading,
    patientFilesModalError,
    medicalUsers,
    hospitais,
    hospitaisError,
    convenios,
    conveniosError,
    opmeFornecedores,
    opmeFornecedoresError,
    cbhpmModalOpen,
    setCbhpmModalOpen,
    cbhpmItems,
    cbhpmFilters,
    setCbhpmFilters,
    cbhpmLoading,
    cbhpmError,
    cbhpmCurrentPage,
    setCbhpmCurrentPage,
    sortBy: cbhpmSortBy,
    setSortBy: setCbhpmSortBy,
    sortDirection: cbhpmSortDirection,
    setSortDirection: setCbhpmSortDirection,
    cbhpmTotalPageCount,
    cbhpmTotalItems,
    cbhpmVisibleStart,
    cbhpmVisibleEnd,
    resetPatientsState,
    handlePacienteFilesChange,
    removePendingPatientFile,
    handleSubmitPaciente,
    handleDeletePacienteArquivo,
    handleExportPacientes,
    handleEditPaciente,
    handleDeletePaciente,
    handleOpenPacienteFiles,
    handleOpenCbhpmModal,
    handleSelectCbhpm,
    handleRemovePacienteProcedimento,
    openPatientsList,
    openNewPacienteForm,
    closePacienteForm,
    clearPacienteFilters,
    refreshPacientes,
    refreshCbhpm,
    closePatientFilesModal,
  } = patientsDomain;
  const {
    groups,
    groupsLoading,
    groupsError,
    successMessage: medicalGroupsSuccessMessage,
    searchTerm: medicalGroupSearchTerm,
    setSearchTerm: setMedicalGroupSearchTerm,
    currentPage: medicalGroupCurrentPage,
    setCurrentPage: setMedicalGroupCurrentPage,
    sortBy: medicalGroupSortBy,
    setSortBy: setMedicalGroupSortBy,
    sortDirection: medicalGroupSortDirection,
    setSortDirection: setMedicalGroupSortDirection,
    totalItems: medicalGroupsTotalItems,
    totalPages: medicalGroupTotalPages,
    visibleStart: medicalGroupVisibleStart,
    visibleEnd: medicalGroupVisibleEnd,
    editingGroupId,
    formData: medicalGroupFormData,
    setFormData: setMedicalGroupFormData,
    formError: medicalGroupFormError,
    formLoading: medicalGroupFormLoading,
    availableMedicalUsers,
    resetMedicalGroupsState,
    loadMedicalGroups,
    openMedicalGroupsList,
    openNewMedicalGroupForm,
    closeMedicalGroupForm,
    handleEditMedicalGroup,
    handleDeleteMedicalGroup,
    handleSubmitMedicalGroup,
  } = medicalGroupsDomain;

  const isBusy = loginLoading || resetPasswordLoading || usersLoading || formLoading || pacientesLoading || pacienteFormLoading || groupsLoading || medicalGroupFormLoading;

  function logout() {
    queryClient.clear();
    clearSession();
    setDashboardSummary(null);
    setNotificationsOpen(false);
    setNotifications([]);
    setNotificationsError('');
    setNotificationsLoading(false);
    resetUsersState();
    resetPatientsState();
    resetMedicalGroupsState();
    navigateToView('dashboard', true);
    setModuleMode('list');
    setLoginPassword('');
  }

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
      queryClient.clear();
      persistSession({
        token: result.token,
        user: {
          id: result.id,
          nome: result.nome,
          email: result.email,
          cpf: result.cpf ?? null,
          crm: result.crm ?? null,
          crmUf: result.crmUf ?? null,
          fotoPerfil: result.fotoPerfil ?? null,
          precisaTrocarSenha: result.precisaTrocarSenha || loginPassword === DEFAULT_PASSWORD,
          perfilId: result.perfilId || DEFAULT_PROFILE_ID,
          perfilNome: result.perfilNome || getProfileName(result.perfilId || DEFAULT_PROFILE_ID),
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
      await resetPassword(loginEmail.trim());
      setLoginPassword(DEFAULT_PASSWORD);
      setLoginInfo(`Senha redefinida para ${DEFAULT_PASSWORD}. Use-a para entrar e altere a seguir.`);
    } catch (error) {
      setLoginError(getErrorMessage(error));
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const appTitle = activeView === 'dashboard'
    ? 'Painel inicial'
    : activeView === 'users' ? 'Usuarios'
      : activeView === 'profile' ? 'Meu cadastro'
      : activeView === 'patients' ? 'Pacientes'
        : activeView === 'medicalGroups' ? 'Grupos medicos' : 'Agenda';

  const openDashboard = () => {
    if (activeView === 'profile') {
      resetUserFormState({ suppressProfileAutoOpen: true });
    }

    if (!canAccessDashboard) {
      openPatientsList();
      return;
    }

    navigateToView('dashboard');
    setModuleMode('list');
  };

  const openAgenda = () => {
    if (activeView === 'profile') {
      resetUserFormState({ suppressProfileAutoOpen: true });
    }

    if (!canAccessAgenda) {
      openPatientsList();
      return;
    }

    navigateToView('agenda');
    setModuleMode('list');
  };

  const openPatientsListFromMenu = () => {
    if (activeView === 'profile') {
      resetUserFormState({ suppressProfileAutoOpen: true });
    }

    openPatientsList();
  };

  const openMedicalGroups = () => {
    if (activeView === 'profile') {
      resetUserFormState({ suppressProfileAutoOpen: true });
    }

    if (!canAccessMedicalGroups) {
      openPatientsList();
      return;
    }

    openMedicalGroupsList();
  };

  const handleUserSortChange = (field: string) => {
    setCurrentPage(1);

    if (userSortBy === field) {
      setUserSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setUserSortBy(field);
    setUserSortDirection(field === 'recent' ? 'desc' : 'asc');
  };

  const handlePacienteSortChange = (field: string) => {
    setPacienteCurrentPage(1);

    if (pacienteSortBy === field) {
      setPacienteSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setPacienteSortBy(field);
    setPacienteSortDirection(field === 'recent' ? 'desc' : 'asc');
  };

  const handleCbhpmSortChange = (field: string) => {
    setCbhpmCurrentPage(1);

    if (cbhpmSortBy === field) {
      setCbhpmSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setCbhpmSortBy(field);
    setCbhpmSortDirection('asc');
  };

  const handleMedicalGroupSortChange = (field: string) => {
    setMedicalGroupCurrentPage(1);

    if (medicalGroupSortBy === field) {
      setMedicalGroupSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setMedicalGroupSortBy(field);
    setMedicalGroupSortDirection(field === 'recent' ? 'desc' : 'asc');
  };

  if (!session) {
    return (
      <LoginScreen
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
        onPasswordChanged={handlePasswordChanged}
        onLogout={logout}
      />
    );
  }

  const currentUserProfile = session.user.perfilNome || getProfileName(session.user.perfilId);
  const activeUsersCount = dashboardSummary?.activeUsersCount ?? 0;
  const activePatientsCount = dashboardSummary?.activePatientsCount ?? 0;
  const pendingPaymentsCount = dashboardSummary?.pendingPaymentsCount ?? 0;
  const patientFilesCount = dashboardSummary?.patientFilesCount ?? 0;
  const upcomingEventsCount = dashboardSummary?.upcomingEventsCount ?? 0;
  const notificationCount = notificationsOpen && notifications.length
    ? notifications.length
    : pendingPaymentsCount + upcomingEventsCount;
  const usersCount = dashboardSummary?.usersCount ?? usersTotalItems;
  const pacientesCount = dashboardSummary?.pacientesCount ?? pacientesTotalItems;

  const formBreadcrumbLabel = activeView === 'users'
    ? editingId ? 'Editar usuario' : 'Novo usuario'
    : activeView === 'profile' ? 'Meu cadastro'
    : activeView === 'patients' ? editingPacienteId ? patientReadOnly ? 'Visualizar paciente' : 'Editar paciente' : 'Novo paciente'
      : activeView === 'medicalGroups' ? editingGroupId ? 'Editar grupo medico' : 'Novo grupo medico'
      : 'Agenda';
  const activeModuleLabel = activeView === 'users'
    ? 'Usuarios'
    : activeView === 'profile' ? 'Meu cadastro'
    : activeView === 'patients' ? 'Pacientes'
      : activeView === 'medicalGroups' ? 'Grupos medicos' : 'Agenda';
  const openActiveModuleList = activeView === 'users'
    ? openUsersList
    : activeView === 'profile' ? openMyProfile
      : activeView === 'patients' ? openPatientsList
        : activeView === 'medicalGroups' ? openMedicalGroups : openAgenda;
  const breadcrumbItems: BreadcrumbItem[] = activeView === 'dashboard'
    ? [
      { label: 'Inicio', onClick: openDashboard },
      { label: 'Painel inicial' },
    ]
    : [
      { label: 'Inicio', onClick: openDashboard },
      {
        label: activeModuleLabel,
        onClick: moduleMode === 'form' ? openActiveModuleList : undefined,
      },
      ...(moduleMode === 'form' ? [{ label: formBreadcrumbLabel }] : []),
    ];

  const mainContent = activeView === 'dashboard' ? (
    <DashboardPage
      canAccessUsers={canAccessUsers}
      canEditOwnUser={canEditOwnUser}
      canAccessMedicalGroups={canAccessMedicalGroups}
      patientReadOnly={patientReadOnly}
      usersCount={usersCount}
      pacientesCount={pacientesCount}
      activeUsersCount={activeUsersCount}
      activePatientsCount={activePatientsCount}
      pendingPaymentsCount={pendingPaymentsCount}
      patientFilesCount={patientFilesCount}
      upcomingEventsCount={upcomingEventsCount}
      successMessage={successMessage}
      dashboardError={dashboardError}
      onOpenUsersList={openUsersList}
      onOpenMyProfile={openMyProfile}
      onOpenPatientsList={openPatientsList}
      onOpenMedicalGroups={openMedicalGroups}
      onOpenAgenda={openAgenda}
    />
  ) : activeView === 'users' || activeView === 'profile' ? (
    <UsersPage
      moduleMode={moduleMode}
      canAccessUsers={canAccessUsers}
      canUseUserForm={canUseUserForm}
      editingId={editingId}
      editingUserDetails={editingUserDetails}
      formData={formData}
      formError={formError}
      formLoading={formLoading}
      pendingUserFiles={pendingUserFiles}
      photoInputKey={photoInputKey}
      userFileInputKey={userFileInputKey}
      users={paginatedUsers}
      usersLoading={usersLoading}
      usersError={usersError}
      successMessage={successMessage}
      usersTotalItems={usersTotalItems}
      visibleStart={visibleStart}
      visibleEnd={visibleEnd}
      currentPage={currentPage}
      totalPages={totalPages}
      searchTerm={searchTerm}
      sortBy={userSortBy}
      sortDirection={userSortDirection}
      sessionToken={session.token}
      setFormData={setFormData}
      setSearchTerm={setSearchTerm}
      setCurrentPage={setCurrentPage}
      onSortChange={handleUserSortChange}
      closeUserForm={closeUserForm}
      openNewUserForm={openNewUserForm}
      handleSubmitUser={handleSubmitUser}
      handleProfilePhotoChange={handleProfilePhotoChange}
      handleRemoveProfilePhoto={handleRemoveProfilePhoto}
      handleUserFilesChange={handleUserFilesChange}
      removePendingUserFile={removePendingUserFile}
      handleDeleteUserArquivo={handleDeleteUserArquivo}
      handleEditUser={handleEditUser}
      handleDeleteUser={handleDeleteUser}
      setSelectedInfoUser={setSelectedInfoUser}
      setSelectedContactUser={setSelectedContactUser}
      refreshUsers={refreshUsers}
    />
  ) : activeView === 'patients' ? (
    <PatientsPage
      moduleMode={moduleMode}
      canCreatePatients={canCreatePatients}
      canEditPatients={canEditPatients}
      canDeletePatients={canDeletePatients}
      patientReadOnly={patientReadOnly}
      editingPacienteId={editingPacienteId}
      editingPaciente={editingPaciente}
      pacienteFormData={pacienteFormData}
      pacienteFormError={pacienteFormError}
      pacienteFormLoading={pacienteFormLoading}
      pendingPatientFiles={pendingPatientFiles}
      patientFileInputKey={patientFileInputKey}
      pacientes={paginatedPacientes}
      pacientesLoading={pacientesLoading}
      pacientesError={pacientesError}
      pacienteSuccessMessage={pacienteSuccessMessage}
      pacientesTotalItems={pacientesTotalItems}
      pacienteVisibleStart={pacienteVisibleStart}
      pacienteVisibleEnd={pacienteVisibleEnd}
      pacienteCurrentPage={pacienteCurrentPage}
      pacienteTotalPages={pacienteTotalPages}
      pacienteSearchTerm={pacienteSearchTerm}
      sortBy={pacienteSortBy}
      sortDirection={pacienteSortDirection}
      pacienteFilters={pacienteFilters}
      pacienteExportLoading={pacienteExportLoading}
      pacienteExportScope={pacienteExportScope}
      hospitais={hospitais}
      hospitaisError={hospitaisError}
      medicalUsers={medicalUsers}
      convenios={convenios}
      conveniosError={conveniosError}
      opmeFornecedores={opmeFornecedores}
      opmeFornecedoresError={opmeFornecedoresError}
      isAdmin={isAdmin}
      isMedical={isMedical}
      sessionToken={session.token}
      setPacienteFormData={setPacienteFormData}
      setPacienteSearchTerm={setPacienteSearchTerm}
      setPacienteFilters={setPacienteFilters}
      setPacienteExportScope={setPacienteExportScope}
      setPacienteCurrentPage={setPacienteCurrentPage}
      onSortChange={handlePacienteSortChange}
      closePacienteForm={closePacienteForm}
      openNewPacienteForm={openNewPacienteForm}
      handleSubmitPaciente={handleSubmitPaciente}
      handleOpenCbhpmModal={handleOpenCbhpmModal}
      handleRemovePacienteProcedimento={handleRemovePacienteProcedimento}
      handlePacienteFilesChange={handlePacienteFilesChange}
      removePendingPatientFile={removePendingPatientFile}
      handleDeletePacienteArquivo={handleDeletePacienteArquivo}
      handleExportPacientes={handleExportPacientes}
      handleEditPaciente={handleEditPaciente}
      handleDeletePaciente={handleDeletePaciente}
      handleOpenPacienteFiles={handleOpenPacienteFiles}
      setSelectedPatientInfo={setSelectedPatientInfo}
      clearPacienteFilters={clearPacienteFilters}
      refreshPacientes={refreshPacientes}
    />
  ) : activeView === 'medicalGroups' ? (
    <MedicalGroupsPage
      moduleMode={moduleMode}
      groups={groups}
      groupsLoading={groupsLoading}
      groupsError={groupsError}
      successMessage={medicalGroupsSuccessMessage}
      totalItems={medicalGroupsTotalItems}
      visibleStart={medicalGroupVisibleStart}
      visibleEnd={medicalGroupVisibleEnd}
      currentPage={medicalGroupCurrentPage}
      totalPages={medicalGroupTotalPages}
      searchTerm={medicalGroupSearchTerm}
      sortBy={medicalGroupSortBy}
      sortDirection={medicalGroupSortDirection}
      editingGroupId={editingGroupId}
      formData={medicalGroupFormData}
      formError={medicalGroupFormError}
      formLoading={medicalGroupFormLoading}
      availableMedicalUsers={availableMedicalUsers}
      setFormData={setMedicalGroupFormData}
      setSearchTerm={setMedicalGroupSearchTerm}
      setCurrentPage={setMedicalGroupCurrentPage}
      onSortChange={handleMedicalGroupSortChange}
      onCloseForm={closeMedicalGroupForm}
      onOpenNewForm={openNewMedicalGroupForm}
      onSubmit={handleSubmitMedicalGroup}
      onEditGroup={handleEditMedicalGroup}
      onDeleteGroup={handleDeleteMedicalGroup}
      onRefresh={() => {
        if (session) {
          void loadMedicalGroups(session.token, true);
        }
      }}
    />
  ) : (
    <AgendaPage
      session={session}
      isAdmin={isAdmin}
      isMedical={isMedical}
    />
  );

  const modals = (
    <Suspense fallback={null}>
      {selectedInfoUser && (
        <InfoModal user={selectedInfoUser} onClose={() => setSelectedInfoUser(null)} />
      )}

      {selectedContactUser && (
        <ContactModal user={selectedContactUser} onClose={() => setSelectedContactUser(null)} />
      )}

      {notificationsOpen && (
        <NotificationsModal
          notifications={notifications}
          loading={notificationsLoading}
          error={notificationsError}
          totalCount={notificationCount}
          onClose={() => setNotificationsOpen(false)}
        />
      )}

      {cbhpmModalOpen && (
        <CbhpmLookupModal
          items={cbhpmItems}
          filters={cbhpmFilters}
          isAdmin={isAdmin}
          loading={cbhpmLoading}
          error={cbhpmError}
          currentPage={cbhpmCurrentPage}
          totalPages={cbhpmTotalPageCount}
          totalItems={cbhpmTotalItems}
          visibleStart={cbhpmVisibleStart}
          visibleEnd={cbhpmVisibleEnd}
          sortBy={cbhpmSortBy}
          sortDirection={cbhpmSortDirection}
          onFiltersChange={setCbhpmFilters}
          onPageChange={setCbhpmCurrentPage}
          onSortChange={handleCbhpmSortChange}
          onRefresh={refreshCbhpm}
          onSelect={handleSelectCbhpm}
          onClose={() => setCbhpmModalOpen(false)}
        />
      )}

      {selectedPatientInfo && (
        <PatientInfoModal paciente={selectedPatientInfo} onClose={() => setSelectedPatientInfo(null)} />
      )}

      {selectedPatientFiles && (
        <PatientFilesModal
          paciente={selectedPatientFiles}
          loading={patientFilesModalLoading}
          error={patientFilesModalError}
          onClose={closePatientFilesModal}
        />
      )}

      {showPasswordModal && (
        <PasswordModal
          session={session}
          onChanged={handlePasswordChanged}
          onClose={() => setShowPasswordModal(false)}
        />
      )}
    </Suspense>
  );

  return (
    <AppShell
      session={session}
      isBusy={isBusy}
      appTitle={appTitle}
      activeView={activeView}
      breadcrumbItems={breadcrumbItems}
      theme={theme}
      notificationsOpen={notificationsOpen}
      notificationCount={notificationCount}
      currentUserProfile={currentUserProfile}
      canAccessDashboard={canAccessDashboard}
      canAccessUsers={canAccessUsers}
      canEditOwnUser={canEditOwnUser}
      canAccessMedicalGroups={canAccessMedicalGroups}
      canAccessAgenda={canAccessAgenda}
      usersCount={usersCount}
      pacientesCount={pacientesCount}
      medicalUsers={medicalUsers}
      convenios={convenios}
      opmeFornecedores={opmeFornecedores}
      onToggleNotifications={() => void handleToggleNotifications()}
      onToggleTheme={toggleTheme}
      onOpenPasswordModal={() => setShowPasswordModal(true)}
      onLogout={logout}
      onOpenDashboard={openDashboard}
      onOpenUsersList={openUsersList}
      onOpenMyProfile={openMyProfile}
      onOpenPatientsList={openPatientsListFromMenu}
      onOpenMedicalGroups={openMedicalGroups}
      onOpenAgenda={openAgenda}
      modals={modals}
    >
      <Suspense fallback={<ModuleFallback />}>
        {mainContent}
      </Suspense>
    </AppShell>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
