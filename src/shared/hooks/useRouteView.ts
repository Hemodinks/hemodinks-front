import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AppView } from '../../appTypes';
import { getViewFromPath, isRootPath, VIEW_PATHS } from '../../routes';
import type { AuthSession } from '../../types';

type UseRouteViewOptions = {
  session: AuthSession | null;
  canUseDashboardRoute: boolean;
  canUseUsersRoute: boolean;
  canUseProfileRoute: boolean;
  canUseMedicalGroupsRoute: boolean;
  canUseAgendaRoute: boolean;
};

export function useRouteView({
  session,
  canUseDashboardRoute,
  canUseUsersRoute,
  canUseProfileRoute,
  canUseMedicalGroupsRoute,
  canUseAgendaRoute,
}: UseRouteViewOptions) {
  const location = useLocation();
  const navigate = useNavigate();
  const routeView = getViewFromPath(location.pathname);
  const isRootRoute = isRootPath(location.pathname);
  const routeBlocked = (routeView === 'dashboard' && !canUseDashboardRoute)
    || (routeView === 'users' && !canUseUsersRoute)
    || (routeView === 'profile' && !canUseProfileRoute)
    || (routeView === 'medicalGroups' && !canUseMedicalGroupsRoute)
    || (routeView === 'agenda' && !canUseAgendaRoute);
  const fallbackView: AppView = canUseDashboardRoute ? 'dashboard' : 'patients';
  const activeView: AppView = !routeView || routeBlocked
    ? fallbackView
    : routeView;

  useEffect(() => {
    if (!session || session.user.precisaTrocarSenha) {
      return;
    }

    if (isRootRoute || !routeView || routeBlocked) {
      navigate(VIEW_PATHS[fallbackView], { replace: true });
    }
  }, [fallbackView, isRootRoute, navigate, routeBlocked, routeView, session]);

  const navigateToView = useCallback((view: AppView, replace = false) => {
    navigate(VIEW_PATHS[view], { replace });
  }, [navigate]);

  return {
    activeView,
    navigateToView,
  };
}
