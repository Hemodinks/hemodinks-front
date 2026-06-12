import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AppView } from '../../appTypes';
import { getViewFromPath, isRootPath, VIEW_PATHS } from '../../routes';
import type { AuthSession } from '../../types';

type UseRouteViewOptions = {
  session: AuthSession | null;
  canUseUsersRoute: boolean;
  canUseProfileRoute: boolean;
};

export function useRouteView({ session, canUseUsersRoute, canUseProfileRoute }: UseRouteViewOptions) {
  const location = useLocation();
  const navigate = useNavigate();
  const routeView = getViewFromPath(location.pathname);
  const isRootRoute = isRootPath(location.pathname);
  const routeBlocked = (routeView === 'users' && !canUseUsersRoute)
    || (routeView === 'profile' && !canUseProfileRoute);
  const activeView: AppView = !routeView || routeBlocked
    ? 'dashboard'
    : routeView;

  useEffect(() => {
    if (!session || session.user.precisaTrocarSenha) {
      return;
    }

    if (isRootRoute || !routeView || routeBlocked) {
      navigate(VIEW_PATHS.dashboard, { replace: true });
    }
  }, [isRootRoute, navigate, routeBlocked, routeView, session]);

  const navigateToView = useCallback((view: AppView, replace = false) => {
    navigate(VIEW_PATHS[view], { replace });
  }, [navigate]);

  return {
    activeView,
    navigateToView,
  };
}
