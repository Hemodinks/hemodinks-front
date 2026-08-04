import { useCallback, useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AppView } from '../../appTypes';
import { getViewFromPath, isRootPath, VIEW_PATHS } from '../../routes';
import type { AuthSession } from '../../types';

type UseRouteViewOptions = {
  session: AuthSession | null;
  canUseDashboardRoute: boolean;
  canUsePatientsRoute: boolean;
  canUseUsersRoute: boolean;
  canUseProfileRoute: boolean;
  canUseBillingRoute: boolean;
  canUseMedicalGroupsRoute: boolean;
  canUseAgendaRoute: boolean;
  canUseSettingsRoute: boolean;
  canUseClinicsRoute: boolean;
  forceDashboardRoute?: boolean;
};

export function useRouteView({
  session,
  canUseDashboardRoute,
  canUsePatientsRoute,
  canUseUsersRoute,
  canUseProfileRoute,
  canUseBillingRoute,
  canUseMedicalGroupsRoute,
  canUseAgendaRoute,
  canUseSettingsRoute,
  canUseClinicsRoute,
  forceDashboardRoute = false,
}: UseRouteViewOptions) {
  const location = useLocation();
  const navigate = useNavigate();
  const routeView = getViewFromPath(location.pathname);
  const isRootRoute = isRootPath(location.pathname);
  const shouldForceDashboardRoute = forceDashboardRoute && canUseDashboardRoute;
  const routeBlocked = (routeView === 'dashboard' && !canUseDashboardRoute)
    || (routeView === 'patients' && !canUsePatientsRoute)
    || (routeView === 'users' && !canUseUsersRoute)
    || (routeView === 'profile' && !canUseProfileRoute)
    || (routeView === 'billing' && !canUseBillingRoute)
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
            : canUseMedicalGroupsRoute
              ? 'medicalGroups'
              : canUseAgendaRoute
                ? 'agenda'
                : canUseSettingsRoute ? 'settings' : 'clinics';
  const activeView: AppView = shouldForceDashboardRoute || !routeView || routeBlocked
    ? fallbackView
    : routeView;

  useLayoutEffect(() => {
    if (!session || session.user.precisaTrocarSenha) {
      return;
    }

    if (shouldForceDashboardRoute || isRootRoute || !routeView || routeBlocked) {
      navigate(VIEW_PATHS[fallbackView], { replace: true });
    }
  }, [fallbackView, isRootRoute, navigate, routeBlocked, routeView, session, shouldForceDashboardRoute]);

  const navigateToView = useCallback((view: AppView, replace = false) => {
    navigate(VIEW_PATHS[view], { replace });
  }, [navigate]);

  return {
    activeView,
    navigateToView,
  };
}
