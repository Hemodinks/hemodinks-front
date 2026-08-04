import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthSession, useLoginFlow } from '../features/auth';
import type { AppView, ModuleMode } from '../appTypes';
import { useConfirmationDialog } from '../shared/components/ConfirmationDialog';
import { useRouteView } from '../shared/hooks/useRouteView';
import { useThemePreference } from '../shared/hooks/useThemePreference';
import { useBillingPreferences } from '../shared/hooks/useBillingPreferences';
import { getAppAccess, MEDICAL_ALLOWED_ENTRY_PATHS } from './appAccess';
import { AppWorkspace } from './AppWorkspace';
import { useAppChrome } from './useAppChrome';
import { useAppDomains } from './useAppDomains';
import { useAppNavigation } from './useAppNavigation';
import { useAppViewPresentation } from './useAppViewPresentation';
import { useSessionLifecycle } from './useSessionLifecycle';
import { AppSessionScreens } from './AppSessionScreens';

export function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, persistSession, clearSession } = useAuthSession();
  const { theme, toggleTheme, setThemePreference } = useThemePreference();
  const { showPrices, setShowPrices } = useBillingPreferences();
  const { confirmAction, confirmationDialog } = useConfirmationDialog();
  const [moduleMode, setModuleMode] = useState<ModuleMode>('list');
  const logoutRef = useRef<() => void>(() => undefined);

  const access = getAppAccess(session);
  const {
    isAdmin,
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
  } = access;
  const appChrome = useAppChrome({ session });
  const loginFlow = useLoginFlow({
    session,
    persistSession,
    navigate,
    fallbackCompanyName: appChrome.companyName,
    fallbackCompanyPhoto: appChrome.systemSettings.fotoEmpresa,
  });
  const forceDashboardRoute =
    loginFlow.openDashboardAfterLogin && Boolean(session && !session.user.precisaTrocarSenha);
  const { activeView, navigateToView } = useRouteView({
    session,
    canUseDashboardRoute,
    canUsePatientsRoute,
    canUseUsersRoute,
    canUseProfileRoute,
    canUseBillingRoute,
    canUseAttendancesRoute,
    canUseFinanceRoute,
    canUsePricesRoute: canUsePricesRoute && showPrices,
    canUseMedicalGroupsRoute,
    canUseAgendaRoute,
    canUseSettingsRoute,
    canUseClinicsRoute,
    forceDashboardRoute,
  });
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const isResetPasswordRoute = normalizedPath === '/reset-password';
  const resetToken = isResetPasswordRoute
    ? (new URLSearchParams(location.search).get('token')?.trim() ?? '')
    : '';
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
    navigateToDashboard: () => navigateToView('dashboard', true),
    resetDomains: () => {
      usersDomain.resetUsersState();
      patientsDomain.resetPatientsState();
      medicalGroupsDomain.resetMedicalGroupsState();
    },
    resetAppChrome: appChrome.resetAppChrome,
    resetModuleMode: () => setModuleMode('list'),
    resetLoginFlow: (infoMessage) => {
      loginFlow.setOpenDashboardAfterLogin(false);
      loginFlow.setLoginError('');
      loginFlow.setLoginInfo(infoMessage);
      loginFlow.setLoginPassword('');
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
      canAccessPrices: showPrices,
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
    if (!loginFlow.openDashboardAfterLogin || MEDICAL_ALLOWED_ENTRY_PATHS.has(normalizedPath)) {
      return;
    }

    loginFlow.setOpenDashboardAfterLogin(false);
  }, [normalizedPath, loginFlow.openDashboardAfterLogin]);

  if (!session || session.user.precisaTrocarSenha) {
    return (
      <AppSessionScreens
        session={session}
        isResetPasswordRoute={isResetPasswordRoute}
        resetToken={resetToken}
        isBusy={isBusy}
        theme={theme}
        toggleTheme={toggleTheme}
        appChrome={appChrome}
        loginFlow={loginFlow}
        usersDomain={usersDomain}
        sessionLifecycle={sessionLifecycle}
      />
    );
  }

  return (
    <AppWorkspace
      session={session}
      moduleMode={moduleMode}
      isBusy={isBusy}
      theme={theme}
      setThemePreference={setThemePreference}
      showPrices={showPrices}
      setShowPrices={setShowPrices}
      access={access}
      appChrome={appChrome}
      domains={{ usersDomain, patientsDomain, medicalGroupsDomain }}
      navigation={appNavigation}
      presentation={viewPresentation}
      lifecycle={sessionLifecycle}
      activeView={activeView}
      confirmationDialog={confirmationDialog}
    />
  );
}
