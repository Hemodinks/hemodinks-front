import { useCallback, useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AppView, ModuleMode } from '../../appTypes';
import { getFormPath, isRootPath, parseModuleRoute, VIEW_PATHS, type FormView } from '../../routes';
import type { AuthSession } from '../../types';

type UseRouteViewOptions = {
  session: AuthSession | null;
  canUseDashboardRoute: boolean;
  canUsePatientsRoute: boolean;
  canUseUsersRoute: boolean;
  canUseProfileRoute: boolean;
  canUseBillingRoute: boolean;
  canUseBillingHistoryRoute: boolean;
  canUseReportsRoute: boolean;
  canUseTutorialsRoute: boolean;
  canUseMedicalGroupsRoute: boolean;
  canUseAgendaRoute: boolean;
  canUseSettingsRoute: boolean;
  canUseClinicsRoute: boolean;
  // <base>/novo also needs the create permission; without it the module list opens instead.
  canCreatePatients: boolean;
  canCreateUsers: boolean;
  forceDashboardRoute?: boolean;
};

export function useRouteView({
  session,
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
  canCreatePatients,
  canCreateUsers,
  forceDashboardRoute = false,
}: UseRouteViewOptions) {
  const location = useLocation();
  const navigate = useNavigate();
  const route = parseModuleRoute(location.pathname);
  const routeView = route.view;
  const isRootRoute = isRootPath(location.pathname);
  const shouldForceDashboardRoute = forceDashboardRoute && canUseDashboardRoute;
  const routeBlocked = (routeView === 'dashboard' && !canUseDashboardRoute)
    || (routeView === 'patients' && !canUsePatientsRoute)
    || (routeView === 'users' && !canUseUsersRoute)
    || (routeView === 'profile' && !canUseProfileRoute)
    || (routeView === 'billing' && !canUseBillingRoute)
    || (routeView === 'billingHistory' && !canUseBillingHistoryRoute)
    || (routeView === 'reports' && !canUseReportsRoute)
    || (routeView === 'tutorials' && !canUseTutorialsRoute)
    || (routeView === 'medicalGroups' && !canUseMedicalGroupsRoute)
    || (routeView === 'agenda' && !canUseAgendaRoute)
    || (routeView === 'settings' && !canUseSettingsRoute)
    || (routeView === 'clinics' && !canUseClinicsRoute);
  const fallbackView: AppView = canUseDashboardRoute
    ? 'dashboard'
    : canUsePatientsRoute
      ? 'patients'
      : canUseUsersRoute
        ? 'users'
        : canUseProfileRoute
          ? 'profile'
          : canUseBillingRoute
          ? 'billing'
          : canUseReportsRoute
            ? 'reports'
            : canUseTutorialsRoute
              ? 'tutorials'
            : canUseMedicalGroupsRoute
              ? 'medicalGroups'
              : canUseAgendaRoute
                ? 'agenda'
                : canUseSettingsRoute ? 'settings' : 'clinics';
  const newRecordDenied = route.mode === 'form' && route.recordId === null
    && ((routeView === 'patients' && !canCreatePatients) || (routeView === 'users' && !canCreateUsers));
  const activeView: AppView = shouldForceDashboardRoute || !routeView || routeBlocked
    ? fallbackView
    : routeView;

  useLayoutEffect(() => {
    if (!session || session.user.precisaTrocarSenha) {
      return;
    }

    if (shouldForceDashboardRoute || isRootRoute || !routeView || routeBlocked) {
      navigate(VIEW_PATHS[fallbackView], { replace: true });
    } else if (newRecordDenied) {
      navigate(VIEW_PATHS[routeView], { replace: true });
    }
  }, [fallbackView, isRootRoute, navigate, newRecordDenied, routeBlocked, routeView, session, shouldForceDashboardRoute]);

  const navigateToView = useCallback((view: AppView, replace = false) => {
    navigate(VIEW_PATHS[view], { replace });
  }, [navigate]);

  const navigateToForm = useCallback((view: FormView, recordId: number | null = null, replace = false) => {
    navigate(getFormPath(view, recordId), { replace });
  }, [navigate]);

  // A blocked or fallback route never keeps the form state of the URL that was rejected.
  const routeApplies = activeView === routeView;
  const moduleMode: ModuleMode = routeApplies && !newRecordDenied ? route.mode : activeView === 'profile' ? 'form' : 'list';
  const formRecordId = routeApplies ? route.recordId : null;

  return {
    activeView,
    moduleMode,
    formRecordId,
    navigateToView,
    navigateToForm,
  };
}
