import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AppView } from '../../appTypes';
import { getViewFromPath, isRootPath, VIEW_PATHS } from '../../routes';
import type { AuthSession } from '../../types';

type UseRouteViewOptions = {
  session: AuthSession | null;
  canUseUsersRoute: boolean;
};

export function useRouteView({ session, canUseUsersRoute }: UseRouteViewOptions) {
  const location = useLocation();
  const navigate = useNavigate();
  const routeView = getViewFromPath(location.pathname);
  const isRootRoute = isRootPath(location.pathname);
  const activeView: AppView = !routeView || (routeView === 'users' && !canUseUsersRoute)
    ? 'dashboard'
    : routeView;

  useEffect(() => {
    if (!session || session.user.precisaTrocarSenha) {
      return;
    }

    if (isRootRoute || !routeView || (routeView === 'users' && !canUseUsersRoute)) {
      navigate(VIEW_PATHS.dashboard, { replace: true });
    }
  }, [canUseUsersRoute, isRootRoute, navigate, routeView, session]);

  const navigateToView = useCallback((view: AppView, replace = false) => {
    navigate(VIEW_PATHS[view], { replace });
  }, [navigate]);

  return {
    activeView,
    navigateToView,
  };
}
